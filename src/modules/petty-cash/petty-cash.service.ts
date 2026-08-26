import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { SettingsService } from "../settings/settings.service";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { PettyCashCalculationService } from "./petty-cash-calculation.service";
import { PeriodLockService } from "../finance/period-lock.service";
import { FinanceCalculationService } from "../finance/finance-calculation.service";
import {
  IssueAdvanceInput,
  RecordPettyExpenseInput,
  SettleAdvanceInput,
} from "@/validators/petty-cash.schema";
import { CreateReconciliationInput } from "@/validators/finance.schema";

export interface AdvanceFilterParams {
  employeeId?: string;
  status?: string;
  projectId?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export interface PettyExpenseFilterParams {
  advanceId?: string;
  employeeId?: string;
  categoryKey?: string;
  paymentMethod?: string;
  projectId?: string;
  status?: string;
  search?: string;
  page?: number;
  limit?: number;
}

export class PettyCashService {
  public static async issueAdvance(input: IssueAdvanceInput, userId?: string) {
    const employee = await db.user.findUnique({ where: { id: input.employeeId } });
    if (!employee) throw new NotFoundError("Selected employee record not found");

    if (input.projectId && input.projectId.trim() !== "") {
      const project = await db.project.findUnique({ where: { id: input.projectId } });
      if (!project) throw new NotFoundError("Associated project record not found");
    }

    const amount = FinanceCalculationService.roundMoney(input.amount);
    if (amount <= 0) throw new ValidationError("Advance amount must be greater than 0");

    const issuedDate = input.issuedDate ? new Date(input.issuedDate) : new Date();

    // Check period lock
    await PeriodLockService.checkPeriodOpen(issuedDate);

    let dueDate = input.dueDate ? new Date(input.dueDate) : null;
    if (!dueDate) {
      const settlementDaysSetting = await SettingsService.get("DEFAULT_SETTLEMENT_DAYS", "14");
      const settlementDays = parseInt(settlementDaysSetting, 10) || 14;
      dueDate = new Date(issuedDate.getTime() + settlementDays * 24 * 60 * 60 * 1000);
    }

    // Find cash/petty cash financial account
    let cashAccount: any = null;
    if (input.financialAccountId) {
      cashAccount = await db.financialAccount.findUnique({ where: { id: input.financialAccountId } });
    } else {
      cashAccount = await db.financialAccount.findFirst({
        where: { type: "CASH", status: "ACTIVE" },
      });
    }

    const referenceNo = await IdGeneratorService.generate("ADV");
    const ledgerNo = await IdGeneratorService.generate("LED");


    const advance = await db.$transaction(async (tx) => {
      const createdAdvance = await tx.employeeAdvance.create({
        data: {
          referenceNo,
          employeeId: input.employeeId,
          amount,
          issuedDate,
          dueDate,
          purpose: input.purpose.trim(),
          projectId: input.projectId || null,
          notes: input.notes || null,
          status: "ISSUED",
          createdById: userId ?? null,
          approvedById: userId ?? null,
          approvedAt: new Date(),
        },
        include: {
          employee: { select: { id: true, fullName: true, email: true } },
          project: { select: { id: true, referenceNo: true, title: true } },
        },
      });

      // If cash account exists, debit and log ledger entry
      if (cashAccount) {
        const newBalance = FinanceCalculationService.roundMoney(cashAccount.currentBalance - amount);
        await tx.financialAccount.update({
          where: { id: cashAccount.id },
          data: { currentBalance: newBalance },
        });

        await tx.financialLedger.create({
          data: {
            entryNo: ledgerNo,
            transactionDate: issuedDate,
            direction: "OUTFLOW",
            sourceType: "PETTY_CASH_ADVANCE",
            sourceId: createdAdvance.id,
            financialAccountId: cashAccount.id,
            projectId: input.projectId || null,
            categoryKey: "PETTY_CASH",
            amount,
            paymentMethod: "CASH",
            status: "RECORDED",
            notes: `Petty cash advance ${createdAdvance.referenceNo} issued to ${createdAdvance.employee.fullName}`,
            createdById: userId ?? null,
          },
        });
      }

      return createdAdvance;
    });

    await AuditService.logEvent({
      userId,
      action: "ADVANCE_ISSUED",
      entityType: "EmployeeAdvance",
      entityId: advance.id,
      newValues: { referenceNo: advance.referenceNo, employee: advance.employee.fullName, amount: advance.amount },
    });

    if (advance.projectId) {
      await ActivityService.record({
        userId,
        entityType: "Project",
        entityId: advance.projectId,
        type: "ADVANCE",
        title: `Employee Advance ${advance.referenceNo} Issued`,
        description: `Issued ₹${amount.toLocaleString()} advance to ${advance.employee.fullName} for ${input.purpose}.`,
      });
    }

    return advance;
  }

