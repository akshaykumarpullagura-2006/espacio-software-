"use client";

import React, { useState, useEffect } from "react";
import {
  Boxes,
  Plus,
  Search,
  Filter,
  AlertTriangle,
  CheckCircle2,
  Package,
  Layers,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
} from "lucide-react";
import { CreateMaterialModal } from "@/components/inventory/create-material-modal";
import { IssueMaterialModal } from "@/components/inventory/issue-material-modal";

export default function MaterialsDirectoryPage() {
  const [materials, setMaterials] = useState<any[]>([]);
  const [pagination, setPagination] = useState<any>({ page: 1, totalPages: 1 });
  const [loading, setLoading] = useState(true);
  const [categories, setCategories] = useState<any[]>([]);

  // Filter state
  const [search, setSearch] = useState("");
  const [categoryKey, setCategoryKey] = useState("");
  const [reorderFilter, setReorderFilter] = useState<"ALL" | "LOW_STOCK" | "OUT_OF_STOCK">("ALL");
  const [page, setPage] = useState(1);

  // Modals state
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isIssueModalOpen, setIsIssueModalOpen] = useState(false);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchMaterials();
  }, [search, categoryKey, reorderFilter, page]);

  const fetchCategories = async () => {
    try {
      const res = await fetch("/api/v1/config/inventory");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.categories || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  const fetchMaterials = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (categoryKey) params.append("categoryKey", categoryKey);
      if (reorderFilter === "LOW_STOCK") params.append("lowStockOnly", "true");
      if (reorderFilter === "OUT_OF_STOCK") params.append("outOfStockOnly", "true");
      params.append("page", page.toString());
      params.append("limit", "15");

      const res = await fetch(`/api/v1/inventory/materials?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setMaterials(data.data.materials || []);
        setPagination(data.data.pagination || { page: 1, totalPages: 1 });
      }
    } catch (err) {
      console.error("Failed to fetch materials", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-xs">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Material Master Directory</h1>
          <p className="text-slate-500 mt-1">
            Authoritative catalog of SKUs, base units, reorder levels, purchase rates, and warehouse physical stock
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsIssueModalOpen(true)}
            className="px-3 py-2 bg-gold hover:bg-gold-hover text-charcoal font-bold rounded-lg shadow-gold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4" />
            <span>Issue to Site</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-2 bg-[#36302B] hover:bg-[#4A433D] text-cream font-bold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Material Master</span>
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="flex items-center gap-3 w-full md:w-auto flex-1">
          <div className="relative w-full md:w-80">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Search by code, SKU, name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-9 pl-9 pr-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
            />
          </div>

          <select
            value={categoryKey}
            onChange={(e) => setCategoryKey(e.target.value)}
            className="h-9 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-lg">
          <button
            onClick={() => setReorderFilter("ALL")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              reorderFilter === "ALL" ? "bg-white text-slate-900 shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            All Items
          </button>
          <button
            onClick={() => setReorderFilter("LOW_STOCK")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              reorderFilter === "LOW_STOCK" ? "bg-amber-500 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Low Stock Alerts
          </button>
          <button
            onClick={() => setReorderFilter("OUT_OF_STOCK")}
            className={`px-3 py-1 rounded-md text-xs font-semibold transition-colors ${
              reorderFilter === "OUT_OF_STOCK" ? "bg-rose-600 text-white shadow-xs" : "text-slate-600 hover:text-slate-900"
            }`}
          >
            Out of Stock
          </button>
        </div>
      </div>

      {/* Materials Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3">Material Code / SKU</th>
                <th className="px-4 py-3">Material Name & Category</th>
                <th className="px-4 py-3">Base Unit</th>
                <th className="px-4 py-3 text-right">Physical Stock</th>
                <th className="px-4 py-3 text-right">Reserved</th>
                <th className="px-4 py-3 text-right">Available Stock</th>
                <th className="px-4 py-3 text-right">Reorder Level</th>
                <th className="px-4 py-3 text-center">Stock Status</th>
                <th className="px-4 py-3 text-right">Purchase Rate</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    Loading materials master...
                  </td>
                </tr>
              ) : materials.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-400">
                    No materials found matching criteria
                  </td>
                </tr>
              ) : (
                materials.map((m) => (
                  <tr key={m.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3">
                      <div className="font-mono font-bold text-slate-900">{m.materialCode}</div>
                      {m.sku && <div className="text-[10px] text-slate-400 font-mono">{m.sku}</div>}
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-bold text-slate-900">{m.name}</div>
                      <div className="text-[10px] text-slate-500 font-medium">
                        {m.categoryKey} {m.brandKey ? `• ${m.brandKey}` : ""}
                      </div>
                    </td>
                    <td className="px-4 py-3 font-medium text-slate-600">{m.baseUnitKey}</td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                      {m.physicalStock} {m.baseUnitKey}
                    </td>
                    <td className="px-4 py-3 text-right font-medium text-slate-500 tabular-nums">
                      {m.reservedStock > 0 ? `${m.reservedStock} ${m.baseUnitKey}` : "-"}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-emerald-700 tabular-nums">
                      {m.availableStock} {m.baseUnitKey}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-amber-700 tabular-nums">
                      {m.reorderLevel} {m.baseUnitKey}
                    </td>
                    <td className="px-4 py-3 text-center">
                      {m.reorderState === "OUT_OF_STOCK" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                          OUT OF STOCK
                        </span>
                      ) : m.reorderState === "LOW_STOCK" ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200">
                          LOW STOCK
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                          NORMAL
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-slate-900 tabular-nums">
                      ₹{(m.purchaseCost || 0).toLocaleString("en-IN")}
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

      <CreateMaterialModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchMaterials()}
      />
      <IssueMaterialModal
        isOpen={isIssueModalOpen}
        onClose={() => setIsIssueModalOpen(false)}
        onSuccess={() => fetchMaterials()}
      />
    </div>
  );
}
