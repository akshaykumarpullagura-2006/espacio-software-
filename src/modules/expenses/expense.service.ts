import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { SettingsService } from "../settings/settings.service";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { RbacService } from "../rbac/rbac.service";
import { NotificationService } from "../notifications/notification.service";
import { PeriodLockService } from "../finance/period-lock.service";
import { FinanceCalculationService } from "../finance/finance-calculation.service";
import {
  RecordExpenseInput,
  ApproveExpenseInput,
  RejectExpenseInput,
  CancelExpenseInput,
  ReclassifyExpenseInput,
} from "@/validators/expense.schema";

export interface ExpenseFilterParams {
  expenseType?: string;
  categoryKey?: string;
  projectId?: string;
  employeeId?: string;
  vendorId?: string;
  financialAccountId?: string;
  paymentMethod?: string;
  status?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export class ExpenseService {
  public static async recordExpense(input: RecordExpenseInput, userId?: string) {
    if (input.expenseType === "PROJECT" && (!input.projectId || input.projectId.trim() === "")) {
      throw new ValidationError("Project selection is required for Project Expenses");
    }

    const projectId = input.expenseType === "PROJECT" ? input.projectId : null;

    if (projectId) {
      const project = await db.project.findUnique({ where: { id: projectId } });
      if (!project) throw new NotFoundError("Project record not found");
    }

    const amount = FinanceCalculationService.roundMoney(input.amount);
    if (amount <= 0) throw new ValidationError("Expense amount must be greater than 0");

    const expenseDate = input.expenseDate ? new Date(input.expenseDate) : new Date();

    // 1. Check period lock
    await PeriodLockService.checkPeriodOpen(expenseDate);

    // 2. Validate financial account if provided
    let financialAccount: any = null;
    if (input.financialAccountId) {
      financialAccount = await db.financialAccount.findUnique({ where: { id: input.financialAccountId } });
      if (!financialAccount) throw new NotFoundError("Financial account not found");
    }

    // Check if submitting user is ADMIN
    const isUserAdmin = userId ? await RbacService.isUserAdmin(userId) : false;

    // Strict 2-level rule: Non-admin user expenses are ALWAYS submitted for Admin approval
    let autoApprove = false;
    if (isUserAdmin) {
      const thresholdSetting = await SettingsService.get("AUTO_APPROVE_EXPENSES_BELOW", "50000");
      const threshold = parseFloat(thresholdSetting) || 50000;
      autoApprove = amount <= threshold;
    }

    const initialStatus = autoApprove ? "APPROVED" : "SUBMITTED";
    const referenceNo = await IdGeneratorService.generate("EXP");
    const ledgerNo = await IdGeneratorService.generate("LED");

    const expense = await db.$transaction(async (tx) => {
      const created = await tx.expense.create({
        data: {
          referenceNo,
          expenseType: input.expenseType,
          categoryKey: input.categoryKey,
          projectId,
          employeeId: input.employeeId || null,
          vendorId: input.vendorId || null,
          vendorName: input.vendorName || null,
          financialAccountId: financialAccount ? financialAccount.id : null,
          description: input.description.trim(),
          amount,
          paymentMethod: input.paymentMethod,
          expenseDate,
          referenceNoExternal: input.referenceNoExternal || null,
          notes: input.notes ? input.notes.trim() : null,
          status: initialStatus,
          createdById: userId ?? null,
          approvedById: autoApprove ? userId ?? null : null,
          approvedAt: autoApprove ? new Date() : null,
        },
        include: {
          project: { select: { id: true, referenceNo: true, title: true } },
          employee: { select: { id: true, employeeNo: true, fullName: true } },
          financialAccount: { select: { id: true, accountCode: true, name: true } },
        },
      });

      // If auto-approved and account linked, debit account and log ledger entry
      if (autoApprove && financialAccount) {
        const newBalance = FinanceCalculationService.roundMoney(financialAccount.currentBalance - amount);
        await tx.financialAccount.update({
          where: { id: financialAccount.id },
          data: { currentBalance: newBalance },
        });

        await tx.financialLedger.create({
          data: {
            entryNo: ledgerNo,
            transactionDate: expenseDate,
            direction: "OUTFLOW",
            sourceType: "EXPENSE",
            sourceId: created.id,
            financialAccountId: financialAccount.id,
            projectId: projectId || null,
            categoryKey: input.categoryKey,
            amount,
            paymentMethod: input.paymentMethod,
            referenceNoExt: input.referenceNoExternal || null,
            status: "RECORDED",
            notes: `Expense ${created.referenceNo}: ${input.description.trim()}`,
            createdById: userId ?? null,
          },
        });
      }

      return created;
    });

    await AuditService.logEvent({
      userId,
      action: "EXPENSE_CREATED",
      entityType: "Expense",
      entityId: expense.id,
      newValues: {
        referenceNo: expense.referenceNo,
        amount: expense.amount,
        type: expense.expenseType,
        status: expense.status,
        financialAccount: financialAccount?.name,
      },
    });

    if (projectId) {
      await ActivityService.record({
        userId,
        entityType: "Project",
        entityId: projectId,
        type: "EXPENSE",
        title: `Project Expense ${expense.referenceNo} Recorded`,
        description: `Amount: ₹${amount.toLocaleString()} (${input.categoryKey}) via ${input.paymentMethod}. Status: ${expense.status}.`,
      });
    }

    // If awaiting approval, notify all ADMINs
    if (initialStatus === "SUBMITTED") {
      await NotificationService.notifyAdmins({
        type: "EXPENSE_PENDING_APPROVAL",
        category: "FINANCE",
        priority: "HIGH",
        title: "New Expense Awaiting Approval",
        message: `Expense ${expense.referenceNo} for ₹${amount.toLocaleString()} has been submitted and is pending Admin review.`,
        entityType: "Expense",
        entityId: expense.id,
        actionUrl: `/finance/expenses`,
        actorId: userId,
      });
    }

    return expense;
  }

  public static async approveExpense(expenseId: string, input?: ApproveExpenseInput, userId?: string) {
    // Strict 2-level rule: Only ADMIN can approve expenses
    if (userId) {
      await RbacService.requireAdmin(userId, "ADMIN_APPROVED_EXPENSE");
    }

    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      include: { financialAccount: true },
    });
    if (!expense) throw new NotFoundError("Expense record not found");

