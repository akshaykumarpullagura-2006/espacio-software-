"use client";

import React, { useState, useEffect } from "react";
import { LogRatingModal } from "./log-rating-modal";

interface VendorDetailProps {
  isOpen: boolean;
  vendorId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function VendorDetailModal({ isOpen, vendorId, onClose, onRefresh }: VendorDetailProps) {
  const [vendor, setVendor] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"overview" | "contacts" | "ratings" | "pos" | "expenses">("overview");

  // Rating modal state
  const [isRatingModalOpen, setIsRatingModalOpen] = useState(false);
  const [isBlockModalOpen, setIsBlockModalOpen] = useState(false);
  const [blockReason, setBlockReason] = useState("");
  const [blocking, setBlocking] = useState(false);

  useEffect(() => {
    if (isOpen && vendorId) {
      fetchVendor();
    }
  }, [isOpen, vendorId]);

  async function fetchVendor() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/vendors/${vendorId}`);
      if (res.ok) {
        const data = await res.json();
        setVendor(data.data);
      }
    } catch (e) {
      console.error("Failed to load vendor details", e);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !vendorId) return null;

  function formatCurrency(val: number) {
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  async function handleBlockVendor(e: React.FormEvent) {
    e.preventDefault();
    setBlocking(true);
    try {
      const res = await fetch(`/api/v1/procurement/vendors/${vendorId}/block`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: blockReason }),
      });

      if (res.ok) {
        setIsBlockModalOpen(false);
        fetchVendor();
        onRefresh();
      }
    } catch (e) {
      console.error("Failed to block vendor", e);
    } finally {
      setBlocking(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-charcoal/50 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-offwhite shadow-2xl h-full flex flex-col border-l border-walnut/20">
        {/* Top Header */}
        <div className="border-b border-walnut/20 px-6 py-4 flex items-center justify-between bg-[#36302B] text-white">
          <div>
            <div className="flex items-center space-x-2 text-xs text-gold font-mono font-bold">
              <span>{vendor?.referenceNo}</span>
              <span>•</span>
              <span className="uppercase">{vendor?.categoryKey}</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-cream">{vendor?.name}</h2>
            {vendor?.legalName && (
              <p className="text-xs text-[#A8917D]">{vendor.legalName}</p>
            )}
          </div>
          <div className="flex items-center space-x-3">
            {vendor?.status === "ACTIVE" && (
              <button
                onClick={() => setIsBlockModalOpen(true)}
                className="rounded border border-semantic-danger-border bg-semantic-danger-bg px-3 py-1.5 text-xs font-bold text-semantic-danger hover:bg-semantic-danger-bg/80 cursor-pointer"
              >
                Block Vendor
              </button>
            )}
            <button onClick={onClose} className="text-walnut hover:text-cream text-lg cursor-pointer">
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-walnut flex-1 flex items-center justify-center">
            Loading supplier profile...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Performance Summary Bar */}
            <div className="grid grid-cols-4 gap-4 rounded-lg border border-walnut/15 bg-cream/50 p-4 text-center">
              <div>
                <div className="text-[11px] font-bold text-walnut uppercase">Total Purchases</div>
                <div className="text-lg font-bold font-mono text-charcoal">
                  {formatCurrency(vendor.metrics?.totalPurchases || 0)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-walnut uppercase">Outstanding Payables</div>
                <div className="text-lg font-bold font-mono text-semantic-warning">
                  {formatCurrency(vendor.metrics?.totalOutstanding || 0)}
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-walnut uppercase">Quality Rating</div>
                <div className="text-lg font-bold text-charcoal flex items-center justify-center space-x-1">
                  <span className="text-gold">★</span>
                  <span>{vendor.metrics?.qualityRating || 4.5}</span>
                  <span className="text-xs text-walnut">/ 5.0</span>
                </div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-walnut uppercase">On-Time Delivery</div>
                <div className="text-lg font-bold text-charcoal">
                  {vendor.metrics?.onTimeDeliveryPct || 92}%
                </div>
              </div>
            </div>

            {/* Tabs */}
            <div className="flex border-b border-walnut/15 space-x-6 text-xs font-bold">
              <button
                onClick={() => setActiveTab("overview")}
                className={`pb-2 border-b-2 transition cursor-pointer ${
                  activeTab === "overview"
                    ? "border-gold text-charcoal font-bold"
                    : "border-transparent text-walnut hover:text-charcoal"
                }`}
              >
                Overview &amp; Tax
              </button>
              <button
                onClick={() => setActiveTab("contacts")}
                className={`pb-2 border-b-2 transition cursor-pointer ${
                  activeTab === "contacts"
                    ? "border-gold text-charcoal font-bold"
                    : "border-transparent text-walnut hover:text-charcoal"
                }`}
              >
                Contacts ({vendor.contacts?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("ratings")}
                className={`pb-2 border-b-2 transition cursor-pointer ${
                  activeTab === "ratings"
                    ? "border-gold text-charcoal font-bold"
                    : "border-transparent text-walnut hover:text-charcoal"
                }`}
              >
                Quality Ratings ({vendor.ratings?.length || 0})
              </button>
              <button
                onClick={() => setActiveTab("expenses")}
                className={`pb-2 border-b-2 transition cursor-pointer ${
                  activeTab === "expenses"
                    ? "border-gold text-charcoal font-bold"
                    : "border-transparent text-walnut hover:text-charcoal"
                }`}
              >
                Vendor Expenses ({vendor.expenses?.length || 0})
              </button>
            </div>

            {/* Tab Contents */}
            {activeTab === "overview" && (
              <div className="space-y-6 text-xs">
                <div className="grid grid-cols-2 gap-6 border-b border-walnut/15 pb-6">
                  <div>
                    <h4 className="font-bold text-charcoal uppercase tracking-wider mb-2">Commercial &amp; Tax Info</h4>
                    <div className="space-y-1.5 text-charcoal">
                      <div><span className="text-walnut font-semibold">GSTIN:</span> <span className="font-mono font-bold text-charcoal">{vendor.gstin || "Not Registered"}</span></div>
                      <div><span className="text-walnut font-semibold">PAN:</span> <span className="font-mono">{vendor.pan || "N/A"}</span></div>
                      <div><span className="text-walnut font-semibold">Payment Terms:</span> <span className="font-bold text-charcoal">{vendor.paymentTermsKey}</span></div>
                      <div><span className="text-walnut font-semibold">Credit Limit:</span> <span className="font-mono font-bold">{formatCurrency(vendor.creditLimit || 0)}</span></div>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-bold text-charcoal uppercase tracking-wider mb-2">Bank Details (Confidential)</h4>
                    <div className="space-y-1.5 text-charcoal">
                      <div><span className="text-walnut font-semibold">Bank Name:</span> <span>{vendor.bankName || "N/A"}</span></div>
                      <div><span className="text-walnut font-semibold">Account No:</span> <span className="font-mono">{vendor.bankAccountNo || "N/A"}</span></div>
                      <div><span className="text-walnut font-semibold">IFSC Code:</span> <span className="font-mono uppercase">{vendor.bankIfsc || "N/A"}</span></div>
                    </div>
                  </div>
                </div>

                <div>
                  <h4 className="font-bold text-charcoal uppercase tracking-wider mb-2">Address &amp; Location</h4>
                  <p className="text-charcoal">
                    {vendor.address || "No street address recorded."}
                    {vendor.city && `, ${vendor.city}`}
                    {vendor.state && `, ${vendor.state}`}
                    {vendor.postalCode && ` - ${vendor.postalCode}`}
                  </p>
                </div>
              </div>
            )}

            {activeTab === "contacts" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">Vendor Key Personnel</h4>
                </div>
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-walnut/15 bg-cream/70 text-walnut font-bold uppercase">
                    <tr>
                      <th className="px-3 py-2">Name</th>
                      <th className="px-3 py-2">Role / Designation</th>
                      <th className="px-3 py-2">Phone</th>
                      <th className="px-3 py-2">Email</th>
                      <th className="px-3 py-2">Primary</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-walnut/10 font-medium text-charcoal">
                    {vendor.contacts?.map((c: any) => (
                      <tr key={c.id}>
                        <td className="px-3 py-2 font-bold text-charcoal">{c.name}</td>
                        <td className="px-3 py-2 text-walnut">{c.designation || "Contact"}</td>
                        <td className="px-3 py-2 font-mono">{c.phone}</td>
                        <td className="px-3 py-2 text-walnut">{c.email || "N/A"}</td>
                        <td className="px-3 py-2">
                          {c.isPrimary ? (
                            <span className="rounded bg-gold-soft border border-gold/40 px-2 py-0.5 text-[10px] font-bold text-charcoal">PRIMARY</span>
                          ) : (
                            <span className="text-walnut/40">—</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {activeTab === "ratings" && (
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">Historical Rating Logs</h4>
                  <button
                    onClick={() => setIsRatingModalOpen(true)}
                    className="rounded bg-gold px-3 py-1.5 text-xs font-bold text-charcoal hover:bg-gold-hover transition-colors shadow-gold cursor-pointer"
                  >
                    + Log Quality Rating
                  </button>
                </div>
                <div className="space-y-3">
                  {vendor.ratings?.map((r: any) => (
                    <div key={r.id} className="rounded-md border border-walnut/15 bg-cream/50 p-3 text-xs space-y-1">
                      <div className="flex justify-between font-bold">
                        <span className="text-charcoal font-bold"><span className="text-gold">★</span> {r.qualityRating} / 5.0 Rating</span>
                        <span className="text-walnut font-mono text-[11px]">
                          {new Date(r.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      {r.notes && <p className="text-walnut">{r.notes}</p>}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === "expenses" && (
              <div className="space-y-4">
                <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">Vendor Expenses Ledger</h4>
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-walnut/15 bg-cream/70 text-walnut font-bold uppercase">
                    <tr>
                      <th className="px-3 py-2">Expense Ref</th>
                      <th className="px-3 py-2">Date</th>
                      <th className="px-3 py-2">Description</th>
                      <th className="px-3 py-2 text-right">Amount (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-walnut/10 font-medium text-charcoal">
                    {vendor.expenses?.map((e: any) => (
                      <tr key={e.id}>
                        <td className="px-3 py-2 font-mono font-bold text-charcoal">{e.referenceNo}</td>
                        <td className="px-3 py-2">{new Date(e.expenseDate).toLocaleDateString()}</td>
                        <td className="px-3 py-2 text-walnut">{e.description}</td>
                        <td className="px-3 py-2 text-right font-mono font-bold">{formatCurrency(e.amount)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Rating Modal */}
        <LogRatingModal
          isOpen={isRatingModalOpen}
          vendorId={vendor?.id}
          vendorName={vendor?.name || ""}
          onClose={() => setIsRatingModalOpen(false)}
          onSuccess={() => {
            fetchVendor();
            onRefresh();
          }}
        />

        {/* Block Vendor Modal */}
        {isBlockModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-xs p-4">
            <div className="w-full max-w-md rounded-xl bg-offwhite border border-walnut/20 p-6 space-y-4 shadow-modal">
              <h3 className="text-base font-bold text-semantic-danger">Block Vendor ({vendor?.name})</h3>
              <p className="text-xs text-walnut">
                Blocking a vendor prevents them from being selected for new procurement orders.
              </p>
              <form onSubmit={handleBlockVendor} className="space-y-4">
                <div>
                  <label className="block text-xs font-bold text-walnut uppercase mb-1">
                    Reason for Blocking *
                  </label>
                  <textarea
                    rows={3}
                    placeholder="e.g. Quality non-conformance or material delay..."
                    value={blockReason}
                    onChange={(e) => setBlockReason(e.target.value)}
                    className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2 text-xs text-charcoal focus:border-gold focus:outline-none"
                    required
                  />
                </div>
                <div className="flex justify-end space-x-3">
                  <button
                    type="button"
                    onClick={() => setIsBlockModalOpen(false)}
                    className="rounded-md border border-walnut/20 px-3 py-1.5 text-xs text-walnut hover:bg-cream cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={blocking}
                    className="rounded-md bg-semantic-danger px-3 py-1.5 text-xs font-bold text-white hover:bg-semantic-danger/90 cursor-pointer"
                  >
                    {blocking ? "Blocking..." : "Confirm Block"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
