"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  X,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Tag,
  FolderKanban,
  Plus,
  Compass,
  FileText,
  UserCheck,
  CheckCircle2,
  AlertCircle,
  Clock,
} from "lucide-react";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import { LOSS_REASONS, FOLLOW_UP_TYPES } from "@/validators/lead.schema";

interface LeadWorkspaceProps {
  leadId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const LeadWorkspace: React.FC<LeadWorkspaceProps> = ({
  leadId,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [data, setData] = useState<any>(null);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"overview" | "timeline" | "followups" | "sitevisits" | "quotation" | "project">("overview");

  // Follow-up modal state
  const [isFollowUpModalOpen, setIsFollowUpModalOpen] = useState(false);
  const [followUpDate, setFollowUpDate] = useState("");
  const [followUpType, setFollowUpType] = useState("CALL");
  const [followUpNotes, setFollowUpNotes] = useState("");
  const [isSchedulingFollowUp, setIsSchedulingFollowUp] = useState(false);

  // Complete follow-up modal state
  const [completingFollowUpId, setCompletingFollowUpId] = useState<string | null>(null);
  const [followUpOutcomeNotes, setFollowUpOutcomeNotes] = useState("");
  const [isCompletingFollowUp, setIsCompletingFollowUp] = useState(false);

  // Site visit modal state
  const [isSiteVisitModalOpen, setIsSiteVisitModalOpen] = useState(false);
  const [visitDate, setVisitDate] = useState("");
  const [visitLocation, setVisitLocation] = useState("");
  const [visitNotes, setVisitNotes] = useState("");
  const [isSchedulingSiteVisit, setIsSchedulingSiteVisit] = useState(false);

  // Complete site visit modal state
  const [completingSiteVisitId, setCompletingSiteVisitId] = useState<string | null>(null);
  const [visitOutcomeNotes, setVisitOutcomeNotes] = useState("");
  const [isCompletingSiteVisit, setIsCompletingSiteVisit] = useState(false);

  // Status Change state
  const [selectedStatus, setSelectedStatus] = useState("");
  const [lossReason, setLossReason] = useState("BUDGET");
  const [reopenReason, setReopenReason] = useState("");
  const [isChangingStatus, setIsChangingStatus] = useState(false);

  // Conversion state
  const [isConverting, setIsConverting] = useState(false);

  const fetchLeadDetails = async () => {
    if (!leadId) return;
    setIsLoading(true);
    setError("");
    try {
      const [leadRes, configRes] = await Promise.all([
        fetch(`/api/v1/leads/${leadId}`),
        fetch("/api/v1/config/crm"),
      ]);

      const leadJson = await leadRes.json();
      const configJson = await configRes.json();

      if (leadJson.success) {
        setData(leadJson.data);
        setSelectedStatus(leadJson.data.lead.stage || leadJson.data.lead.status);
      } else {
        setError(leadJson.error?.message || "Failed to load lead details");
      }

      if (configJson.success) {
        setPipelineStages(configJson.data.pipelineStages || []);
      }
    } catch {
      setError("Network error loading lead workspace");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen && leadId) fetchLeadDetails();
  }, [isOpen, leadId]);

  if (!isOpen || !leadId) return null;

  const lead = data?.lead;
  const timeline = data?.timeline || [];

  const handleStatusChange = async () => {
    if (!selectedStatus || selectedStatus === lead?.stage) return;
    setIsChangingStatus(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/v1/leads/${leadId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: selectedStatus,
          lossReason: selectedStatus === "LOST" ? lossReason : undefined,
          reopenReason: lead?.stage === "LOST" && selectedStatus !== "LOST" ? reopenReason : undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to change lead status");
        return;
      }

      setSuccessMsg(`Status updated to ${selectedStatus}`);
      await fetchLeadDetails();
      onUpdate();
    } catch {
      setError("Network error updating status");
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleScheduleFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!followUpDate) return;
    setIsSchedulingFollowUp(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/leads/${leadId}/follow-ups`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          followUpDate,
          type: followUpType,
          notes: followUpNotes || "Follow-up",
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to schedule follow up");
        return;
      }

      setIsFollowUpModalOpen(false);
      setFollowUpNotes("");
      await fetchLeadDetails();
      onUpdate();
    } catch {
      setError("Network error scheduling follow-up");
    } finally {
      setIsSchedulingFollowUp(false);
    }
  };

  const handleCompleteFollowUp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingFollowUpId || !followUpOutcomeNotes) return;
    setIsCompletingFollowUp(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/leads/${leadId}/follow-ups/${completingFollowUpId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomeNotes: followUpOutcomeNotes }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to complete follow up");
        return;
      }

      setCompletingFollowUpId(null);
      setFollowUpOutcomeNotes("");
      await fetchLeadDetails();
      onUpdate();
    } catch {
      setError("Network error completing follow-up");
    } finally {
      setIsCompletingFollowUp(false);
    }
  };

  const handleScheduleSiteVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!visitDate) return;
    setIsSchedulingSiteVisit(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/leads/${leadId}/site-visits`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          visitDate,
          location: visitLocation || lead?.location || null,
          notes: visitNotes || null,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to schedule site visit");
        return;
      }

      setIsSiteVisitModalOpen(false);
      setVisitNotes("");
      await fetchLeadDetails();
      onUpdate();
    } catch {
      setError("Network error scheduling site visit");
    } finally {
      setIsSchedulingSiteVisit(false);
    }
  };