    if (expense.status === "APPROVED" || expense.status === "PAID") {
      throw new BusinessRuleError(`Expense ${expense.referenceNo} is already approved.`);
    }

    // Self-approval check
    if (userId && expense.createdById === userId) {
      const isSuperAdmin = await RbacService.isSuperAdmin(userId);
      const allowSelfApproval = (await SettingsService.get("ALLOW_SELF_EXPENSE_APPROVAL", "false")) === "true";
      if (!isSuperAdmin && !allowSelfApproval) {
        throw new BusinessRuleError(
          "Self-approval of submitted expenses is prohibited by policy. An independent administrator must review and approve this expense."
        );
      }
    }

    // Check period lock
    await PeriodLockService.checkPeriodOpen(expense.expenseDate);

    const ledgerNo = await IdGeneratorService.generate("LED");

    const updated = await db.$transaction(async (tx) => {
      const appExpense = await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: "APPROVED",
          approvedById: userId ?? null,
          approvedAt: new Date(),
          notes: input?.notes ? `${expense.notes || ""}\nApproval Note: ${input.notes}`.trim() : expense.notes,
        },
      });

      // If financial account linked, debit account and log ledger entry
      if (expense.financialAccount) {
        const newBalance = FinanceCalculationService.roundMoney(
          expense.financialAccount.currentBalance - expense.amount
        );
        await tx.financialAccount.update({
          where: { id: expense.financialAccount.id },
          data: { currentBalance: newBalance },
        });

        await tx.financialLedger.create({
          data: {
            entryNo: ledgerNo,
            transactionDate: expense.expenseDate,
            direction: "OUTFLOW",
            sourceType: "EXPENSE",
            sourceId: expense.id,
            financialAccountId: expense.financialAccount.id,
            projectId: expense.projectId || null,
            categoryKey: expense.categoryKey,
            amount: expense.amount,
            paymentMethod: expense.paymentMethod,
            referenceNoExt: expense.referenceNoExternal || null,
            status: "RECORDED",
            notes: `Expense ${expense.referenceNo}: ${expense.description}`,
            createdById: userId ?? null,
          },
        });
      }

      return appExpense;
    });

    await AuditService.logEvent({
      userId,
      action: "ADMIN_APPROVED_EXPENSE",
      entityType: "Expense",
      entityId: expenseId,
      newValues: { referenceNo: updated.referenceNo, approvedAt: updated.approvedAt, status: "APPROVED" },
    });

    if (expense.projectId) {
      await ActivityService.record({
        userId,
        entityType: "Project",
        entityId: expense.projectId,
        type: "EXPENSE",
        title: `Expense ${updated.referenceNo} Approved`,
        description: `Admin approved project cost of ₹${expense.amount.toLocaleString()}.`,
      });
    }

    if (expense.createdById && expense.createdById !== userId) {
      await NotificationService.create({
        userId: expense.createdById,
        type: "EXPENSE_APPROVED",
        category: "FINANCE",
        priority: "NORMAL",
        title: "Expense Approved",
        message: `Your expense ${expense.referenceNo} (₹${expense.amount.toLocaleString()}) has been approved.`,
        entityType: "Expense",
        entityId: expense.id,
        actionUrl: `/finance/expenses`,
        actorId: userId,
      });
    }

    return updated;
  }

  public static async rejectExpense(expenseId: string, input: RejectExpenseInput, userId?: string) {
    if (userId) {
      await RbacService.requireAdmin(userId, "ADMIN_REJECTED_EXPENSE");
    }

    const expense = await db.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new NotFoundError("Expense record not found");

    const updated = await db.expense.update({
      where: { id: expenseId },
      data: {
        status: "REJECTED",
        rejectionReason: input.rejectionReason,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "ADMIN_REJECTED_EXPENSE",
      entityType: "Expense",
      entityId: expenseId,
      newValues: { referenceNo: updated.referenceNo, rejectionReason: input.rejectionReason, status: "REJECTED" },
    });

    if (expense.createdById && expense.createdById !== userId) {
      await NotificationService.create({
        userId: expense.createdById,
        type: "EXPENSE_REJECTED",
        category: "FINANCE",
        priority: "HIGH",
        title: "Expense Rejected",
        message: `Your expense ${expense.referenceNo} (₹${expense.amount.toLocaleString()}) was rejected by Admin. Reason: ${input.rejectionReason}`,
        entityType: "Expense",
        entityId: expense.id,
        actionUrl: `/finance/expenses`,
        actorId: userId,
      });
    }

    return updated;
  }

  public static async cancelExpense(expenseId: string, input: CancelExpenseInput, userId?: string) {
    const expense = await db.expense.findUnique({
      where: { id: expenseId },
      include: { financialAccount: true },
    });
    if (!expense) throw new NotFoundError("Expense record not found");

    if (expense.status === "CANCELLED") {
      throw new BusinessRuleError(`Expense ${expense.referenceNo} is already cancelled.`);
    }

    const cancellationDate = new Date();
    await PeriodLockService.checkPeriodOpen(cancellationDate);

    const ledgerNo = await IdGeneratorService.generate("LED");

    const updated = await db.$transaction(async (tx) => {
      const cancelled = await tx.expense.update({
        where: { id: expenseId },
        data: {
          status: "CANCELLED",
          rejectionReason: input.cancellationReason,
        },
      });

      // If it was already approved and linked to account, restore balance and create inverse ledger entry
      if ((expense.status === "APPROVED" || expense.status === "PAID") && expense.financialAccount) {
        const newBalance = FinanceCalculationService.roundMoney(
          expense.financialAccount.currentBalance + expense.amount
        );
        await tx.financialAccount.update({
          where: { id: expense.financialAccount.id },
          data: { currentBalance: newBalance },
        });

        await tx.financialLedger.create({
          data: {
            entryNo: ledgerNo,
            transactionDate: cancellationDate,
            direction: "INFLOW",
            sourceType: "EXPENSE",
            sourceId: expense.id,
            financialAccountId: expense.financialAccount.id,
            projectId: expense.projectId || null,
            categoryKey: expense.categoryKey,
            amount: expense.amount,
            paymentMethod: expense.paymentMethod,
            referenceNoExt: expense.referenceNoExternal || null,
            status: "REVERSED",
            notes: `Cancellation reversal for ${expense.referenceNo}: ${input.cancellationReason}`,
            createdById: userId ?? null,
          },
        });
      }

      return cancelled;
    });

    await AuditService.logEvent({
      userId,
      action: "EXPENSE_CANCELLED",
      entityType: "Expense",
      entityId: expenseId,
      newValues: { referenceNo: updated.referenceNo, cancellationReason: input.cancellationReason },
    });

    return updated;
  }

  public static async reclassifyExpense(expenseId: string, input: ReclassifyExpenseInput, userId?: string) {
    const expense = await db.expense.findUnique({ where: { id: expenseId } });
    if (!expense) throw new NotFoundError("Expense record not found");

    const oldLog = expense.reclassificationLog ? JSON.parse(expense.reclassificationLog) : [];
    const newLogEntry = {
      reclassifiedAt: new Date().toISOString(),
      reclassifiedById: userId ?? null,
      reason: input.reclassificationReason,
      from: { categoryKey: expense.categoryKey, expenseType: expense.expenseType, projectId: expense.projectId },
      to: {
        categoryKey: input.categoryKey || expense.categoryKey,
        expenseType: input.expenseType || expense.expenseType,
        projectId: input.projectId || expense.projectId,
      },
    };

    oldLog.push(newLogEntry);

    const newType = input.expenseType || expense.expenseType;
    const newProjectId = newType === "PROJECT" ? input.projectId || expense.projectId : null;

    if (newType === "PROJECT" && !newProjectId) {
      throw new ValidationError("Project selection is required for Project Expenses");
    }

    const updated = await db.expense.update({
      where: { id: expenseId },
      data: {
        expenseType: newType,
        categoryKey: input.categoryKey || expense.categoryKey,
        projectId: newProjectId,
        reclassificationLog: JSON.stringify(oldLog),
      },
    });

    await AuditService.logEvent({
      userId,
      action: "EXPENSE_RECLASSIFIED",
      entityType: "Expense",
      entityId: expenseId,
      oldValues: { categoryKey: expense.categoryKey, expenseType: expense.expenseType },
      newValues: {
        categoryKey: updated.categoryKey,
        expenseType: updated.expenseType,
        reason: input.reclassificationReason,
      },
    });

    return updated;
  }

  public static async getExpenses(params: ExpenseFilterParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.expenseType) where.expenseType = params.expenseType;
    if (params.categoryKey) where.categoryKey = params.categoryKey;
    if (params.projectId) where.projectId = params.projectId;
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.vendorId) where.vendorId = params.vendorId;
    if (params.financialAccountId) where.financialAccountId = params.financialAccountId;
    if (params.paymentMethod) where.paymentMethod = params.paymentMethod;
    if (params.status) where.status = params.status;

    if (params.startDate || params.endDate) {
      where.expenseDate = {
        ...(params.startDate ? { gte: params.startDate } : {}),
        ...(params.endDate ? { lte: params.endDate } : {}),
      };
    }

    if (params.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { description: { contains: q } },
        { vendorName: { contains: q } },
        { referenceNoExternal: { contains: q } },
        { project: { title: { contains: q } } },
        { project: { referenceNo: { contains: q } } },
        { employee: { fullName: { contains: q } } },
      ];
    }

    const [total, expenses] = await Promise.all([
      db.expense.count({ where }),
      db.expense.findMany({
        where,
        orderBy: { expenseDate: "desc" },
        skip,
        take: limit,
        include: {
          project: { select: { id: true, referenceNo: true, title: true } },
          employee: { select: { id: true, employeeNo: true, fullName: true } },
          financialAccount: { select: { id: true, accountCode: true, name: true } },
          salaryPayment: { select: { id: true, referenceNo: true, periodMonth: true, periodYear: true } },
        },
      }),
    ]);

    return {
      expenses,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getExpenseById(id: string) {
    const expense = await db.expense.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, referenceNo: true, title: true, contractValue: true, revisedBudget: true } },
        employee: { select: { id: true, employeeNo: true, fullName: true, department: true, designation: true } },
        financialAccount: true,
        salaryPayment: { select: { id: true, referenceNo: true, periodMonth: true, periodYear: true, paymentDate: true } },
      },
    });

    if (!expense) throw new NotFoundError("Expense record not found");
    return expense;
  }
}

