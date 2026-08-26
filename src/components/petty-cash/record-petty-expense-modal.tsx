"use client";

import React, { useState, useEffect } from "react";

interface AdvanceOption {
  id: string;
  referenceNo: string;
  amount: number;
  outstandingBalance: number;
  employee: { fullName: string };
  project?: { title: string } | null;
}

interface ConfigItem {
  key: string;
  name: string;
}

interface RecordPettyExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedAdvanceId?: string;
}

export function RecordPettyExpenseModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedAdvanceId,
}: RecordPettyExpenseModalProps) {
  const [advances, setAdvances] = useState<AdvanceOption[]>([]);
  const [categories, setCategories] = useState<ConfigItem[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<ConfigItem[]>([]);
  const [advanceId, setAdvanceId] = useState("");
  const [amount, setAmount] = useState("");
  const [purpose, setPurpose] = useState("");
  const [categoryKey, setCategoryKey] = useState("SITE_REFRESHMENTS");
  const [paymentMethod, setPaymentMethod] = useState("CASH");
  const [referenceNoExternal, setReferenceNoExternal] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchMasterData();
    }
  }, [isOpen]);

  async function fetchMasterData() {
    try {
      const [advRes, catRes, pmRes] = await Promise.all([
        fetch("/api/v1/petty-cash/advances?status=ISSUED"),
        fetch("/api/v1/config/petty-cash"),
        fetch("/api/v1/config/crm"),
      ]);

      if (advRes.ok) {
        const data = await advRes.json();
        const items = data.data || [];
        setAdvances(items);

        if (preselectedAdvanceId) {
          setAdvanceId(preselectedAdvanceId);
        } else if (items.length > 0) {
          setAdvanceId(items[0].id);
        }
      }

      if (catRes.ok) {
        const data = await catRes.json();
        setCategories(data.data || []);
        if (data.data && data.data.length > 0) {
          setCategoryKey(data.data[0].key);
        }
      }

      if (pmRes.ok) {
        const data = await pmRes.json();
        if (data.data?.paymentMethods) {
          setPaymentMethods(data.data.paymentMethods);
        }
      }
    } catch (e) {
      console.error("Failed to load petty cash master data", e);
    }
  }

  const selectedAdvance = advances.find((a) => a.id === advanceId);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        throw new Error("Please enter a valid expense amount.");
      }

      if (selectedAdvance && parsedAmount > selectedAdvance.outstandingBalance) {
        throw new Error(
          `Amount (₹${parsedAmount}) exceeds available advance float balance (₹${selectedAdvance.outstandingBalance}).`
        );
      }

      const res = await fetch("/api/v1/petty-cash/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advanceId,
          amount: parsedAmount,
          purpose,
          categoryKey,
          paymentMethod,
          referenceNoExternal: referenceNoExternal || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to record petty cash expense.");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-lg rounded-xl bg-offwhite border border-walnut/20 shadow-modal overflow-hidden">
        <div className="flex items-center justify-between border-b border-walnut/15 px-6 py-4 bg-cream/70">
          <div>
            <h2 className="text-base font-bold text-charcoal">Record Petty Expense</h2>
            <p className="text-xs text-walnut">Logged against an active site or employee advance float</p>
          </div>
          <button
            onClick={onClose}
            className="text-walnut hover:text-charcoal cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md border border-semantic-danger-border bg-semantic-danger-bg p-3 text-xs font-semibold text-semantic-danger">
              {error}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
              Select Advance Float *
            </label>
            <select
              value={advanceId}
              onChange={(e) => setAdvanceId(e.target.value)}
              className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
              required
            >
              {advances.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.referenceNo} — {a.employee.fullName} (Bal: ₹
                  {a.outstandingBalance?.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {selectedAdvance && (
            <div className="rounded-lg border border-walnut/15 bg-cream/50 p-3 flex justify-between items-center text-xs">
              <span className="text-walnut font-medium">Available Advance Balance:</span>
              <span className="text-sm font-bold font-mono text-charcoal">
                ₹{selectedAdvance.outstandingBalance.toLocaleString("en-IN")}
              </span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Spend Amount (₹) *
              </label>
              <input
                type="number"
                step="0.01"
                placeholder="e.g. 450"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs font-mono text-charcoal focus:border-gold focus:outline-none"
                required
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Payment Mode *
              </label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
                required
              >
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((pm) => (
                    <option key={pm.key} value={pm.key}>
                      {pm.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="CASH">Cash</option>
                    <option value="UPI">UPI</option>
                    <option value="CARD">Card</option>
                  </>
                )}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Petty Category *
              </label>
              <select
                value={categoryKey}
                onChange={(e) => setCategoryKey(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
                required
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Voucher / Receipt Ref
              </label>
              <input
                type="text"
                placeholder="e.g. VOUCHER-01"
                value={referenceNoExternal}
                onChange={(e) => setReferenceNoExternal(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs font-mono text-charcoal focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
              Spend Purpose *
            </label>
            <input
              type="text"
              placeholder="e.g. Site team refreshments and tea voucher"
              value={purpose}
              onChange={(e) => setPurpose(e.target.value)}
              className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal focus:border-gold focus:outline-none"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
              Notes
            </label>
            <textarea
              rows={2}
              placeholder="Additional itemized receipt details..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal focus:border-gold focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-walnut/15">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-walnut/20 px-4 py-2 text-xs font-bold text-walnut hover:bg-cream cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-gold px-4 py-2 text-xs font-bold text-charcoal hover:bg-gold-hover shadow-gold disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Recording..." : "Record Petty Expense"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
