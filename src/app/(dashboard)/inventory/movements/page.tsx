"use client";

import React, { useState, useEffect } from "react";
import { Receipt, Search, Filter, ChevronLeft, ChevronRight } from "lucide-react";

export default function StockMovementsPage() {
  const [movements, setMovements] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);

  // Filters
  const [movementType, setMovementType] = useState("");
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);

  useEffect(() => {
    fetchMovements();
  }, [movementType, search, page]);

  const fetchMovements = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (movementType) params.append("movementType", movementType);
      if (search) params.append("search", search);
      params.append("page", page.toString());
      params.append("limit", "20");

      const res = await fetch(`/api/v1/inventory/movements?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMovements(data.data.movements || []);
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Stock Ledger & Movement Trail</h1>
          <p className="text-slate-500 mt-1">
            Authoritative transactional history for every receipt, issue, site consumption, return, and adjustment
          </p>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search movement no, material, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <select
          value={movementType}
          onChange={(e) => setMovementType(e.target.value)}
          className="h-9 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
        >
          <option value="">All Movement Types</option>
          <option value="OPENING">OPENING</option>
          <option value="RECEIPT">RECEIPT (GRN)</option>
          <option value="ISSUE">ISSUE (Project Site)</option>
          <option value="CONSUMPTION">CONSUMPTION</option>
          <option value="RETURN_IN">RETURN IN</option>
          <option value="TRANSFER_OUT">TRANSFER OUT</option>
          <option value="TRANSFER_IN">TRANSFER IN</option>
          <option value="ADJUSTMENT_IN">ADJUSTMENT IN</option>
          <option value="ADJUSTMENT_OUT">ADJUSTMENT OUT</option>
        </select>
      </div>

      {/* Movements Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3">Movement No</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3">Project / Reference</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Running Balance</th>
                <th className="px-4 py-3">Reason / Notes</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    Loading stock ledger...
                  </td>
                </tr>
              ) : movements.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No stock movements found
                  </td>
                </tr>
              ) : (
                movements.map((m) => {
                  const isPositive = ["OPENING", "RECEIPT", "RETURN_IN", "TRANSFER_IN", "ADJUSTMENT_IN"].includes(
                    m.movementType
                  );

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-bold text-slate-900">{m.movementNo}</td>
                      <td className="px-4 py-3">
                        <span
                          className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                            isPositive
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : "bg-amber-50 text-amber-700 border border-amber-200"
                          }`}
                        >
                          {m.movementType}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="font-bold text-slate-900">{m.material?.name}</div>
                        <div className="text-[10px] text-slate-400 font-mono">{m.material?.materialCode}</div>
                      </td>
                      <td className="px-4 py-3 text-slate-700 font-medium">{m.warehouse?.name}</td>
                      <td className="px-4 py-3 text-slate-600">
                        {m.project ? `${m.project.referenceNo} - ${m.project.title}` : m.referenceType}
                      </td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        <span className={isPositive ? "text-emerald-600" : "text-amber-600"}>
                          {isPositive ? "+" : "-"}
                          {m.quantity} {m.unitKey}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                        {m.runningBalance} {m.unitKey}
                      </td>
                      <td className="px-4 py-3 text-slate-600 max-w-xs truncate">{m.reason || m.notes || "-"}</td>
                      <td className="px-4 py-3 text-slate-500 text-[11px] whitespace-nowrap">
                        {new Date(m.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
                          year: "numeric",
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </td>
                    </tr>
                  );
                })
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
