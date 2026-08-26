"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Clock,
  CheckCheck,
  Check,
  X,
  Plus,
  Calendar,
  AlertTriangle,
  ShieldAlert,
  Search,
  Filter,
  ExternalLink,
  Settings,
  RefreshCw,
  CheckCircle2,
  AlertCircle,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface NotificationItem {
  id: string;
  type: string;
  category: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  title: string;
  message: string;
  actionUrl?: string | null;
  isRead: boolean;
  createdAt: string;
}

interface ReminderItem {
  id: string;
  referenceNo: string;
  title: string;
  description?: string | null;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  dueAt: string;
  status: "PENDING" | "COMPLETED" | "DISMISSED" | "OVERDUE" | "CANCELLED";
  snoozedUntil?: string | null;
  actionUrl?: string | null;
  createdAt: string;
}

export default function NotificationsPage() {
  const router = useRouter();
  const [mainTab, setMainTab] = useState<"NOTIFICATIONS" | "REMINDERS">("NOTIFICATIONS");

  // Notifications State
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [notifCategory, setNotifCategory] = useState("ALL");
  const [notifPriority, setNotifPriority] = useState("ALL");
  const [notifStatus, setNotifStatus] = useState("ALL"); // ALL, UNREAD, READ
  const [notifSearch, setNotifSearch] = useState("");
  const [notifLoading, setNotifLoading] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  // Reminders State
  const [reminders, setReminders] = useState<ReminderItem[]>([]);
  const [reminderStatus, setReminderStatus] = useState("ALL"); // ALL, PENDING, OVERDUE, COMPLETED
  const [reminderSearch, setReminderSearch] = useState("");
  const [reminderLoading, setReminderLoading] = useState(false);
  const [overdueCount, setOverdueCount] = useState(0);

  // Create Reminder Modal
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDesc, setNewDesc] = useState("");
  const [newDueAt, setNewDueAt] = useState("");
  const [newPriority, setNewPriority] = useState("NORMAL");
  const [newActionUrl, setNewActionUrl] = useState("");
  const [isSubmittingReminder, setIsSubmittingReminder] = useState(false);

  // Snooze Modal State
  const [snoozeTargetId, setSnoozeTargetId] = useState<string | null>(null);

  const fetchNotifications = useCallback(async () => {
    setNotifLoading(true);
    try {
      let url = `/api/v1/notifications?limit=50`;
      if (notifCategory !== "ALL") url += `&category=${notifCategory}`;
      if (notifPriority !== "ALL") url += `&priority=${notifPriority}`;
      if (notifStatus === "UNREAD") url += `&isRead=false`;
      if (notifStatus === "READ") url += `&isRead=true`;
      if (notifSearch.trim()) url += `&search=${encodeURIComponent(notifSearch.trim())}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
      }
    } catch {
      // Quiet handling
    } finally {
      setNotifLoading(false);
    }
  }, [notifCategory, notifPriority, notifStatus, notifSearch]);

  const fetchReminders = useCallback(async () => {
    setReminderLoading(true);
    try {
      let url = `/api/v1/reminders?limit=50`;
      if (reminderStatus !== "ALL") url += `&status=${reminderStatus}`;
      if (reminderSearch.trim()) url += `&search=${encodeURIComponent(reminderSearch.trim())}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setReminders(json.data.reminders || []);
        setOverdueCount(json.data.overdueCount || 0);
      }
    } catch {
      // Quiet handling
    } finally {
      setReminderLoading(false);
    }
  }, [reminderStatus, reminderSearch]);

  useEffect(() => {
    if (mainTab === "NOTIFICATIONS") {
      fetchNotifications();
    } else {
      fetchReminders();
    }
  }, [mainTab, fetchNotifications, fetchReminders]);

  const markRead = async (id: string) => {
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // Quiet handling
    }
  };

  const markAllRead = async () => {
    try {
      await fetch(`/api/v1/notifications/mark-all-read?category=${notifCategory}`, {
        method: "POST",
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // Quiet handling
    }
  };

  const dismissNotif = async (id: string) => {
    try {
      await fetch(`/api/v1/notifications/${id}/dismiss`, { method: "POST" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Quiet handling
    }
  };

  const handleCreateReminder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim() || !newDueAt) return;
    setIsSubmittingReminder(true);

    try {
      const res = await fetch("/api/v1/reminders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          description: newDesc.trim() || undefined,
          dueAt: newDueAt,
          priority: newPriority,
          actionUrl: newActionUrl.trim() || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsCreateModalOpen(false);
        setNewTitle("");
        setNewDesc("");
        setNewDueAt("");
        setNewActionUrl("");
        fetchReminders();
      }
    } catch {
      // Quiet handling
    } finally {
      setIsSubmittingReminder(false);
    }
  };

  const completeReminder = async (id: string) => {
    try {
      await fetch(`/api/v1/reminders/${id}/complete`, { method: "POST" });
      setReminders((prev) =>
        prev.map((r) => (r.id === id ? { ...r, status: "COMPLETED" } : r))
      );
    } catch {
      // Quiet handling
    }
  };

  const dismissReminder = async (id: string) => {
    try {
      await fetch(`/api/v1/reminders/${id}/dismiss`, { method: "POST" });
      setReminders((prev) => prev.filter((r) => r.id !== id));
    } catch {
      // Quiet handling
    }
  };

  const snoozeReminder = async (id: string, minutes: number) => {
    try {
      await fetch(`/api/v1/reminders/${id}/snooze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ minutes }),
      });
      setSnoozeTargetId(null);
      fetchReminders();
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

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Bell className="w-6 h-6 text-emerald-600" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">
              Attention Center & Reminders
            </h1>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Centralized notification feed, real-time activity alerts, and actionable reminder management.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => router.push("/settings/notifications")}
            className="px-3 py-1.5 text-xs font-bold text-walnut hover:text-charcoal bg-cream/40 hover:bg-cream border border-walnut/20 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Settings className="w-3.5 h-3.5" /> Settings & Rules
          </button>
          {mainTab === "REMINDERS" && (
            <button
              onClick={() => setIsCreateModalOpen(true)}
              className="px-3.5 py-1.5 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-4 h-4" /> Create Reminder
            </button>
          )}
        </div>
      </div>

      {/* Main Tabs */}
      <div className="flex items-center justify-between border-b border-walnut/15">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setMainTab("NOTIFICATIONS")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              mainTab === "NOTIFICATIONS"
                ? "border-gold text-charcoal"
                : "border-transparent text-walnut hover:text-charcoal"
            }`}
          >
            <Bell className="w-4 h-4 text-gold" />
            Notifications & Alerts
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-gold-soft border border-gold/40 text-charcoal font-mono">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            onClick={() => setMainTab("REMINDERS")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              mainTab === "REMINDERS"
                ? "border-gold text-charcoal"
                : "border-transparent text-walnut hover:text-charcoal"
            }`}
          >
            <Clock className="w-4 h-4" />
            Reminders & Action Items
            {overdueCount > 0 && (
              <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-rose-100 text-rose-800">
                {overdueCount} Overdue
              </span>
            )}
          </button>
        </div>

        <button
          onClick={() => (mainTab === "NOTIFICATIONS" ? fetchNotifications() : fetchReminders())}
          className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors mb-2"
          title="Refresh"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* TAB 1: NOTIFICATIONS */}
      {mainTab === "NOTIFICATIONS" && (
        <div className="space-y-4">
          {/* Filter Bar */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search notifications..."
                  value={notifSearch}
                  onChange={(e) => setNotifSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                />
              </div>

              <select
                value={notifCategory}
                onChange={(e) => setNotifCategory(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Categories</option>
                <option value="CRM">CRM</option>
                <option value="PROJECTS">Projects</option>
                <option value="FINANCE">Finance</option>
                <option value="PROCUREMENT">Procurement</option>
                <option value="INVENTORY">Inventory</option>
                <option value="TASKS">Tasks</option>
                <option value="SYSTEM">System</option>
              </select>

              <select
                value={notifPriority}
                onChange={(e) => setNotifPriority(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Priorities</option>
                <option value="URGENT">Urgent</option>
                <option value="HIGH">High</option>
                <option value="NORMAL">Normal</option>
                <option value="LOW">Low</option>
              </select>

              <select
                value={notifStatus}
                onChange={(e) => setNotifStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Read States</option>
                <option value="UNREAD">Unread Only</option>
                <option value="READ">Read Only</option>
              </select>
            </div>

            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-lg border border-emerald-200 flex items-center gap-1.5 transition-colors"
              >
                <CheckCheck className="w-3.5 h-3.5" /> Mark All as Read
              </button>
            )}
          </div>

          {/* Notifications List */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {notifLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Clock className="w-5 h-5 animate-spin text-emerald-600" />
                Loading notification feed...
              </div>
            ) : notifications.length === 0 ? (
              <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Bell className="w-8 h-8 text-slate-300" />
                <span className="font-semibold text-slate-700">No notifications match filters</span>
                <p className="text-slate-400">Everything is clear in this view.</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 transition-colors flex items-start justify-between gap-4 ${
                    !item.isRead ? "bg-emerald-50/20 border-l-4 border-l-emerald-500" : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider rounded bg-slate-100 text-slate-700">
                        {item.category}
                      </span>
                      {getPriorityBadge(item.priority)}
                      <h3 className="text-xs font-semibold text-slate-900">{item.title}</h3>
                    </div>
                    <p className="text-xs text-slate-600 leading-relaxed">{item.message}</p>
                    <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                      <span>{formatDate(item.createdAt)}</span>
                      {item.actionUrl && (
                        <button
                          onClick={() => {
                            if (!item.isRead) markRead(item.id);
                            router.push(item.actionUrl!);
                          }}
                          className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                        >
                          Take Action <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {!item.isRead && (
                      <button
                        onClick={() => markRead(item.id)}
                        className="px-2 py-1 text-xs font-medium text-slate-600 hover:text-emerald-600 hover:bg-emerald-50 rounded transition-colors flex items-center gap-1"
                        title="Mark Read"
                      >
                        <Check className="w-3.5 h-3.5" /> Read
                      </button>
                    )}
                    <button
                      onClick={() => dismissNotif(item.id)}
                      className="p-1 text-slate-400 hover:text-rose-600 rounded hover:bg-rose-50 transition-colors"
                      title="Dismiss"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* TAB 2: REMINDERS */}
      {mainTab === "REMINDERS" && (
        <div className="space-y-4">
          {/* Reminder Filters */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 flex-wrap flex-1">
              <div className="relative flex-1 min-w-[200px] max-w-md">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search reminders by reference or title..."
                  value={reminderSearch}
                  onChange={(e) => setReminderSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <select
                value={reminderStatus}
                onChange={(e) => setReminderStatus(e.target.value)}
                className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="OVERDUE">Overdue</option>
                <option value="COMPLETED">Completed</option>
                <option value="DISMISSED">Dismissed</option>
              </select>
            </div>
          </div>

          {/* Reminders Grid */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs divide-y divide-slate-100 overflow-hidden">
            {reminderLoading ? (
              <div className="p-12 text-center text-xs text-slate-400 flex flex-col items-center gap-2">
                <Clock className="w-5 h-5 animate-spin text-emerald-600" />
                Loading reminders...
              </div>
            ) : reminders.length === 0 ? (
              <div className="p-16 text-center text-xs text-slate-500 flex flex-col items-center gap-2">
                <Clock className="w-8 h-8 text-slate-300" />
                <span className="font-semibold text-slate-700">No active reminders</span>
                <p className="text-slate-400">Click &quot;Create Reminder&quot; above to set a new action item.</p>
              </div>
            ) : (
              reminders.map((item) => (
                <div
                  key={item.id}
                  className={`p-4 transition-colors flex flex-col sm:flex-row sm:items-center justify-between gap-4 ${
                    item.status === "OVERDUE"
                      ? "bg-rose-50/30 border-l-4 border-l-rose-500"
                      : item.status === "COMPLETED"
                      ? "bg-slate-50/50 opacity-70"
                      : "hover:bg-slate-50/50"
                  }`}
                >
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="font-mono text-[10px] font-bold text-slate-500 px-1.5 py-0.5 bg-slate-100 rounded">
                        {item.referenceNo}
                      </span>
                      {getPriorityBadge(item.priority)}
                      {item.status === "OVERDUE" && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-100 text-rose-700">
                          OVERDUE
                        </span>
                      )}
                      {item.status === "COMPLETED" && (
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-100 text-emerald-800 flex items-center gap-1">
                          <CheckCircle2 className="w-3 h-3" /> COMPLETED
                        </span>
                      )}
                      <h3
                        className={`text-xs font-semibold ${
                          item.status === "COMPLETED" ? "line-through text-slate-400" : "text-slate-900"
                        }`}
                      >
                        {item.title}
                      </h3>
                    </div>

                    {item.description && (
                      <p className="text-xs text-slate-600 leading-relaxed">{item.description}</p>
                    )}

                    <div className="flex items-center gap-4 text-[10px] text-slate-400 pt-1">
                      <span className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-slate-400" /> Due: {formatDate(item.dueAt)}
                      </span>
                      {item.snoozedUntil && (
                        <span className="text-amber-700 font-medium">
                          Snoozed until {formatDate(item.snoozedUntil)}
                        </span>
                      )}
                      {item.actionUrl && (
                        <button
                          onClick={() => router.push(item.actionUrl!)}
                          className="text-emerald-600 hover:text-emerald-700 font-semibold flex items-center gap-1"
                        >
                          Open Record <ExternalLink className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </div>

                  {/* Reminder Action Buttons */}
                  {item.status !== "COMPLETED" && item.status !== "DISMISSED" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        onClick={() => completeReminder(item.id)}
                        className="px-2.5 py-1 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1"
                      >
                        <Check className="w-3.5 h-3.5" /> Complete
                      </button>

                      <div className="relative">
                        <button
                          onClick={() =>
                            setSnoozeTargetId(snoozeTargetId === item.id ? null : item.id)
                          }
                          className="px-2.5 py-1 text-xs font-medium text-slate-700 bg-white hover:bg-slate-100 border border-slate-300 rounded-md transition-colors flex items-center gap-1"
                        >
                          <Clock className="w-3.5 h-3.5" /> Snooze
                        </button>

                        {snoozeTargetId === item.id && (
                          <div className="absolute right-0 mt-1 w-44 bg-white border border-slate-200 rounded-lg shadow-lg z-20 p-1 text-xs space-y-0.5">
                            <button
                              onClick={() => snoozeReminder(item.id, 60)}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded text-slate-700"
                            >
                              Snooze 1 Hour
                            </button>
                            <button
                              onClick={() => snoozeReminder(item.id, 240)}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded text-slate-700"
                            >
                              Snooze 4 Hours
                            </button>
                            <button
                              onClick={() => snoozeReminder(item.id, 1440)}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded text-slate-700 font-medium text-emerald-700"
                            >
                              Snooze Tomorrow
                            </button>
                            <button
                              onClick={() => snoozeReminder(item.id, 10080)}
                              className="w-full text-left px-2.5 py-1.5 hover:bg-slate-100 rounded text-slate-700"
                            >
                              Snooze Next Week
                            </button>
                          </div>
                        )}
                      </div>

                      <button
                        onClick={() => dismissReminder(item.id)}
                        className="p-1 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded transition-colors"
                        title="Dismiss"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}

      {/* CREATE REMINDER MODAL */}
      {isCreateModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div className="bg-offwhite rounded-xl shadow-2xl border border-walnut/20 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70">
              <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
                <Clock className="w-5 h-5 text-gold" /> Schedule Reminder
              </h3>
              <button
                onClick={() => setIsCreateModalOpen(false)}
                className="p-1 text-walnut hover:text-charcoal rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateReminder} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-walnut mb-1">
                  Reminder Title <span className="text-semantic-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Review milestone payment for Project PROJ-2026-0001"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/40 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-walnut mb-1">Description</label>
                <textarea
                  rows={2}
                  placeholder="Additional notes or action steps..."
                  value={newDesc}
                  onChange={(e) => setNewDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/40 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-walnut mb-1">Due Date & Time *</label>
                  <input
                    type="datetime-local"
                    required
                    value={newDueAt}
                    onChange={(e) => setNewDueAt(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/40 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                  />
                </div>

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
              </div>

              <div>
                <label className="block text-xs font-bold text-walnut mb-1">
                  Action Link URL (Optional)
                </label>
                <input
                  type="text"
                  placeholder="e.g. /projects or /procurement/purchase-orders"
                  value={newActionUrl}
                  onChange={(e) => setNewActionUrl(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/40 rounded-lg text-charcoal focus:outline-none focus:border-gold"
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
                  disabled={isSubmittingReminder}
                  className="px-4 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmittingReminder ? "Creating..." : "Save Reminder"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
