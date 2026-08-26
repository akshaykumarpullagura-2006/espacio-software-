"use client";

import React, { useState, useEffect } from "react";
import { Receipt, Search, ChevronLeft, ChevronRight } from "lucide-react";

export default function FinancialLedgerPage() {
  const [entries, setEntries] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [direction, setDirection] = useState<"" | "INFLOW" | "OUTFLOW">("");
  const [sourceType, setSourceType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchLedger();
  }, [direction, sourceType, search, page]);

  const fetchLedger = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (direction) params.append("direction", direction);
      if (sourceType) params.append("sourceType", sourceType);
      if (search) params.append("search", search);
      params.append("page", page.toString());
      params.append("limit", "25");

      const res = await fetch(`/api/v1/finance/ledger?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setEntries(data.data.entries || []);
        setPagination(data.data.pagination || { page: 1, totalPages: 1 });
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Unified Financial Transaction Ledger</h1>
          <p className="text-slate-500 mt-1">
            Authoritative financial audit trail (`LED-YYYY-XXXX`) for every inflow, outflow, and account movement
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search entry no, party, reference..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <div className="flex items-center gap-3">
          <select
            value={direction}
            onChange={(e) => setDirection(e.target.value as any)}
            className="h-9 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
          >
            <option value="">All Financial Directions</option>
            <option value="INFLOW">INFLOW (Money Received)</option>
            <option value="OUTFLOW">OUTFLOW (Money Paid)</option>
          </select>

          <select
            value={sourceType}
            onChange={(e) => setSourceType(e.target.value)}
            className="h-9 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
          >
            <option value="">All Source Types</option>
            <option value="CLIENT_PAYMENT">Client Payment</option>
            <option value="VENDOR_PAYMENT">Vendor Payment</option>
            <option value="EXPENSE">Expense</option>
            <option value="PETTY_CASH_ADVANCE">Petty Cash Advance</option>
            <option value="PETTY_CASH_RETURN">Petty Cash Return</option>
          </select>
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3">Entry No</th>
                <th className="px-4 py-3">Direction</th>
                <th className="px-4 py-3">Source & Party</th>
                <th className="px-4 py-3">Financial Account</th>
                <th className="px-4 py-3">Payment Mode / Ref</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Loading financial ledger...
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No financial ledger entries found
                  </td>
                </tr>
              ) : (
                entries.map((l) => (
                  <tr key={l.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{l.entryNo}</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          l.direction === "INFLOW"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {l.direction}
                      </span>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{l.sourceType}</div>
                      <div className="text-[10px] text-slate-500">
                        {l.client?.fullName || l.vendor?.name || l.notes || "-"}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-700">{l.financialAccount?.name || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{l.paymentMethod}</div>
                      {l.referenceNoExt && <div className="text-[10px] text-slate-500 font-mono">{l.referenceNoExt}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold tabular-nums">
                      <span className={l.direction === "INFLOW" ? "text-emerald-600" : "text-rose-600"}>
                        {l.direction === "INFLOW" ? "+" : "-"}₹{l.amount.toLocaleString("en-IN")}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          l.status === "RECORDED"
                            ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                            : "bg-rose-50 text-rose-700 border border-rose-200"
                        }`}
                      >
                        {l.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                      {new Date(l.transactionDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>

        {/* Pagination */}
        <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between bg-slate-50/50 text-xs">
          <span className="text-slate-500">
            Page <strong className="text-slate-900">{pagination.page}</strong> of{" "}
            <strong className="text-slate-900">{pagination.totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              disabled={page <= 1}
              onClick={() => setPage(page - 1)}
              className="p-1.5 rounded-md border border-slate-300 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              disabled={page >= pagination.totalPages}
              onClick={() => setPage(page + 1)}
              className="p-1.5 rounded-md border border-slate-300 hover:bg-slate-100 disabled:opacity-40"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
