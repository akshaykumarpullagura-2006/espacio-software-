"use client";

import React from "react";
import { FolderGit2, ShieldCheck, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ModuleShellProps {
  moduleName: string;
  moduleCategory: string;
  roadmapStage: string;
  description: string;
  features: string[];
}

export const ModuleShell: React.FC<ModuleShellProps> = ({
  moduleName,
  moduleCategory,
  roadmapStage,
  description,
  features,
}) => {
  return (
    <div className="max-w-5xl mx-auto space-y-6 select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-3 border-b border-walnut/15">
        <div>
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-charcoal bg-gold-soft rounded border border-gold/40">
              {moduleCategory}
            </span>
            <span className="text-xs font-semibold text-walnut font-mono">
              Roadmap Phase: {roadmapStage}
            </span>
          </div>
          <h1 className="text-xl font-bold text-charcoal tracking-tight mt-1">{moduleName}</h1>
          <p className="text-xs text-walnut mt-0.5">{description}</p>
        </div>
      </div>

      {/* Main Card */}
      <div className="bg-offwhite border border-walnut/20 rounded-xl p-8 shadow-subtle space-y-6">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#36302B] text-gold flex items-center justify-center shrink-0 shadow-subtle">
            <FolderGit2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-base font-bold text-charcoal">{moduleName} Subsystem Architecture</h3>
            <p className="text-xs text-walnut mt-1 max-w-2xl leading-relaxed">
              This module is scheduled for implementation in accordance with the ESPACIO ERP Master Roadmap. Database schemas, domain services, RBAC permissions, and API boundaries are registered and ready for activation.
            </p>
          </div>
        </div>

        {/* Feature List */}
        <div className="space-y-3 pt-4 border-t border-walnut/10">
          <h4 className="text-xs font-bold text-walnut uppercase tracking-wider">Planned Subsystem Capabilities</h4>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {features.map((feat, idx) => (
              <div key={idx} className="flex items-center gap-2.5 p-3 bg-cream/50 border border-walnut/15 rounded-lg text-xs font-bold text-charcoal">
                <ShieldCheck className="w-4 h-4 text-gold shrink-0" />
                <span>{feat}</span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
