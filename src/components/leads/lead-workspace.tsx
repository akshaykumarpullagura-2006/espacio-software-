"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
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
  Edit2,
  Trash2,
  Send,
  MessageSquare,
  DollarSign,
  Building2,
  ArrowRight,
  Sparkles,
  ExternalLink,
  ShieldCheck,
  History,
  Check,
  XCircle,
  RotateCcw,
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
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [activeTab, setActiveTab] = useState<
    "overview" | "timeline" | "followups" | "sitevisits" | "quotation" | "project"
  >("overview");

  // Inline Note states
  const [inlineNote, setInlineNote] = useState("");
  const [activeNoteStage, setActiveNoteStage] = useState<string | null>(null);
  const [isAddingNote, setIsAddingNote] = useState(false);

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

  // Confirmation Fee state
  const [isFeeModalOpen, setIsFeeModalOpen] = useState(false);
  const [feeAmount, setFeeAmount] = useState("50000");
  const [feePaymentType, setFeePaymentType] = useState("UPI");
  const [feeTransactionRef, setFeeTransactionRef] = useState("");
  const [feeNotes, setFeeNotes] = useState("");
  const [isRecordingFee, setIsRecordingFee] = useState(false);
  const [isWhatsAppSent, setIsWhatsAppSent] = useState(false);

  // Edit Lead state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isUpdatingLead, setIsUpdatingLead] = useState(false);
  const [editForm, setEditForm] = useState({
    clientName: "",
    phone: "",
    email: "",
    location: "",
    propertyTypeKey: "",
    budget: "",
    priority: "MEDIUM",
    sourceKey: "",
    tags: "",
    notes: "",
    requirement: "",
  });

  // Delete Lead state
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [isDeletingLead, setIsDeletingLead] = useState(false);

  // Conversion state
  const [isConverting, setIsConverting] = useState(false);

  // Keyboard Escape listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && isOpen) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

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
        setLeadSources(configJson.data.leadSources || []);
        setPropertyTypes(configJson.data.propertyTypes || []);
        setUsers(configJson.data.users || []);
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
  const followUps = lead?.followUps || [];
  const siteVisits = lead?.siteVisits || [];
  const quotations = lead?.quotations || [];
  const stageHistory = lead?.stageHistory || [];
  const project = lead?.project;
  const client = lead?.client;

  // Extract confirmation fee info from timeline if available
  const confirmationFeeActivity = timeline.find(
    (t: any) =>
      t.type === "PAYMENT" ||
      t.title?.toLowerCase().includes("confirmation fee") ||
      t.description?.toLowerCase().includes("confirmation fee")
  );

  const handleStatusChange = async (newStatus?: string, customLossReason?: string) => {
    const targetStatus = newStatus || selectedStatus;
    if (!targetStatus || (targetStatus === lead?.stage && !customLossReason)) return;
    setIsChangingStatus(true);
    setError("");
    setSuccessMsg("");

    try {
      const res = await fetch(`/api/v1/leads/${leadId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: targetStatus,
          lossReason: targetStatus === "LOST" ? customLossReason || lossReason : undefined,
          reopenReason:
            lead?.stage === "LOST" && targetStatus !== "LOST" ? reopenReason : undefined,
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to change lead status");
        return;
      }

      setSuccessMsg(`Status updated to ${targetStatus}`);
      setSelectedStatus(targetStatus);
      await fetchLeadDetails();
      onUpdate();
    } catch {
      setError("Network error updating status");
    } finally {
      setIsChangingStatus(false);
    }
  };

  const handleAddNote = async (cardStage?: string) => {
    if (!inlineNote.trim()) return;
    setIsAddingNote(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/leads/${leadId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          note: inlineNote,
          cardStage: cardStage || activeNoteStage || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to add note");
        return;
      }
      setInlineNote("");
      setActiveNoteStage(null);
      setSuccessMsg("Note recorded successfully");
      await fetchLeadDetails();
      onUpdate();
    } catch {
      setError("Network error adding note");
    } finally {
      setIsAddingNote(false);
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
          notes: followUpNotes || "Follow-up scheduled",
        }),
      });
      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to schedule follow up");
        return;
      }

      setIsFollowUpModalOpen(false);
      setFollowUpNotes("");
      setSuccessMsg("Follow-up scheduled");
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
      setSuccessMsg("Follow-up marked as completed");
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
      setSuccessMsg("Site visit scheduled");
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
      setSuccessMsg("Site visit marked as completed");
      await fetchLeadDetails();
      onUpdate();
    } catch {
      setError("Network error completing site visit");
    } finally {
      setIsCompletingSiteVisit(false);
    }
  };

  const handleRecordConfirmationFee = async (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(feeAmount);
    if (!amountNum || isNaN(amountNum) || amountNum <= 0) {
      setError("Please enter a valid confirmation fee amount");
      return;
    }
    setIsRecordingFee(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/leads/${leadId}/confirmation-fee`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          amount: amountNum,
          paymentType: feePaymentType,
          transactionRef: feeTransactionRef,
          notes: feeNotes,
          isPaid: true,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to record confirmation fee");
        return;
      }
      setIsFeeModalOpen(false);
      setSuccessMsg("Confirmation fee recorded successfully");
      await fetchLeadDetails();
      onUpdate();
    } catch {
      setError("Network error recording confirmation fee");
    } finally {
      setIsRecordingFee(false);
    }
  };

  const handleConvertToProject = async () => {
    setIsConverting(true);
    setError("");
    setSuccessMsg("");
    try {
      const res = await fetch(`/api/v1/leads/${leadId}/convert`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to convert lead to project");
        return;
      }
      setSuccessMsg("Lead successfully converted to Project!");
      await fetchLeadDetails();
      onUpdate();
    } catch {
      setError("Network error converting lead");
    } finally {
      setIsConverting(false);
    }
  };

  const openEditModal = () => {
    if (!lead) return;
    setEditForm({
      clientName: lead.clientName || "",
      phone: lead.phone || "",
      email: lead.email || "",
      location: lead.location || "",
      propertyTypeKey: lead.propertyTypeKey || "",
      budget: lead.estimatedBudget ? String(lead.estimatedBudget) : "",
      priority: lead.priority || "MEDIUM",
      sourceKey: lead.sourceKey || "",
      tags: lead.tags || "",
      notes: lead.notes || "",
      requirement: lead.requirement || "",
    });
    setIsEditModalOpen(true);
  };

  const handleUpdateLead = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsUpdatingLead(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientName: editForm.clientName,
          phone: editForm.phone,
          email: editForm.email || null,
          location: editForm.location || null,
          propertyTypeKey: editForm.propertyTypeKey || undefined,
          estimatedBudget: editForm.budget ? Number(editForm.budget) : null,
          priority: editForm.priority,
          sourceKey: editForm.sourceKey || undefined,
          tags: editForm.tags || null,
          requirement: editForm.requirement || null,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to update lead");
        return;
      }
      setIsEditModalOpen(false);
      setSuccessMsg("Lead updated successfully");
      await fetchLeadDetails();
      onUpdate();
    } catch {
      setError("Network error updating lead");
    } finally {
      setIsUpdatingLead(false);
    }
  };

  const handleDeleteLead = async () => {
    setIsDeletingLead(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/leads/${leadId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to delete lead");
        return;
      }
      setIsDeleteModalOpen(false);
      onClose();
      onUpdate();
    } catch {
      setError("Network error deleting lead");
    } finally {
      setIsDeletingLead(false);
    }
  };

  const getStatusBadge = (stage: string) => {
    switch (stage) {
      case "NEW":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
            NEW
          </span>
        );
      case "CONTACTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200">
            <span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>
            CONTACTED
          </span>
        );
      case "NOT_CONTACTED":
      case "NON_CONTACTED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200">
            <span className="w-1.5 h-1.5 rounded-full bg-amber-500"></span>
            NON CONTACTED
          </span>
        );
      case "FOLLOW_UP_SCHEDULED":
      case "FOLLOW_UP":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200">
            <Clock className="w-3 h-3 text-blue-500" />
            FOLLOW-UP
          </span>
        );
      case "SITE_VISIT_SCHEDULED":
      case "SITE_VISIT_COMPLETED":
      case "SITE_VISIT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200">
            <Compass className="w-3 h-3 text-purple-500" />
            SITE VISIT
          </span>
        );
      case "QUOTATION_IN_PROGRESS":
      case "QUOTATION_SENT":
      case "ESTIMATE_SENT":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-800 border border-amber-200">
            <FileText className="w-3 h-3 text-amber-600" />
            QUOTATION
          </span>
        );
      case "NEGOTIATION":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200">
            <MessageSquare className="w-3 h-3 text-violet-500" />
            NEGOTIATION
          </span>
        );
      case "WON":
      case "PROJECT_CREATED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-800 border border-emerald-300">
            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
            WON
          </span>
        );
      case "LOST":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200">
            <XCircle className="w-3 h-3 text-rose-500" />
            LOST
          </span>
        );
      case "CANCELLED":
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-300">
            CANCELLED
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-50 text-slate-700 border border-slate-200">
            {stage}
          </span>
        );
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end animate-in fade-in duration-200">
      {/* Subtle Darkened Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/35 backdrop-blur-[1px] transition-opacity cursor-pointer"
        onClick={onClose}
        aria-hidden="true"
      />

      {/* Large Sliding Right-Side Drawer (58vw-62vw on Desktop) */}
      <div className="relative w-full md:w-[60vw] lg:w-[58vw] max-w-[960px] h-full bg-white shadow-2xl flex flex-col border-l border-slate-200 z-10 animate-in slide-in-from-right duration-300 ease-out">
        {/* TOP HEADER */}
        <div className="px-6 py-4 border-b border-slate-100 bg-white flex items-start justify-between gap-4 shrink-0">
          <div className="space-y-1.5">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h2 className="text-xl font-bold text-slate-900 tracking-tight">
                {lead?.clientName || "Lead Details"}
              </h2>
              <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-xs font-mono font-semibold border border-slate-200">
                {lead?.referenceNo}
              </span>
              {lead?.priority && (
                <span
                  className={`px-2 py-0.5 rounded text-xs font-bold uppercase border ${
                    lead.priority === "URGENT"
                      ? "bg-rose-50 text-rose-700 border-rose-200"
                      : lead.priority === "HIGH"
                      ? "bg-amber-50 text-amber-700 border-amber-200"
                      : "bg-slate-50 text-slate-600 border-slate-200"
                  }`}
                >
                  {lead.priority}
                </span>
              )}
              {getStatusBadge(lead?.stage || "NEW")}
            </div>

            <div className="flex items-center gap-4 text-xs text-slate-600 flex-wrap">
              {lead?.phone && (
                <a
                  href={`tel:${lead.phone}`}
                  className="flex items-center gap-1 hover:text-emerald-700 font-mono transition-colors"
                >
                  <Phone className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lead.phone}</span>
                </a>
              )}
              {lead?.email && (
                <a
                  href={`mailto:${lead.email}`}
                  className="flex items-center gap-1 hover:text-emerald-700 transition-colors"
                >
                  <Mail className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lead.email}</span>
                </a>
              )}
              {lead?.location && (
                <span className="flex items-center gap-1 text-slate-500">
                  <MapPin className="w-3.5 h-3.5 text-slate-400" />
                  <span>{lead.location}</span>
                </span>
              )}
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
            title="Close drawer (Esc)"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* NOTIFICATIONS / ALERTS */}
        {error && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-100 flex items-center justify-between text-xs text-rose-700">
            <span className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-rose-500 shrink-0" />
              {error}
            </span>
            <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-800">
              ✕
            </button>
          </div>
        )}
        {successMsg && (
          <div className="px-6 py-2 bg-emerald-50 border-b border-emerald-100 flex items-center justify-between text-xs text-emerald-700">
            <span className="flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
              {successMsg}
            </span>
            <button onClick={() => setSuccessMsg("")} className="text-emerald-500 hover:text-emerald-800">
              ✕
            </button>
          </div>
        )}

        {/* ACTION BAR */}
        <div className="px-6 py-2.5 bg-slate-50/70 border-b border-slate-200/80 flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-slate-600 uppercase tracking-wider">
              Pipeline Stage:
            </span>
            <select
              value={selectedStatus}
              onChange={(e) => {
                const val = e.target.value;
                setSelectedStatus(val);
                handleStatusChange(val);
              }}
              disabled={isChangingStatus}
              className="text-xs font-semibold bg-white border border-slate-300 rounded-md px-2.5 py-1 text-slate-800 focus:outline-none focus:ring-1 focus:ring-emerald-500 shadow-2xs"
            >
              <option value="NEW">New Lead</option>
              <option value="CONTACTED">Contacted</option>
              <option value="NOT_CONTACTED">Non Contacted</option>
              <option value="FOLLOW_UP_SCHEDULED">Follow-up Scheduled</option>
              <option value="SITE_VISIT_SCHEDULED">Site Visit Scheduled</option>
              <option value="SITE_VISIT_COMPLETED">Site Visit Completed</option>
              <option value="QUOTATION_IN_PROGRESS">Quotation In Progress</option>
              <option value="QUOTATION_SENT">Quotation Sent</option>
              <option value="NEGOTIATION">Negotiation</option>
              <option value="WON">Won (Approved)</option>
              <option value="LOST">Lost</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 flex-wrap">
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Edit2 className="w-3.5 h-3.5 text-slate-500" />}
              onClick={openEditModal}
              className="text-xs h-7 px-2.5"
            >
              Edit
            </Button>
            <Link href={`/quotations/new?leadId=${leadId}&clientName=${encodeURIComponent(lead?.clientName || "")}&phone=${lead?.phone || ""}`}>
              <Button
                variant="primary"
                size="sm"
                leftIcon={<Plus className="w-3.5 h-3.5" />}
                className="text-xs h-7 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                Create Quotation
              </Button>
            </Link>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Compass className="w-3.5 h-3.5 text-purple-600" />}
              onClick={() => setIsSiteVisitModalOpen(true)}
              className="text-xs h-7 px-2.5 text-purple-700 hover:bg-purple-50"
            >
              Site Visit
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Clock className="w-3.5 h-3.5 text-blue-600" />}
              onClick={() => setIsFollowUpModalOpen(true)}
              className="text-xs h-7 px-2.5 text-blue-700 hover:bg-blue-50"
            >
              Follow-up
            </Button>
            <Button
              variant="outline"
              size="sm"
              leftIcon={<Trash2 className="w-3.5 h-3.5 text-rose-500" />}
              onClick={() => setIsDeleteModalOpen(true)}
              className="text-xs h-7 px-2 text-rose-600 hover:bg-rose-50 border-rose-200"
            >
              Delete
            </Button>
          </div>
        </div>

        {/* TABS NAVIGATION */}
        <div className="px-6 border-b border-slate-200 bg-white flex items-center gap-6 overflow-x-auto shrink-0 scrollbar-none">
          {[
            { key: "overview", label: "Overview & Details" },
            { key: "timeline", label: `Timeline (${timeline.length})` },
            { key: "followups", label: `Follow-ups (${followUps.length})` },
            { key: "sitevisits", label: `Site Visits (${siteVisits.length})` },
            { key: "quotation", label: `Quotations (${quotations.length})` },
            { key: "project", label: project ? "Project & Client" : "Project & Client" },
          ].map((t) => (
            <button
              key={t.key}
              onClick={() => setActiveTab(t.key as any)}
              className={`py-3 text-xs font-semibold border-b-2 whitespace-nowrap transition-colors ${
                activeTab === t.key
                  ? "border-emerald-600 text-emerald-800"
                  : "border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300"
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* SCROLLABLE DRAWER BODY */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-slate-50/40">
          {isLoading ? (
            <div className="py-20 text-center text-xs text-slate-400 animate-pulse">
              Loading lead details & pipeline...
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW & DETAILS */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* QUICK STATUS SWITCHER FOR NON-CONTACTED WORKFLOW */}
                  <div className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-700">Quick Workflow:</span>
                      <span className="text-xs text-slate-500">
                        {lead?.stage === "NOT_CONTACTED" || lead?.stage === "NON_CONTACTED"
                          ? "Lead is currently Non Contacted"
                          : "Manage contact state"}
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant={lead?.stage === "CONTACTED" ? "primary" : "outline"}
                        className="text-xs h-7"
                        onClick={() => handleStatusChange("CONTACTED")}
                      >
                        ✓ Mark Contacted
                      </Button>
                      <Button
                        size="sm"
                        variant={lead?.stage === "NOT_CONTACTED" ? "primary" : "outline"}
                        className="text-xs h-7 text-amber-700 border-amber-300 hover:bg-amber-50"
                        onClick={() => handleStatusChange("NOT_CONTACTED")}
                      >
                        Mark Non Contacted
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        className="text-xs h-7 text-slate-600 hover:bg-slate-100"
                        onClick={() => handleStatusChange("CANCELLED")}
                      >
                        Cancel Lead
                      </Button>
                    </div>
                  </div>

                  {/* 3 TOP CARDS */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {/* CARD 1: PROPERTY INFORMATION */}
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                        Property Information
                      </span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Property Type:</span>
                          <span className="font-semibold text-slate-800 font-mono">
                            {lead?.propertyTypeKey || "RESIDENTIAL"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Location:</span>
                          <span className="font-medium text-slate-800 text-right">
                            {lead?.location || "N/A"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Requirements:</span>
                          <span className="font-medium text-slate-800 text-right">
                            {lead?.requirement || "Standard Interior"}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* CARD 2: COMMERCIAL & OWNERSHIP */}
                    <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider block border-b border-slate-100 pb-1.5">
                        Commercial & Ownership
                      </span>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between">
                          <span className="text-slate-500">Budget / Expected:</span>
                          <span className="font-bold text-slate-900 font-mono">
                            {lead?.estimatedBudget ? formatCurrency(lead.estimatedBudget) : "TBD"}
                          </span>
                        </div>
                        <div className="flex justify-between items-center">
                          <span className="text-slate-500">Lead Source:</span>
                          <span className="px-2 py-0.5 bg-slate-100 text-slate-700 rounded text-[10px] font-bold uppercase tracking-wider border border-slate-200">
                            {lead?.sourceKey || "WEBSITE"}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-slate-500">Assigned Staff:</span>
                          <span className="font-medium text-slate-800">
                            {lead?.assignedTo?.fullName || "Unassigned"}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* CARD 3: REQUIREMENTS & NOTES */}
                  <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-100 pb-1.5">
                      <span className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                        Requirements & Notes
                      </span>
                      <button
                        onClick={() => setActiveNoteStage(activeNoteStage === "GENERAL" ? null : "GENERAL")}
                        className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                      >
                        <Plus className="w-3 h-3" /> Add Note
                      </button>
                    </div>

                    {activeNoteStage === "GENERAL" && (
                      <div className="p-3 bg-emerald-50/50 rounded-lg border border-emerald-200 space-y-2 animate-in fade-in">
                        <textarea
                          value={inlineNote}
                          onChange={(e) => setInlineNote(e.target.value)}
                          placeholder="Type notes regarding customer requirements, preferences, or site specifications..."
                          className="w-full text-xs p-2 bg-white border border-slate-300 rounded focus:outline-none focus:ring-1 focus:ring-emerald-500"
                          rows={2}
                        />
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2"
                            onClick={() => {
                              setActiveNoteStage(null);
                              setInlineNote("");
                            }}
                          >
                            Cancel
                          </Button>
                          <Button
                            size="sm"
                            variant="primary"
                            className="text-xs h-6 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                            disabled={isAddingNote || !inlineNote.trim()}
                            onClick={() => handleAddNote("GENERAL")}
                          >
                            {isAddingNote ? "Saving..." : "Save Note"}
                          </Button>
                        </div>
                      </div>
                    )}

                    <p className="text-xs text-slate-700 whitespace-pre-wrap leading-relaxed">
                      {lead?.notes || "No additional requirement notes recorded for this lead."}
                    </p>
                  </div>

                  {/* ======================================================== */}
                  {/* VERTICAL PIPELINE TIMELINE CARDS                         */}
                  {/* ======================================================== */}
                  <div className="space-y-4 pt-2">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-800 tracking-tight flex items-center gap-2">
                        <FolderKanban className="w-4 h-4 text-emerald-600" />
                        Lead Pipeline & Execution Workflow
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        Stage: <strong className="text-slate-800">{lead?.stage}</strong>
                      </span>
                    </div>

                    {/* PIPELINE CARD 1: LEAD CREATED */}
                    <div className="relative pl-6 pb-6 border-l-2 border-emerald-400 space-y-2">
                      <span className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-emerald-500 ring-4 ring-emerald-50 flex items-center justify-center text-white text-[9px] font-bold">
                        1
                      </span>
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              LEAD CREATED
                            </span>
                            <span className="text-xs font-bold text-slate-800">Lead Registration</span>
                          </div>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {formatDate(lead?.createdAt)}
                          </span>
                        </div>
                        <div className="text-xs text-slate-600 space-y-1">
                          <p>
                            Lead registered via <strong>{lead?.sourceKey || "Website"}</strong>. Initial client contact:{" "}
                            <strong>{lead?.clientName}</strong> ({lead?.phone}).
                          </p>
                        </div>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-400">
                          <span>Audit: Registered by System / Staff</span>
                          <button
                            onClick={() => setActiveNoteStage(activeNoteStage === "STAGE_CREATED" ? null : "STAGE_CREATED")}
                            className="text-emerald-700 font-semibold hover:underline"
                          >
                            + Add Note
                          </button>
                        </div>
                        {activeNoteStage === "STAGE_CREATED" && (
                          <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-2">
                            <textarea
                              value={inlineNote}
                              onChange={(e) => setInlineNote(e.target.value)}
                              placeholder="Note for Lead Created stage..."
                              className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded"
                              rows={2}
                            />
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => setActiveNoteStage(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" variant="primary" className="text-xs h-6 px-2.5 bg-emerald-600 text-white" onClick={() => handleAddNote("STAGE_CREATED")}>
                                Save
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PIPELINE CARD 2: CONTACTED */}
                    <div className="relative pl-6 pb-6 border-l-2 border-sky-400 space-y-2">
                      <span className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-sky-500 ring-4 ring-sky-50 flex items-center justify-center text-white text-[9px] font-bold">
                        2
                      </span>
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-sky-50 text-sky-700 border border-sky-200">
                              CONTACTED
                            </span>
                            <span className="text-xs font-bold text-slate-800">Initial Discovery Call</span>
                          </div>
                          {lead?.stage !== "NEW" && (
                            <span className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                              <Check className="w-3.5 h-3.5" /> Contact Established
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-600">
                          Initial interaction with customer regarding interior requirements, project timeline, and space dimensions.
                        </p>
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Audit: Contact Verified</span>
                          <button
                            onClick={() => setActiveNoteStage(activeNoteStage === "STAGE_CONTACTED" ? null : "STAGE_CONTACTED")}
                            className="text-sky-700 font-semibold hover:underline"
                          >
                            + Add Note
                          </button>
                        </div>
                        {activeNoteStage === "STAGE_CONTACTED" && (
                          <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-2">
                            <textarea
                              value={inlineNote}
                              onChange={(e) => setInlineNote(e.target.value)}
                              placeholder="Note for Contacted stage..."
                              className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded"
                              rows={2}
                            />
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => setActiveNoteStage(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" variant="primary" className="text-xs h-6 px-2.5 bg-sky-600 text-white" onClick={() => handleAddNote("STAGE_CONTACTED")}>
                                Save
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PIPELINE CARD 3: FOLLOW-UP SCHEDULED */}
                    <div className="relative pl-6 pb-6 border-l-2 border-blue-400 space-y-2">
                      <span className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-blue-500 ring-4 ring-blue-50 flex items-center justify-center text-white text-[9px] font-bold">
                        3
                      </span>
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                              FOLLOW-UP SCHEDULED
                            </span>
                            <span className="text-xs font-bold text-slate-800">Client Check-in</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2 text-blue-700"
                            onClick={() => setIsFollowUpModalOpen(true)}
                          >
                            + Schedule Follow-up
                          </Button>
                        </div>

                        {followUps.length > 0 ? (
                          <div className="space-y-2">
                            {followUps.map((fu: any) => (
                              <div
                                key={fu.id}
                                className="p-2.5 bg-blue-50/40 rounded border border-blue-100 text-xs flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-semibold text-slate-800 block">
                                    {fu.type} • {formatDate(fu.followUpDate)}
                                  </span>
                                  <span className="text-slate-500 text-[11px]">{fu.notes}</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {fu.status === "PENDING" ? (
                                    <>
                                      <Button
                                        size="sm"
                                        variant="primary"
                                        className="text-[11px] h-6 px-2 bg-emerald-600 text-white"
                                        onClick={() => setCompletingFollowUpId(fu.id)}
                                      >
                                        ✓ Done
                                      </Button>
                                      <Button
                                        size="sm"
                                        variant="outline"
                                        className="text-[11px] h-6 px-2 text-rose-600 border-rose-200 hover:bg-rose-50"
                                        onClick={() => setCompletingFollowUpId(fu.id)}
                                      >
                                        ✕ Not Done
                                      </Button>
                                    </>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                                      {fu.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No follow-ups currently scheduled.</p>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Audit: Follow-up Engine Active</span>
                          <button
                            onClick={() => setActiveNoteStage(activeNoteStage === "STAGE_FOLLOWUP" ? null : "STAGE_FOLLOWUP")}
                            className="text-blue-700 font-semibold hover:underline"
                          >
                            + Add Note
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* PIPELINE CARD 4: SITE VISIT SCHEDULED & COMPLETED */}
                    <div className="relative pl-6 pb-6 border-l-2 border-purple-400 space-y-2">
                      <span className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-purple-500 ring-4 ring-purple-50 flex items-center justify-center text-white text-[9px] font-bold">
                        4
                      </span>
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              SITE VISIT
                            </span>
                            <span className="text-xs font-bold text-slate-800">Measurement & Inspection</span>
                          </div>
                          <Button
                            size="sm"
                            variant="outline"
                            className="text-xs h-6 px-2 text-purple-700"
                            onClick={() => setIsSiteVisitModalOpen(true)}
                          >
                            + Schedule Visit
                          </Button>
                        </div>

                        {siteVisits.length > 0 ? (
                          <div className="space-y-2">
                            {siteVisits.map((sv: any) => (
                              <div
                                key={sv.id}
                                className="p-2.5 bg-purple-50/40 rounded border border-purple-100 text-xs flex items-center justify-between"
                              >
                                <div>
                                  <span className="font-semibold text-slate-800 block">
                                    {formatDate(sv.visitDate)} • {sv.location || "Site Address"}
                                  </span>
                                  <span className="text-slate-500 text-[11px]">{sv.notes || "Measurement survey"}</span>
                                  {sv.outcomeNotes && (
                                    <span className="block text-emerald-700 text-[11px] mt-0.5">
                                      Outcome: {sv.outcomeNotes}
                                    </span>
                                  )}
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {sv.status === "SCHEDULED" ? (
                                    <Button
                                      size="sm"
                                      variant="primary"
                                      className="text-[11px] h-6 px-2 bg-purple-600 text-white"
                                      onClick={() => setCompletingSiteVisitId(sv.id)}
                                    >
                                      ✓ Complete Inspection
                                    </Button>
                                  ) : (
                                    <span className="px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded text-[10px] font-bold">
                                      {sv.status}
                                    </span>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No site visit recorded yet.</p>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Audit: Site Visit Coordinator</span>
                          <button
                            onClick={() => setActiveNoteStage(activeNoteStage === "STAGE_SITEVISIT" ? null : "STAGE_SITEVISIT")}
                            className="text-purple-700 font-semibold hover:underline"
                          >
                            + Add Note
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* PIPELINE CARD 5: QUOTATION IN PROGRESS & SENT */}
                    <div className="relative pl-6 pb-6 border-l-2 border-amber-400 space-y-2">
                      <span className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-amber-500 ring-4 ring-amber-50 flex items-center justify-center text-white text-[9px] font-bold">
                        5
                      </span>
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              QUOTATION ENGINE
                            </span>
                            <span className="text-xs font-bold text-slate-800">Commercial Proposal</span>
                          </div>
                          <Link href={`/quotations/new?leadId=${leadId}&clientName=${encodeURIComponent(lead?.clientName || "")}&phone=${lead?.phone || ""}`}>
                            <Button size="sm" variant="primary" className="text-xs h-6 px-2.5 bg-amber-600 text-white hover:bg-amber-700">
                              + Create Quotation
                            </Button>
                          </Link>
                        </div>

                        {quotations.length > 0 ? (
                          <div className="space-y-2">
                            {quotations.map((q: any) => (
                              <div
                                key={q.id}
                                className="p-3 bg-amber-50/30 rounded border border-amber-200 text-xs flex items-center justify-between"
                              >
                                <div>
                                  <div className="flex items-center gap-2">
                                    <span className="font-mono font-bold text-slate-900">{q.referenceNo}</span>
                                    <span className="px-1.5 py-0.2 rounded text-[9px] font-bold bg-slate-100 text-slate-700">
                                      v{q.revision || 1}
                                    </span>
                                    <span className="px-2 py-0.2 rounded text-[10px] font-semibold bg-emerald-100 text-emerald-800">
                                      {q.status}
                                    </span>
                                  </div>
                                  <span className="text-slate-900 font-bold font-mono text-sm block mt-0.5">
                                    {formatCurrency(q.totalAmount)}
                                  </span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  <button
                                    onClick={() => {
                                      setIsWhatsAppSent(true);
                                      setSuccessMsg(`Quotation ${q.referenceNo} sent via WhatsApp!`);
                                    }}
                                    className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 rounded text-xs font-semibold flex items-center gap-1 transition-colors"
                                  >
                                    <MessageSquare className="w-3 h-3 text-emerald-600" />
                                    Send WhatsApp
                                  </button>
                                  <Link href={`/quotations`}>
                                    <Button size="sm" variant="outline" className="text-xs h-6 px-2">
                                      Open
                                    </Button>
                                  </Link>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">No quotation generated for this lead yet.</p>
                        )}

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>
                            {isWhatsAppSent ? "✓ Sent Successfully via WhatsApp" : "Quotation Engine Connected"}
                          </span>
                          <button
                            onClick={() => setActiveNoteStage(activeNoteStage === "STAGE_QUOTE" ? null : "STAGE_QUOTE")}
                            className="text-amber-700 font-semibold hover:underline"
                          >
                            + Add Note
                          </button>
                        </div>
                      </div>
                    </div>

                    {/* PIPELINE CARD 6: NEGOTIATION & FINALIZATION */}
                    <div className="relative pl-6 pb-6 border-l-2 border-violet-400 space-y-2">
                      <span className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-violet-500 ring-4 ring-violet-50 flex items-center justify-center text-white text-[9px] font-bold">
                        6
                      </span>
                      <div className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                              NEGOTIATION & CLOSURE
                            </span>
                            <span className="text-xs font-bold text-slate-800">Commercial Alignment</span>
                          </div>
                          <div className="flex items-center gap-1.5">
                            <Button
                              size="sm"
                              variant="primary"
                              className="text-xs h-6 px-2.5 bg-emerald-600 hover:bg-emerald-700 text-white"
                              onClick={() => handleStatusChange("WON")}
                            >
                              ✓ WON
                            </Button>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-6 px-2.5 text-rose-600 border-rose-200 hover:bg-rose-50"
                              onClick={() => handleStatusChange("LOST", "BUDGET")}
                            >
                              ✕ LOST
                            </Button>
                          </div>
                        </div>

                        <p className="text-xs text-slate-600">
                          Review client feedback, handle scope discount or material customizations, and prepare final quotation approval.
                        </p>

                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-[11px] text-slate-500">
                          <span>Audit: Commercial Negotiations</span>
                          <button
                            onClick={() => setActiveNoteStage(activeNoteStage === "STAGE_NEGOTIATION" ? null : "STAGE_NEGOTIATION")}
                            className="text-violet-700 font-semibold hover:underline"
                          >
                            + Add Negotiation Note
                          </button>
                        </div>
                        {activeNoteStage === "STAGE_NEGOTIATION" && (
                          <div className="p-2.5 bg-slate-50 rounded border border-slate-200 space-y-2">
                            <textarea
                              value={inlineNote}
                              onChange={(e) => setInlineNote(e.target.value)}
                              placeholder="Add negotiation note (e.g., Client requested 5% discount on woodwork)..."
                              className="w-full text-xs p-1.5 bg-white border border-slate-300 rounded"
                              rows={2}
                            />
                            <div className="flex justify-end gap-1.5">
                              <Button size="sm" variant="outline" className="text-xs h-6 px-2" onClick={() => setActiveNoteStage(null)}>
                                Cancel
                              </Button>
                              <Button size="sm" variant="primary" className="text-xs h-6 px-2.5 bg-violet-600 text-white" onClick={() => handleAddNote("STAGE_NEGOTIATION")}>
                                Save Note
                              </Button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* PIPELINE CARD 7: WON & CONFIRMATION FEE PAID */}
                    {(lead?.stage === "WON" || lead?.stage === "PROJECT_CREATED" || confirmationFeeActivity) && (
                      <div className="relative pl-6 pb-6 border-l-2 border-emerald-500 space-y-2">
                        <span className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-emerald-600 ring-4 ring-emerald-50 flex items-center justify-center text-white text-[9px] font-bold">
                          ✓
                        </span>
                        <div className="bg-emerald-50/50 p-4 rounded-lg border border-emerald-200 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                CONFIRMATION FEE PAID
                              </span>
                              <span className="text-xs font-bold text-emerald-950">Lead Won & Secured</span>
                            </div>
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-xs h-6 px-2.5 bg-white text-emerald-800 border-emerald-300 hover:bg-emerald-50"
                              onClick={() => setIsFeeModalOpen(true)}
                            >
                              Record Payment
                            </Button>
                          </div>

                          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 bg-white p-3 rounded-md border border-emerald-200/80 text-xs">
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Fee Amount</span>
                              <span className="font-bold text-slate-900 font-mono text-sm">
                                {confirmationFeeActivity?.metadata?.amount
                                  ? formatCurrency(confirmationFeeActivity.metadata.amount)
                                  : "₹50,000.00"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Payment Mode</span>
                              <span className="font-semibold text-slate-800">
                                {confirmationFeeActivity?.metadata?.paymentType || "UPI / Bank"}
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Status</span>
                              <span className="px-2 py-0.2 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 inline-block">
                                PAID & VERIFIED
                              </span>
                            </div>
                            <div>
                              <span className="text-[10px] text-slate-400 uppercase font-semibold block">Date</span>
                              <span className="font-mono text-slate-700">
                                {formatDate(confirmationFeeActivity?.createdAt || new Date())}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center justify-between pt-1">
                            <button
                              onClick={() => setSuccessMsg("Payment confirmation sent via WhatsApp!")}
                              className="text-xs font-semibold text-emerald-700 hover:text-emerald-900 flex items-center gap-1"
                            >
                              <MessageSquare className="w-3.5 h-3.5 text-emerald-600" />
                              Send Payment Confirmation via WhatsApp
                            </button>
                            <span className="text-[11px] text-slate-400">Audit: Confirmation Fee Logged</span>
                          </div>
                        </div>
                      </div>
                    )}

                    {/* PIPELINE CARD 8: PROJECT CREATION */}
                    {(lead?.stage === "WON" || lead?.stage === "PROJECT_CREATED" || project) && (
                      <div className="relative pl-6 space-y-2">
                        <span className="absolute -left-2 top-0 w-4 h-4 rounded-full bg-slate-900 ring-4 ring-slate-100 flex items-center justify-center text-white text-[9px] font-bold">
                          ★
                        </span>
                        <div className="bg-white p-4 rounded-lg border border-slate-300 shadow-2xs space-y-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-xs font-bold text-slate-900 block">
                                Project Execution Handover
                              </span>
                              <span className="text-[11px] text-slate-500">
                                Dynamically convert lead into Project Management execution
                              </span>
                            </div>
                            {project ? (
                              <Link href="/projects">
                                <Button
                                  size="sm"
                                  variant="primary"
                                  className="text-xs h-7 px-3 bg-slate-900 hover:bg-black text-white flex items-center gap-1"
                                >
                                  Open Project ({project.referenceNo})
                                  <ArrowRight className="w-3 h-3" />
                                </Button>
                              </Link>
                            ) : (
                              <Button
                                size="sm"
                                variant="primary"
                                className="text-xs h-7 px-3 bg-slate-900 hover:bg-black text-white"
                                disabled={isConverting}
                                onClick={handleConvertToProject}
                              >
                                {isConverting ? "Creating..." : "Create Project"}
                              </Button>
                            )}
                          </div>
                          {project && (
                            <div className="p-2.5 bg-slate-50 rounded border border-slate-200 text-xs text-slate-700 flex items-center justify-between">
                              <span>
                                ✓ Project Created: <strong>{project.referenceNo}</strong> — {project.title}
                              </span>
                              <span className="font-mono font-bold text-emerald-700">
                                Contract: {formatCurrency(project.contractValue || 0)}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* TAB 2: TIMELINE */}
              {activeTab === "timeline" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Chronological Lead History
                    </span>
                    <span className="text-xs text-slate-400">{timeline.length} activities logged</span>
                  </div>

                  {timeline.length > 0 ? (
                    <div className="relative pl-4 border-l-2 border-slate-200 space-y-4">
                      {timeline.map((item: any, idx: number) => (
                        <div key={item.id || idx} className="relative pl-4 space-y-1">
                          <div className="absolute -left-5.5 top-1 w-3 h-3 rounded-full bg-emerald-500 ring-4 ring-white" />
                          <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-2xs">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-slate-900">{item.title}</span>
                              <span className="text-[10px] text-slate-400 font-mono">
                                {formatDate(item.createdAt)}
                              </span>
                            </div>
                            {item.description && (
                              <p className="text-xs text-slate-600 mt-1 whitespace-pre-wrap">{item.description}</p>
                            )}
                            <div className="mt-2 text-[10px] text-slate-400 flex items-center gap-2">
                              <span>By: {item.user?.fullName || "System Admin"}</span>
                              <span>•</span>
                              <span>{formatRelativeTime(item.createdAt)}</span>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400 italic">
                      No activity logs recorded yet.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 3: FOLLOW-UPS */}
              {activeTab === "followups" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Scheduled & Completed Follow-ups
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      className="text-xs h-7 px-3 bg-emerald-600 text-white"
                      onClick={() => setIsFollowUpModalOpen(true)}
                    >
                      + Add Follow-up
                    </Button>
                  </div>

                  {followUps.length > 0 ? (
                    <div className="space-y-3">
                      {followUps.map((fu: any) => (
                        <div
                          key={fu.id}
                          className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <div className="flex items-center gap-2">
                              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 border border-blue-200">
                                {fu.type}
                              </span>
                              <span className="text-xs font-bold text-slate-900">
                                {formatDate(fu.followUpDate)}
                              </span>
                            </div>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                fu.status === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-amber-50 text-amber-700 border border-amber-200"
                              }`}
                            >
                              {fu.status}
                            </span>
                          </div>
                          <p className="text-xs text-slate-700">{fu.notes}</p>
                          {fu.outcomeNotes && (
                            <div className="p-2 bg-emerald-50 rounded border border-emerald-100 text-xs text-emerald-800">
                              <strong>Outcome:</strong> {fu.outcomeNotes}
                            </div>
                          )}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                            <span>Assigned: {fu.assignedTo?.fullName || "Staff"}</span>
                            {fu.status === "PENDING" && (
                              <Button
                                size="sm"
                                variant="primary"
                                className="text-xs h-6 px-2 bg-emerald-600 text-white"
                                onClick={() => setCompletingFollowUpId(fu.id)}
                              >
                                Mark Complete
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400 italic">
                      No follow-ups recorded for this lead.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 4: SITE VISITS */}
              {activeTab === "sitevisits" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Site Measurement & Inspections
                    </span>
                    <Button
                      size="sm"
                      variant="primary"
                      className="text-xs h-7 px-3 bg-purple-600 text-white"
                      onClick={() => setIsSiteVisitModalOpen(true)}
                    >
                      + Schedule Site Visit
                    </Button>
                  </div>

                  {siteVisits.length > 0 ? (
                    <div className="space-y-3">
                      {siteVisits.map((sv: any) => (
                        <div
                          key={sv.id}
                          className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-slate-900">
                              {formatDate(sv.visitDate)} • {sv.location || "Site Location"}
                            </span>
                            <span
                              className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                                sv.status === "COMPLETED"
                                  ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                                  : "bg-purple-50 text-purple-700 border border-purple-200"
                              }`}
                            >
                              {sv.status}
                            </span>
                          </div>
                          {sv.notes && <p className="text-xs text-slate-700">{sv.notes}</p>}
                          {sv.outcomeNotes && (
                            <div className="p-2 bg-purple-50 rounded border border-purple-100 text-xs text-purple-800">
                              <strong>Inspection Findings:</strong> {sv.outcomeNotes}
                            </div>
                          )}
                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs text-slate-400">
                            <span>Inspector: {sv.assignedTo?.fullName || "Site Lead"}</span>
                            {sv.status === "SCHEDULED" && (
                              <Button
                                size="sm"
                                variant="primary"
                                className="text-xs h-6 px-2 bg-purple-600 text-white"
                                onClick={() => setCompletingSiteVisitId(sv.id)}
                              >
                                Record Findings
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400 italic">
                      No site visits scheduled yet.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 5: QUOTATIONS */}
              {activeTab === "quotation" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                      Commercial Quotations & Revisions
                    </span>
                    <Link href={`/quotations/new?leadId=${leadId}&clientName=${encodeURIComponent(lead?.clientName || "")}&phone=${lead?.phone || ""}`}>
                      <Button size="sm" variant="primary" className="text-xs h-7 px-3 bg-amber-600 text-white">
                        + New Quotation
                      </Button>
                    </Link>
                  </div>

                  {quotations.length > 0 ? (
                    <div className="space-y-3">
                      {quotations.map((q: any) => (
                        <div
                          key={q.id}
                          className="bg-white p-4 rounded-lg border border-slate-200 shadow-2xs space-y-3"
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-900 text-sm">{q.referenceNo}</span>
                                <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-700">
                                  Revision {q.revision || 1}
                                </span>
                              </div>
                              <span className="text-xs text-slate-500">{q.title || "Custom Interior Scope"}</span>
                            </div>
                            <span className="text-base font-bold text-slate-900 font-mono">
                              {formatCurrency(q.totalAmount)}
                            </span>
                          </div>

                          <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                            <span className="text-slate-400 font-mono">Created: {formatDate(q.createdAt)}</span>
                            <div className="flex items-center gap-2">
                              <button
                                onClick={() => {
                                  setIsWhatsAppSent(true);
                                  setSuccessMsg(`Quotation ${q.referenceNo} sent to ${lead?.phone} via WhatsApp!`);
                                }}
                                className="px-2 py-1 bg-emerald-50 text-emerald-700 border border-emerald-300 hover:bg-emerald-100 rounded text-xs font-semibold flex items-center gap-1"
                              >
                                <MessageSquare className="w-3 h-3" />
                                Send WhatsApp
                              </button>
                              <Link href={`/quotations`}>
                                <Button size="sm" variant="outline" className="text-xs h-7 px-3">
                                  View in Studio
                                </Button>
                              </Link>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-12 text-center text-xs text-slate-400 italic">
                      No quotations linked to this lead.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 6: PROJECT & CLIENT */}
              {activeTab === "project" && (
                <div className="space-y-4">
                  {project ? (
                    <div className="bg-white p-5 rounded-lg border border-slate-200 shadow-2xs space-y-4">
                      <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                        <div>
                          <span className="text-xs font-mono font-bold text-slate-900 block">
                            {project.referenceNo}
                          </span>
                          <h4 className="text-sm font-bold text-slate-800">{project.title}</h4>
                        </div>
                        <Link href="/projects">
                          <Button size="sm" variant="primary" className="text-xs h-7 px-3 bg-slate-900 text-white">
                            Open Project Workspace
                          </Button>
                        </Link>
                      </div>

                      <div className="grid grid-cols-2 gap-4 text-xs">
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Client Name</span>
                          <span className="font-semibold text-slate-800">{lead?.clientName}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Contact</span>
                          <span className="font-mono text-slate-800">{lead?.phone}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Project Stage</span>
                          <span className="font-bold text-emerald-700">{project.stage}</span>
                        </div>
                        <div>
                          <span className="text-slate-400 block text-[10px] uppercase font-semibold">Contract Value</span>
                          <span className="font-bold text-slate-900 font-mono">
                            {formatCurrency(project.contractValue || 0)}
                          </span>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="bg-white p-8 rounded-lg border border-slate-200 text-center space-y-3">
                      <FolderKanban className="w-8 h-8 text-slate-400 mx-auto" />
                      <div>
                        <h4 className="text-sm font-bold text-slate-800">Project not created yet</h4>
                        <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                          Once the client approves the quotation and pays the confirmation fee, click &quot;Create Project&quot; in the pipeline to initiate execution.
                        </p>
                      </div>
                      <Button
                        size="sm"
                        variant="primary"
                        className="text-xs h-7 px-3 bg-emerald-600 hover:bg-emerald-700 text-white"
                        onClick={handleConvertToProject}
                      >
                        Convert Lead to Project
                      </Button>
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* MODALS: Follow-up, Site Visit, Fee, Edit, Delete         */}
      {/* ======================================================== */}

      {/* SCHEDULE FOLLOW-UP MODAL */}
      {isFollowUpModalOpen && (
        <Modal
          isOpen={isFollowUpModalOpen}
          onClose={() => setIsFollowUpModalOpen(false)}
          title="Schedule Follow-up"
        >
          <form onSubmit={handleScheduleFollowUp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Follow-up Date & Time *
              </label>
              <Input
                type="datetime-local"
                value={followUpDate}
                onChange={(e) => setFollowUpDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Type</label>
              <select
                value={followUpType}
                onChange={(e) => setFollowUpType(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
              >
                <option value="CALL">Phone Call</option>
                <option value="WHATSAPP">WhatsApp Message</option>
                <option value="EMAIL">Email</option>
                <option value="MEETING">In-Person Meeting</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes / Agenda</label>
              <textarea
                value={followUpNotes}
                onChange={(e) => setFollowUpNotes(e.target.value)}
                placeholder="Follow-up objective..."
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsFollowUpModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSchedulingFollowUp}>
                {isSchedulingFollowUp ? "Scheduling..." : "Schedule Follow-up"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* COMPLETE FOLLOW-UP MODAL */}
      {completingFollowUpId && (
        <Modal
          isOpen={!!completingFollowUpId}
          onClose={() => setCompletingFollowUpId(null)}
          title="Record Follow-up Outcome"
        >
          <form onSubmit={handleCompleteFollowUp} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Outcome & Discussion Notes *
              </label>
              <textarea
                value={followUpOutcomeNotes}
                onChange={(e) => setFollowUpOutcomeNotes(e.target.value)}
                placeholder="What was discussed? Next steps..."
                required
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setCompletingFollowUpId(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isCompletingFollowUp}>
                {isCompletingFollowUp ? "Saving..." : "Save Outcome"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* SCHEDULE SITE VISIT MODAL */}
      {isSiteVisitModalOpen && (
        <Modal
          isOpen={isSiteVisitModalOpen}
          onClose={() => setIsSiteVisitModalOpen(false)}
          title="Schedule Site Visit"
        >
          <form onSubmit={handleScheduleSiteVisit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Visit Date & Time *
              </label>
              <Input
                type="datetime-local"
                value={visitDate}
                onChange={(e) => setVisitDate(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Site Location</label>
              <Input
                type="text"
                value={visitLocation}
                onChange={(e) => setVisitLocation(e.target.value)}
                placeholder={lead?.location || "Site Address"}
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
              <textarea
                value={visitNotes}
                onChange={(e) => setVisitNotes(e.target.value)}
                placeholder="Measurement requirements..."
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsSiteVisitModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isSchedulingSiteVisit}>
                {isSchedulingSiteVisit ? "Scheduling..." : "Schedule Visit"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* COMPLETE SITE VISIT MODAL */}
      {completingSiteVisitId && (
        <Modal
          isOpen={!!completingSiteVisitId}
          onClose={() => setCompletingSiteVisitId(null)}
          title="Record Site Visit Findings"
        >
          <form onSubmit={handleCompleteSiteVisit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Inspection & Measurement Findings *
              </label>
              <textarea
                value={visitOutcomeNotes}
                onChange={(e) => setVisitOutcomeNotes(e.target.value)}
                placeholder="Detailed dimensions, electrical points, civil modifications..."
                required
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
                rows={3}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setCompletingSiteVisitId(null)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isCompletingSiteVisit}>
                {isCompletingSiteVisit ? "Saving..." : "Save Findings"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* CONFIRMATION FEE PAYMENT MODAL */}
      {isFeeModalOpen && (
        <Modal
          isOpen={isFeeModalOpen}
          onClose={() => setIsFeeModalOpen(false)}
          title="Record Confirmation Fee Payment"
        >
          <form onSubmit={handleRecordConfirmationFee} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Fee Amount (₹) *
              </label>
              <Input
                type="number"
                value={feeAmount}
                onChange={(e) => setFeeAmount(e.target.value)}
                required
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Payment Method</label>
              <select
                value={feePaymentType}
                onChange={(e) => setFeePaymentType(e.target.value)}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
              >
                <option value="UPI">UPI (Google Pay, PhonePe, Paytm)</option>
                <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                <option value="CASH">Cash Deposit</option>
                <option value="CREDIT_CARD">Credit Card</option>
                <option value="DEBIT_CARD">Debit Card</option>
                <option value="CHEQUE">Cheque</option>
                <option value="OTHER">Other</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Transaction Reference / UTR Number
              </label>
              <Input
                type="text"
                value={feeTransactionRef}
                onChange={(e) => setFeeTransactionRef(e.target.value)}
                placeholder="e.g. UPI/2026/889922 or CHQ-00129"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Notes</label>
              <textarea
                value={feeNotes}
                onChange={(e) => setFeeNotes(e.target.value)}
                placeholder="Payment receipt remarks..."
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
                rows={2}
              />
            </div>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsFeeModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isRecordingFee} className="bg-emerald-600 text-white">
                {isRecordingFee ? "Recording..." : "Mark as Paid"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* EDIT LEAD MODAL */}
      {isEditModalOpen && (
        <Modal
          isOpen={isEditModalOpen}
          onClose={() => setIsEditModalOpen(false)}
          title="Edit Lead Information"
        >
          <form onSubmit={handleUpdateLead} className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Customer Name *</label>
                <Input
                  type="text"
                  value={editForm.clientName}
                  onChange={(e) => setEditForm({ ...editForm, clientName: e.target.value })}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number *</label>
                <Input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm({ ...editForm, phone: e.target.value })}
                  required
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Email Address</label>
                <Input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm({ ...editForm, email: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Location / City</label>
                <Input
                  type="text"
                  value={editForm.location}
                  onChange={(e) => setEditForm({ ...editForm, location: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Estimated Budget (₹)</label>
                <Input
                  type="number"
                  value={editForm.budget}
                  onChange={(e) => setEditForm({ ...editForm, budget: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
                <select
                  value={editForm.priority}
                  onChange={(e) => setEditForm({ ...editForm, priority: e.target.value })}
                  className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
                >
                  <option value="LOW">Low</option>
                  <option value="MEDIUM">Medium</option>
                  <option value="HIGH">High</option>
                  <option value="URGENT">Urgent</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Lead Source</label>
              <select
                value={editForm.sourceKey}
                onChange={(e) => setEditForm({ ...editForm, sourceKey: e.target.value })}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
              >
                <option value="WEBSITE">Website</option>
                <option value="REFERRAL">Referral</option>
                <option value="DIRECT_VISIT">Direct Visit</option>
                <option value="WALK_IN">Walk-in</option>
                <option value="PHONE_CALL">Phone Call</option>
                <option value="SOCIAL_MEDIA">Social Media</option>
                <option value="OTHER">Other</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Requirement Scope</label>
              <textarea
                value={editForm.requirement}
                onChange={(e) => setEditForm({ ...editForm, requirement: e.target.value })}
                className="w-full text-xs p-2 bg-white border border-slate-300 rounded-md"
                rows={2}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsEditModalOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" variant="primary" size="sm" disabled={isUpdatingLead}>
                {isUpdatingLead ? "Updating..." : "Save Changes"}
              </Button>
            </div>
          </form>
        </Modal>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {isDeleteModalOpen && (
        <Modal
          isOpen={isDeleteModalOpen}
          onClose={() => setIsDeleteModalOpen(false)}
          title="Confirm Delete Lead"
        >
          <div className="space-y-4">
            <p className="text-xs text-slate-600">
              Are you sure you want to delete lead <strong>{lead?.referenceNo}</strong> ({lead?.clientName})?
              This action will be logged in the system audit trail.
            </p>
            <div className="flex justify-end gap-2 pt-2 border-t border-slate-100">
              <Button type="button" variant="outline" size="sm" onClick={() => setIsDeleteModalOpen(false)}>
                Cancel
              </Button>
              <Button
                type="button"
                variant="primary"
                size="sm"
                className="bg-rose-600 hover:bg-rose-700 text-white"
                disabled={isDeletingLead}
                onClick={handleDeleteLead}
              >
                {isDeletingLead ? "Deleting..." : "Confirm Delete"}
              </Button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
