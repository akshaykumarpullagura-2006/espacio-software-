"use client";

import React, { useState, useEffect } from "react";
import { X, Receipt, CheckCircle2, Clock, RotateCcw, AlertTriangle, Building, Calendar, DollarSign, ArrowRight } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface PaymentDetailsDrawerProps {
  paymentId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onOpenReceipt: (paymentId: string) => void;
  onOpenReversal: (paymentId: string) => void;
  onVerify: (paymentId: string) => void;
  isAdmin: boolean;
}

export const PaymentDetailsDrawer: React.FC<PaymentDetailsDrawerProps> = ({
  paymentId,
  isOpen,
  onClose,
  onOpenReceipt,
  onOpenReversal,
  onVerify,
  isAdmin,
}) => {
  const [data, setData] = useState<any>(null);
  const [timelineData, setTimelineData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<"details" | "timeline">("details");

  useEffect(() => {
    if (isOpen && paymentId) {
      fetchDetails();
    } else {
      setData(null);
      setTimelineData(null);
    }
  }, [isOpen, paymentId]);

  const fetchDetails = async () => {
    if (!paymentId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/payments/${paymentId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        if (json.data.payment?.projectId) {
          fetchTimeline(json.data.payment.projectId);
        }
      }
    } catch {
      // quiet error handling
    } finally {
      setIsLoading(false);
    }
  };

  const fetchTimeline = async (projectId: string) => {
    try {
      const res = await fetch(`/api/v1/payments/timeline?projectId=${projectId}`);
      const json = await res.json();
      if (json.success) {
        setTimelineData(json.data);
      }
    } catch {
      // quiet error handling
    }
  };

  if (!isOpen) return null;

  const payment = data?.payment;
  const financials = data?.financials;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#4A433D]/40 backdrop-blur-xs flex justify-end animate-fadeIn">
      <div className="w-full max-w-xl bg-[#F6EFE3] h-full shadow-2xl flex flex-col border-l border-[#6F5642]/20">
        {/* Drawer Header */}
        <div className="p-5 border-b border-[#6F5642]/15 bg-[#ECF4F0] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-[#F6EFE3] border border-[#6F5642]/15 text-[#6F5642]">
              <Receipt className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-sm font-bold text-[#4A433D]">{payment?.referenceNo || "Payment Record"}</span>
                {payment && (
                  <Badge variant={payment.status === "VERIFIED" ? "completed" : payment.status === "RECORDED" ? "pending" : "danger"}>
                    {payment.status === "RECORDED" ? "Pending Confirmation" : payment.status.replace(/_/g, " ")}
                  </Badge>
                )}
              </div>
              <p className="text-[11px] text-[#6F5642] mt-0.5">{payment?.project?.title || "Commercial Payment Record"}</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            {payment && (
              <Button size="sm" variant="outline" onClick={() => onOpenReceipt(payment.id)}>
                View Voucher
              </Button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-[#6F5642] hover:bg-[#6F5642]/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tab Toggle */}
        <div className="flex border-b border-[#6F5642]/15 px-5 bg-white/60">
          <button
            onClick={() => setActiveTab("details")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "details"
                ? "border-[#F2B455] text-[#4A433D]"
                : "border-transparent text-[#6F5642] hover:text-[#4A433D]"
            }`}
          >
            Payment Information
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`py-2.5 px-4 text-xs font-bold border-b-2 transition-colors ${
              activeTab === "timeline"
                ? "border-[#F2B455] text-[#4A433D]"
                : "border-transparent text-[#6F5642] hover:text-[#4A433D]"
            }`}
          >
            Project Payment Timeline ({timelineData?.events?.length || 0})
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5 space-y-5 text-xs text-[#4A433D]">
          {isLoading ? (
            <div className="py-20 text-center text-[#6F5642]">Loading payment data...</div>
          ) : !payment ? (
            <div className="py-20 text-center text-[#6F5642]">Payment record not found.</div>
          ) : activeTab === "details" ? (
            <>
              {/* Key Summary Cards */}
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3.5 bg-white rounded-lg border border-[#6F5642]/15 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">Receipt Amount</span>
                  <div className="text-lg font-bold font-mono text-[#4A433D] tabular-nums mt-0.5">
                    {formatCurrency(payment.amount)}
                  </div>
                  <div className="text-[10px] text-[#6F5642] mt-0.5">{(payment.paymentMethod || "OTHER").replace(/_/g, " ")}</div>
                </div>

                <div className="p-3.5 bg-white rounded-lg border border-[#6F5642]/15 shadow-xs">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">Payment Date</span>
                  <div className="text-sm font-semibold text-[#4A433D] mt-0.5">
                    {formatDate(payment.paymentDate)}
                  </div>
                  <div className="text-[10px] font-mono text-[#6F5642] mt-0.5 truncate">
                    Ref: {payment.referenceNoExt || "No external ref"}
                  </div>
                </div>
              </div>

              {/* Linked Client & Project */}
              <div className="p-4 bg-white rounded-lg border border-[#6F5642]/15 shadow-xs space-y-3">
                <div className="font-bold text-[11px] uppercase tracking-wider text-[#6F5642] border-b border-[#6F5642]/10 pb-1.5">
                  Commercial Account Attribution
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] text-[#6F5642]">Project Title:</span>
                    <div className="font-semibold text-[#4A433D]">{payment.project?.title}</div>
                    <div className="text-[10px] font-mono text-[#6F5642]">{payment.project?.referenceNo}</div>
                  </div>
                  <div>
                    <span className="text-[10px] text-[#6F5642]">Client Name:</span>
                    <div className="font-semibold text-[#4A433D]">{payment.client?.fullName || "N/A"}</div>
                    <div className="text-[10px] text-[#6F5642]">{payment.client?.phone || ""}</div>
                  </div>
                </div>

                {payment.milestone && (
                  <div className="pt-2 border-t border-[#6F5642]/10">
                    <span className="text-[10px] text-[#6F5642]">Allocated Milestone:</span>
                    <div className="font-semibold text-[#4A433D]">
                      {payment.milestone.title} ({payment.milestone.milestonePct}% — {formatCurrency(payment.milestone.amount)})
                    </div>
                  </div>
                )}

                {payment.financialAccount && (
                  <div className="pt-1">
                    <span className="text-[10px] text-[#6F5642]">Deposit Account:</span>
                    <div className="font-semibold text-[#4A433D]">
                      {payment.financialAccount.name} ({payment.financialAccount.accountCode})
                    </div>
                  </div>
                )}
              </div>

              {/* Live Project Financial Health */}
              {financials && (
                <div className="p-4 bg-[#ECF4F0] rounded-lg border border-[#6F5642]/15 shadow-xs space-y-2.5">
                  <div className="font-bold text-[11px] uppercase tracking-wider text-[#6F5642] border-b border-[#6F5642]/15 pb-1">
                    Project Financial Position
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#6F5642]">Total Contract Value:</span>
                    <span className="font-mono font-bold text-[#4A433D] tabular-nums">{formatCurrency(financials.revisedProjectValue)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#6F5642]">Total Verified Collections:</span>
                    <span className="font-mono font-bold text-emerald-700 tabular-nums">{formatCurrency(financials.totalVerifiedPaid)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs">
                    <span className="text-[#6F5642]">Pending Collections (Recorded):</span>
                    <span className="font-mono font-bold text-amber-700 tabular-nums">{formatCurrency(financials.totalPendingRecorded)}</span>
                  </div>
                  <div className="flex justify-between items-center text-xs pt-1.5 border-t border-[#6F5642]/15 font-bold">
                    <span className="text-[#4A433D]">Remaining Project Balance:</span>
                    <span className="font-mono text-[#4A433D] tabular-nums">{formatCurrency(financials.remainingBalance)}</span>
                  </div>
                </div>
              )}

              {/* Notes & Audit Information */}
              <div className="p-4 bg-white rounded-lg border border-[#6F5642]/15 shadow-xs space-y-2 text-xs">
                <div className="font-bold text-[11px] uppercase tracking-wider text-[#6F5642]">Record Notes & Audit</div>
                <p className="text-[#4A433D] bg-[#F6EFE3]/50 p-2.5 rounded border border-[#6F5642]/10 leading-relaxed font-sans">
                  {payment.notes || "No additional transaction notes recorded."}
                </p>
                {payment.reversedReason && (
                  <div className="p-2.5 bg-rose-50 rounded border border-rose-200 text-rose-800 text-[11px]">
                    <span className="font-bold">Reversal Reason:</span> {payment.reversedReason}
                  </div>
                )}
                <div className="text-[10px] text-[#6F5642] pt-1 flex justify-between">
                  <span>Recorded: {formatDate(payment.createdAt)}</span>
                  {payment.verifiedAt && <span>Verified: {formatDate(payment.verifiedAt)}</span>}
                </div>
              </div>
            </>
          ) : (
            /* Timeline Tab */
            <div className="space-y-4">
              <div className="p-3 bg-white rounded-lg border border-[#6F5642]/15 text-xs text-[#6F5642]">
                Chronological sequence of payment milestones, recorded receipts, and confirmations for <span className="font-bold text-[#4A433D]">{timelineData?.project?.title}</span>.
              </div>

              <div className="relative pl-6 space-y-5 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#6F5642]/20">
                {timelineData?.events?.map((ev: any) => {
                  const isVerified = ev.type === "PAYMENT_VERIFIED" || ev.type === "MILESTONE_SETTLED";
                  const isReversed = ev.type === "PAYMENT_REVERSED";
                  const isScheduled = ev.type === "MILESTONE_SCHEDULED";

                  return (
                    <div key={ev.id} className="relative">
                      {/* Timeline Node Icon */}
                      <div
                        className={`absolute -left-[27px] top-0.5 w-4 h-4 rounded-full border-2 bg-white flex items-center justify-center ${
                          isVerified
                            ? "border-emerald-600 text-emerald-600"
                            : isReversed
                            ? "border-rose-600 text-rose-600"
                            : isScheduled
                            ? "border-[#F2B455] text-[#F2B455]"
                            : "border-[#6F5642] text-[#6F5642]"
                        }`}
                      >
                        <div
                          className={`w-1.5 h-1.5 rounded-full ${
                            isVerified
                              ? "bg-emerald-600"
                              : isReversed
                              ? "bg-rose-600"
                              : isScheduled
                              ? "bg-[#F2B455]"
                              : "bg-[#6F5642]"
                          }`}
                        />
                      </div>

                      <div className="bg-white p-3.5 rounded-lg border border-[#6F5642]/15 shadow-xs space-y-1">
                        <div className="flex items-center justify-between">
                          <span className="font-bold text-xs text-[#4A433D]">{ev.title}</span>
                          <span className="text-[10px] text-[#6F5642] font-medium">{formatDate(ev.date)}</span>
                        </div>
                        {ev.description && <p className="text-[11px] text-[#6F5642] leading-relaxed">{ev.description}</p>}
                        {ev.amount && (
                          <div className="font-mono font-bold text-xs text-[#4A433D] tabular-nums pt-1">
                            Amount: {formatCurrency(ev.amount)}
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Drawer Footer Actions */}
        {payment && (
          <div className="p-4 border-t border-[#6F5642]/15 bg-[#ECF4F0] flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => onOpenReceipt(payment.id)}>
                Print Voucher
              </Button>
            </div>

            <div className="flex items-center gap-2">
              {isAdmin && payment.status === "RECORDED" && (
                <Button size="sm" variant="primary" onClick={() => onVerify(payment.id)}>
                  Confirm Payment
                </Button>
              )}
              {isAdmin && payment.status === "VERIFIED" && (
                <Button
                  size="sm"
                  variant="outline"
                  className="text-rose-700 border-rose-300 hover:bg-rose-50"
                  onClick={() => onOpenReversal(payment.id)}
                >
                  Reverse Payment
                </Button>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
