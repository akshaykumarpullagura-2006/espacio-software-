import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { FinanceCalculationService } from "./finance-calculation.service";
import { CreatePayableInput } from "@/validators/finance.schema";

export interface PayableFilterParams {
  vendorId?: string;
  projectId?: string;
  purchaseOrderId?: string;
  status?: string;
  overdueOnly?: boolean;
  search?: string;
}

export class PayableService {
  public static async createPayable(input: CreatePayableInput, userId?: string) {
    const vendor = await db.vendor.findUnique({ where: { id: input.vendorId } });
    if (!vendor) throw new NotFoundError("Vendor record not found");

    const payableNo = await IdGeneratorService.generate("VPAYABLE");
    const amount = FinanceCalculationService.roundMoney(input.amount);
    const dueDate = input.dueDate ? new Date(input.dueDate) : null;

    let status = "OPEN";
    if (dueDate && dueDate < new Date() && amount > 0) {
      status = "OVERDUE";
    }

    const payable = await db.vendorPayable.create({
      data: {
        payableNo,
        vendorId: vendor.id,
        projectId: input.projectId || null,
        purchaseOrderId: input.purchaseOrderId || null,
        invoiceReference: input.invoiceReference ? input.invoiceReference.trim() : null,
        amount,
        paidAmount: 0,
        outstandingAmount: amount,
        dueDate,
        status,
        notes: input.notes ? input.notes.trim() : null,
        createdById: userId ?? null,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "PAYABLE_CREATED",
      entityType: "VendorPayable",
      entityId: payable.id,
      newValues: { payableNo: payable.payableNo, vendor: vendor.name, amount: payable.amount },
    });

    return payable;
  }

  public static async getPayables(params: PayableFilterParams) {
    const where: Record<string, unknown> = {};
    if (params.vendorId) where.vendorId = params.vendorId;
    if (params.projectId) where.projectId = params.projectId;
    if (params.purchaseOrderId) where.purchaseOrderId = params.purchaseOrderId;
    if (params.status) where.status = params.status;

    const now = new Date();
    if (params.overdueOnly) {
      where.dueDate = { lt: now };
      where.outstandingAmount = { gt: 0 };
    }

    if (params.search && params.search.trim() !== "") {
      const q = params.search.trim();
      where.OR = [
        { payableNo: { contains: q } },
        { invoiceReference: { contains: q } },
        { vendor: { name: { contains: q } } },
        { project: { title: { contains: q } } },
      ];
    }

    const payables = await db.vendorPayable.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        vendor: { select: { id: true, referenceNo: true, name: true, phone: true } },
        project: { select: { id: true, referenceNo: true, title: true } },
        purchaseOrder: { select: { id: true, referenceNo: true, grandTotal: true } },
        vendorPayments: {
          select: { id: true, paymentNo: true, amount: true, paymentDate: true, paymentMethod: true, status: true },
        },
      },
    });

    return payables.map((p) => {
      let currentStatus = p.status;
      if (p.outstandingAmount > 0 && p.dueDate && new Date(p.dueDate) < now && p.status !== "CANCELLED") {
        currentStatus = "OVERDUE";
      }
      return {
        ...p,
        status: currentStatus,
      };
    });
  }
}
