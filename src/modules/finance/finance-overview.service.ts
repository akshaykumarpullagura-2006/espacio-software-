import { db } from "@/lib/db";
import { FinanceCalculationService } from "./finance-calculation.service";

export interface MonthlyOverviewMetrics {
  year: number;
  month: number;
  periodKey: string;
  totalRevenue: number;
  totalCashInflow: number;
  totalCashOutflow: number;
  netCashFlow: number;
  directCosts: number;
  grossProfit: number;
  grossProfitMarginPct: number;
  businessOverheads: number;
  netProfit: number;
  netProfitMarginPct: number;
  // MoM
  previousMonthRevenue: number;
  momRevenueGrowthPct: number | null;
  previousMonthNetProfit: number;
  momNetProfitGrowthPct: number | null;
  // YoY
  previousYearSameMonthRevenue: number;
  yoyRevenueGrowthPct: number | null;
  // Accounts
  accountsBalance: { id: string; name: string; type: string; currentBalance: number }[];
  // Analytics
  incomeByCategory: { categoryKey: string; amount: number }[];
  expenseByCategory: { categoryKey: string; amount: number }[];
  paymentModeBreakdown: { paymentMethod: string; inflow: number; outflow: number }[];
}

export class FinanceOverviewService {
  public static async getCompanyOverview(year?: number, month?: number): Promise<MonthlyOverviewMetrics> {
    const now = new Date();
    const targetYear = year ?? now.getFullYear();
    const targetMonth = month ?? now.getMonth() + 1;

    const periodKey = `${targetYear}-${String(targetMonth).padStart(2, "0")}`;
    const startDate = new Date(targetYear, targetMonth - 1, 1);
    const endDate = new Date(targetYear, targetMonth, 0, 23, 59, 59);

    // Previous month dates (MoM)
    const prevMonthDate = new Date(targetYear, targetMonth - 2, 1);
    const prevMonthStart = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth(), 1);
    const prevMonthEnd = new Date(prevMonthDate.getFullYear(), prevMonthDate.getMonth() + 1, 0, 23, 59, 59);

    // Previous year same month dates (YoY)
    const prevYearStart = new Date(targetYear - 1, targetMonth - 1, 1);
    const prevYearEnd = new Date(targetYear - 1, targetMonth, 0, 23, 59, 59);

    const [
      currentLedger,
      currentClientPayments,
      currentExpenses,
      prevMonthPayments,
      prevMonthExpenses,
      prevYearPayments,
      prevYearExpenses,
      accounts,
    ] = await Promise.all([
      db.financialLedger.findMany({
        where: { transactionDate: { gte: startDate, lte: endDate }, status: "RECORDED" },
      }),
      db.clientPayment.findMany({
        where: { paymentDate: { gte: startDate, lte: endDate }, status: "VERIFIED" },
      }),
      db.expense.findMany({
        where: { expenseDate: { gte: startDate, lte: endDate }, status: { in: ["APPROVED", "PAID"] } },
      }),
      db.clientPayment.findMany({
        where: { paymentDate: { gte: prevMonthStart, lte: prevMonthEnd }, status: "VERIFIED" },
      }),
      db.expense.findMany({
        where: { expenseDate: { gte: prevMonthStart, lte: prevMonthEnd }, status: { in: ["APPROVED", "PAID"] } },
      }),
      db.clientPayment.findMany({
        where: { paymentDate: { gte: prevYearStart, lte: prevYearEnd }, status: "VERIFIED" },
      }),
      db.expense.findMany({
        where: { expenseDate: { gte: prevYearStart, lte: prevYearEnd }, status: { in: ["APPROVED", "PAID"] } },
      }),
      db.financialAccount.findMany({ where: { status: "ACTIVE" } }),
    ]);

    // Current Month Calculations
    const totalRevenue = FinanceCalculationService.roundMoney(
      currentClientPayments.reduce((sum, p) => sum + p.amount, 0)
    );

    const totalCashInflow = FinanceCalculationService.roundMoney(
      currentLedger.filter((l) => l.direction === "INFLOW").reduce((sum, l) => sum + l.amount, 0)
    );
    const totalCashOutflow = FinanceCalculationService.roundMoney(
      currentLedger.filter((l) => l.direction === "OUTFLOW").reduce((sum, l) => sum + l.amount, 0)
    );
    const netCashFlow = FinanceCalculationService.roundMoney(totalCashInflow - totalCashOutflow);

