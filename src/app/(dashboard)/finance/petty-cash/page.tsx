"use client";

import React, { useState, useEffect } from "react";
import { IssueAdvanceModal } from "@/components/petty-cash/issue-advance-modal";
import { RecordPettyExpenseModal } from "@/components/petty-cash/record-petty-expense-modal";
import { SettleAdvanceModal } from "@/components/petty-cash/settle-advance-modal";

interface EmployeeAdvanceItem {
  id: string;
  referenceNo: string;
  employeeId: string;
  employee: { id: string; fullName: string; email: string };
  amount: number;
  totalSpent: number;
  cashReturned: number;
  outstandingBalance: number;
  issuedDate: string;
  dueDate?: string | null;
  purpose: string;
  status: string;
  project?: { referenceNo: string; title: string } | null;
}

interface PettyExpenseItem {
  id: string;
  referenceNo: string;
  advance: { referenceNo: string };
  expenseDate: string;
  amount: number;
  purpose: string;
  categoryKey: string;
  paymentMethod: string;
  referenceNoExternal?: string | null;
  status: string;
  project?: { referenceNo: string; title: string } | null;
}

interface SettlementItem {
  id: string;
  referenceNo: string;
  advance: { referenceNo: string; amount: number };
  settlementDate: string;
  totalAdvance: number;
  totalSpent: number;
  cashReturned: number;
  difference: number;
  status: string;
}

