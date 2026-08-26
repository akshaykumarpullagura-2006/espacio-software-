import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError } from "@/lib/errors";
import { AuditService } from "../audit/audit.service";
import { PeriodLockInput } from "@/validators/finance.schema";

export class PeriodLockService {
  public static async closePeriod(input: PeriodLockInput, userId?: string) {
    const periodKey = `${input.year}-${String(input.month).padStart(2, "0")}`;
    const startDate = new Date(input.year, input.month - 1, 1);
    const endDate = new Date(input.year, input.month, 0, 23, 59, 59);

    const lock = await db.financialPeriodLock.upsert({
      where: { periodKey },
      update: {
        status: "CLOSED",
        closedById: userId ?? null,
        closedAt: new Date(),
        notes: input.notes ? input.notes.trim() : null,
      },
      create: {
        periodKey,
        year: input.year,
        month: input.month,
        startDate,
        endDate,
        status: "CLOSED",
        closedById: userId ?? null,
        closedAt: new Date(),
        notes: input.notes ? input.notes.trim() : null,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "PERIOD_CLOSED",
      entityType: "FinancialPeriod",
      entityId: lock.id,
      newValues: { periodKey, status: "CLOSED" },
    });

    return lock;
  }

  public static async reopenPeriod(periodKey: string, userId?: string) {
    const lock = await db.financialPeriodLock.findUnique({ where: { periodKey } });
    if (!lock) throw new NotFoundError("Financial period lock record not found");

    const updated = await db.financialPeriodLock.update({
      where: { periodKey },
      data: {
        status: "OPEN",
        reopenedById: userId ?? null,
        reopenedAt: new Date(),
      },
    });

    await AuditService.logEvent({
      userId,
      action: "PERIOD_REOPENED",
      entityType: "FinancialPeriod",
      entityId: lock.id,
      newValues: { periodKey, status: "OPEN" },
    });

    return updated;
  }

  public static async checkPeriodOpen(date: Date) {
    const year = date.getFullYear();
    const month = date.getMonth() + 1;
    const periodKey = `${year}-${String(month).padStart(2, "0")}`;

    const lock = await db.financialPeriodLock.findUnique({ where: { periodKey } });
    if (lock && lock.status === "CLOSED") {
      throw new BusinessRuleError(`Financial period ${periodKey} is closed. Financial modifications are locked.`);
    }
  }

  public static async getPeriodLocks() {
    return db.financialPeriodLock.findMany({
      orderBy: { periodKey: "desc" },
    });
  }
}
