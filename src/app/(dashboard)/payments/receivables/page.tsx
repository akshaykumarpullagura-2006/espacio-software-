"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Table, Search, DollarSign, ArrowLeft } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ClientReceivablesPage() {
  const [receivables, setReceivables] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchReceivables = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/payments/receivables/clients");
      const json = await res.json();
      if (json.success) setReceivables(json.data);
    } catch {
      // quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, []);

  const filteredReceivables = receivables.filter((r) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return (
      r.clientName.toLowerCase().includes(q) ||
      r.clientReferenceNo.toLowerCase().includes(q) ||
      r.phone.includes(q)
    );
  });

  const grandTotalValue = filteredReceivables.reduce((acc, curr) => acc + curr.totalProjectValue, 0);
  const grandTotalPaid = filteredReceivables.reduce((acc, curr) => acc + curr.totalPaid, 0);
  const grandTotalPending = filteredReceivables.reduce((acc, curr) => acc + curr.totalPending, 0);

  const columns = [
    {
      header: "Client ID",
      accessorKey: "clientReferenceNo" as const,
      cell: (row: any) => (
        <span className="font-mono text-xs font-bold text-slate-900">{row.clientReferenceNo}</span>
      ),
    },
    {
      header: "Client Name & Phone",
      accessorKey: "clientName" as const,
      cell: (row: any) => (
        <div>
          <span className="font-semibold text-slate-900 block leading-tight">{row.clientName}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.phone}</span>
        </div>
      ),
    },
    {
      header: "Active Projects",
      accessorKey: "activeProjectsCount" as const,
      cell: (row: any) => (
        <span className="font-mono text-xs font-semibold px-2 py-0.5 bg-slate-100 rounded border">
          {row.activeProjectsCount} Project(s)
        </span>
      ),
    },
    {
      header: "Total Commercial Value",
      accessorKey: "totalProjectValue" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-bold text-slate-900 text-xs">
          {formatCurrency(row.totalProjectValue)}
        </span>
      ),
    },
    {
      header: "Total Verified Paid",
      accessorKey: "totalPaid" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-bold text-emerald-700 text-xs">
          {formatCurrency(row.totalPaid)}
        </span>
      ),
    },
    {
      header: "Total Pending Receivable",
      accessorKey: "totalPending" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className={`tabular-nums font-bold text-xs ${row.totalPending > 0 ? "text-rose-700" : "text-emerald-700"}`}>
          {formatCurrency(row.totalPending)}
        </span>
      ),
    },
    {
      header: "Receivable Status",
      accessorKey: "totalPending" as const,
      cell: (row: any) => (
        <Badge variant={row.totalPending === 0 ? "completed" : "pending"}>
          {row.totalPending === 0 ? "CLEARED" : "OUTSTANDING"}
        </Badge>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Receivables Overview</h1>
          <p className="text-xs text-slate-500 mt-0.5">Total pending client receivable aggregate ledger</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/payments">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Payments Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-subtle space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">Total Commercial Portfolio</span>
          <p className="text-lg font-mono font-bold text-slate-900">{formatCurrency(grandTotalValue)}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-subtle space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600">Total Verified Receipts</span>
          <p className="text-lg font-mono font-bold text-emerald-700">{formatCurrency(grandTotalPaid)}</p>
        </div>
        <div className="p-4 bg-white border border-slate-200 rounded-lg shadow-subtle space-y-1">
          <span className="text-[10px] font-bold uppercase tracking-wider text-rose-600">Total Pending Receivables</span>
          <p className="text-lg font-mono font-bold text-rose-700">{formatCurrency(grandTotalPending)}</p>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-white border border-slate-200 rounded-lg shadow-subtle flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by Client Name, ID, or Phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
        </div>
      </div>

      {/* Client Receivables Table */}
      <DataTable
        columns={columns}
        data={filteredReceivables}
        keyExtractor={(r) => r.clientId}
        isLoading={isLoading}
        emptyText="No client receivables data."
        emptySubtext="Client receivables are calculated dynamically from project contract values and payment receipts."
      />
    </div>
  );
}
