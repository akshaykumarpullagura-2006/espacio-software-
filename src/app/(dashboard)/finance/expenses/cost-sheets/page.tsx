"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ProjectCostSheetsPage() {
  const [costSheets, setCostSheets] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchCostSheets = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/expenses/cost-sheets");
      const json = await res.json();
      if (json.success) setCostSheets(json.data);
    } catch {
      // quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchCostSheets();
  }, []);

  const filteredSheets = costSheets.filter((cs) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      cs.projectTitle.toLowerCase().includes(q) ||
      cs.projectReferenceNo.toLowerCase().includes(q) ||
      cs.clientName.toLowerCase().includes(q)
    );
  });

  const columns = [
    {
      header: "Project ID & Title",
      accessorKey: "projectReferenceNo" as const,
      cell: (row: any) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-900 block">{row.projectReferenceNo}</span>
          <span className="font-semibold text-slate-900 leading-tight block">{row.projectTitle}</span>
          <span className="text-[10px] text-slate-400">{row.clientName}</span>
        </div>
      ),
    },
    {
      header: "Revised Budget",
      accessorKey: "revisedBudget" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-bold text-slate-900 text-xs">
          {formatCurrency(row.revisedBudget)}
        </span>
      ),
    },
    {
      header: "Total Actual Cost",
      accessorKey: "totalCost" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-bold text-slate-900 text-xs">
          {formatCurrency(row.totalCost)}
        </span>
      ),
    },
    {
      header: "Material / Labour",
      accessorKey: "categoryBreakdown" as const,
      cell: (row: any) => (
        <div className="text-[10px] space-y-0.5 font-mono">
          <span className="block text-slate-600">Mat: {formatCurrency(row.categoryBreakdown.material)}</span>
          <span className="block text-slate-600">Lab: {formatCurrency(row.categoryBreakdown.labour)}</span>
        </div>
      ),
    },
    {
      header: "Transport / Fuel / Other",
      accessorKey: "categoryBreakdown" as const,
      cell: (row: any) => (
        <div className="text-[10px] space-y-0.5 font-mono text-slate-500">
          <span className="block">Logistics: {formatCurrency(row.categoryBreakdown.transport + row.categoryBreakdown.fuel)}</span>
          <span className="block">Other: {formatCurrency(row.categoryBreakdown.other + row.categoryBreakdown.siteExpense)}</span>
        </div>
      ),
    },
    {
      header: "Estimated Margin",
      accessorKey: "estimatedMargin" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className={`tabular-nums font-bold text-xs ${row.estimatedMargin >= 0 ? "text-emerald-700" : "text-rose-700"}`}>
          {formatCurrency(row.estimatedMargin)}
        </span>
      ),
    },
    {
      header: "Budget Variance Status",
      accessorKey: "varianceStatus" as const,
      cell: (row: any) => (
        <Badge variant={row.varianceStatus === "OVER_BUDGET" ? "danger" : "completed"}>
          {(row.varianceStatus || "ON_TRACK").replace(/_/g, " ")}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Project Cost Sheets</h1>
          <p className="text-xs text-slate-500 mt-0.5">Operational project expense breakdown & budget variance control</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/finance/expenses">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Expenses Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-subtle flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by Project Title, ID, or Client Name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
        </div>
      </div>

      {/* Cost Sheets Table */}
      <DataTable
        columns={columns}
        data={filteredSheets}
        keyExtractor={(r) => r.projectId}
        isLoading={isLoading}
        emptyText="No project cost sheet data."
        emptySubtext="Project cost sheets are calculated dynamically from approved project expense records."
      />
    </div>
  );
}
