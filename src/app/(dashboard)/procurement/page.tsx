"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { CreateMaterialRequestModal } from "@/components/procurement/create-material-request-modal";
import { CreatePurchaseOrderModal } from "@/components/procurement/create-purchase-order-modal";

interface SummaryData {
  openMaterialRequests: number;
  pendingMRApprovals: number;
  openPurchaseOrders: number;
  ordersAwaitingDelivery: number;
  overdueDeliveries: number;
  committedSpend: number;
}

export default function ProcurementHubPage() {
  const [summary, setSummary] = useState<SummaryData | null>(null);
  const [loading, setLoading] = useState(true);

  const [isMRModalOpen, setIsMRModalOpen] = useState(false);
  const [isPOModalOpen, setIsPOModalOpen] = useState(false);

  useEffect(() => {
    fetchSummary();
  }, []);

  async function fetchSummary() {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/procurement/dashboard");
      if (res.ok) {
        const data = await res.json();
        setSummary(data.data);
      }
    } catch (e) {
      console.error("Failed to load procurement summary", e);
    } finally {
      setLoading(false);
    }
  }

  function formatCurrency(val: number) {
    return `₹${(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Procurement Subsystem</span>
            <span>•</span>
            <span className="text-emerald-600">Prompt 09 — Material Requests & Purchase Orders</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Procurement Operations Hub
          </h1>
          <p className="text-sm text-slate-600">
            Controlled bridge connecting project material requirements, supplier purchase orders, and goods receiving.
          </p>
        </div>

        <div className="flex items-center space-x-3">
          <button
            onClick={() => setIsMRModalOpen(true)}
            className="rounded-md border border-walnut/20 bg-cream/40 px-4 py-2 text-xs font-bold text-walnut hover:bg-cream shadow-sm cursor-pointer transition-colors"
          >
            + New Material Request
          </button>
          <button
            onClick={() => setIsPOModalOpen(true)}
            className="rounded-md bg-gold px-4 py-2 text-xs font-bold text-charcoal shadow-gold hover:bg-gold-hover transition cursor-pointer"
          >
            + Issue Purchase Order
          </button>
        </div>
      </div>

      {/* Summary Operational Metric Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Open Material Requests
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-slate-900">
              {summary?.openMaterialRequests || 0}
            </span>
            <span className="text-xs font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded">
              {summary?.pendingMRApprovals || 0} Pending Approval
            </span>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-2 flex justify-between items-center text-xs">
            <span className="text-slate-500">Site requisitions in workflow</span>
            <Link href="/procurement/material-requests" className="font-bold text-emerald-600 hover:underline">
              View Requisitions →
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Active Purchase Orders
          </div>
          <div className="mt-2 flex items-baseline justify-between">
            <span className="text-3xl font-bold font-mono text-slate-900">
              {summary?.openPurchaseOrders || 0}
            </span>
            <span className="text-xs font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded">
              {summary?.ordersAwaitingDelivery || 0} Awaiting Delivery
            </span>
          </div>
          <div className="mt-3 border-t border-slate-100 pt-2 flex justify-between items-center text-xs">
            <span className="text-slate-500">Issued vendor commitments</span>
            <Link href="/procurement/purchase-orders" className="font-bold text-emerald-600 hover:underline">
              View Purchase Orders →
            </Link>
          </div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Committed Procurement Spend
          </div>
          <div className="mt-2 text-3xl font-bold font-mono text-emerald-700">
            {formatCurrency(summary?.committedSpend || 0)}
          </div>
          <div className="mt-3 border-t border-slate-100 pt-2 flex justify-between items-center text-xs">
            <span className="text-slate-500">Total approved PO commitments</span>
            <Link href="/procurement/receipts" className="font-bold text-emerald-600 hover:underline">
              View Goods Receipts →
            </Link>
          </div>
        </div>
      </div>

      {/* Module Shortcuts Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-4">
        <Link
          href="/procurement/material-requests"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-500 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600">
              1. Material Requests (MR)
            </h3>
            <span className="text-slate-400 font-bold">→</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Requisitions created by Site Engineers and Project Managers. Track material requirements, approvals, and ordering status (`MR-YYYY-XXXX`).
          </p>
        </Link>

        <Link
          href="/procurement/purchase-orders"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-500 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600">
              2. Purchase Orders (PO)
            </h3>
            <span className="text-slate-400 font-bold">→</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Commercial commitments to registered suppliers. Track vendor snapshots, rates, discounts, GST, expected delivery dates, and PO revisions (`PO-YYYY-XXXX`).
          </p>
        </Link>

        <Link
          href="/procurement/receipts"
          className="rounded-lg border border-slate-200 bg-white p-6 shadow-sm hover:border-emerald-500 transition group"
        >
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-lg font-bold text-slate-900 group-hover:text-emerald-600">
              3. Goods Receipts (GRN)
            </h3>
            <span className="text-slate-400 font-bold">→</span>
          </div>
          <p className="text-xs text-slate-600 leading-relaxed">
            Material delivery notes and site inspections. Record accepted, rejected, damaged, and short quantities against PO line items (`GRN-YYYY-XXXX`).
          </p>
        </Link>
      </div>

      {/* Modals */}
      <CreateMaterialRequestModal
        isOpen={isMRModalOpen}
        onClose={() => setIsMRModalOpen(false)}
        onSuccess={fetchSummary}
      />
      <CreatePurchaseOrderModal
        isOpen={isPOModalOpen}
        onClose={() => setIsPOModalOpen(false)}
        onSuccess={fetchSummary}
      />
    </div>
  );
}
