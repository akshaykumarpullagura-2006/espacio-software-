"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { AddExpenseModal } from "@/components/expenses/add-expense-modal";
import { Search, Plus, FileText } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ExpensesDatabasePage() {
  const [expenses, setExpenses] = useState<any[]>([]);
  const [currentUser, setCurrentUser] = useState<{ accessLevel: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Tabs & Filters
  const [activeTypeTab, setActiveTypeTab] = useState<"" | "PROJECT" | "BUSINESS">("");
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("");
  const [methodFilter, setMethodFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);

  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);

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
      fetchCurrentUser();
      const [catRes, pmRes] = await Promise.all([
        fetch("/api/v1/config/expenses"),
        fetch("/api/v1/config/payments"),
      ]);
      const catJson = await catRes.json();
      const pmJson = await pmRes.json();
      if (catJson.success) setCategories(catJson.data.categories || []);
      if (pmJson.success) setPaymentMethods(pmJson.data.paymentMethods || []);
    } catch {
      // quiet handling
    }
  };

  const fetchExpenses = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(activeTypeTab ? { expenseType: activeTypeTab } : {}),
        ...(search ? { search } : {}),
        ...(categoryFilter ? { categoryKey: categoryFilter } : {}),
        ...(methodFilter ? { paymentMethod: methodFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
      });

      const res = await fetch(`/api/v1/expenses?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) {
        setExpenses(json.data);
        if (json.meta) setTotalPages(json.meta.totalPages);
      }
    } catch {
      // quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchConfigs();
  }, []);

  useEffect(() => {
    fetchExpenses();
  }, [page, activeTypeTab, categoryFilter, methodFilter, statusFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchExpenses();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleApprove = async (expenseId: string) => {
    try {
      const res = await fetch(`/api/v1/expenses/${expenseId}/approve`, { method: "POST" });
      const json = await res.json();
      if (json.success) fetchExpenses();
    } catch {
      // quiet handling
    }
  };

  const columns = [
    {
      header: "Expense ID",
      accessorKey: "referenceNo" as const,
      cell: (row: any) => (
        <span className="font-mono text-xs font-bold text-slate-900">{row.referenceNo}</span>
      ),
    },
    {
      header: "Type & Category",
      accessorKey: "categoryKey" as const,
      cell: (row: any) => (
        <div>
          <span className="font-semibold text-slate-900 block leading-tight">{(row.categoryKey || "GENERAL").replace(/_/g, " ")}</span>
          <Badge variant={row.expenseType === "PROJECT" ? "active" : "pending"}>
            {row.expenseType}
          </Badge>
        </div>
      ),
    },
    {
      header: "Description / Project",
      accessorKey: "description" as const,
      cell: (row: any) => (
        <div>
          <span className="font-semibold text-slate-900 block leading-tight">{row.description}</span>
          {row.project ? (
            <span className="text-[10px] text-slate-500 font-mono">{row.project.referenceNo} — {row.project.title}</span>
          ) : (
            <span className="text-[10px] text-slate-400">Business Overhead</span>
          )}
        </div>
      ),
    },
    {
      header: "Vendor & Ref",
      accessorKey: "vendorName" as const,
      cell: (row: any) => (
        <div>
          <span className="text-xs text-slate-800 block">{row.vendorName || "N/A"}</span>
          {row.referenceNoExternal && <span className="text-[10px] text-slate-400 font-mono">Ref: {row.referenceNoExternal}</span>}
        </div>
      ),
    },
    {
      header: "Amount",
      accessorKey: "amount" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-bold text-slate-900 text-xs">
          {formatCurrency(row.amount)}
        </span>
      ),
    },
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (row: any) => {
        const statusStr = row.status || "DRAFT";
        const variant =
          statusStr === "APPROVED" || statusStr === "PAID"
            ? "completed"
            : statusStr === "SUBMITTED" || statusStr === "DRAFT"
            ? "pending"
            : "danger";
        return <Badge variant={variant}>{statusStr === "SUBMITTED" ? "Pending Approval" : statusStr.replace(/_/g, " ")}</Badge>;
      },
    },
    {
      header: "Actions",
      accessorKey: "id" as const,
      cell: (row: any) => {
        if (currentUser?.accessLevel !== "ADMIN") {
          return (
            <span className="text-xs text-slate-400 font-medium">
              {row.status === "APPROVED" ? "Approved" : "Awaiting Admin"}
            </span>
          );
        }

        return (
          <div className="flex items-center justify-end gap-1.5">
            {row.status === "SUBMITTED" && (
              <Button size="sm" variant="primary" onClick={() => handleApprove(row.id)}>
                Approve
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
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Expense Management</h1>
          <p className="text-xs text-slate-500 mt-0.5">Authoritative financial outgoing ledger & project cost control</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/finance/expenses/cost-sheets">
            <Button variant="outline" size="sm" leftIcon={<FileText className="w-3.5 h-3.5" />}>
              Project Cost Sheets
            </Button>
          </Link>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsAddModalOpen(true)}>
            Record Expense
          </Button>
        </div>
      </div>

      {/* Segmented Type Filter Tabs */}
      <div className="flex items-center gap-2 p-1 bg-slate-100 rounded-lg w-fit border border-slate-200 text-xs font-bold">
        <button
          onClick={() => setActiveTypeTab("")}
          className={`px-4 py-1.5 rounded-md transition-colors ${
            activeTypeTab === "" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          All Expenses
        </button>
        <button
          onClick={() => setActiveTypeTab("PROJECT")}
          className={`px-4 py-1.5 rounded-md transition-colors ${
            activeTypeTab === "PROJECT" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Project Expenses
        </button>
        <button
          onClick={() => setActiveTypeTab("BUSINESS")}
          className={`px-4 py-1.5 rounded-md transition-colors ${
            activeTypeTab === "BUSINESS" ? "bg-white text-emerald-700 shadow-sm" : "text-slate-600 hover:text-slate-900"
          }`}
        >
          Business Overhead
        </button>
      </div>

      {/* Filter Toolbar */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Expense ID, Description, Vendor, Bill Ref, Project..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 text-xs">
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700"
          >
            <option value="">All Categories</option>
            {categories.map((c) => (
              <option key={c.key} value={c.key}>
                {c.name}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700"
          >
            <option value="">All Statuses</option>
            <option value="APPROVED">Approved</option>
            <option value="SUBMITTED">Submitted (Pending)</option>
            <option value="REJECTED">Rejected</option>
            <option value="CANCELLED">Cancelled</option>
          </select>
        </div>
      </div>

      {/* Expenses Table */}
      <DataTable
        columns={columns}
        data={expenses}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        emptyText="No expense records match criteria."
        emptySubtext="Use 'Record Expense' button to log financial outgoing entries."
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

      {/* Add Expense Modal */}
      <AddExpenseModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={fetchExpenses}
      />
    </div>
  );
}
