"use client";

import React, { useState, useEffect } from "react";

interface GRNItem {
  id: string;
  referenceNo: string;
  receivedDate: string;
  purchaseOrder?: { referenceNo: string };
  vendor?: { name: string };
  project?: { title: string };
  receivedBy?: { fullName: string };
  deliveryReference?: string | null;
  status: string;
  items?: any[];
}

export default function GoodsReceiptsPage() {
  const [receipts, setReceipts] = useState<GRNItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");

  useEffect(() => {
    fetchReceipts();
  }, []);

  async function fetchReceipts() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/receipts?search=${encodeURIComponent(search)}`);
      if (res.ok) {
        const data = await res.json();
        setReceipts(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load Goods Receipts", e);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Procurement Subsystem</span>
            <span>•</span>
            <span className="text-emerald-600">Goods Receipt Notes (GRN)</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Goods Receipts & Delivery Log
          </h1>
          <p className="text-sm text-slate-600">
            Site material delivery records, accepted vs rejected quantities, and inspection logs.
          </p>
        </div>
      </div>

      {/* Toolbar / Search */}
      <div className="flex items-center space-x-3 border-b border-slate-200 pb-3">
        <input
          type="text"
          placeholder="Search GRN number, PO number, Challan Ref..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && fetchReceipts()}
          className="w-72 rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
        />
      </div>

      {/* Data Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading Goods Receipts...
          </div>
        ) : receipts.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No Goods Receipts recorded yet. Open an active Purchase Order to record deliveries.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">GRN Number</th>
                <th className="px-4 py-3">Receipt Date</th>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">Supplier / Vendor</th>
                <th className="px-4 py-3">Challan / Bill Ref</th>
                <th className="px-4 py-3 text-center">Items Received</th>
                <th className="px-4 py-3">Received By</th>
                <th className="px-4 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {receipts.map((grn) => (
                <tr key={grn.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{grn.referenceNo}</td>
                  <td className="px-4 py-3">{new Date(grn.receivedDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{grn.purchaseOrder?.referenceNo}</td>
                  <td className="px-4 py-3 text-slate-900 font-bold">{grn.vendor?.name}</td>
                  <td className="px-4 py-3 font-mono text-slate-600">{grn.deliveryReference || "N/A"}</td>
                  <td className="px-4 py-3 text-center font-mono font-bold">{grn.items?.length || 0}</td>
                  <td className="px-4 py-3 text-slate-700">{grn.receivedBy?.fullName || "Site Engineer"}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 text-xs">
                      {grn.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
