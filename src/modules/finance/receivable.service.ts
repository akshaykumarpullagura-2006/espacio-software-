import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { FinanceCalculationService } from "./finance-calculation.service";
import { CreateReceivableInput } from "@/validators/finance.schema";

export interface ReceivableFilterParams {
  clientId?: string;
  projectId?: string;
  status?: string;
  overdueOnly?: boolean;
  search?: string;
}

export class ReceivableService {
  public static async createReceivable(input: any, userId?: string) {
    const receivableNo = await IdGeneratorService.generate("REC");
    const amount = FinanceCalculationService.roundMoney(input.amount);
    const dueDate = input.dueDate ? new Date(input.dueDate) : null;

    let status = "OPEN";
    if (dueDate && dueDate < new Date() && amount > 0) {
      status = "OVERDUE";
    }

    const receivable = await db.clientReceivable.create({
      data: {
        receivableNo,
        clientId: input.clientId || null,
        projectId: input.projectId || null,
        milestoneId: input.milestoneId || null,
        referenceNo: input.referenceNo ? input.referenceNo.trim() : null,
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
      action: "RECEIVABLE_CREATED",
      entityType: "ClientReceivable",
      entityId: receivable.id,
      newValues: { receivableNo: receivable.receivableNo, amount: receivable.amount, status: receivable.status },
    });

    return receivable;
  }

  public static async getReceivables(params: ReceivableFilterParams) {
    const where: Record<string, unknown> = {};
    if (params.clientId) where.clientId = params.clientId;
    if (params.projectId) where.projectId = params.projectId;
    if (params.status) where.status = params.status;

    const now = new Date();
    if (params.overdueOnly) {
      where.dueDate = { lt: now };
      where.outstandingAmount = { gt: 0 };
    }

    if (params.search && params.search.trim() !== "") {
      const q = params.search.trim();
      where.OR = [
        { receivableNo: { contains: q } },
        { referenceNo: { contains: q } },
        { client: { fullName: { contains: q } } },
        { project: { title: { contains: q } } },
      ];
    }

    const receivables = await db.clientReceivable.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, referenceNo: true, fullName: true, phone: true } },
        project: { select: { id: true, referenceNo: true, title: true } },
        milestone: { select: { id: true, title: true } },
        payments: {
          select: { id: true, referenceNo: true, amount: true, paymentDate: true, paymentMethod: true, status: true },
        },
      },
    });

    // Auto-update overdue status dynamically if needed
    return receivables.map((r) => {
      let currentStatus = r.status;
      if (r.outstandingAmount > 0 && r.dueDate && new Date(r.dueDate) < now && r.status !== "CANCELLED") {
        currentStatus = "OVERDUE";
      }
      return {
        ...r,
        status: currentStatus,
      };
    });
  }
}
