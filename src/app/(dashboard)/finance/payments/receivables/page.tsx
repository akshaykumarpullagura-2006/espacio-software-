"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

export default function ClientReceivablesPage() {
  const [clients, setClients] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  const fetchReceivables = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/payments/receivables/clients");
      const json = await res.json();
      if (json.success) setClients(json.data);
    } catch {
      // quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchReceivables();
  }, []);

  const filteredClients = clients.filter((c) => {
    if (!search.trim()) return true;
    const q = search.toLowerCase();
    return c.clientName.toLowerCase().includes(q) || c.clientReferenceNo.toLowerCase().includes(q);
  });

  const columns = [
    {
      header: "Client Ref & Name",
      accessorKey: "clientReferenceNo" as const,
      cell: (row: any) => (
        <div>
          <span className="font-mono text-xs font-bold text-slate-900 block">{row.clientReferenceNo}</span>
          <span className="font-semibold text-slate-900 leading-tight block">{row.clientName}</span>
          <span className="text-[10px] text-slate-400">{row.phone}</span>
        </div>
      ),
    },
    {
      header: "Active Commercial Projects",
      accessorKey: "activeProjectsCount" as const,
      isNumeric: true,
      cell: (row: any) => <span className="font-semibold text-xs text-slate-800">{row.activeProjectsCount}</span>,
    },
    {
      header: "Total Revised Contract Value",
      accessorKey: "totalContractValue" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-bold text-slate-900 text-xs">
          {formatCurrency(row.totalContractValue)}
        </span>
      ),
    },
    {
      header: "Total Verified Receipts",
      accessorKey: "totalVerifiedPaid" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-bold text-emerald-700 text-xs">
          {formatCurrency(row.totalVerifiedPaid)}
        </span>
      ),
    },
    {
      header: "Total Pending Receivable",
      accessorKey: "totalPendingBalance" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-bold text-rose-700 text-xs">
          {formatCurrency(row.totalPendingBalance)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Client Aggregate Receivables</h1>
          <p className="text-xs text-slate-500 mt-0.5">Total outstanding client balance summary across active commercial projects</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/finance/payments">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Payments Ledger
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
            placeholder="Filter by Client Name or Reference Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-slate-50 border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
          />
        </div>
      </div>

      {/* Receivables Table */}
      <DataTable
        columns={columns}
        data={filteredClients}
        keyExtractor={(r) => r.clientId}
        isLoading={isLoading}
        emptyText="No client receivables data."
        emptySubtext="Client receivables are calculated dynamically from project commercial values and verified payment receipts."
      />
    </div>
  );
}
