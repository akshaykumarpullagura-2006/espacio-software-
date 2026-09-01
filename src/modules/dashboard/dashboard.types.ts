export type DashboardPeriod =
  | "TODAY"
  | "THIS_WEEK"
  | "THIS_MONTH"
  | "LAST_MONTH"
  | "THIS_QUARTER"
  | "THIS_YEAR"
  | "OVERALL"
  | "CUSTOM";

export interface DashboardPeriodOptions {
  period: DashboardPeriod;
  startDate?: string;
  endDate?: string;
}

export interface PrimaryKPIs {
  totalLeads: number;
  activeProjects: number;
  completedProjects: number;
  delayedProjects: number;
  pendingClientPayments: number;
  monthlyProfit: number;
  monthlyProfitMarginPct: number | null;
  monthlyRevenue: number;
  monthlyExpenses: number;
  todayFollowUpsCount: number;
  pendingApprovalsCount: number;
  isLoss: boolean;
}

export interface FinancialSummary {
  periodLabel: string;
  startDate: string;
  endDate: string;
  revenue: number;
  expenses: number;
  profit: number;
  profitMarginPct: number | null;
  isLoss: boolean;
  totalContractValue: number;
  totalPaymentsCollected: number;
  pendingReceivables: number;
}

export interface TrendMonthData {
  monthKey: string;
  monthLabel: string;
  revenue: number;
  expense: number;
  profit: number;
}

export interface PipelineStageData {
  stageKey: string;
  label: string;
  count: number;
  percentage: number;
  color: string;
}

export interface FollowUpItem {
  id: string;
  leadId?: string;
  type: "LEAD_FOLLOWUP";
  title: string;
  clientOrLeadName: string;
  referenceNo: string;
  dueAt: string;
  status: "PENDING" | "OVERDUE" | "COMPLETED";
  phone?: string;
  assignedUserName?: string;
  actionUrl: string;
}

export interface ActivityItem {
  id: string;
  actorName: string;
  action: string;
  entityType: string;
  entityId: string;
  title: string;
  createdAt: string;
  actionUrl?: string;
}

export interface NotificationSummary {
  totalUnread: number;
  urgentCount: number;
  categories: {
    system: number;
    payment: number;
    project: number;
    task: number;
  };
  recentItems: Array<{
    id: string;
    title: string;
    message: string;
    priority: string;
    createdAt: string;
    actionUrl?: string;
  }>;
}

export interface QuickAccessItem {
  id: string;
  label: string;
  href: string;
  iconName: string;
  permissionRequired?: string;
  color: string;
}

export interface DashboardSummaryResponse {
  period: DashboardPeriod;
  periodLabel: string;
  startDate: string;
  endDate: string;
  hasFinanceAccess: boolean;
  kpis: PrimaryKPIs;
  financialSummary: FinancialSummary | null;
  financialTrend: TrendMonthData[];
  pipeline: {
    totalActive: number;
    stages: PipelineStageData[];
  };
  followUps: {
    todayCount: number;
    overdueCount: number;
    items: FollowUpItem[];
  };
  activities: ActivityItem[];
  notifications: NotificationSummary;
  quickAccess: QuickAccessItem[];
}
