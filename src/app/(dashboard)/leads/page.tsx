"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/table";
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
  BarChart3,
  PhoneCall,
  UserX,
  Filter,
  RefreshCw,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function LeadsPage() {
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
        limit: "25",
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

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "NEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
            New
          </span>
        );
      case "CONTACTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            Contacted
          </span>
        );
      case "NOT_CONTACTED":
      case "NON_CONTACTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Non Contacted
          </span>
        );
      case "FOLLOW_UP_SCHEDULED":
      case "FOLLOW_UP":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-500" />
            Follow-up
          </span>
        );
      case "SITE_VISIT_SCHEDULED":
      case "SITE_VISIT_COMPLETED":
      case "SITE_VISIT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Compass className="w-3 h-3 text-purple-500" />
            Site Visit
          </span>
        );
      case "QUOTATION_IN_PROGRESS":
      case "QUOTATION_SENT":
      case "ESTIMATE_SENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            Quotation
          </span>
        );
      case "NEGOTIATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
            <span className="w-1.5 h-1.5 rounded-full bg-violet-500"></span>
            Negotiation
          </span>
        );
      case "WON":
      case "PROJECT_CREATED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            Won
          </span>
        );
      case "LOST":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <span className="w-1.5 h-1.5 rounded-full bg-rose-500"></span>
            Lost
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            Cancelled
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            {status}
          </span>
        );
    }
  };

  const columns: any[] = [
    {
      header: "Lead ID",
      accessorKey: "referenceNo",
      cell: (row: any) => (
        <span className="font-mono text-xs font-bold text-slate-900 tracking-tight">
          {row.referenceNo}
        </span>
      ),
    },
    {
      header: "Customer",
      accessorKey: "clientName",
      cell: (row: any) => (
        <div>
          <span className="font-semibold text-slate-900 block leading-tight">{row.clientName}</span>
          <span className="text-[11px] text-slate-400 font-mono">{row.phone}</span>
        </div>
      ),
    },
    {
      header: "Source",
      accessorKey: "sourceKey",
      cell: (row: any) => (
        <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">
          {row.sourceKey || "Website"}
        </span>
      ),
    },
    {
      header: "Location",
      accessorKey: "location",
      cell: (row: any) => (
        <span className="text-xs text-slate-700 font-medium">{row.location || "Bengaluru"}</span>
      ),
    },
    {
      header: "Requirement",
      accessorKey: "requirement",
      cell: (row: any) => (
        <div>
          <span className="text-xs font-medium text-slate-800 block leading-tight">
            {row.requirement || "Residential Interior"}
          </span>
          <span className="text-[10px] text-slate-400 font-mono">
            {row.propertyTypeKey || "VILLA_INTERIOR"}
          </span>
        </div>
      ),
    },
    {
      header: "Status",
      accessorKey: "stage",
      cell: (row: any) => getStatusBadge(row.stage || "NEW"),
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* PAGE TITLE & ACTIONS */}
      <div className="flex items-center justify-between pb-3 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Leads</h1>
          <p className="text-xs text-slate-500 mt-0.5">Manage client inquiries and sales pipeline</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leads/pipeline">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<LayoutGrid className="w-3.5 h-3.5 text-slate-500" />}
              className="text-xs h-8"
            >
              Pipeline Board
            </Button>
          </Link>
          <Button
            variant="primary"
            size="sm"
            leftIcon={<Plus className="w-3.5 h-3.5" />}
            onClick={() => setIsAddModalOpen(true)}
            className="text-xs h-8 bg-emerald-600 hover:bg-emerald-700 text-white"
          >
            Add Lead
          </Button>
        </div>
      </div>

      {/* DASHBOARD SUMMARY CARDS (4 PRIMARY CARDS) */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3.5">
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Total Leads
            </span>
            <Users className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-bold text-slate-900 font-mono">
            {metrics?.totalLeads ?? (isLoading ? "..." : leads.length)}
          </div>
          <span className="text-[11px] text-slate-400 block">All recorded system inquiries</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Active Pipeline
            </span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-bold text-emerald-700 font-mono">
            {metrics?.activeLeads ?? (isLoading ? "..." : "0")}
          </div>
          <span className="text-[11px] text-slate-400 block">In-progress sales qualifications</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Contacted Leads
            </span>
            <PhoneCall className="w-4 h-4 text-sky-500" />
          </div>
          <div className="text-2xl font-bold text-sky-700 font-mono">
            {metrics?.contactedLeads ?? (isLoading ? "..." : "0")}
          </div>
          <span className="text-[11px] text-slate-400 block">Engaged in discovery or proposal</span>
        </div>

        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-2xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
              Non Contacted Leads
            </span>
            <UserX className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-bold text-amber-700 font-mono">
            {metrics?.nonContactedLeads ?? (isLoading ? "..." : "0")}
          </div>
          <span className="text-[11px] text-slate-400 block">Pending initial contact</span>
        </div>
      </div>

      {/* SEARCH & FILTERS BAR */}
      <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs space-y-3">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="relative flex-1 min-w-[260px]">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by Lead ID, Customer Name, Phone, Email, Location..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-md text-slate-800 placeholder:text-slate-400 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            />
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Statuses</option>
              <option value="NEW">New</option>
              <option value="CONTACTED">Contacted</option>
              <option value="NOT_CONTACTED">Non Contacted</option>
              <option value="FOLLOW_UP_SCHEDULED">Follow-up Scheduled</option>
              <option value="SITE_VISIT_SCHEDULED">Site Visit Scheduled</option>
              <option value="QUOTATION_IN_PROGRESS">Quotation In Progress</option>
              <option value="QUOTATION_SENT">Quotation Sent</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="WON">Won</option>
              <option value="LOST">Lost</option>
            </select>

            <select
              value={sourceFilter}
              onChange={(e) => {
                setSourceFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Sources</option>
              <option value="WEBSITE">Website</option>
              <option value="REFERRAL">Referral</option>
              <option value="DIRECT_VISIT">Direct Visit</option>
              <option value="WALK_IN">Walk-in</option>
              <option value="PHONE_CALL">Phone Call</option>
              <option value="SOCIAL_MEDIA">Social Media</option>
              <option value="OTHER">Other</option>
            </select>

            <select
              value={priorityFilter}
              onChange={(e) => {
                setPriorityFilter(e.target.value);
                setPage(1);
              }}
              className="text-xs bg-slate-50 border border-slate-200 rounded-md px-2.5 py-1.5 text-slate-700 focus:bg-white focus:outline-none focus:ring-1 focus:ring-emerald-500"
            >
              <option value="">All Priorities</option>
              <option value="URGENT">Urgent</option>
              <option value="HIGH">High</option>
              <option value="MEDIUM">Medium</option>
              <option value="LOW">Low</option>
            </select>

            {(search || statusFilter || sourceFilter || priorityFilter || assignedFilter) && (
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7.5 px-2 text-slate-600"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("");
                  setSourceFilter("");
                  setPriorityFilter("");
                  setAssignedFilter("");
                  setPage(1);
                }}
              >
                Clear Filters
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* LEAD LIST TABLE (Clicking row opens side drawer) */}
      <div className="bg-white rounded-lg border border-slate-200 shadow-2xs overflow-hidden">
        <DataTable
          columns={columns}
          data={leads}
          keyExtractor={(row: any) => row.id}
          isLoading={isLoading}
          onRowClick={handleRowClick}
          emptyText="No leads found"
          emptySubtext={search || statusFilter ? "Try adjusting your filters" : "Create a new lead to begin"}
        />

        {/* PAGINATION */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
              >
                Previous
              </Button>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-7"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* ADD LEAD MODAL */}
      <LeadFormModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSuccess={() => {
          setIsAddModalOpen(false);
          fetchLeads();
          fetchMetrics();
        }}
      />

      {/* LEAD DETAILS RIGHT-SIDE SLIDING DRAWER */}
      <LeadWorkspace
        leadId={selectedLeadId}
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        onUpdate={() => {
          fetchLeads();
          fetchMetrics();
        }}
      />
    </div>
  );
}
