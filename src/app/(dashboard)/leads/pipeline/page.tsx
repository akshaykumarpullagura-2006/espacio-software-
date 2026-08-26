"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { LeadWorkspace } from "@/components/leads/lead-workspace";
import { Table, MapPin, Clock, Compass } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

export default function PipelineBoardPage() {
  const [leads, setLeads] = useState<any[]>([]);
  const [pipelineStages, setPipelineStages] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedLeadId, setSelectedLeadId] = useState<string | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  const fetchLeadsAndStages = async () => {
    setIsLoading(true);
    try {
      const [leadsRes, configRes] = await Promise.all([
        fetch("/api/v1/leads?limit=100"),
        fetch("/api/v1/config/crm"),
      ]);

      const leadsJson = await leadsRes.json();
      const configJson = await configRes.json();

      if (leadsJson.success) setLeads(leadsJson.data);
      if (configJson.success) setPipelineStages(configJson.data.pipelineStages || []);
    } catch {
      // quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLeadsAndStages();
  }, []);

  const getLeadsByStage = (systemKey: string) => {
    return leads.filter((l) => l.stage === systemKey || l.status === systemKey);
  };

  const handleCardClick = (id: string) => {
    setSelectedLeadId(id);
    setIsWorkspaceOpen(true);
  };

  const getPriorityBadgeClass = (p?: string) => {
    switch (p) {
      case "URGENT":
        return "bg-rose-50 text-rose-700 border-rose-200";
      case "HIGH":
        return "bg-amber-50 text-amber-700 border-amber-200";
      case "MEDIUM":
        return "bg-blue-50 text-blue-700 border-blue-200";
      default:
        return "bg-slate-50 text-slate-700 border-slate-200";
    }
  };

  return (
    <div className="space-y-4 max-w-[1700px] mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Lead Pipeline Board</h1>
          <p className="text-xs text-slate-500 mt-0.5">Visual Kanban tracking of client inquiries across all 10 qualification stages</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/leads">
            <Button variant="outline" size="sm" leftIcon={<Table className="w-3.5 h-3.5" />}>
              Database Table
            </Button>
          </Link>
        </div>
      </div>

      {/* Dynamic Stage Board */}
      <div className="flex gap-3 overflow-x-auto pb-6 pt-1 items-start min-h-[75vh]">
        {pipelineStages.map((stage) => {
          const stageLeads = getLeadsByStage(stage.systemKey);
          const stageTotalValue = stageLeads.reduce((sum, l) => sum + (l.estimatedBudget || l.budget || 0), 0);

          return (
            <div
              key={stage.id || stage.systemKey}
              className="w-72 shrink-0 bg-slate-100/80 border border-slate-200 rounded-lg p-2.5 flex flex-col max-h-[78vh]"
            >
              {/* Stage Header */}
              <div className="px-2 py-1.5 flex items-center justify-between border-b border-slate-200/80 mb-2 shrink-0">
                <div>
                  <span className="text-[11px] font-bold uppercase tracking-wider text-slate-800 truncate block">
                    {stage.name || stage.displayName}
                  </span>
                  {stageTotalValue > 0 && (
                    <span className="text-[10px] text-slate-500 font-mono font-medium">
                      {formatCurrency(stageTotalValue)}
                    </span>
                  )}
                </div>
                <span className="px-2 py-0.5 bg-white text-slate-700 rounded border border-slate-200 text-[11px] font-bold font-mono">
                  {stageLeads.length}
                </span>
              </div>

              {/* Column Lead Cards Container */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {isLoading ? (
                  <div className="py-6 text-center text-[11px] text-slate-400">Loading stage...</div>
                ) : stageLeads.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-slate-400 border border-dashed border-slate-200 rounded bg-white/40">
                    No leads in stage
                  </div>
                ) : (
                  stageLeads.map((lead) => (
                    <div
                      key={lead.id}
                      onClick={() => handleCardClick(lead.id)}
                      className="p-3 bg-white border border-slate-200 rounded-md shadow-xs hover:border-slate-300 hover:shadow-md transition-all cursor-pointer space-y-2"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-slate-900">{lead.referenceNo}</span>
                        <span className={`text-[9px] font-bold px-1.5 py-0.2 rounded border uppercase ${getPriorityBadgeClass(lead.priority)}`}>
                          {lead.priority || "MEDIUM"}
                        </span>
                      </div>

                      <h4 className="text-xs font-semibold text-slate-900 leading-tight">{lead.clientName}</h4>

                      {(lead.location || lead.propertyLocation) && (
                        <p className="text-[11px] text-slate-500 flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                          <span className="truncate">{lead.location || lead.propertyLocation}</span>
                        </p>
                      )}

                      {lead.nextFollowUp && (
                        <div className="flex items-center gap-1 text-[10px] text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 font-medium">
                          <Clock className="w-2.5 h-2.5 text-indigo-500 shrink-0" />
                          <span className="truncate">Follow-up: {formatDate(lead.nextFollowUp.followUpDate)}</span>
                        </div>
                      )}

                      {lead.nextSiteVisit && (
                        <div className="flex items-center gap-1 text-[10px] text-purple-700 bg-purple-50 px-1.5 py-0.5 rounded border border-purple-100 font-medium">
                          <Compass className="w-2.5 h-2.5 text-purple-500 shrink-0" />
                          <span className="truncate">Site Visit: {formatDate(lead.nextSiteVisit.visitDate)}</span>
                        </div>
                      )}

                      <div className="pt-1.5 border-t border-slate-100 flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-slate-900">
                          {lead.estimatedBudget || lead.budget ? formatCurrency(lead.estimatedBudget || lead.budget) : "TBD"}
                        </span>
                        <span className="text-slate-500 text-[10px] truncate max-w-[110px]">
                          {lead.assignedTo?.fullName || "Unassigned"}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Lead Workspace Drawer */}
      <LeadWorkspace
        leadId={selectedLeadId}
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        onUpdate={fetchLeadsAndStages}
      />
    </div>
  );
}