  public static async recordPettyExpense(input: RecordPettyExpenseInput, userId?: string) {
    const advance = await db.employeeAdvance.findUnique({
      where: { id: input.advanceId },
      include: { employee: { select: { fullName: true } } },
    });

    if (!advance) throw new NotFoundError("Employee advance record not found");

    if (advance.status === "SETTLED" || advance.status === "CANCELLED") {
      throw new BusinessRuleError(`Cannot record petty expense against a ${advance.status.toLowerCase()} advance.`);
    }

    const amount = FinanceCalculationService.roundMoney(input.amount);
    if (amount <= 0) throw new ValidationError("Expense amount must be greater than 0");

    const expenseDate = input.expenseDate ? new Date(input.expenseDate) : new Date();

    // Check period lock
    await PeriodLockService.checkPeriodOpen(expenseDate);

    // Balance calculation check
    const summary = await PettyCashCalculationService.calculateAdvanceSummary(advance.id);
    if (amount > summary.outstandingBalance) {
      throw new BusinessRuleError(
        `Expense amount (₹${amount.toLocaleString()}) exceeds remaining advance balance (₹${summary.outstandingBalance.toLocaleString()}).`
      );
    }

    const referenceNo = await IdGeneratorService.generate("PCX");

    const pettyExpense = await db.pettyCashExpense.create({
      data: {
        referenceNo,
        advanceId: input.advanceId,
        employeeId: advance.employeeId,
        expenseDate,
        amount,
        purpose: input.purpose.trim(),
        categoryKey: input.categoryKey,
        paymentMethod: input.paymentMethod || "PETTY_CASH",
        projectId: input.projectId || advance.projectId || null,
        referenceNoExternal: input.referenceNoExternal || null,
        notes: input.notes || null,
        status: "RECORDED",
        createdById: userId ?? null,
      },
      include: {
        advance: { select: { id: true, referenceNo: true } },
        project: { select: { id: true, referenceNo: true, title: true } },
      },
    });

    await AuditService.logEvent({
      userId,
      action: "PETTY_EXPENSE_CREATED",
      entityType: "PettyCashExpense",
      entityId: pettyExpense.id,
      newValues: { referenceNo: pettyExpense.referenceNo, amount: pettyExpense.amount, advanceRef: advance.referenceNo },
    });

    if (pettyExpense.projectId) {
      await ActivityService.record({
        userId,
        entityType: "Project",
        entityId: pettyExpense.projectId,
        type: "EXPENSE",
        title: `Petty Expense ${pettyExpense.referenceNo} Recorded`,
        description: `Logged ₹${amount.toLocaleString()} petty spend (${input.categoryKey}) via ${advance.referenceNo}.`,
      });
    }

    return pettyExpense;
  }

