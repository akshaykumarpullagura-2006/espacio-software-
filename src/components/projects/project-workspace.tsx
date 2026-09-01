"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordPaymentModal } from "@/components/payments/record-payment-modal";
import {
  X,
  Users,
  FileText,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  MessageSquare,
  Clock,
  Briefcase,
  Layers,
  CheckSquare,
  Sparkles,
  Award,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import {
  PROJECT_STAGES,
  PROJECT_MEMBER_ROLES,
} from "@/validators/project.schema";

interface ProjectWorkspaceProps {
  projectId: string | null;
  isOpen: boolean;
  onClose: () => void;
  onUpdate: () => void;
}

export const ProjectWorkspace: React.FC<ProjectWorkspaceProps> = ({
  projectId,
  isOpen,
  onClose,
  onUpdate,
}) => {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");
  const [activeTab, setActiveTab] = useState<
    | "overview"
    | "stages"
    | "team"
    | "timeline"
    | "financials"
    | "changeOrders"
    | "quality"
    | "warranty"
    | "notes"
  >("overview");

  // Stage change state
  const [selectedStage, setSelectedStage] = useState("");
  const [delayReason, setDelayReason] = useState("CLIENT_DECISION");
  const [stageNotes, setStageNotes] = useState("");
  const [isChangingStage, setIsChangingStage] = useState(false);

  // Team member modal
  const [isAddMemberModalOpen, setIsAddMemberModalOpen] = useState(false);
  const [selectedUserToAssign, setSelectedUserToAssign] = useState("");
  const [memberRole, setMemberRole] = useState("SITE_ENGINEER");
  const [usersList, setUsersList] = useState<any[]>([]);

  // Change Order modal
  const [isCoModalOpen, setIsCoModalOpen] = useState(false);
  const [coTitle, setCoTitle] = useState("Scope Change Order");
  const [coDescription, setCoDescription] = useState("");
  const [coCost, setCoCost] = useState("");
  const [coTimelineImpact, setCoTimelineImpact] = useState("0");
  const [isSubmittingCo, setIsSubmittingCo] = useState(false);

  // Quality Check modal
  const [isQcModalOpen, setIsQcModalOpen] = useState(false);
  const [qcStatus, setQcStatus] = useState("PASSED");
  const [qcIssues, setQcIssues] = useState("");
  const [qcCorrectiveAction, setQcCorrectiveAction] = useState("");
  const [qcNotes, setQcNotes] = useState("");
  const [isSubmittingQc, setIsSubmittingQc] = useState(false);

  // Handover modal
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState(false);
  const [handoverNotes, setHandoverNotes] = useState("");
  const [warrantyMonths, setWarrantyMonths] = useState(12);

  // Warranty Issue modal
  const [isWarModalOpen, setIsWarModalOpen] = useState(false);
  const [warTitle, setWarTitle] = useState("Warranty Complaint");
  const [warDescription, setWarDescription] = useState("");
  const [warPriority, setWarPriority] = useState("MEDIUM");
  const [isSubmittingWar, setIsSubmittingWar] = useState(false);

  // Note state
  const [newNoteText, setNewNoteText] = useState("");
  const [isSubmittingNote, setIsSubmittingNote] = useState(false);

  // Payment modal
  const [isRecordPaymentModalOpen, setIsRecordPaymentModalOpen] = useState(false);

  const fetchProjectDetails = async () => {
    if (!projectId) return;
    setIsLoading(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/projects/${projectId}`);
      const json = await res.json();
      if (json.success) {
        setData(json.data);
        setSelectedStage(json.data.project.stage);
      } else {
        setError(json.error?.message || "Failed to load project details");
      }
    } catch {
      setError("Network error loading workspace");
    } finally {
      setIsLoading(false);
    }
  };

  const loadUsers = async () => {
    try {
      const res = await fetch("/api/v1/employees?limit=100");
      const json = await res.json();
      if (json.success) {
        setUsersList(json.data);
      }
    } catch {
      // quiet fallback
    }
  };

  useEffect(() => {
    if (isOpen && projectId) {
      fetchProjectDetails();
      loadUsers();
    }
  }, [isOpen, projectId]);

  if (!isOpen || !projectId) return null;

  const project = data?.project;
  const timeline = data?.timeline || [];
  const delayHealth = data?.delayHealth || { status: "ON_TIME", text: "On Schedule" };
  const reviewReferralStatus = data?.reviewReferralStatus || { status: "NOT_APPLICABLE", badge: "Not Handed Over", message: "", isDue: false };
  const financialSummary = data?.financialSummary;
  const canViewFinancials = data?.canViewFinancials;
  const stageDefinitions = data?.stageDefinitions || [];

  const handleStageChange = async () => {
    if (!selectedStage || selectedStage === project?.stage) return;
    setIsChangingStage(true);
    setError("");

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/stage`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          stage: selectedStage,
          delayReason: delayHealth.status === "DELAYED" ? delayReason : undefined,
          notes: stageNotes || `Transitioned to ${selectedStage.replace(/_/g, " ")}`,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setStageNotes("");
        await fetchProjectDetails();
        onUpdate();
      } else {
        setError(json.error?.message || "Failed to transition stage");
      }
    } catch {
      setError("Network error executing stage transition");
    } finally {
      setIsChangingStage(false);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedUserToAssign) return;

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: selectedUserToAssign, role: memberRole }),
      });
      const json = await res.json();
      if (json.success) {
        setIsAddMemberModalOpen(false);
        setSelectedUserToAssign("");
        await fetchProjectDetails();
        onUpdate();
      } else {
        alert(json.error?.message || "Failed to assign team member");
      }
    } catch {
      alert("Network error assigning member");
    }
  };

  const handleRemoveMember = async (userId: string) => {
    if (!confirm("Are you sure you want to remove this member from the project team?")) return;
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/members/${userId}`, {
        method: "DELETE",
      });
      const json = await res.json();
      if (json.success) {
        await fetchProjectDetails();
        onUpdate();
      }
    } catch {
      alert("Network error removing member");
    }
  };

  const handleCreateChangeOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingCo(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/change-orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: coTitle,
          description: coDescription,
          additionalCost: parseFloat(coCost) || 0,
          timelineImpactDays: parseInt(coTimelineImpact, 10) || 0,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsCoModalOpen(false);
        setCoTitle("Scope Change Order");
        setCoDescription("");
        setCoCost("");
        setCoTimelineImpact("0");
        await fetchProjectDetails();
        onUpdate();
      } else {
        alert(json.error?.message || "Failed to create change order");
      }
    } catch {
      alert("Network error creating change order");
    } finally {
      setIsSubmittingCo(false);
    }
  };

  const handleApproveChangeOrder = async (coId: string) => {
    if (!confirm("Approve this change order and increment the project revised budget?")) return;
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/change-orders/${coId}/approve`, {
        method: "POST",
      });
      const json = await res.json();
      if (json.success) {
        await fetchProjectDetails();
        onUpdate();
      } else {
        alert(json.error?.message || "Failed to approve change order");
      }
    } catch {
      alert("Network error approving change order");
    }
  };

  const handleRecordQualityCheck = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingQc(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/quality-checks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: qcStatus,
          issuesFound: qcIssues,
          correctiveAction: qcCorrectiveAction,
          notes: qcNotes,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsQcModalOpen(false);
        setQcIssues("");
        setQcCorrectiveAction("");
        setQcNotes("");
        await fetchProjectDetails();
        onUpdate();
      } else {
        alert(json.error?.message || "Failed to record quality check");
      }
    } catch {
      alert("Network error recording quality check");
    } finally {
      setIsSubmittingQc(false);
    }
  };

  const handleCompleteHandover = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/handover`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          notes: handoverNotes,
          warrantyDurationMonths: Number(warrantyMonths) || 12,
          clientConfirmed: true,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsHandoverModalOpen(false);
        setHandoverNotes("");
        await fetchProjectDetails();
        onUpdate();
      } else {
        alert(json.error?.message || "Failed to complete handover");
      }
    } catch {
      alert("Network error completing handover");
    }
  };

  const handleLogWarrantyIssue = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmittingWar(true);
    try {
      const res = await fetch(`/api/v1/projects/${projectId}/warranty-issues`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: warTitle,
          description: warDescription,
          priority: warPriority,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsWarModalOpen(false);
        setWarTitle("Warranty Complaint");
        setWarDescription("");
        await fetchProjectDetails();
      } else {
        alert(json.error?.message || "Failed to log warranty issue");
      }
    } catch {
      alert("Network error logging warranty issue");
    } finally {
      setIsSubmittingWar(false);
    }
  };

  const handleResolveWarrantyIssue = async (issueId: string) => {
    const notes = prompt("Enter resolution notes:");
    if (notes === null) return;

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/warranty-issues/${issueId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ resolutionNotes: notes || "Resolved" }),
      });
      const json = await res.json();
      if (json.success) {
        await fetchProjectDetails();
      }
    } catch {
      alert("Network error resolving issue");
    }
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newNoteText.trim()) return;
    setIsSubmittingNote(true);

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/notes`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ note: newNoteText }),
      });
      const json = await res.json();
      if (json.success) {
        setNewNoteText("");
        await fetchProjectDetails();
      } else {
        alert(json.error?.message || "Failed to add project note");
      }
    } catch {
      alert("Network error saving note");
    } finally {
      setIsSubmittingNote(false);
    }
  };

  const currentStageIndex = PROJECT_STAGES.indexOf(project?.stage as any);

  // Parse notes lines
  const parsedNotes = (project?.notes || "")
    .split("\n")
    .map((l: string) => l.trim())
    .filter(Boolean);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-[#4A433D]/60 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-[#F6EFE3] h-full shadow-2xl flex flex-col border-l border-[#6F5642]/20 select-none">
        {/* Top Bar Header */}
        <div className="px-6 py-4 border-b border-[#6F5642]/20 flex items-center justify-between bg-[#ECF4F0] shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2.5 bg-[#F2B455]/20 text-[#6F5642] rounded-lg border border-[#F2B455]/40">
              <Briefcase className="w-5 h-5 text-[#6F5642]" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-[#6F5642]">{project?.referenceNo}</span>
                <span className="text-[#6F5642]/40">•</span>
                <h2 className="text-base font-bold text-[#4A433D] tracking-tight">{project?.title}</h2>
                <Badge variant={project?.status === "COMPLETED" ? "completed" : "active"}>
                  {project?.status}
                </Badge>
                <Badge
                  variant={
                    delayHealth.status === "DELAYED"
                      ? "danger"
                      : delayHealth.status === "AT_RISK"
                      ? "pending"
                      : "completed"
                  }
                >
                  {delayHealth.status.replace(/_/g, " ")}
                </Badge>
              </div>
              <p className="text-xs text-[#6F5642] mt-0.5">
                Client: <span className="font-semibold text-[#4A433D]">{project?.client?.fullName || "—"}</span>
                {project?.siteAddress && ` • ${project.siteAddress}, ${project.city}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-[#6F5642] hover:text-[#4A433D] rounded-lg hover:bg-[#F6EFE3] transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 13-Stage Visual Stepper */}
        <div className="px-6 py-3 bg-[#ECF4F0]/80 border-b border-[#6F5642]/20 overflow-x-auto shrink-0">
          <div className="flex items-center justify-between text-[11px] font-semibold text-[#6F5642] mb-2">
            <span>Execution Stage Progress ({project?.progressPct || 0}%)</span>
            <span className="text-[#6F5642] font-bold">
              Current: {(project?.stage || "").replace(/_/g, " ")}
            </span>
          </div>

          <div className="flex items-center gap-1 min-w-[700px]">
            {PROJECT_STAGES.map((stage, idx) => {
              const isPast = currentStageIndex > idx;
              const isCurrent = currentStageIndex === idx;

              return (
                <div key={stage} className="flex-1 flex flex-col items-center group relative">
                  <div
                    className={`w-full h-1.5 rounded-full transition-colors ${
                      isPast
                        ? "bg-[#6F5642]"
                        : isCurrent
                        ? "bg-[#F2B455] ring-2 ring-[#F2B455]/50 ring-offset-1"
                        : "bg-[#6F5642]/20"
                    }`}
                  />
                  <span
                    className={`text-[9px] mt-1 truncate max-w-[55px] font-mono ${
                      isCurrent
                        ? "text-[#4A433D] font-bold"
                        : isPast
                        ? "text-[#6F5642] font-medium"
                        : "text-[#6F5642]/40"
                    }`}
                    title={stage.replace(/_/g, " ")}
                  >
                    {idx + 1}. {stage.split("_")[0]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Stage Control Action Bar */}
        <div className="px-6 py-2.5 bg-[#F6EFE3] border-b border-[#6F5642]/20 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-[#4A433D]">Transition Stage:</span>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="h-8 px-2.5 bg-white border border-[#6F5642]/30 rounded-md text-xs font-semibold text-[#4A433D] focus:ring-2 focus:ring-[#F2B455]"
            >
              {PROJECT_STAGES.map((st, i) => (
                <option key={st} value={st}>
                  {i + 1}. {st.replace(/_/g, " ")}
                </option>
              ))}
            </select>

            <Input
              placeholder="Stage transition notes..."
              value={stageNotes}
              onChange={(e) => setStageNotes(e.target.value)}
              className="h-8 text-xs w-64 bg-white border-[#6F5642]/30"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={isChangingStage || selectedStage === project?.stage}
              onClick={handleStageChange}
              leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
              className="bg-[#6F5642] hover:bg-[#4A433D] text-white"
            >
              {isChangingStage ? "Advancing..." : "Apply Transition"}
            </Button>
          </div>
        </div>

        {error && (
          <div className="px-6 py-2 bg-rose-50 border-b border-rose-200 text-rose-700 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4" />
              <span>{error}</span>
            </div>
            <button onClick={() => setError("")} className="text-rose-500 hover:text-rose-700 font-bold">
              ×
            </button>
          </div>
        )}

        {/* Workspace Navigation Tabs */}
        <div className="px-6 border-b border-[#6F5642]/20 bg-[#ECF4F0] flex gap-6 shrink-0 overflow-x-auto">
          {[
            { key: "overview", label: "Overview", icon: Layers },
            { key: "stages", label: "Workflow & Stages", icon: CheckSquare },
            { key: "team", label: "Team & Roles", icon: Users },
            { key: "timeline", label: "Timeline", icon: Clock },
            { key: "financials", label: "Financials & Milestones", icon: DollarSign },
            { key: "changeOrders", label: "Change Orders", icon: FileText },
            { key: "quality", label: "Quality Checks", icon: ShieldCheck },
            { key: "warranty", label: "Warranty & Handover", icon: Sparkles },
            { key: "notes", label: "Notes History", icon: MessageSquare },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-[#6F5642] text-[#4A433D]"
                    : "border-transparent text-[#6F5642] hover:text-[#4A433D]"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Workspace Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-[#F6EFE3]">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-[#6F5642] text-xs">
              Loading project profile...
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Review & Referral Prompt Notice Card (30-60 Day Post Handover) */}
                  {reviewReferralStatus.status !== "NOT_APPLICABLE" && (
                    <div
                      className={`p-4 rounded-xl border flex items-center justify-between ${
                        reviewReferralStatus.status === "DUE_NOW"
                          ? "bg-[#F2B455]/20 border-[#F2B455] text-[#4A433D]"
                          : reviewReferralStatus.status === "SCHEDULED"
                          ? "bg-[#ECF4F0] border-[#6F5642]/30 text-[#4A433D]"
                          : "bg-white border-[#6F5642]/20 text-[#4A433D]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <div className="p-2 bg-[#F2B455] text-white rounded-lg">
                          <Award className="w-5 h-5" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h4 className="text-xs font-bold uppercase tracking-wider">
                              Post-Handover Review & Referral Window
                            </h4>
                            <Badge
                              variant={
                                reviewReferralStatus.status === "DUE_NOW"
                                  ? "completed"
                                  : "neutral"
                              }
                            >
                              {reviewReferralStatus.badge}
                            </Badge>
                          </div>
                          <p className="text-xs mt-0.5 text-[#6F5642]">{reviewReferralStatus.message}</p>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setActiveTab("warranty")}
                          className="text-xs border-[#6F5642]/40"
                        >
                          View Warranty Log
                        </Button>
                      </div>
                    </div>
                  )}

                  {/* Financial KPI Summary Cards */}
                  {canViewFinancials && financialSummary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-white border border-[#6F5642]/20 rounded-xl shadow-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">
                          Adjusted Contract Value
                        </span>
                        <div className="text-base font-bold text-[#4A433D] mt-1 font-mono tabular-nums">
                          {formatCurrency(financialSummary.adjustedContractValue)}
                        </div>
                        <span className="text-[10px] text-[#6F5642]/70 font-mono">
                          Base: {formatCurrency(financialSummary.contractValue)} + CO: {formatCurrency(financialSummary.approvedChangeOrdersTotal)}
                        </span>
                      </div>

                      <div className="p-4 bg-white border border-[#6F5642]/20 rounded-xl shadow-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">
                          Total Received
                        </span>
                        <div className="text-base font-bold text-emerald-700 mt-1 font-mono tabular-nums">
                          {formatCurrency(financialSummary.totalReceived)}
                        </div>
                        <span className="text-[10px] text-[#6F5642]/70 font-mono">
                          {financialSummary.paymentCompletionPct}% Collected
                        </span>
                      </div>

                      <div className="p-4 bg-white border border-[#6F5642]/20 rounded-xl shadow-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">
                          Outstanding Receivables
                        </span>
                        <div className="text-base font-bold text-amber-700 mt-1 font-mono tabular-nums">
                          {formatCurrency(financialSummary.totalOutstanding)}
                        </div>
                        <span className="text-[10px] text-[#6F5642]/70">Balance due from client</span>
                      </div>

                      <div className="p-4 bg-white border border-[#6F5642]/20 rounded-xl shadow-xs">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">
                          Total Project Expenses
                        </span>
                        <div className="text-base font-bold text-[#4A433D] mt-1 font-mono tabular-nums">
                          {formatCurrency(financialSummary.totalExpenses)}
                        </div>
                        <span className="text-[10px] text-[#6F5642]/70 font-mono">
                          Est. Margin: {financialSummary.grossMarginPct}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Project Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* General Metadata */}
                    <div className="p-5 bg-white border border-[#6F5642]/20 rounded-xl shadow-xs space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A433D]">Project Information</h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-[#6F5642]/10">
                          <span className="text-[#6F5642]">Property Type</span>
                          <span className="font-semibold text-[#4A433D]">
                            {project?.propertyTypeKey?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#6F5642]/10">
                          <span className="text-[#6F5642]">Priority Level</span>
                          <span className="font-semibold text-[#4A433D]">{project?.priority}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#6F5642]/10">
                          <span className="text-[#6F5642]">Start Date</span>
                          <span className="font-semibold text-[#4A433D] font-mono">
                            {project?.startDate ? formatDate(project.startDate) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#6F5642]/10">
                          <span className="text-[#6F5642]">Target Completion</span>
                          <span className="font-semibold text-[#4A433D] font-mono">
                            {project?.targetCompletionDate ? formatDate(project.targetCompletionDate) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-[#6F5642]">Delay Health</span>
                          <span className={`font-semibold ${delayHealth.status === "DELAYED" ? "text-rose-600" : "text-emerald-700"}`}>
                            {delayHealth.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Client & Site Location */}
                    <div className="p-5 bg-white border border-[#6F5642]/20 rounded-xl shadow-xs space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-[#4A433D]">Client & Site Location</h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-[#6F5642]/10">
                          <span className="text-[#6F5642]">Client Name</span>
                          <span className="font-semibold text-[#4A433D]">{project?.client?.fullName || "—"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#6F5642]/10">
                          <span className="text-[#6F5642]">Phone Number</span>
                          <span className="font-semibold text-[#4A433D] font-mono">{project?.client?.phone || "—"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-[#6F5642]/10">
                          <span className="text-[#6F5642]">Site Location</span>
                          <span className="font-semibold text-[#4A433D] text-right max-w-[200px]">
                            {project?.siteAddress || "—"}, {project?.city}
                          </span>
                        </div>
                        {project?.client?.email && (
                          <div className="flex justify-between py-1 border-b border-[#6F5642]/10">
                            <span className="text-[#6F5642]">Email</span>
                            <span className="font-semibold text-[#4A433D]">{project.client.email}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 2: STAGES & WORKFLOW */}
              {activeTab === "stages" && (
                <div className="space-y-6">
                  {/* Canonical 13 Stages Progression Table */}
                  <div className="bg-white border border-[#6F5642]/20 rounded-xl shadow-xs overflow-hidden">
                    <div className="px-5 py-3 border-b border-[#6F5642]/10 bg-[#ECF4F0] flex items-center justify-between">
                      <h3 className="text-xs font-bold text-[#4A433D]">13-Stage Production Workflow</h3>
                      <span className="text-[11px] text-[#6F5642] font-mono">
                        Active Stage: {project?.stage}
                      </span>
                    </div>

                    <div className="divide-y divide-[#6F5642]/10">
                      {stageDefinitions.map((stageDef: any) => {
                        const idx = PROJECT_STAGES.indexOf(stageDef.key as any);
                        const isPast = currentStageIndex > idx;
                        const isCurrent = currentStageIndex === idx;

                        return (
                          <div
                            key={stageDef.key}
                            className={`p-4 flex items-center justify-between ${
                              isCurrent ? "bg-[#F2B455]/10" : isPast ? "bg-white" : "bg-[#F6EFE3]/30"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isPast
                                    ? "bg-[#6F5642] text-white"
                                    : isCurrent
                                    ? "bg-[#F2B455] text-white ring-4 ring-[#F2B455]/30"
                                    : "bg-[#6F5642]/20 text-[#6F5642]"
                                }`}
                              >
                                {isPast ? "✓" : stageDef.order}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-[#4A433D]">{stageDef.title}</h4>
                                <p className="text-[11px] text-[#6F5642]">{stageDef.description}</p>
                              </div>
                            </div>

                            <div className="flex items-center gap-3">
                              <Badge variant="neutral">{stageDef.defaultRole.replace(/_/g, " ")}</Badge>
                              <Badge variant={isPast ? "completed" : isCurrent ? "active" : "pending"}>
                                {isPast ? "COMPLETED" : isCurrent ? "IN PROGRESS" : "PENDING"}
                              </Badge>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Stage Transition History */}
                  <div className="bg-white border border-[#6F5642]/20 rounded-xl shadow-xs p-5 space-y-3">
                    <h3 className="text-xs font-bold text-[#4A433D]">Immutable Stage Transition Audit History</h3>
                    <div className="space-y-2">
                      {project?.stageHistory?.length === 0 ? (
                        <div className="text-center py-4 text-xs text-[#6F5642]">No transition history recorded</div>
                      ) : (
                        project?.stageHistory?.map((hist: any) => (
                          <div
                            key={hist.id}
                            className="p-3 bg-[#ECF4F0] rounded-lg border border-[#6F5642]/20 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-[#4A433D]">
                                {hist.fromStage ? `${hist.fromStage.replace(/_/g, " ")} → ` : ""}
                                {hist.toStage.replace(/_/g, " ")}
                              </span>
                              {hist.notes && <p className="text-[11px] text-[#6F5642] mt-0.5">{hist.notes}</p>}
                              {hist.delayReason && (
                                <Badge variant="danger" className="mt-1">
                                  Delay: {hist.delayReason.replace(/_/g, " ")}
                                </Badge>
                              )}
                            </div>
                            <span className="text-[10px] text-[#6F5642] font-mono">{formatDate(hist.createdAt)}</span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TEAM & ROLES */}
              {activeTab === "team" && (
                <div className="space-y-6">
                  <div className="bg-white border border-[#6F5642]/20 rounded-xl shadow-xs p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#6F5642]/10 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-[#4A433D]">Assigned Project Team</h3>
                        <p className="text-[11px] text-[#6F5642]">Team members responsible for project execution</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsAddMemberModalOpen(true)}
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        className="bg-[#6F5642] hover:bg-[#4A433D] text-white"
                      >
                        Assign Member
                      </Button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {project?.members?.length === 0 ? (
                        <div className="col-span-2 text-center py-6 text-xs text-[#6F5642]">
                          No team members assigned yet.
                        </div>
                      ) : (
                        project?.members?.map((m: any) => (
                          <div
                            key={m.id}
                            className="p-3.5 bg-[#ECF4F0] border border-[#6F5642]/20 rounded-lg flex items-center justify-between"
                          >
                            <div className="flex items-center gap-3">
                              <div className="w-8 h-8 rounded-full bg-[#6F5642] text-white flex items-center justify-center font-bold text-xs">
                                {m.user?.fullName?.charAt(0) || "U"}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-[#4A433D]">{m.user?.fullName}</h4>
                                <p className="text-[11px] text-[#6F5642]">{m.user?.email}</p>
                                <Badge variant="neutral" className="mt-1 text-[10px]">
                                  {m.role.replace(/_/g, " ")}
                                </Badge>
                              </div>
                            </div>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => handleRemoveMember(m.userId)}
                              className="text-xs text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                            >
                              Remove
                            </Button>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 4: TIMELINE */}
              {activeTab === "timeline" && (
                <div className="bg-white border border-[#6F5642]/20 rounded-xl shadow-xs p-5 space-y-4">
                  <h3 className="text-xs font-bold text-[#4A433D]">Chronological Project Event History</h3>
                  <div className="relative pl-6 space-y-4 before:absolute before:left-2 before:top-2 before:bottom-2 before:w-0.5 before:bg-[#6F5642]/20">
                    {timeline.length === 0 ? (
                      <div className="text-center py-6 text-xs text-[#6F5642]">No timeline events recorded yet.</div>
                    ) : (
                      timeline.map((evt: any, i: number) => (
                        <div key={i} className="relative text-xs">
                          <div className="absolute -left-6 top-1 w-2.5 h-2.5 rounded-full bg-[#6F5642] ring-4 ring-[#ECF4F0]" />
                          <div className="p-3 bg-[#ECF4F0] border border-[#6F5642]/20 rounded-lg space-y-1">
                            <div className="flex items-center justify-between">
                              <span className="font-bold text-[#4A433D]">{evt.title}</span>
                              <span className="text-[10px] text-[#6F5642] font-mono">{formatDate(evt.timestamp || evt.createdAt)}</span>
                            </div>
                            {evt.description && <p className="text-[11px] text-[#6F5642]">{evt.description}</p>}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: FINANCIALS & MILESTONES */}
              {activeTab === "financials" && (
                <div className="space-y-6">
                  {/* Payment Milestones Table */}
                  <div className="bg-white border border-[#6F5642]/20 rounded-xl shadow-xs p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#6F5642]/10 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-[#4A433D]">Project Payment Milestones</h3>
                        <p className="text-[11px] text-[#6F5642]">Contract milestone stages and payment tracking</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsRecordPaymentModalOpen(true)}
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        className="bg-[#6F5642] hover:bg-[#4A433D] text-white"
                      >
                        Record Payment
                      </Button>
                    </div>

                    <div className="divide-y divide-[#6F5642]/10">
                      {project?.paymentMilestones?.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#6F5642]">No payment milestones defined.</div>
                      ) : (
                        project?.paymentMilestones?.map((pm: any) => (
                          <div key={pm.id} className="py-3 flex items-center justify-between text-xs">
                            <div>
                              <span className="font-bold text-[#4A433D]">{pm.title}</span>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-[11px] text-[#6F5642] font-mono">
                                  {pm.milestonePct}% of Contract
                                </span>
                                {pm.dueDate && (
                                  <span className="text-[11px] text-[#6F5642] font-mono">
                                    • Due: {formatDate(pm.dueDate)}
                                  </span>
                                )}
                              </div>
                            </div>

                            <div className="flex items-center gap-4">
                              <span className="font-bold font-mono tabular-nums text-[#4A433D]">
                                {formatCurrency(pm.amount)}
                              </span>
                              <Badge variant={pm.status === "PAID" ? "completed" : "pending"}>
                                {pm.status}
                              </Badge>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>

                  {/* Verified Client Payments */}
                  <div className="bg-white border border-[#6F5642]/20 rounded-xl shadow-xs p-5 space-y-3">
                    <h3 className="text-xs font-bold text-[#4A433D]">Verified Client Payments</h3>
                    <div className="space-y-2">
                      {project?.payments?.length === 0 ? (
                        <div className="text-center py-4 text-xs text-[#6F5642]">No payment receipts verified yet.</div>
                      ) : (
                        project?.payments?.map((pay: any) => (
                          <div
                            key={pay.id}
                            className="p-3 bg-[#ECF4F0] rounded-lg border border-[#6F5642]/20 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-[#4A433D] font-mono">{pay.referenceNo}</span>
                              <span className="text-[#6F5642] ml-2">via {pay.paymentMode}</span>
                            </div>
                            <div className="flex items-center gap-3">
                              <span className="font-bold font-mono text-emerald-700 tabular-nums">
                                {formatCurrency(pay.amount)}
                              </span>
                              <span className="text-[10px] text-[#6F5642] font-mono">{formatDate(pay.paymentDate)}</span>
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 6: CHANGE ORDERS */}
              {activeTab === "changeOrders" && (
                <div className="space-y-6">
                  <div className="bg-white border border-[#6F5642]/20 rounded-xl shadow-xs p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#6F5642]/10 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-[#4A433D]">Scope Change Orders</h3>
                        <p className="text-[11px] text-[#6F5642]">Track formal additions, variations, and budget impacts</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsCoModalOpen(true)}
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        className="bg-[#6F5642] hover:bg-[#4A433D] text-white"
                      >
                        Create Change Order
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {project?.changeOrders?.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#6F5642]">No scope change orders recorded.</div>
                      ) : (
                        project?.changeOrders?.map((co: any) => (
                          <div
                            key={co.id}
                            className="p-4 bg-[#ECF4F0] border border-[#6F5642]/20 rounded-xl flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#6F5642]">{co.referenceNo}</span>
                                <span className="text-xs font-bold text-[#4A433D]">{co.title}</span>
                                <Badge variant={co.status === "APPROVED" ? "completed" : co.status === "REJECTED" ? "danger" : "pending"}>
                                  {co.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-[#6F5642] mt-1">{co.description}</p>
                              {co.timelineImpactDays > 0 && (
                                <span className="text-[10px] text-[#6F5642] mt-0.5 block">
                                  Timeline Impact: +{co.timelineImpactDays} days
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3">
                              <span className="font-bold font-mono text-xs tabular-nums text-[#4A433D]">
                                {formatCurrency(co.amount)}
                              </span>
                              {co.status === "PENDING" && (
                                <Button
                                  size="sm"
                                  onClick={() => handleApproveChangeOrder(co.id)}
                                  className="bg-emerald-700 hover:bg-emerald-800 text-white text-xs"
                                >
                                  Approve
                                </Button>
                              )}
                            </div>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 7: QUALITY CHECKS */}
              {activeTab === "quality" && (
                <div className="space-y-6">
                  <div className="bg-white border border-[#6F5642]/20 rounded-xl shadow-xs p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#6F5642]/10 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-[#4A433D]">Quality Check Audits</h3>
                        <p className="text-[11px] text-[#6F5642]">Inspection records prior to formal handover</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsQcModalOpen(true)}
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        className="bg-[#6F5642] hover:bg-[#4A433D] text-white"
                      >
                        Record Inspection
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {project?.qualityChecks?.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#6F5642]">No quality checks recorded yet.</div>
                      ) : (
                        project?.qualityChecks?.map((qc: any) => (
                          <div
                            key={qc.id}
                            className="p-4 bg-[#ECF4F0] border border-[#6F5642]/20 rounded-xl space-y-1.5"
                          >
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-2">
                                <Badge variant={qc.passed ? "completed" : "danger"}>
                                  {qc.status || (qc.passed ? "PASSED" : "FAILED")}
                                </Badge>
                                <span className="text-xs font-mono text-[#6F5642]">{formatDate(qc.createdAt)}</span>
                              </div>
                            </div>
                            {qc.issues && <p className="text-xs text-[#4A433D]"><strong className="text-[#6F5642]">Issues:</strong> {qc.issues}</p>}
                            {qc.correctiveAction && (
                              <p className="text-xs text-[#4A433D]"><strong className="text-[#6F5642]">Corrective Action:</strong> {qc.correctiveAction}</p>
                            )}
                            {qc.notes && <p className="text-xs text-[#6F5642]">{qc.notes}</p>}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 8: WARRANTY & HANDOVER */}
              {activeTab === "warranty" && (
                <div className="space-y-6">
                  {/* Handover Card */}
                  <div className="bg-white border border-[#6F5642]/20 rounded-xl shadow-xs p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#6F5642]/10 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-[#4A433D]">Project Handover & Warranty Status</h3>
                        <p className="text-[11px] text-[#6F5642]">Formal commissioning and warranty coverage</p>
                      </div>
                      {project?.handoverStatus !== "COMPLETED" && (
                        <Button
                          size="sm"
                          onClick={() => setIsHandoverModalOpen(true)}
                          className="bg-[#6F5642] hover:bg-[#4A433D] text-white"
                        >
                          Execute Handover
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                      <div className="p-3 bg-[#ECF4F0] rounded-lg border border-[#6F5642]/20">
                        <span className="text-[#6F5642] block">Handover Date</span>
                        <span className="font-bold text-[#4A433D] font-mono mt-0.5 block">
                          {project?.handoverDate ? formatDate(project.handoverDate) : "Pending"}
                        </span>
                      </div>
                      <div className="p-3 bg-[#ECF4F0] rounded-lg border border-[#6F5642]/20">
                        <span className="text-[#6F5642] block">Warranty Window</span>
                        <span className="font-bold text-[#4A433D] mt-0.5 block">
                          {project?.warrantyDurationMonths || 12} Months ({project?.warrantyStatus || "PENDING"})
                        </span>
                      </div>
                      <div className="p-3 bg-[#ECF4F0] rounded-lg border border-[#6F5642]/20">
                        <span className="text-[#6F5642] block">30–60 Day Review Status</span>
                        <span className="font-bold text-[#4A433D] mt-0.5 block">
                          {reviewReferralStatus.badge}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Warranty Issues Log */}
                  <div className="bg-white border border-[#6F5642]/20 rounded-xl shadow-xs p-5 space-y-4">
                    <div className="flex items-center justify-between border-b border-[#6F5642]/10 pb-3">
                      <div>
                        <h3 className="text-xs font-bold text-[#4A433D]">Post-Handover Warranty Complaints Log</h3>
                        <p className="text-[11px] text-[#6F5642]">Client service requests and resolution audit</p>
                      </div>
                      <Button
                        size="sm"
                        onClick={() => setIsWarModalOpen(true)}
                        leftIcon={<Plus className="w-3.5 h-3.5" />}
                        className="bg-[#6F5642] hover:bg-[#4A433D] text-white"
                      >
                        Log Issue
                      </Button>
                    </div>

                    <div className="space-y-3">
                      {project?.warrantyIssues?.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#6F5642]">No warranty issues logged.</div>
                      ) : (
                        project?.warrantyIssues?.map((war: any) => (
                          <div
                            key={war.id}
                            className="p-4 bg-[#ECF4F0] border border-[#6F5642]/20 rounded-xl flex items-center justify-between"
                          >
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono text-xs font-bold text-[#6F5642]">{war.issueNo}</span>
                                <span className="text-xs font-bold text-[#4A433D]">{war.title}</span>
                                <Badge variant={war.status === "RESOLVED" ? "completed" : "danger"}>
                                  {war.status}
                                </Badge>
                              </div>
                              <p className="text-xs text-[#6F5642] mt-1">{war.description}</p>
                              {war.resolutionNotes && (
                                <p className="text-xs text-emerald-800 mt-1 font-medium">
                                  ✓ Resolution: {war.resolutionNotes}
                                </p>
                              )}
                            </div>

                            {war.status === "OPEN" && (
                              <Button
                                size="sm"
                                variant="outline"
                                onClick={() => handleResolveWarrantyIssue(war.id)}
                                className="text-xs"
                              >
                                Resolve
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 9: NOTES */}
              {activeTab === "notes" && (
                <div className="space-y-6">
                  {/* Add Note Form */}
                  <div className="bg-white border border-[#6F5642]/20 rounded-xl shadow-xs p-5 space-y-3">
                    <h3 className="text-xs font-bold text-[#4A433D]">Add Project Note</h3>
                    <form onSubmit={handleAddNote} className="space-y-3">
                      <textarea
                        value={newNoteText}
                        onChange={(e) => setNewNoteText(e.target.value)}
                        placeholder="Type project updates, site notes, or instructions..."
                        rows={3}
                        className="w-full p-3 bg-white border border-[#6F5642]/30 rounded-lg text-xs text-[#4A433D] focus:ring-2 focus:ring-[#F2B455]"
                      />
                      <div className="flex justify-end">
                        <Button
                          type="submit"
                          size="sm"
                          disabled={isSubmittingNote || !newNoteText.trim()}
                          className="bg-[#6F5642] hover:bg-[#4A433D] text-white"
                        >
                          {isSubmittingNote ? "Saving..." : "Save Note"}
                        </Button>
                      </div>
                    </form>
                  </div>

                  {/* Notes History */}
                  <div className="bg-white border border-[#6F5642]/20 rounded-xl shadow-xs p-5 space-y-3">
                    <h3 className="text-xs font-bold text-[#4A433D]">Recorded Notes History</h3>
                    <div className="space-y-2">
                      {parsedNotes.length === 0 ? (
                        <div className="text-center py-6 text-xs text-[#6F5642]">No notes recorded yet.</div>
                      ) : (
                        parsedNotes.map((noteLine: string, idx: number) => (
                          <div
                            key={idx}
                            className="p-3 bg-[#ECF4F0] rounded-lg border border-[#6F5642]/20 text-xs text-[#4A433D]"
                          >
                            {noteLine}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* MODALS */}
        {/* Add Team Member Modal */}
        {isAddMemberModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-[#6F5642]/20">
              <h3 className="text-sm font-bold text-[#4A433D]">Assign Team Member</h3>
              <form onSubmit={handleAddMember} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#6F5642] block mb-1">Select User</label>
                  <select
                    value={selectedUserToAssign}
                    onChange={(e) => setSelectedUserToAssign(e.target.value)}
                    className="w-full h-9 px-3 border border-[#6F5642]/30 rounded-lg text-xs"
                    required
                  >
                    <option value="">-- Choose Employee --</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.id}>
                        {u.fullName || u.user?.fullName} ({u.role || u.designation || "Staff"})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="text-xs font-semibold text-[#6F5642] block mb-1">Project Role</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="w-full h-9 px-3 border border-[#6F5642]/30 rounded-lg text-xs"
                  >
                    {PROJECT_MEMBER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddMemberModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-[#6F5642] hover:bg-[#4A433D] text-white">
                    Assign
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Change Order Modal */}
        {isCoModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-[#6F5642]/20">
              <h3 className="text-sm font-bold text-[#4A433D]">Create Scope Change Order</h3>
              <form onSubmit={handleCreateChangeOrder} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#6F5642] block mb-1">Title</label>
                  <Input
                    value={coTitle}
                    onChange={(e) => setCoTitle(e.target.value)}
                    placeholder="Change Order Title"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6F5642] block mb-1">Description & Scope Details</label>
                  <textarea
                    value={coDescription}
                    onChange={(e) => setCoDescription(e.target.value)}
                    placeholder="Describe specific scope addition and materials..."
                    rows={3}
                    className="w-full p-2 border border-[#6F5642]/30 rounded-lg text-xs"
                    required
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-xs font-semibold text-[#6F5642] block mb-1">Additional Cost (₹)</label>
                    <Input
                      type="number"
                      value={coCost}
                      onChange={(e) => setCoCost(e.target.value)}
                      placeholder="0"
                      required
                    />
                  </div>
                  <div>
                    <label className="text-xs font-semibold text-[#6F5642] block mb-1">Timeline Impact (Days)</label>
                    <Input
                      type="number"
                      value={coTimelineImpact}
                      onChange={(e) => setCoTimelineImpact(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCoModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmittingCo} className="bg-[#6F5642] hover:bg-[#4A433D] text-white">
                    {isSubmittingCo ? "Saving..." : "Create Change Order"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Quality Check Modal */}
        {isQcModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-[#6F5642]/20">
              <h3 className="text-sm font-bold text-[#4A433D]">Record Quality Check Inspection</h3>
              <form onSubmit={handleRecordQualityCheck} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#6F5642] block mb-1">Inspection Status</label>
                  <select
                    value={qcStatus}
                    onChange={(e) => setQcStatus(e.target.value)}
                    className="w-full h-9 px-3 border border-[#6F5642]/30 rounded-lg text-xs font-semibold"
                  >
                    <option value="PASSED">PASSED (Ready for Handover)</option>
                    <option value="FAILED">FAILED (Issues Requiring Fix)</option>
                    <option value="RECHECK_REQUIRED">RECHECK REQUIRED</option>
                  </select>
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6F5642] block mb-1">Issues Identified</label>
                  <textarea
                    value={qcIssues}
                    onChange={(e) => setQcIssues(e.target.value)}
                    placeholder="List snags, alignment deviations, or finish defects..."
                    rows={2}
                    className="w-full p-2 border border-[#6F5642]/30 rounded-lg text-xs"
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6F5642] block mb-1">Corrective Actions</label>
                  <textarea
                    value={qcCorrectiveAction}
                    onChange={(e) => setQcCorrectiveAction(e.target.value)}
                    placeholder="Required fixes prior to re-inspection..."
                    rows={2}
                    className="w-full p-2 border border-[#6F5642]/30 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsQcModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmittingQc} className="bg-[#6F5642] hover:bg-[#4A433D] text-white">
                    {isSubmittingQc ? "Saving..." : "Record Inspection"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Handover Modal */}
        {isHandoverModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-[#6F5642]/20">
              <h3 className="text-sm font-bold text-[#4A433D]">Execute Project Handover</h3>
              <p className="text-xs text-[#6F5642]">
                Formal commissioning, client sign-off, and warranty activation.
              </p>
              <form onSubmit={handleCompleteHandover} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#6F5642] block mb-1">Warranty Duration (Months)</label>
                  <Input
                    type="number"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(parseInt(e.target.value, 10) || 12)}
                    min={1}
                    max={60}
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6F5642] block mb-1">Handover Notes</label>
                  <textarea
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    placeholder="Snag list clearance and client sign-off notes..."
                    rows={3}
                    className="w-full p-2 border border-[#6F5642]/30 rounded-lg text-xs"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsHandoverModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" className="bg-[#6F5642] hover:bg-[#4A433D] text-white">
                    Complete Handover
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Warranty Issue Modal */}
        {isWarModalOpen && (
          <div className="fixed inset-0 z-60 bg-black/40 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl max-w-md w-full p-5 space-y-4 shadow-xl border border-[#6F5642]/20">
              <h3 className="text-sm font-bold text-[#4A433D]">Log Post-Handover Warranty Issue</h3>
              <form onSubmit={handleLogWarrantyIssue} className="space-y-3">
                <div>
                  <label className="text-xs font-semibold text-[#6F5642] block mb-1">Complaint Title</label>
                  <Input
                    value={warTitle}
                    onChange={(e) => setWarTitle(e.target.value)}
                    placeholder="e.g. Master Bedroom Wardrobe Hinge Loose"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6F5642] block mb-1">Complaint Details</label>
                  <textarea
                    value={warDescription}
                    onChange={(e) => setWarDescription(e.target.value)}
                    placeholder="Describe issue location, nature of defect, and client request..."
                    rows={3}
                    className="w-full p-2 border border-[#6F5642]/30 rounded-lg text-xs"
                    required
                  />
                </div>
                <div>
                  <label className="text-xs font-semibold text-[#6F5642] block mb-1">Priority</label>
                  <select
                    value={warPriority}
                    onChange={(e) => setWarPriority(e.target.value)}
                    className="w-full h-9 px-3 border border-[#6F5642]/30 rounded-lg text-xs"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsWarModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmittingWar} className="bg-[#6F5642] hover:bg-[#4A433D] text-white">
                    {isSubmittingWar ? "Saving..." : "Log Issue"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Record Payment Modal */}
        {isRecordPaymentModalOpen && (
          <RecordPaymentModal
            isOpen={isRecordPaymentModalOpen}
            onClose={() => setIsRecordPaymentModalOpen(false)}
            onSuccess={() => {
              fetchProjectDetails();
              onUpdate();
            }}
            initialProjectId={projectId || undefined}
            initialClientId={project?.clientId || undefined}
          />
        )}
      </div>
    </div>
  );
};
