"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { ProjectFormModal } from "@/components/projects/project-form-modal";
import {
  Search,
  LayoutGrid,
  Plus,
  Briefcase,
  AlertTriangle,
  CheckCircle2,
  ShieldCheck,
  Sparkles,
  DollarSign,
  Filter,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { PROJECT_STAGES, PROJECT_PRIORITIES, PROJECT_STATUSES } from "@/validators/project.schema";

export default function ProjectsDatabasePage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [metrics, setMetrics] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Filters & Search
  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState("");
  const [statusFilter, setStatusFilter] = useState("");
  const [priorityFilter, setPriorityFilter] = useState("");
  const [healthFilter, setHealthFilter] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  // Modals & Drawers
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const queryParams = new URLSearchParams({
        page: String(page),
        limit: "20",
        ...(search ? { search } : {}),
        ...(stageFilter ? { stage: stageFilter } : {}),
        ...(statusFilter ? { status: statusFilter } : {}),
        ...(priorityFilter ? { priority: priorityFilter } : {}),
        ...(healthFilter ? { delayHealth: healthFilter } : {}),
      });

      const res = await fetch(`/api/v1/projects?${queryParams.toString()}`);
      const json = await res.json();
      if (json.success) {
        setProjects(json.data);
        if (json.meta) setTotalPages(json.meta.totalPages);
      }
    } catch {
      // quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMetrics = async () => {
    try {
      const res = await fetch("/api/v1/projects/metrics");
      const json = await res.json();
      if (json.success) setMetrics(json.data);
    } catch {
      // quiet handling
    }
  };

  useEffect(() => {
    fetchProjects();
    fetchMetrics();
  }, [page, stageFilter, statusFilter, priorityFilter, healthFilter]);

  useEffect(() => {
    const timer = setTimeout(() => {
      setPage(1);
      fetchProjects();
    }, 300);
    return () => clearTimeout(timer);
  }, [search]);

  const handleRowClick = (proj: any) => {
    setSelectedProjectId(proj.id);
    setIsWorkspaceOpen(true);
  };

  const resetFilters = () => {
    setSearch("");
    setStageFilter("");
    setStatusFilter("");
    setPriorityFilter("");
    setHealthFilter("");
    setPage(1);
  };

  const columns = [
    {
      header: "Project ID",
      accessorKey: "referenceNo" as const,
      cell: (row: any) => (
        <span className="font-mono text-xs font-bold text-slate-900">{row.referenceNo}</span>
      ),
    },
    {
      header: "Project Title",
      accessorKey: "title" as const,
      cell: (row: any) => (
        <div>
          <span className="font-semibold text-slate-900 block leading-tight">{row.title}</span>
          <span className="text-[10px] text-slate-400">
            {row.client?.fullName || "—"} • {row.city || "Hyderabad"}
          </span>
        </div>
      ),
    },
    {
      header: "Execution Stage",
      accessorKey: "stage" as const,
      cell: (row: any) => {
        const stageStr = row.stage || "CONFIRMATION_FEE_PAID";
        return (
          <div className="flex flex-col">
            <Badge variant={stageStr === "PROJECT_COMPLETED" ? "completed" : "active"}>
              {stageStr.replace(/_/g, " ")}
            </Badge>
            <span className="text-[9px] text-slate-400 font-mono mt-0.5">{row.progressPct || 0}% complete</span>
          </div>
        );
      },
    },
    {
      header: "Priority",
      accessorKey: "priority" as const,
      cell: (row: any) => {
        const priority = row.priority || "MEDIUM";
        const variant =
          priority === "URGENT" || priority === "HIGH"
            ? "danger"
            : priority === "LOW"
            ? "neutral"
            : "pending";
        return <Badge variant={variant}>{priority}</Badge>;
      },
    },
    {
      header: "Schedule Health",
      accessorKey: "delayHealth" as const,
      cell: (row: any) => {
        const health = row.delayHealth || "ON_TRACK";
        const variant =
          health === "DELAYED"
            ? "danger"
            : health === "AT_RISK"
            ? "pending"
            : "completed";
        return (
          <div>
            <Badge variant={variant}>{health.replace(/_/g, " ")}</Badge>
            {row.daysDelayed > 0 && (
              <span className="text-[9px] text-rose-600 block font-mono">+{row.daysDelayed}d past target</span>
            )}
          </div>
        );
      },
    },
    {
      header: "Contract Value",
      accessorKey: "totalBudget" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-bold text-slate-900 text-xs">
          {row.contractValue !== null && row.contractValue !== undefined
            ? formatCurrency(row.revisedBudget || row.contractValue)
            : "—"}
        </span>
      ),
    },
    {
      header: "Target Completion",
      accessorKey: "targetDate" as const,
      cell: (row: any) => (
        <span className="text-[11px] text-slate-500 font-mono">
          {row.targetCompletionDate || row.targetDate ? formatDate(row.targetCompletionDate || row.targetDate) : "TBD"}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* Page Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Project Operations</h1>
          <p className="text-xs text-slate-500 mt-0.5">
            Production 13-stage execution ledger, milestone controls & project workspace
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/projects/pipeline">
            <Button variant="outline" size="sm" leftIcon={<LayoutGrid className="w-3.5 h-3.5" />}>
              Pipeline Board
            </Button>
          </Link>
          <Button size="sm" onClick={() => setIsCreateModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
            New Project
          </Button>
        </div>
      </div>

      {/* Top KPI Metrics Cards */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-6 gap-3">
          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Projects</span>
            <div className="text-lg font-bold text-slate-900 tabular-nums mt-1">{metrics.totalProjects}</div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Active Executing</span>
            <div className="text-lg font-bold text-emerald-600 tabular-nums mt-1">{metrics.activeProjects}</div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Delayed / Overdue</span>
            <div className={`text-lg font-bold tabular-nums mt-1 ${metrics.delayedProjects > 0 ? "text-rose-600" : "text-slate-900"}`}>
              {metrics.delayedProjects}
            </div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">QC In Progress</span>
            <div className="text-lg font-bold text-amber-600 tabular-nums mt-1">{metrics.qualityPendingProjects}</div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">In Warranty</span>
            <div className="text-lg font-bold text-indigo-600 tabular-nums mt-1">{metrics.warrantyProjects}</div>
          </div>

          <div className="p-3.5 bg-white border border-slate-200 rounded-xl shadow-subtle flex flex-col justify-between">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Contract Value</span>
            <div className="text-sm font-bold text-slate-900 tabular-nums mt-1 truncate">
              {metrics.totalContractValue !== null ? formatCurrency(metrics.totalContractValue) : "Restricted"}
            </div>
          </div>
        </div>
      )}

      {/* Filter Toolbar */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-subtle flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <div className="relative flex-1">
            <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by Project ID, Title, Client, Location..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            />
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex items-center gap-2 text-xs flex-wrap">
          <select
            value={stageFilter}
            onChange={(e) => setStageFilter(e.target.value)}
            className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 text-xs"
          >
            <option value="">All Execution Stages</option>
            {PROJECT_STAGES.map((st) => (
              <option key={st} value={st}>
                {st.replace(/_/g, " ")}
              </option>
            ))}
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 text-xs"
          >
            <option value="">All Statuses</option>
            {PROJECT_STATUSES.map((s) => (
              <option key={s} value={s}>
                {s}
              </option>
            ))}
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 text-xs"
          >
            <option value="">All Priorities</option>
            {PROJECT_PRIORITIES.map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>

          <select
            value={healthFilter}
            onChange={(e) => setHealthFilter(e.target.value)}
            className="h-8 px-2 bg-slate-50 border border-slate-200 rounded-md font-medium text-slate-700 text-xs"
          >
            <option value="">All Health States</option>
            <option value="ON_TRACK">On Track</option>
            <option value="AT_RISK">At Risk</option>
            <option value="DELAYED">Delayed</option>
          </select>

          {(search || stageFilter || statusFilter || priorityFilter || healthFilter) && (
            <Button variant="outline" size="sm" onClick={resetFilters}>
              Reset
            </Button>
          )}
        </div>
      </div>

      {/* Project Table */}
      <DataTable
        columns={columns}
        data={projects}
        keyExtractor={(r) => r.id}
        isLoading={isLoading}
        onRowClick={handleRowClick}
      />

      {/* Pagination Controls */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-2 py-2 text-xs text-slate-500">
          <span>
            Page {page} of {totalPages}
          </span>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              size="sm"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* Project Workspace Drawer */}
      <ProjectWorkspace
        projectId={selectedProjectId}
        isOpen={isWorkspaceOpen}
        onClose={() => {
          setIsWorkspaceOpen(false);
          setSelectedProjectId(null);
        }}
        onUpdate={() => {
          fetchProjects();
          fetchMetrics();
        }}
      />

      {/* Create Project Modal */}
      <ProjectFormModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => {
          fetchProjects();
          fetchMetrics();
        }}
      />
    </div>
  );
}
