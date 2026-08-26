import { db } from "@/lib/db";
import { RbacService } from "@/modules/rbac/rbac.service";
import { InventoryCalculationService } from "@/modules/inventory/inventory-calculation.service";
import { AuthError, ForbiddenError } from "@/lib/errors";

export type DatePeriod =
  | "today"
  | "this_week"
  | "this_month"
  | "last_month"
  | "this_quarter"
  | "this_year"
  | "custom";

export interface AnalyticsDateFilter {
  period?: DatePeriod;
  startDate?: string | Date;
  endDate?: string | Date;
  projectId?: string;
  clientId?: string;
}

export interface ResolvedDateRange {
  startDate: Date;
  endDate: Date;
  previousStartDate: Date;
  previousEndDate: Date;
  periodLabel: string;
}

export interface ReceivableAgingBucket {
  bucket: "current" | "days_1_30" | "days_31_60" | "days_61_90" | "days_90_plus";
  label: string;
  amount: number;
  count: number;
  invoiceIds: string[];
}

export class AnalyticsService {
  /**
   * Resolve Date Range boundaries and corresponding previous period for trend comparisons.
   */
  public static resolveDateRange(filter?: AnalyticsDateFilter): ResolvedDateRange {
    const now = new Date();
    const period = filter?.period || "this_month";

    let startDate: Date;
    let endDate: Date;
    let previousStartDate: Date;
    let previousEndDate: Date;
    let periodLabel = "This Month";

    if (period === "today") {
      startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);
      previousStartDate = new Date(startDate.getTime() - 24 * 60 * 60 * 1000);
      previousEndDate = new Date(endDate.getTime() - 24 * 60 * 60 * 1000);
      periodLabel = "Today";
    } else if (period === "this_week") {
      const day = now.getDay();
      const diff = now.getDate() - day + (day === 0 ? -6 : 1); // Monday start
      startDate = new Date(now.getFullYear(), now.getMonth(), diff, 0, 0, 0, 0);
      endDate = new Date(startDate.getTime() + 7 * 24 * 60 * 60 * 1000 - 1);
      previousStartDate = new Date(startDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      previousEndDate = new Date(endDate.getTime() - 7 * 24 * 60 * 60 * 1000);
      periodLabel = "This Week";
    } else if (period === "last_month") {
      startDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      previousStartDate = new Date(now.getFullYear(), now.getMonth() - 2, 1, 0, 0, 0, 0);
      previousEndDate = new Date(now.getFullYear(), now.getMonth() - 1, 0, 23, 59, 59, 999);
      periodLabel = startDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    } else if (period === "this_quarter") {
      const q = Math.floor(now.getMonth() / 3);
      startDate = new Date(now.getFullYear(), q * 3, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), (q + 1) * 3, 0, 23, 59, 59, 999);
      previousStartDate = new Date(now.getFullYear(), (q - 1) * 3, 1, 0, 0, 0, 0);
      previousEndDate = new Date(now.getFullYear(), q * 3, 0, 23, 59, 59, 999);
      periodLabel = `Q${q + 1} ${now.getFullYear()}`;
    } else if (period === "this_year") {
      startDate = new Date(now.getFullYear(), 0, 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      previousStartDate = new Date(now.getFullYear() - 1, 0, 1, 0, 0, 0, 0);
      previousEndDate = new Date(now.getFullYear() - 1, 11, 31, 23, 59, 59, 999);
      periodLabel = `${now.getFullYear()}`;
    } else if (period === "custom" && filter?.startDate && filter?.endDate) {
      startDate = new Date(filter.startDate);
      startDate.setHours(0, 0, 0, 0);
      endDate = new Date(filter.endDate);
      endDate.setHours(23, 59, 59, 999);
      const duration = endDate.getTime() - startDate.getTime();
      previousEndDate = new Date(startDate.getTime() - 1);
      previousStartDate = new Date(previousEndDate.getTime() - duration);
      periodLabel = `${startDate.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} - ${endDate.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`;
    } else {
      // Default: this_month
      startDate = new Date(now.getFullYear(), now.getMonth(), 1, 0, 0, 0, 0);
      endDate = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
      previousStartDate = new Date(now.getFullYear(), now.getMonth() - 1, 1, 0, 0, 0, 0);
      previousEndDate = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      periodLabel = startDate.toLocaleDateString("en-IN", { month: "long", year: "numeric" });
    }

    return {
      startDate,
      endDate,
      previousStartDate,
      previousEndDate,
      periodLabel,
    };
  }

