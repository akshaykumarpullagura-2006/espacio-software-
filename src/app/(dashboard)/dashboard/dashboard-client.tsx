"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DashboardSummaryResponse,
  DashboardPeriod,
  FollowUpItem,
} from "@/modules/dashboard/dashboard.types";
import { formatCurrency, formatRelativeTime, formatDate } from "@/lib/utils";
import {
  FolderKanban,
  Users,
  Wallet,
  Receipt,
  ArrowRight,
  CheckCircle2,
  Clock,
  AlertTriangle,
  TrendingUp,
  TrendingDown,
  Bell,
  Calendar,
  FileText,
  Building2,
  ShoppingCart,
  PieChart,
  ChevronRight,
  ChevronDown,
  Sparkles,
  RefreshCw,
  PhoneCall,
  Coins,
  Package,
  AlertCircle,
  ShieldCheck,
  Check,
  X,
  ExternalLink,
} from "lucide-react";

import { PendingApprovalsCard } from "@/components/dashboard/pending-approvals-card";
import { PendingApprovalsData } from "@/modules/approvals/approvals.service";

interface DashboardClientProps {
  initialData: DashboardSummaryResponse;
  initialApprovals?: PendingApprovalsData;
  user?: {
    id: string;
    email: string;
    fullName: string;
    accessLevel: string;
  };
}

