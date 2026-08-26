"use client";

import React, { useState, useEffect } from "react";
import { ArrowLeftRight, Plus, CheckCircle2, Truck, Clock } from "lucide-react";

export default function StockTransfersPage() {
  const [transfers, setTransfers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchTransfers();
  }, []);

  const fetchTransfers = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/inventory/transfers");
      const data = await res.json();
      if (data.success) {
        setTransfers(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/inventory/transfers/${id}/approve`, { method: "POST" });
      const data = await res.json();
      if (data.success) fetchTransfers();
    } catch (err) {
      console.error(err);
    }
  };

  const handleReceive = async (id: string) => {
    try {
      const res = await fetch(`/api/v1/inventory/transfers/${id}/receive`, { method: "POST" });
      const data = await res.json();
      if (data.success) fetchTransfers();
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-xs">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Stock Transfers Workspace</h1>
          <p className="text-slate-500 mt-1">
            Initiate, approve, and receive warehouse-to-warehouse stock dispatches (`IN_TRANSIT` $\rightarrow$ `RECEIVED`)
          </p>
        </div>
      </div>

      {/* Transfers List */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3">Transfer No</th>
                <th className="px-4 py-3">From Warehouse</th>
                <th className="px-4 py-3">To Warehouse</th>
                <th className="px-4 py-3">Items Count</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    Loading stock transfers...
                  </td>
                </tr>
              ) : transfers.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No stock transfers recorded
                  </td>
                </tr>
              ) : (
                transfers.map((t) => (
                  <tr key={t.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{t.transferNo}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{t.fromWarehouse?.name}</td>
                    <td className="px-4 py-3 font-semibold text-slate-800">{t.toWarehouse?.name}</td>
                    <td className="px-4 py-3 font-bold text-slate-700">{t.items?.length || 0} Materials</td>
                    <td className="px-4 py-3">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          t.status === "RECEIVED"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : t.status === "IN_TRANSIT"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {t.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-500 text-[11px]">
                      {new Date(t.createdAt).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {t.status === "REQUESTED" && (
                        <button
                          onClick={() => handleApprove(t.id)}
                          className="px-2.5 py-1 bg-amber-600 hover:bg-amber-700 text-white font-semibold rounded text-[11px]"
                        >
                          Approve Transfer
                        </button>
                      )}
                      {t.status === "IN_TRANSIT" && (
                        <button
                          onClick={() => handleReceive(t.id)}
                          className="px-2.5 py-1 bg-gold hover:bg-gold-hover text-charcoal font-bold rounded text-[11px] shadow-gold cursor-pointer transition-colors"
                        >
                          Receive Stock
                        </button>
                      )}
                      {t.status === "RECEIVED" && (
                        <span className="text-[11px] font-bold text-semantic-success">Completed</span>
                      )}
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