  public static async settleAdvance(input: SettleAdvanceInput, userId?: string) {
    const advance = await db.employeeAdvance.findUnique({
      where: { id: input.advanceId },
      include: { employee: { select: { id: true, fullName: true } } },
    });

    if (!advance) throw new NotFoundError("Employee advance record not found");

    if (advance.status === "SETTLED") {
      throw new BusinessRuleError(`Advance ${advance.referenceNo} is already settled.`);
    }

    const settlementDate = input.settlementDate ? new Date(input.settlementDate) : new Date();

    // Check period lock
    await PeriodLockService.checkPeriodOpen(settlementDate);

    // Self-approval protection check
    const selfApprovalSetting = await SettingsService.get("ALLOW_SELF_APPROVAL", "false");
    const allowSelfApproval = selfApprovalSetting === "true";
    if (!allowSelfApproval && advance.employeeId === userId) {
      throw new BusinessRuleError("Self-settlement approval of employee advances is prohibited by policy.");
    }

    const summary = await PettyCashCalculationService.calculateAdvanceSummary(advance.id);
    const totalAdvance = summary.totalAdvance;
    const totalSpent = summary.totalSpent;
    const cashReturned = FinanceCalculationService.roundMoney(input.cashReturned ?? 0);

    const difference = PettyCashCalculationService.roundCurrency(
      totalAdvance - totalSpent - cashReturned
    );

    let settlementStatus: "SETTLED" | "DISCREPANCY" = "SETTLED";
    let nextAdvanceStatus = "SETTLED";

    if (difference !== 0) {
      settlementStatus = "DISCREPANCY";
      nextAdvanceStatus = "PARTIALLY_SETTLED";
    }

    const referenceNo = await IdGeneratorService.generate("SET");
    const ledgerNo = await IdGeneratorService.generate("LED");

    // Find cash financial account
    let cashAccount: any = null;
    if (input.financialAccountId) {
      cashAccount = await db.financialAccount.findUnique({ where: { id: input.financialAccountId } });
    } else {
      cashAccount = await db.financialAccount.findFirst({
        where: { type: "CASH", status: "ACTIVE" },
      });
    }


    const result = await db.$transaction(async (tx) => {
      const settlement = await tx.advanceSettlement.create({
        data: {
          referenceNo,
          advanceId: advance.id,
          employeeId: advance.employeeId,
          settlementDate,
          totalAdvance,
          totalSpent,
          cashReturned,
          reimbursementDue: difference < 0 ? Math.abs(difference) : 0,
          difference,
          status: settlementStatus,
          settledById: userId ?? null,
          approvedById: userId ?? null,
          notes: input.notes || null,
        },
      });

      await tx.employeeAdvance.update({
        where: { id: advance.id },
        data: { status: nextAdvanceStatus },
      });

      // If cash returned > 0 and cash account exists, credit cash account and write ledger entry
      if (cashReturned > 0 && cashAccount) {
        const newBalance = FinanceCalculationService.roundMoney(cashAccount.currentBalance + cashReturned);
        await tx.financialAccount.update({
          where: { id: cashAccount.id },
          data: { currentBalance: newBalance },
        });

        await tx.financialLedger.create({
          data: {
            entryNo: ledgerNo,
            transactionDate: settlementDate,
            direction: "INFLOW",
            sourceType: "PETTY_CASH_RETURN",
            sourceId: settlement.id,
            financialAccountId: cashAccount.id,
            categoryKey: "PETTY_CASH",
            amount: cashReturned,
            paymentMethod: "CASH",
            status: "RECORDED",
            notes: `Cash returned from advance ${advance.referenceNo} settlement`,
            createdById: userId ?? null,
          },
        });
      }

      return settlement;
    });

    await AuditService.logEvent({
      userId,
      action: "SETTLEMENT_CREATED",
      entityType: "AdvanceSettlement",
      entityId: result.id,
      newValues: { referenceNo: result.referenceNo, difference, status: settlementStatus },
    });

    if (advance.projectId) {
      await ActivityService.record({
        userId,
        entityType: "Project",
        entityId: advance.projectId,
        type: "ADVANCE",
        title: `Advance ${advance.referenceNo} Settlement (${settlementStatus})`,
        description: `Spent: ₹${totalSpent.toLocaleString()}, Returned: ₹${cashReturned.toLocaleString()}, Difference: ₹${difference.toLocaleString()}.`,
      });
    }

    return result;
  }