export function DashboardClient({ initialData, initialApprovals, user }: DashboardClientProps) {
  const router = useRouter();
  const [data, setData] = useState<DashboardSummaryResponse>(initialData);
  const [selectedPeriod, setSelectedPeriod] = useState<DashboardPeriod>(initialData.period || "THIS_MONTH");
  const [customStart, setCustomStart] = useState("");
  const [customEnd, setCustomEnd] = useState("");
  const [showCustomModal, setShowCustomModal] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  // Follow-up interaction modal states
  const [completingItem, setCompletingItem] = useState<FollowUpItem | null>(null);
  const [outcomeNotes, setOutcomeNotes] = useState("");
  const [reschedulingItem, setReschedulingItem] = useState<FollowUpItem | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState("");
  const [rescheduleNotes, setRescheduleNotes] = useState("");
  const [isSubmittingAction, setIsSubmittingAction] = useState(false);

  // Active chart hover item
  const [hoveredTrendIdx, setHoveredTrendIdx] = useState<number | null>(null);

  // Fetch updated data from Dashboard API
  const fetchDashboardData = async (period: DashboardPeriod, sDate?: string, eDate?: string) => {
    setIsRefreshing(true);
    setError(null);
    try {
      const params = new URLSearchParams();
      params.set("period", period);
      if (sDate) params.set("startDate", sDate);
      if (eDate) params.set("endDate", eDate);

      const res = await fetch(`/api/v1/dashboard/summary?${params.toString()}`);
      const json = await res.json();

      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load dashboard data");
      }

      setData(json.data);
      setSelectedPeriod(period);
    } catch (err: any) {
      setError(err.message || "Unable to refresh dashboard data");
    } finally {
      setIsRefreshing(false);
    }
  };

  const handlePeriodChange = (period: DashboardPeriod) => {
    setSelectedPeriod(period);
    if (period === "CUSTOM") {
      setShowCustomModal(true);
      return;
    }
    startTransition(() => {
      fetchDashboardData(period);
    });
  };

  const closeCustomModal = () => {
    setShowCustomModal(false);
    if (selectedPeriod === "CUSTOM" && data.period !== "CUSTOM") {
      setSelectedPeriod(data.period || "THIS_MONTH");
    }
  };

  const applyCustomRange = (e: React.FormEvent) => {
    e.preventDefault();
    if (!customStart || !customEnd) return;
    setShowCustomModal(false);
    startTransition(() => {
      fetchDashboardData("CUSTOM", customStart, customEnd);
    });
  };

  const handleManualRefresh = () => {
    startTransition(() => {
      if (selectedPeriod === "CUSTOM") {
        fetchDashboardData("CUSTOM", customStart, customEnd);
      } else {
        fetchDashboardData(selectedPeriod);
      }
      router.refresh();
    });
  };

  // Follow-up Action Submissions
  const handleCompleteFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingItem) return;

    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/v1/dashboard/follow-ups/${completingItem.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "complete",
          type: completingItem.type,
          outcomeNotes: outcomeNotes || "Completed via Command Center",
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to complete follow-up");
      }

      setSuccessToast(`Follow-up "${completingItem.title}" marked as complete.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setCompletingItem(null);
      setOutcomeNotes("");
      await fetchDashboardData(selectedPeriod, customStart, customEnd);
    } catch (err: any) {
      setError(err.message || "Failed to complete follow-up");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  const handleRescheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reschedulingItem || !rescheduleDate) return;

    setIsSubmittingAction(true);
    try {
      const res = await fetch(`/api/v1/dashboard/follow-ups/${reschedulingItem.id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "reschedule",
          type: reschedulingItem.type,
          newDate: rescheduleDate,
          notes: rescheduleNotes,
        }),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to reschedule follow-up");
      }

      setSuccessToast(`Follow-up rescheduled to ${new Date(rescheduleDate).toLocaleDateString("en-IN")}.`);
      setTimeout(() => setSuccessToast(null), 4000);
      setReschedulingItem(null);
      setRescheduleDate("");
      setRescheduleNotes("");
      await fetchDashboardData(selectedPeriod, customStart, customEnd);
    } catch (err: any) {
      setError(err.message || "Failed to reschedule follow-up");
    } finally {
      setIsSubmittingAction(false);
    }
  };

  // Helper to map icon names for quick access
  const renderQuickIcon = (iconName: string) => {
    switch (iconName) {
      case "Users":
        return <Users className="w-3.5 h-3.5 text-walnut group-hover:text-charcoal transition-colors" />;
      case "FolderKanban":
        return <FolderKanban className="w-3.5 h-3.5 text-walnut group-hover:text-charcoal transition-colors" />;
      case "Wallet":
        return <Wallet className="w-3.5 h-3.5 text-gold group-hover:text-charcoal transition-colors" />;
      case "Receipt":
        return <Receipt className="w-3.5 h-3.5 text-walnut group-hover:text-charcoal transition-colors" />;
      case "FileText":
        return <FileText className="w-3.5 h-3.5 text-walnut group-hover:text-charcoal transition-colors" />;
      case "Building2":
        return <Building2 className="w-3.5 h-3.5 text-walnut group-hover:text-charcoal transition-colors" />;
      case "ShoppingCart":
        return <ShoppingCart className="w-3.5 h-3.5 text-cyan-600 group-hover:text-charcoal transition-colors" />;
      case "Coins":
        return <Coins className="w-3.5 h-3.5 text-amber-700 group-hover:text-charcoal transition-colors" />;
      case "Package":
        return <Package className="w-3.5 h-3.5 text-teal-600 group-hover:text-charcoal transition-colors" />;
      case "PieChart":
        return <PieChart className="w-3.5 h-3.5 text-emerald-700 group-hover:text-charcoal transition-colors" />;
      default:
        return <FolderKanban className="w-3.5 h-3.5 text-walnut group-hover:text-charcoal transition-colors" />;
    }
  };

  // Calculate max trend value for scaling chart bars
  const maxTrendVal = Math.max(
    ...(data.financialTrend?.map((t) => Math.max(t.revenue, t.expense)) || [100000]),
    100000
  );

  return (
    <div className="space-y-6 w-full min-w-0 pb-12 select-none">
      {/* 1. Header Toolbar & Period Selector */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-walnut/15 min-w-0 w-full">
        <div className="min-w-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <h1 className="text-xl font-bold text-charcoal tracking-tight truncate">Executive Command Center</h1>
            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-gold-soft text-charcoal border border-gold/40 shadow-2xs shrink-0">
              <span className="w-1.5 h-1.5 rounded-full bg-gold animate-pulse" /> Live Telemetry
            </span>
          </div>
          <p className="text-xs text-walnut mt-1 truncate">
            Authoritative real-time business operations, financial control, and project execution
          </p>
        </div>

        {/* Global Period Controls */}
        <div className="flex flex-wrap items-center gap-2.5 max-w-full">
          {/* Period Filter Dropdown (All 7 Periods Supported) */}
          <div className="relative flex items-center bg-offwhite border border-walnut/20 rounded-lg px-3 py-1.5 shadow-2xs hover:border-gold/60 focus-within:border-gold focus-within:ring-1 focus-within:ring-gold/30 transition-all shrink-0">
            <Calendar className="w-3.5 h-3.5 text-gold shrink-0 mr-2 pointer-events-none" />
            <label htmlFor="dashboard-period-select" className="sr-only">
              Filter by Period
            </label>
            <select
              id="dashboard-period-select"
              value={selectedPeriod}
              onChange={(e) => handlePeriodChange(e.target.value as DashboardPeriod)}
              className="bg-transparent text-xs font-bold text-charcoal focus:outline-none cursor-pointer pr-6 appearance-none"
            >
              <option value="TODAY">Today</option>
              <option value="THIS_WEEK">This Week</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="THIS_QUARTER">This Quarter</option>
              <option value="THIS_YEAR">This Year</option>
              <option value="OVERALL">Overall (All Time)</option>
              <option value="CUSTOM">Custom Date Range...</option>
            </select>
            <ChevronDown className="w-3.5 h-3.5 text-walnut absolute right-2.5 pointer-events-none" />
          </div>

          {/* Active Period Date Tag */}
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-offwhite border border-walnut/20 rounded-lg text-xs font-mono text-charcoal shadow-2xs shrink-0 font-bold">
            <span className="w-1.5 h-1.5 rounded-full bg-gold shrink-0" />
            <span>{data.periodLabel}</span>
          </div>

          {/* Refresh Button */}
          <Button
            variant="secondary"
            size="sm"
            onClick={handleManualRefresh}
            isLoading={isRefreshing || isPending}
            className="flex items-center gap-1.5 text-xs px-3 shrink-0"
            title="Refresh authoritative database metrics"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing || isPending ? "animate-spin" : ""}`} />
            <span>Refresh</span>
          </Button>
        </div>
      </div>

      {/* Success Notification Toast */}
      {successToast && (
        <div className="p-3 bg-semantic-success-bg border border-semantic-success-border rounded-lg flex items-center justify-between text-xs text-semantic-success font-semibold min-w-0 shadow-2xs animate-in fade-in duration-150">
          <div className="flex items-center gap-2 truncate">
            <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
            <span className="truncate">{successToast}</span>
          </div>
          <button onClick={() => setSuccessToast(null)} className="text-walnut hover:text-charcoal cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Error Banner with Retry */}
      {error && (
        <div className="p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-lg flex items-center justify-between text-xs text-semantic-danger font-semibold min-w-0">
          <div className="flex items-center gap-2 truncate">
            <AlertCircle className="w-4 h-4 text-semantic-danger shrink-0" />
            <span className="truncate">{error}</span>
          </div>
          <Button variant="secondary" size="sm" onClick={() => fetchDashboardData(selectedPeriod)} className="shrink-0">
            Retry
          </Button>
        </div>
      )}

      {/* Admin Pending Approvals Command Center */}
      {user?.accessLevel === "ADMIN" && (
        <PendingApprovalsCard
          initialData={initialApprovals}
          onActionComplete={handleManualRefresh}
        />
      )}

      {/* Quick Enterprise Shortcuts (8 Distinct Standard Shortcuts) */}
      {data.quickAccess && data.quickAccess.length > 0 && (
        <div className="min-w-0 w-full">
          <h3 className="text-[11px] font-bold uppercase tracking-wider text-walnut/90 mb-2 flex items-center gap-1.5">
            <span>Quick Enterprise Shortcuts</span>
          </h3>
          <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-8 gap-2 min-w-0 w-full">
            {data.quickAccess.map((item) => (
              <Link
                key={item.id}
                href={item.href}
                className="py-2 px-2.5 bg-offwhite border border-walnut/15 rounded-lg shadow-2xs hover:border-gold hover:shadow-xs transition-all flex flex-col items-center justify-center gap-1.5 text-center group min-w-0"
              >
                <div className="p-1.5 rounded-md bg-cream/70 border border-walnut/15 group-hover:bg-gold-soft group-hover:border-gold/40 group-hover:scale-105 transition-all shrink-0">
                  {renderQuickIcon(item.iconName)}
                </div>
                <span className="text-[11px] font-semibold text-charcoal group-hover:text-charcoal transition-colors truncate w-full" title={item.label}>
                  {item.label}
                </span>
              </Link>
            ))}
          </div>
        </div>
      )}

      {/* 2. PRIMARY 10 KPI CARDS (Executive Command Center Grid) */}
      <div className="space-y-2">
        <h3 className="text-[11px] font-bold uppercase tracking-wider text-walnut/90 flex items-center justify-between">
          <span>Authoritative Operations & Financial KPIs</span>
          <span className="text-[10px] font-mono text-walnut">Context: {data.periodLabel}</span>
        </h3>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5 min-w-0 w-full">
          {/* 1. Total Leads */}
          <Link href="/leads" className="block group min-w-0 w-full">
            <StatCard
              label="Total Leads"
              value={data.kpis.totalLeads}
              subtitle="CRM Opportunities"
              icon={<Users className="w-4 h-4 text-walnut group-hover:scale-110 transition-transform" />}
            />
          </Link>

          {/* 2. Active Projects */}
          <Link href="/projects?status=ACTIVE" className="block group min-w-0 w-full">
            <StatCard
              label="Active Projects"
              value={data.kpis.activeProjects}
              subtitle="In Execution Pipeline"
              icon={<FolderKanban className="w-4 h-4 text-walnut group-hover:scale-110 transition-transform" />}
            />
          </Link>

          {/* 3. Completed Projects */}
          <Link href="/projects?stage=PROJECT_COMPLETED" className="block group min-w-0 w-full">
            <StatCard
              label="Completed Projects"
              value={data.kpis.completedProjects}
              subtitle="Handed Over to Client"
              icon={<CheckCircle2 className="w-4 h-4 text-semantic-success group-hover:scale-110 transition-transform" />}
            />
          </Link>

          {/* 4. Delayed Projects */}
          <Link href="/projects?delayHealth=DELAYED" className="block group min-w-0 w-full">
            <StatCard
              label="Delayed Projects"
              value={data.kpis.delayedProjects}
              subtitle={data.kpis.delayedProjects > 0 ? "Past Handover Date" : "100% On Schedule"}
              trend={data.kpis.delayedProjects > 0 ? "Requires Attention" : "Optimal"}
              trendType={data.kpis.delayedProjects > 0 ? "negative" : "positive"}
              icon={
                <AlertTriangle
                  className={`w-4 h-4 ${data.kpis.delayedProjects > 0 ? "text-semantic-danger" : "text-walnut/60"} group-hover:scale-110 transition-transform`}
                />
              }
            />
          </Link>

          {/* 5. Pending Client Receivables */}
          {data.hasFinanceAccess ? (
            <Link href="/finance/receivables" className="block group min-w-0 w-full">
              <StatCard
                label="Pending Receivables"
                value={formatCurrency(data.kpis.pendingClientPayments)}
                subtitle="Client Balance Due"
                icon={<Wallet className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />}
              />
            </Link>
          ) : (
            <div className="block opacity-60 min-w-0 w-full">
              <StatCard
                label="Pending Receivables"
                value="Restricted"
                subtitle="Requires Finance Role"
                icon={<Wallet className="w-4 h-4 text-walnut/40" />}
              />
            </div>
          )}

          {/* 6. Period Revenue */}
          {data.hasFinanceAccess ? (
            <Link href="/finance/payments" className="block group min-w-0 w-full">
              <StatCard
                label="Period Revenue"
                value={formatCurrency(data.kpis.monthlyRevenue)}
                subtitle="Verified Inflow"
                trend="Verified Only"
                trendType="positive"
                icon={<TrendingUp className="w-4 h-4 text-semantic-success group-hover:scale-110 transition-transform" />}
              />
            </Link>
          ) : (
            <div className="block opacity-60 min-w-0 w-full">
              <StatCard
                label="Period Revenue"
                value="Restricted"
                subtitle="Requires Finance Role"
                icon={<TrendingUp className="w-4 h-4 text-walnut/40" />}
              />
            </div>
          )}

          {/* 7. Period Expenses */}
          {data.hasFinanceAccess ? (
            <Link href="/finance/expenses" className="block group min-w-0 w-full">
              <StatCard
                label="Period Expenses"
                value={formatCurrency(data.kpis.monthlyExpenses)}
                subtitle="Approved Outflow"
                trend="Approved Claims"
                trendType="neutral"
                icon={<Receipt className="w-4 h-4 text-walnut group-hover:scale-110 transition-transform" />}
              />
            </Link>
          ) : (
            <div className="block opacity-60 min-w-0 w-full">
              <StatCard
                label="Period Expenses"
                value="Restricted"
                subtitle="Requires Finance Role"
                icon={<Receipt className="w-4 h-4 text-walnut/40" />}
              />
            </div>
          )}

          {/* 8. Period Net Profit */}
          {data.hasFinanceAccess ? (
            <Link href="/finance/overview" className="block group min-w-0 w-full">
              <StatCard
                label="Period Net Profit"
                value={formatCurrency(data.kpis.monthlyProfit)}
                subtitle={
                  data.kpis.monthlyProfitMarginPct !== null
                    ? `${data.kpis.monthlyProfitMarginPct}% Net Margin`
                    : "0.0% Net Margin"
                }
                trend={data.kpis.isLoss ? "Operating Loss" : "Net Inflow"}
                trendType={data.kpis.isLoss ? "negative" : "positive"}
                icon={
                  data.kpis.isLoss ? (
                    <TrendingDown className="w-4 h-4 text-semantic-danger" />
                  ) : (
                    <TrendingUp className="w-4 h-4 text-semantic-success" />
                  )
                }
              />
            </Link>
          ) : (
            <div className="block opacity-60 min-w-0 w-full">
              <StatCard
                label="Period Net Profit"
                value="Restricted"
                subtitle="Requires Finance Role"
                icon={<TrendingUp className="w-4 h-4 text-walnut/40" />}
              />
            </div>
          )}

          {/* 9. Today's Follow-ups */}
          <Link href="/leads" className="block group min-w-0 w-full">
            <StatCard
              label="Today's Follow-ups"
              value={data.kpis.todayFollowUpsCount}
              subtitle="Scheduled Client Tasks"
              trend={data.kpis.todayFollowUpsCount > 0 ? "Pending Action" : "All Clear"}
              trendType={data.kpis.todayFollowUpsCount > 0 ? "warning" : "positive"}
              icon={<PhoneCall className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />}
            />
          </Link>

          {/* 10. Pending Approvals */}
          {user?.accessLevel === "ADMIN" ? (
            <Link href="/finance/payments" className="block group min-w-0 w-full">
              <StatCard
                label="Pending Approvals"
                value={data.kpis.pendingApprovalsCount}
                subtitle="Payments & Expenses"
                trend={data.kpis.pendingApprovalsCount > 0 ? "Awaiting Review" : "Queue Empty"}
                trendType={data.kpis.pendingApprovalsCount > 0 ? "warning" : "positive"}
                icon={<ShieldCheck className="w-4 h-4 text-gold group-hover:scale-110 transition-transform" />}
              />
            </Link>
          ) : (
            <div className="block opacity-60 min-w-0 w-full">
              <StatCard
                label="Pending Approvals"
                value="Admin Control"
                subtitle="Requires Admin Role"
                icon={<ShieldCheck className="w-4 h-4 text-walnut/40" />}
              />
            </div>
          )}
        </div>
      </div>

      {/* 3. Financial Performance Summary Section */}
      {data.hasFinanceAccess && data.financialSummary && (
        <Card
          header={
            <div className="flex items-center justify-between w-full">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-gold" />
                <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                  Financial Performance Summary ({data.periodLabel})
                </h3>
              </div>
              <Link
                href="/finance/overview"
                className="text-[11px] text-charcoal hover:text-gold font-bold inline-flex items-center gap-1"
              >
                Executive Finance Ledger <ArrowRight className="w-3 h-3 text-gold" />
              </Link>
            </div>
          }
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            {/* Revenue */}
            <div className="p-4 bg-cream/60 rounded-lg border border-walnut/15 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold text-walnut uppercase tracking-wider flex items-center gap-1">
                Verified Collections (Revenue)
              </span>
              <p className="text-2xl font-bold text-charcoal mt-1 tabular-nums font-mono">
                {formatCurrency(data.financialSummary.revenue)}
              </p>
              <span className="text-[10px] text-walnut mt-1">Client payments verified during period</span>
            </div>

            {/* Expenses */}
            <div className="p-4 bg-cream/60 rounded-lg border border-walnut/15 flex flex-col items-center justify-center">
              <span className="text-[11px] font-bold text-walnut uppercase tracking-wider">
                Approved Operating Expenses
              </span>
              <p className="text-2xl font-bold text-charcoal mt-1 tabular-nums font-mono">
                {formatCurrency(data.financialSummary.expenses)}
              </p>
              <span className="text-[10px] text-walnut mt-1">Project materials, labor &amp; overheads</span>
            </div>

            {/* Net Operating Result */}
            <div
              className={`p-4 rounded-lg border flex flex-col items-center justify-center ${
                data.financialSummary.isLoss
                  ? "bg-semantic-danger-bg border-semantic-danger-border"
                  : "bg-gold-soft border-gold/40"
              }`}
            >
              <span className="text-[11px] font-bold text-charcoal uppercase tracking-wider">
                {data.financialSummary.isLoss ? "Operating Loss" : "Net Operating Profit"}
              </span>
              <p
                className={`text-2xl font-bold mt-1 tabular-nums font-mono ${
                  data.financialSummary.isLoss ? "text-semantic-danger" : "text-charcoal"
                }`}
              >
                {formatCurrency(data.financialSummary.profit)}
              </p>
              <span
                className={`text-[10px] font-bold mt-1 px-2.5 py-0.5 rounded-full ${
                  data.financialSummary.isLoss
                    ? "bg-semantic-danger-bg text-semantic-danger border border-semantic-danger-border"
                    : "bg-gold text-charcoal shadow-2xs"
                }`}
              >
                {data.financialSummary.profitMarginPct !== null
                  ? `${data.financialSummary.profitMarginPct}% Profit Margin`
                  : "0.0% Profit Margin (No Revenue)"}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Performance Charts: 6-Month Financial Trend & Project Pipeline */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 6-Month Trend Chart (2 Cols) */}
        <div className="lg:col-span-2">
          <Card
            header={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <TrendingUp className="w-4 h-4 text-gold" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                    6-Month Financial Performance Trend
                  </h3>
                </div>
                <span className="text-[11px] text-walnut font-mono">Currency: INR (₹)</span>
              </div>
            }
          >
            {data.financialTrend && data.financialTrend.length > 0 ? (
              <div className="space-y-4 py-2">
                {/* Active Hover Detail Bar */}
                <div className="h-6 flex items-center justify-between text-xs px-2 bg-cream/40 rounded border border-walnut/10 font-mono">
                  {hoveredTrendIdx !== null && data.financialTrend[hoveredTrendIdx] ? (
                    <div className="flex items-center justify-between w-full">
                      <span className="font-bold text-charcoal">{data.financialTrend[hoveredTrendIdx].monthLabel}:</span>
                      <span className="text-charcoal">Revenue: <strong>{formatCurrency(data.financialTrend[hoveredTrendIdx].revenue)}</strong></span>
                      <span className="text-walnut">Expense: <strong>{formatCurrency(data.financialTrend[hoveredTrendIdx].expense)}</strong></span>
                      <span className={data.financialTrend[hoveredTrendIdx].profit >= 0 ? "text-semantic-success font-bold" : "text-semantic-danger font-bold"}>
                        Net: {formatCurrency(data.financialTrend[hoveredTrendIdx].profit)}
                      </span>
                    </div>
                  ) : (
                    <span className="text-[11px] text-walnut italic">Hover over any month bar to inspect exact revenue, expense, and net profit.</span>
                  )}
                </div>

                <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2 border-b border-walnut/15 pb-2">
                  {data.financialTrend.map((t, idx) => {
                    const revHeight = Math.min(100, Math.max(6, (t.revenue / maxTrendVal) * 100));
                    const expHeight = Math.min(100, Math.max(6, (t.expense / maxTrendVal) * 100));
                    const isHovered = hoveredTrendIdx === idx;

                    return (
                      <div
                        key={idx}
                        onMouseEnter={() => setHoveredTrendIdx(idx)}
                        onMouseLeave={() => setHoveredTrendIdx(null)}
                        className={`flex-1 flex flex-col items-center gap-2 h-full justify-end group transition-all cursor-pointer p-1 rounded ${
                          isHovered ? "bg-cream/70" : ""
                        }`}
                      >
                        <div className="w-full flex items-end justify-center gap-1.5 h-full">
                          {/* Revenue Bar: Warm Gold */}
                          <div
                            className="w-3.5 bg-gold rounded-t group-hover:bg-gold-hover transition-all relative shadow-gold"
                            style={{ height: `${revHeight}%` }}
                            title={`Revenue (${t.monthLabel}): ${formatCurrency(t.revenue)}`}
                          />
                          {/* Expense Bar: Walnut Brown */}
                          <div
                            className="w-3.5 bg-walnut/70 rounded-t group-hover:bg-walnut transition-all relative shadow-subtle"
                            style={{ height: `${expHeight}%` }}
                            title={`Expense (${t.monthLabel}): ${formatCurrency(t.expense)}`}
                          />
                        </div>
                        <span className={`text-[11px] font-bold ${isHovered ? "text-charcoal underline" : "text-walnut"}`}>
                          {t.monthLabel}
                        </span>
                      </div>
                    );
                  })}
                </div>

                {/* Legend & Reporting Link */}
                <div className="flex items-center justify-between text-xs text-walnut pt-1">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-xs bg-gold inline-block shadow-2xs" />
                      <span className="text-charcoal font-semibold">Verified Revenue</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-xs bg-walnut/70 inline-block shadow-2xs" />
                      <span className="text-charcoal font-semibold">Approved Expenses</span>
                    </div>
                  </div>
                  <Link
                    href="/reports"
                    className="text-[11px] font-bold text-charcoal hover:text-gold inline-flex items-center gap-1"
                  >
                    Detailed Financial Breakdown <ChevronRight className="w-3 h-3 text-gold" />
                  </Link>
                </div>
              </div>
            ) : (
              <div className="py-12 text-center text-xs text-walnut">
                No financial activity recorded for this period.
              </div>
            )}
          </Card>
        </div>

        {/* Project Pipeline Distribution (1 Col) */}
        <div>
          <Card
            header={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <PieChart className="w-4 h-4 text-gold" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">Project Pipeline</h3>
                </div>
                <Link href="/projects" className="text-[11px] text-charcoal hover:text-gold font-bold">
                  Workspace →
                </Link>
              </div>
            }
          >
            <div className="space-y-3 py-1">
              {data.pipeline.stages.map((stage, idx) => (
                <Link
                  key={idx}
                  href={`/projects?stage=${stage.stageKey}`}
                  className="block space-y-1 group hover:bg-cream/60 p-1.5 rounded-md transition-colors"
                >
                  <div className="flex items-center justify-between text-xs font-medium">
                    <span className="text-charcoal group-hover:text-charcoal font-bold flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-gold shrink-0" />
                      {stage.label}
                    </span>
                    <span className="font-mono text-charcoal font-semibold">
                      {stage.count} ({stage.percentage}%)
                    </span>
                  </div>
                  <div className="w-full bg-cream h-1.5 rounded-full overflow-hidden border border-walnut/10">
                    <div className="h-full bg-gold rounded-full transition-all" style={{ width: `${stage.percentage}%` }} />
                  </div>
                </Link>
              ))}

              {data.pipeline.totalActive === 0 && (
                <div className="py-6 text-center text-xs text-walnut">
                  No active projects currently in pipeline.
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* 5. Today's Operations: Follow-ups + Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Today's Follow-ups (2 Cols) */}
        <div className="lg:col-span-2">
          <Card
            header={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-gold" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                    Today&apos;s Follow-ups &amp; Due Work ({data.followUps.todayCount})
                  </h3>
                </div>
                <Link href="/leads" className="text-[11px] text-charcoal hover:text-gold font-bold">
                  CRM Follow-ups Center →
                </Link>
              </div>
            }
          >
            {data.followUps.items.length === 0 ? (
              <div className="py-10 text-center text-xs text-walnut flex flex-col items-center justify-center gap-1.5">
                <CheckCircle2 className="w-7 h-7 text-semantic-success" />
                <p className="font-bold text-charcoal">All follow-ups clear for today</p>
                <p className="text-walnut text-[11px]">No urgent client calls or CRM follow-ups scheduled for today.</p>
              </div>
            ) : (
              <div className="space-y-2.5">
                {data.followUps.items.map((item) => (
                  <div
                    key={item.id}
                    className="p-3 bg-cream/40 rounded-lg border border-walnut/15 hover:border-gold/50 hover:bg-cream/60 transition-all flex flex-col sm:flex-row sm:items-center justify-between gap-3 min-w-0"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 min-w-0">
                        <PhoneCall className="w-3.5 h-3.5 text-gold shrink-0" />
                        <span className="font-bold text-xs text-charcoal truncate">
                          {item.clientOrLeadName}
                        </span>
                        <span className="px-1.5 py-0.5 rounded bg-offwhite text-walnut border border-walnut/20 text-[10px] font-mono font-bold shrink-0">
                          {item.referenceNo}
                        </span>
                        {item.status === "OVERDUE" ? (
                          <span className="px-1.5 py-0.5 rounded bg-semantic-danger-bg text-semantic-danger border border-semantic-danger-border text-[10px] font-bold shrink-0">
                            Overdue
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.5 rounded bg-gold-soft text-charcoal border border-gold/40 text-[10px] font-semibold shrink-0">
                            Due Today
                          </span>
                        )}
                      </div>
                      <div className="text-walnut text-[11px] mt-1 pl-5.5 flex flex-wrap items-center gap-x-3 gap-y-0.5">
                        <span>{item.title}</span>
                        {item.phone && <span className="font-mono font-medium">📞 {item.phone}</span>}
                      </div>
                    </div>

                    {/* Interactive Action Controls */}
                    <div className="flex items-center gap-1.5 shrink-0 self-end sm:self-auto">
                      <button
                        onClick={() => setCompletingItem(item)}
                        className="px-2.5 py-1 bg-semantic-success-bg hover:bg-emerald-100 text-semantic-success border border-semantic-success-border rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Mark Complete"
                      >
                        <Check className="w-3 h-3" />
                        <span>Done</span>
                      </button>

                      <button
                        onClick={() => {
                          setReschedulingItem(item);
                          setRescheduleDate(new Date().toISOString().split("T")[0]);
                        }}
                        className="px-2.5 py-1 bg-offwhite hover:bg-cream text-walnut hover:text-charcoal border border-walnut/20 rounded text-xs font-bold transition-colors flex items-center gap-1 cursor-pointer"
                        title="Reschedule Follow-up"
                      >
                        <Calendar className="w-3 h-3" />
                        <span>Reschedule</span>
                      </button>

                      <Link
                        href={item.actionUrl}
                        className="px-2.5 py-1 bg-gold text-charcoal rounded text-xs font-bold hover:bg-gold-hover transition-colors shadow-2xs flex items-center gap-1 cursor-pointer"
                      >
                        <span>Open</span>
                        <ExternalLink className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        </div>

        {/* Notifications Summary (1 Col) */}
        <div>
          <Card
            header={
              <div className="flex items-center justify-between w-full">
                <div className="flex items-center gap-2">
                  <Bell className="w-4 h-4 text-gold" />
                  <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                    Notifications Summary
                  </h3>
                </div>
                {data.notifications.totalUnread > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-semantic-danger text-white text-[10px] font-bold">
                    {data.notifications.totalUnread} Unread
                  </span>
                )}
              </div>
            }
          >
            {data.notifications.recentItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-walnut">
                No active notifications or alerts.
              </div>
            ) : (
              <div className="space-y-3">
                {data.notifications.recentItems.map((n) => (
                  <Link
                    key={n.id}
                    href={n.actionUrl || "/notifications"}
                    className="block p-2.5 rounded-md bg-cream/40 border border-walnut/15 hover:border-gold/50 text-xs transition-colors"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-bold text-charcoal truncate max-w-[170px]">{n.title}</span>
                      <span className="text-[10px] text-walnut font-mono">
                        {formatRelativeTime(n.createdAt)}
                      </span>
                    </div>
                    <p className="text-walnut text-[11px] mt-1 line-clamp-2">{n.message}</p>
                  </Link>
                ))}
                <Link
                  href="/notifications"
                  className="block text-center text-xs text-charcoal hover:text-gold font-bold pt-1"
                >
                  Open Notification Center →
                </Link>
              </div>
            )}
          </Card>
        </div>
      </div>

      {/* 6. Recent Enterprise Activity Stream */}
      <Card
        header={
          <div className="flex items-center justify-between w-full">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-gold" />
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                Recent Enterprise Activity &amp; Audit Feed
              </h3>
            </div>
            <Link
              href="/audit-logs"
              className="text-[11px] text-charcoal hover:text-gold font-bold inline-flex items-center gap-1"
            >
              View Full Audit Logs <ArrowRight className="w-3 h-3 text-gold" />
            </Link>
          </div>
        }
      >
        {data.activities.length === 0 ? (
          <div className="py-8 text-center text-xs text-walnut">No recent activity logged in database.</div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {data.activities.map((item) => (
              <Link
                key={item.id}
                href={item.actionUrl || "/audit-logs"}
                className="p-3 bg-cream/40 hover:bg-cream/70 rounded-md border border-walnut/15 hover:border-gold/50 space-y-1.5 transition-all block group"
              >
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-charcoal truncate max-w-[130px] group-hover:text-gold transition-colors">{item.actorName}</span>
                  <span className="text-[10px] text-walnut font-mono">
                    {formatRelativeTime(item.createdAt)}
                  </span>
                </div>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <span className="px-1.5 py-0.5 bg-gold-soft text-charcoal border border-gold/40 rounded text-[10px] font-mono font-bold">
                    {item.action}
                  </span>
                  <span className="text-[10px] text-walnut truncate font-medium">{item.entityType}</span>
                </div>
                <p className="text-[11px] text-charcoal truncate">{item.title}</p>
              </Link>
            ))}
          </div>
        )}
      </Card>

      {/* Complete Follow-up Modal */}
      {completingItem && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-offwhite rounded-xl shadow-modal border border-walnut/20 p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-charcoal">Complete Follow-up</h3>
              <button
                onClick={() => setCompletingItem(null)}
                className="text-walnut hover:text-charcoal text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-2.5 bg-cream/60 rounded border border-walnut/15 text-xs text-charcoal">
              <p className="font-bold">{completingItem.title}</p>
              <p className="text-[11px] text-walnut mt-0.5">{completingItem.clientOrLeadName} • {completingItem.referenceNo}</p>
            </div>
            <form onSubmit={handleCompleteFollowUp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-walnut mb-1">
                  Outcome &amp; Discussion Notes <span className="text-semantic-danger">*</span>
                </label>
                <textarea
                  value={outcomeNotes}
                  onChange={(e) => setOutcomeNotes(e.target.value)}
                  placeholder="Record outcome of discussion, client interest, decisions made..."
                  className="w-full text-xs px-3 py-2 border border-walnut/20 bg-cream/40 rounded-md text-charcoal outline-none focus:ring-1 focus:ring-gold"
                  rows={3}
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setCompletingItem(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingAction}>
                  Save &amp; Complete
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Reschedule Follow-up Modal */}
      {reschedulingItem && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-offwhite rounded-xl shadow-modal border border-walnut/20 p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-charcoal">Reschedule Follow-up</h3>
              <button
                onClick={() => setReschedulingItem(null)}
                className="text-walnut hover:text-charcoal text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <div className="p-2.5 bg-cream/60 rounded border border-walnut/15 text-xs text-charcoal">
              <p className="font-bold">{reschedulingItem.title}</p>
              <p className="text-[11px] text-walnut mt-0.5">{reschedulingItem.clientOrLeadName} • {reschedulingItem.referenceNo}</p>
            </div>
            <form onSubmit={handleRescheduleFollowUp} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-walnut mb-1">
                  New Scheduled Date <span className="text-semantic-danger">*</span>
                </label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-walnut/20 bg-cream/40 rounded-md text-charcoal outline-none focus:ring-1 focus:ring-gold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-walnut mb-1">Notes / Reason</label>
                <textarea
                  value={rescheduleNotes}
                  onChange={(e) => setRescheduleNotes(e.target.value)}
                  placeholder="Reason for reschedule or updated objective..."
                  className="w-full text-xs px-3 py-2 border border-walnut/20 bg-cream/40 rounded-md text-charcoal outline-none focus:ring-1 focus:ring-gold"
                  rows={2}
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={() => setReschedulingItem(null)}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit" isLoading={isSubmittingAction}>
                  Save New Date
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Custom Date Range Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-offwhite rounded-xl shadow-modal border border-walnut/20 p-6 max-w-sm w-full space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-charcoal">Select Custom Date Range</h3>
              <button
                onClick={closeCustomModal}
                className="text-walnut hover:text-charcoal text-xs font-bold cursor-pointer"
              >
                ✕
              </button>
            </div>
            <form onSubmit={applyCustomRange} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-walnut mb-1">Start Date</label>
                <input
                  type="date"
                  value={customStart}
                  onChange={(e) => setCustomStart(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-walnut/20 bg-cream/40 rounded-md text-charcoal outline-none focus:ring-1 focus:ring-gold"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-walnut mb-1">End Date</label>
                <input
                  type="date"
                  value={customEnd}
                  onChange={(e) => setCustomEnd(e.target.value)}
                  className="w-full text-xs px-3 py-2 border border-walnut/20 bg-cream/40 rounded-md text-charcoal outline-none focus:ring-1 focus:ring-gold"
                  required
                />
              </div>
              <div className="flex items-center justify-end gap-2 pt-2">
                <Button variant="secondary" size="sm" type="button" onClick={closeCustomModal}>
                  Cancel
                </Button>
                <Button variant="primary" size="sm" type="submit">
                  Apply Filter
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