  const handleCompleteSiteVisit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!completingSiteVisitId || !visitOutcomeNotes) return;
    setIsCompletingSiteVisit(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/leads/${leadId}/site-visits/${completingSiteVisitId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ outcomeNotes: visitOutcomeNotes }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to complete site visit");
        return;
      }

      setCompletingSiteVisitId(null);
      setVisitOutcomeNotes("");
      await fetchLeadDetails();
      onUpdate();
    } catch {
      setError("Network error completing site visit");
    } finally {
      setIsCompletingSiteVisit(false);
    }
  };

  const handleConvertToProject = async () => {
    if (!confirm(`Are you sure you want to convert Lead ${lead.referenceNo} into an active Project?`)) return;
    setIsConverting(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/leads/${leadId}/convert`, { method: "POST" });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Lead conversion failed.");
        return;
      }

      await fetchLeadDetails();
      onUpdate();
    } catch {
      setError("Network error during project conversion");
    } finally {
      setIsConverting(false);
    }
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

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end select-none">
      <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity" onClick={onClose} />

      <div className="relative w-full max-w-4xl bg-white shadow-2xl border-l border-slate-200 z-10 flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* WORKSPACE HEADER */}
        <div className="px-6 py-4 border-b border-slate-200 bg-slate-50/80 flex items-start justify-between shrink-0">
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-lg font-bold text-slate-900">{lead?.clientName || "Loading..."}</h2>
              <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-white text-slate-700 rounded border border-slate-200">
                {lead?.referenceNo}
              </span>
              <span className={`text-[11px] font-bold px-2 py-0.5 rounded border uppercase ${getPriorityBadgeClass(lead?.priority)}`}>
                {lead?.priority || "MEDIUM"}
              </span>
              <Badge variant={lead?.stage === "WON" ? "completed" : lead?.stage === "LOST" ? "danger" : "active"}>
                {lead?.stage}
              </Badge>
            </div>
            <div className="flex items-center gap-4 text-xs text-slate-500 mt-1">
              <span className="flex items-center gap-1 font-mono">
                <Phone className="w-3.5 h-3.5 text-slate-400" /> {lead?.phone}
              </span>
              {lead?.email && (
                <span className="flex items-center gap-1">
                  <Mail className="w-3.5 h-3.5 text-slate-400" /> {lead?.email}
                </span>
              )}
              {lead?.location && (
                <span className="flex items-center gap-1">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" /> {lead?.location}
                </span>
              )}
            </div>
          </div>

          <button onClick={onClose} className="p-1.5 rounded-md text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-3 p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 font-semibold flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0" />
            {error}
          </div>
        )}

        {successMsg && (
          <div className="mx-6 mt-3 p-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-700 font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 shrink-0" />
            {successMsg}
          </div>
        )}

        {/* PRIMARY ACTIONS & STATUS STRIP */}
        <div className="px-6 py-3 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          {/* Status Change Selector */}
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">Pipeline Stage:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-md font-semibold text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
            >
              {pipelineStages.map((st) => (
                <option key={st.id || st.systemKey} value={st.systemKey}>
                  {st.name || st.displayName}
                </option>
              ))}
            </select>

            {selectedStatus === "LOST" && (
              <select
                value={lossReason}
                onChange={(e) => setLossReason(e.target.value)}
                className="h-8 px-2 text-xs bg-rose-50 border border-rose-300 rounded-md font-bold text-rose-700"
              >
                {LOSS_REASONS.map((lr) => (
                  <option key={lr} value={lr}>
                    {lr}
                  </option>
                ))}
              </select>
            )}

            {lead?.stage === "LOST" && selectedStatus !== "LOST" && (
              <input
                type="text"
                placeholder="Reason for reopening..."
                value={reopenReason}
                onChange={(e) => setReopenReason(e.target.value)}
                className="h-8 px-2.5 text-xs bg-white border border-slate-300 rounded-md w-44"
              />
            )}

            {selectedStatus !== lead?.stage && (
              <Button size="sm" variant="primary" onClick={handleStatusChange} isLoading={isChangingStatus}>
                Update Stage
              </Button>
            )}
          </div>

          {/* Quick Hub Actions */}
          <div className="flex items-center gap-2">
            <Link
              href={`/quotations/new?leadId=${lead?.id}`}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-md bg-emerald-600 text-white hover:bg-emerald-700 shadow-sm transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Create Quotation
            </Link>

            <Button
              size="sm"
              variant="outline"
              leftIcon={<Compass className="w-3.5 h-3.5 text-purple-600" />}
              onClick={() => setIsSiteVisitModalOpen(true)}
            >
              Site Visit
            </Button>

            <Button
              size="sm"
              variant="outline"
              leftIcon={<Calendar className="w-3.5 h-3.5 text-indigo-600" />}
              onClick={() => setIsFollowUpModalOpen(true)}
            >
              Follow-up
            </Button>

            {lead?.project ? (
              <Badge variant="completed" showDot>
                Project #{lead.project.referenceNo}
              </Badge>
            ) : lead?.stage === "WON" && (
              <Button
                size="sm"
                variant="primary"
                leftIcon={<FolderKanban className="w-3.5 h-3.5" />}
                onClick={handleConvertToProject}
                isLoading={isConverting}
              >
                Convert to Project
              </Button>
            )}
          </div>
        </div>

        {/* WORKSPACE NAVIGATION TABS */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6 text-xs font-bold shrink-0">
          <button
            onClick={() => setActiveTab("overview")}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "overview" ? "border-emerald-600 text-emerald-700 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Overview & Details
          </button>
          <button
            onClick={() => setActiveTab("timeline")}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "timeline" ? "border-emerald-600 text-emerald-700 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Timeline ({timeline.length})
          </button>
          <button
            onClick={() => setActiveTab("followups")}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "followups" ? "border-emerald-600 text-emerald-700 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Follow-ups ({lead?.followUps?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("sitevisits")}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "sitevisits" ? "border-emerald-600 text-emerald-700 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Site Visits ({lead?.siteVisits?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("quotation")}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "quotation" ? "border-emerald-600 text-emerald-700 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Quotations ({lead?.quotations?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("project")}
            className={`py-3 border-b-2 transition-colors cursor-pointer ${
              activeTab === "project" ? "border-emerald-600 text-emerald-700 font-bold" : "border-transparent text-slate-500 hover:text-slate-800"
            }`}
          >
            Project & Client
          </button>
        </div>

        {/* WORKSPACE BODY CONTENT */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {isLoading ? (
            <div className="py-16 text-center text-xs text-slate-400">Loading Lead Workspace...</div>
          ) : activeTab === "overview" ? (
            <div className="space-y-5">
              {/* Property & Commercial Grid */}
              <div className="grid grid-cols-2 gap-4">
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Property Information</h4>
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <p><span className="font-semibold text-slate-500">Property Type:</span> {lead?.propertyTypeKey || lead?.propertyType || "N/A"}</p>
                    <p><span className="font-semibold text-slate-500">Location:</span> {lead?.location || lead?.propertyLocation || "N/A"}</p>
                    <p><span className="font-semibold text-slate-500">Requirements:</span> {lead?.requirement || "Standard Interior"}</p>
                  </div>
                </div>

                <div className="p-4 bg-slate-50 border border-slate-200 rounded-lg space-y-2">
                  <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Commercial & Ownership</h4>
                  <div className="text-xs space-y-1.5 text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-500">Budget / Expected:</span>{" "}
                      <span className="font-mono font-bold text-slate-900">
                        {lead?.estimatedBudget ? formatCurrency(lead.estimatedBudget) : "TBD"}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-500">Lead Source:</span>{" "}
                      <span className="px-2 py-0.5 bg-white border border-slate-200 rounded font-mono text-[10px] font-bold">
                        {lead?.sourceKey || lead?.source}
                      </span>
                    </p>
                    <p>
                      <span className="font-semibold text-slate-500">Assigned Staff:</span>{" "}
                      <span className="font-medium text-slate-900">{lead?.assignedTo?.fullName || "Unassigned"}</span>
                    </p>
                  </div>
                </div>
              </div>

              {/* Requirements & Notes */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-1.5 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Requirements & Notes</h4>
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap">
                  {lead?.notes || "No additional requirement notes recorded for this lead."}
                </p>
              </div>

              {/* Tags */}
              {lead?.tags && (
                <div className="flex items-center gap-2">
                  <Tag className="w-3.5 h-3.5 text-slate-400" />
                  <div className="flex flex-wrap gap-1.5">
                    {lead.tags.split(",").map((t: string, i: number) => (
                      <span key={i} className="px-2.5 py-0.5 bg-slate-100 border border-slate-200 text-slate-700 rounded text-[11px] font-semibold">
                        {t.trim()}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ) : activeTab === "timeline" ? (
            <div className="space-y-4">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Chronological Event Timeline</h4>
              <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200 pl-6">
                {timeline.map((item: any) => (
                  <div key={item.id} className="relative">
                    <span className="absolute -left-6 top-1.5 w-2 h-2 rounded-full bg-emerald-500 ring-4 ring-white" />
                    <div className="p-3 bg-slate-50 border border-slate-200 rounded-lg text-xs space-y-0.5">
                      <div className="flex items-center justify-between">
                        <span className="font-bold text-slate-900">{item.title}</span>
                        <span className="text-[10px] text-slate-400 font-mono">{formatRelativeTime(item.createdAt)}</span>
                      </div>
                      {item.description && <p className="text-slate-600">{item.description}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ) : activeTab === "followups" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Follow-up Schedules</h4>
                <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsFollowUpModalOpen(true)}>
                  Schedule Follow-up
                </Button>
              </div>

              <div className="space-y-2.5">
                {lead?.followUps?.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    No follow-ups recorded yet.
                  </div>
                ) : (
                  lead?.followUps?.map((f: any) => (
                    <div key={f.id} className="p-3.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs shadow-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600" />
                          <span>{formatDate(f.followUpDate || f.scheduledAt)}</span>
                          <span className="px-1.5 py-0.5 bg-indigo-50 text-indigo-700 rounded border border-indigo-200 text-[10px] font-bold">
                            {f.type}
                          </span>
                          <Badge variant={f.status === "COMPLETED" ? "completed" : f.status === "CANCELLED" ? "danger" : "pending"}>
                            {f.status}
                          </Badge>
                        </div>
                        {f.notes && <p className="text-slate-600">{f.notes}</p>}
                        {f.outcomeNotes && (
                          <p className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                            Outcome: {f.outcomeNotes}
                          </p>
                        )}
                      </div>
                      {f.status === "PENDING" && (
                        <Button size="sm" variant="outline" onClick={() => setCompletingFollowUpId(f.id)}>
                          Mark Complete
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === "sitevisits" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Site Visit Consultations</h4>
                <Button size="sm" variant="outline" leftIcon={<Plus className="w-3.5 h-3.5" />} onClick={() => setIsSiteVisitModalOpen(true)}>
                  Schedule Site Visit
                </Button>
              </div>

              <div className="space-y-2.5">
                {lead?.siteVisits?.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg bg-slate-50/50">
                    No site visits scheduled for this property yet.
                  </div>
                ) : (
                  lead?.siteVisits?.map((sv: any) => (
                    <div key={sv.id} className="p-3.5 bg-white border border-slate-200 rounded-lg flex items-center justify-between gap-3 text-xs shadow-xs">
                      <div className="space-y-1">
                        <div className="flex items-center gap-2 font-bold text-slate-900">
                          <Compass className="w-3.5 h-3.5 text-purple-600" />
                          <span>{formatDate(sv.visitDate)}</span>
                          <Badge variant={sv.status === "COMPLETED" ? "completed" : sv.status === "CANCELLED" ? "danger" : "pending"}>
                            {sv.status}
                          </Badge>
                        </div>
                        {sv.location && (
                          <p className="text-slate-600 flex items-center gap-1">
                            <MapPin className="w-3 h-3 text-slate-400" /> {sv.location}
                          </p>
                        )}
                        {sv.notes && <p className="text-slate-600">{sv.notes}</p>}
                        {sv.outcomeNotes && (
                          <p className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded text-[11px] font-medium border border-emerald-200">
                            Outcome: {sv.outcomeNotes}
                          </p>
                        )}
                      </div>
                      {sv.status === "SCHEDULED" && (
                        <Button size="sm" variant="outline" onClick={() => setCompletingSiteVisitId(sv.id)}>
                          Complete Visit
                        </Button>
                      )}
                    </div>
                  ))
                )}
              </div>
            </div>
          ) : activeTab === "quotation" ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-600">Attached Quotations & BOQs</h4>
                {lead?.id && (
                  <Link
                    href={`/quotations/new?leadId=${lead.id}`}
                    className="inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1.5 rounded-md bg-emerald-600 text-white hover:bg-emerald-700 transition-colors shadow-sm"
                  >
                    <Plus className="w-3.5 h-3.5" /> Create Quotation
                  </Link>
                )}
              </div>
              {lead?.quotations?.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400 border border-slate-200 rounded-lg bg-slate-50/50">
                  No formal quotation has been generated for this lead yet.
                </div>
              ) : (
                lead?.quotations?.map((q: any) => (
                  <Link
                    key={q.id}
                    href={`/quotations/${q.id}`}
                    className="p-4 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg flex items-center justify-between text-xs shadow-xs transition-colors block cursor-pointer"
                  >
                    <div>
                      <span className="font-mono font-bold text-slate-900">{q.referenceNo}</span>
                      <span className="text-slate-500 font-mono ml-1.5">(Rev v{q.revision || 1})</span>
                      <Badge variant={q.status === "APPROVED" ? "completed" : "active"} className="ml-2.5">
                        {q.status}
                      </Badge>
                      <p className="text-[11px] text-slate-400 mt-1">{q.title}</p>
                    </div>
                    <span className="font-mono font-bold text-slate-900 text-sm">{formatCurrency(q.totalAmount)}</span>
                  </Link>
                ))
              )}
            </div>
          ) : (
            <div className="space-y-5">
              {/* Linked Project Information */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <FolderKanban className="w-4 h-4 text-emerald-600" />
                  Linked Project Status
                </h4>
                {lead?.project ? (
                  <div className="space-y-2 text-xs text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-500">Project Reference:</span>{" "}
                      <span className="font-mono font-bold text-slate-900">{lead.project.referenceNo}</span>
                    </p>
                    <p><span className="font-semibold text-slate-500">Title:</span> {lead.project.title}</p>
                    <p><span className="font-semibold text-slate-500">Stage:</span> <Badge variant="active">{lead.project.stage}</Badge></p>
                    <p>
                      <span className="font-semibold text-slate-500">Contract Value:</span>{" "}
                      <span className="font-mono font-bold text-emerald-700">{formatCurrency(lead.project.contractValue)}</span>
                    </p>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
                    Lead is not yet converted to an active Project. Mark stage as WON with approved quotation to convert.
                  </div>
                )}
              </div>

              {/* Linked Client Information */}
              <div className="p-4 bg-white border border-slate-200 rounded-lg space-y-3 shadow-xs">
                <h4 className="text-xs font-bold uppercase tracking-wider text-slate-700 flex items-center gap-1.5">
                  <UserCheck className="w-4 h-4 text-blue-600" />
                  Linked Client Account
                </h4>
                {lead?.client ? (
                  <div className="space-y-2 text-xs text-slate-700">
                    <p>
                      <span className="font-semibold text-slate-500">Client Reference:</span>{" "}
                      <span className="font-mono font-bold text-slate-900">{lead.client.referenceNo}</span>
                    </p>
                    <p><span className="font-semibold text-slate-500">Name:</span> {lead.client.fullName}</p>
                    <p><span className="font-semibold text-slate-500">Phone:</span> <span className="font-mono">{lead.client.phone}</span></p>
                  </div>
                ) : (
                  <div className="p-4 text-center text-xs text-slate-400 bg-slate-50 rounded border border-dashed border-slate-200">
                    No existing client record explicitly linked. A canonical client is created automatically upon conversion.
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SCHEDULE FOLLOW-UP MODAL */}
      {isFollowUpModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Schedule New Follow-up</h3>
            <form onSubmit={handleScheduleFollowUp} className="space-y-3">
              <Input
                label="Scheduled Date & Time *"
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                required
              />
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Type</label>
                <select
                  value={followUpType}
                  onChange={(e) => setFollowUpType(e.target.value)}
                  className="h-9 px-3 text-xs bg-white border border-slate-300 rounded-md text-slate-800 outline-none focus:ring-2 focus:ring-emerald-500"
                >
                  <option value="CALL">Phone Call</option>
                  <option value="WHATSAPP">WhatsApp</option>
                  <option value="EMAIL">Email</option>
                  <option value="MEETING">In-Person Meeting</option>
                  <option value="SITE_VISIT">Site Visit</option>
                  <option value="OTHER">Other</option>
                </select>
              </div>
              <Input
                label="Notes"
                placeholder="Follow-up objective..."
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsFollowUpModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSchedulingFollowUp}>
                  Schedule
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE FOLLOW-UP MODAL */}
      {completingFollowUpId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Complete Follow-up</h3>
            <form onSubmit={handleCompleteFollowUp} className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Outcome Notes *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record what was discussed with the client..."
                  value={followUpOutcomeNotes}
                  onChange={(e) => setFollowUpOutcomeNotes(e.target.value)}
                  className="p-2.5 text-xs bg-white border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCompletingFollowUpId(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isCompletingFollowUp}>
                  Save Outcome
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* SCHEDULE SITE VISIT MODAL */}
      {isSiteVisitModalOpen && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Schedule Site Visit Consultation</h3>
            <form onSubmit={handleScheduleSiteVisit} className="space-y-3">
              <Input
                label="Visit Date & Time *"
                type="datetime-local"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
              />
              <Input
                label="Site Location / Address"
                placeholder={lead?.location || "Site address..."}
                value={visitLocation}
                onChange={(e) => setVisitLocation(e.target.value)}
              />
              <Input
                label="Inspection Notes"
                placeholder="Key focus areas..."
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
              />
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setIsSiteVisitModalOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isSchedulingSiteVisit}>
                  Schedule Visit
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* COMPLETE SITE VISIT MODAL */}
      {completingSiteVisitId && (
        <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-xl border border-slate-200 w-full max-w-sm p-5 space-y-4">
            <h3 className="text-sm font-bold text-slate-900">Complete Site Visit Consultation</h3>
            <form onSubmit={handleCompleteSiteVisit} className="space-y-3">
              <div className="flex flex-col gap-1.5">
                <label className="text-xs font-bold text-slate-600 uppercase tracking-wider">Site Inspection Outcome *</label>
                <textarea
                  rows={3}
                  required
                  placeholder="Record measurements taken, site readiness, client preferences..."
                  value={visitOutcomeNotes}
                  onChange={(e) => setVisitOutcomeNotes(e.target.value)}
                  className="p-2.5 text-xs bg-white border border-slate-300 rounded-md outline-none focus:ring-2 focus:ring-emerald-500"
                />
              </div>
              <div className="flex justify-end gap-2 pt-2">
                <Button type="button" variant="outline" size="sm" onClick={() => setCompletingSiteVisitId(null)}>
                  Cancel
                </Button>
                <Button type="submit" variant="primary" size="sm" isLoading={isCompletingSiteVisit}>
                  Save Outcome
                </Button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