    // Direct Costs (Project Expenses + Material Vendor Payments)
    const directCosts = FinanceCalculationService.roundMoney(
      currentExpenses.filter((e) => e.expenseType === "PROJECT").reduce((sum, e) => sum + e.amount, 0)
    );

    // Business Overheads (Salaries, Marketing, Rent, Office, Utilities)
    const businessOverheads = FinanceCalculationService.roundMoney(
      currentExpenses.filter((e) => e.expenseType === "BUSINESS").reduce((sum, e) => sum + e.amount, 0)
    );

    const grossProfit = FinanceCalculationService.roundMoney(totalRevenue - directCosts);
    const grossProfitMarginPct = totalRevenue > 0 ? FinanceCalculationService.roundMoney((grossProfit / totalRevenue) * 100) : 0;

    const netProfit = FinanceCalculationService.roundMoney(grossProfit - businessOverheads);
    const netProfitMarginPct = totalRevenue > 0 ? FinanceCalculationService.roundMoney((netProfit / totalRevenue) * 100) : 0;

    // MoM Calculations
    const previousMonthRevenue = FinanceCalculationService.roundMoney(
      prevMonthPayments.reduce((sum, p) => sum + p.amount, 0)
    );
    const prevMonthDirectCosts = prevMonthExpenses
      .filter((e) => e.expenseType === "PROJECT")
      .reduce((sum, e) => sum + e.amount, 0);
    const prevMonthOverheads = prevMonthExpenses
      .filter((e) => e.expenseType === "BUSINESS")
      .reduce((sum, e) => sum + e.amount, 0);
    const previousMonthNetProfit = FinanceCalculationService.roundMoney(
      previousMonthRevenue - prevMonthDirectCosts - prevMonthOverheads
    );

    const momRevenueGrowthPct = FinanceCalculationService.calculateGrowthPct(totalRevenue, previousMonthRevenue);
    const momNetProfitGrowthPct = FinanceCalculationService.calculateGrowthPct(netProfit, previousMonthNetProfit);

    // YoY Calculations
    const previousYearSameMonthRevenue = FinanceCalculationService.roundMoney(
      prevYearPayments.reduce((sum, p) => sum + p.amount, 0)
    );
    const yoyRevenueGrowthPct = FinanceCalculationService.calculateGrowthPct(totalRevenue, previousYearSameMonthRevenue);

    // Analytics: Expenses by Category
    const categoryMap = new Map<string, number>();
    for (const e of currentExpenses) {
      categoryMap.set(e.categoryKey, (categoryMap.get(e.categoryKey) || 0) + e.amount);
    }
    const expenseByCategory = Array.from(categoryMap.entries()).map(([categoryKey, amount]) => ({
      categoryKey,
      amount: FinanceCalculationService.roundMoney(amount),
    }));

    // Analytics: Payment Mode Breakdown
    const modeMap = new Map<string, { inflow: number; outflow: number }>();
    for (const l of currentLedger) {
      const mode = l.paymentMethod || "BANK_TRANSFER";
      if (!modeMap.has(mode)) {
        modeMap.set(mode, { inflow: 0, outflow: 0 });
      }
      const item = modeMap.get(mode)!;
      if (l.direction === "INFLOW") item.inflow += l.amount;
      if (l.direction === "OUTFLOW") item.outflow += l.amount;
    }

    const paymentModeBreakdown = Array.from(modeMap.entries()).map(([paymentMethod, data]) => ({
      paymentMethod,
      inflow: FinanceCalculationService.roundMoney(data.inflow),
      outflow: FinanceCalculationService.roundMoney(data.outflow),
    }));

    return {
      year: targetYear,
      month: targetMonth,
      periodKey,
      totalRevenue,
      totalCashInflow,
      totalCashOutflow,
      netCashFlow,
      directCosts,
      grossProfit,
      grossProfitMarginPct,
      businessOverheads,
      netProfit,
      netProfitMarginPct,
      previousMonthRevenue,
      momRevenueGrowthPct,
      previousMonthNetProfit,
      momNetProfitGrowthPct,
      previousYearSameMonthRevenue,
      yoyRevenueGrowthPct,
      accountsBalance: accounts.map((a) => ({
        id: a.id,
        name: a.name,
        type: a.type,
        currentBalance: a.currentBalance,
      })),
      incomeByCategory: [{ categoryKey: "Interior Projects", amount: totalRevenue }],
      expenseByCategory,
      paymentModeBreakdown,
    };
  }
}
