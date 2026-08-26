"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Check,
  CheckCheck,
  X,
  ExternalLink,
  Clock,
  AlertTriangle,
  Info,
  ShieldAlert,
  ArrowRight,
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

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onUnreadCountChange?: (count: number) => void;
}

const CATEGORIES = [
  { id: "ALL", label: "All" },
  { id: "FINANCE", label: "Finance" },
  { id: "PROCUREMENT", label: "Procurement" },
  { id: "INVENTORY", label: "Inventory" },
  { id: "PROJECTS", label: "Projects" },
  { id: "TASKS", label: "Tasks" },
  { id: "SYSTEM", label: "System" },
];

export const NotificationDrawer: React.FC<NotificationDrawerProps> = ({
  isOpen,
  onClose,
  onUnreadCountChange,
}) => {
  const router = useRouter();
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [activeCategory, setActiveCategory] = useState("ALL");
  const [isLoading, setIsLoading] = useState(false);

  const fetchNotifications = useCallback(async () => {
    try {
      const url = `/api/v1/notifications?limit=25${
        activeCategory !== "ALL" ? `&category=${activeCategory}` : ""
      }`;
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setNotifications(json.data.notifications || []);
        setUnreadCount(json.data.unreadCount || 0);
        if (onUnreadCountChange) onUnreadCountChange(json.data.unreadCount || 0);
      }
    } catch {
      // Quiet polling handling
    }
  }, [activeCategory, onUnreadCountChange]);

  useEffect(() => {
    if (isOpen) {
      setIsLoading(true);
      fetchNotifications().finally(() => setIsLoading(false));
    }
  }, [isOpen, activeCategory, fetchNotifications]);

  const markRead = async (id: string, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    try {
      await fetch(`/api/v1/notifications/${id}/read`, { method: "POST" });
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, isRead: true } : n))
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
      if (onUnreadCountChange) onUnreadCountChange(Math.max(0, unreadCount - 1));
    } catch {
      // Quiet handling
    }
  };

  const markAllRead = async () => {
    try {
      await fetch("/api/v1/notifications/mark-all-read", { method: "POST" });
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
      if (onUnreadCountChange) onUnreadCountChange(0);
    } catch {
      // Quiet handling
    }
  };

  const dismissNotification = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await fetch(`/api/v1/notifications/${id}/dismiss`, { method: "POST" });
      setNotifications((prev) => prev.filter((n) => n.id !== id));
    } catch {
      // Quiet handling
    }
  };

  const handleActionClick = (item: NotificationItem) => {
    if (!item.isRead) markRead(item.id);
    onClose();
    if (item.actionUrl) {
      router.push(item.actionUrl);
    }
  };

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-semantic-danger-bg text-semantic-danger border border-semantic-danger-border flex items-center gap-1 shrink-0">
            <ShieldAlert className="w-3 h-3" /> URGENT
          </span>
        );
      case "HIGH":
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-bold rounded bg-gold-soft text-charcoal border border-gold/40 flex items-center gap-1 shrink-0">
            <AlertTriangle className="w-3 h-3 text-gold" /> HIGH
          </span>
        );
      case "LOW":
        return (
          <span className="px-1.5 py-0.5 text-[10px] font-medium rounded bg-cream text-walnut shrink-0 border border-walnut/15">
            LOW
          </span>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden flex justify-end">
      <div
        className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity"
        onClick={onClose}
      />

      <div className="relative w-full max-w-md bg-offwhite shadow-2xl border-l border-walnut/20 z-10 flex flex-col h-full animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="px-5 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70 shrink-0">
          <div className="flex items-center gap-2">
            <Bell className="w-4 h-4 text-gold" />
            <h3 className="text-sm font-bold text-charcoal">Notification Center</h3>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-gold-soft text-charcoal border border-gold/40">
                {unreadCount} New
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={markAllRead}
                className="text-xs text-charcoal hover:text-gold-hover font-semibold flex items-center gap-1 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1 rounded-md text-walnut hover:text-charcoal hover:bg-cream transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Category Tabs */}
        <div className="px-3 py-2 border-b border-walnut/10 bg-offwhite flex items-center gap-1 overflow-x-auto no-scrollbar shrink-0">
          {CATEGORIES.map((cat) => (
            <button
              key={cat.id}
              onClick={() => setActiveCategory(cat.id)}
              className={`px-2.5 py-1 text-xs font-semibold rounded-md whitespace-nowrap transition-colors cursor-pointer ${
                activeCategory === cat.id
                  ? "bg-gold text-charcoal font-bold shadow-2xs"
                  : "text-walnut hover:bg-cream hover:text-charcoal"
              }`}
            >
              {cat.label}
            </button>
          ))}
        </div>

        {/* List Body */}
        <div className="flex-1 overflow-y-auto divide-y divide-walnut/10 p-2">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-walnut flex flex-col items-center gap-2">
              <Clock className="w-5 h-5 animate-spin text-gold" />
              Loading notifications...
            </div>
          ) : notifications.length === 0 ? (
            <div className="p-12 text-center text-xs text-walnut flex flex-col items-center gap-2">
              <Info className="w-6 h-6 text-walnut/40" />
              No notifications in {activeCategory === "ALL" ? "this view" : activeCategory.toLowerCase()}.
            </div>
          ) : (
            notifications.map((item) => (
              <div
                key={item.id}
                onClick={() => handleActionClick(item)}
                className={`p-3.5 rounded-lg transition-all flex flex-col gap-2 cursor-pointer border ${
                  !item.isRead
                    ? "bg-gold-soft/40 border-gold/40 hover:bg-gold-soft/70"
                    : "bg-cream/40 border-walnut/10 hover:bg-cream"
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-1.5 flex-wrap">
                    <h4 className="text-xs font-bold text-charcoal">{item.title}</h4>
                    {getPriorityBadge(item.priority)}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    {!item.isRead && (
                      <button
                        onClick={(e) => markRead(item.id, e)}
                        title="Mark read"
                        className="p-1 text-walnut hover:text-charcoal rounded cursor-pointer"
                      >
                        <Check className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={(e) => dismissNotification(item.id, e)}
                      title="Dismiss"
                      className="p-1 text-walnut hover:text-semantic-danger rounded cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                </div>

                <p className="text-xs text-charcoal leading-relaxed">{item.message}</p>

                <div className="flex items-center justify-between mt-1 text-[10px] text-walnut">
                  <span>{formatDate(item.createdAt)}</span>
                  {item.actionUrl && (
                    <span className="text-charcoal hover:text-gold font-bold flex items-center gap-0.5">
                      View details <ExternalLink className="w-3 h-3 text-gold" />
                    </span>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-walnut/15 bg-cream/70 text-center shrink-0">
          <button
            onClick={() => {
              onClose();
              router.push("/notifications");
            }}
            className="w-full py-2 px-3 text-xs font-bold text-charcoal hover:text-charcoal bg-offwhite hover:bg-cream border border-walnut/20 rounded-md transition-colors flex items-center justify-center gap-1 cursor-pointer shadow-2xs"
          >
            Open Full Attention Center & Reminders <ArrowRight className="w-3.5 h-3.5 text-gold" />
          </button>
        </div>
      </div>
    </div>
  );
};
