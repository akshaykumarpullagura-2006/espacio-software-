"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface ThreeWayMatchModalProps {
  isOpen: boolean;
  onClose: () => void;
  purchaseOrderId?: string;
  onSuccess?: () => void;
}

export function ThreeWayMatchModal({
  isOpen,
  onClose,
  purchaseOrderId,
  onSuccess,
}: ThreeWayMatchModalProps) {
  const [po, setPo] = useState<any>(null);
  const [invoiceNo, setInvoiceNo] = useState("");
  const [invoicedTotal, setInvoicedTotal] = useState<number>(0);
  const [items, setItems] = useState<
    Array<{ purchaseOrderItemId: string; materialName: string; invoicedQuantity: number; invoicedRate: number; poRate: number; acceptedQty: number }>
  >([]);
  const [loading, setLoading] = useState(false);
  const [matchResult, setMatchResult] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen && purchaseOrderId) {
      fetchPoDetails();
    }
  }, [isOpen, purchaseOrderId]);

  const fetchPoDetails = async () => {
    setLoading(true);
    setError(null);
    setMatchResult(null);
    try {
      const res = await fetch(`/api/v1/procurement/purchase-orders/${purchaseOrderId}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load Purchase Order");
      const poData = json.data;
      setPo(poData);

      // Prepopulate items
      const initialItems = poData.items.map((item: any) => {
        let totalAccepted = 0;
        for (const receipt of poData.receipts || []) {
          for (const rItem of receipt.items || []) {
            if (rItem.purchaseOrderItemId === item.id) {
              totalAccepted += rItem.acceptedQuantity;
            }
          }
        }
        return {
          purchaseOrderItemId: item.id,
          materialName: item.materialName,
          invoicedQuantity: totalAccepted > 0 ? totalAccepted : item.quantity,
          invoicedRate: item.rate,
          poRate: item.rate,
          acceptedQty: totalAccepted,
        };
      });

      setItems(initialItems);
      const total = initialItems.reduce((acc: number, i: any) => acc + i.invoicedQuantity * i.invoicedRate, 0);
      setInvoicedTotal(total);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleRunMatch = async () => {
    if (!invoiceNo.trim()) {
      setError("Vendor invoice reference number is required.");
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/v1/procurement/three-way-match", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          purchaseOrderId,
          vendorInvoiceNo: invoiceNo,
          invoicedTotal: Number(invoicedTotal),
          createPayableOnSuccess: true,
          items: items.map((i) => ({
            purchaseOrderItemId: i.purchaseOrderItemId,
            invoicedQuantity: Number(i.invoicedQuantity),
            invoicedRate: Number(i.invoicedRate),
          })),
        }),
      });

      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Three-way match failed");
      setMatchResult(json.data);
      if (onSuccess) onSuccess();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`3-Way Match Verification — ${po?.referenceNo || "PO"}`}
      maxWidth="lg"
    >
      {loading && !po ? (
        <div className="py-8 text-center text-slate-500 text-sm">Loading procurement documents...</div>
      ) : error ? (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-700 text-xs rounded mb-4">{error}</div>
      ) : null}

      {po && !matchResult && (
        <div className="space-y-4">
          <div className="bg-slate-50 p-3 rounded-lg border border-slate-200 text-xs flex justify-between">
            <div>
              <span className="font-semibold text-slate-700">Vendor:</span> {po.vendor?.name}
            </div>
            <div>
              <span className="font-semibold text-slate-700">PO Grand Total:</span> ₹
              {Number(po.grandTotal).toLocaleString("en-IN")}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Vendor Invoice Number *</label>
              <input
                type="text"
                value={invoiceNo}
                onChange={(e) => setInvoiceNo(e.target.value)}
                placeholder="e.g. INV-2026-981"
                className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Total Invoiced Amount (₹) *</label>
              <input
                type="number"
                value={invoicedTotal}
                onChange={(e) => setInvoicedTotal(parseFloat(e.target.value) || 0)}
                className="w-full text-xs border border-slate-300 rounded px-2.5 py-1.5 focus:outline-none focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                <tr>
                  <th className="p-2">Material</th>
                  <th className="p-2 text-center">GRN Accepted</th>
                  <th className="p-2 text-center">Invoiced Qty</th>
                  <th className="p-2 text-center">PO Rate (₹)</th>
                  <th className="p-2 text-center">Invoiced Rate (₹)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((item, idx) => (
                  <tr key={item.purchaseOrderItemId}>
                    <td className="p-2 font-medium">{item.materialName}</td>
                    <td className="p-2 text-center font-mono font-semibold text-emerald-600">
                      {item.acceptedQty}
                    </td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={item.invoicedQuantity}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const copy = [...items];
                          copy[idx].invoicedQuantity = val;
                          setItems(copy);
                        }}
                        className="w-20 text-center border border-slate-300 rounded px-1.5 py-0.5 text-xs"
                      />
                    </td>
                    <td className="p-2 text-center font-mono">{item.poRate}</td>
                    <td className="p-2 text-center">
                      <input
                        type="number"
                        value={item.invoicedRate}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          const copy = [...items];
                          copy[idx].invoicedRate = val;
                          setItems(copy);
                        }}
                        className="w-20 text-center border border-slate-300 rounded px-1.5 py-0.5 text-xs"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="secondary" onClick={onClose}>Cancel</Button>
            <Button variant="primary" onClick={handleRunMatch} disabled={loading}>
              {loading ? "Matching..." : "Execute 3-Way Match & Create Payable"}
            </Button>
          </div>
        </div>
      )}

      {matchResult && (
        <div className="space-y-4">
          <div
            className={`p-4 rounded-xl border flex items-center justify-between ${
              matchResult.matchStatus === "MATCHED"
                ? "bg-emerald-50 border-emerald-200 text-emerald-800"
                : "bg-amber-50 border-amber-200 text-amber-800"
            }`}
          >
            <div>
              <div className="text-sm font-bold">
                {matchResult.matchStatus === "MATCHED" ? "3-Way Match Verified" : "Variance Detected"}
              </div>
              <div className="text-xs mt-0.5">
                Vendor Invoice: <span className="font-mono font-bold">{matchResult.vendorInvoiceNo}</span> | Payable:{" "}
                <span className="font-mono font-bold">{matchResult.payableReferenceNo || "Generated"}</span>
              </div>
            </div>
            <Badge variant={matchResult.matchStatus === "MATCHED" ? "success" : "warning"}>
              {matchResult.matchStatus}
            </Badge>
          </div>

          {matchResult.discrepancies?.length > 0 && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs space-y-1 text-rose-700">
              <div className="font-bold">Detected Discrepancies:</div>
              {matchResult.discrepancies.map((d: string, i: number) => (
                <div key={i}>• {d}</div>
              ))}
            </div>
          )}

          <div className="border border-slate-200 rounded-lg overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-50 border-b border-slate-200 font-semibold text-slate-600">
                <tr>
                  <th className="p-2">Material</th>
                  <th className="p-2 text-right">Invoiced Qty</th>
                  <th className="p-2 text-right">Accepted Qty</th>
                  <th className="p-2 text-right">Qty Var</th>
                  <th className="p-2 text-right">Price Var (₹)</th>
                  <th className="p-2">Match Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {matchResult.items?.map((item: any) => (
                  <tr key={item.purchaseOrderItemId}>
                    <td className="p-2 font-medium">{item.materialName}</td>
                    <td className="p-2 text-right tabular-nums">{item.invoicedQuantity}</td>
                    <td className="p-2 text-right tabular-nums text-emerald-600">{item.acceptedQuantity}</td>
                    <td className={`p-2 text-right font-mono ${item.quantityVariance > 0 ? "text-rose-600 font-bold" : "text-slate-500"}`}>
                      {item.quantityVariance}
                    </td>
                    <td className={`p-2 text-right font-mono ${item.priceVariance > 0 ? "text-rose-600 font-bold" : "text-slate-500"}`}>
                      ₹{item.priceVariance}
                    </td>
                    <td className="p-2">
                      <Badge variant={item.itemStatus === "MATCHED" ? "success" : "danger"}>
                        {item.itemStatus}
                      </Badge>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="flex justify-end pt-3 border-t border-slate-100">
            <Button variant="primary" onClick={onClose}>Done</Button>
          </div>
        </div>
      )}
    </Modal>
  );
}
