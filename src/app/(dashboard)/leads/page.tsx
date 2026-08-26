"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { LeadFormModal } from "@/components/leads/lead-form-modal";
import { LeadWorkspace } from "@/components/leads/lead-workspace";
import {
  Plus,
  Search,
  LayoutGrid,
  Users,
  TrendingUp,
  Clock,
  Compass,
  FileCheck,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function LeadsDatabasePage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Dynamic Config states
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);

  // Filter & Search states
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [sourceFilter, setSourceFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [assignedFilter, setAssignedFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Drawers
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  const fetchCrmConfig = async () => {
    try {
      const res = await fetch("/api/v1/config/crm");
      const json = await res.json();
      if (json.success) {
        setPipelineStages(json.data.pipelineStages || []);
        setLeadSources(json.data.leadSources || []);
        setUsers(json.data.users || []);
      }
    } catch {
      // quiet handling
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/v1/leads/metrics");
      const json = await res.json();
      if (json.success) {
        setMetrics(json.data);
      }
    } catch {
      // quiet handling
    }
  };

  const fetchLeads = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(sourceFilter ? { source: sourceFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        ...(assignedFilter ? { assignedToId: assignedFilter } : {}),
      });

      const res = await fetch(`/api/v1/leads?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) {
        setLeads(json.data);
        if (json.meta) setTotalPages(json.meta.totalPages);
      }
    } catch {
      // quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCrmConfig();
    fetchMetrics();
  }, []);

  useEffect(() => {
    fetchLeads();
  }, [page, statusFilter, sourceFilter, priorityFilter, assignedFilter]);

  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchLeads();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRowClick = (lead: any) => {
    setSelectedLeadId(lead.id);
    setIsWorkspaceOpen(true);
  };

  const getPriorityBadgeClass = (p?: string) => {
    switch (p) {
      case "URGENT":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "MEDIUM":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  const columns = [
    {
      header: "Lead Ref",
      accessorKey: "referenceNo" as const,
      cell: (row: any) => (
        <span className="font-mono text-xs font-bold text-slate-900">{row.referenceNo}</span>
      ),
    },
    {
      header: "Customer",
      accessorKey: "clientName" as const,
      cell: (row: any) => (
        <div>
          <span className="font-semibold text-slate-900 block leading-tight">{row.clientName}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.phone}</span>
        </div>
      ),
    },
    {
      header: "Property / Location",
      accessorKey: "location" as const,
      cell: (row: any) => (
        <div>
          <span className="text-xs font-medium text-slate-800 block leading-tight">{row.location || "N/A"}</span>
          <span className="text-[10px] text-slate-400">{row.propertyTypeKey || "Residential"}</span>
        </div>
      ),
    },
    {
      header: "Budget",
      accessorKey: "estimatedBudget" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-bold text-slate-900 text-xs">
          {row.estimatedBudget ? formatCurrency(row.estimatedBudget) : "TBD"}
        </span>
      ),
    },
    {
      header: "Priority",
      accessorKey: "priority" as const,
      cell: (row: any) => (
        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase border ${getPriorityBadgeClass(row.priority)}`}>
          {row.priority || "MEDIUM"}
        </span>
      ),
    },
    {
      header: "Stage",
      accessorKey: "stage" as const,
      cell: (row: any) => {
        const variant =
          row.stage === "WON"
            ? "completed"
            : row.stage === "LOST"
            ? "danger"
            : "active";
        return <Badge variant={variant}>{row.stage}</Badge>;
      },
    },
    {
      header: "Next Action",
      accessorKey: "nextFollowUp" as const,
      cell: (row: any) => {
        if (row.nextFollowUp) {
          return (
            <div className="flex items-center gap-1 text-[11px] text-indigo-700 font-medium">
              <Clock className="w-3 h-3 text-indigo-500" />
              <span>{formatDate(row.nextFollowUp.followUpDate)} ({row.nextFollowUp.type})</span>
            </div>
          );
        }
        if (row.nextSiteVisit) {
          return (
            <div className="flex items-center gap-1 text-[11px] text-purple-700 font-medium">
              <Compass className="w-3 h-3 text-purple-500" />
              <span>{formatDate(row.nextSiteVisit.visitDate)}</span>
            </div>
          );
        }
        return <span className="text-[11px] text-slate-400 italic">None scheduled</span>;
      },
    },
    {
      header: "Assigned To",
      accessorKey: "assignedTo" as const,
      cell: (row: any) => (
        <span className="text-xs text-slate-700 font-medium">
          {row.assignedTo?.fullName || "Unassigned"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leads & CRM Pipeline</h1>
          <p className="text-xs text-slate-500 mt-0.5">Enterprise lead directory, qualification tracking, and commercial conversions</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leads/pipeline">
            <Button variant="outline" size="sm" leftIcon={<LayoutGrid className="w-3.5 h-3.5" />}>
              Pipeline Board
            </Button>
          </Link>
          <Button variant="primary" size="sm" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsAddModalOpen(true)}>
            Add Lead
          </Button>
        </div>
      </div>

      {/* KPI METRIC CARDS */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Total Leads</span>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-slate-900 font-mono">{metrics.totalLeads}</span>
              <Users className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Active Pipeline</span>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-blue-700 font-mono">{metrics.activeLeads}</span>
              <TrendingUp className="w-4 h-4 text-blue-500" />
            </div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Follow-ups Due</span>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-indigo-700 font-mono">{metrics.followUpsDue}</span>
              <Clock className="w-4 h-4 text-indigo-500" />
            </div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Site Visits</span>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-purple-700 font-mono">{metrics.siteVisitsScheduled}</span>
              <Compass className="w-4 h-4 text-purple-500" />
            </div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Pipeline Value</span>
            <div className="flex items-center justify-between">
              <span className="text-sm font-bold text-slate-900 font-mono truncate">
                {formatCurrency(metrics.pipelineExpectedValue)}
              </span>
              <FileCheck className="w-4 h-4 text-slate-400" />
            </div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-lg shadow-xs space-y-1">
            <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider block">Won Conversion</span>
            <div className="flex items-center justify-between">
              <span className="text-lg font-bold text-emerald-700 font-mono">{metrics.conversionRate}%</span>
              <CheckCircle2 className="w-4 h-4 text-emerald-500" />
            </div>
          </div>
        </div>
      )}

      {/* FILTER & SEARCH TOOLBAR */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Reference, Customer Name, Phone, Email, Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            />
          </div>
        </div>

        {/* Dynamic Filters */}
        <div className="flex items-center gap-2 text-xs">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 outline-none"
          >
            <option value="">All Stages</option>
            <option value="ALL_ACTIVE">All Active Leads</option>
            {pipelineStages.map((st) => (
              <option key={st.id || st.systemKey} value={st.systemKey}>
                {st.name || st.displayName}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 outline-none"
          >
            <option value="">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="MEDIUM">Medium</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={sourceFilter}
            onChange={(e) => setSourceFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 outline-none"
          >
            <option value="">All Sources</option>
            {leadSources.map((s) => (
              <option key={s.id || s.key} value={s.key}>
                {s.name}
              </option>
            ))}
          </select>

          <select
            value={assignedFilter}
            onChange={(e) => setAssignedFilter(e.target.value)}
            className="h-8 px-2.5 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 outline-none"
          >
            <option value="">All Assignees</option>
            {users.map((u) => (
              <option key={u.id} value={u.id}>
                {u.fullName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* DATA TABLE */}
      <DataTable
        columns={columns as any}
        data={leads}
        keyExtractor={(row: any) => row.id}
        isLoading={isLoading}
        onRowClick={handleRowClick}
        emptyText="No leads found matching your criteria."
      />

      {/* Pagination Controls */}
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

      {/* CREATE LEAD MODAL */}
      <LeadFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          fetchLeads();
          fetchMetrics();
        }}
      />

      {/* LEAD PROFILE / WORKSPACE DRAWER */}
      <LeadWorkspace
        leadId={selectedLeadId}
        isOpen={isWorkspaceOpen}
        onClose={() => {
          setIsWorkspaceOpen(false);
          setSelectedLeadId(null);
        }}
        onUpdate={() => {
          fetchLeads();
          fetchMetrics();
        }}
      />
    </div>
  );
}
