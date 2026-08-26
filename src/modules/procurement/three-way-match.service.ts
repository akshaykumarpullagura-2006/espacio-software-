import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { ThreeWayMatchInput } from "@/validators/procurement.schema";
import { ProcurementCalculationService } from "./procurement-calculation.service";

export interface ItemMatchResult {
  purchaseOrderItemId: string;
  materialName: string;
  poQuantity: number;
  poRate: number;
  acceptedQuantity: number;
  invoicedQuantity: number;
  invoicedRate: number;
  quantityVariance: number;
  priceVariance: number;
  itemStatus: "MATCHED" | "QUANTITY_VARIANCE" | "PRICE_VARIANCE" | "BOTH_VARIANCE";
}

export interface ThreeWayMatchResult {
  purchaseOrderId: string;
  poReferenceNo: string;
  vendorId: string;
  vendorName: string;
  vendorInvoiceNo: string;
  invoicedTotal: number;
  acceptedTotalValue: number;
  totalVarianceAmount: number;
  matchStatus: "MATCHED" | "VARIANCE_DETECTED" | "OVER_BILLED";
  discrepancies: string[];
  items: ItemMatchResult[];
  vendorPayableId?: string;
  payableReferenceNo?: string;
}

export class ThreeWayMatchService {
  /**
   * Execute comprehensive 3-Way Match across PO, Goods Receipts, and Vendor Invoice.
   */
  public static async executeThreeWayMatch(
    input: ThreeWayMatchInput,
    userId: string
  ): Promise<ThreeWayMatchResult> {
    const po = await db.purchaseOrder.findUnique({
      where: { id: input.purchaseOrderId },
      include: {
        items: true,
        vendor: true,
        receipts: {
          include: { items: true },
        },
      },
    });

    if (!po) throw new NotFoundError("Purchase order record not found");

    const discrepancies: string[] = [];
    const itemResults: ItemMatchResult[] = [];
    let acceptedTotalValue = 0;

    for (const matchItem of input.items) {
      const poItem = po.items.find((i) => i.id === matchItem.purchaseOrderItemId);
      if (!poItem) {
        throw new BusinessRuleError(
          `Purchase order item ${matchItem.purchaseOrderItemId} does not belong to PO ${po.referenceNo}.`
        );
      }

      // Sum accepted quantity across all GRNs for this PO item
      let totalAccepted = 0;
      for (const receipt of po.receipts) {
        if (receipt.status !== "CANCELLED" && receipt.status !== "REJECTED") {
          for (const rItem of receipt.items) {
            if (rItem.purchaseOrderItemId === poItem.id) {
              totalAccepted += rItem.acceptedQuantity;
            }
          }
        }
      }

      const qtyVariance = Math.round((matchItem.invoicedQuantity - totalAccepted + Number.EPSILON) * 100) / 100;
      const priceVariance = Math.round((matchItem.invoicedRate - poItem.rate + Number.EPSILON) * 100) / 100;

      let itemStatus: ItemMatchResult["itemStatus"] = "MATCHED";
      if (qtyVariance > 0 && priceVariance > 0) {
        itemStatus = "BOTH_VARIANCE";
        discrepancies.push(
          `${poItem.materialName}: Invoiced qty exceeds accepted by ${qtyVariance} and rate exceeds agreed by ₹${priceVariance}`
        );
      } else if (qtyVariance > 0) {
        itemStatus = "QUANTITY_VARIANCE";
        discrepancies.push(
          `${poItem.materialName}: Invoiced qty (${matchItem.invoicedQuantity}) exceeds accepted goods (${totalAccepted})`
        );
      } else if (priceVariance > 0) {
        itemStatus = "PRICE_VARIANCE";
        discrepancies.push(
          `${poItem.materialName}: Invoiced rate (₹${matchItem.invoicedRate}) exceeds PO rate (₹${poItem.rate})`
        );
      }

      itemResults.push({
        purchaseOrderItemId: poItem.id,

        materialName: poItem.materialName,
        poQuantity: poItem.quantity,
        poRate: poItem.rate,
        acceptedQuantity: totalAccepted,
        invoicedQuantity: matchItem.invoicedQuantity,
        invoicedRate: matchItem.invoicedRate,
        quantityVariance: qtyVariance,
        priceVariance,
        itemStatus,
      });
    }

    // Calculate accepted value using simple line totals (qty * rate) to avoid optional field issues
    for (const ir of itemResults) {
      const poItem = po.items.find((i) => i.id === ir.purchaseOrderItemId)!;
      acceptedTotalValue += ProcurementCalculationService.roundCurrency(ir.acceptedQuantity * poItem.rate);
    }
    acceptedTotalValue = ProcurementCalculationService.roundCurrency(acceptedTotalValue);

    // Compare against PO grand total proportionally: accepted ratio × grandTotal
    const poLineTotal = ProcurementCalculationService.roundCurrency(
      po.items.reduce((sum, i) => sum + i.quantity * i.rate, 0)
    );
    // If all items fully accepted at PO rate, expected total = po.grandTotal
    const expectedTotal = poLineTotal > 0
      ? ProcurementCalculationService.roundCurrency((acceptedTotalValue / poLineTotal) * po.grandTotal)
      : acceptedTotalValue;
    const totalVarianceAmount = ProcurementCalculationService.roundCurrency(input.invoicedTotal - expectedTotal);

    let matchStatus: ThreeWayMatchResult["matchStatus"] = "MATCHED";
    if (discrepancies.length > 0 || totalVarianceAmount > 0.01) {
      matchStatus = totalVarianceAmount > 0.01 ? "OVER_BILLED" : "VARIANCE_DETECTED";
    }


    let payableRecord: any = null;

    // If matching succeeded and creation of payable requested
    if (input.createPayableOnSuccess) {
      const payableRef = await IdGeneratorService.generate("VPAYABLE");
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30); // 30-day payment term baseline

      payableRecord = await db.vendorPayable.create({
        data: {
          payableNo: payableRef,
          vendorId: po.vendorId,
          projectId: po.projectId,
          purchaseOrderId: po.id,
          invoiceReference: input.vendorInvoiceNo.trim(),
          amount: input.invoicedTotal,
          paidAmount: 0,
          outstandingAmount: input.invoicedTotal,
          status: "OPEN",
          dueDate,
          notes: `3-Way Matched against PO ${po.referenceNo}. Match Status: ${matchStatus}. ${input.notes || ""}`.trim(),
          createdById: userId,
        },
      });

      await AuditService.logEvent({
        userId,
        action: "VENDOR_PAYABLE_CREATED",
        entityType: "VendorPayable",
        entityId: payableRecord.id,
        newValues: {
          payableNo: payableRecord.payableNo,
          invoiceReference: payableRecord.invoiceReference,
          amount: payableRecord.amount,
          matchStatus,
        },
      });

      await ActivityService.record({
        userId,
        entityType: "VendorPayable",
        entityId: payableRecord.id,
        type: "FINANCE",
        title: `Vendor Payable ${payableRecord.payableNo} Created`,
        description: `Verified invoice ${payableRecord.invoiceReference} from ${po.vendor.name} for ₹${payableRecord.amount.toLocaleString("en-IN")}.`,
      });
    }


    await AuditService.logEvent({
      userId,
      action: "THREE_WAY_MATCH_PERFORMED",
      entityType: "PurchaseOrder",
      entityId: po.id,
      newValues: {
        poReferenceNo: po.referenceNo,
        vendorInvoiceNo: input.vendorInvoiceNo,
        matchStatus,
        discrepanciesCount: discrepancies.length,
      },
    });

    return {
      purchaseOrderId: po.id,
      poReferenceNo: po.referenceNo,
      vendorId: po.vendorId,
      vendorName: po.vendor.name,
      vendorInvoiceNo: input.vendorInvoiceNo,
      invoicedTotal: input.invoicedTotal,
      acceptedTotalValue,
      totalVarianceAmount,
      matchStatus,
      discrepancies,
      items: itemResults,
      vendorPayableId: payableRecord?.id,
      payableReferenceNo: payableRecord?.payableNo,
    };
  }
}
