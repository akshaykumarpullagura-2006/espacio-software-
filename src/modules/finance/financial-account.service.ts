import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { FinanceCalculationService } from "./finance-calculation.service";
import { CreateFinancialAccountInput } from "@/validators/finance.schema";

export class FinancialAccountService {
  public static async createAccount(input: CreateFinancialAccountInput, userId?: string) {
    const accountCode = await IdGeneratorService.generate("ACC");
    const openingBalance = FinanceCalculationService.roundMoney(input.openingBalance ?? 0);

    const account = await db.financialAccount.create({
      data: {
        accountCode,
        name: input.name.trim(),
        type: input.type || "BANK",
        currency: input.currency || "INR",
        openingBalance,
        currentBalance: openingBalance,
        bankName: input.bankName ? input.bankName.trim() : null,
        accountNo: input.accountNo ? input.accountNo.trim() : null,
        ifscCode: input.ifscCode ? input.ifscCode.trim() : null,
        notes: input.notes ? input.notes.trim() : null,
        status: "ACTIVE",
      },
    });

    await AuditService.logEvent({
      userId,
      action: "ACCOUNT_CREATED",
      entityType: "FinancialAccount",
      entityId: account.id,
      newValues: { accountCode: account.accountCode, name: account.name, openingBalance },
    });

    await ActivityService.record({
      userId,
      entityType: "FinancialAccount",
      entityId: account.id,
      type: "FINANCE",
      title: `Financial Account ${account.accountCode} Registered`,
      description: `Registered financial account ${account.name} (${account.type}) with opening balance ₹${account.openingBalance}.`,
    });

    return account;
  }