  public static async reconcilePettyCash(input: CreateReconciliationInput, userId?: string) {
    const account = await db.financialAccount.findUnique({
      where: { id: input.financialAccountId },
    });
    if (!account) throw new NotFoundError("Financial account not found");

    const systemBalance = account.currentBalance;
    const actualBalance = FinanceCalculationService.roundMoney(input.actualBalance);
    const discrepancy = FinanceCalculationService.roundMoney(actualBalance - systemBalance);
    const statementDate = input.statementDate ? new Date(input.statementDate) : new Date();

    const status = discrepancy === 0 ? "RECONCILED" : "DISCREPANCY";

    const reconciliation = await db.financialReconciliation.create({
      data: {
        reconciliationNo: `REC-LOG-${Date.now().toString().slice(-6)}`,
        financialAccountId: account.id,
        periodKey: input.periodKey,
        statementDate,
        systemBalance,
        actualBalance,
        discrepancy,
        status,
        notes: input.notes ? input.notes.trim() : null,
        reviewedById: userId ?? null,
      },
      include: {
        financialAccount: { select: { id: true, accountCode: true, name: true } },
      },
    });

    await AuditService.logEvent({
      userId,
      action: "ACCOUNT_RECONCILED",
      entityType: "FinancialReconciliation",
      entityId: reconciliation.id,
      newValues: {
        account: account.name,
        systemBalance,
        actualBalance,
        discrepancy,
        status,
      },
    });

    return reconciliation;
  }

  public static async getAdvances(params: AdvanceFilterParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.status) where.status = params.status;
    if (params.projectId) where.projectId = params.projectId;

    if (params.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { purpose: { contains: q } },
        { employee: { fullName: { contains: q } } },
        { project: { title: { contains: q } } },
        { project: { referenceNo: { contains: q } } },
      ];
    }

    const [total, advances] = await Promise.all([
      db.employeeAdvance.count({ where }),
      db.employeeAdvance.findMany({
        where,
        orderBy: { issuedDate: "desc" },
        skip,
        take: limit,
        include: {
          employee: { select: { id: true, fullName: true, email: true } },
          project: { select: { id: true, referenceNo: true, title: true } },
          expenses: { where: { status: "RECORDED" }, select: { amount: true } },
          settlements: { select: { cashReturned: true } },
        },
      }),
    ]);

    const items = advances.map((adv) => {
      let totalSpent = 0;
      for (const exp of adv.expenses) totalSpent += exp.amount;
      let cashReturned = 0;
      for (const set of adv.settlements) cashReturned += set.cashReturned;

      const outstandingBalance = adv.amount - totalSpent - cashReturned;

      return {
        ...adv,
        totalSpent,
        cashReturned,
        outstandingBalance,
      };
    });

    return {
      advances: items,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getPettyExpenses(params: PettyExpenseFilterParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.advanceId) where.advanceId = params.advanceId;
    if (params.employeeId) where.employeeId = params.employeeId;
    if (params.categoryKey) where.categoryKey = params.categoryKey;
    if (params.paymentMethod) where.paymentMethod = params.paymentMethod;
    if (params.projectId) where.projectId = params.projectId;
    if (params.status) where.status = params.status;

    if (params.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { purpose: { contains: q } },
        { advance: { referenceNo: { contains: q } } },
        { project: { title: { contains: q } } },
      ];
    }

    const [total, expenses] = await Promise.all([
      db.pettyCashExpense.count({ where }),
      db.pettyCashExpense.findMany({
        where,
        orderBy: { expenseDate: "desc" },
        skip,
        take: limit,
        include: {
          advance: { select: { id: true, referenceNo: true } },
          project: { select: { id: true, referenceNo: true, title: true } },
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

  public static async getSettlements() {
    return db.advanceSettlement.findMany({
      orderBy: { settlementDate: "desc" },
      include: {
        advance: { select: { id: true, referenceNo: true, amount: true } },
      },
    });
  }
}

