"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";

interface PoRevisionModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrderId: string;
  onSuccess?: () => void;
}

export function PoRevisionModal({
  isOpen,
  onClose,
  purchaseOrderId,
  onSuccess,
}: PoRevisionModalProps) {
  const [po, setPo] = useState<any>(null);
  const [revisionReason, setRevisionReason] = useState("");
  const [items, setItems] = useState<
    Array<{ materialName: string; description: string; quantity: number; unitKey: string; rate: number; discount: number; taxRate: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && purchaseOrderId) {
      fetchPo();
    }
  }, [isOpen, purchaseOrderId]);

  const fetchPo = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/procurement/purchase-orders/${purchaseOrderId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load Purchase Order");
      const poData = json.data;
      setPo(poData);
      setItems(
        poData.items.map((i: any) => ({
          materialName: i.materialName,
          description: i.description || "",
          quantity: i.quantity,
          unitKey: i.unitKey,
          rate: i.rate,
          discount: i.discount || 0,
          taxRate: i.taxRate || 0,
        }))
      );
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRevise = async () => {
    if (!revisionReason.trim() || revisionReason.trim().length < 3) {
      setError("Please provide a valid reason for revising this Purchase Order (min 3 chars).");
      return;
    }

    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/procurement/purchase-orders/${purchaseOrderId}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          revisionReason,
          items: items.map((i) => ({
            materialName: i.materialName,
            description: i.description,
            quantity: Number(i.quantity),
            unitKey: i.unitKey,
            rate: Number(i.rate),
            discount: Number(i.discount),
            taxRate: Number(i.taxRate),
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to revise Purchase Order");

      if (onSuccess) onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Create PO Revision — ${po?.referenceNo || "PO"} (Current Rev ${po?.revision || 1})`}
      maxWidth="lg"
    >
      {loading ? (
        <div className="py-8 text-center text-slate-500 text-sm">Loading order data...</div>
      ) : error ? (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded mb-4">{error}</div>
      ) : null}

      {po && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 p-3 rounded-lg text-xs text-amber-800">
            <strong>Controlled Revision Notice:</strong> Modifying quantities or rates will increment the PO version to{" "}
            <strong>Rev {po.revision + 1}</strong> and archive the current version in audit logs.
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Revision Reason / Change Log *
            </label>
            <textarea
              value={revisionReason}
              onChange={(e) => setRevisionReason(e.target.value)}
              rows={2}
              placeholder="e.g. Supplier adjusted rate by 5% as per updated commercial agreement..."
              className="w-full text-xs border border-slate-300 rounded p-2 focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-2">Material</th>
                  <th className="p-2 text-center">Qty</th>
                  <th className="p-2 text-center">Unit</th>
                  <th className="p-2 text-center">Rate (₹)</th>
                  <th className="p-2 text-center">Tax %</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={idx}>
                    <td className="p-2 font-medium">{item.materialName}</td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => {
                          const copy = [...items];
                          copy[idx].quantity = parseFloat(e.target.value) || 0;
                          setItems(copy);
                        }}
                        className="w-16 text-center border border-slate-300 rounded px-1.5 py-0.5 text-xs"
                      />
                    </td>
                    <td className="p-2 text-center text-slate-500">{item.unitKey}</td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={item.rate}
                        onChange={(e) => {
                          const copy = [...items];
                          copy[idx].rate = parseFloat(e.target.value) || 0;
                          setItems(copy);
                        }}
                        className="w-20 text-center border border-slate-300 rounded px-1.5 py-0.5 text-xs"
                      />
                    </td>
                    <td className="p-2 text-center font-mono">{item.taxRate}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleRevise} disabled={submitting}>
              {submitting ? "Saving Revision..." : `Submit Revision (Rev ${po.revision + 1})`}
            </Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
