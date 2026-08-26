"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecordPaymentModal } from "@/components/payments/record-payment-modal";
import { Search, Plus, DollarSign, FileText, CheckCircle2, RotateCcw } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PaymentsDatabasePage() {
  const [payments, setPayments] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{ accessLevel: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);
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
      // quiet handling
    }
  };

  const fetchConfigs = async () => {
    try {
      const res = await fetch("/api/v1/config/payments");
      const json = await res.json();
      if (json.success && json.data.paymentMethods) {
        setPaymentMethods(json.data.paymentMethods);
      }
    } catch {
      // quiet handling
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
        setPayments(json.data);
        if (json.meta) setTotalPages(json.meta.totalPages);
      }
    } catch {
      // quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCurrentUser();
    fetchConfigs();
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
      if (json.success) fetchPayments();
    } catch {
      // quiet handling
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
      }
    } catch {
      // quiet handling
    } finally {
      setIsReversing(false);
    }
  };

  const columns = [
    {
      header: "Payment ID",
      accessorKey: "referenceNo" as const,
      cell: (row: any) => (
        <span className="font-mono text-xs font-bold text-slate-900">{row.referenceNo}</span>
      ),
    },
    {
      header: "Project & Client",
      accessorKey: "project" as const,
      cell: (row: any) => (
        <div>
          <span className="font-semibold text-slate-900 block leading-tight">{row.project?.title}</span>
          <span className="text-[10px] text-slate-500">{row.client?.name} • <span className="font-mono">{row.project?.referenceNo}</span></span>
        </div>
      ),
    },
    {
      header: "Amount Paid",
      accessorKey: "amount" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-bold text-slate-900 text-xs">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: "Method & Date",
      accessorKey: "paymentMethod" as const,
      cell: (row: any) => (
        <div>
          <span className="text-xs font-medium text-slate-800 block">{(row.paymentMethod || "OTHER").replace(/_/g, " ")}</span>
          <span className="text-[10px] text-slate-400">{formatDate(row.paymentDate)}</span>
        </div>
      ),
    },
    {
      header: "Txn / Cheque Ref",
      accessorKey: "externalReference" as const,
      cell: (row: any) => (
        <span className="text-xs text-slate-600 font-mono">{row.externalReference || "N/A"}</span>
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
        return <Badge variant={variant}>{statusStr === "RECORDED" ? "Pending Confirmation" : statusStr.replace(/_/g, " ")}</Badge>;
      },
    },
    {
      header: "Actions",
      accessorKey: "id" as const,
      cell: (row: any) => {
        if (currentUser?.accessLevel !== "ADMIN") {
          return (
            <span className="text-xs text-slate-400 font-medium">
              {row.status === "VERIFIED" ? "Confirmed" : "Awaiting Admin"}
            </span>
          );
        }

        return (
          <div className="flex items-center justify-end gap-1.5">
            {row.status === "RECORDED" && (
              <Button size="sm" variant="primary" onClick={() => handleVerify(row.id)}>
                Confirm
              </Button>
            )}
            {row.status === "VERIFIED" && (
              <Button size="sm" variant="outline" className="text-rose-600 border-rose-200 hover:bg-rose-50" onClick={() => setReversingPaymentId(row.id)}>
                Reverse
              </Button>
            )}
          </div>
        );
      },
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Payments & Receivables</h1>
          <p className="text-xs text-slate-500 mt-0.5">Authoritative commercial payment receipts ledger and audit history</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/finance/payments/receivables">
            <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
              Client Receivables Summary
            </Button>
          </Link>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsRecordModalOpen(true)}>
            Record Payment
          </Button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Payment ID, Client Name, Project, Ref No..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={methodFilter}
            onChange={(e) => setMethodFilter(e.target.value)}
            className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700"
          >
            <option value="">All Payment Methods</option>
            {paymentMethods.map((pm) => (
              <option key={pm.key} value={pm.key}>
                {pm.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="VERIFIED">Verified</option>
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
      <div className="flex items-center justify-between text-xs text-slate-500 pt-1">
        <span>Showing Page {page} of {totalPages}</span>
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
        onSuccess={fetchPayments}
      />

      {/* Reversal Confirmation Modal */}
      {reversingPaymentId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-md p-6 space-y-4">
            <h3 className="text-base font-bold text-slate-900">Execute Payment Reversal</h3>
            <p className="text-xs text-slate-600">
              Provide a mandatory reason for reversing this financial payment. Reversals preserve audit history and restore project receivables atomically.
            </p>
            <textarea
              placeholder="e.g. Bank cheque bounced / duplicate entry / wrong project allocation..."
              value={reversalReason}
              onChange={(e) => setReversalReason(e.target.value)}
              className="w-full h-24 p-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-rose-500"
            />
            <div className="flex justify-end gap-2 pt-2">
              <Button size="sm" variant="outline" onClick={() => setReversingPaymentId(null)}>
                Cancel
              </Button>
              <Button size="sm" variant="primary" className="bg-rose-600 hover:bg-rose-700 text-white" isLoading={isReversing} onClick={handleReverseSubmit}>
                Confirm Reversal
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
