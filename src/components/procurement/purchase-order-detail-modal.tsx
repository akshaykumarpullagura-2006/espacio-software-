"use client";

import React, { useState, useEffect } from "react";
import { ReceiveGoodsModal } from "./receive-goods-modal";

interface PurchaseOrderDetailModalProps {
  isOpen: boolean;
  poId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function PurchaseOrderDetailModal({ isOpen, poId, onClose, onRefresh }: PurchaseOrderDetailModalProps) {
  const [po, setPo] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [isReceiveModalOpen, setIsReceiveModalOpen] = useState(false);

  useEffect(() => {
    if (isOpen && poId) {
      fetchPO();
    }
  }, [isOpen, poId]);

  async function fetchPO() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/purchase-orders/${poId}`);
      if (res.ok) {
        const data = await res.json();
        setPo(data.data);
      }
    } catch (e) {
      console.error("Failed to load PO details", e);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !poId) return null;

  function formatCurrency(val: number) {
    return `₹${(val || 0).toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async function handleApprove() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/purchase-orders/${poId}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        fetchPO();
        onRefresh();
      }
    } catch (e) {
      console.error("Failed to approve PO", e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleSend() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/purchase-orders/${poId}/send`, {
        method: "POST",
      });
      if (res.ok) {
        fetchPO();
        onRefresh();
      }
    } catch (e) {
      console.error("Failed to send PO", e);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-charcoal/50 backdrop-blur-xs">
      <div className="w-full max-w-4xl bg-offwhite shadow-2xl h-full flex flex-col border-l border-walnut/20">
        {/* Top Header */}
        <div className="border-b border-walnut/20 px-6 py-4 flex items-center justify-between bg-[#36302B] text-white">
          <div>
            <div className="flex items-center space-x-2 text-xs text-gold font-mono font-bold">
              <span>{po?.referenceNo}</span>
              <span>•</span>
              <span>REVISION {po?.revision || 1}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-cream">{po?.vendor?.name}</h2>
            <p className="text-xs text-[#A8917D]">
              PO Date: {po?.poDate ? new Date(po.poDate).toLocaleDateString() : ""} | Project: {po?.project?.title || "General Stock"}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {po?.status === "DRAFT" && (
              <button
                onClick={handleApprove}
                disabled={actionLoading}
                className="rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-charcoal hover:bg-gold-hover shadow-gold disabled:opacity-50 cursor-pointer"
              >
                Approve PO
              </button>
            )}

            {po?.status === "APPROVED" && (
              <button
                onClick={handleSend}
                disabled={actionLoading}
                className="rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-charcoal hover:bg-gold-hover shadow-gold disabled:opacity-50 cursor-pointer"
              >
                Send to Supplier
              </button>
            )}

            {(po?.status === "SENT" || po?.status === "ACKNOWLEDGED" || po?.status === "PARTIALLY_RECEIVED") && (
              <button
                onClick={() => setIsReceiveModalOpen(true)}
                className="rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-charcoal hover:bg-gold-hover shadow-gold cursor-pointer"
              >
                + Record Delivery / GRN
              </button>
            )}

            <button onClick={onClose} className="text-walnut hover:text-cream text-lg cursor-pointer">
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-walnut flex-1 flex items-center justify-center">
            Loading Purchase Order details...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Commercial Header Metrics */}
            <div className="grid grid-cols-4 gap-4 rounded-lg border border-walnut/15 bg-cream/50 p-4 text-center">
              <div>
                <div className="text-[11px] font-bold text-walnut uppercase">Grand Total</div>
                <div className="text-lg font-bold font-mono text-charcoal">{formatCurrency(po.grandTotal)}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-walnut uppercase">Payment Terms</div>
                <div className="text-sm font-bold text-charcoal">{po.paymentTermsKey}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-walnut uppercase">Expected Delivery</div>
                <div className="text-sm font-bold text-charcoal">
                  {po.expectedDeliveryDate ? new Date(po.expectedDeliveryDate).toLocaleDateString() : "TBD"}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-walnut uppercase">Status</div>
                <div className="text-sm font-bold text-charcoal">{po.status}</div>
              </div>
            </div>

            {/* Vendor Commercial Snapshot */}
            {po.vendorSnapshot && (
              <div className="rounded-md border border-walnut/15 bg-cream/40 p-3 text-xs space-y-1">
                <span className="font-bold text-walnut uppercase tracking-wider text-[10px]">Vendor Document Snapshot:</span>
                <p className="text-charcoal font-mono">
                  {po.vendor?.name} • GSTIN: {po.vendor?.gstin || "N/A"} • Phone: {po.vendor?.phone}
                </p>
              </div>
            )}

            {/* Line Items Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                PO Material Line Items ({po.items?.length || 0})
              </h4>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-walnut/15 bg-cream/70 text-walnut font-bold uppercase">
                  <tr>
                    <th className="px-3 py-2">Material / Product</th>
                    <th className="px-3 py-2 text-right">Qty</th>
                    <th className="px-3 py-2 text-right">Rate (₹)</th>
                    <th className="px-3 py-2 text-right">GST %</th>
                    <th className="px-3 py-2 text-right">Line Total (₹)</th>
                    <th className="px-3 py-2 text-right">Received</th>
                    <th className="px-3 py-2 text-right">Pending</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-walnut/10 font-medium text-charcoal">
                  {po.items?.map((i: any) => (
                    <tr key={i.id}>
                      <td className="px-3 py-2">
                        <div className="font-bold text-charcoal">{i.materialName}</div>
                        {i.description && <div className="text-[11px] text-walnut">{i.description}</div>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-charcoal">{i.quantity} {i.unitKey}</td>
                      <td className="px-3 py-2 text-right font-mono">{formatCurrency(i.rate)}</td>
                      <td className="px-3 py-2 text-right font-mono">{i.taxRate}%</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-charcoal">{formatCurrency(i.lineTotal)}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-walnut">{i.receivedQuantity}</td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-gold">{i.pendingQuantity}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Financial Summary */}
            <div className="flex justify-end text-xs">
              <div className="w-72 space-y-1.5 border-t border-walnut/15 pt-3">
                <div className="flex justify-between text-walnut">
                  <span>Items Subtotal:</span>
                  <span className="font-mono text-charcoal font-semibold">{formatCurrency(po.subtotal)}</span>
                </div>
                {po.discount > 0 && (
                  <div className="flex justify-between text-walnut">
                    <span>Discount:</span>
                    <span className="font-mono text-semantic-danger">- {formatCurrency(po.discount)}</span>
                  </div>
                )}
                {po.shippingCharges > 0 && (
                  <div className="flex justify-between text-walnut">
                    <span>Shipping &amp; Freight:</span>
                    <span className="font-mono text-charcoal font-semibold">{formatCurrency(po.shippingCharges)}</span>
                  </div>
                )}
                <div className="flex justify-between text-sm font-bold text-charcoal border-t border-walnut/20 pt-1.5">
                  <span>Grand Total:</span>
                  <span className="font-mono text-charcoal font-bold">{formatCurrency(po.grandTotal)}</span>
                </div>
              </div>
            </div>

            {/* Goods Receipts Log */}
            {po.receipts && po.receipts.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                  Goods Receipts / Delivery Log ({po.receipts.length})
                </h4>
                <div className="space-y-2">
                  {po.receipts.map((r: any) => (
                    <div key={r.id} className="p-3 rounded-lg border border-walnut/15 bg-cream/40 text-xs flex justify-between items-center">
                      <div>
                        <span className="font-mono font-bold text-charcoal">{r.referenceNo}</span>
                        <span className="ml-2 text-walnut">
                          Ref: {r.deliveryReference || "N/A"} • Received on {new Date(r.receivedDate).toLocaleDateString()}
                        </span>
                      </div>
                      <span className="rounded bg-gold-soft border border-gold/40 text-charcoal px-2 py-0.5 font-bold text-[10px]">
                        {r.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Receive Goods Modal */}
        <ReceiveGoodsModal
          isOpen={isReceiveModalOpen}
          po={po}
          onClose={() => setIsReceiveModalOpen(false)}
          onSuccess={() => {
            fetchPO();
            onRefresh();
          }}
        />
      </div>
    </div>
  );
}
