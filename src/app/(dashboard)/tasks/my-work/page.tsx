"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import {
  User,
  Clock,
  AlertTriangle,
  CheckCircle2,
  AlertCircle,
  Folder,
  CheckSquare,
  Kanban,
  Calendar as CalendarIcon,
  Check,
  RefreshCw,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface TaskItem {
  id: string;
  referenceNo: string;
  title: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: string;
  dueAt?: string | null;
  completedAt?: string | null;
  project?: { referenceNo: string; title: string } | null;
}

interface MyWorkData {
  dueTodayCount: number;
  overdueCount: number;
  upcomingCount: number;
  blockedCount: number;
  dueToday: TaskItem[];
  overdue: TaskItem[];
  upcoming: TaskItem[];
  blocked: TaskItem[];
  recentlyCompleted: TaskItem[];
}

export default function MyWorkPage() {
  const router = useRouter();
  const [data, setData] = useState<MyWorkData | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const fetchMyWork = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/tasks/my-work");
      const json = await res.json();
      if (json.success) {
        setData(json.data);
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchMyWork();
  }, [fetchMyWork]);

  const markComplete = async (id: string) => {
    try {
      await fetch(`/api/v1/tasks/${id}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "COMPLETED" }),
      });
      fetchMyWork();
    } catch {
      // Quiet handling
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <User className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">My Work & Today View</h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Personal productivity workspace highlighting your immediate priorities, overdue tasks, and upcoming deadlines.
          </p>
        </div>

        <button
          onClick={fetchMyWork}
          className="px-3 py-1.5 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-50 border border-slate-300 rounded-lg shadow-2xs flex items-center gap-1.5 self-start transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Refresh Work
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
            className="pb-3 text-sm font-semibold border-b-2 border-emerald-600 text-emerald-600 flex items-center gap-2"
          >
            <User className="w-4 h-4" /> My Work & Today View
          </Link>

          <Link
            href="/tasks/board"
            prefetch={true}
            className="pb-3 text-sm font-semibold border-b-2 border-transparent text-slate-500 hover:text-slate-900 flex items-center gap-2"
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

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <Clock className="w-4 h-4 text-emerald-600" /> Due Today
          </span>
          <p className="text-2xl font-bold text-slate-900">{data?.dueTodayCount ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <AlertTriangle className="w-4 h-4 text-rose-600" /> Overdue Tasks
          </span>
          <p className="text-2xl font-bold text-rose-600">{data?.overdueCount ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <CalendarIcon className="w-4 h-4 text-blue-600" /> Upcoming (7 Days)
          </span>
          <p className="text-2xl font-bold text-slate-900">{data?.upcomingCount ?? 0}</p>
        </div>

        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
          <span className="text-xs font-semibold text-slate-500 flex items-center gap-1">
            <AlertCircle className="w-4 h-4 text-amber-600" /> Blocked Tasks
          </span>
          <p className="text-2xl font-bold text-amber-600">{data?.blockedCount ?? 0}</p>
        </div>
      </div>

      {/* OVERDUE SECTION */}
      {data?.overdue && data.overdue.length > 0 && (
        <div className="bg-white rounded-xl border border-rose-200 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-rose-100 bg-rose-50/50 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-600" />
            <h2 className="text-xs font-bold text-rose-900">Overdue Tasks Require Attention</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {data.overdue.map((t) => (
              <div key={t.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-600">{t.referenceNo}</span>
                    <h3 className="text-xs font-semibold text-slate-900">{t.title}</h3>
                  </div>
                  <p className="text-[10px] text-rose-600 font-medium">Due: {formatDate(t.dueAt!)}</p>
                </div>
                <button
                  onClick={() => markComplete(t.id)}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" /> Mark Done
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* DUE TODAY SECTION */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-4 border-b border-slate-100 bg-slate-50 flex items-center gap-2">
          <Clock className="w-4 h-4 text-emerald-600" />
          <h2 className="text-xs font-bold text-slate-900">Due Today</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {isLoading ? (
            <div className="p-8 text-center text-xs text-slate-400">Loading today&apos;s tasks...</div>
          ) : !data?.dueToday || data.dueToday.length === 0 ? (
            <div className="p-8 text-center text-xs text-slate-500">You are all clear for today!</div>
          ) : (
            data.dueToday.map((t) => (
              <div key={t.id} className="p-3.5 flex items-center justify-between gap-4 hover:bg-slate-50">
                <div className="space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] font-bold text-slate-600">{t.referenceNo}</span>
                    <h3 className="text-xs font-semibold text-slate-900">{t.title}</h3>
                  </div>
                  {t.project && (
                    <span className="text-[10px] text-emerald-700 flex items-center gap-1 font-medium">
                      <Folder className="w-3 h-3" /> {t.project.referenceNo} - {t.project.title}
                    </span>
                  )}
                </div>
                <button
                  onClick={() => markComplete(t.id)}
                  className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1 shrink-0"
                >
                  <Check className="w-3.5 h-3.5" /> Mark Done
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
