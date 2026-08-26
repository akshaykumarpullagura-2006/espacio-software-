import { db, withDbRetry } from "@/lib/db";
import { RbacService } from "@/modules/rbac/rbac.service";
import {
  DashboardPeriod,
  DashboardPeriodOptions,
  DashboardSummaryResponse,
  FollowUpItem,
  ActivityItem,
  PipelineStageData,
  TrendMonthData,
  QuickAccessItem,
} from "./dashboard.types";

export class DashboardMetricsService {
  /**
   * Resolve date boundaries for the selected period
   */
  public static resolvePeriodDates(options: DashboardPeriodOptions): {
    startDate: Date;
    endDate: Date;
    periodLabel: string;
  } {
    const now = new Date();
    const period = options.period || "THIS_MONTH";

    if (period === "OVERALL") {
      const s = new Date(2000, 0, 1);
      const e = new Date(now.getFullYear() + 10, 11, 31, 23, 59, 59, 999);
      return {
        startDate: s,
        endDate: e,
        periodLabel: "Overall (All Time)",
      };
    }

    if (period === "CUSTOM" && options.startDate && options.endDate) {
      const s = new Date(options.startDate);
      const e = new Date(options.endDate);
      e.setHours(23, 59, 59, 999);
      return {
        startDate: s,
        endDate: e,
        periodLabel: `${s.toLocaleDateString("en-IN", { month: "short", day: "numeric" })} - ${e.toLocaleDateString("en-IN", { month: "short", day: "numeric", year: "numeric" })}`,
      };
    }

    if (period === "LAST_MONTH") {
      const s = new Date(now.getFullYear(), now.getMonth() - 1, 1);
      const e = new Date(now.getFullYear(), now.getMonth(), 0, 23, 59, 59, 999);
      return {
        startDate: s,
        endDate: e,
        periodLabel: s.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
      };
    }

    if (period === "THIS_QUARTER") {
      const currentQuarter = Math.floor(now.getMonth() / 3);
      const s = new Date(now.getFullYear(), currentQuarter * 3, 1);
      const e = new Date(now.getFullYear(), (currentQuarter + 1) * 3, 0, 23, 59, 59, 999);
      return {
        startDate: s,
        endDate: e,
        periodLabel: `Q${currentQuarter + 1} ${now.getFullYear()}`,
      };
    }

    if (period === "THIS_YEAR") {
      const s = new Date(now.getFullYear(), 0, 1);
      const e = new Date(now.getFullYear(), 11, 31, 23, 59, 59, 999);
      return {
        startDate: s,
        endDate: e,
        periodLabel: `Year ${now.getFullYear()}`,
      };
    }

    // Default: THIS_MONTH
    const s = new Date(now.getFullYear(), now.getMonth(), 1);
    const e = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59, 999);
    return {
      startDate: s,
      endDate: e,
      periodLabel: s.toLocaleDateString("en-IN", { month: "long", year: "numeric" }),
    };
  }

  /**
   * Main aggregator method for Executive Command Center
   */
  public static async getDashboardSummary(
    userId: string,
    options: DashboardPeriodOptions = { period: "THIS_MONTH" }
  ): Promise<DashboardSummaryResponse> {
    const now = new Date();
    const { startDate, endDate, periodLabel } = this.resolvePeriodDates(options);

    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59, 999);

    // 1. RBAC Check for Financial Visibility
    const userPermissions = await RbacService.getUserPermissions(userId);
    const hasFinanceAccess =
      userPermissions.includes("*") ||
      userPermissions.includes("payments:read") ||
      userPermissions.includes("expenses:read") ||
      userPermissions.includes("finance:read");

    // 2. Fetch Authoritative Data in Parallel with resilient retry
    const [
      totalLeads,
      activeProjects,
      completedProjects,
      delayedProjects,
      allContractVal,
      allPaymentsVerified,
      periodRevenueData,
      periodExpenseData,
      todayLeadFollowups,
      overdueLeadFollowups,
      todayTasks,
      stageGroupCounts,
      recentAuditLogs,
      recentActivityLogs,
      unreadNotifCount,
      urgentNotifCount,
      recentNotifications,
    ] = await withDbRetry(() =>
      Promise.all([
        // A. Total Leads
        db.lead.count(),

        // B. Active Projects (Not completed and not cancelled)
        db.project.count({
          where: { stage: { notIn: ["COMPLETED", "CANCELLED"] } },
        }),

        // C. Completed Projects
        db.project.count({
          where: { stage: "COMPLETED" },
        }),

        // D. Delayed Projects (Active projects past handover target date)
        db.project.count({
          where: {
            stage: { notIn: ["COMPLETED", "CANCELLED"] },
            handoverDate: { lt: now },
          },
        }),

        // E. Total Contract Value for Pending Receivables
        hasFinanceAccess
          ? db.project.aggregate({
              _sum: { contractValue: true },
              where: { stage: { not: "CANCELLED" } },
            })
          : Promise.resolve({ _sum: { contractValue: 0 } }),

        // F. Total Lifetime Verified Payments
        hasFinanceAccess
          ? db.clientPayment.aggregate({
              _sum: { amount: true },
              where: { status: "VERIFIED" },
            })
          : Promise.resolve({ _sum: { amount: 0 } }),

        // G. Period Revenue (Verified client payments in period)
        hasFinanceAccess
          ? db.clientPayment.aggregate({
              _sum: { amount: true },
              where: {
                status: "VERIFIED",
                paymentDate: { gte: startDate, lte: endDate },
              },
            })
          : Promise.resolve({ _sum: { amount: 0 } }),

        // H. Period Expenses (Approved expenses in period)
        hasFinanceAccess
          ? db.expense.aggregate({
              _sum: { amount: true },
              where: {
                status: "APPROVED",
                expenseDate: { gte: startDate, lte: endDate },
              },
            })
          : Promise.resolve({ _sum: { amount: 0 } }),

        // I. Today's Lead Followups
        db.leadFollowUp.findMany({
          where: {
            followUpDate: { gte: startOfToday, lte: endOfToday },
            status: "PENDING",
          },
          take: 6,
          orderBy: { followUpDate: "asc" },
          include: {
            lead: {
              select: { id: true, referenceNo: true, clientName: true, phone: true, stage: true },
            },
          },
        }),

        // J. Overdue Lead Followups
        db.leadFollowUp.count({
          where: {
            followUpDate: { lt: startOfToday },
            status: "PENDING",
          },
        }),

        // K. Today's Due Tasks
        db.task.findMany({
          where: {
            dueAt: { gte: startOfToday, lte: endOfToday },
            status: { notIn: ["COMPLETED", "CANCELLED"] },
          },
          take: 6,
          orderBy: { priority: "desc" },
          select: {
            id: true,
            referenceNo: true,
            title: true,
            priority: true,
            status: true,
            dueAt: true,
            assignee: { select: { fullName: true } },
          },
        }),

        // L. Project Pipeline by Stage
        db.project.groupBy({
          by: ["stage"],
          where: { stage: { notIn: ["COMPLETED", "CANCELLED"] } },
          _count: { stage: true },
        }),

        // M. Recent Audit Logs
        db.auditLog.findMany({
          take: 8,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { fullName: true } } },
        }),

        // N. Recent Activity Logs
        db.activityLog.findMany({
          take: 8,
          orderBy: { createdAt: "desc" },
          include: { user: { select: { fullName: true } } },
        }),

        // O. Unread Notifications Count
        db.notification.count({
          where: { userId, isRead: false, dismissedAt: null },
        }),

        // P. Urgent Notifications Count
        db.notification.count({
          where: { userId, isRead: false, priority: "URGENT", dismissedAt: null },
        }),

        // Q. Recent Notifications List
        db.notification.findMany({
          where: { userId, dismissedAt: null },
          take: 5,
          orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
          select: { id: true, title: true, message: true, priority: true, createdAt: true, actionUrl: true },
        }),
      ])
    );

    // 3. Financial Computations
    const totalContractValue = allContractVal._sum.contractValue || 0;
    const totalPaymentsCollected = allPaymentsVerified._sum.amount || 0;
    const pendingClientPayments = Math.max(0, totalContractValue - totalPaymentsCollected);

    const revenue = periodRevenueData._sum.amount || 0;
    const expenses = periodExpenseData._sum.amount || 0;
    const profit = revenue - expenses;
    const isLoss = profit < 0;
    const profitMarginPct = revenue > 0 ? Number(((profit / revenue) * 100).toFixed(1)) : null;

    // 4. 6-Month Dynamic Financial Trend
    const financialTrend: TrendMonthData[] = [];
    if (hasFinanceAccess) {
      const monthsList: Array<{ mStart: Date; mEnd: Date; monthKey: string; monthLabel: string }> = [];
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const mStart = new Date(d.getFullYear(), d.getMonth(), 1);
        const mEnd = new Date(d.getFullYear(), d.getMonth() + 1, 0, 23, 59, 59, 999);
        const monthKey = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
        const monthLabel = d.toLocaleString("en-IN", { month: "short" });
        monthsList.push({ mStart, mEnd, monthKey, monthLabel });
      }

      const trendResults = await withDbRetry(() =>
        Promise.all(
          monthsList.map(async ({ mStart, mEnd, monthKey, monthLabel }) => {
            const [mRev, mExp] = await Promise.all([
              db.clientPayment.aggregate({
                _sum: { amount: true },
                where: {
                  status: "VERIFIED",
                  paymentDate: { gte: mStart, lte: mEnd },
                },
              }),
              db.expense.aggregate({
                _sum: { amount: true },
                where: {
                  status: "APPROVED",
                  expenseDate: { gte: mStart, lte: mEnd },
                },
              }),
            ]);

            const revVal = mRev._sum.amount || 0;
            const expVal = mExp._sum.amount || 0;
            return {
              monthKey,
              monthLabel,
              revenue: revVal,
              expense: expVal,
              profit: revVal - expVal,
            };
          })
        )
      );
      financialTrend.push(...trendResults);
    }

    // 5. Project Pipeline Stages Computation
    const stageMap: Record<string, number> = {};
    stageGroupCounts.forEach((g) => {
      stageMap[g.stage] = g._count.stage;
    });

    const pipelineStagesConfig: Array<{ key: string; label: string; color: string }> = [
      { key: "INITIATED", label: "Initiated", color: "bg-slate-400" },
      { key: "DESIGN_IN_PROGRESS", label: "Design", color: "bg-blue-500" },
      { key: "PROCUREMENT", label: "Procurement", color: "bg-indigo-500" },
      { key: "EXECUTION", label: "Execution", color: "bg-amber-500" },
      { key: "QUALITY_CHECK", label: "Quality Check", color: "bg-purple-500" },
      { key: "HANDOVER", label: "Handover", color: "bg-emerald-500" },
    ];

    const pipelineStages: PipelineStageData[] = pipelineStagesConfig.map((stage) => {
      const count = stageMap[stage.key] || 0;
      const percentage = activeProjects > 0 ? Math.round((count / activeProjects) * 100) : 0;
      return {
        stageKey: stage.key,
        label: stage.label,
        count,
        percentage,
        color: stage.color,
      };
    });

    // 6. Format Today's Follow-ups & Tasks
    const followUpItems: FollowUpItem[] = [
      ...todayLeadFollowups.map((f) => ({
        id: f.id,
        type: "LEAD_FOLLOWUP" as const,
        title: `Follow up with ${f.lead?.clientName || "Lead"}`,
        clientOrLeadName: f.lead?.clientName || "Lead Contact",
        referenceNo: f.lead?.referenceNo || "LEAD",
        dueAt: f.followUpDate.toISOString(),
        status: (f.followUpDate < startOfToday ? "OVERDUE" : "PENDING") as "PENDING" | "OVERDUE",
        phone: f.lead?.phone || undefined,
        actionUrl: `/leads?search=${encodeURIComponent(f.lead?.referenceNo || "")}`,
      })),
      ...todayTasks.map((t) => ({
        id: t.id,
        type: "TASK" as const,
        title: t.title,
        clientOrLeadName: t.assignee?.fullName || "Assigned Team",
        referenceNo: t.referenceNo,
        dueAt: (t.dueAt || now).toISOString(),
        status: (t.dueAt && t.dueAt < startOfToday ? "OVERDUE" : "PENDING") as "PENDING" | "OVERDUE",
        assignedUserName: t.assignee?.fullName || undefined,
        actionUrl: `/tasks`,
      })),
    ];

    // 7. Format Recent Activities
    const activityItems: ActivityItem[] = [];
    if (recentActivityLogs.length > 0) {
      recentActivityLogs.forEach((act) => {
        activityItems.push({
          id: act.id,
          actorName: act.user?.fullName || "System Engine",
          action: act.type || "ACTIVITY",
          entityType: act.entityType,
          entityId: act.entityId,
          title: act.title,
          createdAt: act.createdAt.toISOString(),
        });
      });
    } else {
      recentAuditLogs.forEach((aud) => {
        activityItems.push({
          id: aud.id,
          actorName: aud.user?.fullName || "System Engine",
          action: aud.action,
          entityType: aud.entityType,
          entityId: aud.entityId || aud.id,
          title: `${aud.action} on ${aud.entityType}`,
          createdAt: aud.createdAt.toISOString(),
        });
      });
    }

    // 8. Quick Access Configuration with Permission Checks
    const allQuickShortcuts: QuickAccessItem[] = [
      { id: "new-lead", label: "New Lead", href: "/leads", iconName: "Users", permissionRequired: "leads:write", color: "text-emerald-600 bg-emerald-50" },
      { id: "new-project", label: "New Project", href: "/projects", iconName: "FolderKanban", permissionRequired: "projects:write", color: "text-blue-600 bg-blue-50" },
      { id: "record-payment", label: "Record Payment", href: "/finance/payments", iconName: "Wallet", permissionRequired: "payments:write", color: "text-amber-600 bg-amber-50" },
      { id: "add-expense", label: "Add Expense", href: "/finance/expenses", iconName: "Receipt", permissionRequired: "expenses:write", color: "text-rose-600 bg-rose-50" },
      { id: "new-quotation", label: "New Quotation", href: "/quotations", iconName: "FileText", permissionRequired: "projects:write", color: "text-indigo-600 bg-indigo-50" },
      { id: "vendors", label: "Vendors", href: "/procurement/vendors", iconName: "Building2", permissionRequired: "vendors:read", color: "text-purple-600 bg-purple-50" },
      { id: "purchase-orders", label: "Purchase Orders", href: "/procurement/purchase-orders", iconName: "ShoppingCart", permissionRequired: "purchase_orders:read", color: "text-cyan-600 bg-cyan-50" },
      { id: "reports", label: "Executive Reports", href: "/reports", iconName: "PieChart", permissionRequired: "finance:read", color: "text-emerald-700 bg-emerald-100" },
    ];

    const authorizedQuickAccess = allQuickShortcuts.filter((item) => {
      if (!item.permissionRequired) return true;
      if (userPermissions.includes("*")) return true;
      return userPermissions.includes(item.permissionRequired);
    });

    return {
      period: options.period || "THIS_MONTH",
      periodLabel,
      startDate: startDate.toISOString(),
      endDate: endDate.toISOString(),
      hasFinanceAccess,
      kpis: {
        totalLeads,
        activeProjects,
        completedProjects,
        delayedProjects,
        pendingClientPayments: hasFinanceAccess ? pendingClientPayments : 0,
        monthlyProfit: hasFinanceAccess ? profit : 0,
        monthlyProfitMarginPct: hasFinanceAccess ? profitMarginPct : null,
        monthlyRevenue: hasFinanceAccess ? revenue : 0,
        monthlyExpenses: hasFinanceAccess ? expenses : 0,
        isLoss: hasFinanceAccess ? isLoss : false,
      },
      financialSummary: hasFinanceAccess
        ? {
            periodLabel,
            startDate: startDate.toISOString(),
            endDate: endDate.toISOString(),
            revenue,
            expenses,
            profit,
            profitMarginPct,
            isLoss,
            totalContractValue,
            totalPaymentsCollected,
            pendingReceivables: pendingClientPayments,
          }
        : null,
      financialTrend,
      pipeline: {
        totalActive: activeProjects,
        stages: pipelineStages,
      },
      followUps: {
        todayCount: todayLeadFollowups.length + todayTasks.length,
        overdueCount: overdueLeadFollowups,
        items: followUpItems,
      },
      activities: activityItems,
      notifications: {
        totalUnread: unreadNotifCount,
        urgentCount: urgentNotifCount,
        categories: {
          system: 0,
          payment: 0,
          project: 0,
          task: 0,
        },
        recentItems: recentNotifications.map((n) => ({
          id: n.id,
          title: n.title,
          message: n.message,
          priority: n.priority,
          createdAt: n.createdAt.toISOString(),
          actionUrl: n.actionUrl || "/notifications",
        })),
      },
      quickAccess: authorizedQuickAccess,
    };
  }
}
