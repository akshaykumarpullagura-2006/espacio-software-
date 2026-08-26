import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";
import { SettingsService } from "../settings/settings.service";

export interface AdvanceSummary {
  advanceId: string;
  referenceNo: string;
  employeeId: string;
  employeeName: string;
  totalAdvance: number;
  totalSpent: number;
  cashReturned: number;
  outstandingBalance: number;
  settlementDifference: number;
  isLowBalance: boolean;
  isOverdue: boolean;
  status: string;
}

export interface GlobalPettyCashSummary {
  totalAdvancesIssued: number;
  totalSpent: number;
  totalCashReturned: number;
  totalOutstandingBalance: number;
  openAdvancesCount: number;
  overdueAdvancesCount: number;
  discrepanciesCount: number;
}

export class PettyCashCalculationService {
  public static roundCurrency(value: number): number {
    return Math.round((value + Number.EPSILON) * 100) / 100;
  }

  /**
   * Authoritative calculation engine for a specific employee advance.
   */
  public static async calculateAdvanceSummary(advanceId: string): Promise<AdvanceSummary> {
    const advance = await db.employeeAdvance.findUnique({
      where: { id: advanceId },
      include: {
        employee: { select: { fullName: true } },
        expenses: {
          where: { status: "RECORDED" },
          select: { amount: true },
        },
        settlements: {
          select: { cashReturned: true, totalSpent: true, difference: true, status: true },
        },
      },
    });

    if (!advance) throw new NotFoundError("Employee advance record not found");

    const totalAdvance = this.roundCurrency(advance.amount);
    let totalSpent = 0;
    for (const exp of advance.expenses) {
      totalSpent += exp.amount;
    }
    totalSpent = this.roundCurrency(totalSpent);

    let cashReturned = 0;
    for (const set of advance.settlements) {
      cashReturned += set.cashReturned;
    }
    cashReturned = this.roundCurrency(cashReturned);

    const outstandingBalance = this.roundCurrency(totalAdvance - totalSpent - cashReturned);
    const settlementDifference = this.roundCurrency(totalAdvance - totalSpent - cashReturned);

    // Low balance threshold calculation
    const thresholdSetting = await SettingsService.get("LOW_BALANCE_PERCENTAGE_THRESHOLD", "20");
    const thresholdPct = parseFloat(thresholdSetting) || 20;
    const remainingPct = totalAdvance > 0 ? (outstandingBalance / totalAdvance) * 100 : 0;
    const isLowBalance = outstandingBalance > 0 && remainingPct <= thresholdPct;

    // Overdue check
    const now = new Date();
    const isOverdue = advance.dueDate ? advance.dueDate < now && advance.status !== "SETTLED" : false;

    return {
      advanceId: advance.id,
      referenceNo: advance.referenceNo,
      employeeId: advance.employeeId,
      employeeName: advance.employee.fullName,
      totalAdvance,
      totalSpent,
      cashReturned,
      outstandingBalance,
      settlementDifference,
      isLowBalance,
      isOverdue,
      status: advance.status,
    };
  }

  /**
   * Global aggregated petty cash metrics across ESPACIO ERP.
   */
  public static async calculateGlobalPettyCashSummary(): Promise<GlobalPettyCashSummary> {
    const advances = await db.employeeAdvance.findMany({
      include: {
        expenses: { where: { status: "RECORDED" }, select: { amount: true } },
        settlements: { select: { cashReturned: true } },
      },
    });

    let totalAdvancesIssued = 0;
    let totalSpent = 0;
    let totalCashReturned = 0;
    let openAdvancesCount = 0;
    let overdueAdvancesCount = 0;
    let discrepanciesCount = 0;

    const now = new Date();

    for (const adv of advances) {
      if (adv.status !== "CANCELLED") {
        totalAdvancesIssued += adv.amount;

        for (const exp of adv.expenses) {
          totalSpent += exp.amount;
        }

        for (const set of adv.settlements) {
          totalCashReturned += set.cashReturned;
        }

        if (adv.status === "ISSUED" || adv.status === "PARTIALLY_SETTLED" || adv.status === "APPROVED") {
          openAdvancesCount++;
        }

        if (adv.dueDate && adv.dueDate < now && adv.status !== "SETTLED") {
          overdueAdvancesCount++;
        }
      }
    }

    totalAdvancesIssued = this.roundCurrency(totalAdvancesIssued);
    totalSpent = this.roundCurrency(totalSpent);
    totalCashReturned = this.roundCurrency(totalCashReturned);

    const totalOutstandingBalance = this.roundCurrency(
      totalAdvancesIssued - totalSpent - totalCashReturned
    );

    const discrepancySettlementsCount = await db.advanceSettlement.count({
      where: { status: "DISCREPANCY" },
    });

    return {
      totalAdvancesIssued,
      totalSpent,
      totalCashReturned,
      totalOutstandingBalance,
      openAdvancesCount,
      overdueAdvancesCount,
      discrepanciesCount: discrepancySettlementsCount,
    };
  }
}
