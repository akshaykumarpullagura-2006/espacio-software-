import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export interface ProjectMaterialSummaryItem {
  materialName: string;
  unitKey: string;
  requiredQuantity: number;
  orderedQuantity: number;
  receivedQuantity: number;
  pendingQuantity: number;
  fulfillmentPct: number;
}

export interface ProjectProcurementOverview {
  projectId: string;
  projectReferenceNo: string;
  projectTitle: string;
  materials: ProjectMaterialSummaryItem[];
  purchaseOrdersCount: number;
  totalPOCommittedValue: number;
  goodsReceiptsCount: number;
  totalVendorPayablesCount: number;
  totalInvoicedPayableAmount: number;
  totalPaidAmount: number;
  totalOutstandingPayables: number;
}

export class ProjectProcurementService {
  public static async getProjectProcurementOverview(projectId: string): Promise<ProjectProcurementOverview> {
    const project = await db.project.findUnique({
      where: { id: projectId },
      include: {
        materialRequests: {
          include: { items: true },
        },
        purchaseOrders: {
          include: {
            items: true,
            vendor: { select: { name: true } },
          },
        },
        goodsReceipts: {
          include: {
            items: { include: { purchaseOrderItem: { select: { materialName: true, unitKey: true } } } },
          },
        },
        vendorPayables: true,
        vendorPayments: { where: { status: "VERIFIED" } },
      },
    });

    if (!project) throw new NotFoundError("Project record not found");

    // Aggregate materials across MRs, POs, and Receipts
    const materialMap = new Map<
      string,
      {
        materialName: string;
        unitKey: string;
        requiredQuantity: number;
        orderedQuantity: number;
        receivedQuantity: number;
      }
    >();

    // 1. Ingest MR items
    for (const mr of project.materialRequests) {
      if (mr.status !== "CANCELLED" && mr.status !== "REJECTED") {
        for (const item of mr.items) {
          const key = item.materialName.trim().toLowerCase();
          const existing = materialMap.get(key) || {
            materialName: item.materialName.trim(),
            unitKey: item.unitKey,
            requiredQuantity: 0,
            orderedQuantity: 0,
            receivedQuantity: 0,
          };
          existing.requiredQuantity += item.requestedQuantity;
          materialMap.set(key, existing);
        }
      }
    }

    // 2. Ingest PO items
    let totalPOCommittedValue = 0;
    for (const po of project.purchaseOrders) {
      if (po.status !== "CANCELLED") {
        totalPOCommittedValue += po.grandTotal;
        for (const item of po.items) {
          const key = item.materialName.trim().toLowerCase();
          const existing = materialMap.get(key) || {
            materialName: item.materialName.trim(),
            unitKey: item.unitKey,
            requiredQuantity: 0,
            orderedQuantity: 0,
            receivedQuantity: 0,
          };
          existing.orderedQuantity += item.quantity;
          materialMap.set(key, existing);
        }
      }
    }

    // 3. Ingest GRN items
    for (const grn of project.goodsReceipts) {
      if (grn.status !== "CANCELLED" && grn.status !== "REJECTED") {
        for (const item of grn.items) {
          const key = item.purchaseOrderItem.materialName.trim().toLowerCase();
          const existing = materialMap.get(key) || {
            materialName: item.purchaseOrderItem.materialName.trim(),
            unitKey: item.purchaseOrderItem.unitKey,
            requiredQuantity: 0,
            orderedQuantity: 0,
            receivedQuantity: 0,
          };
          existing.receivedQuantity += item.acceptedQuantity;
          materialMap.set(key, existing);
        }
      }
    }

    const materialList: ProjectMaterialSummaryItem[] = Array.from(materialMap.values()).map((m) => {
      const pending = Math.max(0, m.orderedQuantity - m.receivedQuantity);
      const fulfillmentPct =
        m.orderedQuantity > 0
          ? Math.min(100, Math.round((m.receivedQuantity / m.orderedQuantity) * 100))
          : 0;

      return {
        materialName: m.materialName,
        unitKey: m.unitKey,
        requiredQuantity: m.requiredQuantity,
        orderedQuantity: m.orderedQuantity,
        receivedQuantity: m.receivedQuantity,
        pendingQuantity: pending,
        fulfillmentPct,
      };
    });

    let totalInvoicedPayableAmount = 0;
    let totalOutstandingPayables = 0;
    for (const payable of project.vendorPayables) {
      if (payable.status !== "CANCELLED") {
        totalInvoicedPayableAmount += payable.amount;
        if (payable.status !== "PAID") {
          totalOutstandingPayables += payable.outstandingAmount;
        }
      }
    }

    let totalPaidAmount = 0;
    for (const payment of project.vendorPayments) {
      totalPaidAmount += payment.amount;
    }

    return {
      projectId: project.id,
      projectReferenceNo: project.referenceNo,
      projectTitle: project.title,
      materials: materialList,
      purchaseOrdersCount: project.purchaseOrders.length,
      totalPOCommittedValue: Math.round((totalPOCommittedValue + Number.EPSILON) * 100) / 100,
      goodsReceiptsCount: project.goodsReceipts.length,
      totalVendorPayablesCount: project.vendorPayables.length,
      totalInvoicedPayableAmount: Math.round((totalInvoicedPayableAmount + Number.EPSILON) * 100) / 100,
      totalPaidAmount: Math.round((totalPaidAmount + Number.EPSILON) * 100) / 100,
      totalOutstandingPayables: Math.round((totalOutstandingPayables + Number.EPSILON) * 100) / 100,
    };
  }
}