  /**
   * Helper to calculate percentage delta between current and previous period.
   */
  private static calculateDelta(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 1000) / 10;
  }

  // ==========================================
  // 1. EXECUTIVE & PERSONALIZED DASHBOARD
  // ==========================================

  public static async getExecutiveDashboard(userId: string, filter?: AnalyticsDateFilter) {
    const permissions = await RbacService.getUserPermissions(userId);
    const hasCompanyWide = permissions.includes("*") || permissions.includes("reports:company_wide") || permissions.includes("analytics:executive");
    const hasFinance = permissions.includes("*") || permissions.includes("reports:finance") || permissions.includes("analytics:finance");
    const hasHr = permissions.includes("*") || permissions.includes("reports:hr") || permissions.includes("analytics:hr") || permissions.includes("employees:view_salary");

    const range = this.resolveDateRange(filter);
    const now = new Date();

    // Standard User Dashboard (Personalized)
    if (!hasCompanyWide) {
      const [myTasks, myProjects, myLeads, myNotifications] = await Promise.all([
        db.task.findMany({
          where: { assigneeId: userId, status: { notIn: ["COMPLETED", "CANCELLED"] } },
          orderBy: { dueAt: "asc" },
          take: 10,
          select: { id: true, referenceNo: true, title: true, priority: true, status: true, dueAt: true },
        }),
        db.projectMember.findMany({
          where: { userId },
          include: { project: { select: { id: true, referenceNo: true, title: true, stage: true, status: true } } },
          take: 10,
        }),
        db.lead.findMany({
          where: { assignedToId: userId, stage: { notIn: ["WON", "LOST"] } },
          orderBy: { updatedAt: "desc" },
          take: 10,
          select: { id: true, referenceNo: true, clientName: true, stage: true, priority: true },
        }),
        db.notification.findMany({
          where: { userId, isRead: false },
          orderBy: { createdAt: "desc" },
          take: 5,
        }),
      ]);

      const overdueTasksCount = myTasks.filter((t) => t.dueAt && new Date(t.dueAt) < now).length;

      return {
        viewType: "USER_PERSONALIZED",
        userId,
        period: range.periodLabel,
        summary: {
          activeTasksCount: myTasks.length,
          overdueTasksCount,
          assignedProjectsCount: myProjects.length,
          activeLeadsCount: myLeads.length,
          unreadNotificationsCount: myNotifications.length,
        },
        myTasks,
        myProjects: myProjects.map((p) => p.project),
        myLeads,
        myNotifications,
      };
    }

    // Company-Wide Executive Dashboard (Admin / Super Admin)
    const [
      currentRevenueAgg,
      prevRevenueAgg,
      currentCollectionsAgg,
      prevCollectionsAgg,
      currentExpensesAgg,
      prevExpensesAgg,
      pointInTimeReceivablesAgg,
      activeProjectsCount,
      completedProjectsCount,
      currentLeadsAgg,
      prevLeadsAgg,
      wonLeadsCount,
      closedLeadsCount,
      openPipelineAgg,
      lowStockMaterialsCount,
      overdueTasksCount,
      pendingInvoicesCount,
      openPurchaseOrdersCount,
      employeeCostAgg,
    ] = await Promise.all([
      // 1. Current Period Realized Revenue (Issued Invoices)
      db.gstInvoice.aggregate({
        _sum: { grandTotal: true },
        where: {
          invoiceDate: { gte: range.startDate, lte: range.endDate },
          status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] },
        },
      }),
      // 2. Previous Period Revenue
      db.gstInvoice.aggregate({
        _sum: { grandTotal: true },
        where: {
          invoiceDate: { gte: range.previousStartDate, lte: range.previousEndDate },
          status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] },
        },
      }),
      // 3. Current Period Collections (Client Payments)
      db.clientPayment.aggregate({
        _sum: { amount: true },
        where: {
          paymentDate: { gte: range.startDate, lte: range.endDate },
          status: "VERIFIED",
        },
      }),
      // 4. Previous Period Collections
      db.clientPayment.aggregate({
        _sum: { amount: true },
        where: {
          paymentDate: { gte: range.previousStartDate, lte: range.previousEndDate },
          status: "VERIFIED",
        },
      }),
      // 5. Current Period Expenses
      db.expense.aggregate({
        _sum: { amount: true },
        where: {
          expenseDate: { gte: range.startDate, lte: range.endDate },
          status: { in: ["APPROVED", "PAID"] },
        },
      }),
      // 6. Previous Period Expenses
      db.expense.aggregate({
        _sum: { amount: true },
        where: {
          expenseDate: { gte: range.previousStartDate, lte: range.previousEndDate },
          status: { in: ["APPROVED", "PAID"] },
        },
      }),
      // 7. Point-in-Time Outstanding Receivables
      db.clientReceivable.aggregate({
        _sum: { outstandingAmount: true },
        where: { status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] } },
      }),
      // 8. Point-in-Time Active Projects
      db.project.count({
        where: { status: { in: ["ACTIVE", "IN_PROGRESS", "PLANNING"] } },
      }),
      // 9. Completed Projects in period
      db.project.count({
        where: {
          actualCompletionDate: { gte: range.startDate, lte: range.endDate },
          status: "COMPLETED",
        },
      }),
      // 10. Current Period New Leads
      db.lead.count({
        where: { createdAt: { gte: range.startDate, lte: range.endDate } },
      }),
      // 11. Previous Period New Leads
      db.lead.count({
        where: { createdAt: { gte: range.previousStartDate, lte: range.previousEndDate } },
      }),
      // 12. Won Leads in period
      db.lead.count({
        where: {
          updatedAt: { gte: range.startDate, lte: range.endDate },
          stage: "WON",
        },
      }),
      // 13. Total Closed Leads in period (Won + Lost)
      db.lead.count({
        where: {
          updatedAt: { gte: range.startDate, lte: range.endDate },
          stage: { in: ["WON", "LOST"] },
        },
      }),
      // 14. Pipeline Value (Active Leads estimated budget)
      db.lead.aggregate({
        _sum: { estimatedBudget: true },
        where: { stage: { notIn: ["WON", "LOST"] } },
      }),
      // 15. Low Stock Materials Count
      db.material.count({
        where: {
          status: "ACTIVE",
          reorderLevel: { gt: 0 },
        },
      }),
      // 16. Overdue Tasks Count
      db.task.count({
        where: {
          dueAt: { lt: now },
          status: { notIn: ["COMPLETED", "CANCELLED"] },
        },
      }),
      // 17. Pending Approvals Invoices
      db.gstInvoice.count({
        where: { status: "PENDING_APPROVAL" },
      }),
      // 18. Open Purchase Orders Count
      db.purchaseOrder.count({
        where: { status: { in: ["ISSUED", "APPROVED", "PARTIALLY_RECEIVED"] } },
      }),
      // 19. Employee Salary Costs (Restricted)
      hasHr
        ? db.employeeSalaryPayment.aggregate({
            _sum: { amount: true },
            where: { paymentDate: { gte: range.startDate, lte: range.endDate }, status: "PAID" },
          })
        : Promise.resolve({ _sum: { amount: null } }),
    ]);

    const revenue = currentRevenueAgg._sum.grandTotal ?? 0;
    const prevRevenue = prevRevenueAgg._sum.grandTotal ?? 0;
    const collections = currentCollectionsAgg._sum.amount ?? 0;
    const prevCollections = prevCollectionsAgg._sum.amount ?? 0;
    const expenses = currentExpensesAgg._sum.amount ?? 0;
    const prevExpenses = prevExpensesAgg._sum.amount ?? 0;
    const outstandingReceivable = pointInTimeReceivablesAgg._sum.outstandingAmount ?? 0;
    const newLeads = currentLeadsAgg;
    const prevLeads = prevLeadsAgg;
    const pipelineValue = openPipelineAgg._sum.estimatedBudget ?? 0;
    const winRate = closedLeadsCount > 0 ? Math.round((wonLeadsCount / closedLeadsCount) * 1000) / 10 : 0;
    const employeeCost = hasHr ? (employeeCostAgg._sum.amount ?? 0) : undefined;
    const projectContributionEstimate = revenue - expenses;

    return {
      viewType: "EXECUTIVE_COMPANY_WIDE",
      dateRange: {
        startDate: range.startDate.toISOString(),
        endDate: range.endDate.toISOString(),
        label: range.periodLabel,
      },
      kpiCards: {
        revenue: {
          value: revenue,
          previousPeriodValue: prevRevenue,
          deltaPercentage: this.calculateDelta(revenue, prevRevenue),
          label: "Total Realized Revenue",
          definition: "Sum of finalized & issued GST invoices in selected period",
          isPeriodMetric: true,
        },
        collections: {
          value: collections,
          previousPeriodValue: prevCollections,
          deltaPercentage: this.calculateDelta(collections, prevCollections),
          label: "Collections",
          definition: "Sum of verified client payments in selected period",
          isPeriodMetric: true,
        },
        outstanding: {
          value: outstandingReceivable,
          label: "Outstanding Receivables",
          definition: "Current point-in-time open and overdue client receivables balance",
          isPeriodMetric: false,
        },
        expenses: {
          value: expenses,
          previousPeriodValue: prevExpenses,
          deltaPercentage: this.calculateDelta(expenses, prevExpenses),
          label: "Total Expenses",
          definition: "Sum of approved & paid expenses in selected period",
          isPeriodMetric: true,
        },
        contributionEstimate: {
          value: projectContributionEstimate,
          label: "Project Contribution Estimate",
          definition: "Revenue minus recorded direct & operational expenses in period",
          isPeriodMetric: true,
        },
        activeProjects: {
          value: activeProjectsCount,
          completedInPeriod: completedProjectsCount,
          label: "Active Projects",
          definition: "Point-in-time active client projects currently in progress",
          isPeriodMetric: false,
        },
        pipeline: {
          value: pipelineValue,
          newLeadsCount: newLeads,
          leadsDeltaPercentage: this.calculateDelta(newLeads, prevLeads),
          winRatePercentage: winRate,
          label: "Sales Pipeline Value",
          definition: "Estimated budget value of open qualified leads",
          isPeriodMetric: false,
        },
        ...(hasHr && employeeCost !== undefined
          ? {
              employeeCost: {
                value: employeeCost,
                label: "Employee Salary Cost",
                definition: "Total paid employee compensation in period",
                isPeriodMetric: true,
              },
            }
          : {}),
      },
      operationalAlerts: {
        overdueTasksCount,
        lowStockMaterialsCount,
        openPurchaseOrdersCount,
        pendingInvoicesCount,
      },
    };
  }

  // ==========================================
  // 2. REVENUE ANALYTICS
  // ==========================================

  public static async getRevenueAnalytics(filter?: AnalyticsDateFilter) {
    const range = this.resolveDateRange(filter);

    const invoices = await db.gstInvoice.findMany({
      where: {
        invoiceDate: { gte: range.startDate, lte: range.endDate },
        status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] },
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
        ...(filter?.clientId ? { clientId: filter.clientId } : {}),
      },
      include: {
        project: { select: { id: true, referenceNo: true, title: true } },
        client: { select: { id: true, referenceNo: true, fullName: true } },
      },
      orderBy: { invoiceDate: "asc" },
    });

    const totalRevenue = invoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
    const totalTaxable = invoices.reduce((acc, inv) => acc + inv.taxableAmount, 0);
    const totalTax = invoices.reduce((acc, inv) => acc + inv.totalTax, 0);

    // Revenue by Month
    const monthlyMap = new Map<string, number>();
    for (const inv of invoices) {
      const monthKey = inv.invoiceDate.toISOString().slice(0, 7); // YYYY-MM
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + inv.grandTotal);
    }
    const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
      month,
      amount,
    }));

    // Revenue by Project
    const projectMap = new Map<string, { id: string; title: string; referenceNo: string; amount: number }>();
    for (const inv of invoices) {
      const projId = inv.projectId || "unassigned";
      const title = inv.project?.title || "General Billing";
      const ref = inv.project?.referenceNo || "N/A";
      const existing = projectMap.get(projId) || { id: projId, title, referenceNo: ref, amount: 0 };
      existing.amount += inv.grandTotal;
      projectMap.set(projId, existing);
    }
    const byProject = Array.from(projectMap.values()).sort((a, b) => b.amount - a.amount);

    // Revenue by Client
    const clientMap = new Map<string, { id: string; name: string; referenceNo: string; amount: number }>();
    for (const inv of invoices) {
      const cId = inv.clientId || "unassigned";
      const name = inv.client?.fullName || inv.customerName;
      const ref = inv.client?.referenceNo || "N/A";
      const existing = clientMap.get(cId) || { id: cId, name, referenceNo: ref, amount: 0 };
      existing.amount += inv.grandTotal;
      clientMap.set(cId, existing);
    }
    const byClient = Array.from(clientMap.values()).sort((a, b) => b.amount - a.amount);

    return {
      period: range.periodLabel,
      totalRevenue,
      totalTaxable,
      totalTax,
      invoiceCount: invoices.length,
      monthlyTrend,
      byProject,
      byClient,
    };
  }

  // ==========================================
  // 3. COLLECTION & RECEIVABLE AGING ANALYTICS
  // ==========================================

  public static async getCollectionAnalytics(filter?: AnalyticsDateFilter) {
    const range = this.resolveDateRange(filter);
    const now = new Date();

    // 1. Collections in period
    const payments = await db.clientPayment.findMany({
      where: {
        paymentDate: { gte: range.startDate, lte: range.endDate },
        status: "VERIFIED",
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
        ...(filter?.clientId ? { clientId: filter.clientId } : {}),
      },
      include: {
        client: { select: { id: true, referenceNo: true, fullName: true } },
        project: { select: { id: true, referenceNo: true, title: true } },
      },
      orderBy: { paymentDate: "desc" },
    });

    const totalCollected = payments.reduce((acc, p) => acc + p.amount, 0);

    // 2. Point-in-time Open Receivables for Aging
    const receivables = await db.clientReceivable.findMany({
      where: {
        status: { in: ["OPEN", "PARTIALLY_PAID", "OVERDUE"] },
        outstandingAmount: { gt: 0 },
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
        ...(filter?.clientId ? { clientId: filter.clientId } : {}),
      },
      include: {
        client: { select: { id: true, referenceNo: true, fullName: true } },
        project: { select: { id: true, referenceNo: true, title: true } },
      },
    });

    const totalOutstanding = receivables.reduce((acc, r) => acc + r.outstandingAmount, 0);

    // Aging Buckets
    const aging: Record<string, ReceivableAgingBucket> = {
      current: { bucket: "current", label: "Current (Not Overdue)", amount: 0, count: 0, invoiceIds: [] },
      days_1_30: { bucket: "days_1_30", label: "1 - 30 Days Overdue", amount: 0, count: 0, invoiceIds: [] },
      days_31_60: { bucket: "days_31_60", label: "31 - 60 Days Overdue", amount: 0, count: 0, invoiceIds: [] },
      days_61_90: { bucket: "days_61_90", label: "61 - 90 Days Overdue", amount: 0, count: 0, invoiceIds: [] },
      days_90_plus: { bucket: "days_90_plus", label: "90+ Days Overdue", amount: 0, count: 0, invoiceIds: [] },
    };

    let totalOverdue = 0;

    for (const r of receivables) {
      const due = r.dueDate ? new Date(r.dueDate) : now;
      const diffMs = now.getTime() - due.getTime();
      const diffDays = Math.floor(diffMs / (24 * 60 * 60 * 1000));

      if (diffDays <= 0) {
        aging.current.amount += r.outstandingAmount;
        aging.current.count += 1;
        aging.current.invoiceIds.push(r.id);
      } else if (diffDays <= 30) {
        aging.days_1_30.amount += r.outstandingAmount;
        aging.days_1_30.count += 1;
        aging.days_1_30.invoiceIds.push(r.id);
        totalOverdue += r.outstandingAmount;
      } else if (diffDays <= 60) {
        aging.days_31_60.amount += r.outstandingAmount;
        aging.days_31_60.count += 1;
        aging.days_31_60.invoiceIds.push(r.id);
        totalOverdue += r.outstandingAmount;
      } else if (diffDays <= 90) {
        aging.days_61_90.amount += r.outstandingAmount;
        aging.days_61_90.count += 1;
        aging.days_61_90.invoiceIds.push(r.id);
        totalOverdue += r.outstandingAmount;
      } else {
        aging.days_90_plus.amount += r.outstandingAmount;
        aging.days_90_plus.count += 1;
        aging.days_90_plus.invoiceIds.push(r.id);
        totalOverdue += r.outstandingAmount;
      }
    }

    const collectionRate =
      totalCollected + totalOutstanding > 0
        ? Math.round((totalCollected / (totalCollected + totalOutstanding)) * 1000) / 10
        : 100;

    return {
      period: range.periodLabel,
      totalCollected,
      totalOutstanding,
      totalOverdue,
      collectionRatePercentage: collectionRate,
      receivablesCount: receivables.length,
      agingBuckets: Object.values(aging),
    };
  }

  // ==========================================
  // 4. EXPENSE ANALYTICS
  // ==========================================

  public static async getExpenseAnalytics(filter?: AnalyticsDateFilter) {
    const range = this.resolveDateRange(filter);

    const expenses = await db.expense.findMany({
      where: {
        expenseDate: { gte: range.startDate, lte: range.endDate },
        status: { in: ["APPROVED", "PAID"] },
        ...(filter?.projectId ? { projectId: filter.projectId } : {}),
      },
      include: {
        project: { select: { id: true, referenceNo: true, title: true } },
      },
      orderBy: { expenseDate: "asc" },
    });

    const totalExpenses = expenses.reduce((acc, e) => acc + e.amount, 0);

    // Breakdown by Category
    const categoryMap = new Map<string, number>();
    for (const e of expenses) {
      categoryMap.set(e.categoryKey, (categoryMap.get(e.categoryKey) || 0) + e.amount);
    }
    const byCategory = Array.from(categoryMap.entries()).map(([category, amount]) => ({
      category,
      amount,
      percentage: totalExpenses > 0 ? Math.round((amount / totalExpenses) * 1000) / 10 : 0,
    })).sort((a, b) => b.amount - a.amount);

    // Breakdown by Type (PROJECT vs BUSINESS)
    const projectExpenses = expenses.filter((e) => e.expenseType === "PROJECT").reduce((acc, e) => acc + e.amount, 0);
    const operationalExpenses = expenses.filter((e) => e.expenseType === "BUSINESS").reduce((acc, e) => acc + e.amount, 0);

    // Monthly Trend
    const monthlyMap = new Map<string, number>();
    for (const e of expenses) {
      const monthKey = e.expenseDate.toISOString().slice(0, 7);
      monthlyMap.set(monthKey, (monthlyMap.get(monthKey) || 0) + e.amount);
    }
    const monthlyTrend = Array.from(monthlyMap.entries()).map(([month, amount]) => ({
      month,
      amount,
    }));

    return {
      period: range.periodLabel,
      totalExpenses,
      projectExpenses,
      operationalExpenses,
      expenseCount: expenses.length,
      byCategory,
      monthlyTrend,
    };
  }

  // ==========================================
  // 5. PROJECT PROFITABILITY & PERFORMANCE
  // ==========================================

  public static async getProjectProfitabilityAnalytics(filter?: AnalyticsDateFilter) {
    const range = this.resolveDateRange(filter);

    const projects = await db.project.findMany({
      where: {
        ...(filter?.projectId ? { id: filter.projectId } : {}),
        ...(filter?.clientId ? { clientId: filter.clientId } : {}),
      },
      include: {
        client: { select: { id: true, referenceNo: true, fullName: true } },
        gstInvoices: {
          where: { status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] } },
          select: { grandTotal: true, paidAmount: true, outstandingAmount: true },
        },
        expenses: {
          where: { status: { in: ["APPROVED", "PAID"] } },
          select: { amount: true, categoryKey: true },
        },
        purchaseOrders: {
          where: { status: { notIn: ["CANCELLED"] } },
          select: { grandTotal: true },
        },
      },
    });

    const projectReports = projects.map((p) => {
      const totalInvoiced = p.gstInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
      const totalCollected = p.gstInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
      const totalOutstanding = p.gstInvoices.reduce((acc, inv) => acc + inv.outstandingAmount, 0);
      const directExpenses = p.expenses.reduce((acc, exp) => acc + exp.amount, 0);
      const directProcurement = p.purchaseOrders.reduce((acc, po) => acc + po.grandTotal, 0);

      // Labelled strictly as Project Contribution Estimate (not net profit)
      const directCostTotal = directExpenses + directProcurement;
      const contributionEstimate = totalInvoiced - directCostTotal;
      const contributionMarginPct = totalInvoiced > 0 ? Math.round((contributionEstimate / totalInvoiced) * 1000) / 10 : 0;
      const budgetVariance = p.contractValue > 0 ? p.contractValue - directCostTotal : 0;

      return {
        projectId: p.id,
        referenceNo: p.referenceNo,
        title: p.title,
        clientName: p.client?.fullName || "N/A",
        stage: p.stage,
        status: p.status,
        contractValue: p.contractValue,
        totalInvoiced,
        totalCollected,
        totalOutstanding,
        directExpenses,
        directProcurement,
        directCostTotal,
        contributionEstimate,
        contributionMarginPct,
        budgetVariance,
        contributionLabel: "Project Contribution Estimate",
      };
    });

    return {
      period: range.periodLabel,
      totalProjectsAnalyzed: projectReports.length,
      projects: projectReports.sort((a, b) => b.totalInvoiced - a.totalInvoiced),
    };
  }

  // ==========================================
  // 6. LEAD & SALES FUNNEL ANALYTICS
  // ==========================================

  public static async getLeadAnalytics(filter?: AnalyticsDateFilter) {
    const range = this.resolveDateRange(filter);
    const now = new Date();

    const leads = await db.lead.findMany({
      where: {
        createdAt: { gte: range.startDate, lte: range.endDate },
      },
      select: {
        id: true,
        referenceNo: true,
        clientName: true,
        stage: true,
        sourceKey: true,
        estimatedBudget: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    const totalLeads = leads.length;
    const stageCounts: Record<string, number> = {};
    const sourceCounts: Record<string, number> = {};
    let totalPipelineValue = 0;
    let totalAgeDays = 0;

    for (const lead of leads) {
      stageCounts[lead.stage] = (stageCounts[lead.stage] || 0) + 1;
      sourceCounts[lead.sourceKey] = (sourceCounts[lead.sourceKey] || 0) + 1;

      if (!["WON", "LOST"].includes(lead.stage)) {
        totalPipelineValue += lead.estimatedBudget || 0;
      }

      const ageMs = now.getTime() - new Date(lead.createdAt).getTime();
      totalAgeDays += Math.floor(ageMs / (24 * 60 * 60 * 1000));
    }

    const wonCount = stageCounts["WON"] || 0;
    const lostCount = stageCounts["LOST"] || 0;
    const closedCount = wonCount + lostCount;
    const conversionRate = closedCount > 0 ? Math.round((wonCount / closedCount) * 1000) / 10 : 0;
    const averageLeadAgeDays = totalLeads > 0 ? Math.round(totalAgeDays / totalLeads) : 0;

    return {
      period: range.periodLabel,
      totalLeads,
      wonCount,
      lostCount,
      conversionRatePercentage: conversionRate,
      pipelineValue: totalPipelineValue,
      averageLeadAgeDays,
      stageFunnel: stageCounts,
      sourcesBreakdown: sourceCounts,
    };
  }

  // ==========================================
  // 7. QUOTATION ANALYTICS
  // ==========================================

  public static async getQuotationAnalytics(filter?: AnalyticsDateFilter) {
    const range = this.resolveDateRange(filter);

    const quotations = await db.quotation.findMany({
      where: {
        createdAt: { gte: range.startDate, lte: range.endDate },
      },
      select: {
        id: true,
        referenceNo: true,
        status: true,
        totalAmount: true,
        projectId: true,
      },
    });

    const totalQuotations = quotations.length;
    const approvedQuotations = quotations.filter((q) => q.status === "APPROVED");
    const rejectedQuotations = quotations.filter((q) => q.status === "REJECTED");
    const draftQuotations = quotations.filter((q) => q.status === "DRAFT");

    const totalValue = quotations.reduce((acc, q) => acc + q.totalAmount, 0);
    const approvedValue = approvedQuotations.reduce((acc, q) => acc + q.totalAmount, 0);
    const approvalRate = totalQuotations > 0 ? Math.round((approvedQuotations.length / totalQuotations) * 1000) / 10 : 0;
    const averageQuotationValue = totalQuotations > 0 ? Math.round(totalValue / totalQuotations) : 0;

    // Conversion to created projects
    const convertedToProjects = approvedQuotations.filter((q) => q.projectId !== null).length;
    const projectConversionRate = approvedQuotations.length > 0
      ? Math.round((convertedToProjects / approvedQuotations.length) * 1000) / 10
      : 0;

    return {
      period: range.periodLabel,
      totalQuotations,
      approvedCount: approvedQuotations.length,
      rejectedCount: rejectedQuotations.length,
      draftCount: draftQuotations.length,
      totalValue,
      approvedValue,
      approvalRatePercentage: approvalRate,
      averageQuotationValue,
      convertedToProjectsCount: convertedToProjects,
      projectConversionRatePercentage: projectConversionRate,
    };
  }

  // ==========================================
  // 8. CLIENT & CONCENTRATION ANALYTICS
  // ==========================================

  public static async getClientAnalytics(filter?: AnalyticsDateFilter) {
    const range = this.resolveDateRange(filter);

    const clients = await db.client.findMany({
      include: {
        gstInvoices: {
          where: {
            invoiceDate: { gte: range.startDate, lte: range.endDate },
            status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] },
          },
          select: { grandTotal: true, paidAmount: true, outstandingAmount: true },
        },
        projects: { select: { id: true, status: true } },
      },
    });

    const clientSummaries = clients.map((c) => {
      const totalRevenue = c.gstInvoices.reduce((acc, inv) => acc + inv.grandTotal, 0);
      const totalCollected = c.gstInvoices.reduce((acc, inv) => acc + inv.paidAmount, 0);
      const totalOutstanding = c.gstInvoices.reduce((acc, inv) => acc + inv.outstandingAmount, 0);

      return {
        clientId: c.id,
        referenceNo: c.referenceNo,
        fullName: c.fullName,
        clientType: c.clientType,
        totalRevenue,
        totalCollected,
        totalOutstanding,
        projectCount: c.projects.length,
      };
    });

    const activeRevenueClients = clientSummaries.filter((c) => c.totalRevenue > 0).sort((a, b) => b.totalRevenue - a.totalRevenue);
    const overallRevenue = activeRevenueClients.reduce((acc, c) => acc + c.totalRevenue, 0);

    // Top 5 Clients concentration
    const top5Revenue = activeRevenueClients.slice(0, 5).reduce((acc, c) => acc + c.totalRevenue, 0);
    const top5ConcentrationPct = overallRevenue > 0 ? Math.round((top5Revenue / overallRevenue) * 1000) / 10 : 0;

    return {
      period: range.periodLabel,
      totalClients: clients.length,
      activeRevenueClientsCount: activeRevenueClients.length,
      overallRevenue,
      top5ConcentrationPercentage: top5ConcentrationPct,
      topClients: activeRevenueClients.slice(0, 10),
    };
  }

  // ==========================================
  // 9. PROCUREMENT & VENDOR ANALYTICS
  // ==========================================

  public static async getProcurementAnalytics(filter?: AnalyticsDateFilter) {
    const range = this.resolveDateRange(filter);
    const now = new Date();

    const [pos, vendors] = await Promise.all([
      db.purchaseOrder.findMany({
        where: {
          poDate: { gte: range.startDate, lte: range.endDate },
          status: { notIn: ["CANCELLED"] },
        },
        include: {
          vendor: { select: { id: true, referenceNo: true, name: true, categoryKey: true } },
          project: { select: { id: true, referenceNo: true, title: true } },
        },
      }),
      db.vendor.findMany({
        select: { id: true, referenceNo: true, name: true, categoryKey: true, status: true },
      }),
    ]);

    const totalPOValue = pos.reduce((acc, po) => acc + po.grandTotal, 0);
    const openPOs = pos.filter((po) => ["ISSUED", "APPROVED", "PARTIALLY_RECEIVED"].includes(po.status));
    const overdueDeliveries = pos.filter(
      (po) => po.expectedDeliveryDate && new Date(po.expectedDeliveryDate) < now && po.status !== "RECEIVED"
    );

    // Vendor spend map
    const vendorSpendMap = new Map<string, { id: string; name: string; category: string; orderCount: number; spend: number }>();
    for (const po of pos) {
      const vId = po.vendorId;
      const existing = vendorSpendMap.get(vId) || {
        id: vId,
        name: po.vendor.name,
        category: po.vendor.categoryKey,
        orderCount: 0,
        spend: 0,
      };
      existing.orderCount += 1;
      existing.spend += po.grandTotal;
      vendorSpendMap.set(vId, existing);
    }
    const topVendors = Array.from(vendorSpendMap.values()).sort((a, b) => b.spend - a.spend);

    return {
      period: range.periodLabel,
      totalPurchaseOrders: pos.length,
      totalSpend: totalPOValue,
      openPOCount: openPOs.length,
      overdueDeliveryCount: overdueDeliveries.length,
      totalVendors: vendors.length,
      topVendorsBySpend: topVendors.slice(0, 10),
    };
  }

  // ==========================================
  // 10. INVENTORY ANALYTICS
  // ==========================================

  public static async getInventoryAnalytics() {
    const [materials, lowStockMaterials, warehouses, balances] = await Promise.all([
      db.material.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, materialCode: true, name: true, categoryKey: true, purchaseCost: true, reorderLevel: true },
      }),
      db.material.findMany({
        where: { status: "ACTIVE", reorderLevel: { gt: 0 } },
        select: { id: true, name: true, materialCode: true, reorderLevel: true },
      }),
      db.warehouse.findMany({
        where: { status: "ACTIVE" },
        select: { id: true, warehouseCode: true, name: true, type: true },
      }),
      db.stockBalance.findMany({
        select: { materialId: true, physicalStock: true },
      }),
    ]);

    // Calculate total valuation
    const stockMap = new Map<string, number>();
    for (const b of balances) {
      stockMap.set(b.materialId, (stockMap.get(b.materialId) || 0) + b.physicalStock);
    }

    let totalValuation = 0;
    for (const mat of materials) {
      const stock = stockMap.get(mat.id) || 0;
      totalValuation += mat.purchaseCost * stock;
    }

    return {
      totalSKUs: materials.length,
      totalValuation: Math.round(totalValuation * 100) / 100,
      valuationStatus: "AVAILABLE",
      lowStockCount: lowStockMaterials.length,
      warehouseCount: warehouses.length,
    };
  }

  // ==========================================
  // 11. TASK & OPERATIONS ANALYTICS
  // ==========================================

  public static async getTaskAnalytics(filter?: AnalyticsDateFilter) {
    const range = this.resolveDateRange(filter);
    const now = new Date();

    const tasks = await db.task.findMany({
      where: {
        createdAt: { gte: range.startDate, lte: range.endDate },
      },
      include: {
        assignee: { select: { id: true, fullName: true, email: true } },
      },
    });

    const totalTasks = tasks.length;
    const completedTasks = tasks.filter((t) => t.status === "COMPLETED");
    const inProgressTasks = tasks.filter((t) => t.status === "IN_PROGRESS");
    const blockedTasks = tasks.filter((t) => t.status === "BLOCKED");
    const overdueTasks = tasks.filter((t) => t.dueAt && new Date(t.dueAt) < now && t.status !== "COMPLETED");

    const completionRate = totalTasks > 0 ? Math.round((completedTasks.length / totalTasks) * 1000) / 10 : 0;

    // Team Workload Map
    const workloadMap = new Map<string, { id: string; name: string; assigned: number; completed: number; overdue: number }>();
    for (const t of tasks) {
      if (!t.assignee) continue;
      const uId = t.assignee.id;
      const existing = workloadMap.get(uId) || { id: uId, name: t.assignee.fullName, assigned: 0, completed: 0, overdue: 0 };
      existing.assigned += 1;
      if (t.status === "COMPLETED") existing.completed += 1;
      if (t.dueAt && new Date(t.dueAt) < now && t.status !== "COMPLETED") existing.overdue += 1;
      workloadMap.set(uId, existing);
    }

    return {
      period: range.periodLabel,
      totalTasks,
      completedCount: completedTasks.length,
      inProgressCount: inProgressTasks.length,
      blockedCount: blockedTasks.length,
      overdueCount: overdueTasks.length,
      completionRatePercentage: completionRate,
      teamWorkload: Array.from(workloadMap.values()).sort((a, b) => b.assigned - a.assigned),
    };
  }

  // ==========================================
  // 12. GST & TAX ANALYTICS
  // ==========================================

  public static async getGstTaxAnalytics(filter?: AnalyticsDateFilter) {
    const range = this.resolveDateRange(filter);

    const invoices = await db.gstInvoice.findMany({
      where: {
        invoiceDate: { gte: range.startDate, lte: range.endDate },
        status: { in: ["ISSUED", "PAID", "PARTIALLY_PAID"] },
      },
    });

    let totalTaxable = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;
    let totalTax = 0;
    let b2bCount = 0;
    let b2cCount = 0;

    for (const inv of invoices) {
      totalTaxable += inv.taxableAmount;
      totalCgst += inv.cgstAmount;
      totalSgst += inv.sgstAmount;
      totalIgst += inv.igstAmount;
      totalTax += inv.totalTax;

      if (inv.customerGstin && inv.customerGstin.trim().length > 0) {
        b2bCount += 1;
      } else {
        b2cCount += 1;
      }
    }

    return {
      period: range.periodLabel,
      totalInvoices: invoices.length,
      totalTaxableValue: Math.round(totalTaxable * 100) / 100,
      totalCgst: Math.round(totalCgst * 100) / 100,
      totalSgst: Math.round(totalSgst * 100) / 100,
      totalIgst: Math.round(totalIgst * 100) / 100,
      totalTax: Math.round(totalTax * 100) / 100,
      b2bInvoicesCount: b2bCount,
      b2cInvoicesCount: b2cCount,
    };
  }
}
