"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import {
  Package,
  Boxes,
  Warehouse,
  ArrowRightLeft,
  AlertTriangle,
  Receipt,
  Plus,
  ArrowUpRight,
  ArrowDownLeft,
  SlidersHorizontal,
  RefreshCw,
} from "lucide-react";
import { CreateMaterialModal } from "@/components/inventory/create-material-modal";
import { CreateWarehouseModal } from "@/components/inventory/create-warehouse-modal";
import { IssueMaterialModal } from "@/components/inventory/issue-material-modal";
import { AdjustStockModal } from "@/components/inventory/adjust-stock-modal";

export default function InventoryOverviewPage() {
  const [metrics, setMetrics] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  // Modals state
  const [isMaterialModalOpen, setIsMaterialModalOpen] = useState(false);
  const [isWarehouseModalOpen, setIsWarehouseModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);
  const [isAdjustModalOpen, setIsAdjustModalOpen] = useState(false);

  useEffect(() => {
    fetchMetrics();
  }, []);

  const fetchMetrics = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/inventory/dashboard");
      const data = await res.json();
      if (data.success) {
        setMetrics(data.data);
      }
    } catch (err) {
      console.error("Failed to fetch inventory dashboard metrics", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-xs">
      {/* Top Action Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold text-[10px] uppercase tracking-wider">
              INVENTORY SUBSYSTEM
            </span>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Material & Stock Operations Hub</h1>
          </div>
          <p className="text-slate-500 mt-1">
            Authoritative material master, physical stock ledgers, warehouses, and project site material dispatch
          </p>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={() => fetchMetrics()}
            className="p-2 rounded-lg border border-walnut/20 hover:bg-cream text-walnut transition-colors cursor-pointer"
            title="Refresh Metrics"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="px-3 py-2 bg-gold hover:bg-gold-hover text-charcoal font-bold rounded-lg shadow-gold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Issue Stock to Site</span>
          </button>

          <button
            onClick={() => setIsMaterialModalOpen(true)}
            className="px-3 py-2 bg-[#36302B] hover:bg-[#4A433D] text-cream font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Register Material</span>
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Total Materials</span>
            <Boxes className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {loading ? "..." : metrics?.totalMaterials ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">Distinct SKUs</span>
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-2">Active Material Master items</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Inventory Stock Value</span>
            <Package className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              ₹{loading ? "..." : (metrics?.totalPhysicalStockValue ?? 0).toLocaleString("en-IN")}
            </span>
            <span className="text-xs text-slate-500 font-medium">Standard Valuation</span>
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-2">Physical stock asset valuation</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Low / Out of Stock</span>
            <AlertTriangle className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-amber-600 tabular-nums">
              {loading ? "..." : (metrics?.lowStockItemsCount ?? 0) + (metrics?.outOfStockItemsCount ?? 0)}
            </span>
            <span className="text-xs text-amber-700 font-semibold bg-amber-50 px-2 py-0.5 rounded">
              {metrics?.outOfStockItemsCount ?? 0} Out of Stock
            </span>
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-2">Materials below reorder level</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm space-y-2">
          <div className="flex items-center justify-between text-slate-500">
            <span className="font-semibold uppercase tracking-wider text-[10px]">Active Warehouses</span>
            <Warehouse className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-2xl font-bold text-slate-900 tabular-nums">
              {loading ? "..." : metrics?.totalWarehouses ?? 0}
            </span>
            <span className="text-xs text-slate-500 font-medium">Godowns & Sites</span>
          </div>
          <p className="text-[11px] text-slate-500 border-t border-slate-100 pt-2 mt-2">Physical storage locations</p>
        </div>
      </div>

      {/* Quick Navigation Hub */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
        <Link
          href="/inventory/materials"
          className="p-3 bg-offwhite border border-walnut/20 rounded-xl hover:border-gold/60 hover:shadow-md transition-all group flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-gold-soft text-charcoal border border-gold/40 flex items-center justify-center font-bold group-hover:bg-gold group-hover:text-charcoal transition-colors">
            <Boxes className="w-5 h-5 text-gold" />
          </div>
          <div>
            <h3 className="font-bold text-charcoal group-hover:text-charcoal">Material Master</h3>
            <p className="text-[10px] text-walnut">Browse & edit items</p>
          </div>
        </Link>

        <Link
          href="/inventory/warehouses"
          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-purple-50 text-purple-700 flex items-center justify-center font-bold group-hover:bg-purple-600 group-hover:text-white transition-colors">
            <Warehouse className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 group-hover:text-purple-700">Warehouses</h3>
            <p className="text-[10px] text-slate-500">Central & site stores</p>
          </div>
        </Link>

        <Link
          href="/inventory/movements"
          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center font-bold group-hover:bg-blue-600 group-hover:text-white transition-colors">
            <Receipt className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 group-hover:text-blue-700">Stock Ledger</h3>
            <p className="text-[10px] text-slate-500">Complete movement log</p>
          </div>
        </Link>

        <Link
          href="/inventory/transfers"
          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group flex items-center gap-3"
        >
          <div className="w-9 h-9 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center font-bold group-hover:bg-amber-600 group-hover:text-white transition-colors">
            <ArrowRightLeft className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 group-hover:text-amber-700">Stock Transfers</h3>
            <p className="text-[10px] text-slate-500">Warehouse transfers</p>
          </div>
        </Link>

        <button
          onClick={() => setIsAdjustModalOpen(true)}
          className="p-3 bg-white border border-slate-200 rounded-xl hover:border-emerald-500 hover:shadow-md transition-all group flex items-center gap-3 text-left"
        >
          <div className="w-9 h-9 rounded-lg bg-slate-100 text-slate-700 flex items-center justify-center font-bold group-hover:bg-slate-900 group-hover:text-white transition-colors">
            <SlidersHorizontal className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-slate-900 group-hover:text-slate-900">Stock Adjust</h3>
            <p className="text-[10px] text-slate-500">Audit corrections</p>
          </div>
        </button>
      </div>

      {/* Recent Movements Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div>
            <h2 className="font-bold text-slate-900 text-sm">Recent Stock Movements</h2>
            <p className="text-slate-500 text-[11px]">Real-time transactional audit trail across all warehouses</p>
          </div>
          <Link
            href="/inventory/movements"
            className="text-xs font-semibold text-emerald-600 hover:text-emerald-700 flex items-center gap-1"
          >
            <span>View Full Ledger</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3">Movement No</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Material</th>
                <th className="px-4 py-3">Warehouse</th>
                <th className="px-4 py-3 text-right">Quantity</th>
                <th className="px-4 py-3 text-right">Balance After</th>
                <th className="px-4 py-3">Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    Loading recent movements...
                  </td>
                </tr>
              ) : !metrics?.recentMovements || metrics.recentMovements.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-8 text-center text-slate-400">
                    No movements recorded yet
                  </td>
                </tr>
              ) : (
                metrics.recentMovements.map((m: any) => {
                  const isPositive = ["OPENING", "RECEIPT", "RETURN_IN", "TRANSFER_IN", "ADJUSTMENT_IN"].includes(
                    m.movementType
                  );

                  return (
                    <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                      <td className="px-4 py-3 font-mono font-semibold text-slate-900">{m.movementNo}</td>
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
                      <td className="px-4 py-3 font-medium text-slate-900">{m.material?.name}</td>
                      <td className="px-4 py-3 text-slate-600">{m.warehouse?.name}</td>
                      <td className="px-4 py-3 text-right font-bold tabular-nums">
                        <span className={isPositive ? "text-emerald-600" : "text-amber-600"}>
                          {isPositive ? "+" : "-"}
                          {m.quantity} {m.unitKey}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-slate-700 tabular-nums">
                        {m.runningBalance} {m.unitKey}
                      </td>
                      <td className="px-4 py-3 text-slate-500 text-[11px]">
                        {new Date(m.createdAt).toLocaleDateString("en-IN", {
                          day: "2-digit",
                          month: "short",
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
      </div>

      {/* Modals */}
      <CreateMaterialModal
        isOpen={isMaterialModalOpen}
        onClose={() => setIsMaterialModalOpen(false)}
        onSuccess={() => fetchMetrics()}
      />
      <CreateWarehouseModal
        isOpen={isWarehouseModalOpen}
        onClose={() => setIsWarehouseModalOpen(false)}
        onSuccess={() => fetchMetrics()}
      />
      <IssueMaterialModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={() => fetchMetrics()}
      />
      <AdjustStockModal
        isOpen={isAdjustModalOpen}
        onClose={() => setIsAdjustModalOpen(false)}
        onSuccess={() => fetchMetrics()}
      />
    </div>
  );
}
