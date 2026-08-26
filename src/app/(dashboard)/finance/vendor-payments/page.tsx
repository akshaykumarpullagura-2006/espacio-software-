"use client";

import React, { useState, useEffect } from "react";
import { CreditCard, RotateCcw, Search, CheckCircle2 } from "lucide-react";
import { RecordVendorPaymentModal } from "@/components/finance/record-vendor-payment-modal";

export default function VendorPaymentsPage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  useEffect(() => {
    fetchPayments();
  }, []);

  const fetchPayments = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/finance/vendor-payments");
      const data = await res.json();
      if (data.success) {
        setPayments(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleReverse = async (id: string) => {
    const reason = prompt("Enter explicit reason for vendor payment reversal:");
    if (!reason || reason.trim() === "") return;

    try {
      const res = await fetch(`/api/v1/finance/vendor-payments/${id}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason }),
      });
      const data = await res.json();
      if (data.success) {
        fetchPayments();
      } else {
        alert(data.error || "Failed to reverse payment");
      }
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-xs">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Vendor Payments & Reversals Ledger</h1>
          <p className="text-slate-500 mt-1">
            Authoritative supplier disbursement records (`VPAY-YYYY-XXXX`) and controlled audit reversals
          </p>
        </div>

        <button
          onClick={() => setIsRecordModalOpen(true)}
          className="px-3 py-2 bg-gold hover:bg-gold-hover text-charcoal font-bold rounded-lg shadow-gold flex items-center gap-1.5 transition-colors cursor-pointer"
        >
          <CreditCard className="w-4 h-4" />
          <span>Record Vendor Payment</span>
        </button>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-200 rounded-xl shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 text-slate-500 text-[10px] font-bold uppercase tracking-wider border-b border-slate-100">
                <th className="px-4 py-3">Payment No</th>
                <th className="px-4 py-3">Vendor / Supplier</th>
                <th className="px-4 py-3">Financial Account</th>
                <th className="px-4 py-3">Payment Mode / UTR</th>
                <th className="px-4 py-3 text-right">Amount Paid</th>
                <th className="px-4 py-3 text-center">Status</th>
                <th className="px-4 py-3">Payment Date</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {loading ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    Loading vendor payments...
                  </td>
                </tr>
              ) : payments.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-slate-400">
                    No vendor payments recorded yet
                  </td>
                </tr>
              ) : (
                payments.map((p) => (
                  <tr key={p.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-4 py-3 font-mono font-bold text-slate-900">{p.paymentNo}</td>
                    <td className="px-4 py-3 font-semibold text-slate-900">{p.vendor?.name}</td>
                    <td className="px-4 py-3 font-medium text-slate-700">{p.financialAccount?.name || "-"}</td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-slate-800">{p.paymentMethod}</div>
                      {p.referenceNoExt && <div className="text-[10px] text-slate-500 font-mono">{p.referenceNoExt}</div>}
                    </td>
                    <td className="px-4 py-3 text-right font-bold text-slate-900 tabular-nums">
                      ₹{p.amount.toLocaleString("en-IN")}
                    </td>
                    <td className="px-4 py-3 text-center">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                          p.status === "VERIFIED"
                            ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                            : "bg-rose-100 text-rose-800 border border-rose-200"
                        }`}
                      >
                        {p.status}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-slate-600 text-[11px]">
                      {new Date(p.paymentDate).toLocaleDateString("en-IN", {
                        day: "2-digit",
                        month: "short",
                        year: "numeric",
                      })}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {p.status === "VERIFIED" ? (
                        <button
                          onClick={() => handleReverse(p.id)}
                          className="px-2.5 py-1 bg-rose-50 hover:bg-rose-100 text-rose-700 font-semibold rounded border border-rose-200 flex items-center gap-1 ml-auto"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>Reverse</span>
                        </button>
                      ) : (
                        <span className="text-[10px] text-rose-600 font-semibold">{p.reversedReason}</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <RecordVendorPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={() => fetchPayments()}
      />
    </div>
  );
}
