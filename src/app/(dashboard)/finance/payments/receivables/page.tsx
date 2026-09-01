"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { DataTable } from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Search, DollarSign, CheckCircle2, TrendingUp, Users } from "lucide-react";
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
      if (json.success) setClients(json.data || []);
    } catch {
      // quiet error handling
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
    return (
      (c.clientName || "").toLowerCase().includes(q) ||
      (c.clientReferenceNo || "").toLowerCase().includes(q) ||
      (c.phone || "").toLowerCase().includes(q)
    );
  });

  const totalContract = clients.reduce((acc, c) => acc + (c.totalContractValue || 0), 0);
  const totalVerified = clients.reduce((acc, c) => acc + (c.totalVerifiedPaid || 0), 0);
  const totalOutstanding = clients.reduce((acc, c) => acc + (c.totalPendingBalance || 0), 0);

  const columns = [
    {
      header: "Client Ref & Name",
      accessorKey: "clientReferenceNo" as const,
      cell: (row: any) => (
        <div>
          <span className="font-mono text-xs font-bold text-[#4A433D] block">{row.clientReferenceNo}</span>
          <span className="font-semibold text-[#4A433D] leading-tight block">{row.clientName}</span>
          <span className="text-[10px] text-[#6F5642]">{row.phone}</span>
        </div>
      ),
    },
    {
      header: "Active Projects",
      accessorKey: "activeProjectsCount" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="font-semibold text-xs text-[#4A433D]">{row.activeProjectsCount}</span>
      ),
    },
    {
      header: "Total Project Value",
      accessorKey: "totalContractValue" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-mono font-bold text-[#4A433D] text-xs">
          {formatCurrency(row.totalContractValue)}
        </span>
      ),
    },
    {
      header: "Verified Receipts",
      accessorKey: "totalVerifiedPaid" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-mono font-bold text-emerald-700 text-xs">
          {formatCurrency(row.totalVerifiedPaid)}
        </span>
      ),
    },
    {
      header: "Outstanding Balance",
      accessorKey: "totalPendingBalance" as const,
      isNumeric: true,
      cell: (row: any) => (
        <span className="tabular-nums font-mono font-bold text-amber-700 text-xs">
          {formatCurrency(row.totalPendingBalance)}
        </span>
      ),
    },
  ];

  return (
    <div className="space-y-5 max-w-7xl mx-auto select-none">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-[#6F5642]/15">
        <div>
          <h1 className="text-xl font-bold text-[#4A433D] tracking-tight">Client Aggregate Receivables</h1>
          <p className="text-xs text-[#6F5642] mt-0.5">Authoritative client balance summary across active commercial interior projects</p>
        </div>
        <div className="flex items-center gap-2">
          <Link href="/finance/payments">
            <Button variant="outline" size="sm" leftIcon={<ArrowLeft className="w-3.5 h-3.5" />}>
              Back to Payments Ledger
            </Button>
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="p-4 bg-white rounded-xl border border-[#6F5642]/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">Total Value Across Clients</span>
            <div className="text-lg font-bold font-mono text-[#4A433D] tabular-nums mt-0.5">
              {formatCurrency(totalContract)}
            </div>
            <span className="text-[10px] text-[#6F5642]">{clients.length} active client accounts</span>
          </div>
          <div className="p-2.5 bg-[#F6EFE3] rounded-lg text-[#6F5642]">
            <Users className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#6F5642]/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Total Collected Receipts</span>
            <div className="text-lg font-bold font-mono text-emerald-700 tabular-nums mt-0.5">
              {formatCurrency(totalVerified)}
            </div>
            <span className="text-[10px] text-emerald-800 font-medium">Verified in bank ledger</span>
          </div>
          <div className="p-2.5 bg-emerald-50 rounded-lg text-emerald-700">
            <CheckCircle2 className="w-5 h-5" />
          </div>
        </div>

        <div className="p-4 bg-white rounded-xl border border-[#6F5642]/15 shadow-xs flex items-center justify-between">
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">Total Pending Receivables</span>
            <div className="text-lg font-bold font-mono text-amber-700 tabular-nums mt-0.5">
              {formatCurrency(totalOutstanding)}
            </div>
            <span className="text-[10px] text-[#6F5642]">Cumulative uncollected dues</span>
          </div>
          <div className="p-2.5 bg-[#ECF4F0] rounded-lg text-[#6F5642]">
            <TrendingUp className="w-5 h-5" />
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-3 bg-white border border-[#6F5642]/15 rounded-xl shadow-xs flex items-center justify-between gap-3">
        <div className="relative flex-1">
          <Search className="w-3.5 h-3.5 text-[#6F5642] absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Filter by Client Name, Phone, or Reference Number..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full h-8 pl-8 pr-3 text-xs bg-[#F6EFE3]/40 border border-[#6F5642]/20 rounded-md focus:outline-none focus:border-[#F2B455] text-[#4A433D]"
          />
        </div>
      </div>

      {/* Receivables Table */}
      <DataTable
        columns={columns}
        data={filteredClients}
        keyExtractor={(r) => r.clientId}
        isLoading={isLoading}
        emptyText="No client receivables records."
        emptySubtext="Client receivables are calculated dynamically from project commercial values and verified payment receipts."
      />
    </div>
  );
}