  public static async updateAccount(id: string, input: Partial<CreateFinancialAccountInput>, userId?: string) {
    const account = await db.financialAccount.findUnique({ where: { id } });
    if (!account) throw new NotFoundError("Financial account not found");

    const updated = await db.financialAccount.update({
      where: { id },
      data: {
        name: input.name ? input.name.trim() : undefined,
        type: input.type || undefined,
        bankName: input.bankName !== undefined ? input.bankName : undefined,
        accountNo: input.accountNo !== undefined ? input.accountNo : undefined,
        ifscCode: input.ifscCode !== undefined ? input.ifscCode : undefined,
        notes: input.notes !== undefined ? input.notes : undefined,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "ACCOUNT_UPDATED",
      entityType: "FinancialAccount",
      entityId: id,
      newValues: { name: updated.name, type: updated.type },
    });

    return updated;
  }

  public static async getAccounts() {
    const accounts = await db.financialAccount.findMany({
      orderBy: { accountCode: "asc" },
      include: {
        ledgerEntries: {
          take: 10,
          orderBy: { createdAt: "desc" },
        },
      },
    });

    return accounts.map((acc) => {
      // Calculate current balance = openingBalance + totalInflows - totalOutflows
      const totalInflows = acc.ledgerEntries
        .filter((l) => l.direction === "INFLOW" && l.status === "RECORDED")
        .reduce((sum, l) => sum + l.amount, 0);
      const totalOutflows = acc.ledgerEntries
        .filter((l) => l.direction === "OUTFLOW" && l.status === "RECORDED")
        .reduce((sum, l) => sum + l.amount, 0);

      const calculatedBalance = FinanceCalculationService.roundMoney(
        acc.openingBalance + totalInflows - totalOutflows
      );

      return {
        ...acc,
        currentBalance: calculatedBalance,
      };
    });
  }

  public static async getAccountById(id: string) {
    const account = await db.financialAccount.findUnique({
      where: { id },
      include: {
        ledgerEntries: {
          orderBy: { createdAt: "desc" },
          take: 50,
          include: {
            client: { select: { fullName: true } },
            vendor: { select: { name: true } },
          },
        },
      },
    });

    if (!account) throw new NotFoundError("Financial account not found");
    return account;
  }

  public static async transferFunds(input: {
    fromAccountId: string;
    toAccountId: string;
    amount: number;
    transferDate?: string | Date;
    notes?: string;
  }, userId?: string) {
    if (input.fromAccountId === input.toAccountId) {
      throw new BusinessRuleError("Source and destination accounts cannot be the same");
    }

    const amount = FinanceCalculationService.roundMoney(input.amount);
    if (amount <= 0) {
      throw new BusinessRuleError("Transfer amount must be greater than 0");
    }

    const transferDate = input.transferDate ? new Date(input.transferDate) : new Date();

    // Check period lock
    const { PeriodLockService } = await import("./period-lock.service");
    await PeriodLockService.checkPeriodOpen(transferDate);

    const fromAccount = await db.financialAccount.findUnique({ where: { id: input.fromAccountId } });
    if (!fromAccount) throw new NotFoundError("Source financial account not found");

    if (fromAccount.currentBalance < amount) {
      throw new BusinessRuleError(
        `Insufficient balance in ${fromAccount.name} (Available: ₹${fromAccount.currentBalance.toLocaleString()}, Transfer: ₹${amount.toLocaleString()})`
      );
    }

    const toAccount = await db.financialAccount.findUnique({ where: { id: input.toAccountId } });
    if (!toAccount) throw new NotFoundError("Destination financial account not found");

    const outLedgerNo = await IdGeneratorService.generate("LED", 0);
    const inLedgerNo = await IdGeneratorService.generate("LED", 1);


    const result = await db.$transaction(async (tx) => {
      // 1. Debit source account
      const updatedFrom = await tx.financialAccount.update({
        where: { id: fromAccount.id },
        data: {
          currentBalance: FinanceCalculationService.roundMoney(fromAccount.currentBalance - amount),
        },
      });

      // 2. Credit destination account
      const updatedTo = await tx.financialAccount.update({
        where: { id: toAccount.id },
        data: {
          currentBalance: FinanceCalculationService.roundMoney(toAccount.currentBalance + amount),
        },
      });

      // 3. Create OUTFLOW ledger entry for source account
      const outLedger = await tx.financialLedger.create({
        data: {
          entryNo: outLedgerNo,
          transactionDate: transferDate,
          direction: "OUTFLOW",
          sourceType: "ACCOUNT_TRANSFER",
          sourceId: updatedFrom.id,
          financialAccountId: updatedFrom.id,
          categoryKey: "TRANSFER",
          amount,
          paymentMethod: "INTERNAL_TRANSFER",
          status: "RECORDED",
          notes: `Transfer to ${toAccount.name}${input.notes ? `: ${input.notes.trim()}` : ""}`,
          createdById: userId ?? null,
        },
      });

      // 4. Create INFLOW ledger entry for destination account
      const inLedger = await tx.financialLedger.create({
        data: {
          entryNo: inLedgerNo,
          transactionDate: transferDate,
          direction: "INFLOW",
          sourceType: "ACCOUNT_TRANSFER",
          sourceId: updatedTo.id,
          financialAccountId: updatedTo.id,
          categoryKey: "TRANSFER",
          amount,
          paymentMethod: "INTERNAL_TRANSFER",
          status: "RECORDED",
          notes: `Transfer from ${fromAccount.name}${input.notes ? `: ${input.notes.trim()}` : ""}`,
          createdById: userId ?? null,
        },
      });

      return { updatedFrom, updatedTo, outLedger, inLedger };
    });

    await AuditService.logEvent({
      userId,
      action: "ACCOUNT_TRANSFER",
      entityType: "FinancialAccount",
      entityId: fromAccount.id,
      newValues: {
        fromAccount: fromAccount.name,
        toAccount: toAccount.name,
        amount,
        transferDate,
      },
    });

    await ActivityService.record({
      userId,
      entityType: "FinancialAccount",
      entityId: fromAccount.id,
      type: "FINANCE",
      title: `Fund Transfer: ₹${amount.toLocaleString()} ${fromAccount.name} → ${toAccount.name}`,
      description: `Transferred ₹${amount.toLocaleString()} from ${fromAccount.name} to ${toAccount.name}.`,
    });

    return result;
  }
}

