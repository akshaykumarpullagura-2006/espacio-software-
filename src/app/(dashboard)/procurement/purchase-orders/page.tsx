"use client";

import React, { useState, useEffect } from "react";
import { CreatePurchaseOrderModal } from "@/components/procurement/create-purchase-order-modal";
import { PurchaseOrderDetailModal } from "@/components/procurement/purchase-order-detail-modal";

interface POItem {
  id: string;
  referenceNo: string;
  poDate: string;
  expectedDeliveryDate?: string | null;
  vendor?: { name: string; categoryKey: string };
  project?: { title: string };
  grandTotal: number;
  status: string;
  revision: number;
}

export default function PurchaseOrdersPage() {
  const [orders, setOrders] = useState<POItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Filters
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Modals
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [selectedPOId, setSelectedPOId] = useState<string | null>(null);

  useEffect(() => {
    fetchOrders();
  }, [statusFilter]);

  async function fetchOrders() {
    setLoading(true);
    try {
      let url = `/api/v1/procurement/purchase-orders?search=${encodeURIComponent(search)}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setOrders(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load purchase orders", e);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(val: number) {
    return `₹${(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function getStatusBadge(s: string) {
    switch (s) {
      case "APPROVED":
        return <span className="rounded bg-emerald-50 px-2.5 py-0.5 font-bold text-emerald-700 text-xs">APPROVED</span>;
      case "SENT":
        return <span className="rounded bg-blue-50 px-2.5 py-0.5 font-bold text-blue-700 text-xs">SENT TO VENDOR</span>;
      case "PARTIALLY_RECEIVED":
        return <span className="rounded bg-amber-50 px-2.5 py-0.5 font-bold text-amber-700 text-xs">PARTIALLY RECEIVED</span>;
      case "RECEIVED":
        return <span className="rounded bg-emerald-100 px-2.5 py-0.5 font-bold text-emerald-800 text-xs">FULLY RECEIVED</span>;
      case "CANCELLED":
        return <span className="rounded bg-rose-50 px-2.5 py-0.5 font-bold text-rose-700 text-xs">CANCELLED</span>;
      default:
        return <span className="rounded bg-slate-100 px-2.5 py-0.5 font-semibold text-slate-600 text-xs">{s}</span>;
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
            <span className="text-gold font-bold">Purchase Orders</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">
            Purchase Orders Directory
          </h1>
          <p className="text-sm text-walnut">
            Vendor purchase orders, line items, rates, delivery tracking, and receiving status.
          </p>
        </div>

        <button
          onClick={() => setIsCreateModalOpen(true)}
          className="rounded-md bg-gold px-4 py-2 text-xs font-bold text-charcoal shadow-gold hover:bg-gold-hover transition cursor-pointer"
        >
          + Issue Purchase Order
        </button>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-walnut/15 pb-3">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search PO number, vendor, notes..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchOrders()}
            className="w-full sm:w-72 rounded-md border border-walnut/20 bg-cream/40 px-3 py-1.5 text-xs text-charcoal focus:border-gold focus:outline-none"
          />

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="DRAFT">DRAFT</option>
            <option value="APPROVED">APPROVED</option>
            <option value="SENT">SENT TO VENDOR</option>
            <option value="PARTIALLY_RECEIVED">PARTIALLY RECEIVED</option>
            <option value="RECEIVED">RECEIVED</option>
            <option value="CANCELLED">CANCELLED</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading purchase orders...
          </div>
        ) : orders.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No purchase orders created yet. Click <strong>+ Issue Purchase Order</strong> above.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">PO Number</th>
                <th className="px-4 py-3">PO Date</th>
                <th className="px-4 py-3">Supplier / Vendor</th>
                <th className="px-4 py-3">Project</th>
                <th className="px-4 py-3">Expected Delivery</th>
                <th className="px-4 py-3 text-right">Grand Total (₹)</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {orders.map((po) => (
                <tr key={po.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{po.referenceNo}</td>
                  <td className="px-4 py-3">{new Date(po.poDate).toLocaleDateString()}</td>
                  <td className="px-4 py-3 text-slate-900 font-bold">{po.vendor?.name}</td>
                  <td className="px-4 py-3 text-slate-700">{po.project?.title || "General Stock"}</td>
                  <td className="px-4 py-3 font-mono">
                    {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : "TBD"}
                  </td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-emerald-700">
                    {formatCurrency(po.grandTotal)}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(po.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedPOId(po.id)}
                      className="text-emerald-600 hover:text-emerald-800 font-semibold"
                    >
                      View Order →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <CreatePurchaseOrderModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={fetchOrders}
      />
      <PurchaseOrderDetailModal
        isOpen={selectedPOId !== null}
        poId={selectedPOId}
        onClose={() => setSelectedPOId(null)}
        onRefresh={fetchOrders}
      />
    </div>
  );
}
