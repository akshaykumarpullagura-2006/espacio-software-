"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  TrendingUp,
  TrendingDown,
  DollarSign,
  PieChart,
  Wallet,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
  FileText,
  CreditCard,
  Building2,
  Calendar,
  Lock,
  Unlock,
  RefreshCw,
  Plus,
} from "lucide-react";
import { RecordVendorPaymentModal } from "@/components/finance/record-vendor-payment-modal";
import { CreateInvoiceModal } from "@/components/finance/create-invoice-modal";

export default function FinanceOverviewPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [year, setYear] = useState(new Date().getFullYear());
  const [month, setMonth] = useState(new Date().getMonth() + 1);

  // Modals
  const [isVendorPaymentModalOpen, setIsVendorPaymentModalOpen] = useState(false);
  const [isInvoiceModalOpen, setIsInvoiceModalOpen] = useState(false);

  useEffect(() => {
    fetchOverview();
  }, [year, month]);

  const fetchOverview = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/finance/overview?year=${year}&month=${month}`);
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const monthNames = [
    "January",
    "February",
    "March",
    "April",
    "May",
    "June",
    "July",
    "August",
    "September",
    "October",
    "November",
    "December",
  ];

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-xs">
      {/* Top Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
              AUTHORITATIVE FINANCIAL CONTROL
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Company Monthly Financial Overview</h1>
          </div>
          <p className="text-slate-500 mt-1">
            Authoritative company-wide income, expenses, gross/net profit, cash flow, and financial account balances
          </p>
        </div>

        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2 bg-white border border-slate-200 rounded-lg p-1">
            <select
              value={month}
              onChange={(e) => setMonth(parseInt(e.target.value, 10))}
              className="h-8 px-2 bg-transparent text-slate-800 font-bold text-xs focus:outline-none"
            >
              {monthNames.map((m, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {m}
                </option>
              ))}
            </select>
            <select
              value={year}
              onChange={(e) => setYear(parseInt(e.target.value, 10))}
              className="h-8 px-2 bg-transparent text-slate-800 font-bold text-xs focus:outline-none border-l border-slate-200"
            >
              <option value={2025}>2025</option>
              <option value={2026}>2026</option>
              <option value={2027}>2027</option>
            </select>
          </div>

          <button
            onClick={() => fetchOverview()}
            className="p-2 rounded-lg border border-slate-200 hover:bg-slate-50 text-slate-600 transition-colors"
            title="Refresh Financial Data"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsVendorPaymentModalOpen(true)}
            className="px-3 py-2 bg-gold hover:bg-gold-hover text-charcoal font-bold rounded-lg shadow-gold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <CreditCard className="w-4 h-4" />
            <span>Pay Vendor</span>
          </button>

          <button
            onClick={() => setIsInvoiceModalOpen(true)}
            className="px-3 py-2 bg-[#36302B] hover:bg-[#4A433D] text-cream font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-4 h-4" />
            <span>Generate GST Invoice</span>
          </button>
        </div>
      </div>

      {/* Primary KPI Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Recognized Revenue */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Recognized Revenue</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              ₹{loading ? "..." : (metrics?.totalRevenue ?? 0).toLocaleString("en-IN")}
            </span>
            {metrics?.momRevenueGrowthPct !== null && (
              <span
                className={`text-xs font-bold flex items-center gap-0.5 ${
                  metrics?.momRevenueGrowthPct >= 0 ? "text-emerald-600" : "text-rose-600"
                }`}
              >
                {metrics?.momRevenueGrowthPct >= 0 ? <ArrowUpRight className="w-3.5 h-3.5" /> : <ArrowDownRight className="w-3.5 h-3.5" />}
                {Math.abs(metrics?.momRevenueGrowthPct)}% MoM
              </span>
            )}
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-2">Verified Client Payments in month</p>
        </div>

        {/* Gross Profit & Margin */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Gross Profit</span>
            <TrendingUp className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-blue-700 tabular-nums">
              ₹{loading ? "..." : (metrics?.grossProfit ?? 0).toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-bold bg-blue-50 text-blue-700 px-2 py-0.5 rounded">
              {metrics?.grossProfitMarginPct ?? 0}% Margin
            </span>
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-2">
            Revenue minus Direct Project Costs (₹{(metrics?.directCosts ?? 0).toLocaleString("en-IN")})
          </p>
        </div>

        {/* Net Profit & Margin */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Net Operating Profit</span>
            <PieChart className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-purple-700 tabular-nums">
              ₹{loading ? "..." : (metrics?.netProfit ?? 0).toLocaleString("en-IN")}
            </span>
            <span className="text-xs font-bold bg-purple-50 text-purple-700 px-2 py-0.5 rounded">
              {metrics?.netProfitMarginPct ?? 0}% Net Margin
            </span>
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-2">
            Gross Profit minus Overheads (₹{(metrics?.businessOverheads ?? 0).toLocaleString("en-IN")})
          </p>
        </div>

        {/* Net Cash Flow */}
        <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Net Cash Flow</span>
            <Wallet className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span
              className={`text-2xl font-bold tabular-nums ${
                (metrics?.netCashFlow ?? 0) >= 0 ? "text-emerald-700" : "text-rose-700"
              }`}
            >
              ₹{loading ? "..." : (metrics?.netCashFlow ?? 0).toLocaleString("en-IN")}
            </span>
            <span className="text-[11px] text-slate-500 font-medium">In - Out</span>
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-2">
            Inflow ₹{(metrics?.totalCashInflow ?? 0).toLocaleString("en-IN")} • Outflow ₹{(metrics?.totalCashOutflow ?? 0).toLocaleString("en-IN")}
          </p>
        </div>
      </div>

      {/* Cash & Bank Balances Strip */}
      <div className="bg-slate-900 text-white rounded-xl p-5 shadow-lg flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="font-bold text-sm text-slate-100">Combined Liquid Cash & Bank Position</h3>
          <p className="text-slate-400 text-[11px] mt-0.5">Authoritative balances across operating bank accounts, cash lockers, and UPI</p>
        </div>

        <div className="flex items-center gap-6 overflow-x-auto w-full md:w-auto">
          {metrics?.accountsBalance?.map((acc: any) => (
            <div key={acc.id} className="border-l border-slate-800 pl-4 space-y-0.5 shrink-0">
              <div className="text-[10px] font-semibold text-slate-400 uppercase tracking-wider">{acc.name}</div>
              <div className="text-base font-bold text-emerald-400 tabular-nums">
                ₹{acc.currentBalance.toLocaleString("en-IN")}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Navigation Sub-Hub */}
      <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
        <Link
          href="/finance/receivables"
          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group"
        >
          <div className="text-[10px] font-bold uppercase text-slate-400">Client Receivables</div>
          <div className="font-bold text-slate-900 text-sm mt-1 group-hover:text-emerald-600">Receivables Directory</div>
        </Link>

        <Link
          href="/finance/payables"
          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group"
        >
          <div className="text-[10px] font-bold uppercase text-slate-400">Vendor Payables</div>
          <div className="font-bold text-slate-900 text-sm mt-1 group-hover:text-emerald-600">Payables Directory</div>
        </Link>

        <Link
          href="/finance/vendor-payments"
          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group"
        >
          <div className="text-[10px] font-bold uppercase text-slate-400">Vendor Payments</div>
          <div className="font-bold text-slate-900 text-sm mt-1 group-hover:text-emerald-600">Payments & Reversals</div>
        </Link>

        <Link
          href="/finance/invoices"
          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group"
        >
          <div className="text-[10px] font-bold uppercase text-slate-400">GST Invoices</div>
          <div className="font-bold text-slate-900 text-sm mt-1 group-hover:text-emerald-600">Tax Invoicing Engine</div>
        </Link>

        <Link
          href="/finance/accounts"
          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group"
        >
          <div className="text-[10px] font-bold uppercase text-slate-400">Financial Accounts</div>
          <div className="font-bold text-slate-900 text-sm mt-1 group-hover:text-emerald-600">Bank & Cash Hub</div>
        </Link>

        <Link
          href="/finance/ledger"
          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group"
        >
          <div className="text-[10px] font-bold uppercase text-slate-400">Financial Ledger</div>
          <div className="font-bold text-slate-900 text-sm mt-1 group-hover:text-emerald-600">Transaction Trail</div>
        </Link>
      </div>

      {/* Modals */}
      <RecordVendorPaymentModal
        isOpen={isVendorPaymentModalOpen}
        onClose={() => setIsVendorPaymentModalOpen(false)}
        onSuccess={() => fetchOverview()}
      />
      <CreateInvoiceModal
        isOpen={isInvoiceModalOpen}
        onClose={() => setIsInvoiceModalOpen(false)}
        onSuccess={() => fetchOverview()}
      />
    </div>
  );
}
