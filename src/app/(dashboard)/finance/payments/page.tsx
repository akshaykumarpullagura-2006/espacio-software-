"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordPaymentModal } from "@/components/payments/record-payment-modal";
import { PaymentReceiptModal } from "@/components/payments/payment-receipt-modal";
import { PaymentDetailsDrawer } from "@/components/payments/payment-details-drawer";
import {
  Search,
  Plus,
  Receipt,
  FileText,
  CheckCircle2,
  RotateCcw,
  Clock,
  DollarSign,
  Eye,
  AlertTriangle,
  TrendingUp,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PaymentsDatabasePage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{ accessLevel: string } | null>(null);
  const [summary, setSummary] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Drawers
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
  const [selectedReceiptId, setSelectedReceiptId] = useState<string | null>(null);
  const [selectedDetailId, setSelectedDetailId] = useState<string | null>(null);
  const [reversingPaymentId, setReversingPaymentId] = useState<string | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);

  const fetchCurrentUser = async () => {
    try {
      const res = await fetch("/api/v1/auth/me");
      const json = await res.json();
      if (json.success && json.data) {
        setCurrentUser({ accessLevel: json.data.accessLevel });
      }
    } catch {
      // quiet error handling
    }
  };

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/v1/config/payments");
      const json = await res.json();
      if (json.success && json.data?.paymentMethods) {
        setPaymentMethods(json.data.paymentMethods);
      }
    } catch {
      // quiet error handling
    }
  };

  const fetchSummary = async () => {
    try {
      const res = await fetch("/api/v1/payments/summary");
      const json = await res.json();
      if (json.success) {
        setSummary(json.data);
      }
    } catch {
      // quiet error handling
    }
  };

  const fetchPayments = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(methodFilter ? { paymentMethod: methodFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      const res = await fetch(`/api/v1/payments?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) {
        setPayments(json.data || []);
        if (json.meta) setTotalPages(json.meta.totalPages || 1);
      }
    } catch {
      // quiet error handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchConfigs();
    fetchSummary();
  }, []);

  useEffect(() => {
    fetchPayments();
  }, [page, methodFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchPayments();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleVerify = async (paymentId: string) => {
    try {
      const res = await fetch(`/api/v1/payments/${paymentId}/verify`, { method: "POST" });
      const json = await res.json();
      if (json.success) {
        fetchPayments();
        fetchSummary();
        if (selectedDetailId === paymentId) setSelectedDetailId(paymentId);
      }
    } catch {
      // quiet error handling
    }
  };

  const handleReverseSubmit = async () => {
    if (!reversingPaymentId || !reversalReason.trim()) return;
    setIsReversing(true);
    try {
      const res = await fetch(`/api/v1/payments/${reversingPaymentId}/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reversalReason: reversalReason.trim() }),
      });
      const json = await res.json();
      if (json.success) {
        setReversingPaymentId(null);
        setReversalReason("");
        fetchPayments();
        fetchSummary();
        if (selectedDetailId === reversingPaymentId) setSelectedDetailId(reversingPaymentId);
      }
    } catch {
      // quiet error handling
    } finally {
      setIsReversing(false);
    }
  };

  const isAdmin = currentUser?.accessLevel === "ADMIN";

  const columns = [
    {
      header: "Payment ID",
      accessorKey: "referenceNo" as const,
      cell: (row: any) => (
        <button
          onClick={() => setSelectedDetailId(row.id)}
          className="font-mono text-xs font-bold text-[#4A433D] hover:text-[#F2B455] transition-colors underline decoration-[#6F5642]/30 text-left"
        >
          {row.referenceNo}
        </button>
      ),
    },
    {
      header: "Project & Client",
      accessorKey: "project" as const,
      cell: (row: any) => (
        <div>
          <span className="font-semibold text-[#4A433D] block leading-tight">{row.project?.title}</span>
          <span className="text-[10px] text-[#6F5642]">
            {row.client?.fullName || row.client?.name || "Client"} • <span className="font-mono">{row.project?.referenceNo}</span>
          </span>
        </div>
      ),
    },
    {
      header: "Amount Paid",
      accessorKey: "amount" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-mono font-bold text-[#4A433D] text-xs">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: "Method & Date",
      accessorKey: "paymentMethod" as const,
      cell: (row: any) => (
        <div>
          <span className="text-xs font-semibold text-[#4A433D] block">
            {(row.paymentMethod || "OTHER").replace(/_/g, " ")}
          </span>
          <span className="text-[10px] text-[#6F5642]">{formatDate(row.paymentDate)}</span>
        </div>
      ),
    },
    {
      header: "Milestone",
      accessorKey: "milestone" as const,
      cell: (row: any) => (
        <span className="text-xs text-[#6F5642] font-medium">
          {row.milestone?.title || <span className="text-[#6F5642]/60 italic">Unallocated</span>}
        </span>
      ),
    },
    {
      header: "Txn / Cheque Ref",
      accessorKey: "referenceNoExt" as const,
      cell: (row: any) => (
        <span className="text-xs text-[#6F5642] font-mono">{row.referenceNoExt || row.externalReference || "-"}</span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (row: any) => {
        const statusStr = row.status || "RECORDED";
        const variant =
          statusStr === "VERIFIED"
            ? "completed"
            : statusStr === "RECORDED" || statusStr === "PENDING_VERIFICATION"
            ? "pending"
            : "danger";
        return (
          <Badge variant={variant}>
            {statusStr === "RECORDED" ? "Pending Confirmation" : statusStr.replace(/_/g, " ")}
          </Badge>
        );
      },
    },
    {
      header: "Actions",
      accessorKey: "id" as const,
      cell: (row: any) => (
        <div className="flex items-center justify-end gap-1.5">
          <Button
            size="sm"
            variant="ghost"
            className="text-[#6F5642] hover:text-[#4A433D] p-1 h-7"
            onClick={() => setSelectedDetailId(row.id)}
            title="View Details & Timeline"
          >
            <Eye className="w-3.5 h-3.5" />
          </Button>

          <Button
            size="sm"
            variant="ghost"
            className="text-[#6F5642] hover:text-[#4A433D] p-1 h-7"
            onClick={() => setSelectedReceiptId(row.id)}
            title="Print Official Voucher"
          >
            <Receipt className="w-3.5 h-3.5" />
          </Button>

          {isAdmin && row.status === "RECORDED" && (
            <Button size="sm" variant="primary" className="h-7 text-xs px-2" onClick={() => handleVerify(row.id)}>
              Confirm
            </Button>
          )}

          {isAdmin && row.status === "VERIFIED" && (
            <Button
              size="sm"
              variant="outline"
              className="text-rose-700 border-rose-300 hover:bg-rose-50 h-7 text-xs px-2"
              onClick={() => setReversingPaymentId(row.id)}
            >
              Reverse
            </Button>
          )}
        </div>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#6F5642]/15">
        <div>
          <h1 className="text-xl font-bold text-[#4A433D] tracking-tight">Client Payments & Collections</h1>
          <p className="text-xs text-[#6F5642] mt-0.5">Authoritative commercial payment receipts ledger, milestones, and audit history</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/finance/payments/receivables">
            <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
              Receivables Summary
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsRecordModalOpen(true)}
          >
            Record Payment
          </Button>
        </div>
      </div>

      {/* Financial KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-[#6F5642]/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">Total Commercial Value</span>
            <div className="text-lg font-bold font-mono text-[#4A433D] tabular-nums mt-0.5">
              {summary ? formatCurrency(summary.totalProjectValue) : "₹0"}
            </div>
            <span className="text-[10px] text-[#6F5642]">Active execution projects</span>
          </div>
          <div className="p-2.5 bg-[#F6EFE3] rounded-lg text-[#6F5642]">
            <DollarSign className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#6F5642]/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Verified Collections</span>
            <div className="text-lg font-bold font-mono text-emerald-700 tabular-nums mt-0.5">
              {summary ? formatCurrency(summary.totalVerifiedPaid) : "₹0"}
            </div>
            <span className="text-[10px] text-emerald-800 font-medium">
              {summary?.verifiedCount || 0} confirmed receipts
            </span>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#6F5642]/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-800">Pending Confirmation</span>
            <div className="text-lg font-bold font-mono text-amber-700 tabular-nums mt-0.5">
              {summary ? formatCurrency(summary.totalPendingRecorded) : "₹0"}
            </div>
            <span className="text-[10px] text-amber-800 font-medium">
              {summary?.recordedCount || 0} awaiting Admin verification
            </span>
          </div>
          <div className="p-2.5 bg-amber-50 rounded-lg text-amber-700">
            <Clock className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#6F5642]/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">Outstanding Receivables</span>
            <div className="text-lg font-bold font-mono text-[#4A433D] tabular-nums mt-0.5">
              {summary ? formatCurrency(summary.totalOutstandingReceivables) : "₹0"}
            </div>
            <span className="text-[10px] text-[#6F5642]">Remaining client balance</span>
          </div>
          <div className="p-2.5 bg-[#ECF4F0] rounded-lg text-[#6F5642]">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-white border border-[#6F5642]/15 rounded-xl shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-[#6F5642] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Payment ID, Client Name, Project, Ref No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-[#F6EFE3]/40 border border-[#6F5642]/20 rounded-md focus:outline-none focus:border-[#F2B455] text-[#4A433D]"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-8 px-2.5 bg-[#F6EFE3]/40 border border-[#6F5642]/20 rounded-md font-medium text-[#4A433D] focus:border-[#F2B455] focus:outline-none"
          >
            <option value="">All Payment Methods</option>
            {paymentMethods.length > 0 ? (
              paymentMethods.map((pm) => (
                <option key={pm.key} value={pm.key}>
                  {pm.name}
                </option>
              ))
            ) : (
              <>
                <option value="BANK_TRANSFER">Bank Transfer</option>
                <option value="UPI">UPI</option>
                <option value="CHEQUE">Cheque</option>
                <option value="CASH">Cash</option>
                <option value="CREDIT_CARD">Credit Card</option>
              </>
            )}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 bg-[#F6EFE3]/40 border border-[#6F5642]/20 rounded-md font-medium text-[#4A433D] focus:border-[#F2B455] focus:outline-none"
          >
            <option value="">All Statuses</option>
            <option value="VERIFIED">Verified (Confirmed)</option>
            <option value="RECORDED">Recorded (Pending)</option>
            <option value="REVERSED">Reversed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Payments Table */}
      <DataTable
        columns={columns}
        data={payments}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyText="No client payment records match criteria."
        emptySubtext="Use 'Record Payment' button to log client money receipts."
      />

      {/* Pagination */}
      <div className="flex items-center justify-between text-xs text-[#6F5642] pt-1">
        <span>
          Showing Page {page} of {totalPages}
        </span>
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => Math.max(p - 1, 1))}
          >
            Previous
          </Button>
          <Button
            size="sm"
            variant="outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
          >
            Next
          </Button>
        </div>
      </div>

      {/* Record Payment Modal */}
      <RecordPaymentModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onSuccess={() => {
          fetchPayments();
          fetchSummary();
        }}
      />

      {/* Printable Receipt Modal */}
      <PaymentReceiptModal
        paymentId={selectedReceiptId}
        isOpen={!!selectedReceiptId}
        onClose={() => setSelectedReceiptId(null)}
      />

      {/* Payment Details & Timeline Drawer */}
      <PaymentDetailsDrawer
        paymentId={selectedDetailId}
        isOpen={!!selectedDetailId}
        onClose={() => setSelectedDetailId(null)}
        onOpenReceipt={(id) => setSelectedReceiptId(id)}
        onOpenReversal={(id) => setReversingPaymentId(id)}
        onVerify={(id) => handleVerify(id)}
        isAdmin={isAdmin}
      />

      {/* Reversal Confirmation Modal */}
      {reversingPaymentId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-[#4A433D]/50 backdrop-blur-xs">
          <div className="bg-[#F6EFE3] rounded-xl shadow-2xl border border-[#6F5642]/20 w-full max-w-md p-6 space-y-4 animate-fadeIn">
            <h3 className="text-base font-bold text-[#4A433D]">Execute Payment Reversal</h3>
            <p className="text-xs text-[#6F5642]">
              Provide a mandatory reason for reversing this financial payment. Reversals preserve audit history and restore project receivables atomically.
            </p>
            <textarea
              placeholder="e.g. Bank cheque bounced on clearance / duplicate entry / wrong project allocation..."
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              className="w-full h-24 p-3 text-xs bg-white border border-[#6F5642]/20 rounded-md focus:outline-none focus:border-rose-500 text-[#4A433D]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setReversingPaymentId(null)}>
                Cancel
              </Button>
              <Button
                size="sm"
                variant="primary"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                isLoading={isReversing}
                onClick={handleReverseSubmit}
              >
                Confirm Reversal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
