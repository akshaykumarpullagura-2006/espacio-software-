"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, Search, Filter, Plus } from "lucide-react";
import { RecordVendorPaymentModal } from "@/components/finance/record-vendor-payment-modal";

export default function PayablesDirectoryPage() {
  const [payables, setPayables] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [status, setStatus] = useState("");
  const [isPaymentModalOpen, setIsPaymentModalOpen] = useState(false);

  useEffect(() => {
    fetchPayables();
  }, [search, status]);

  const fetchPayables = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (search) params.append("search", search);
      if (status) params.append("status", status);

      const res = await fetch(`/api/v1/finance/payables?${params.toString()}`);
      const data = await res.json();
      if (data.success) {
        setPayables(data.data || []);
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vendor Payables & Outstanding Bills</h1>
          <p className="text-slate-500 mt-1">
            Authoritative tracking of money owed to suppliers, purchase order bills, payments, and outstanding balances
          </p>
        </div>

        <button
          onClick={() => setIsPaymentModalOpen(true)}
          className="px-3 py-2 bg-gold hover:bg-gold-hover text-charcoal font-bold rounded-lg shadow-gold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          <span>Record Vendor Payment</span>
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
          <input
            type="text"
            placeholder="Search payable no, vendor, PO..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-9 pl-9 pr-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none"
          />
        </div>

        <select
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          className="h-9 px-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:outline-none font-medium"
        >
          <option value="">All Statuses</option>
          <option value="OPEN">OPEN</option>
          <option value="PARTIALLY_PAID">PARTIALLY PAID</option>
          <option value="PAID">PAID</option>
          <option value="OVERDUE">OVERDUE</option>
        </select>
      </div>

      {/* Payables Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3">Payable No</th>
                <th className="px-4 py-3">Vendor / Supplier</th>
                <th className="px-4 py-3">PO / Invoice Ref</th>
                <th className="px-4 py-3 text-right">Total Payable</th>
                <th className="px-4 py-3 text-right">Paid Amount</th>
                <th className="px-4 py-3 text-right">Outstanding Balance</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Due Date</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Loading vendor payables...
                  </td>
                </tr>
              ) : payables.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No vendor payables found
                  </td>
                </tr>
              ) : (
                payables.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.payableNo}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.vendor?.name}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{p.purchaseOrder?.referenceNo || "-"}</div>
                      {p.invoiceReference && <div className="text-[10px] text-slate-500">{p.invoiceReference}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-emerald-700 tabular-nums">
                      ₹{p.paidAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-amber-700 tabular-nums">
                      ₹{p.outstandingAmount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.status === "PAID"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : p.status === "OVERDUE"
                            ? "bg-rose-100 text-rose-800 border border-rose-200"
                            : p.status === "PARTIALLY_PAID"
                            ? "bg-amber-100 text-amber-800 border border-amber-200"
                            : "bg-slate-100 text-slate-700"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px]">
                      {p.dueDate
                        ? new Date(p.dueDate).toLocaleDateString("en-IN", {
                            day: "2-digit",
                            month: "short",
                            year: "numeric",
                          })
                        : "-"}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RecordVendorPaymentModal
        isOpen={isPaymentModalOpen}
        onClose={() => setIsPaymentModalOpen(false)}
        onSuccess={() => fetchPayables()}
      />
    </div>
  );
}
