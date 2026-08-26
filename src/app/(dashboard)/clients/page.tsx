"use client";

import React, { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ClientFormModal } from "@/components/clients/client-form-modal";
import { ClientWorkspace } from "@/components/clients/client-workspace";
import {
  AlertCircle,
  Building,
  CheckCircle,
  CreditCard,
  Filter,
  FolderGit2,
  Phone,
  Plus,
  Search,
  Tag,
  TrendingUp,
  UserCheck,
  Users,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function ClientsPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [canViewFinancials, setCanViewFinancials] = useState(false);

  // Filters State
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [cityFilter, setCityFilter] = useState("");
  const [hasActiveProjFilter, setHasActiveProjFilter] = useState<string>("ALL");
  const [hasOutstandingFilter, setHasOutstandingFilter] = useState<string>("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modal / Workspace State
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedClientId, setSelectedClientId] = useState<string | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/v1/clients/metrics");
      const json = await res.json();
      if (json.success) {
        setMetrics(json.data);
        if (json.data.canViewFinancials) {
          setCanViewFinancials(true);
        }
      }
    } catch {
      // Ignore metrics fetch error
    }
  };

  const fetchClients = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });

      if (search.trim()) params.set("search", search.trim());
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      if (typeFilter !== "ALL") params.set("clientType", typeFilter);
      if (cityFilter.trim()) params.set("city", cityFilter.trim());
      if (hasActiveProjFilter === "true") params.set("hasActiveProject", "true");
      if (hasActiveProjFilter === "false") params.set("hasActiveProject", "false");
      if (hasOutstandingFilter === "true") params.set("hasOutstanding", "true");
      if (hasOutstandingFilter === "false") params.set("hasOutstanding", "false");

      const res = await fetch(`/api/v1/clients?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setClients(json.data || []);
        setTotalPages(json.meta?.totalPages || 1);
        if (json.meta?.canViewFinancials !== undefined) {
          setCanViewFinancials(json.meta.canViewFinancials);
        }
      }
    } catch {
      // Fallback
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchMetrics();
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchClients();
    }, 250);
    return () => clearTimeout(timer);
  }, [search, statusFilter, typeFilter, cityFilter, hasActiveProjFilter, hasOutstandingFilter, page]);

  const handleRowClick = (client: any) => {
    setSelectedClientId(client.id);
    setIsWorkspaceOpen(true);
  };

  const columns = [
    {
      header: "Client ID",
      accessorKey: "referenceNo" as const,
      cell: (row: any) => (
        <span className="font-mono text-xs font-bold text-slate-900">{row.referenceNo}</span>
      ),
    },
    {
      header: "Client & Company",
      accessorKey: "fullName" as const,
      cell: (row: any) => (
        <div>
          <span className="font-semibold text-slate-900 block leading-tight">{row.fullName}</span>
          {row.companyName && (
            <span className="text-[11px] text-slate-400 font-medium">{row.companyName}</span>
          )}
        </div>
      ),
    },
    {
      header: "Contact",
      accessorKey: "phone" as const,
      cell: (row: any) => (
        <div>
          <span className="font-mono text-xs text-slate-800 block leading-tight">{row.phone}</span>
          {row.email && <span className="text-[10px] text-slate-400">{row.email}</span>}
        </div>
      ),
    },
    {
      header: "Type",
      accessorKey: "clientType" as const,
      cell: (row: any) => (
        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
          {row.clientType}
        </span>
      ),
    },
    {
      header: "Location",
      accessorKey: "city" as const,
      cell: (row: any) => (
        <span className="text-xs text-slate-700">
          {row.city ? `${row.city}${row.state ? `, ${row.state}` : ""}` : "N/A"}
        </span>
      ),
    },
    {
      header: "Projects",
      accessorKey: "projectCount" as const,
      isNumeric: true,
      cell: (row: any) => (
        <div className="text-center font-mono">
          <span className="font-bold text-slate-900">{row.projectCount}</span>
          {row.activeProjectsCount > 0 && (
            <span className="text-[10px] text-emerald-600 block">({row.activeProjectsCount} active)</span>
          )}
        </div>
      ),
    },
    ...(canViewFinancials
      ? [
          {
            header: "Total Value",
            accessorKey: "totalProjectValue" as const,
            isNumeric: true,
            cell: (row: any) => (
              <span className="tabular-nums font-bold text-slate-900 text-xs">
                {row.totalProjectValue !== null ? formatCurrency(row.totalProjectValue) : "—"}
              </span>
            ),
          },
          {
            header: "Received",
            accessorKey: "totalReceived" as const,
            isNumeric: true,
            cell: (row: any) => (
              <span className="tabular-nums font-bold text-emerald-700 text-xs">
                {row.totalReceived !== null ? formatCurrency(row.totalReceived) : "—"}
              </span>
            ),
          },
          {
            header: "Outstanding",
            accessorKey: "totalOutstanding" as const,
            isNumeric: true,
            cell: (row: any) => (
              <span
                className={`tabular-nums font-bold text-xs ${
                  (row.totalOutstanding || 0) > 0 ? "text-rose-600" : "text-slate-700"
                }`}
              >
                {row.totalOutstanding !== null ? formatCurrency(row.totalOutstanding) : "—"}
              </span>
            ),
          },
        ]
      : []),
    {
      header: "Status",
      accessorKey: "status" as const,
      cell: (row: any) => {
        const variant =
          row.status === "ACTIVE"
            ? "active"
            : row.status === "CUSTOMER"
            ? "completed"
            : row.status === "INACTIVE"
            ? "danger"
            : "neutral";
        return <Badge variant={variant}>{row.status}</Badge>;
      },
    },
  ];

  return (
    <div className="space-y-6">
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Directory & 360°</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Central repository of client contacts, corporate details, active projects, and financial histories
          </p>
        </div>
        <Button onClick={() => setIsAddModalOpen(true)} className="text-xs shadow-xs">
          <Plus className="w-4 h-4 mr-1.5" /> Add Client
        </Button>
      </div>

      {/* TOP KPI METRICS CARDS */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-emerald-50 text-emerald-600 flex items-center justify-center font-bold">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block uppercase">Total Clients</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {metrics?.totalClients || 0}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-blue-50 text-blue-600 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block uppercase">Active Clients</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {metrics?.activeClients || 0}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-purple-50 text-purple-600 flex items-center justify-center font-bold">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block uppercase">New This Month</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {metrics?.newThisMonth || 0}
            </span>
          </div>
        </div>

        <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-subtle flex items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold">
            <FolderGit2 className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[11px] text-slate-500 font-semibold block uppercase">Active Projects</span>
            <span className="text-base font-bold text-slate-900 tabular-nums">
              {metrics?.clientsWithActiveProjects || 0}
            </span>
          </div>
        </div>

        {canViewFinancials && (
          <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-subtle flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold">
              <CreditCard className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[11px] text-slate-500 font-semibold block uppercase">With Outstanding</span>
              <span className="text-base font-bold text-rose-600 tabular-nums">
                {metrics?.clientsWithOutstandingCount ?? "—"}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="p-3.5 bg-white rounded-lg border border-slate-200 shadow-subtle flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative w-full max-w-xs">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <Input
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              placeholder="Search name, phone, email, GSTIN..."
              className="pl-8 text-xs h-8 bg-slate-50 border-slate-200"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={statusFilter}
            onChange={(e) => {
              setStatusFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 outline-none"
          >
            <option value="ALL">All Statuses</option>
            <option value="ACTIVE">Active</option>
            <option value="CUSTOMER">Customer</option>
            <option value="PROSPECT">Prospect</option>
            <option value="INACTIVE">Inactive</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => {
              setTypeFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 outline-none"
          >
            <option value="ALL">All Client Types</option>
            <option value="INDIVIDUAL">Individual</option>
            <option value="BUSINESS">Business</option>
            <option value="COMMERCIAL">Commercial</option>
            <option value="RESIDENTIAL">Residential</option>
          </select>

          <select
            value={hasActiveProjFilter}
            onChange={(e) => {
              setHasActiveProjFilter(e.target.value);
              setPage(1);
            }}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 outline-none"
          >
            <option value="ALL">All Projects</option>
            <option value="true">Has Active Project</option>
            <option value="false">No Active Project</option>
          </select>

          {canViewFinancials && (
            <select
              value={hasOutstandingFilter}
              onChange={(e) => {
                setHasOutstandingFilter(e.target.value);
                setPage(1);
              }}
              className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 outline-none"
            >
              <option value="ALL">All Balances</option>
              <option value="true">Has Outstanding Balance</option>
              <option value="false">Fully Settled</option>
            </select>
          )}
        </div>
      </div>

      {/* DATA TABLE */}
      <DataTable
        columns={columns as any}
        data={clients}
        keyExtractor={(row: any) => row.id}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        emptyText="No clients found matching your search or filters."
      />

      {/* PAGINATION */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 pt-2 text-xs text-slate-500">
          <span>Page {page} of {totalPages}</span>
          <div className="flex gap-1.5">
            <Button
              size="sm"
              variant="outline"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              size="sm"
              variant="outline"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* CREATE CLIENT MODAL */}
      <ClientFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchClients();
          fetchMetrics();
        }}
      />

      {/* CLIENT 360° WORKSPACE DRAWER */}
      <ClientWorkspace
        clientId={selectedClientId}
        isOpen={isWorkspaceOpen}
        onClose={() => {
          setIsWorkspaceOpen(false);
          setSelectedClientId(null);
        }}
        onUpdate={() => {
          fetchClients();
          fetchMetrics();
        }}
      />
    </div>
  );
}
