"use client";

import React, { useState, useEffect } from "react";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { Layers, Save, CheckCircle2, AlertCircle, Clock, ShieldCheck } from "lucide-react";

interface StageItem {
  order: number;
  name: string;
  durationDays: number;
  paymentMilestone: boolean;
  ownerRole: string;
  completionReq?: string;
}

export default function ProjectStageSettingsPage() {
  const [stages, setStages] = useState<StageItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchStages();
  }, []);

  const fetchStages = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/settings/stages");
      const json = await res.json();
      if (json.success && json.data) {
        setStages(json.data || []);
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  const handleStageChange = (index: number, field: keyof StageItem, value: any) => {
    setStages((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const handleSave = async () => {
    setIsSaving(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/settings/stages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ stages }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Project stage configuration saved successfully" });
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to save stage settings" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50/50">
      <SettingsSidebar />

      <main className="flex-1 p-6 max-w-5xl space-y-6">
        <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-gold" /> Project Stage Settings
            </h1>
            <p className="text-xs text-walnut mt-0.5">
              Configure typical stage durations, stage ownership roles, and handover data-discipline requirements.
            </p>
          </div>

          <button
            onClick={handleSave}
            disabled={isSaving}
            className="px-4 py-1.5 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
          >
            <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Workflow"}
          </button>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-lg border text-xs font-semibold flex items-center gap-2 ${
              message.type === "success"
                ? "bg-semantic-success-bg text-semantic-success border-semantic-success-border"
                : "bg-semantic-danger-bg text-semantic-danger border-semantic-danger-border"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-semantic-success shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-semantic-danger shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            Loading project stage configuration...
          </div>
        ) : (
          <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-slate-200 bg-slate-50/50">
                    <th className="py-3 px-4 font-bold text-slate-700 w-12 text-center">#</th>
                    <th className="py-3 px-4 font-bold text-slate-700">Official Stage Name</th>
                    <th className="py-3 px-4 font-bold text-slate-700 w-36">Duration (Days)</th>
                    <th className="py-3 px-4 font-bold text-slate-700 w-44">Stage Owner Role</th>
                    <th className="py-3 px-4 font-bold text-slate-700 w-36 text-center">Payment Milestone</th>
                    <th className="py-3 px-4 font-bold text-slate-700">Completion Requirement</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {stages.map((stage, idx) => (
                    <tr key={stage.order} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 text-center font-mono font-bold text-slate-400">{stage.order}</td>
                      <td className="py-3 px-4 font-bold text-slate-900">{stage.name}</td>
                      <td className="py-3 px-4">
                        <input
                          type="number"
                          min={0}
                          value={stage.durationDays}
                          onChange={(e) => handleStageChange(idx, "durationDays", parseInt(e.target.value, 10) || 0)}
                          className="w-24 px-2 py-1 text-xs border border-slate-300 rounded focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                        />
                      </td>
                      <td className="py-3 px-4">
                        <select
                          value={stage.ownerRole}
                          onChange={(e) => handleStageChange(idx, "ownerRole", e.target.value)}
                          className="w-full px-2 py-1 text-xs border border-slate-300 rounded bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                        >
                          <option value="SALES">SALES</option>
                          <option value="DESIGN">DESIGN</option>
                          <option value="PROJECT_MANAGER">PROJECT MANAGER</option>
                          <option value="PROCUREMENT">PROCUREMENT</option>
                          <option value="QUALITY">QUALITY</option>
                          <option value="LEADERSHIP">LEADERSHIP</option>
                        </select>
                      </td>
                      <td className="py-3 px-4 text-center">
                        <input
                          type="checkbox"
                          checked={stage.paymentMilestone}
                          onChange={(e) => handleStageChange(idx, "paymentMilestone", e.target.checked)}
                          className="w-4 h-4 text-emerald-600 rounded border-slate-300 focus:ring-emerald-500"
                        />
                      </td>
                      <td className="py-3 px-4 text-slate-600 italic text-[11px]">
                        {stage.completionReq || <span className="text-slate-300">None</span>}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
