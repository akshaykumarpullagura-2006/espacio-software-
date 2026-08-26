"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  Kanban,
  CheckSquare,
  User,
  Calendar as CalendarIcon,
  Plus,
  RefreshCw,
  Folder,
  AlertTriangle,
  ShieldAlert,
  ChevronRight,
  ChevronLeft,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TaskItem {
  id: string;
  referenceNo: string;
  title: string;
  description?: string | null;
  status: "TODO" | "IN_PROGRESS" | "BLOCKED" | "COMPLETED" | "CANCELLED";
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  assignee?: { id: string; fullName: string } | null;
  project?: { referenceNo: string; title: string } | null;
  dueAt?: string | null;
}

const COLUMNS = [
  { key: "TODO", label: "To Do", bg: "bg-slate-100/70 border-slate-200" },
  { key: "IN_PROGRESS", label: "In Progress", bg: "bg-blue-50/50 border-blue-200" },
  { key: "BLOCKED", label: "Blocked", bg: "bg-rose-50/50 border-rose-200" },
  { key: "COMPLETED", label: "Completed", bg: "bg-emerald-50/50 border-emerald-200" },
];

export default function KanbanBoardPage() {
  const router = useRouter();
  const [tasks, setTasks] = useState<TaskItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchTasks = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/tasks?limit=100");
      const json = await res.json();
      if (json.success) {
        setTasks(json.data.tasks || []);
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchTasks();
  }, [fetchTasks]);

  const moveTaskStatus = async (taskId: string, nextStatus: string) => {
    try {
      await fetch(`/api/v1/tasks/${taskId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });
      setTasks((prev) =>
        prev.map((t) => (t.id === taskId ? { ...t, status: nextStatus as any } : t))
      );
    } catch {
      // Quiet handling
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-bold rounded bg-rose-100 text-rose-700">
            URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="px-1.5 py-0.5 text-[9px] font-semibold rounded bg-amber-100 text-amber-800">
            HIGH
          </span>
        );
      default:
        return null;
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Kanban className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Kanban Task Board</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Visual work status board supporting seamless status transitions and workload tracking.
          </p>
        </div>

        <button
          onClick={fetchTasks}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs flex items-center gap-1.5 self-start transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Board
        </button>
      </div>

      {/* Sub-view Navigation Bar */}
      <div className="flex items-center justify-between border-b border-slate-200">
        <div className="flex items-center gap-6">
          <Link
            href="/tasks"
            prefetch={true}
            className="pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-900 flex items-center gap-2"
          >
            <CheckSquare className="w-4 h-4" /> Master Task List
          </Link>

          <Link
            href="/tasks/my-work"
            prefetch={true}
            className="pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-900 flex items-center gap-2"
          >
            <User className="w-4 h-4" /> My Work & Today View
          </Link>

          <Link
            href="/tasks/board"
            prefetch={true}
            className="pb-3 text-sm font-semibold border-b-2 border-emerald-600 text-emerald-600 flex items-center gap-2"
          >
            <Kanban className="w-4 h-4" /> Kanban Task Board
          </Link>

          <Link
            href="/calendar"
            prefetch={true}
            className="pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-900 flex items-center gap-2"
          >
            <CalendarIcon className="w-4 h-4" /> Calendar Workspace
          </Link>
        </div>
      </div>

      {/* Kanban Board Columns */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 items-start">
        {COLUMNS.map((col) => {
          const colTasks = tasks.filter((t) => t.status === col.key);

          return (
            <div
              key={col.key}
              className={`rounded-xl border p-3 min-h-[500px] flex flex-col space-y-3 ${col.bg}`}
            >
              <div className="flex items-center justify-between px-1">
                <span className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                  {col.label}
                </span>
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-white text-slate-700 shadow-2xs">
                  {colTasks.length}
                </span>
              </div>

              <div className="space-y-2.5 flex-1">
                {isLoading ? (
                  <div className="p-8 text-center text-xs text-slate-400">Loading...</div>
                ) : colTasks.length === 0 ? (
                  <div className="p-8 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-lg">
                    No tasks in {col.label.toLowerCase()}
                  </div>
                ) : (
                  colTasks.map((t) => (
                    <div
                      key={t.id}
                      className="bg-white p-3.5 rounded-lg border border-slate-200 shadow-2xs hover:shadow-md transition-shadow space-y-2"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-mono text-[10px] font-bold text-slate-600">
                          {t.referenceNo}
                        </span>
                        {getPriorityBadge(t.priority)}
                      </div>

                      <h4 className="text-xs font-semibold text-slate-900 leading-snug">{t.title}</h4>

                      {t.project && (
                        <div className="text-[10px] text-emerald-700 font-medium flex items-center gap-1">
                          <Folder className="w-3 h-3" /> {t.project.referenceNo}
                        </div>
                      )}

                      <div className="flex items-center justify-between text-[10px] text-slate-400 pt-1 border-t border-slate-100">
                        <span>{t.assignee ? t.assignee.fullName : "Unassigned"}</span>
                        {t.dueAt && <span>{formatDate(t.dueAt)}</span>}
                      </div>

                      {/* Quick Column Shift Controls */}
                      <div className="flex items-center justify-between pt-1 text-[10px]">
                        {col.key !== "TODO" ? (
                          <button
                            onClick={() =>
                              moveTaskStatus(
                                t.id,
                                col.key === "IN_PROGRESS"
                                  ? "TODO"
                                  : col.key === "BLOCKED"
                                  ? "IN_PROGRESS"
                                  : "IN_PROGRESS"
                              )
                            }
                            className="text-slate-500 hover:text-slate-900 flex items-center gap-0.5"
                          >
                            <ChevronLeft className="w-3 h-3" /> Move Left
                          </button>
                        ) : (
                          <span />
                        )}

                        {col.key !== "COMPLETED" && (
                          <button
                            onClick={() =>
                              moveTaskStatus(
                                t.id,
                                col.key === "TODO"
                                  ? "IN_PROGRESS"
                                  : col.key === "IN_PROGRESS"
                                  ? "COMPLETED"
                                  : "COMPLETED"
                              )
                            }
                            className="text-emerald-600 hover:text-emerald-800 font-medium flex items-center gap-0.5"
                          >
                            Move Right <ChevronRight className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
