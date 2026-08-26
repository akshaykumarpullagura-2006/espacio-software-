"use client";

import React, { useState } from "react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PendingApprovalsData, PendingExpenseItem, PendingPaymentItem } from "@/modules/approvals/approvals.service";
import {
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Clock,
  Receipt,
  Wallet,
  Building2,
  User,
  AlertCircle,
  Check,
  X,
  RefreshCw,
} from "lucide-react";

interface PendingApprovalsCardProps {
  initialData?: PendingApprovalsData;
  onActionComplete?: () => void;
}

export function PendingApprovalsCard({ initialData, onActionComplete }: PendingApprovalsCardProps) {
  const [data, setData] = useState<PendingApprovalsData | null>(initialData || null);
  const [filterType, setFilterType] = useState<"ALL" | "PAYMENTS" | "EXPENSES">("ALL");
  const [isProcessing, setIsProcessing] = useState<string | null>(null);
  const [rejectModalItem, setRejectModalItem] = useState<{ id: string; type: "PAYMENT" | "EXPENSE"; referenceNo: string } | null>(null);
  const [rejectionReason, setRejectionReason] = useState("");
  const [feedbackMsg, setFeedbackMsg] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);

  const fetchApprovals = async () => {
    setIsRefreshing(true);
    try {
      const res = await fetch("/api/v1/approvals/pending");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      // Quiet handling
    } finally {
      setIsRefreshing(false);
    }
  };

  const handleApproveExpense = async (expense: PendingExpenseItem) => {
    setIsProcessing(expense.id);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/v1/expenses/${expense.id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Approved from Admin Command Center" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to approve expense");
      }
      setFeedbackMsg({ type: "success", text: `Expense ${expense.referenceNo} approved successfully.` });
      await fetchApprovals();
      onActionComplete?.();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Approval failed" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleVerifyPayment = async (payment: PendingPaymentItem) => {
    setIsProcessing(payment.id);
    setFeedbackMsg(null);
    try {
      const res = await fetch(`/api/v1/payments/${payment.id}/verify`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: "Confirmed by Admin from Command Center" }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to confirm payment");
      }
      setFeedbackMsg({ type: "success", text: `Client Payment ${payment.referenceNo} confirmed and verified.` });
      await fetchApprovals();
      onActionComplete?.();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Payment confirmation failed" });
    } finally {
      setIsProcessing(null);
    }
  };

  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectModalItem) return;
    if (!rejectionReason.trim()) {
      setFeedbackMsg({ type: "error", text: "Please provide a reason for rejection." });
      return;
    }

    setIsProcessing(rejectModalItem.id);
    setFeedbackMsg(null);
    try {
      let res;
      if (rejectModalItem.type === "EXPENSE") {
        res = await fetch(`/api/v1/expenses/${rejectModalItem.id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejectionReason }),
        });
      } else {
        res = await fetch(`/api/v1/payments/${rejectModalItem.id}/reject`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ rejectionReason }),
        });
      }

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to reject item");
      }

      setFeedbackMsg({
        type: "success",
        text: `${rejectModalItem.type === "EXPENSE" ? "Expense" : "Payment"} ${rejectModalItem.referenceNo} rejected.`,
      });
      setRejectModalItem(null);
      setRejectionReason("");
      await fetchApprovals();
      onActionComplete?.();
    } catch (err: any) {
      setFeedbackMsg({ type: "error", text: err.message || "Rejection failed" });
    } finally {
      setIsProcessing(null);
    }
  };

  if (!data) return null;

  const totalCount = data.stats.totalPending;
  const filteredPayments = filterType === "EXPENSES" ? [] : data.payments;
  const filteredExpenses = filterType === "PAYMENTS" ? [] : data.expenses;

  return (
    <div className="bg-surface rounded-xl border border-walnut/15 shadow-subtle p-4 sm:p-6 mb-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-walnut/10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center text-charcoal shrink-0">
            <ShieldCheck className="w-5 h-5 text-gold" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-charcoal">Pending Financial Approvals</h2>
              {totalCount > 0 && (
                <span className="px-2 py-0.5 text-xs font-bold bg-gold/20 text-charcoal border border-gold/40 rounded-full tabular-nums">
                  {totalCount} Pending
                </span>
              )}
            </div>
            <p className="text-xs text-walnut mt-0.5">
              Client receipts awaiting Admin confirmation and expense claims awaiting Admin approval.
            </p>
          </div>
        </div>

        {/* Filter Tabs & Refresh */}
        <div className="flex items-center gap-2">
          <div className="flex items-center bg-cream/60 p-1 rounded-lg border border-walnut/15 text-xs font-semibold text-walnut">
            <button
              onClick={() => setFilterType("ALL")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterType === "ALL" ? "bg-white text-charcoal shadow-2xs font-bold" : "hover:text-charcoal"
              }`}
            >
              All ({totalCount})
            </button>
            <button
              onClick={() => setFilterType("PAYMENTS")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterType === "PAYMENTS" ? "bg-white text-charcoal shadow-2xs font-bold" : "hover:text-charcoal"
              }`}
            >
              Payments ({data.stats.pendingPaymentsCount})
            </button>
            <button
              onClick={() => setFilterType("EXPENSES")}
              className={`px-2.5 py-1 rounded-md transition-colors cursor-pointer ${
                filterType === "EXPENSES" ? "bg-white text-charcoal shadow-2xs font-bold" : "hover:text-charcoal"
              }`}
            >
              Expenses ({data.stats.pendingExpensesCount})
            </button>
          </div>

          <button
            onClick={fetchApprovals}
            disabled={isRefreshing}
            className="p-1.5 text-walnut hover:text-charcoal hover:bg-cream/60 rounded-md border border-walnut/15 transition-colors cursor-pointer"
            title="Refresh Approvals"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? "animate-spin" : ""}`} />
          </button>
        </div>
      </div>

      {/* Status Feedback Toast */}
      {feedbackMsg && (
        <div
          className={`my-3 p-3 rounded-lg text-xs font-semibold flex items-center justify-between gap-2 border ${
            feedbackMsg.type === "success"
              ? "bg-semantic-success-bg text-semantic-success border-semantic-success/20"
              : "bg-semantic-danger-bg text-semantic-danger border-semantic-danger/20"
          }`}
        >
          <div className="flex items-center gap-2">
            {feedbackMsg.type === "success" ? <CheckCircle2 className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
            <span>{feedbackMsg.text}</span>
          </div>
          <button onClick={() => setFeedbackMsg(null)} className="text-walnut hover:text-charcoal cursor-pointer">
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Summary KPI Pills */}
      {totalCount > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 my-4">
          <div className="p-3 bg-cream/30 rounded-lg border border-walnut/10 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-walnut uppercase tracking-wider">Pending Client Receipts</p>
              <p className="text-base font-bold text-charcoal tabular-nums">
                {formatCurrency(data.stats.totalPendingPaymentAmount)}
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 bg-gold/15 text-charcoal rounded-md">
              {data.stats.pendingPaymentsCount} Payments
            </span>
          </div>

          <div className="p-3 bg-cream/30 rounded-lg border border-walnut/10 flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-walnut uppercase tracking-wider">Pending Expense Claims</p>
              <p className="text-base font-bold text-charcoal tabular-nums">
                {formatCurrency(data.stats.totalPendingExpenseAmount)}
              </p>
            </div>
            <span className="text-xs font-bold px-2 py-0.5 bg-amber-500/15 text-amber-900 rounded-md">
              {data.stats.pendingExpensesCount} Expenses
            </span>
          </div>
        </div>
      )}

      {/* Empty State */}
      {totalCount === 0 && (
        <div className="py-8 text-center">
          <div className="w-12 h-12 rounded-full bg-semantic-success-bg border border-semantic-success/30 flex items-center justify-center text-semantic-success mx-auto mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-sm font-bold text-charcoal">All Financial Records Approved</h3>
          <p className="text-xs text-walnut mt-1">There are no pending payments or expenses requiring Admin action.</p>
        </div>
      )}

      {/* Pending Items List */}
      {totalCount > 0 && (
        <div className="space-y-3 mt-3">
          {/* Pending Payments */}
          {filteredPayments.map((payment) => (
            <div
              key={payment.id}
              className="p-3.5 bg-white border border-walnut/15 rounded-lg hover:border-gold/50 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-gold/15 border border-gold/30 flex items-center justify-center text-charcoal shrink-0 mt-0.5">
                  <Wallet className="w-4 h-4 text-gold" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 text-[11px] font-bold bg-gold/15 text-charcoal rounded border border-gold/30 font-mono">
                      {payment.referenceNo}
                    </span>
                    <span className="text-xs font-bold text-charcoal">
                      Client Payment • {payment.paymentMethod?.replace(/_/g, " ") || "DIRECT"}
                    </span>
                    <span className="text-[11px] text-walnut">
                      {formatDate(payment.paymentDate)}
                    </span>
                  </div>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-walnut">
                    {payment.client && (
                      <span className="flex items-center gap-1 font-semibold text-charcoal">
                        <User className="w-3 h-3 text-walnut" />
                        {payment.client.fullName}
                      </span>
                    )}
                    {payment.project && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-walnut" />
                        {payment.project.referenceNo} ({payment.project.title})
                      </span>
                    )}
                    {payment.submittedBy && (
                      <span className="text-[11px] text-walnut">
                        Submitted by: <strong className="text-charcoal">{payment.submittedBy.fullName}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount & Actions */}
              <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-walnut/10">
                <div className="text-left md:text-right">
                  <p className="text-sm font-bold text-charcoal tabular-nums">
                    {formatCurrency(payment.amount)}
                  </p>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Pending Confirmation
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleVerifyPayment(payment)}
                    disabled={isProcessing === payment.id}
                    className="px-3 py-1.5 bg-gold hover:bg-gold-hover text-charcoal text-xs font-bold rounded-md shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Accept</span>
                  </button>

                  <button
                    onClick={() =>
                      setRejectModalItem({
                        id: payment.id,
                        type: "PAYMENT",
                        referenceNo: payment.referenceNo,
                      })
                    }
                    disabled={isProcessing === payment.id}
                    className="px-2.5 py-1.5 bg-offwhite hover:bg-semantic-danger-bg text-walnut hover:text-semantic-danger text-xs font-bold rounded-md border border-walnut/20 hover:border-semantic-danger/30 transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          ))}

          {/* Pending Expenses */}
          {filteredExpenses.map((expense) => (
            <div
              key={expense.id}
              className="p-3.5 bg-white border border-walnut/15 rounded-lg hover:border-amber-400 transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 shadow-2xs"
            >
              <div className="flex items-start gap-3 min-w-0 flex-1">
                <div className="w-9 h-9 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-800 shrink-0 mt-0.5">
                  <Receipt className="w-4 h-4 text-amber-700" />
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-2 py-0.5 text-[11px] font-bold bg-amber-100 text-amber-900 rounded border border-amber-300 font-mono">
                      {expense.referenceNo}
                    </span>
                    <span className="text-xs font-bold text-charcoal">
                      Expense Claim • {expense.categoryKey?.replace(/_/g, " ") || "GENERAL"}
                    </span>
                    <span className="text-[11px] text-walnut">
                      {formatDate(expense.expenseDate)}
                    </span>
                  </div>

                  <p className="text-xs text-charcoal mt-1 line-clamp-1">{expense.description}</p>

                  <div className="mt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-walnut">
                    {expense.project && (
                      <span className="flex items-center gap-1">
                        <Building2 className="w-3 h-3 text-walnut" />
                        {expense.project.referenceNo} ({expense.project.title})
                      </span>
                    )}
                    {expense.submittedBy && (
                      <span className="text-[11px] text-walnut">
                        Submitted by: <strong className="text-charcoal">{expense.submittedBy.fullName}</strong>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Amount & Actions */}
              <div className="flex items-center justify-between md:justify-end gap-4 shrink-0 pt-2 md:pt-0 border-t md:border-t-0 border-walnut/10">
                <div className="text-left md:text-right">
                  <p className="text-sm font-bold text-charcoal tabular-nums">
                    {formatCurrency(expense.amount)}
                  </p>
                  <span className="inline-block text-[10px] font-bold uppercase tracking-wider text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                    Pending Approval
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => handleApproveExpense(expense)}
                    disabled={isProcessing === expense.id}
                    className="px-3 py-1.5 bg-gold hover:bg-gold-hover text-charcoal text-xs font-bold rounded-md shadow-2xs transition-colors flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
                  >
                    <Check className="w-3.5 h-3.5" />
                    <span>Approve</span>
                  </button>

                  <button
                    onClick={() =>
                      setRejectModalItem({
                        id: expense.id,
                        type: "EXPENSE",
                        referenceNo: expense.referenceNo,
                      })
                    }
                    disabled={isProcessing === expense.id}
                    className="px-2.5 py-1.5 bg-offwhite hover:bg-semantic-danger-bg text-walnut hover:text-semantic-danger text-xs font-bold rounded-md border border-walnut/20 hover:border-semantic-danger/30 transition-colors flex items-center gap-1 disabled:opacity-50 cursor-pointer"
                  >
                    <X className="w-3.5 h-3.5" />
                    <span>Reject</span>
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Rejection Prompt Modal */}
      {rejectModalItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-xl max-w-md w-full p-5 border border-walnut/20 shadow-modal animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between pb-3 border-b border-walnut/15">
              <div className="flex items-center gap-2">
                <XCircle className="w-5 h-5 text-semantic-danger" />
                <h3 className="text-sm font-bold text-charcoal">
                  Reject {rejectModalItem.type === "EXPENSE" ? "Expense" : "Payment"} ({rejectModalItem.referenceNo})
                </h3>
              </div>
              <button
                onClick={() => setRejectModalItem(null)}
                className="text-walnut hover:text-charcoal cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4 pt-3">
              <div>
                <label className="block text-xs font-bold text-walnut mb-1">
                  Reason for Rejection <span className="text-semantic-danger">*</span>
                </label>
                <textarea
                  required
                  rows={3}
                  placeholder="Specify why this financial record is being rejected..."
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-walnut/20 rounded-lg bg-cream/40 text-charcoal focus:outline-none focus:border-gold"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectModalItem(null)}
                  className="px-3 py-1.5 text-xs font-bold text-walnut hover:bg-cream rounded-md border border-walnut/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isProcessing === rejectModalItem.id}
                  className="px-3.5 py-1.5 text-xs font-bold text-white bg-semantic-danger hover:bg-red-700 rounded-md transition-colors shadow-2xs disabled:opacity-50 cursor-pointer"
                >
                  {isProcessing === rejectModalItem.id ? "Rejecting..." : "Confirm Rejection"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
