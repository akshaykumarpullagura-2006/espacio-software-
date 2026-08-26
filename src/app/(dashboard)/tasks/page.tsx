"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  CheckSquare,
  Plus,
  Search,
  Filter,
  Kanban,
  Calendar as CalendarIcon,
  User,
  Clock,
  AlertTriangle,
  ShieldAlert,
  Check,
  X,
  ExternalLink,
  ChevronRight,
  RefreshCw,
  Folder,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TaskItem {
  id: string;
  referenceNo: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  type: string;
  assignee?: { id: string; fullName: string; email: string } | null;
  createdBy?: { id: string; fullName: string } | null;
  project?: { id: string; referenceNo: string; title: string } | null;
  client?: { id: string; referenceNo: string; fullName: string } | null;
  dueAt?: string | null;
  checklists?: { id: string; title: string; isCompleted: boolean }[];
  createdAt: string;
}

export default function TaskMasterListPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [isLoading, setIsLoading] = useState(true);

  // Create Task Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newPriority, setNewPriority] = useState("NORMAL");
  const [newType, setNewType] = useState("GENERAL");
  const [newDueAt, setNewDueAt] = useState("");
  const [newChecklist, setNewChecklist] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Task Detail Modal
  const [selectedTask, setSelectedTask] = useState<TaskItem | null>(null);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/api/v1/tasks?limit=50`;
      if (statusFilter !== "ALL") url += `&status=${statusFilter}`;
      if (priorityFilter !== "ALL") url += `&priority=${priorityFilter}`;
      if (typeFilter !== "ALL") url += `&type=${typeFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setTasks(json.data.tasks || []);
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoading(false);
    }
  }, [statusFilter, priorityFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const checklistItems = newChecklist
        .split("\n")
        .map((s) => s.trim())
        .filter(Boolean);

      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          priority: newPriority,
          type: newType,
          dueAt: newDueAt ? new Date(newDueAt).toISOString() : undefined,
          checklists: checklistItems,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsCreateModalOpen(false);
        setNewTitle("");
        setNewDesc("");
        setNewDueAt("");
        setNewChecklist("");
        fetchTasks();
      }
    } catch {
      // Quiet handling
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStatusChange = async (id: string, nextStatus: string) => {
    try {
      await fetch(`/api/v1/tasks/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === id ? { ...t, status: nextStatus as any } : t))
      );
      if (selectedTask && selectedTask.id === id) {
        setSelectedTask((prev) => (prev ? { ...prev, status: nextStatus as any } : null));
      }
    } catch {
      // Quiet handling
    }
  };

  const toggleChecklistItem = async (checklistId: string) => {
    try {
      await fetch(`/api/v1/tasks/placeholder/checklist`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ checklistId }),
      });
      fetchTasks();
    } catch {
      // Quiet handling
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return (
          <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-700 flex items-center gap-1">
            <ShieldAlert className="w-3 h-3" /> URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-amber-100 text-amber-800 flex items-center gap-1">
            <AlertTriangle className="w-3 h-3" /> HIGH
          </span>
        );
      case "LOW":
        return (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-600">
            LOW
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-700">
            NORMAL
          </span>
        );
    }
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "COMPLETED":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800">COMPLETED</span>;
      case "IN_PROGRESS":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-blue-100 text-blue-800">IN PROGRESS</span>;
      case "BLOCKED":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-800">BLOCKED</span>;
      case "CANCELLED":
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-500">CANCELLED</span>;
      default:
        return <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">TO DO</span>;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CheckSquare className="w-6 h-6 text-gold" />
            <h1 className="text-xl font-bold text-charcoal tracking-tight">Work & Task Management</h1>
          </div>
          <p className="text-xs text-walnut mt-1">
            Centralized task engine for tracking, assigning, and executing work across all ERP modules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Create Task
          </button>
        </div>
      </div>

      {/* Sub-view Navigation Bar */}
      <div className="flex items-center justify-between border-b border-walnut/15">
        <div className="flex items-center gap-6">
          <Link
            href="/tasks"
            prefetch={true}
            className="pb-3 text-sm font-bold border-b-2 border-gold text-charcoal flex items-center gap-2"
          >
            <CheckSquare className="w-4 h-4 text-gold" /> Master Task List
          </Link>

          <Link
            href="/tasks/my-work"
            prefetch={true}
            className="pb-3 text-sm font-semibold border-b-2 border-transparent text-walnut hover:text-charcoal flex items-center gap-2 cursor-pointer transition-colors"
          >
            <User className="w-4 h-4" /> My Work & Today View
          </Link>

          <Link
            href="/tasks/board"
            prefetch={true}
            className="pb-3 text-sm font-semibold border-b-2 border-transparent text-walnut hover:text-charcoal flex items-center gap-2 cursor-pointer transition-colors"
          >
            <Kanban className="w-4 h-4" /> Kanban Task Board
          </Link>

          <Link
            href="/calendar"
            prefetch={true}
            className="pb-3 text-sm font-semibold border-b-2 border-transparent text-walnut hover:text-charcoal flex items-center gap-2 cursor-pointer transition-colors"
          >
            <CalendarIcon className="w-4 h-4" /> Calendar Workspace
          </Link>
        </div>

        <button
          onClick={fetchTasks}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors mb-2"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by TSK reference, title, or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Statuses</option>
            <option value="TODO">To Do</option>
            <option value="IN_PROGRESS">In Progress</option>
            <option value="BLOCKED">Blocked</option>
            <option value="COMPLETED">Completed</option>
            <option value="CANCELLED">Cancelled</option>
          </select>

          <select
            value={priorityFilter}
            onChange={(e) => setPriorityFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Priorities</option>
            <option value="URGENT">Urgent</option>
            <option value="HIGH">High</option>
            <option value="NORMAL">Normal</option>
            <option value="LOW">Low</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Types</option>
            <option value="GENERAL">General</option>
            <option value="PROJECT">Project</option>
            <option value="FOLLOW_UP">Follow-up</option>
            <option value="APPROVAL">Approval</option>
            <option value="PROCUREMENT">Procurement</option>
            <option value="FINANCE">Finance</option>
            <option value="INVENTORY">Inventory</option>
          </select>
        </div>
      </div>

      {/* Task Master Table */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="py-3 px-4 font-bold text-slate-700">Reference</th>
                <th className="py-3 px-4 font-bold text-slate-700">Task Title</th>
                <th className="py-3 px-4 font-bold text-slate-700">Priority</th>
                <th className="py-3 px-4 font-bold text-slate-700">Status</th>
                <th className="py-3 px-4 font-bold text-slate-700">Assignee</th>
                <th className="py-3 px-4 font-bold text-slate-700">Project / Client</th>
                <th className="py-3 px-4 font-bold text-slate-700">Due Date</th>
                <th className="py-3 px-4 font-bold text-slate-700 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {isLoading ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-400">
                    Loading task records...
                  </td>
                </tr>
              ) : tasks.length === 0 ? (
                <tr>
                  <td colSpan={8} className="p-12 text-center text-slate-500">
                    No tasks match the active filters.
                  </td>
                </tr>
              ) : (
                tasks.map((task) => {
                  const completedChecklists = (task.checklists || []).filter((c) => c.isCompleted).length;
                  const totalChecklists = (task.checklists || []).length;

                  return (
                    <tr
                      key={task.id}
                      onClick={() => setSelectedTask(task)}
                      className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                    >
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">
                        {task.referenceNo}
                      </td>
                      <td className="py-3 px-4 max-w-xs">
                        <span className="font-semibold text-slate-900 block truncate">{task.title}</span>
                        {totalChecklists > 0 && (
                          <span className="text-[10px] text-slate-400 mt-0.5 block">
                            Checklist: {completedChecklists}/{totalChecklists} done
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">{getPriorityBadge(task.priority)}</td>
                      <td className="py-3 px-4">{getStatusBadge(task.status)}</td>
                      <td className="py-3 px-4 text-slate-700 font-medium">
                        {task.assignee ? task.assignee.fullName : <span className="text-slate-400 font-normal">Unassigned</span>}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {task.project ? (
                          <span className="font-medium text-emerald-700 flex items-center gap-1">
                            <Folder className="w-3 h-3" /> {task.project.referenceNo}
                          </span>
                        ) : task.client ? (
                          <span>{task.client.fullName}</span>
                        ) : (
                          <span className="text-slate-400">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-slate-600">
                        {task.dueAt ? formatDate(task.dueAt) : <span className="text-slate-400">No due date</span>}
                      </td>
                      <td className="py-3 px-4 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedTask(task);
                          }}
                          className="px-2.5 py-1 text-[11px] font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors"
                        >
                          View Detail
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* CREATE TASK MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div className="bg-offwhite rounded-xl shadow-2xl border border-walnut/20 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70">
              <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
                <CheckSquare className="w-5 h-5 text-gold" /> Create New Work Task
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-walnut hover:text-charcoal rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateTask} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-walnut mb-1">
                  Task Title <span className="text-semantic-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Inspect living room false ceiling framing"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/40 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-walnut mb-1">
                  Description / Instructions
                </label>
                <textarea
                  rows={2}
                  placeholder="Provide scope, location notes, or specifications..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/40 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="block text-xs font-bold text-walnut mb-1">Priority</label>
                  <select
                    value={newPriority}
                    onChange={(e) => setNewPriority(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-walnut/20 rounded-lg bg-cream/40 text-charcoal font-semibold focus:outline-none focus:border-gold"
                  >
                    <option value="LOW">Low</option>
                    <option value="NORMAL">Normal</option>
                    <option value="HIGH">High</option>
                    <option value="URGENT">Urgent</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-walnut mb-1">Type</label>
                  <select
                    value={newType}
                    onChange={(e) => setNewType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-walnut/20 rounded-lg bg-cream/40 text-charcoal font-semibold focus:outline-none focus:border-gold"
                  >
                    <option value="GENERAL">General</option>
                    <option value="PROJECT">Project</option>
                    <option value="FOLLOW_UP">Follow-up</option>
                    <option value="APPROVAL">Approval</option>
                    <option value="PROCUREMENT">Procurement</option>
                    <option value="FINANCE">Finance</option>
                    <option value="INVENTORY">Inventory</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-walnut mb-1">Due Date</label>
                  <input
                    type="datetime-local"
                    value={newDueAt}
                    onChange={(e) => setNewDueAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/40 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-bold text-walnut mb-1">
                  Checklist Items (One per line)
                </label>
                <textarea
                  rows={3}
                  placeholder="Verify measurements&#10;Take site photos&#10;Obtain client signature"
                  value={newChecklist}
                  onChange={(e) => setNewChecklist(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/40 rounded-lg text-charcoal focus:outline-none focus:border-gold font-mono"
                />
              </div>

              <div className="pt-3 border-t border-walnut/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreateModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-walnut hover:bg-cream rounded-lg transition-colors border border-walnut/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Creating..." : "Save Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TASK DETAIL MODAL */}
      {selectedTask && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                  {selectedTask.referenceNo}
                </span>
                {getStatusBadge(selectedTask.status)}
                {getPriorityBadge(selectedTask.priority)}
              </div>
              <button
                onClick={() => setSelectedTask(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedTask.title}</h2>
                {selectedTask.description && (
                  <p className="text-xs text-slate-600 mt-2 leading-relaxed bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {selectedTask.description}
                  </p>
                )}
              </div>

              {/* Status Transition Control */}
              <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                <span className="text-xs font-semibold text-slate-700">Change Status:</span>
                {["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"].map((st) => (
                  <button
                    key={st}
                    disabled={selectedTask.status === st}
                    onClick={() => handleStatusChange(selectedTask.id, st)}
                    className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
                      selectedTask.status === st
                        ? "bg-slate-900 text-white font-semibold cursor-default"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    }`}
                  >
                    {st.replace("_", " ")}
                  </button>
                ))}
              </div>

              {/* Checklists */}
              {selectedTask.checklists && selectedTask.checklists.length > 0 && (
                <div className="space-y-2 pt-2 border-t border-slate-100">
                  <h4 className="text-xs font-bold text-slate-900">Checklist Progress</h4>
                  <div className="space-y-1.5">
                    {selectedTask.checklists.map((c) => (
                      <div
                        key={c.id}
                        onClick={() => toggleChecklistItem(c.id)}
                        className="flex items-center gap-2 text-xs text-slate-700 cursor-pointer hover:bg-slate-50 p-1.5 rounded"
                      >
                        <input
                          type="checkbox"
                          checked={c.isCompleted}
                          readOnly
                          className="w-3.5 h-3.5 text-emerald-600 rounded"
                        />
                        <span className={c.isCompleted ? "line-through text-slate-400" : "font-medium"}>
                          {c.title}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Created {formatDate(selectedTask.createdAt)}</span>
              <button
                onClick={() => setSelectedTask(null)}
                className="px-4 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
