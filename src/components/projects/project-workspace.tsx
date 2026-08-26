"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { RecordPaymentModal } from "@/components/payments/record-payment-modal";
import {
  X,
  Calendar,
  Phone,
  Mail,
  MapPin,
  Users,
  FileText,
  CheckCircle2,
  AlertTriangle,
  Plus,
  ArrowRight,
  ShieldCheck,
  DollarSign,
  TrendingUp,
  MessageSquare,
  Clock,
  Briefcase,
  Layers,
  Wrench,
  CheckSquare,
  Sparkles,
  ExternalLink,
} from "lucide-react";
import { formatCurrency, formatDate, formatRelativeTime } from "@/lib/utils";
import {
  PROJECT_STAGES,
  DELAY_REASONS,
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
    | "tasks"
    | "materials"
    | "financials"
    | "quality"
    | "handover"
    | "changeOrders"
    | "timeline"
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

  // Task modal
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskTitle, setTaskTitle] = useState("");
  const [taskDescription, setTaskDescription] = useState("");
  const [taskStage, setTaskStage] = useState("");
  const [taskAssignee, setTaskAssignee] = useState("");
  const [taskPriority, setTaskPriority] = useState("NORMAL");
  const [taskDueDate, setTaskDueDate] = useState("");

  // Change Order modal
  const [isCoModalOpen, setIsCoModalOpen] = useState(false);
  const [coTitle, setCoTitle] = useState("Scope Change Order");
  const [coDescription, setCoDescription] = useState("");
  const [coCost, setCoCost] = useState("");
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
        setTaskStage(json.data.project.stage);
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

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!taskTitle) return;

    try {
      const res = await fetch(`/api/v1/projects/${projectId}/tasks`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: taskTitle,
          description: taskDescription,
          stage: taskStage || project.stage,
          assigneeId: taskAssignee || undefined,
          priority: taskPriority,
          dueAt: taskDueDate ? new Date(taskDueDate).toISOString() : undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsTaskModalOpen(false);
        setTaskTitle("");
        setTaskDescription("");
        await fetchProjectDetails();
      } else {
        alert(json.error?.message || "Failed to create task");
      }
    } catch {
      alert("Network error creating task");
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
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsCoModalOpen(false);
        setCoTitle("Scope Change Order");
        setCoDescription("");
        setCoCost("");
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

  const currentStageIndex = PROJECT_STAGES.indexOf(project?.stage as any);

  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-slate-900/50 backdrop-blur-xs flex justify-end animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-white h-full shadow-2xl flex flex-col border-l border-slate-200 select-none">
        {/* Top Bar Header */}
        <div className="px-6 py-4 border-b border-slate-200 flex items-center justify-between bg-slate-50/80 shrink-0">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-emerald-100 text-emerald-800 rounded-lg">
              <Briefcase className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-slate-500">{project?.referenceNo}</span>
                <span className="text-slate-300">•</span>
                <h2 className="text-base font-bold text-slate-900 tracking-tight">{project?.title}</h2>
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
              <p className="text-xs text-slate-500 mt-0.5">
                Client: <span className="font-semibold text-slate-700">{project?.client?.fullName || "—"}</span>
                {project?.siteAddress && ` • ${project.siteAddress}, ${project.city}`}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* 13-Stage Visual Stepper */}
        <div className="px-6 py-3 bg-white border-b border-slate-200/80 overflow-x-auto shrink-0">
          <div className="flex items-center justify-between text-[11px] font-semibold text-slate-600 mb-2">
            <span>Execution Stage Progress ({project?.progressPct || 0}%)</span>
            <span className="text-emerald-700 font-bold">
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
                        ? "bg-emerald-500"
                        : isCurrent
                        ? "bg-emerald-600 ring-2 ring-emerald-300 ring-offset-1"
                        : "bg-slate-200"
                    }`}
                  />
                  <span
                    className={`text-[9px] mt-1 truncate max-w-[55px] font-mono ${
                      isCurrent
                        ? "text-emerald-700 font-bold"
                        : isPast
                        ? "text-slate-700 font-medium"
                        : "text-slate-400"
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
        <div className="px-6 py-2.5 bg-slate-50 border-b border-slate-200 flex flex-wrap items-center justify-between gap-3 shrink-0">
          <div className="flex items-center gap-2">
            <span className="text-xs font-semibold text-slate-700">Transition Stage:</span>
            <select
              value={selectedStage}
              onChange={(e) => setSelectedStage(e.target.value)}
              className="h-8 px-2.5 bg-white border border-slate-200 rounded-md text-xs font-semibold text-slate-800 focus:ring-2 focus:ring-emerald-500"
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
              className="h-8 text-xs w-64 bg-white"
            />
          </div>

          <div className="flex items-center gap-2">
            <Button
              size="sm"
              disabled={isChangingStage || selectedStage === project?.stage}
              onClick={handleStageChange}
              leftIcon={<ArrowRight className="w-3.5 h-3.5" />}
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
        <div className="px-6 border-b border-slate-200 bg-white flex gap-6 shrink-0 overflow-x-auto">
          {[
            { key: "overview", label: "Overview", icon: Layers },
            { key: "stages", label: "Workflow & Stages", icon: CheckSquare },
            { key: "team", label: "Team & Roles", icon: Users },
            { key: "tasks", label: "Tasks & Schedule", icon: CheckCircle2 },
            { key: "materials", label: "Materials & Procurement", icon: Wrench },
            { key: "financials", label: "Financials & Payments", icon: DollarSign },
            { key: "quality", label: "Quality Check", icon: ShieldCheck },
            { key: "handover", label: "Handover & Warranty", icon: Sparkles },
            { key: "changeOrders", label: "Change Orders", icon: FileText },
            { key: "timeline", label: "Activity Timeline", icon: Clock },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.key;
            return (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as any)}
                className={`py-3 text-xs font-semibold border-b-2 flex items-center gap-1.5 transition-colors whitespace-nowrap ${
                  isActive
                    ? "border-emerald-600 text-emerald-700"
                    : "border-transparent text-slate-500 hover:text-slate-800"
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                {tab.label}
              </button>
            );
          })}
        </div>

        {/* Workspace Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
          {isLoading ? (
            <div className="h-48 flex items-center justify-center text-slate-400 text-xs">
              Loading project profile...
            </div>
          ) : (
            <>
              {/* TAB 1: OVERVIEW */}
              {activeTab === "overview" && (
                <div className="space-y-6">
                  {/* Financial KPI Summary Cards */}
                  {canViewFinancials && financialSummary && (
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-subtle">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                          Adjusted Contract Value
                        </span>
                        <div className="text-base font-bold text-slate-900 mt-1 tabular-nums">
                          {formatCurrency(financialSummary.adjustedContractValue)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Base: {formatCurrency(financialSummary.contractValue)} + CO: {formatCurrency(financialSummary.approvedChangeOrdersTotal)}
                        </span>
                      </div>

                      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-subtle">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                          Total Received
                        </span>
                        <div className="text-base font-bold text-emerald-600 mt-1 tabular-nums">
                          {formatCurrency(financialSummary.totalReceived)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          {financialSummary.paymentCompletionPct}% Collected
                        </span>
                      </div>

                      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-subtle">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                          Outstanding Receivables
                        </span>
                        <div className="text-base font-bold text-amber-600 mt-1 tabular-nums">
                          {formatCurrency(financialSummary.totalOutstanding)}
                        </div>
                        <span className="text-[10px] text-slate-400">Balance due from client</span>
                      </div>

                      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-subtle">
                        <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600">
                          Total Project Expenses
                        </span>
                        <div className="text-base font-bold text-indigo-600 mt-1 tabular-nums">
                          {formatCurrency(financialSummary.totalExpenses)}
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Est. Margin: {financialSummary.grossMarginPct}%
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Project Details Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* General Metadata */}
                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-subtle space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Project Information</h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Property Type</span>
                          <span className="font-semibold text-slate-800">
                            {project?.propertyTypeKey?.replace(/_/g, " ")}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Priority Level</span>
                          <span className="font-semibold text-slate-800">{project?.priority}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Start Date</span>
                          <span className="font-semibold text-slate-800">
                            {project?.startDate ? formatDate(project.startDate) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Target Completion</span>
                          <span className="font-semibold text-slate-800">
                            {project?.targetCompletionDate ? formatDate(project.targetCompletionDate) : "—"}
                          </span>
                        </div>
                        <div className="flex justify-between py-1">
                          <span className="text-slate-500">Delay Status</span>
                          <span className={`font-semibold ${delayHealth.status === "DELAYED" ? "text-rose-600" : "text-emerald-600"}`}>
                            {delayHealth.text}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Client & Site Location */}
                    <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-subtle space-y-3">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Client & Site Location</h3>
                      <div className="space-y-2 text-xs">
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Client Name</span>
                          <span className="font-semibold text-slate-800">{project?.client?.fullName || "—"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Phone Number</span>
                          <span className="font-semibold text-slate-800 font-mono">{project?.client?.phone || "—"}</span>
                        </div>
                        <div className="flex justify-between py-1 border-b border-slate-100">
                          <span className="text-slate-500">Site Location</span>
                          <span className="font-semibold text-slate-800 text-right max-w-[200px]">
                            {project?.siteAddress || "—"}, {project?.city}
                          </span>
                        </div>
                        {project?.notes && (
                          <div className="pt-2 text-slate-600">
                            <span className="font-semibold block text-slate-700 mb-0.5">Notes:</span>
                            <p className="text-[11px] italic bg-slate-50 p-2 rounded border border-slate-100">
                              {project.notes}
                            </p>
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
                  <div className="bg-white border border-slate-200 rounded-xl shadow-subtle overflow-hidden">
                    <div className="px-5 py-3 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
                      <h3 className="text-xs font-bold text-slate-800">13-Stage Production Workflow</h3>
                      <span className="text-[11px] text-slate-500 font-mono">
                        Active Stage: {project?.stage}
                      </span>
                    </div>

                    <div className="divide-y divide-slate-100">
                      {stageDefinitions.map((stageDef: any) => {
                        const idx = PROJECT_STAGES.indexOf(stageDef.key as any);
                        const isPast = currentStageIndex > idx;
                        const isCurrent = currentStageIndex === idx;

                        return (
                          <div
                            key={stageDef.key}
                            className={`p-4 flex items-center justify-between ${
                              isCurrent ? "bg-emerald-50/50" : isPast ? "bg-white" : "bg-slate-50/20"
                            }`}
                          >
                            <div className="flex items-center gap-3">
                              <div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold ${
                                  isPast
                                    ? "bg-emerald-500 text-white"
                                    : isCurrent
                                    ? "bg-emerald-600 text-white ring-4 ring-emerald-100"
                                    : "bg-slate-200 text-slate-500"
                                }`}
                              >
                                {isPast ? "✓" : stageDef.order}
                              </div>
                              <div>
                                <h4 className="text-xs font-bold text-slate-900">{stageDef.title}</h4>
                                <p className="text-[11px] text-slate-500">{stageDef.description}</p>
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
                  <div className="bg-white border border-slate-200 rounded-xl shadow-subtle p-5 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800">Immutable Stage Transition Audit History</h3>
                    <div className="space-y-2">
                      {project?.stageHistory?.length === 0 ? (
                        <div className="text-center py-4 text-xs text-slate-400">No transition history recorded</div>
                      ) : (
                        project?.stageHistory?.map((hist: any) => (
                          <div
                            key={hist.id}
                            className="p-3 bg-slate-50 rounded-lg border border-slate-200/80 flex items-center justify-between text-xs"
                          >
                            <div>
                              <span className="font-bold text-slate-800">
                                {hist.fromStage ? `${hist.fromStage.replace(/_/g, " ")} → ` : ""}
                                {hist.toStage.replace(/_/g, " ")}
                              </span>
                              {hist.notes && <p className="text-[11px] text-slate-600 mt-0.5">{hist.notes}</p>}
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formatDate(hist.createdAt)}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 3: TEAM & ASSIGNMENTS */}
              {activeTab === "team" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Project Team Members</h3>
                    <Button size="sm" onClick={() => setIsAddMemberModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                      Assign Team Member
                    </Button>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {project?.members?.length === 0 ? (
                      <div className="col-span-2 py-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed">
                        No team members assigned yet
                      </div>
                    ) : (
                      project?.members?.map((m: any) => (
                        <div
                          key={m.id}
                          className="p-4 bg-white border border-slate-200 rounded-xl shadow-subtle flex items-center justify-between"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 bg-slate-100 rounded-full flex items-center justify-center font-bold text-xs text-slate-700">
                              {m.user?.fullName?.charAt(0) || "U"}
                            </div>
                            <div>
                              <h4 className="text-xs font-bold text-slate-900">{m.user?.fullName}</h4>
                              <p className="text-[11px] text-slate-500 font-mono">{m.user?.email || m.user?.phone || "—"}</p>
                              <Badge variant="neutral" className="mt-1">
                                {m.role.replace(/_/g, " ")}
                              </Badge>
                            </div>
                          </div>

                          <button
                            onClick={() => handleRemoveMember(m.userId)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 rounded-lg hover:bg-rose-50"
                            title="Remove member"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 4: TASKS & SCHEDULE */}
              {activeTab === "tasks" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Stage Tasks</h3>
                    <Button size="sm" onClick={() => setIsTaskModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                      Create Task
                    </Button>
                  </div>

                  <div className="bg-white border border-slate-200 rounded-xl shadow-subtle divide-y divide-slate-100 overflow-hidden">
                    {project?.tasks?.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400">No tasks created for this project</div>
                    ) : (
                      project?.tasks?.map((t: any) => (
                        <div key={t.id} className="p-3.5 flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono text-[10px] text-slate-400">{t.referenceNo}</span>
                              <span className="font-bold text-slate-800">{t.title}</span>
                              <Badge variant={t.status === "COMPLETED" ? "completed" : "pending"}>
                                {t.status}
                              </Badge>
                            </div>
                            {t.description && <p className="text-[11px] text-slate-500 mt-0.5">{t.description}</p>}
                          </div>
                          <div className="text-right">
                            <span className="text-[11px] text-slate-500 font-mono block">
                              Due: {t.dueAt ? formatDate(t.dueAt) : "No due date"}
                            </span>
                            <span className="text-[10px] text-slate-400">
                              Assignee: {t.assignee?.fullName || "Unassigned"}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 5: MATERIALS & PROCUREMENT */}
              {activeTab === "materials" && (
                <div className="space-y-6">
                  {/* Quotations & BOQ Linkage */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-subtle p-5 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800">Approved Quotations & Material Specifications</h3>
                    {project?.quotations?.length === 0 ? (
                      <div className="text-xs text-slate-400 py-2">No linked quotation records</div>
                    ) : (
                      project?.quotations?.map((q: any) => (
                        <div key={q.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-mono font-bold text-slate-800">{q.referenceNo}</span>
                            <span className="text-slate-500 ml-2">{q.title}</span>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900 tabular-nums">
                              {formatCurrency(q.totalAmount)}
                            </span>
                            <Badge variant={q.status === "APPROVED" ? "completed" : "pending"}>{q.status}</Badge>
                          </div>
                        </div>
                      ))
                    )}
                  </div>

                  {/* Procurement & Purchase Orders */}
                  <div className="bg-white border border-slate-200 rounded-xl shadow-subtle p-5 space-y-3">
                    <h3 className="text-xs font-bold text-slate-800">Procurement & Material Requests</h3>
                    {project?.purchaseOrders?.length === 0 ? (
                      <div className="text-xs text-slate-400 py-2">No procurement orders linked to this project</div>
                    ) : (
                      project?.purchaseOrders?.map((po: any) => (
                        <div key={po.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                          <span className="font-mono font-bold text-slate-800">{po.poNumber || po.id}</span>
                          <span className="font-bold tabular-nums text-slate-900">{formatCurrency(po.totalAmount)}</span>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 6: FINANCIALS & PAYMENTS */}
              {activeTab === "financials" && (
                <div className="space-y-6">
                  {canViewFinancials && financialSummary ? (
                    <>
                      {/* Financial Metrics Cards */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-subtle">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            Approved Contract Value
                          </span>
                          <div className="text-lg font-bold text-slate-900 mt-1 tabular-nums">
                            {formatCurrency(financialSummary.adjustedContractValue)}
                          </div>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-subtle">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">
                            Verified Payments Received
                          </span>
                          <div className="text-lg font-bold text-emerald-600 mt-1 tabular-nums">
                            {formatCurrency(financialSummary.totalReceived)}
                          </div>
                        </div>

                        <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-subtle">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600">
                            Total Outstanding
                          </span>
                          <div className="text-lg font-bold text-amber-600 mt-1 tabular-nums">
                            {formatCurrency(financialSummary.totalOutstanding)}
                          </div>
                        </div>
                      </div>

                      {/* Verified Payments List */}
                      <div className="bg-white border border-slate-200 rounded-xl shadow-subtle p-5 space-y-3">
                        <div className="flex items-center justify-between">
                          <h3 className="text-xs font-bold text-slate-800">Verified Client Payments</h3>
                          <Button size="sm" variant="outline" onClick={() => setIsRecordPaymentModalOpen(true)}>
                            Record Payment
                          </Button>
                        </div>

                        {project?.payments?.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">No verified payments received yet</div>
                        ) : (
                          project?.payments?.map((p: any) => (
                            <div key={p.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-mono font-bold text-slate-800">{p.referenceNo}</span>
                                <span className="text-slate-500 ml-2">via {p.paymentMode}</span>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-emerald-600 tabular-nums font-mono">
                                  {formatCurrency(p.amount)}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {formatDate(p.paymentDate)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>

                      {/* Project Expenses List */}
                      <div className="bg-white border border-slate-200 rounded-xl shadow-subtle p-5 space-y-3">
                        <h3 className="text-xs font-bold text-slate-800">Canonical Project Expenses</h3>
                        {project?.expenses?.length === 0 ? (
                          <div className="text-center py-4 text-xs text-slate-400">No expenses charged to this project</div>
                        ) : (
                          project?.expenses?.map((e: any) => (
                            <div key={e.id} className="p-3 bg-slate-50 rounded-lg border border-slate-200 flex items-center justify-between text-xs">
                              <div>
                                <span className="font-bold text-slate-800">{e.title}</span>
                                <Badge variant="neutral" className="ml-2">{e.category}</Badge>
                              </div>
                              <div className="flex items-center gap-3">
                                <span className="font-bold text-indigo-600 tabular-nums">
                                  {formatCurrency(e.amount)}
                                </span>
                                <span className="text-[11px] text-slate-400 font-mono">
                                  {formatDate(e.expenseDate)}
                                </span>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </>
                  ) : (
                    <div className="p-8 text-center text-xs text-slate-400 bg-white rounded-xl border">
                      Financial summary is restricted. You do not have permission to view financials for this project.
                    </div>
                  )}
                </div>
              )}

              {/* TAB 7: QUALITY CONTROL */}
              {activeTab === "quality" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">
                        Quality Inspections & Compliance
                      </h3>
                      <p className="text-[11px] text-slate-500">
                        Mandatory quality check required prior to Project Handover
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setIsQcModalOpen(true)} leftIcon={<ShieldCheck className="w-3.5 h-3.5" />}>
                      Record Inspection
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {project?.qualityChecks?.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed">
                        No quality check inspections recorded yet. A passed inspection is required before Handover.
                      </div>
                    ) : (
                      project?.qualityChecks?.map((qc: any) => (
                        <div
                          key={qc.id}
                          className={`p-4 rounded-xl border ${
                            qc.passed
                              ? "bg-emerald-50/40 border-emerald-200"
                              : "bg-rose-50/40 border-rose-200"
                          }`}
                        >
                          <div className="flex items-center justify-between text-xs">
                            <div className="flex items-center gap-2">
                              <Badge variant={qc.passed ? "completed" : "danger"}>
                                {qc.status || (qc.passed ? "PASSED" : "FAILED")}
                              </Badge>
                              <span className="font-bold text-slate-800">Score: {qc.score}%</span>
                            </div>
                            <span className="text-[11px] text-slate-400 font-mono">
                              {formatDate(qc.checkDate)}
                            </span>
                          </div>

                          {qc.issues && (
                            <div className="mt-2 text-xs text-rose-700 bg-white/80 p-2.5 rounded border border-rose-100">
                              <span className="font-bold block mb-0.5">Issues Found:</span>
                              {qc.issues}
                            </div>
                          )}

                          {qc.correctiveAction && (
                            <div className="mt-2 text-xs text-slate-700 bg-white/80 p-2.5 rounded border border-slate-200">
                              <span className="font-bold block mb-0.5">Corrective Action Required:</span>
                              {qc.correctiveAction}
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 8: HANDOVER & WARRANTY */}
              {activeTab === "handover" && (
                <div className="space-y-6">
                  {/* Handover Status Box */}
                  <div className="p-5 bg-white border border-slate-200 rounded-xl shadow-subtle space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-xs font-bold text-slate-800">Project Handover Status</h3>
                        <p className="text-[11px] text-slate-500">
                          {project?.handoverStatus === "COMPLETED"
                            ? `Handover completed on ${formatDate(project.handoverDate)}`
                            : "Project is in execution phase"}
                        </p>
                      </div>
                      {project?.handoverStatus !== "COMPLETED" && (
                        <Button size="sm" onClick={() => setIsHandoverModalOpen(true)} leftIcon={<Sparkles className="w-3.5 h-3.5" />}>
                          Complete Handover
                        </Button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs pt-2 border-t border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Warranty Status</span>
                        <div className="font-bold text-slate-800 mt-0.5">{project?.warrantyStatus || "PENDING"}</div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Warranty Start Date</span>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {project?.warrantyStartDate ? formatDate(project.warrantyStartDate) : "TBD"}
                        </div>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] font-bold uppercase">Warranty End Date</span>
                        <div className="font-semibold text-slate-800 mt-0.5">
                          {project?.warrantyEndDate ? formatDate(project.warrantyEndDate) : "TBD"}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Warranty Issues Log */}
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Warranty Support Issues</h3>
                      <Button size="sm" variant="outline" onClick={() => setIsWarModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                        Log Warranty Issue
                      </Button>
                    </div>

                    <div className="space-y-2">
                      {project?.warrantyIssues?.length === 0 ? (
                        <div className="py-6 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed">
                          No warranty tickets or complaints logged
                        </div>
                      ) : (
                        project?.warrantyIssues?.map((w: any) => (
                          <div key={w.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-subtle flex items-center justify-between text-xs">
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-mono font-bold text-slate-800">{w.issueNo}</span>
                                <Badge variant={w.status === "RESOLVED" ? "completed" : "pending"}>
                                  {w.status}
                                </Badge>
                                <span className="font-bold text-slate-900">{w.title}</span>
                              </div>
                              <p className="text-[11px] text-slate-500 mt-0.5">{w.description}</p>
                              {w.resolutionNotes && (
                                <p className="text-[11px] text-emerald-700 bg-emerald-50 p-1.5 rounded mt-1">
                                  Resolution: {w.resolutionNotes}
                                </p>
                              )}
                            </div>

                            {w.status !== "RESOLVED" && (
                              <Button size="sm" variant="outline" onClick={() => handleResolveWarrantyIssue(w.id)}>
                                Mark Resolved
                              </Button>
                            )}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* TAB 9: CHANGE ORDERS */}
              {activeTab === "changeOrders" && (
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-xs font-bold uppercase tracking-wider text-slate-700">Scope Change Orders</h3>
                      <p className="text-[11px] text-slate-500">
                        Commercial variations and additional scope approved after base quotation
                      </p>
                    </div>
                    <Button size="sm" onClick={() => setIsCoModalOpen(true)} leftIcon={<Plus className="w-3.5 h-3.5" />}>
                      Create Change Order
                    </Button>
                  </div>

                  <div className="space-y-3">
                    {project?.changeOrders?.length === 0 ? (
                      <div className="py-8 text-center text-xs text-slate-400 bg-white rounded-xl border border-dashed">
                        No change orders recorded for this project
                      </div>
                    ) : (
                      project?.changeOrders?.map((co: any) => (
                        <div key={co.id} className="p-4 bg-white border border-slate-200 rounded-xl shadow-subtle flex items-center justify-between text-xs">
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-mono font-bold text-slate-800">{co.referenceNo}</span>
                              <Badge variant={co.status === "APPROVED" ? "completed" : co.status === "REJECTED" ? "danger" : "pending"}>
                                {co.status}
                              </Badge>
                              <span className="font-bold text-slate-900">{co.title}</span>
                            </div>
                            <p className="text-[11px] text-slate-500 mt-1">{co.description}</p>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="font-bold text-slate-900 tabular-nums text-sm">
                              +{formatCurrency(co.amount)}
                            </span>
                            {co.status === "PENDING" && (
                              <Button size="sm" onClick={() => handleApproveChangeOrder(co.id)}>
                                Approve & Add to Budget
                              </Button>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}

              {/* TAB 10: ACTIVITY TIMELINE */}
              {activeTab === "timeline" && (
                <div className="bg-white border border-slate-200 rounded-xl shadow-subtle p-5 space-y-4">
                  <h3 className="text-xs font-bold text-slate-800">Activity & Audit Timeline</h3>
                  <div className="space-y-3">
                    {timeline.length === 0 ? (
                      <div className="text-xs text-slate-400 py-4 text-center">No timeline activity recorded yet</div>
                    ) : (
                      timeline.map((act: any) => (
                        <div key={act.id} className="flex gap-3 text-xs">
                          <div className="w-2 h-2 rounded-full bg-emerald-500 mt-1.5 shrink-0" />
                          <div>
                            <span className="font-bold text-slate-800">{act.title}</span>
                            {act.description && <p className="text-[11px] text-slate-500">{act.description}</p>}
                            <span className="text-[10px] text-slate-400 font-mono">
                              {formatRelativeTime(act.createdAt)}
                            </span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {/* Modal: Add Team Member */}
        {isAddMemberModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white border rounded-xl shadow-xl p-5 w-full max-w-md space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Assign Team Member</h3>
              <form onSubmit={handleAddMember} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Select User / Employee</label>
                  <select
                    required
                    value={selectedUserToAssign}
                    onChange={(e) => setSelectedUserToAssign(e.target.value)}
                    className="w-full h-9 px-2.5 border rounded-md"
                  >
                    <option value="">Select User</option>
                    {usersList.map((u) => (
                      <option key={u.id} value={u.userId || u.id}>
                        {u.fullName || u.user?.fullName} ({u.role || u.user?.accessLevel})
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="font-semibold block mb-1">Project Role</label>
                  <select
                    value={memberRole}
                    onChange={(e) => setMemberRole(e.target.value)}
                    className="w-full h-9 px-2.5 border rounded-md"
                  >
                    {PROJECT_MEMBER_ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace(/_/g, " ")}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsAddMemberModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Assign Role
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Task */}
        {isTaskModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white border rounded-xl shadow-xl p-5 w-full max-w-md space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Create Stage Task</h3>
              <form onSubmit={handleCreateTask} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Task Title *</label>
                  <Input required value={taskTitle} onChange={(e) => setTaskTitle(e.target.value)} />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Description</label>
                  <textarea
                    rows={2}
                    value={taskDescription}
                    onChange={(e) => setTaskDescription(e.target.value)}
                    className="w-full p-2 border rounded-md text-xs"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="font-semibold block mb-1">Due Date</label>
                    <Input type="date" value={taskDueDate} onChange={(e) => setTaskDueDate(e.target.value)} />
                  </div>
                  <div>
                    <label className="font-semibold block mb-1">Priority</label>
                    <select
                      value={taskPriority}
                      onChange={(e) => setTaskPriority(e.target.value)}
                      className="w-full h-9 px-2 border rounded-md"
                    >
                      <option value="LOW">LOW</option>
                      <option value="NORMAL">NORMAL</option>
                      <option value="HIGH">HIGH</option>
                      <option value="URGENT">URGENT</option>
                    </select>
                  </div>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsTaskModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Create Task
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Create Change Order */}
        {isCoModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white border rounded-xl shadow-xl p-5 w-full max-w-md space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Create Scope Change Order</h3>
              <form onSubmit={handleCreateChangeOrder} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Title *</label>
                  <Input required value={coTitle} onChange={(e) => setCoTitle(e.target.value)} />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Detailed Description *</label>
                  <textarea
                    required
                    rows={3}
                    value={coDescription}
                    onChange={(e) => setCoDescription(e.target.value)}
                    className="w-full p-2 border rounded-md text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Additional Cost (₹) *</label>
                  <Input
                    type="number"
                    min="0"
                    required
                    value={coCost}
                    onChange={(e) => setCoCost(e.target.value)}
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsCoModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmittingCo}>
                    {isSubmittingCo ? "Submitting..." : "Create Change Order"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Record Quality Check */}
        {isQcModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white border rounded-xl shadow-xl p-5 w-full max-w-md space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Record Quality Inspection</h3>
              <form onSubmit={handleRecordQualityCheck} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Inspection Status *</label>
                  <select
                    value={qcStatus}
                    onChange={(e) => setQcStatus(e.target.value)}
                    className="w-full h-9 px-2 border rounded-md"
                  >
                    <option value="PASSED">PASSED (Site meets standards)</option>
                    <option value="FAILED">FAILED (Issues requiring rework)</option>
                    <option value="RECHECK_REQUIRED">RECHECK REQUIRED</option>
                  </select>
                </div>
                {qcStatus !== "PASSED" && (
                  <>
                    <div>
                      <label className="font-semibold block mb-1">Issues Identified</label>
                      <textarea
                        rows={2}
                        placeholder="Alignment defect, laminate bubble, missing hardware..."
                        value={qcIssues}
                        onChange={(e) => setQcIssues(e.target.value)}
                        className="w-full p-2 border rounded-md text-xs"
                      />
                    </div>
                    <div>
                      <label className="font-semibold block mb-1">Corrective Action Required</label>
                      <textarea
                        rows={2}
                        placeholder="Rework wardrobe door alignment..."
                        value={qcCorrectiveAction}
                        onChange={(e) => setQcCorrectiveAction(e.target.value)}
                        className="w-full p-2 border rounded-md text-xs"
                      />
                    </div>
                  </>
                )}
                <div>
                  <label className="font-semibold block mb-1">General Notes</label>
                  <Input value={qcNotes} onChange={(e) => setQcNotes(e.target.value)} />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsQcModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmittingQc}>
                    {isSubmittingQc ? "Saving..." : "Record Inspection"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Complete Handover */}
        {isHandoverModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white border rounded-xl shadow-xl p-5 w-full max-w-md space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Complete Project Handover</h3>
              <form onSubmit={handleCompleteHandover} className="space-y-3 text-xs">
                <p className="text-slate-500">
                  Completing handover will mark the project as completed and activate the warranty coverage period.
                </p>
                <div>
                  <label className="font-semibold block mb-1">Warranty Duration (Months)</label>
                  <Input
                    type="number"
                    min="1"
                    value={warrantyMonths}
                    onChange={(e) => setWarrantyMonths(parseInt(e.target.value, 10) || 12)}
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Handover Sign-off Notes</label>
                  <textarea
                    rows={2}
                    value={handoverNotes}
                    onChange={(e) => setHandoverNotes(e.target.value)}
                    className="w-full p-2 border rounded-md text-xs"
                  />
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsHandoverModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm">
                    Confirm Handover
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Modal: Log Warranty Issue */}
        {isWarModalOpen && (
          <div className="fixed inset-0 z-60 flex items-center justify-center bg-slate-900/40 p-4">
            <div className="bg-white border rounded-xl shadow-xl p-5 w-full max-w-md space-y-4">
              <h3 className="text-sm font-bold text-slate-900">Log Warranty Complaint</h3>
              <form onSubmit={handleLogWarrantyIssue} className="space-y-3 text-xs">
                <div>
                  <label className="font-semibold block mb-1">Issue Title *</label>
                  <Input required value={warTitle} onChange={(e) => setWarTitle(e.target.value)} />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Issue Details *</label>
                  <textarea
                    required
                    rows={3}
                    value={warDescription}
                    onChange={(e) => setWarDescription(e.target.value)}
                    className="w-full p-2 border rounded-md text-xs"
                  />
                </div>
                <div>
                  <label className="font-semibold block mb-1">Priority</label>
                  <select
                    value={warPriority}
                    onChange={(e) => setWarPriority(e.target.value)}
                    className="w-full h-9 px-2 border rounded-md"
                  >
                    <option value="LOW">LOW</option>
                    <option value="MEDIUM">MEDIUM</option>
                    <option value="HIGH">HIGH</option>
                    <option value="URGENT">URGENT</option>
                  </select>
                </div>
                <div className="pt-2 flex justify-end gap-2">
                  <Button type="button" variant="outline" size="sm" onClick={() => setIsWarModalOpen(false)}>
                    Cancel
                  </Button>
                  <Button type="submit" size="sm" disabled={isSubmittingWar}>
                    {isSubmittingWar ? "Logging..." : "Log Ticket"}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Record Payment Modal Integration */}
        {isRecordPaymentModalOpen && (
          <RecordPaymentModal
            isOpen={isRecordPaymentModalOpen}
            onClose={() => setIsRecordPaymentModalOpen(false)}
            onSuccess={() => {
              fetchProjectDetails();
              onUpdate();
            }}
            initialClientId={project?.clientId}
            initialProjectId={project?.id}
          />
        )}
      </div>
    </div>
  );
};
