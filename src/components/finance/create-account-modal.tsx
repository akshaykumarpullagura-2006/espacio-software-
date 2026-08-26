"use client";

import React, { useState } from "react";
import { X, Wallet, AlertCircle, Save } from "lucide-react";

interface CreateAccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateAccountModal: React.FC<CreateAccountModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    type: "BANK" as "CASH" | "BANK" | "UPI" | "OTHER",
    openingBalance: "50000",
    bankName: "",
    accountNo: "",
    ifscCode: "",
    notes: "",
  });

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/finance/accounts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          openingBalance: parseFloat(formData.openingBalance) || 0,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create financial account");
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
              <Wallet className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-charcoal">Add Financial Account</h2>
              <p className="text-xs text-walnut">Register operating bank account, cash locker, or UPI handle</p>
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
            <label className="font-bold text-walnut">Account Name *</label>
            <input
              type="text"
              required
              placeholder="e.g. ICICI Corporate Current Account"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-medium focus:border-gold focus:outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-walnut">Account Type *</label>
              <select
                value={formData.type}
                onChange={(e) => setFormData({ ...formData, type: e.target.value as any })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                <option value="BANK">Bank Account</option>
                <option value="CASH">Cash Locker</option>
                <option value="UPI">UPI / Merchant</option>
                <option value="OTHER">Other Account</option>
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Opening Balance (₹)</label>
              <input
                type="number"
                step="any"
                value={formData.openingBalance}
                onChange={(e) => setFormData({ ...formData, openingBalance: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-mono font-bold tabular-nums focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          {formData.type === "BANK" && (
            <div className="grid grid-cols-3 gap-3 p-3 bg-cream/50 border border-walnut/15 rounded-lg">
              <div className="space-y-1">
                <label className="font-bold text-walnut">Bank Name</label>
                <input
                  type="text"
                  placeholder="ICICI"
                  value={formData.bankName}
                  onChange={(e) => setFormData({ ...formData, bankName: e.target.value })}
                  className="w-full h-8 px-2 border border-walnut/20 bg-offwhite rounded text-xs text-charcoal font-medium focus:border-gold focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-walnut">Account No</label>
                <input
                  type="text"
                  placeholder="0011223344"
                  value={formData.accountNo}
                  onChange={(e) => setFormData({ ...formData, accountNo: e.target.value })}
                  className="w-full h-8 px-2 border border-walnut/20 bg-offwhite rounded text-xs font-mono text-charcoal focus:border-gold focus:outline-none"
                />
              </div>
              <div className="space-y-1">
                <label className="font-bold text-walnut">IFSC Code</label>
                <input
                  type="text"
                  placeholder="ICIC0000001"
                  value={formData.ifscCode}
                  onChange={(e) => setFormData({ ...formData, ifscCode: e.target.value })}
                  className="w-full h-8 px-2 border border-walnut/20 bg-offwhite rounded text-xs font-mono text-charcoal focus:border-gold focus:outline-none"
                />
              </div>
            </div>
          )}

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
              <span>{loading ? "Saving..." : "Save Financial Account"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
