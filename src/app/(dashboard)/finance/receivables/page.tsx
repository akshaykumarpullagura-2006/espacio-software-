"use client";

import React, { useState, useEffect } from "react";
import { DollarSign, Search, Filter, AlertTriangle, CheckCircle2, Clock } from "lucide-react";

export default function ReceivablesDirectoryPage() {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [overdueOnly, setOverdueOnly] = useState(false);

  useEffect(() => {
    fetchReceivables();
  }, [search, status, overdueOnly]);

  const fetchReceivables = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status) params.append("status", status);
      if (overdueOnly) params.append("overdueOnly", "true");

      const res = await fetch(`/api/v1/finance/receivables?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setReceivables(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-xs">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Receivables & Due Tracking</h1>
          <p className="text-slate-500 mt-1">
            Authoritative tracking of project milestones, invoices, paid amounts, and remaining receivables balance
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search receivable no, client, project..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="h-9 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
          >
            <option value="">All Statuses</option>
            <option value="OPEN">OPEN</option>
            <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
            <option value="PAID">PAID</option>
            <option value="OVERDUE">OVERDUE</option>
          </select>

          <button
            onClick={() => setOverdueOnly(!overdueOnly)}
            className={`px-3 py-2 rounded-lg font-semibold transition-colors border ${
              overdueOnly
                ? "bg-rose-50 border-rose-300 text-rose-700"
                : "bg-white border-slate-300 text-slate-700 hover:bg-slate-50"
            }`}
          >
            Overdue Only
          </button>
        </div>
      </div>

      {/* Receivables Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3">Receivable No</th>
                <th className="px-4 py-3">Client / Customer</th>
                <th className="px-4 py-3">Project / Milestone</th>
                <th className="px-4 py-3 text-right">Total Receivable</th>
                <th className="px-4 py-3 text-right">Paid Amount</th>
                <th className="px-4 py-3 text-right">Outstanding Due</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Loading client receivables...
                  </td>
                </tr>
              ) : receivables.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No client receivables found
                  </td>
                </tr>
              ) : (
                receivables.map((r) => (
                  <tr key={r.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{r.receivableNo}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{r.client?.fullName || "Direct Client"}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{r.project?.title || "-"}</div>
                      {r.milestone && <div className="text-[10px] text-slate-500">{r.milestone.title}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                      ₹{r.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                      ₹{r.paidAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700 tabular-nums">
                      ₹{r.outstandingAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          r.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : r.status === "OVERDUE"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : r.status === "PARTIALLY_PAID"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {r.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px]">
                      {r.dueDate
                        ? new Date(r.dueDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
