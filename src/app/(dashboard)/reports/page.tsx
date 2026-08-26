import React from "react";
import { ModuleShell } from "@/components/shell/module-shell";

export default function ReportsPage() {
  return (
    <ModuleShell
      moduleName="Reports & Executive Analytics"
      moduleCategory="Insights Subsystem"
      roadmapStage="Prompt 08 — Financial & Operational Analytics"
      description="P&L reports, project profitability matrices, cash flow statements, and CSV/PDF exports"
      features={[
        "Project Gross Margin & Profitability Reports",
        "CRM Lead Conversion & Pipeline Velocity Metrics",
        "Monthly Financial Collection vs Cost Outflow Reports",
        "Export Engine (CSV, Excel, Formatted PDF)",
      ]}
    />
  );
}
