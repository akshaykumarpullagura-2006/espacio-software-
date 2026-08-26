"use client";

import React, { useState, useEffect } from "react";
import { AddVendorModal } from "@/components/vendors/add-vendor-modal";
import { VendorDetailModal } from "@/components/vendors/vendor-detail-modal";

interface VendorItem {
  id: string;
  referenceNo: string;
  name: string;
  legalName?: string | null;
  categoryKey: string;
  phone: string;
  email?: string | null;
  status: string;
  totalPurchases: number;
  totalOutstanding: number;
  qualityRating: number;
  primaryContact?: { name: string; designation?: string } | null;
}

interface CategoryOption {
  key: string;
  name: string;
}

export default function VendorsPage() {
  const [vendors, setVendors] = useState<VendorItem[]>([]);
  const [categories, setCategories] = useState<CategoryOption[]>([]);
  const [loading, setLoading] = useState(true);

  // Filter state
  const [categoryFilter, setCategoryFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [search, setSearch] = useState("");

  // Modal & Drawer state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedVendorId, setSelectedVendorId] = useState<string | null>(null);

  useEffect(() => {
    fetchCategories();
  }, []);

  useEffect(() => {
    fetchVendors();
  }, [categoryFilter, statusFilter]);

  async function fetchCategories() {
    try {
      const res = await fetch("/api/v1/config/vendors");
      if (res.ok) {
        const data = await res.json();
        setCategories(data.data?.categories || []);
      }
    } catch (e) {
      console.error("Failed to load categories", e);
    }
  }

  async function fetchVendors() {
    setLoading(true);
    try {
      let url = `/api/v1/procurement/vendors?search=${encodeURIComponent(search)}`;
      if (categoryFilter) url += `&categoryKey=${categoryFilter}`;
      if (statusFilter) url += `&status=${statusFilter}`;

      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        setVendors(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load vendors", e);
    } finally {
      setLoading(false);
    }
  }

  // Summary KPI Calculations
  const totalVendorsCount = vendors.length;
  const totalPurchasesSum = vendors.reduce((acc, v) => acc + (v.totalPurchases || 0), 0);
  const totalOutstandingSum = vendors.reduce((acc, v) => acc + (v.totalOutstanding || 0), 0);
  const avgRating =
    vendors.length > 0
      ? (vendors.reduce((acc, v) => acc + (v.qualityRating || 4.5), 0) / vendors.length).toFixed(1)
      : "4.6";

  function formatCurrency(val: number) {
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function getStatusBadge(status: string) {
    switch (status) {
      case "ACTIVE":
        return <span className="inline-flex items-center rounded-full bg-emerald-50 px-2.5 py-0.5 text-xs font-semibold text-emerald-700">ACTIVE</span>;
      case "BLOCKED":
        return <span className="inline-flex items-center rounded-full bg-rose-50 px-2.5 py-0.5 text-xs font-semibold text-rose-700">BLOCKED</span>;
      case "INACTIVE":
        return <span className="inline-flex items-center rounded-full bg-slate-100 px-2.5 py-0.5 text-xs font-semibold text-slate-600">INACTIVE</span>;
      default:
        return <span className="inline-flex items-center rounded-full bg-amber-50 px-2.5 py-0.5 text-xs font-semibold text-amber-700">{status}</span>;
    }
  }

  return (
    <div className="min-h-screen bg-slate-50 p-6 space-y-6">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center space-x-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
            <span>Procurement Subsystem</span>
            <span>•</span>
            <span className="text-emerald-600">Prompt 08 — Vendors & Suppliers</span>
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-charcoal">
            Vendors & Suppliers Directory
          </h1>
          <p className="text-sm text-walnut">
            Supplier details, category taxonomy, purchase history, outstanding payables, and performance evaluation.
          </p>
        </div>

        <button
          onClick={() => setIsAddModalOpen(true)}
          className="rounded-md bg-gold px-4 py-2 text-xs font-bold text-charcoal shadow-gold hover:bg-gold-hover transition cursor-pointer"
        >
          + Add Vendor
        </button>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Vendors
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {totalVendorsCount}
          </div>
          <div className="mt-1 text-xs text-slate-500">Registered material & service suppliers</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Total Purchases
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-slate-900">
            {formatCurrency(totalPurchasesSum)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Cumulative historical PO & expense spend</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Outstanding Payables
          </div>
          <div className="mt-2 text-2xl font-bold font-mono text-amber-600">
            {formatCurrency(totalOutstandingSum)}
          </div>
          <div className="mt-1 text-xs text-slate-500">Current unpaid vendor obligations</div>
        </div>

        <div className="rounded-lg border border-slate-200 bg-white p-5 shadow-sm">
          <div className="text-xs font-semibold uppercase tracking-wider text-slate-500">
            Avg Quality Rating
          </div>
          <div className="mt-2 text-2xl font-bold text-emerald-700 flex items-center space-x-1">
            <span>★</span>
            <span>{avgRating}</span>
            <span className="text-xs text-slate-400 font-normal">/ 5.0</span>
          </div>
          <div className="mt-1 text-xs text-slate-500">Vendor performance & delivery score</div>
        </div>
      </div>

      {/* Toolbar / Filters */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-200 pb-3">
        <div className="flex items-center space-x-3 w-full sm:w-auto">
          <input
            type="text"
            placeholder="Search vendor name, code, contact, GST..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && fetchVendors()}
            className="w-full sm:w-72 rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          />

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded border border-slate-300 px-3 py-1.5 text-xs text-slate-900 focus:border-emerald-500 focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="ACTIVE">ACTIVE</option>
            <option value="BLOCKED">BLOCKED</option>
            <option value="INACTIVE">INACTIVE</option>
          </select>
        </div>
      </div>

      {/* Main Vendor Data Table (Matches Reference Design) */}
      <div className="rounded-lg border border-slate-200 bg-white shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-sm text-slate-500">
            Loading vendor directory...
          </div>
        ) : vendors.length === 0 ? (
          <div className="p-12 text-center text-sm text-slate-500">
            No vendors registered yet. Click <strong>+ Add Vendor</strong> above to create one.
          </div>
        ) : (
          <table className="w-full text-left text-xs">
            <thead className="border-b border-slate-200 bg-slate-50 text-slate-600 uppercase tracking-wider font-semibold">
              <tr>
                <th className="px-4 py-3">Vendor Code</th>
                <th className="px-4 py-3">Vendor Name</th>
                <th className="px-4 py-3">Category</th>
                <th className="px-4 py-3">Contact Person</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3 text-right">Outstanding (₹)</th>
                <th className="px-4 py-3 text-center">Quality Rating</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-slate-800 font-medium">
              {vendors.map((v) => (
                <tr key={v.id} className="hover:bg-slate-50/80 transition">
                  <td className="px-4 py-3 font-mono font-bold text-slate-900">{v.referenceNo}</td>
                  <td className="px-4 py-3 font-bold text-slate-900">{v.name}</td>
                  <td className="px-4 py-3">
                    <span className="rounded bg-slate-100 px-2 py-0.5 font-mono text-[11px] text-slate-700">
                      {v.categoryKey}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-700">
                    {v.primaryContact?.name || v.phone}
                  </td>
                  <td className="px-4 py-3 font-mono">{v.phone}</td>
                  <td className="px-4 py-3 text-right font-mono font-bold text-amber-700">
                    {formatCurrency(v.totalOutstanding || 0)}
                  </td>
                  <td className="px-4 py-3 text-center font-bold text-emerald-700">
                    ★ {v.qualityRating || 4.5}
                  </td>
                  <td className="px-4 py-3">{getStatusBadge(v.status)}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setSelectedVendorId(v.id)}
                      className="text-emerald-600 hover:text-emerald-800 font-semibold"
                    >
                      View Workspace →
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Modals */}
      <AddVendorModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchVendors}
      />
      <VendorDetailModal
        isOpen={selectedVendorId !== null}
        vendorId={selectedVendorId}
        onClose={() => setSelectedVendorId(null)}
        onRefresh={fetchVendors}
      />
    </div>
  );
}
