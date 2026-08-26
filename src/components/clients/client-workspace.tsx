"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  AlertTriangle,
  Building,
  Calendar,
  CheckCircle,
  Clock,
  CreditCard,
  DollarSign,
  FileText,
  FolderGit2,
  FolderOpen,
  Mail,
  MapPin,
  MessageSquare,
  Phone,
  Plus,
  Receipt,
  ShieldCheck,
  Tag,
  Trash2,
  TrendingUp,
  User,
  X,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface ClientWorkspaceProps {
  clientId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export function ClientWorkspace({
  clientId,
  isOpen,
  onClose,
  onUpdate,
}: ClientWorkspaceProps) {
  const [activeTab, setActiveTab] = useState<
    "overview" | "leads" | "quotations" | "projects" | "financials" | "invoices" | "expenses" | "timeline" | "notes"
  >("overview");

  const [loading, setLoading] = useState(false);
  const [profile, setProfile] = useState<any>(null);
  const [error, setError] = useState<string | null>(null);

  // Add Note Modal
  const [isAddNoteOpen, setIsAddNoteOpen] = useState(false);
  const [noteTitle, setNoteTitle] = useState("");
  const [noteContent, setNoteContent] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  const fetchProfile = async () => {
    if (!clientId) return;
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(`/api/v1/clients/${clientId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.message || "Failed to load client 360 profile");
      }
      setProfile(json.data);
    } catch (err: any) {
      setError(err.message || "Failed to load client profile");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && clientId) {
      fetchProfile();
      setActiveTab("overview");
    } else {
      setProfile(null);
    }
  }, [isOpen, clientId]);

  if (!isOpen) return null;

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteTitle.trim() || !noteContent.trim() || !clientId) return;

    setIsSubmittingNote(true);
    try {
      const res = await fetch(`/api/v1/clients/${clientId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ title: noteTitle, description: noteContent }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save note");
      }
      setNoteTitle("");
      setNoteContent("");
      setIsAddNoteOpen(false);
      fetchProfile();
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const handleToggleStatus = async () => {
    if (!profile?.client?.id) return;
    const newStatus = profile.client.status === "ACTIVE" ? "INACTIVE" : "ACTIVE";
    if (!confirm(`Are you sure you want to change client status to ${newStatus}?`)) return;

    try {
      const res = await fetch(`/api/v1/clients/${profile.client.id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to update status");
      }
      fetchProfile();
      onUpdate();
    } catch (err: any) {
      alert(err.message);
    }
  };

  const clientData = profile?.client;
  const financial = profile?.financialSummary;
  const canViewFin = financial?.canViewFinancials;

  const getStatusBadge = (st?: string) => {
    switch (st) {
      case "ACTIVE":
        return <Badge variant="active">ACTIVE</Badge>;
      case "PROSPECT":
        return <Badge variant="neutral">PROSPECT</Badge>;
      case "CUSTOMER":
        return <Badge variant="completed">CUSTOMER</Badge>;
      case "INACTIVE":
        return <Badge variant="danger">INACTIVE</Badge>;
      default:
        return <Badge variant="neutral">{st || "UNKNOWN"}</Badge>;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/60 backdrop-blur-xs flex justify-end transition-opacity">
      <div className="w-full max-w-4xl bg-white h-full shadow-2xl flex flex-col overflow-hidden animate-in slide-in-from-right duration-200">
        {/* TOP DRAWER HEADER */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 font-bold flex items-center justify-center text-sm border border-emerald-500/30">
              {clientData?.fullName ? clientData.fullName.charAt(0).toUpperCase() : "C"}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs text-emerald-400 font-bold tracking-wider">
                  {clientData?.referenceNo || "CLI-..."}
                </span>
                {getStatusBadge(clientData?.status)}
                <span className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-slate-300 border border-slate-700 font-semibold uppercase">
                  {clientData?.clientType || "INDIVIDUAL"}
                </span>
              </div>
              <h2 className="text-base font-bold text-white leading-tight">
                {clientData?.fullName || "Loading Client..."}
                {clientData?.companyName && (
                  <span className="text-slate-400 font-normal text-xs ml-2">
                    ({clientData.companyName})
                  </span>
                )}
              </h2>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={handleToggleStatus}
              className="bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700 text-xs"
            >
              {clientData?.status === "ACTIVE" ? "Deactivate" : "Activate"}
            </Button>
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white flex items-center justify-center transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* QUICK CONTACT & METRICS BAR */}
        {clientData && (
          <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between text-xs text-slate-600 gap-y-2">
            <div className="flex items-center gap-4 flex-wrap">
              <a
                href={`tel:${clientData.phone}`}
                className="flex items-center gap-1 font-semibold text-slate-800 hover:text-emerald-600"
              >
                <Phone className="w-3.5 h-3.5 text-emerald-600" />
                <span>{clientData.phone}</span>
              </a>
              {clientData.email && (
                <a
                  href={`mailto:${clientData.email}`}
                  className="flex items-center gap-1 text-slate-600 hover:text-emerald-600"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{clientData.email}</span>
                </a>
              )}
              {clientData.city && (
                <div className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{clientData.city}{clientData.state ? `, ${clientData.state}` : ""}</span>
                </div>
              )}
            </div>

            {canViewFin && financial && (
              <div className="flex items-center gap-3 font-mono">
                <div className="text-right">
                  <span className="text-[10px] text-slate-400 block uppercase">Project Value</span>
                  <span className="font-bold text-slate-800 tabular-nums">
                    {formatCurrency(financial.totalProjectValue || 0)}
                  </span>
                </div>
                <div className="text-right pl-3 border-l border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Received</span>
                  <span className="font-bold text-emerald-700 tabular-nums">
                    {formatCurrency(financial.totalReceived || 0)}
                  </span>
                </div>
                <div className="text-right pl-3 border-l border-slate-200">
                  <span className="text-[10px] text-slate-400 block uppercase">Outstanding</span>
                  <span className={`font-bold tabular-nums ${(financial.totalOutstanding || 0) > 0 ? "text-rose-600" : "text-slate-700"}`}>
                    {formatCurrency(financial.totalOutstanding || 0)}
                  </span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-1 overflow-x-auto">
          {[
            { id: "overview", label: "Overview", icon: User },
            { id: "leads", label: `Leads (${profile?.leads?.length || 0})`, icon: TrendingUp },
            { id: "quotations", label: `Quotations (${profile?.quotations?.length || 0})`, icon: FileText },
            { id: "projects", label: `Projects (${profile?.projects?.length || 0})`, icon: FolderGit2 },
            ...(canViewFin
              ? [
                  { id: "financials", label: `Financials (${profile?.payments?.length || 0})`, icon: CreditCard },
                  { id: "invoices", label: `Invoices (${profile?.invoices?.length || 0})`, icon: Receipt },
                  { id: "expenses", label: `Expenses (${profile?.expenses?.length || 0})`, icon: DollarSign },
                ]
              : []),
            { id: "timeline", label: "Activity", icon: Clock },
            { id: "notes", label: `Notes (${profile?.internalNotes?.length || 0})`, icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id as any)}
                className={`py-3 px-3.5 text-xs font-semibold flex items-center gap-1.5 border-b-2 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-emerald-600 text-emerald-700 font-bold"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className={`w-3.5 h-3.5 ${isActive ? "text-emerald-600" : "text-slate-400"}`} />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* WORKSPACE TAB CONTENT BODY */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {loading ? (
            <div className="py-20 text-center text-xs text-slate-400 font-medium">
              Loading client 360° information...
            </div>
          ) : error ? (
            <div className="p-4 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700">
              {error}
            </div>
          ) : !clientData ? (
            <div className="py-20 text-center text-xs text-slate-400 font-medium">
              Client profile not found.
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Business & Tax Overview Card */}
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Building className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Corporate & Business Details</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Legal Company Name</span>
                        <span className="font-semibold text-slate-800">{clientData.companyName || "N/A (Individual)"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">GSTIN</span>
                        <span className="font-mono font-bold text-slate-800">{clientData.gstin || "Unregistered"}</span>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">PAN</span>
                        <span className="font-mono font-bold text-slate-800">{clientData.pan || "N/A"}</span>
                      </div>
                    </div>
                  </div>

                  {/* Contact & Address Card */}
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle space-y-3">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <MapPin className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Addresses & Location</span>
                    </h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Primary Address</span>
                        <p className="text-slate-700 mt-0.5">{clientData.address || "No address specified"}</p>
                        <p className="text-slate-500 text-[11px]">
                          {clientData.city} {clientData.state} {clientData.postalCode} {clientData.country}
                        </p>
                      </div>
                      <div>
                        <span className="text-slate-400 block text-[10px] uppercase font-semibold">Billing / Shipping</span>
                        <p className="text-slate-700 mt-0.5">Billing: {clientData.billingAddress || "Same as primary"}</p>
                        <p className="text-slate-500 text-[11px] mt-0.5">Shipping/Site: {clientData.shippingAddress || "Same as primary"}</p>
                      </div>
                    </div>
                  </div>

                  {/* Tags & Metadata */}
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle space-y-2">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5 border-b border-slate-100 pb-2">
                      <Tag className="w-3.5 h-3.5 text-emerald-600" />
                      <span>Tags & System Details</span>
                    </h3>
                    <div className="flex items-center gap-1.5 flex-wrap">
                      {clientData.tags ? (
                        clientData.tags.split(",").map((t: string, idx: number) => (
                          <span key={idx} className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[11px] font-medium border border-slate-200">
                            {t.trim()}
                          </span>
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">No tags assigned</span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: LEADS */}
              {activeTab === "leads" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Associated Leads ({profile.leads?.length || 0})
                    </h3>
                  </div>

                  {profile.leads && profile.leads.length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-subtle">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Reference</th>
                            <th className="p-3">Lead Name</th>
                            <th className="p-3">Stage</th>
                            <th className="p-3">Budget</th>
                            <th className="p-3">Assigned To</th>
                            <th className="p-3 text-right">Created Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {profile.leads.map((l: any) => (
                            <tr key={l.id} className="hover:bg-slate-50/80">
                              <td className="p-3 font-mono font-bold text-slate-900">{l.referenceNo}</td>
                              <td className="p-3 font-semibold text-slate-800">{l.clientName}</td>
                              <td className="p-3">
                                <Badge variant={l.stage === "WON" ? "completed" : l.stage === "LOST" ? "danger" : "active"}>
                                  {l.stage}
                                </Badge>
                              </td>
                              <td className="p-3 tabular-nums font-bold text-slate-800">
                                {l.estimatedBudget ? formatCurrency(l.estimatedBudget) : "TBD"}
                              </td>
                              <td className="p-3 text-slate-600">{l.assignedTo?.fullName || "Unassigned"}</td>
                              <td className="p-3 text-right text-slate-500">{formatDate(l.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-400">
                      No linked leads found for this client.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: QUOTATIONS */}
              {activeTab === "quotations" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Quotations & BOQ History ({profile.quotations?.length || 0})
                  </h3>

                  {profile.quotations && profile.quotations.length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-subtle">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Quotation Ref</th>
                            <th className="p-3">Title</th>
                            <th className="p-3">Revision</th>
                            <th className="p-3">Status</th>
                            <th className="p-3 text-right">Total Amount</th>
                            <th className="p-3 text-right">Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {profile.quotations.map((q: any) => (
                            <tr key={q.id} className="hover:bg-slate-50/80">
                              <td className="p-3 font-mono font-bold text-slate-900">{q.referenceNo}</td>
                              <td className="p-3 font-semibold text-slate-800">{q.title}</td>
                              <td className="p-3 font-mono font-semibold text-slate-600">V{q.revision}</td>
                              <td className="p-3">
                                <Badge variant={q.status === "APPROVED" ? "completed" : q.status === "REJECTED" ? "danger" : "active"}>
                                  {q.status}
                                </Badge>
                              </td>
                              <td className="p-3 text-right tabular-nums font-bold text-slate-900">
                                {formatCurrency(q.totalAmount)}
                              </td>
                              <td className="p-3 text-right text-slate-500">{formatDate(q.createdAt)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-400">
                      No quotations created for this client.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: PROJECTS */}
              {activeTab === "projects" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Associated Projects ({profile.projects?.length || 0})
                  </h3>

                  {profile.projects && profile.projects.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      {profile.projects.map((p: any) => (
                        <div key={p.id} className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle space-y-2">
                          <div className="flex items-center justify-between">
                            <span className="font-mono text-xs font-bold text-emerald-700">{p.referenceNo}</span>
                            <Badge variant="active">{p.stage}</Badge>
                          </div>
                          <h4 className="font-bold text-sm text-slate-900">{p.title}</h4>
                          <p className="text-xs text-slate-500">{p.siteAddress || "Site location unspecified"}</p>
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs font-mono">
                            <span className="text-slate-400">Contract Value:</span>
                            <span className="font-bold text-slate-900 tabular-nums">
                              {formatCurrency(p.revisedBudget || p.contractValue || 0)}
                            </span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-400">
                      No projects currently linked to this client.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: FINANCIALS */}
              {activeTab === "financials" && canViewFin && (
                <div className="space-y-6">
                  {/* Financial KPI Cards */}
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-subtle">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Quoted</span>
                      <span className="text-base font-bold text-slate-900 tabular-nums">
                        {formatCurrency(financial.totalQuoted || 0)}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-subtle">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Contract Value</span>
                      <span className="text-base font-bold text-slate-900 tabular-nums">
                        {formatCurrency(financial.totalProjectValue || 0)}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-subtle">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Received</span>
                      <span className="text-base font-bold text-emerald-700 tabular-nums">
                        {formatCurrency(financial.totalReceived || 0)}
                      </span>
                    </div>
                    <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-subtle">
                      <span className="text-[10px] text-slate-400 uppercase font-bold block">Total Outstanding</span>
                      <span className="text-base font-bold text-rose-600 tabular-nums">
                        {formatCurrency(financial.totalOutstanding || 0)}
                      </span>
                    </div>
                  </div>

                  {/* Project Financial Breakdowns */}
                  {financial.projectBreakdowns && financial.projectBreakdowns.length > 0 && (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-subtle space-y-2 p-4">
                      <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                        Project-Specific Financial Breakdown
                      </h4>
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Project</th>
                            <th className="p-2.5">Stage</th>
                            <th className="p-2.5 text-right">Contract</th>
                            <th className="p-2.5 text-right">Received</th>
                            <th className="p-2.5 text-right">Outstanding</th>
                            <th className="p-2.5 text-center">Progress</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {financial.projectBreakdowns.map((pb: any) => (
                            <tr key={pb.projectId}>
                              <td className="p-2.5 font-semibold text-slate-900">
                                {pb.title} <span className="font-mono text-[10px] text-slate-400">({pb.referenceNo})</span>
                              </td>
                              <td className="p-2.5"><Badge variant="active">{pb.stage}</Badge></td>
                              <td className="p-2.5 text-right tabular-nums font-bold">{formatCurrency(pb.contractValue)}</td>
                              <td className="p-2.5 text-right tabular-nums text-emerald-700 font-bold">{formatCurrency(pb.totalReceived)}</td>
                              <td className="p-2.5 text-right tabular-nums text-rose-600 font-bold">{formatCurrency(pb.totalOutstanding)}</td>
                              <td className="p-2.5 text-center font-bold text-slate-800">{pb.paymentProgressPct}%</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}

                  {/* Canonical Payments History */}
                  <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-subtle p-4 space-y-2">
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Verified Client Payments ({profile.payments?.length || 0})
                    </h4>
                    {profile.payments && profile.payments.length > 0 ? (
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-2.5">Payment Ref</th>
                            <th className="p-2.5">Date</th>
                            <th className="p-2.5">Project</th>
                            <th className="p-2.5">Method</th>
                            <th className="p-2.5">Status</th>
                            <th className="p-2.5 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {profile.payments.map((pay: any) => (
                            <tr key={pay.id}>
                              <td className="p-2.5 font-mono font-bold text-slate-900">{pay.referenceNo}</td>
                              <td className="p-2.5 text-slate-500">{formatDate(pay.paymentDate)}</td>
                              <td className="p-2.5 text-slate-700">{pay.project?.title || "Direct Payment"}</td>
                              <td className="p-2.5 uppercase text-[10px] font-bold text-slate-600">{pay.paymentMethod}</td>
                              <td className="p-2.5"><Badge variant="completed">{pay.status}</Badge></td>
                              <td className="p-2.5 text-right tabular-nums font-bold text-emerald-700">
                                {formatCurrency(pay.amount)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    ) : (
                      <p className="text-xs text-slate-400 py-4 text-center">No payment transactions recorded.</p>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: INVOICES */}
              {activeTab === "invoices" && canViewFin && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    GST Invoices ({profile.invoices?.length || 0})
                  </h3>

                  {profile.invoices && profile.invoices.length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-subtle">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Invoice Number</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Project</th>
                            <th className="p-3 text-right">Taxable</th>
                            <th className="p-3 text-right">GST</th>
                            <th className="p-3 text-right">Total Amount</th>
                            <th className="p-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {profile.invoices.map((inv: any) => (
                            <tr key={inv.id}>
                              <td className="p-3 font-mono font-bold text-slate-900">{inv.invoiceNumber}</td>
                              <td className="p-3 text-slate-500">{formatDate(inv.invoiceDate)}</td>
                              <td className="p-3 text-slate-700">{inv.project?.title || "N/A"}</td>
                              <td className="p-3 text-right tabular-nums">{formatCurrency(inv.taxableAmount)}</td>
                              <td className="p-3 text-right tabular-nums">{formatCurrency(inv.gstAmount)}</td>
                              <td className="p-3 text-right tabular-nums font-bold text-slate-900">{formatCurrency(inv.totalAmount)}</td>
                              <td className="p-3"><Badge variant="completed">{inv.status}</Badge></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-400">
                      No GST invoices issued to this client.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: PROJECT EXPENSES */}
              {activeTab === "expenses" && canViewFin && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Project-Specific Expenses ({profile.expenses?.length || 0})
                  </h3>

                  {profile.expenses && profile.expenses.length > 0 ? (
                    <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-subtle">
                      <table className="w-full text-xs text-left">
                        <thead className="bg-slate-50 text-slate-500 uppercase text-[10px] font-semibold border-b border-slate-200">
                          <tr>
                            <th className="p-3">Expense No</th>
                            <th className="p-3">Date</th>
                            <th className="p-3">Project</th>
                            <th className="p-3">Category</th>
                            <th className="p-3">Description</th>
                            <th className="p-3 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                          {profile.expenses.map((exp: any) => (
                            <tr key={exp.id}>
                              <td className="p-3 font-mono font-bold text-slate-900">{exp.expenseNo}</td>
                              <td className="p-3 text-slate-500">{formatDate(exp.expenseDate)}</td>
                              <td className="p-3 text-slate-700">{exp.project?.title}</td>
                              <td className="p-3 font-semibold text-slate-800">{exp.categoryKey}</td>
                              <td className="p-3 text-slate-600">{exp.description}</td>
                              <td className="p-3 text-right tabular-nums font-bold text-rose-700">{formatCurrency(exp.amount)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-400">
                      No project expenses recorded for this client.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 8: TIMELINE */}
              {activeTab === "timeline" && (
                <div className="space-y-4">
                  <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                    Unified Activity & Audit Trail
                  </h3>

                  {profile.timeline && profile.timeline.length > 0 ? (
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle space-y-3">
                      {profile.timeline.map((act: any) => (
                        <div key={act.id} className="flex items-start gap-3 text-xs border-b border-slate-100 last:border-0 pb-2.5 last:pb-0">
                          <div className="w-7 h-7 rounded-full bg-slate-100 text-slate-600 flex items-center justify-center font-bold shrink-0 mt-0.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center justify-between">
                              <span className="font-semibold text-slate-900">{act.title}</span>
                              <span className="text-[10px] text-slate-400">{formatDate(act.createdAt)}</span>
                            </div>
                            {act.description && <p className="text-slate-600 text-[11px] mt-0.5">{act.description}</p>}
                            <span className="text-[10px] text-slate-400 block mt-0.5">By {act.actorName}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-400">
                      No activity recorded for this client yet.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 9: NOTES */}
              {activeTab === "notes" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                      <ShieldCheck className="w-3.5 h-3.5 text-amber-600" />
                      <span>Internal Notes (Strictly Confidential)</span>
                    </h3>
                    <Button size="sm" onClick={() => setIsAddNoteOpen(true)} className="text-xs">
                      <Plus className="w-3 h-3 mr-1" /> Add Note
                    </Button>
                  </div>

                  {isAddNoteOpen && (
                    <form onSubmit={handleAddNote} className="bg-white p-4 rounded-lg border border-slate-200 shadow-subtle space-y-3">
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Note Title</label>
                        <Input
                          value={noteTitle}
                          onChange={(e) => setNoteTitle(e.target.value)}
                          placeholder="e.g. Communication preference"
                          required
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Note Details</label>
                        <textarea
                          rows={3}
                          value={noteContent}
                          onChange={(e) => setNoteContent(e.target.value)}
                          placeholder="Notes will only be visible to internal staff and never in customer PDFs."
                          className="w-full p-2.5 bg-slate-50 border border-slate-200 rounded-md text-xs text-slate-800 outline-none focus:border-emerald-500"
                          required
                        />
                      </div>
                      <div className="flex justify-end gap-2">
                        <Button type="button" size="sm" variant="outline" onClick={() => setIsAddNoteOpen(false)}>
                          Cancel
                        </Button>
                        <Button type="submit" size="sm" disabled={isSubmittingNote}>
                          {isSubmittingNote ? "Saving..." : "Save Note"}
                        </Button>
                      </div>
                    </form>
                  )}

                  {profile.internalNotes && profile.internalNotes.length > 0 ? (
                    <div className="space-y-3">
                      {profile.internalNotes.map((n: any) => (
                        <div key={n.id} className="bg-white p-4 rounded-lg border border-amber-200/60 shadow-subtle space-y-1">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-1.5">
                              <span className="px-1.5 py-0.5 bg-amber-50 text-amber-800 border border-amber-200 rounded text-[9px] font-bold uppercase">
                                INTERNAL
                              </span>
                              <span className="font-bold text-slate-900 text-xs">{n.title}</span>
                            </div>
                            <span className="text-[10px] text-slate-400">{formatDate(n.createdAt)}</span>
                          </div>
                          <p className="text-xs text-slate-700 whitespace-pre-wrap">{n.description}</p>
                          <span className="text-[10px] text-slate-400 block pt-1">Recorded by {n.author}</span>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-lg border border-slate-200 text-center text-xs text-slate-400">
                      No internal notes recorded yet.
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
