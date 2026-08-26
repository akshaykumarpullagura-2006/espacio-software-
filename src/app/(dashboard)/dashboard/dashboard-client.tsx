"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Card, StatCard } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  DashboardSummaryResponse,
  DashboardPeriod,
} from "@/modules/dashboard/dashboard.types";
import { formatCurrency, formatRelativeTime } from "@/lib/utils";
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
  CheckSquare,
  AlertCircle,
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
  const [isPending, startTransition] = useTransition();

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
        return <ShoppingCart className="w-3.5 h-3.5 text-walnut group-hover:text-charcoal transition-colors" />;
      case "PieChart":
        return <PieChart className="w-3.5 h-3.5 text-walnut group-hover:text-charcoal transition-colors" />;
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
    <div className="space-y-6 w-full min-w-0 pb-12">
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
          {/* Period Filter Dropdown */}
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
              <option value="OVERALL">Overall (All Time)</option>
              <option value="THIS_MONTH">This Month</option>
              <option value="LAST_MONTH">Last Month</option>
              <option value="THIS_QUARTER">This Quarter</option>
              <option value="THIS_YEAR">This Year</option>
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

      {/* Quick Enterprise Shortcuts (Compact at Top of Dashboard) */}
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

      {/* 2. Primary KPI Row (6 Mandatory Executive Cards) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3.5 min-w-0 w-full">
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
        <Link href="/projects" className="block group min-w-0 w-full">
          <StatCard
            label="Active Projects"
            value={data.kpis.activeProjects}
            subtitle="In Execution Pipeline"
            icon={<FolderKanban className="w-4 h-4 text-walnut group-hover:scale-110 transition-transform" />}
          />
        </Link>

        {/* 3. Completed Projects */}
        <Link href="/projects?stage=COMPLETED" className="block group min-w-0 w-full">
          <StatCard
            label="Completed Projects"
            value={data.kpis.completedProjects}
            subtitle="Handed Over to Client"
            icon={<CheckCircle2 className="w-4 h-4 text-semantic-success group-hover:scale-110 transition-transform" />}
          />
        </Link>

        {/* 4. Delayed Projects */}
        <Link href="/projects" className="block group min-w-0 w-full">
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

        {/* 5. Pending Client Payments */}
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

        {/* 6. Period Net Profit */}
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
      </div>

      {/* 3. Financial Summary & Control Panel (Mandatory 6, 7, 8) */}
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
                  : "N/A (No Revenue)"}
              </span>
            </div>
          </div>
        </Card>
      )}

      {/* 4. Performance Charts: 6-Month Financial Trend & Project Pipeline (Mandatory 11) */}
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
                <span className="text-[11px] text-walnut font-mono">INR (₹)</span>
              </div>
            }
          >
            {data.financialTrend && data.financialTrend.length > 0 ? (
              <div className="space-y-4 py-2">
                <div className="h-48 flex items-end justify-between gap-3 pt-6 px-2 border-b border-walnut/15 pb-2">
                  {data.financialTrend.map((t, idx) => {
                    const revHeight = Math.min(100, Math.max(8, (t.revenue / maxTrendVal) * 100));
                    const expHeight = Math.min(100, Math.max(8, (t.expense / maxTrendVal) * 100));

                    return (
                      <div key={idx} className="flex-1 flex flex-col items-center gap-2 h-full justify-end group">
                        <div className="w-full flex items-end justify-center gap-1.5 h-full">
                          {/* Revenue Bar: Warm Gold */}
                          <div
                            className="w-3.5 bg-gold rounded-t group-hover:bg-gold-hover transition-all relative cursor-pointer shadow-gold"
                            style={{ height: `${revHeight}%` }}
                            title={`Revenue (${t.monthLabel}): ${formatCurrency(t.revenue)}`}
                          />
                          {/* Expense Bar: Walnut Brown */}
                          <div
                            className="w-3.5 bg-walnut/70 rounded-t group-hover:bg-walnut transition-all relative cursor-pointer shadow-subtle"
                            style={{ height: `${expHeight}%` }}
                            title={`Expense (${t.monthLabel}): ${formatCurrency(t.expense)}`}
                          />
                        </div>
                        <span className="text-[11px] font-bold text-walnut group-hover:text-charcoal">
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
                      <span className="text-charcoal font-semibold">Revenue (Inflow)</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <span className="w-3 h-3 rounded-xs bg-walnut/70 inline-block shadow-2xs" />
                      <span className="text-charcoal font-semibold">Expenses (Outflow)</span>
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
                Not enough historical data for 6-month trend.
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

      {/* 5. Today's Operations: Follow-ups + Notifications (Mandatory 9 & 13) */}
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
                <p className="text-walnut text-[11px]">No urgent client calls or scheduled tasks pending today.</p>
              </div>
            ) : (
              <div className="space-y-2.5 divide-y divide-walnut/10">
                {data.followUps.items.map((item) => (
                  <div key={item.id} className="pt-2.5 first:pt-0 flex items-center justify-between text-xs gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-charcoal truncate">{item.clientOrLeadName}</span>
                        <span className="px-1.5 py-0.5 rounded bg-cream text-walnut border border-walnut/20 text-[10px] font-mono">
                          {item.referenceNo}
                        </span>
                        {item.status === "OVERDUE" && (
                          <span className="px-1.5 py-0.5 rounded bg-semantic-danger-bg text-semantic-danger border border-semantic-danger-border text-[10px] font-bold">
                            Overdue
                          </span>
                        )}
                      </div>
                      <p className="text-walnut text-[11px] mt-0.5 flex items-center gap-3">
                        <span>{item.title}</span>
                        {item.phone && <span>📞 {item.phone}</span>}
                      </p>
                    </div>
                    <Link
                      href={item.actionUrl}
                      className="px-3 py-1.5 bg-gold text-charcoal rounded-md text-xs font-bold hover:bg-gold-hover transition-colors shadow-gold whitespace-nowrap flex items-center gap-1 cursor-pointer"
                    >
                      {item.type === "LEAD_FOLLOWUP" ? (
                        <>
                          <PhoneCall className="w-3 h-3" /> Follow up
                        </>
                      ) : (
                        <>
                          <CheckSquare className="w-3 h-3" /> View Task
                        </>
                      )}
                    </Link>
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

      {/* 6. Recent Enterprise Activity Stream (Mandatory 10) */}
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
              <div key={item.id} className="p-3 bg-cream/40 rounded-md border border-walnut/15 space-y-1.5">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-bold text-charcoal truncate max-w-[130px]">{item.actorName}</span>
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
              </div>
            ))}
          </div>
        )}
      </Card>

      {/* Custom Date Range Modal */}
      {showCustomModal && (
        <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center z-50 p-4">
          <div className="bg-offwhite rounded-xl shadow-modal border border-walnut/20 p-6 max-w-sm w-full space-y-4">
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
