"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Search,
  ExternalLink,
  Clock,
  Folder,
  DollarSign,
  Truck,
  FileText,
  Bell,
  CheckSquare,
  X,
  RefreshCw,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface CalendarEvent {
  id: string;
  title: string;
  date: string;
  sourceType: "TASK" | "PROJECT_MILESTONE" | "PAYMENT_DUE" | "PO_DELIVERY" | "QUOTATION_EXPIRY" | "REMINDER";
  sourceId: string;
  referenceNo?: string;
  actionUrl: string;
  priority: "LOW" | "NORMAL" | "HIGH" | "URGENT";
  status: string;
  category: "TASKS" | "PROJECTS" | "FINANCE" | "PROCUREMENT" | "CRM" | "REMINDERS";
}

export default function CalendarWorkspacePage() {
  const router = useRouter();
  const [calendarView, setCalendarView] = useState<"MONTH" | "WEEK" | "DAY" | "AGENDA">("MONTH");
  const [currentDate, setCurrentDate] = useState(new Date());

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);

  // Prefilled slot creation modal
  const [isSlotModalOpen, setIsSlotModalOpen] = useState(false);
  const [slotDate, setSlotDate] = useState("");
  const [newTitle, setNewTitle] = useState("");
  const [newPriority, setNewPriority] = useState("NORMAL");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchEvents = useCallback(async () => {
    setIsLoading(true);
    try {
      const year = currentDate.getFullYear();
      const month = currentDate.getMonth();

      // Range for query: start of month (or week/day) to end of month
      const start = new Date(year, month - 1, 1).toISOString();
      const end = new Date(year, month + 2, 0, 23, 59, 59).toISOString();

      let url = `/api/v1/calendar/events?startDate=${encodeURIComponent(start)}&endDate=${encodeURIComponent(end)}`;
      if (categoryFilter !== "ALL") url += `&category=${categoryFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setEvents(json.data || []);
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoading(false);
    }
  }, [currentDate, categoryFilter, searchQuery]);

  useEffect(() => {
    fetchEvents();
  }, [fetchEvents]);

  const handlePrev = () => {
    if (calendarView === "MONTH") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1));
    } else if (calendarView === "WEEK") {
      setCurrentDate(new Date(currentDate.getTime() - 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() - 24 * 60 * 60 * 1000));
    }
  };

  const handleNext = () => {
    if (calendarView === "MONTH") {
      setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1));
    } else if (calendarView === "WEEK") {
      setCurrentDate(new Date(currentDate.getTime() + 7 * 24 * 60 * 60 * 1000));
    } else {
      setCurrentDate(new Date(currentDate.getTime() + 24 * 60 * 60 * 1000));
    }
  };

  const handleSlotClick = (dateStr: string) => {
    setSlotDate(dateStr);
    setNewTitle("");
    setIsSlotModalOpen(true);
  };

  const handleCreateTaskSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/tasks", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: newTitle.trim(),
          priority: newPriority,
          dueAt: new Date(slotDate).toISOString(),
        }),
      });
      const json = await res.json();
      if (json.success) {
        setIsSlotModalOpen(false);
        fetchEvents();
      }
    } catch {
      // Quiet handling
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSourceIcon = (sourceType: string) => {
    switch (sourceType) {
      case "TASK":
        return <CheckSquare className="w-3.5 h-3.5 text-semantic-info" />;
      case "PROJECT_MILESTONE":
        return <Folder className="w-3.5 h-3.5 text-semantic-success" />;
      case "PAYMENT_DUE":
        return <DollarSign className="w-3.5 h-3.5 text-gold" />;
      case "PO_DELIVERY":
        return <Truck className="w-3.5 h-3.5 text-walnut" />;
      case "QUOTATION_EXPIRY":
        return <FileText className="w-3.5 h-3.5 text-charcoal" />;
      case "REMINDER":
        return <Bell className="w-3.5 h-3.5 text-semantic-danger" />;
      default:
        return <Clock className="w-3.5 h-3.5 text-walnut" />;
    }
  };

  const getSourceColor = (sourceType: string) => {
    switch (sourceType) {
      case "TASK":
        return "bg-semantic-info-bg text-semantic-info border-semantic-info-border";
      case "PROJECT_MILESTONE":
        return "bg-semantic-success-bg text-semantic-success border-semantic-success-border";
      case "PAYMENT_DUE":
        return "bg-gold-soft text-charcoal border-gold/40";
      case "PO_DELIVERY":
        return "bg-cream text-walnut border-walnut/20";
      case "QUOTATION_EXPIRY":
        return "bg-offwhite text-charcoal border-walnut/20";
      case "REMINDER":
        return "bg-semantic-danger-bg text-semantic-danger border-semantic-danger-border";
      default:
        return "bg-cream text-charcoal border-walnut/20";
    }
  };

  // Render Month Grid Matrix
  const renderMonthGrid = () => {
    const year = currentDate.getFullYear();
    const month = currentDate.getMonth();

    const firstDay = new Date(year, month, 1).getDay(); // 0 is Sunday
    const daysInMonth = new Date(year, month + 1, 0).getDate();

    const grid = [];
    // Empty slots before 1st day
    for (let i = 0; i < firstDay; i++) {
      grid.push(null);
    }
    // Days of month
    for (let d = 1; d <= daysInMonth; d++) {
      grid.push(new Date(year, month, d));
    }

    return (
      <div className="grid grid-cols-7 gap-px bg-walnut/15 rounded-xl overflow-hidden border border-walnut/20 shadow-card">
        {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((dayName) => (
          <div
            key={dayName}
            className="p-2.5 bg-cream/80 text-center text-xs font-bold text-charcoal uppercase tracking-wider"
          >
            {dayName}
          </div>
        ))}

        {grid.map((dateObj, idx) => {
          if (!dateObj) {
            return <div key={`empty_${idx}`} className="bg-cream/30 min-h-[110px]" />;
          }

          const dateStr = dateObj.toISOString().split("T")[0];
          const isToday =
            dateObj.toDateString() === new Date().toDateString();

          const dayEvents = events.filter((e) => e.date.startsWith(dateStr));

          return (
            <div
              key={dateStr}
              onClick={() => handleSlotClick(dateStr)}
              className={`p-2 bg-offwhite min-h-[110px] flex flex-col justify-between hover:bg-cream/60 transition-colors cursor-pointer group ${
                isToday ? "ring-2 ring-gold bg-gold-soft/30" : ""
              }`}
            >
              <div className="flex items-center justify-between">
                <span
                  className={`text-xs font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                    isToday
                      ? "bg-gold text-charcoal"
                      : "text-charcoal group-hover:text-gold"
                  }`}
                >
                  {dateObj.getDate()}
                </span>
                {dayEvents.length > 0 && (
                  <span className="text-[10px] font-bold text-walnut">
                    {dayEvents.length}
                  </span>
                )}
              </div>

              {/* Event Pills */}
              <div className="space-y-1 my-1 overflow-y-auto max-h-[75px] no-scrollbar">
                {dayEvents.slice(0, 3).map((ev) => (
                  <div
                    key={ev.id}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedEvent(ev);
                    }}
                    className={`px-1.5 py-0.5 text-[10px] font-medium rounded border truncate flex items-center gap-1 shadow-2xs ${getSourceColor(
                      ev.sourceType
                    )}`}
                    title={ev.title}
                  >
                    {getSourceIcon(ev.sourceType)}
                    <span className="truncate">{ev.title}</span>
                  </div>
                ))}
                {dayEvents.length > 3 && (
                  <span className="text-[9px] font-bold text-walnut block pl-1">
                    +{dayEvents.length - 3} more
                  </span>
                )}
              </div>

              <div className="text-[9px] text-walnut/60 opacity-0 group-hover:opacity-100 transition-opacity font-semibold">
                + Add Task
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-walnut/15 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <CalendarIcon className="w-6 h-6 text-gold" />
            <h1 className="text-xl font-bold text-charcoal tracking-tight">Calendar Workspace</h1>
          </div>
          <p className="text-xs text-walnut mt-1">
            Aggregated business timeline consuming Tasks, Project Milestones, Payment Dues, PO Deliveries, and Reminders.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => handleSlotClick(new Date().toISOString().split("T")[0])}
            className="px-3.5 py-1.5 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Schedule Event
          </button>
        </div>
      </div>

      {/* Date Navigation & View Selector */}
      <div className="bg-offwhite p-4 rounded-xl border border-walnut/20 shadow-card flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1">
            <button
              onClick={handlePrev}
              className="p-1.5 text-walnut hover:text-charcoal border border-walnut/20 rounded-lg hover:bg-cream transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => setCurrentDate(new Date())}
              className="px-3 py-1.5 text-xs font-bold text-charcoal bg-cream/40 border border-walnut/20 rounded-lg hover:bg-cream transition-colors cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={handleNext}
              className="p-1.5 text-walnut hover:text-charcoal border border-walnut/20 rounded-lg hover:bg-cream transition-colors cursor-pointer"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <h2 className="text-base font-bold text-charcoal">
            {currentDate.toLocaleDateString("en-US", { month: "long", year: "numeric" })}
          </h2>
        </div>

        {/* Category Filters & Search */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative min-w-[180px]">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-walnut" />
            <input
              type="text"
              placeholder="Search calendar..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-walnut/20 bg-cream/40 rounded-lg text-charcoal focus:outline-none focus:border-gold"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-walnut/20 rounded-lg bg-cream/40 text-charcoal font-semibold focus:outline-none focus:border-gold"
          >
            <option value="ALL">All Categories</option>
            <option value="TASKS">Tasks</option>
            <option value="PROJECTS">Projects</option>
            <option value="FINANCE">Finance</option>
            <option value="PROCUREMENT">Procurement</option>
            <option value="CRM">CRM</option>
            <option value="REMINDERS">Reminders</option>
          </select>

          <div className="flex items-center border border-walnut/20 rounded-lg overflow-hidden bg-cream/50 p-0.5">
            {(["MONTH", "WEEK", "DAY", "AGENDA"] as const).map((viewKey) => (
              <button
                key={viewKey}
                onClick={() => setCalendarView(viewKey)}
                className={`px-3 py-1 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  calendarView === viewKey
                    ? "bg-gold text-charcoal shadow-2xs border border-gold/60"
                    : "text-walnut hover:text-charcoal hover:bg-cream"
                }`}
              >
                {viewKey}
              </button>
            ))}
          </div>

          <button
            onClick={fetchEvents}
            className="p-1.5 text-walnut hover:text-charcoal rounded-md hover:bg-cream transition-colors cursor-pointer"
            title="Refresh Events"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* CALENDAR VIEWS */}
      {calendarView === "MONTH" && renderMonthGrid()}

      {calendarView === "AGENDA" && (
        <div className="bg-offwhite rounded-xl border border-walnut/20 shadow-card divide-y divide-walnut/10 overflow-hidden">
          {isLoading ? (
            <div className="p-12 text-center text-xs text-walnut">Loading agenda events...</div>
          ) : events.length === 0 ? (
            <div className="p-16 text-center text-xs text-walnut">No scheduled business events.</div>
          ) : (
            events.map((ev) => (
              <div
                key={ev.id}
                onClick={() => setSelectedEvent(ev)}
                className="p-4 hover:bg-cream/50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-cream/70 border border-walnut/15">{getSourceIcon(ev.sourceType)}</div>
                  <div>
                    <div className="flex items-center gap-2">
                      {ev.referenceNo && (
                        <span className="font-mono text-[10px] font-bold text-walnut px-1.5 py-0.5 bg-cream rounded border border-walnut/15">
                          {ev.referenceNo}
                        </span>
                      )}
                      <h3 className="text-xs font-bold text-charcoal">{ev.title}</h3>
                    </div>
                    <span className="text-[10px] text-walnut mt-1 block">
                      Scheduled: {formatDate(ev.date)}
                    </span>
                  </div>
                </div>

                <span className="text-charcoal hover:text-gold text-xs font-bold flex items-center gap-1 transition-colors">
                  View Source <ExternalLink className="w-3.5 h-3.5" />
                </span>
              </div>
            ))
          )}
        </div>
      )}

      {(calendarView === "WEEK" || calendarView === "DAY") && (
        <div className="bg-offwhite p-12 rounded-xl border border-walnut/20 text-center text-xs text-walnut">
          Showing timeline view for {calendarView.toLowerCase()} mode. All {events.length} events active.
        </div>
      )}

      {/* EVENT DRILL-DOWN MODAL */}
      {selectedEvent && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div className="bg-offwhite rounded-xl shadow-2xl border border-walnut/20 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70">
              <div className="flex items-center gap-2">
                {getSourceIcon(selectedEvent.sourceType)}
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-cream text-charcoal rounded border border-walnut/20">
                  {selectedEvent.referenceNo || selectedEvent.sourceType}
                </span>
              </div>
              <button
                onClick={() => setSelectedEvent(null)}
                className="p-1 text-walnut hover:text-charcoal rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-walnut">
                  {selectedEvent.category} • {selectedEvent.sourceType.replace("_", " ")}
                </span>
                <h2 className="text-base font-bold text-charcoal mt-1">{selectedEvent.title}</h2>
              </div>

              <div className="bg-cream/50 p-3 rounded-lg border border-walnut/15 space-y-1.5 text-xs text-charcoal">
                <div className="flex justify-between">
                  <span className="font-bold text-walnut">Scheduled Date:</span>
                  <span>{formatDate(selectedEvent.date)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-walnut">Priority:</span>
                  <span className="font-bold text-gold">{selectedEvent.priority}</span>
                </div>
                <div className="flex justify-between">
                  <span className="font-bold text-walnut">Status:</span>
                  <span className="font-semibold">{selectedEvent.status}</span>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-walnut/15 bg-cream/70 flex items-center justify-between text-xs">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-1.5 font-bold text-walnut bg-offwhite hover:bg-cream border border-walnut/20 rounded-md cursor-pointer"
              >
                Close
              </button>
              <button
                onClick={() => {
                  const url = selectedEvent.actionUrl;
                  setSelectedEvent(null);
                  router.push(url);
                }}
                className="px-4 py-1.5 font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-md shadow-gold flex items-center gap-1.5 cursor-pointer"
              >
                Open Source Record <ExternalLink className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* SLOT CLICK TASK CREATION MODAL */}
      {isSlotModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div className="bg-offwhite rounded-xl shadow-2xl border border-walnut/20 w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70">
              <h3 className="text-sm font-bold text-charcoal flex items-center gap-2">
                <CalendarIcon className="w-4 h-4 text-gold" /> Schedule Task on {slotDate}
              </h3>
              <button
                onClick={() => setIsSlotModalOpen(false)}
                className="p-1 text-walnut hover:text-charcoal rounded-md cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateTaskSlot} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-bold text-walnut mb-1">
                  Task Title <span className="text-semantic-danger">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Client Follow-up Call"
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
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

              <div className="pt-3 border-t border-walnut/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsSlotModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-walnut hover:bg-cream rounded-lg transition-colors border border-walnut/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Scheduling..." : "Schedule Task"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
