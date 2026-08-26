"use client";

import React, { useState, useEffect } from "react";

interface MaterialRequestDetailModalProps {
  isOpen: boolean;
  mrId: string | null;
  onClose: () => void;
  onRefresh: () => void;
}

export function MaterialRequestDetailModal({ isOpen, mrId, onClose, onRefresh }: MaterialRequestDetailModalProps) {
  const [mr, setMr] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);
  const [rejectReason, setRejectReason] = useState("");
  const [showRejectForm, setShowRejectForm] = useState(false);

  useEffect(() => {
    if (isOpen && mrId) {
      fetchMR();
    }
  }, [isOpen, mrId]);

  async function fetchMR() {
    setLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/material-requests/${mrId}`);
      if (res.ok) {
        const data = await res.json();
        setMr(data.data);
      }
    } catch (e) {
      console.error("Failed to load material request details", e);
    } finally {
      setLoading(false);
    }
  }

  if (!isOpen || !mrId) return null;

  async function handleApprove() {
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/material-requests/${mrId}/approve`, {
        method: "POST",
      });
      if (res.ok) {
        fetchMR();
        onRefresh();
      }
    } catch (e) {
      console.error("Failed to approve material request", e);
    } finally {
      setActionLoading(false);
    }
  }

  async function handleReject(e: React.FormEvent) {
    e.preventDefault();
    setActionLoading(true);
    try {
      const res = await fetch(`/api/v1/procurement/material-requests/${mrId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reason: rejectReason }),
      });
      if (res.ok) {
        setShowRejectForm(false);
        fetchMR();
        onRefresh();
      }
    } catch (e) {
      console.error("Failed to reject material request", e);
    } finally {
      setActionLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-charcoal/50 backdrop-blur-xs">
      <div className="w-full max-w-3xl bg-offwhite shadow-2xl h-full flex flex-col border-l border-walnut/20">
        {/* Top Header */}
        <div className="border-b border-walnut/20 px-6 py-4 flex items-center justify-between bg-[#36302B] text-white">
          <div>
            <div className="flex items-center space-x-2 text-xs text-gold font-mono font-bold">
              <span>{mr?.referenceNo}</span>
              <span>•</span>
              <span className="uppercase">{mr?.priority} PRIORITY</span>
            </div>
            <h2 className="text-xl font-bold tracking-tight text-cream">Material Requisition Workspace</h2>
            <p className="text-xs text-[#A8917D]">
              Requested by {mr?.requester?.fullName || "Site Team"} on {mr?.createdAt ? new Date(mr.createdAt).toLocaleDateString() : ""}
            </p>
          </div>
          <div className="flex items-center space-x-3">
            {mr?.status === "SUBMITTED" && (
              <>
                <button
                  onClick={handleApprove}
                  disabled={actionLoading}
                  className="rounded-md bg-gold px-3 py-1.5 text-xs font-bold text-charcoal hover:bg-gold-hover shadow-gold disabled:opacity-50 cursor-pointer"
                >
                  Approve Request
                </button>
                <button
                  onClick={() => setShowRejectForm(true)}
                  disabled={actionLoading}
                  className="rounded-md bg-semantic-danger px-3 py-1.5 text-xs font-bold text-white hover:bg-semantic-danger/90 disabled:opacity-50 cursor-pointer"
                >
                  Reject
                </button>
              </>
            )}
            <button onClick={onClose} className="text-walnut hover:text-cream text-lg cursor-pointer">
              ✕
            </button>
          </div>
        </div>

        {loading ? (
          <div className="p-12 text-center text-sm text-walnut flex-1 flex items-center justify-center">
            Loading requisition details...
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-6 space-y-6">
            {/* Header Metrics */}
            <div className="grid grid-cols-4 gap-4 rounded-lg border border-walnut/15 bg-cream/50 p-4 text-center">
              <div>
                <div className="text-[11px] font-bold text-walnut uppercase">Requester</div>
                <div className="text-sm font-bold text-charcoal">{mr.requester?.fullName}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-walnut uppercase">Project</div>
                <div className="text-sm font-bold text-charcoal">{mr.project?.title || "General Stock"}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-walnut uppercase">Required Date</div>
                <div className="text-sm font-bold text-charcoal">{new Date(mr.requiredDate).toLocaleDateString()}</div>
              </div>
              <div>
                <div className="text-[11px] font-bold text-walnut uppercase">Status</div>
                <div className="text-sm font-bold text-charcoal">{mr.status}</div>
              </div>
            </div>

            {/* Reject Form */}
            {showRejectForm && (
              <form onSubmit={handleReject} className="p-4 rounded-lg border border-semantic-danger-border bg-semantic-danger-bg space-y-3 text-xs">
                <h4 className="font-bold text-semantic-danger">Reject Material Request</h4>
                <textarea
                  rows={2}
                  placeholder="Enter reason for rejection..."
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  className="w-full rounded-md border border-semantic-danger-border bg-offwhite p-2 text-charcoal focus:outline-none"
                  required
                />
                <div className="flex justify-end space-x-2">
                  <button
                    type="button"
                    onClick={() => setShowRejectForm(false)}
                    className="rounded-md border border-walnut/20 bg-offwhite px-3 py-1 text-walnut cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="rounded-md bg-semantic-danger px-3 py-1 font-bold text-white hover:bg-semantic-danger/90 cursor-pointer"
                  >
                    Confirm Rejection
                  </button>
                </div>
              </form>
            )}

            {/* Requested Items Table */}
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                Requisition Line Items ({mr.items?.length || 0})
              </h4>
              <table className="w-full text-left text-xs">
                <thead className="border-b border-walnut/15 bg-cream/70 text-walnut font-bold uppercase">
                  <tr>
                    <th className="px-3 py-2">Material Name</th>
                    <th className="px-3 py-2 text-right">Requested</th>
                    <th className="px-3 py-2 text-right">Approved</th>
                    <th className="px-3 py-2 text-right">Ordered</th>
                    <th className="px-3 py-2 text-right">Received</th>
                    <th className="px-3 py-2">Unit</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-walnut/10 font-medium text-charcoal">
                  {mr.items?.map((i: any) => (
                    <tr key={i.id}>
                      <td className="px-3 py-2">
                        <div className="font-bold text-charcoal">{i.materialName}</div>
                        {i.description && <div className="text-[11px] text-walnut">{i.description}</div>}
                      </td>
                      <td className="px-3 py-2 text-right font-mono font-bold text-charcoal">{i.requestedQuantity}</td>
                      <td className="px-3 py-2 text-right font-mono text-semantic-success font-bold">{i.approvedQuantity}</td>
                      <td className="px-3 py-2 text-right font-mono text-gold font-bold">{i.orderedQuantity}</td>
                      <td className="px-3 py-2 text-right font-mono text-walnut">{i.receivedQuantity}</td>
                      <td className="px-3 py-2 text-walnut">{i.unitKey}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Generated Purchase Orders */}
            {mr.pos && mr.pos.length > 0 && (
              <div className="space-y-3">
                <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                  Associated Purchase Orders ({mr.pos.length})
                </h4>
                <div className="space-y-2">
                  {mr.pos.map((p: any) => (
                    <div key={p.id} className="flex justify-between items-center p-3 rounded-lg border border-walnut/15 bg-cream/40 text-xs">
                      <div>
                        <span className="font-mono font-bold text-charcoal">{p.referenceNo}</span>
                        <span className="ml-2 text-walnut">Supplier: {p.vendor?.name}</span>
                      </div>
                      <div className="flex items-center space-x-3">
                        <span className="font-mono font-bold text-charcoal">₹{p.grandTotal.toLocaleString("en-IN")}</span>
                        <span className="rounded bg-cream border border-walnut/20 px-2 py-0.5 font-bold text-[10px] text-charcoal">{p.status}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
