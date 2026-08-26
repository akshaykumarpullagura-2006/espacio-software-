"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Bell,
  Sliders,
  Shield,
  Save,
  Plus,
  Edit,
  Check,
  X,
  AlertCircle,
  Clock,
  Layers,
  ChevronLeft,
} from "lucide-react";

interface PreferenceItem {
  category: string;
  channel: string;
  isEnabled: boolean;
}

interface RuleItem {
  id: string;
  name: string;
  eventType: string;
  category: string;
  priority: string;
  recipientType: string;
  targetRole?: string | null;
  channels: string;
  templateTitle: string;
  templateBody: string;
  isEnabled: boolean;
  isSystemMandatory: boolean;
}

const CATEGORIES = [
  "CRM",
  "PROJECTS",
  "FINANCE",
  "PROCUREMENT",
  "INVENTORY",
  "TASKS",
  "SYSTEM",
  "REPORTS",
];

const CHANNELS = ["IN_APP", "EMAIL", "PUSH", "SMS", "WHATSAPP"];

export default function NotificationSettingsPage() {
  const router = useRouter();
  const [preferences, setPreferences] = useState<Record<string, Record<string, boolean>>>({});
  const [rules, setRules] = useState<RuleItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSavingPref, setIsSavingPref] = useState(false);

  // Rule Builder Modal
  const [isRuleModalOpen, setIsRuleModalOpen] = useState(false);
  const [editingRuleId, setEditingRuleId] = useState<string | null>(null);
  const [ruleName, setRuleName] = useState("");
  const [ruleEventType, setRuleEventType] = useState("PAYMENT_OVERDUE");
  const [ruleCategory, setRuleCategory] = useState("FINANCE");
  const [rulePriority, setRulePriority] = useState("NORMAL");
  const [ruleRecipientType, setRuleRecipientType] = useState("ROLE");
  const [ruleTargetRole, setRuleTargetRole] = useState("FINANCE");
  const [ruleChannels, setRuleChannels] = useState<string[]>(["IN_APP"]);
  const [ruleTemplateTitle, setRuleTemplateTitle] = useState("");
  const [ruleTemplateBody, setRuleTemplateBody] = useState("");
  const [ruleIsEnabled, setRuleIsEnabled] = useState(true);
  const [isSubmittingRule, setIsSubmittingRule] = useState(false);

  const fetchSettings = async () => {
    setIsLoading(true);
    try {
      const [prefRes, rulesRes] = await Promise.all([
        fetch("/api/v1/notifications/preferences"),
        fetch("/api/v1/notifications/rules"),
      ]);

      const prefJson = await prefRes.json();
      const rulesJson = await rulesRes.json();

      if (prefJson.success) {
        const prefMap: Record<string, Record<string, boolean>> = {};
        (prefJson.data || []).forEach((p: PreferenceItem) => {
          if (!prefMap[p.category]) prefMap[p.category] = {};
          prefMap[p.category][p.channel] = p.isEnabled;
        });
        setPreferences(prefMap);
      }

      if (rulesJson.success) {
        setRules(rulesJson.data || []);
      }
    } catch {
      // Quiet handling
    } fontFinally: {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchSettings();
  }, []);

  const togglePreference = async (category: string, channel: string) => {
    const current = preferences[category]?.[channel] ?? true;
    const nextVal = !current;

    setPreferences((prev) => ({
      ...prev,
      [category]: {
        ...(prev[category] || {}),
        [channel]: nextVal,
      },
    }));

    try {
      await fetch("/api/v1/notifications/preferences", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category, channel, isEnabled: nextVal }),
      });
    } catch {
      // Quiet handling
    }
  };

  const handleSaveRule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ruleName.trim() || !ruleTemplateTitle.trim() || !ruleTemplateBody.trim()) return;

    setIsSubmittingRule(true);
    try {
      const res = await fetch("/api/v1/notifications/rules", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: editingRuleId || undefined,
          name: ruleName.trim(),
          eventType: ruleEventType,
          category: ruleCategory,
          priority: rulePriority,
          recipientType: ruleRecipientType,
          targetRole: ruleTargetRole,
          channels: ruleChannels,
          templateTitle: ruleTemplateTitle.trim(),
          templateBody: ruleTemplateBody.trim(),
          isEnabled: ruleIsEnabled,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsRuleModalOpen(false);
        resetRuleForm();
        fetchSettings();
      }
    } catch {
      // Quiet handling
    } finally {
      setIsSubmittingRule(false);
    }
  };

  const openCreateRuleModal = () => {
    resetRuleForm();
    setIsRuleModalOpen(true);
  };

  const openEditRuleModal = (rule: RuleItem) => {
    setEditingRuleId(rule.id);
    setRuleName(rule.name);
    setRuleEventType(rule.eventType);
    setRuleCategory(rule.category);
    setRulePriority(rule.priority);
    setRuleRecipientType(rule.recipientType);
    setRuleTargetRole(rule.targetRole || "FINANCE");
    try {
      setRuleChannels(JSON.parse(rule.channels));
    } catch {
      setRuleChannels(["IN_APP"]);
    }
    setRuleTemplateTitle(rule.templateTitle);
    setRuleTemplateBody(rule.templateBody);
    setRuleIsEnabled(rule.isEnabled);
    setIsRuleModalOpen(true);
  };

  const resetRuleForm = () => {
    setEditingRuleId(null);
    setRuleName("");
    setRuleEventType("PAYMENT_OVERDUE");
    setRuleCategory("FINANCE");
    setRulePriority("NORMAL");
    setRuleRecipientType("ROLE");
    setRuleTargetRole("FINANCE");
    setRuleChannels(["IN_APP"]);
    setRuleTemplateTitle("");
    setRuleTemplateBody("");
    setRuleIsEnabled(true);
  };

  return (
    <div className="p-6 space-y-8 max-w-7xl mx-auto">
      {/* Back & Header */}
      <div>
        <button
          onClick={() => router.push("/notifications")}
          className="text-xs font-semibold text-slate-500 hover:text-slate-900 flex items-center gap-1 mb-2"
        >
          <ChevronLeft className="w-4 h-4" /> Back to Attention Center
        </button>
        <div className="flex items-center gap-2">
          <Sliders className="w-6 h-6 text-emerald-600" />
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">
            Notification Settings & Rule Builder
          </h1>
        </div>
        <p className="text-xs text-slate-500 mt-1">
          Configure personal channel delivery preferences and manage automated enterprise notification rules.
        </p>
      </div>

      {/* SECTION 1: Personal Notification Preferences */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Bell className="w-4 h-4 text-emerald-600" /> Personal Notification Preferences
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Choose which delivery channels to enable for each event category.
            </p>
          </div>
        </div>

        <div className="p-6 overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/50">
                <th className="py-2.5 px-4 font-bold text-slate-700">Category</th>
                {CHANNELS.map((ch) => (
                  <th key={ch} className="py-2.5 px-4 font-bold text-slate-700 text-center">
                    {ch.replace("_", " ")}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {CATEGORIES.map((cat) => (
                <tr key={cat} className="hover:bg-slate-50/50">
                  <td className="py-3 px-4 font-semibold text-slate-900">{cat}</td>
                  {CHANNELS.map((ch) => {
                    const isEnabled = preferences[cat]?.[ch] ?? true;
                    return (
                      <td key={ch} className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={isEnabled}
                          onChange={() => togglePreference(cat, ch)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500 cursor-pointer"
                        />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* SECTION 2: Notification Rules Engine */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
        <div className="p-5 border-b border-slate-100 bg-slate-50 flex items-center justify-between">
          <div>
            <h2 className="text-sm font-bold text-slate-900 flex items-center gap-2">
              <Shield className="w-4 h-4 text-emerald-600" /> Notification Rules Engine
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Configure system event triggers, recipient resolution, and automated template messages.
            </p>
          </div>
          <button
            onClick={openCreateRuleModal}
            className="px-3.5 py-1.5 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-4 h-4" /> Add Notification Rule
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {rules.length === 0 ? (
            <div className="p-12 text-center text-xs text-slate-400">
              No custom notification rules configured. Click &quot;Add Notification Rule&quot; to create one.
            </div>
          ) : (
            rules.map((rule) => (
              <div key={rule.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/50">
                <div className="space-y-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="font-semibold text-xs text-slate-900">{rule.name}</span>
                    <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-700">
                      {rule.eventType}
                    </span>
                    <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-emerald-100 text-emerald-800">
                      {rule.category}
                    </span>
                    {rule.isEnabled ? (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-50 text-emerald-700 border border-emerald-200">
                        Active
                      </span>
                    ) : (
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-slate-100 text-slate-500">
                        Disabled
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-600">
                    <span className="font-semibold">Target:</span> {rule.recipientType}{" "}
                    {rule.targetRole ? `(${rule.targetRole})` : ""} |{" "}
                    <span className="font-semibold">Template:</span> &quot;{rule.templateTitle}&quot;
                  </p>
                </div>

                <button
                  onClick={() => openEditRuleModal(rule)}
                  className="px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-slate-900 bg-white hover:bg-slate-100 border border-slate-200 rounded-md transition-colors flex items-center gap-1 shrink-0"
                >
                  <Edit className="w-3.5 h-3.5" /> Edit Rule
                </button>
              </div>
            ))
          )}
        </div>
      </div>

      {/* RULE BUILDER MODAL */}
      {isRuleModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <Shield className="w-4 h-4 text-emerald-600" />
                {editingRuleId ? "Edit Notification Rule" : "Create Notification Rule"}
              </h3>
              <button
                onClick={() => setIsRuleModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveRule} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Rule Name <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Finance Payment Overdue Alert"
                  value={ruleName}
                  onChange={(e) => setRuleName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Event Type Trigger
                  </label>
                  <select
                    value={ruleEventType}
                    onChange={(e) => setRuleEventType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="PAYMENT_OVERDUE">PAYMENT_OVERDUE</option>
                    <option value="STOCK_LOW">STOCK_LOW</option>
                    <option value="PO_APPROVAL_REQUIRED">PO_APPROVAL_REQUIRED</option>
                    <option value="PROJECT_DELAYED">PROJECT_DELAYED</option>
                    <option value="EXPENSE_APPROVAL_REQUIRED">EXPENSE_APPROVAL_REQUIRED</option>
                    <option value="TASK_ASSIGNED">TASK_ASSIGNED</option>
                    <option value="SYSTEM_ALERT">SYSTEM_ALERT</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={ruleCategory}
                    onChange={(e) => setRuleCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  >
                    {CATEGORIES.map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Recipient Type
                  </label>
                  <select
                    value={ruleRecipientType}
                    onChange={(e) => setRuleRecipientType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="ROLE">Role</option>
                    <option value="PROJECT_MEMBERS">Project Members</option>
                    <option value="ASSIGNED_USER">Assigned User</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Target Role
                  </label>
                  <select
                    value={ruleTargetRole}
                    onChange={(e) => setRuleTargetRole(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="FINANCE">FINANCE</option>
                    <option value="PROCUREMENT">PROCUREMENT</option>
                    <option value="PROJECT_MANAGER">PROJECT_MANAGER</option>
                    <option value="ADMIN">ADMIN</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Overdue Payment Alert for {project}"
                  value={ruleTemplateTitle}
                  onChange={(e) => setRuleTemplateTitle(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Template Message Body <span className="text-rose-500">*</span>
                </label>
                <textarea
                  rows={3}
                  required
                  placeholder="e.g. Payment of {amount} for project {project} is overdue since {dueDate}."
                  value={ruleTemplateBody}
                  onChange={(e) => setRuleTemplateBody(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="ruleEnabled"
                  checked={ruleIsEnabled}
                  onChange={(e) => setRuleIsEnabled(e.target.checked)}
                  className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                />
                <label htmlFor="ruleEnabled" className="text-xs font-semibold text-slate-700 cursor-pointer">
                  Enable this notification rule
                </label>
              </div>

              <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsRuleModalOpen(false)}
                  className="px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-lg transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmittingRule}
                  className="px-4 py-2 text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-700 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
                >
                  {isSubmittingRule ? "Saving..." : "Save Rule"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