export default function PettyCashPage() {
  const [activeTab, setActiveTab] = useState<"advances" | "expenses" | "settlements">("advances");
  const [advances, setAdvances] = useState<EmployeeAdvanceItem[]>([]);
  const [expenses, setExpenses] = useState<PettyExpenseItem[]>([]);
  const [settlements, setSettlements] = useState<SettlementItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isRecordExpenseModalOpen, setIsRecordExpenseModalOpen] = useState(false);
  const [isSettleModalOpen, setIsSettleModalOpen] = useState(false);
  const [selectedAdvanceId, setSelectedAdvanceId] = useState<string | undefined>(undefined);

  // Filters
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");

  useEffect(() => {
    fetchData();
  }, [activeTab, statusFilter]);

  async function fetchData() {
    setLoading(true);
    try {
      if (activeTab === "advances") {
        let url = `/api/v1/petty-cash/advances?search=${encodeURIComponent(search)}`;
        if (statusFilter) url += `&status=${statusFilter}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setAdvances(data.data || []);
        }
      } else if (activeTab === "expenses") {
        let url = `/api/v1/petty-cash/expenses?search=${encodeURIComponent(search)}`;
        const res = await fetch(url);
        if (res.ok) {
          const data = await res.json();
          setExpenses(data.data || []);
        }
      } else if (activeTab === "settlements") {
        const res = await fetch("/api/v1/petty-cash/settlements");
        if (res.ok) {
          const data = await res.json();
          setSettlements(data.data || []);
        }
      }
    } catch (e) {
      console.error("Failed to load petty cash data", e);
    } finally {
      setLoading(false);
    }
  }

  // Summary aggregation
  const totalAdvancesIssued = advances.reduce((acc, a) => acc + a.amount, 0);
  const totalSpent = advances.reduce((acc, a) => acc + (a.totalSpent || 0), 0);
  const totalReturned = advances.reduce((acc, a) => acc + (a.cashReturned || 0), 0);
  const totalOutstanding = advances.reduce((acc, a) => acc + (a.outstandingBalance || 0), 0);

  function formatCurrency(val: number) {
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDate(dStr?: string | null) {
    if (!dStr) return "N/A";
    return new Date(dStr).toLocaleDateString("en-IN", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "ISSUED":
      case "RECORDED":
        return <span className="inline-flex items-center rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-semibold text-blue-700">ISSUED</span>;
      case "SETTLED":
        return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">SETTLED</span>;
      case "PARTIALLY_SETTLED":
        return <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">PARTIAL</span>;
      case "DISCREPANCY":
        return <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">DISCREPANCY</span>;
      case "OVERDUE":
        return <span className="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-semibold text-red-800">OVERDUE</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">{status}</span>;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Finance Subsystem</span>
            <span>•</span>
            <span className="text-emerald-600">Prompt 07 — Petty Cash</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Petty Cash & Employee Advance Ledger
          </h1>
          <p className="text-sm text-slate-600">
            Employee cash float issuance, itemized site expense logging, and settlement reconciliation.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="rounded-md bg-gold px-4 py-2 text-xs font-bold text-charcoal shadow-gold hover:bg-gold-hover transition cursor-pointer"
          >
            + Issue Advance
          </button>
          <button
            onClick={() => {
              setSelectedAdvanceId(undefined);
              setIsRecordExpenseModalOpen(true);
            }}
            className="rounded-md border border-walnut/20 bg-cream/40 px-4 py-2 text-xs font-bold text-walnut shadow-sm hover:bg-cream transition cursor-pointer"
          >
            + Record Petty Expense
          </button>
          <button
            onClick={() => {
              setSelectedAdvanceId(undefined);
              setIsSettleModalOpen(true);
            }}
            className="rounded-md border border-walnut/20 bg-cream/40 px-4 py-2 text-xs font-bold text-walnut shadow-sm hover:bg-cream transition cursor-pointer"
          >
            Reconcile / Settle Float
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Advances Issued
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {formatCurrency(totalAdvancesIssued)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Float capital issued to employees</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Petty Expenses Logged
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {formatCurrency(totalSpent)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Verified site vouchers & tea spends</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Cash Returned
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-emerald-600">
            {formatCurrency(totalReturned)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Reconciled unspent cash returns</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Outstanding Advance Balance
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-600">
            {formatCurrency(totalOutstanding)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Unsettled floats in field custody</div>
        </div>
      </div>

      {/* Segmented Workspace Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex space-x-1 rounded-lg bg-slate-200/60 p-1">
          <button
            onClick={() => setActiveTab("advances")}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
              activeTab === "advances"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Employee Advances ({advances.length})
          </button>
          <button
            onClick={() => setActiveTab("expenses")}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
              activeTab === "expenses"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Petty Expense Entries ({expenses.length})
          </button>
          <button
            onClick={() => setActiveTab("settlements")}
            className={`rounded-md px-4 py-2 text-xs font-semibold transition ${
              activeTab === "settlements"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Settlements Ledger ({settlements.length})
          </button>
        </div>

        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search ref, employee, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchData()}
            className="w-full sm:w-64 rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          />

          {activeTab === "advances" && (
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
            >
              <option value="">All Statuses</option>
              <option value="ISSUED">ISSUED</option>
              <option value="SETTLED">SETTLED</option>
              <option value="PARTIALLY_SETTLED">PARTIALLY_SETTLED</option>
              <option value="OVERDUE">OVERDUE</option>
            </select>
          )}
        </div>
      </div>

      {/* Main Table Content */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading petty cash records...
          </div>
        ) : activeTab === "advances" ? (
          advances.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No employee advances recorded yet. Click <strong>+ Issue Advance</strong> above to create one.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Advance Ref</th>
                  <th className="px-4 py-3">Employee</th>
                  <th className="px-4 py-3">Issued Date</th>
                  <th className="px-4 py-3 text-right">Advance (₹)</th>
                  <th className="px-4 py-3 text-right">Spent (₹)</th>
                  <th className="px-4 py-3 text-right">Returned (₹)</th>
                  <th className="px-4 py-3 text-right">Balance (₹)</th>
                  <th className="px-4 py-3">Project Link</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {advances.map((adv) => (
                  <tr key={adv.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{adv.referenceNo}</td>
                    <td className="px-4 py-3">{adv.employee.fullName}</td>
                    <td className="px-4 py-3">{formatDate(adv.issuedDate)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(adv.amount)}</td>
                    <td className="px-4 py-3 text-right font-mono text-slate-600">{formatCurrency(adv.totalSpent || 0)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatCurrency(adv.cashReturned || 0)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">{formatCurrency(adv.outstandingBalance || 0)}</td>
                    <td className="px-4 py-3 text-slate-500">{adv.project ? adv.project.referenceNo : "General Float"}</td>
                    <td className="px-4 py-3">{getStatusBadge(adv.status)}</td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <button
                        onClick={() => {
                          setSelectedAdvanceId(adv.id);
                          setIsRecordExpenseModalOpen(true);
                        }}
                        className="text-emerald-600 hover:text-emerald-800 font-semibold"
                      >
                        + Spend
                      </button>
                      <button
                        onClick={() => {
                          setSelectedAdvanceId(adv.id);
                          setIsSettleModalOpen(true);
                        }}
                        className="text-blue-600 hover:text-blue-800 font-semibold"
                      >
                        Settle
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : activeTab === "expenses" ? (
          expenses.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No petty cash expenses logged yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Expense Entry</th>
                  <th className="px-4 py-3">Advance Float</th>
                  <th className="px-4 py-3">Date</th>
                  <th className="px-4 py-3">Category</th>
                  <th className="px-4 py-3">Purpose</th>
                  <th className="px-4 py-3 text-right">Amount (₹)</th>
                  <th className="px-4 py-3">Mode</th>
                  <th className="px-4 py-3">Project</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {expenses.map((exp) => (
                  <tr key={exp.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{exp.referenceNo}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{exp.advance.referenceNo}</td>
                    <td className="px-4 py-3">{formatDate(exp.expenseDate)}</td>
                    <td className="px-4 py-3"><span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-slate-700">{exp.categoryKey}</span></td>
                    <td className="px-4 py-3 text-slate-900 max-w-xs truncate">{exp.purpose}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold text-slate-900">{formatCurrency(exp.amount)}</td>
                    <td className="px-4 py-3">{exp.paymentMethod}</td>
                    <td className="px-4 py-3 text-slate-500">{exp.project ? exp.project.referenceNo : "Overhead"}</td>
                    <td className="px-4 py-3">{getStatusBadge(exp.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        ) : (
          settlements.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-500">
              No settlement records yet.
            </div>
          ) : (
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
                <tr>
                  <th className="px-4 py-3">Settlement Ref</th>
                  <th className="px-4 py-3">Advance Ref</th>
                  <th className="px-4 py-3">Settled Date</th>
                  <th className="px-4 py-3 text-right">Advance (₹)</th>
                  <th className="px-4 py-3 text-right">Spent (₹)</th>
                  <th className="px-4 py-3 text-right">Returned (₹)</th>
                  <th className="px-4 py-3 text-right">Difference (₹)</th>
                  <th className="px-4 py-3">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
                {settlements.map((s) => (
                  <tr key={s.id} className="hover:bg-slate-50/80 transition">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{s.referenceNo}</td>
                    <td className="px-4 py-3 font-mono text-slate-600">{s.advance.referenceNo}</td>
                    <td className="px-4 py-3">{formatDate(s.settlementDate)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(s.totalAdvance)}</td>
                    <td className="px-4 py-3 text-right font-mono">{formatCurrency(s.totalSpent)}</td>
                    <td className="px-4 py-3 text-right font-mono text-emerald-700">{formatCurrency(s.cashReturned)}</td>
                    <td className="px-4 py-3 text-right font-mono font-bold">{formatCurrency(s.difference)}</td>
                    <td className="px-4 py-3">{getStatusBadge(s.status)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )
        )}
      </div>

      {/* Modals */}
      <IssueAdvanceModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={fetchData}
      />
      <RecordPettyExpenseModal
        isOpen={isRecordExpenseModalOpen}
        onClose={() => {
          setIsRecordExpenseModalOpen(false);
          setSelectedAdvanceId(undefined);
        }}
        onSuccess={fetchData}
        preselectedAdvanceId={selectedAdvanceId}
      />
      <SettleAdvanceModal
        isOpen={isSettleModalOpen}
        onClose={() => {
          setIsSettleModalOpen(false);
          setSelectedAdvanceId(undefined);
        }}
        onSuccess={fetchData}
        preselectedAdvanceId={selectedAdvanceId}
      />
    </div>
  );
}
