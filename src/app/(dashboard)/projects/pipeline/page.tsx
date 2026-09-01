"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ProjectWorkspace } from "@/components/projects/project-workspace";
import { Table, MapPin } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { PROJECT_STAGES } from "@/validators/project.schema";

export default function ProjectPipelineBoardPage() {
  const [projects, setProjects] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [isWorkspaceOpen, setIsWorkspaceOpen] = useState(false);

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/projects?limit=100");
      const json = await res.json();
      if (json.success) setProjects(json.data);
    } catch {
      // quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchProjects();
  }, []);

  const getProjectsByStage = (stage: string) => {
    return projects.filter((p) => p.stage === stage);
  };

  const handleCardClick = (id: string) => {
    setSelectedProjectId(id);
    setIsWorkspaceOpen(true);
  };

  return (
    <div className="space-y-4 max-w-[1800px] mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-[#6F5642]/20">
        <div>
          <h1 className="text-xl font-bold text-[#4A433D] tracking-tight">Project Pipeline Board</h1>
          <p className="text-xs text-[#6F5642] mt-0.5">Operational 13-stage interior execution workflow board</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/projects">
            <Button variant="outline" size="sm" leftIcon={<Table className="w-3.5 h-3.5" />} className="border-[#6F5642]/30 text-[#4A433D]">
              Database Table
            </Button>
          </Link>
        </div>
      </div>

      {/* 13-Column Horizontal Scroll Board */}
      <div className="flex gap-3 overflow-x-auto pb-6 pt-1 items-start min-h-[70vh]">
        {PROJECT_STAGES.map((stage) => {
          const stageProjects = getProjectsByStage(stage);
          return (
            <div
              key={stage}
              className="w-72 shrink-0 bg-[#ECF4F0] border border-[#6F5642]/20 rounded-xl p-3 flex flex-col max-h-[75vh] shadow-xs"
            >
              {/* Stage Header */}
              <div className="px-2 py-1.5 flex items-center justify-between border-b border-[#6F5642]/10 mb-2 shrink-0">
                <span className="text-[11px] font-bold uppercase tracking-wider text-[#4A433D] font-mono truncate">
                  {stage.replace(/_/g, " ")}
                </span>
                <span className="px-1.5 py-0.5 bg-white text-[#6F5642] rounded border border-[#6F5642]/20 text-[10px] font-bold font-mono">
                  {stageProjects.length}
                </span>
              </div>

              {/* Column Project Cards */}
              <div className="flex-1 overflow-y-auto space-y-2 pr-1">
                {isLoading ? (
                  <div className="py-6 text-center text-[11px] text-[#6F5642]">Loading stage...</div>
                ) : stageProjects.length === 0 ? (
                  <div className="py-8 text-center text-[11px] text-[#6F5642]/60 border border-dashed border-[#6F5642]/20 rounded-lg bg-white/40">
                    No active projects
                  </div>
                ) : (
                  stageProjects.map((proj) => (
                    <div
                      key={proj.id}
                      onClick={() => handleCardClick(proj.id)}
                      className="p-3 bg-white border border-[#6F5642]/20 rounded-lg shadow-xs hover:border-[#F2B455] hover:shadow-md transition-all cursor-pointer space-y-1.5"
                    >
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-[11px] font-bold text-[#6F5642]">{proj.referenceNo}</span>
                        <Badge
                          variant={
                            proj.delayHealth === "DELAYED"
                              ? "danger"
                              : proj.delayHealth === "AT_RISK"
                              ? "pending"
                              : "completed"
                          }
                        >
                          {(proj.delayHealth || "ON_TRACK").replace(/_/g, " ")}
                        </Badge>
                      </div>

                      <h4 className="text-xs font-semibold text-[#4A433D] leading-tight">{proj.title}</h4>

                      {proj.address && (
                        <p className="text-[11px] text-[#6F5642] flex items-center gap-1">
                          <MapPin className="w-3 h-3 text-[#6F5642]/60 shrink-0" />
                          <span className="truncate">{proj.address}</span>
                        </p>
                      )}

                      <div className="pt-1.5 border-t border-[#6F5642]/10 flex items-center justify-between text-[11px]">
                        <span className="font-mono font-bold text-[#4A433D] tabular-nums">
                          {formatCurrency(proj.revisedBudget || proj.totalBudget)}
                        </span>
                        <span className="text-[#6F5642] font-medium truncate max-w-[110px]">
                          {proj.client?.fullName || proj.client?.name || "—"}
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

      {/* Project Workspace Drawer */}
      <ProjectWorkspace
        projectId={selectedProjectId}
        isOpen={isWorkspaceOpen}
        onClose={() => setIsWorkspaceOpen(false)}
        onUpdate={fetchProjects}
      />
    </div>
  );
}
