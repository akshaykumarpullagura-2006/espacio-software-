"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface Vendor360ModalProps {
  isOpen: boolean;
  onClose: () => void;
  vendorId: string;
}

export function Vendor360Modal({ isOpen, onClose, vendorId }: Vendor360ModalProps) {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"overview" | "pos" | "receipts" | "finance" | "materials">("overview");

  useEffect(() => {
    if (isOpen && vendorId) {
      fetchVendor360();
    }
  }, [isOpen, vendorId]);

  const fetchVendor360 = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/procurement/vendors/${vendorId}/360`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load vendor 360 profile");
      setData(json.data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Vendor 360° Profile — ${data?.name || "Loading..."}`} maxWidth="xl">
      {loading ? (
        <div className="py-12 text-center text-slate-500 text-sm">Loading comprehensive vendor intelligence...</div>
      ) : error ? (
        <div className="p-4 bg-rose-50 border border-rose-200 text-rose-700 text-sm rounded-lg">{error}</div>
      ) : data ? (
        <div className="space-y-6">
          {/* Header Summary Banner */}
          <div className="bg-slate-900 text-white rounded-xl p-5 shadow-sm flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-mono font-bold bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded">
                  {data.referenceNo}
                </span>
                <h3 className="text-lg font-bold">{data.name}</h3>
                <Badge variant={data.status === "ACTIVE" ? "success" : data.status === "BLOCKED" ? "danger" : "warning"}>
                  {data.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-400 mt-1">
                Category: <span className="text-white font-medium">{data.categoryKey}</span> | Contact:{" "}
                <span className="text-white font-medium">{data.phone}</span> | Terms:{" "}
                <span className="text-white font-medium">{data.paymentTermsKey}</span>
              </p>
            </div>

            <div className="flex gap-4">
              <div className="text-right">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Total Purchases</span>
                <span className="text-base font-bold tabular-nums text-white">
                  ₹{Number(data.summary?.totalPurchases || 0).toLocaleString("en-IN")}
                </span>
              </div>
              <div className="text-right border-l border-slate-700 pl-4">
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Outstanding Due</span>
                <span className="text-base font-bold tabular-nums text-amber-400">
                  ₹{Number(data.summary?.totalOutstanding || 0).toLocaleString("en-IN")}
                </span>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="flex border-b border-slate-200 gap-2">
            {[
              { id: "overview", label: "Overview & Performance" },
              { id: "pos", label: `Purchase Orders (${data.pos?.length || 0})` },
              { id: "receipts", label: `Goods Receipts (${data.goodsReceipts?.length || 0})` },
              { id: "finance", label: `Payables & Payments (${data.vendorPayables?.length || 0})` },
              { id: "materials", label: `Supplied Materials (${data.materialsSupplied?.length || 0})` },
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
                  activeTab === tab.id
                    ? "border-emerald-600 text-emerald-600"
                    : "border-transparent text-slate-500 hover:text-slate-700"
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Tab 1: Overview */}
          {activeTab === "overview" && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Commercial Profile</h4>
                <div className="text-xs space-y-2 text-slate-600">
                  <div><strong>Legal Name:</strong> {data.legalName || data.name}</div>
                  <div><strong>GSTIN:</strong> {data.gstin || "Unregistered"}</div>
                  <div><strong>Email:</strong> {data.email || "N/A"}</div>
                  <div><strong>Address:</strong> {data.address || "N/A"}, {data.city || ""}, {data.state || ""}</div>
                  <div><strong>Credit Limit:</strong> ₹{Number(data.creditLimit || 0).toLocaleString("en-IN")}</div>
                </div>

                <div className="pt-2 border-t border-slate-100">
                  <h5 className="text-[11px] font-bold text-slate-700 uppercase">Bank Account</h5>
                  <div className="text-xs text-slate-600 mt-1">
                    <div><strong>Bank:</strong> {data.bankDetails?.bankName || data.bankName || "N/A"}</div>
                    <div><strong>Account No:</strong> <span className="font-mono">{data.bankDetails?.bankAccountNo || data.bankAccountNo || "N/A"}</span></div>
                    <div><strong>IFSC Code:</strong> <span className="font-mono">{data.bankDetails?.bankIfsc || data.bankIfsc || "N/A"}</span></div>
                  </div>
                </div>
              </div>

              <div className="border border-slate-200 rounded-lg p-4 bg-white space-y-3">
                <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Performance Intelligence</h4>
                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-slate-50 p-3 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Quality Rating</span>
                    <span className="text-lg font-bold text-slate-900">⭐ {data.metrics?.qualityRating || "4.8"}/5</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">On-Time Delivery</span>
                    <span className="text-lg font-bold text-emerald-600">{data.metrics?.onTimeDeliveryPct || 100}%</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Total Orders</span>
                    <span className="text-lg font-bold text-slate-900">{data.metrics?.ordersCount || 0}</span>
                  </div>
                  <div className="bg-slate-50 p-3 rounded border border-slate-100">
                    <span className="text-[10px] text-slate-500 block">Response SLA</span>
                    <span className="text-xs font-semibold text-slate-700 mt-1 block">{data.metrics?.responseTimeStatus || "Standard"}</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Tab 2: Purchase Orders */}
          {activeTab === "pos" && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">PO Ref</th>
                    <th className="p-2.5">Date</th>
                    <th className="p-2.5">Project</th>
                    <th className="p-2.5">Items</th>
                    <th className="p-2.5 text-right">Grand Total</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.pos?.map((po: any) => (
                    <tr key={po.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-medium text-emerald-600">{po.referenceNo}</td>
                      <td className="p-2.5 text-slate-500">{new Date(po.poDate).toLocaleDateString("en-IN")}</td>
                      <td className="p-2.5 font-medium">{po.project?.title || "Direct Purchase"}</td>
                      <td className="p-2.5 text-slate-500">{po.items?.length || 0} items</td>
                      <td className="p-2.5 text-right font-bold tabular-nums">₹{Number(po.grandTotal).toLocaleString("en-IN")}</td>
                      <td className="p-2.5"><Badge variant={po.status === "APPROVED" ? "success" : "neutral"}>{po.status}</Badge></td>
                    </tr>
                  ))}
                  {(!data.pos || data.pos.length === 0) && (
                    <tr><td colSpan={6} className="p-6 text-center text-slate-400">No purchase orders recorded for this supplier.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 3: Goods Receipts */}
          {activeTab === "receipts" && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">GRN Ref</th>
                    <th className="p-2.5">Received Date</th>
                    <th className="p-2.5">PO Ref</th>
                    <th className="p-2.5">Items Inspected</th>
                    <th className="p-2.5">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.goodsReceipts?.map((grn: any) => (
                    <tr key={grn.id} className="hover:bg-slate-50">
                      <td className="p-2.5 font-mono font-medium text-emerald-600">{grn.referenceNo}</td>
                      <td className="p-2.5 text-slate-500">{new Date(grn.receivedDate).toLocaleDateString("en-IN")}</td>
                      <td className="p-2.5 font-mono">{grn.purchaseOrder?.referenceNo}</td>
                      <td className="p-2.5 text-slate-500">{grn.items?.length || 0} items</td>
                      <td className="p-2.5"><Badge variant="success">{grn.status}</Badge></td>
                    </tr>
                  ))}
                  {(!data.goodsReceipts || data.goodsReceipts.length === 0) && (
                    <tr><td colSpan={5} className="p-6 text-center text-slate-400">No goods receipt deliveries recorded.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Tab 4: Finance (Payables & Payments) */}
          {activeTab === "finance" && (
            <div className="space-y-4">
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <div className="bg-slate-100 px-3 py-2 text-xs font-bold text-slate-700">Vendor Invoices & Payables</div>
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                    <tr>
                      <th className="p-2.5">Payable Ref</th>
                      <th className="p-2.5">Invoice No</th>
                      <th className="p-2.5 text-right">Invoiced Amount</th>
                      <th className="p-2.5 text-right">Paid Amount</th>
                      <th className="p-2.5 text-right">Outstanding</th>
                      <th className="p-2.5">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {data.vendorPayables?.map((pay: any) => (
                      <tr key={pay.id}>
                        <td className="p-2.5 font-mono font-medium text-emerald-600">{pay.referenceNo}</td>
                        <td className="p-2.5 font-mono">{pay.invoiceNo || "N/A"}</td>
                        <td className="p-2.5 text-right font-bold tabular-nums">₹{Number(pay.amount).toLocaleString("en-IN")}</td>
                        <td className="p-2.5 text-right text-emerald-600 tabular-nums">₹{Number(pay.paidAmount).toLocaleString("en-IN")}</td>
                        <td className="p-2.5 text-right text-amber-600 font-bold tabular-nums">₹{Number(pay.outstandingAmount).toLocaleString("en-IN")}</td>
                        <td className="p-2.5"><Badge variant={pay.status === "PAID" ? "success" : "warning"}>{pay.status}</Badge></td>
                      </tr>
                    ))}
                    {(!data.vendorPayables || data.vendorPayables.length === 0) && (
                      <tr><td colSpan={6} className="p-4 text-center text-slate-400">No open or historical payables.</td></tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Tab 5: Materials */}
          {activeTab === "materials" && (
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-50 border-b border-slate-200 text-slate-600 font-semibold">
                  <tr>
                    <th className="p-2.5">Material Name</th>
                    <th className="p-2.5 text-right">Total Ordered</th>
                    <th className="p-2.5 text-right">Total Received</th>
                    <th className="p-2.5">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {data.materialsSupplied?.map((m: any, idx: number) => (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="p-2.5 font-medium text-slate-900">{m.name}</td>
                      <td className="p-2.5 text-right font-semibold tabular-nums">{m.totalOrdered}</td>
                      <td className="p-2.5 text-right text-emerald-600 font-semibold tabular-nums">{m.totalReceived}</td>
                      <td className="p-2.5 text-slate-500">{m.unitKey}</td>
                    </tr>
                  ))}
                  {(!data.materialsSupplied || data.materialsSupplied.length === 0) && (
                    <tr><td colSpan={4} className="p-6 text-center text-slate-400">No material delivery history found.</td></tr>
                  )}
                </tbody>
              </table>
            </div>
          )}

          <div className="flex justify-end pt-4 border-t border-slate-100">
            <Button variant="secondary" onClick={onClose}>Close Profile</Button>
          </div>
        </div>
      ) : null}
    </Modal>
  );
}
