"use client";

import React, { useState, useEffect } from "react";

interface AdvanceOption {
  id: string;
  referenceNo: string;
  amount: number;
  totalSpent: number;
  outstandingBalance: number;
  employee: { fullName: string };
}

interface SettleAdvanceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  preselectedAdvanceId?: string;
}

export function SettleAdvanceModal({
  isOpen,
  onClose,
  onSuccess,
  preselectedAdvanceId,
}: SettleAdvanceModalProps) {
  const [advances, setAdvances] = useState<AdvanceOption[]>([]);
  const [advanceId, setAdvanceId] = useState("");
  const [cashReturned, setCashReturned] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchAdvances();
    }
  }, [isOpen]);

  async function fetchAdvances() {
    try {
      const res = await fetch("/api/v1/petty-cash/advances");
      if (res.ok) {
        const data = await res.json();
        const items = (data.data || []).filter((a: AdvanceOption) => a.outstandingBalance > 0);
        setAdvances(items);

        if (preselectedAdvanceId) {
          setAdvanceId(preselectedAdvanceId);
        } else if (items.length > 0) {
          setAdvanceId(items[0].id);
        }
      }
    } catch (e) {
      console.error("Failed to load advances", e);
    }
  }

  const selectedAdvance = advances.find((a) => a.id === advanceId);

  if (!isOpen) return null;

  const totalAdvance = selectedAdvance?.amount || 0;
  const totalSpent = selectedAdvance?.totalSpent || 0;
  const parsedCashReturned = parseFloat(cashReturned) || 0;
  const settlementDifference = Math.round((totalAdvance - totalSpent - parsedCashReturned) * 100) / 100;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (parsedCashReturned < 0) {
        setError("Cash returned cannot be a negative amount.");
        setLoading(false);
        return;
      }

      const res = await fetch("/api/v1/petty-cash/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          advanceId,
          cashReturned: parsedCashReturned,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to record advance settlement");
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
            <h2 className="text-base font-bold text-charcoal">Settle Employee Advance</h2>
            <p className="text-xs text-walnut">Reconcile spent vouchers and return remaining float</p>
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
              Select Advance *
            </label>
            <select
              value={advanceId}
              onChange={(e) => setAdvanceId(e.target.value)}
              className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
              required
            >
              {advances.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.referenceNo} — {a.employee.fullName} (Issued: ₹
                  {a.amount.toLocaleString()})
                </option>
              ))}
            </select>
          </div>

          {selectedAdvance && (
            <div className="rounded-lg border border-walnut/15 bg-cream/50 p-4 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-walnut font-medium">Total Advance Issued:</span>
                <span className="font-mono font-bold text-charcoal">
                  ₹{totalAdvance.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-walnut font-medium">Total Valid Petty Expenses:</span>
                <span className="font-mono font-bold text-charcoal">
                  ₹{totalSpent.toLocaleString("en-IN")}
                </span>
              </div>
              <div className="flex justify-between border-t border-walnut/15 pt-2 font-bold">
                <span className="text-charcoal">Expected Settlement Return:</span>
                <span className="font-mono text-charcoal font-bold">
                  ₹{(totalAdvance - totalSpent).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
              Cash Returned by Employee (₹) *
            </label>
            <input
              type="number"
              step="0.01"
              placeholder="e.g. 1750"
              value={cashReturned}
              onChange={(e) => setCashReturned(e.target.value)}
              className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs font-mono text-charcoal focus:border-gold focus:outline-none font-bold"
              required
            />
          </div>

          {selectedAdvance && (
            <div
              className={`rounded-lg p-3 text-xs border ${
                settlementDifference === 0
                  ? "border-semantic-success-border bg-semantic-success-bg text-semantic-success"
                  : "border-semantic-warning-border bg-semantic-warning-bg text-semantic-warning"
              }`}
            >
              <div className="flex justify-between items-center font-bold">
                <span>Settlement Status Preview:</span>
                <span className="font-mono">
                  {settlementDifference === 0 ? "SETTLED (Reconciled)" : `DISCREPANCY (₹${settlementDifference.toLocaleString()})`}
                </span>
              </div>
              {settlementDifference !== 0 && (
                <p className="mt-1 text-[11px] opacity-90 font-medium">
                  ⚠️ Advance amount does not match spent + returned cash. Will record as DISCREPANCY for review.
                </p>
              )}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
              Reconciliation Notes
            </label>
            <textarea
              rows={2}
              placeholder="Notes on returned cash, vouchers, or discrepancy explanation..."
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
              {loading ? "Settling..." : "Finalize Settlement"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
