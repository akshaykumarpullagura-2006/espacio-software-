"use client";

import React, { useState, useEffect } from "react";
import { Warehouse, Plus, MapPin, Boxes, CheckCircle2 } from "lucide-react";
import { CreateWarehouseModal } from "@/components/inventory/create-warehouse-modal";

export default function WarehousesPage() {
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  useEffect(() => {
    fetchWarehouses();
  }, []);

  const fetchWarehouses = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/inventory/warehouses");
      const data = await res.json();
      if (data.success) {
        setWarehouses(data.data || []);
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Warehouses & Site Storage Locations</h1>
          <p className="text-slate-500 mt-1">
            Central godowns, office stores, transit hubs, and project site material stores
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors"
        >
          <Plus className="w-4 h-4" />
          <span>New Warehouse</span>
        </button>
      </div>

      {/* Warehouse Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading warehouses...</div>
        ) : warehouses.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">No warehouses registered</div>
        ) : (
          warehouses.map((w) => (
            <div key={w.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Warehouse className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{w.name}</h3>
                    <span className="font-mono text-[10px] text-slate-500 font-semibold">{w.warehouseCode}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                  {w.type}
                </span>
              </div>

              {w.address && (
                <div className="flex items-start gap-1.5 text-slate-600 text-xs border-t border-slate-100 pt-3">
                  <MapPin className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
                  <span>
                    {w.address}, {w.city}
                  </span>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Total Stock Units</div>
                  <div className="text-lg font-bold text-slate-900 tabular-nums">{w.totalPhysicalStock}</div>
                </div>
                <div className="p-3 bg-slate-50 rounded-lg border border-slate-100">
                  <div className="text-slate-400 text-[10px] uppercase font-bold">Distinct Materials</div>
                  <div className="text-lg font-bold text-slate-900 tabular-nums">{w.totalMaterialTypes} SKUs</div>
                </div>
              </div>

              {w.project && (
                <div className="p-2.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-800 text-[11px] font-medium flex items-center justify-between">
                  <span>Site Store for:</span>
                  <span className="font-bold">{w.project.title}</span>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <CreateWarehouseModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchWarehouses()}
      />
    </div>
  );
}
