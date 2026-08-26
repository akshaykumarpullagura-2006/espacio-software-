"use client";

import React, { useState, useEffect } from "react";

interface ReceiveGoodsModalProps {
  isOpen: boolean;
  po: any;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemRow {
  purchaseOrderItemId: string;
  materialName: string;
  orderedQuantity: number;
  previouslyReceived: number;
  pendingQuantity: number;
  receivedQuantity: string;
  acceptedQuantity: string;
  rejectedQuantity: string;
  damagedQuantity: string;
  shortQuantity: string;
  rejectionReason: string;
}

export function ReceiveGoodsModal({ isOpen, po, onClose, onSuccess }: ReceiveGoodsModalProps) {
  const [deliveryReference, setDeliveryReference] = useState("");
  const [receivedDate, setReceivedDate] = useState(new Date().toISOString().split("T")[0]);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<ItemRow[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && po) {
      const initialItems = (po.items || []).map((item: any) => {
        const pending = Math.max(0, item.quantity - (item.receivedQuantity || 0));
        return {
          purchaseOrderItemId: item.id,
          materialName: item.materialName,
          orderedQuantity: item.quantity,
          previouslyReceived: item.receivedQuantity || 0,
          pendingQuantity: pending,
          receivedQuantity: String(pending),
          acceptedQuantity: String(pending),
          rejectedQuantity: "0",
          damagedQuantity: "0",
          shortQuantity: "0",
          rejectionReason: "",
        };
      });
      setItems(initialItems);
    }
  }, [isOpen, po]);

  if (!isOpen || !po) return null;

  function handleItemChange(index: number, field: keyof ItemRow, value: string) {
    const next = [...items];
    const item = { ...next[index], [field]: value };

    // Auto update accepted = received - rejected - damaged
    if (field === "receivedQuantity" || field === "rejectedQuantity" || field === "damagedQuantity") {
      const r = parseFloat(field === "receivedQuantity" ? value : item.receivedQuantity) || 0;
      const rej = parseFloat(field === "rejectedQuantity" ? value : item.rejectedQuantity) || 0;
      const dam = parseFloat(field === "damagedQuantity" ? value : item.damagedQuantity) || 0;
      item.acceptedQuantity = String(Math.max(0, r - rej - dam));
    }

    next[index] = item;
    setItems(next);
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payloadItems = items.map((i) => {
        const rQty = parseFloat(i.receivedQuantity);
        const aQty = parseFloat(i.acceptedQuantity);
        if (isNaN(rQty) || rQty < 0) throw new Error(`Invalid received quantity for ${i.materialName}`);
        if (isNaN(aQty) || aQty < 0) throw new Error(`Invalid accepted quantity for ${i.materialName}`);

        return {
          purchaseOrderItemId: i.purchaseOrderItemId,
          receivedQuantity: rQty,
          acceptedQuantity: aQty,
          rejectedQuantity: parseFloat(i.rejectedQuantity) || 0,
          damagedQuantity: parseFloat(i.damagedQuantity) || 0,
          shortQuantity: parseFloat(i.shortQuantity) || 0,
          rejectionReason: i.rejectionReason ? i.rejectionReason.trim() : undefined,
        };
      });

      const res = await fetch("/api/v1/procurement/receipts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId: po.id,
          deliveryReference: deliveryReference || undefined,
          receivedDate,
          notes: notes || undefined,
          items: payloadItems,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to record goods receipt");
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
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-offwhite border border-walnut/20 shadow-modal">
        <div className="flex items-center justify-between border-b border-walnut/15 px-6 py-4 sticky top-0 bg-cream/90 backdrop-blur-md z-10">
          <div>
            <h2 className="text-base font-bold text-charcoal">Record Delivery / Goods Receipt Note (GRN)</h2>
            <p className="text-xs text-walnut">
              PO: <span className="font-mono font-bold text-charcoal">{po.referenceNo}</span> • Supplier: {po.vendor?.name}
            </p>
          </div>
          <button onClick={onClose} className="text-walnut hover:text-charcoal cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-md border border-semantic-danger-border bg-semantic-danger-bg p-3 text-xs font-semibold text-semantic-danger">
              {error}
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Delivery Challan / Invoice Reference
              </label>
              <input
                type="text"
                placeholder="e.g. DC-998821 / LR-112"
                value={deliveryReference}
                onChange={(e) => setDeliveryReference(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal focus:border-gold focus:outline-none font-mono"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Receipt Date *
              </label>
              <input
                type="date"
                value={receivedDate}
                onChange={(e) => setReceivedDate(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
                required
              />
            </div>
          </div>

          {/* Line Item Receipt Inspection Table */}
          <div className="space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal border-b border-walnut/15 pb-1">
              Material Inspection &amp; Quantity Breakdown
            </h3>

            <div className="space-y-4">
              {items.map((item, idx) => (
                <div key={idx} className="p-4 rounded-lg border border-walnut/15 bg-cream/40 space-y-3 text-xs">
                  <div className="flex justify-between items-center font-bold text-charcoal border-b border-walnut/10 pb-1">
                    <span>{item.materialName}</span>
                    <span className="font-mono text-walnut text-[11px]">
                      Ordered: {item.orderedQuantity} | Received: {item.previouslyReceived} | Pending: {item.pendingQuantity}
                    </span>
                  </div>

                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-walnut uppercase">Received Qty</label>
                      <input
                        type="number"
                        value={item.receivedQuantity}
                        onChange={(e) => handleItemChange(idx, "receivedQuantity", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 font-mono text-charcoal focus:border-gold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-charcoal uppercase">Accepted Qty</label>
                      <input
                        type="number"
                        value={item.acceptedQuantity}
                        onChange={(e) => handleItemChange(idx, "acceptedQuantity", e.target.value)}
                        className="w-full rounded-md border border-gold/40 bg-gold-soft p-2 font-mono text-charcoal font-bold"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-semantic-warning uppercase">Damaged Qty</label>
                      <input
                        type="number"
                        value={item.damagedQuantity}
                        onChange={(e) => handleItemChange(idx, "damagedQuantity", e.target.value)}
                        className="w-full rounded-md border border-semantic-warning-border bg-semantic-warning-bg p-2 font-mono text-semantic-warning"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-semantic-danger uppercase">Rejected Qty</label>
                      <input
                        type="number"
                        value={item.rejectedQuantity}
                        onChange={(e) => handleItemChange(idx, "rejectedQuantity", e.target.value)}
                        className="w-full rounded-md border border-semantic-danger-border bg-semantic-danger-bg p-2 font-mono text-semantic-danger"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-walnut uppercase">Short Qty</label>
                      <input
                        type="number"
                        value={item.shortQuantity}
                        onChange={(e) => handleItemChange(idx, "shortQuantity", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 font-mono text-charcoal"
                      />
                    </div>
                  </div>

                  {(parseFloat(item.rejectedQuantity) > 0 || parseFloat(item.damagedQuantity) > 0) && (
                    <div>
                      <input
                        type="text"
                        placeholder="Reason for rejection or damage details..."
                        value={item.rejectionReason}
                        onChange={(e) => handleItemChange(idx, "rejectionReason", e.target.value)}
                        className="w-full rounded-md border border-semantic-danger-border bg-semantic-danger-bg/50 p-2 text-charcoal"
                      />
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
              Goods Receipt Inspection Notes
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Unloaded at site, inspected by Site Engineer Raju..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2 text-xs text-charcoal focus:border-gold focus:outline-none"
            />
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-walnut/15 sticky bottom-0 bg-offwhite py-2">
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
              {loading ? "Recording..." : "Save Goods Receipt Note"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
