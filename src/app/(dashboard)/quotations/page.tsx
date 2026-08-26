"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  FileText,
  Plus,
  Search,
  CheckCircle2,
  Clock,
  Send,
  AlertCircle,
  Eye,
  Printer,
  ChevronRight,
  Filter,
  Layers,
  ArrowUpRight,
  TrendingUp,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/components/providers/permissions-provider";

interface QuotationListItem {
  id: string;
  referenceNo: string;
  title: string;
  revision: number;
  status: string;
  subtotal: number;
  discountAmount: number;
  taxAmount: number;
  totalAmount: number;
  validityDate: string | null;
  createdAt: string;
  lead: { id: string; referenceNo: string; clientName: string; phone: string; stage: string } | null;
  client: { id: string; referenceNo: string; fullName: string; phone: string } | null;
  project: { id: string; referenceNo: string; title: string; stage: string } | null;
  createdBy: { id: string; fullName: string; email: string } | null;
  approvedBy: { id: string; fullName: string } | null;
  _count: { items: number; childRevisions: number };
}

interface Metrics {
  totalQuotations: number;
  totalDraft: number;
  totalApproved: number;
  totalActivePipeline: number;
}

export default function QuotationsPage() {
  const router = useRouter();
  const { can, isSuperAdmin, isAdmin } = usePermissions();

  const [quotations, setQuotations] = useState<QuotationListItem[]>([]);
  const [metrics, setMetrics] = useState<Metrics>({
    totalQuotations: 0,
    totalDraft: 0,
    totalApproved: 0,
    totalActivePipeline: 0,
  });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);

  const fetchQuotations = useCallback(async () => {
    try {
      setLoading(true);
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (statusFilter !== "ALL") params.set("status", statusFilter);
      params.set("page", page.toString());
      params.set("limit", "25");

      const res = await fetch(`/api/v1/quotations?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setQuotations(json.data.quotations);
        setMetrics(json.data.metrics);
        setTotalPages(json.data.pagination.totalPages);
      }
    } catch (err) {
      console.error("Failed to load quotations:", err);
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, page]);

  useEffect(() => {
    const handler = setTimeout(() => {
      fetchQuotations();
    }, 250);
    return () => clearTimeout(handler);
  }, [fetchQuotations]);

  const getStatusBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case "APPROVED":
        return "completed";
      case "SENT":
      case "READY_TO_SEND":
        return "active";
      case "INTERNAL_REVIEW":
      case "NEGOTIATION":
        return "pending";
      case "REJECTED":
      case "CANCELLED":
        return "danger";
      case "DRAFT":
      case "SUPERSEDED":
      default:
        return "neutral";
    }
  };

  const statusPills = [
    { label: "All Quotations", value: "ALL" },
    { label: "Drafts", value: "DRAFT" },
    { label: "In Review", value: "INTERNAL_REVIEW" },
    { label: "Sent / Pipeline", value: "SENT" },
    { label: "Negotiation", value: "NEGOTIATION" },
    { label: "Approved", value: "APPROVED" },
    { label: "Rejected", value: "REJECTED" },
  ];

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Section */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div>
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-emerald-50 text-emerald-700 rounded-lg border border-emerald-200">
              <FileText className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 tracking-tight">Quotations & BOQ</h1>
              <p className="text-sm text-slate-500">
                Detailed commercial estimations, itemized room-wise BOQ, and client approval workflow
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link href="/quotations/new">
            <Button className="bg-emerald-600 hover:bg-emerald-700 text-white gap-2 font-medium shadow-sm">
              <Plus className="w-4 h-4" />
              Create Quotation
            </Button>
          </Link>
        </div>
      </div>

      {/* Metrics Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Total Quotations</p>
              <h3 className="text-2xl font-bold text-slate-900 mt-1 font-mono">{metrics.totalQuotations}</h3>
              <p className="text-xs text-slate-400 mt-0.5">All versions & revisions</p>
            </div>
            <div className="p-3 bg-slate-100 text-slate-700 rounded-xl">
              <Layers className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Active Pipeline</p>
              <h3 className="text-2xl font-bold text-blue-700 mt-1 font-mono">{metrics.totalActivePipeline}</h3>
              <p className="text-xs text-blue-600 mt-0.5">Sent & Under Negotiation</p>
            </div>
            <div className="p-3 bg-blue-50 text-blue-600 rounded-xl border border-blue-100">
              <Send className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Approved Quotations</p>
              <h3 className="text-2xl font-bold text-emerald-700 mt-1 font-mono">{metrics.totalApproved}</h3>
              <p className="text-xs text-emerald-600 mt-0.5">Ready for project execution</p>
            </div>
            <div className="p-3 bg-emerald-50 text-emerald-600 rounded-xl border border-emerald-100">
              <CheckCircle2 className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>

        <Card className="border-slate-200 shadow-2xs">
          <CardContent className="p-5 flex items-center justify-between">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Draft Estimates</p>
              <h3 className="text-2xl font-bold text-amber-700 mt-1 font-mono">{metrics.totalDraft}</h3>
              <p className="text-xs text-amber-600 mt-0.5">In preparation</p>
            </div>
            <div className="p-3 bg-amber-50 text-amber-600 rounded-xl border border-amber-100">
              <Clock className="w-5 h-5" />
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filter and Search Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="relative w-full md:w-96">
            <Search className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
            <input
              type="text"
              placeholder="Search by quote #, client, lead, or project..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="w-full pl-9 pr-4 py-2 text-sm bg-slate-50 border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-colors"
            />
          </div>

          <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0">
            {statusPills.map((pill) => (
              <button
                key={pill.value}
                onClick={() => {
                  setStatusFilter(pill.value);
                  setPage(1);
                }}
                className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-all ${
                  statusFilter === pill.value
                    ? "bg-slate-900 text-white shadow-2xs"
                    : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                }`}
              >
                {pill.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Quotations Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-500">
            <div className="animate-spin w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3" />
            <p className="text-sm font-medium">Loading quotations directory...</p>
          </div>
        ) : quotations.length === 0 ? (
          <div className="p-12 text-center">
            <div className="w-12 h-12 bg-slate-100 rounded-full flex items-center justify-center mx-auto text-slate-400 mb-3">
              <FileText className="w-6 h-6" />
            </div>
            <h3 className="text-base font-semibold text-slate-800">No Quotations Found</h3>
            <p className="text-sm text-slate-500 mt-1 max-w-md mx-auto">
              {search || statusFilter !== "ALL"
                ? "No quotations match your current search or filter criteria. Try adjusting your query."
                : "No quotations have been created yet. Create your first BOQ quotation to get started."}
            </p>
            <div className="mt-4">
              <Link href="/quotations/new">
                <Button className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs gap-1.5">
                  <Plus className="w-3.5 h-3.5" />
                  Create First Quotation
                </Button>
              </Link>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  <th className="py-3.5 px-4">Quotation Ref</th>
                  <th className="py-3.5 px-4">Client / Business Context</th>
                  <th className="py-3.5 px-4">Title / Scope</th>
                  <th className="py-3.5 px-4 text-center">BOQ Items</th>
                  <th className="py-3.5 px-4 text-right">Grand Total</th>
                  <th className="py-3.5 px-4 text-center">Status</th>
                  <th className="py-3.5 px-4">Date</th>
                  <th className="py-3.5 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {quotations.map((q) => {
                  const clientName = q.client?.fullName || q.lead?.clientName || "Direct Prospect";
                  const phone = q.client?.phone || q.lead?.phone || "";

                  return (
                    <tr
                      key={q.id}
                      onClick={() => router.push(`/quotations/${q.id}`)}
                      className="hover:bg-slate-50/70 transition-colors cursor-pointer group"
                    >
                      <td className="py-4 px-4">
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-slate-900 group-hover:text-emerald-700 transition-colors">
                            {q.referenceNo}
                          </span>
                          <span className="text-2xs font-semibold px-1.5 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                            v{q.revision}
                          </span>
                        </div>
                        {q._count.childRevisions > 0 && (
                          <div className="text-2xs text-blue-600 font-medium mt-0.5">
                            {q._count.childRevisions} revision{q._count.childRevisions > 1 ? "s" : ""}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4">
                        <div className="font-medium text-slate-900">{clientName}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-2 mt-0.5">
                          {phone && <span>{phone}</span>}
                          {q.project && (
                            <span className="text-2xs bg-purple-50 text-purple-700 px-1.5 py-0.2 rounded font-medium border border-purple-200">
                              {q.project.referenceNo}
                            </span>
                          )}
                          {q.lead && !q.project && (
                            <span className="text-2xs bg-amber-50 text-amber-700 px-1.5 py-0.2 rounded font-medium border border-amber-200">
                              {q.lead.referenceNo}
                            </span>
                          )}
                        </div>
                      </td>

                      <td className="py-4 px-4 max-w-xs truncate">
                        <div className="text-slate-800 font-medium truncate">{q.title}</div>
                        <div className="text-xs text-slate-400 mt-0.5">
                          By {q.createdBy?.fullName || "System"}
                        </div>
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span className="font-mono text-xs font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
                          {q._count.items} items
                        </span>
                      </td>

                      <td className="py-4 px-4 text-right">
                        <div className="font-bold text-slate-900 font-mono text-base">
                          ₹{q.totalAmount.toLocaleString("en-IN")}
                        </div>
                        {q.discountAmount > 0 && (
                          <div className="text-2xs text-red-600 font-mono">
                            Disc: -₹{q.discountAmount.toLocaleString("en-IN")}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-center">
                        <Badge variant={getStatusBadgeVariant(q.status)}>
                          {q.status}
                        </Badge>
                      </td>

                      <td className="py-4 px-4 text-xs text-slate-500 whitespace-nowrap">
                        <div>{new Date(q.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" })}</div>
                        {q.validityDate && (
                          <div className="text-2xs text-slate-400 mt-0.5">
                            Valid: {new Date(q.validityDate).toLocaleDateString("en-IN", { day: "2-digit", month: "short" })}
                          </div>
                        )}
                      </td>

                      <td className="py-4 px-4 text-right" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1.5">
                          <Link href={`/quotations/${q.id}`}>
                            <Button variant="outline" size="sm" className="h-8 px-2.5 text-xs text-slate-700 hover:text-emerald-700">
                              <Eye className="w-3.5 h-3.5 mr-1" />
                              View
                            </Button>
                          </Link>
                          <a href={`/api/v1/quotations/${q.id}/pdf`} target="_blank" rel="noopener noreferrer">
                            <Button variant="outline" size="sm" className="h-8 px-2 text-xs text-slate-600 hover:text-slate-900">
                              <Printer className="w-3.5 h-3.5" />
                            </Button>
                          </a>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="p-4 border-t border-slate-200 flex items-center justify-between text-xs text-slate-500">
            <div>Page {page} of {totalPages}</div>
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
      </div>
    </div>
  );
}
