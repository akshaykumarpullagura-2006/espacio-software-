"use client";

import React, { useState, useEffect } from "react";
import { X, CreditCard, AlertCircle, Save } from "lucide-react";

interface RecordVendorPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const RecordVendorPaymentModal: React.FC<RecordVendorPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [vendors, setVendors] = useState<any[]>([]);
  const [payables, setPayables] = useState<any[]>([]);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    vendorId: "",
    payableId: "",
    financialAccountId: "",
    amount: "50000",
    paymentDate: new Date().toISOString().split("T")[0],
    paymentMethod: "BANK_TRANSFER" as const,
    referenceNoExt: "UTR-99887766",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
    }
  }, [isOpen]);

  const fetchDropdowns = async () => {
    try {
      const [vRes, pRes, aRes] = await Promise.all([
        fetch("/api/v1/procurement/vendors"),
        fetch("/api/v1/finance/payables?status=OPEN"),
        fetch("/api/v1/finance/accounts"),
      ]);

      const [vData, pData, aData] = await Promise.all([vRes.json(), pRes.json(), aRes.json()]);

      if (vData.success) setVendors(vData.data || []);
      if (pData.success) setPayables(pData.data || []);
      if (aData.success) setAccounts(aData.data || []);

      if (vData.data?.length > 0) setFormData((prev) => ({ ...prev, vendorId: vData.data[0].id }));
      if (aData.data?.length > 0) setFormData((prev) => ({ ...prev, financialAccountId: aData.data[0].id }));
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/finance/vendor-payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId: formData.vendorId,
          payableId: formData.payableId || undefined,
          financialAccountId: formData.financialAccountId || undefined,
          amount: parseFloat(formData.amount) || 0,
          paymentDate: formData.paymentDate,
          paymentMethod: formData.paymentMethod,
          referenceNoExt: formData.referenceNoExt || undefined,
          notes: formData.notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to record vendor payment");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-offwhite rounded-xl shadow-2xl border border-walnut/20 w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold-soft text-charcoal border border-gold/40 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-charcoal">Record Vendor Payment</h2>
              <p className="text-xs text-walnut">Issue payment to supplier &amp; debit financial account</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-walnut hover:text-charcoal hover:bg-cream cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-semantic-danger-bg border border-semantic-danger-border text-semantic-danger font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-bold text-walnut">Select Vendor *</label>
            <select
              value={formData.vendorId}
              onChange={(e) => setFormData({ ...formData, vendorId: e.target.value })}
              className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-semibold focus:border-gold focus:outline-none"
            >
              {vendors.map((v) => (
                <option key={v.id} value={v.id}>
                  {v.referenceNo} - {v.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-walnut">Link Vendor Payable (Optional)</label>
              <select
                value={formData.payableId}
                onChange={(e) => {
                  const p = payables.find((item) => item.id === e.target.value);
                  setFormData({
                    ...formData,
                    payableId: e.target.value,
                    amount: p ? p.outstandingAmount.toString() : formData.amount,
                  });
                }}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                <option value="">Direct Payment (No Bill Link)</option>
                {payables
                  .filter((p) => !formData.vendorId || p.vendorId === formData.vendorId)
                  .map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.payableNo} - Due ₹{p.outstandingAmount}
                    </option>
                  ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Financial Account (Debit Source)</label>
              <select
                value={formData.financialAccountId}
                onChange={(e) => setFormData({ ...formData, financialAccountId: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name} (₹{a.currentBalance})
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-walnut">Amount Paid (₹) *</label>
              <input
                type="number"
                step="any"
                required
                min="1"
                value={formData.amount}
                onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg font-mono font-bold text-charcoal tabular-nums focus:border-gold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Payment Mode *</label>
              <select
                value={formData.paymentMethod}
                onChange={(e) => setFormData({ ...formData, paymentMethod: e.target.value as any })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="UPI">UPI / PhonePe / GPay</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="CREDIT_CARD">Credit Card</option>
              </select>
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-walnut">Bank Reference / UTR No / Cheque No</label>
            <input
              type="text"
              placeholder="e.g. UTR-9988776655"
              value={formData.referenceNoExt}
              onChange={(e) => setFormData({ ...formData, referenceNoExt: e.target.value })}
              className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg font-mono text-charcoal focus:border-gold focus:outline-none"
            />
          </div>

          <div className="pt-4 border-t border-walnut/15 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-walnut hover:bg-cream rounded-lg border border-walnut/20 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover shadow-gold rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Recording..." : "Record Vendor Payment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
