"use client";

import React, { useState } from "react";

interface LogRatingModalProps {
  isOpen: boolean;
  vendorId: string;
  vendorName: string;
  onClose: () => void;
  onSuccess: () => void;
}

export function LogRatingModal({
  isOpen,
  vendorId,
  vendorName,
  onClose,
  onSuccess,
}: LogRatingModalProps) {
  const [qualityRating, setQualityRating] = useState("5.0");
  const [deliveryRating, setDeliveryRating] = useState("4.5");
  const [purchaseOrderRef, setPurchaseOrderRef] = useState("");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const qVal = parseFloat(qualityRating);
      const dVal = parseFloat(deliveryRating);

      if (isNaN(qVal) || qVal < 1 || qVal > 5) {
        setError("Quality rating must be between 1.0 and 5.0");
        setLoading(false);
        return;
      }

      const res = await fetch(`/api/v1/procurement/vendors/${vendorId}/ratings`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          qualityRating: qVal,
          deliveryRating: isNaN(dVal) ? undefined : dVal,
          purchaseOrderRef: purchaseOrderRef || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to log vendor rating");
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
      <div className="w-full max-w-md rounded-xl bg-offwhite border border-walnut/20 shadow-modal overflow-hidden">
        <div className="flex items-center justify-between border-b border-walnut/15 bg-cream/70 px-6 py-4">
          <div>
            <h2 className="text-base font-bold text-charcoal">Log Supplier Evaluation</h2>
            <p className="text-xs text-walnut font-medium">{vendorName}</p>
          </div>
          <button onClick={onClose} className="text-walnut hover:text-charcoal cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="rounded-md border border-semantic-danger-border bg-semantic-danger-bg p-3 text-xs font-semibold text-semantic-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Quality Rating (1-5) *
              </label>
              <select
                value={qualityRating}
                onChange={(e) => setQualityRating(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
                required
              >
                <option value="5.0">5.0 ★★★★★ (Excellent)</option>
                <option value="4.5">4.5 ★★★★☆ (Very Good)</option>
                <option value="4.0">4.0 ★★★★☆ (Good)</option>
                <option value="3.5">3.5 ★★★☆☆ (Average)</option>
                <option value="3.0">3.0 ★★★☆☆ (Acceptable)</option>
                <option value="2.0">2.0 ★★☆☆☆ (Poor)</option>
                <option value="1.0">1.0 ★☆☆☆☆ (Defective)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Delivery Rating (1-5)
              </label>
              <select
                value={deliveryRating}
                onChange={(e) => setDeliveryRating(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                <option value="5.0">5.0 (On Time)</option>
                <option value="4.5">4.5 (Minor Delay)</option>
                <option value="4.0">4.0 (1-2 Days Delay)</option>
                <option value="3.0">3.0 (Delayed)</option>
                <option value="1.0">1.0 (Severely Delayed)</option>
              </select>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
              PO / Delivery Reference
            </label>
            <input
              type="text"
              placeholder="e.g. PO-2026-0012"
              value={purchaseOrderRef}
              onChange={(e) => setPurchaseOrderRef(e.target.value)}
              className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs font-mono text-charcoal focus:border-gold focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
              Evaluation Notes &amp; Inspection Comments
            </label>
            <textarea
              rows={3}
              placeholder="Detailed feedback on material quality, finish, or delivery promptness..."
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
              {loading ? "Submitting..." : "Submit Rating Log"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
