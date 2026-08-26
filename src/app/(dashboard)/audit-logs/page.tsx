"use client";

import React, { useState, useEffect } from "react";
import { DataTable } from "@/components/ui/table";
import { Badge } from "@/components/ui/badge";
import { ShieldAlert, RefreshCw } from "lucide-react";
import { formatDate } from "@/lib/utils";

export default function AuditLogsPage() {
  const [auditLogs, setAuditLogs] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/audit-logs");
      const json = await res.json();
      if (json.success && json.data) {
        setAuditLogs(json.data);
      }
    } catch {
      // quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchLogs();
  }, []);

  const columns = [
    {
      header: "Timestamp",
      accessorKey: "createdAt" as const,
      cell: (row: any) => (
        <span className="font-mono text-xs text-slate-500">{formatDate(row.createdAt)}</span>
      ),
    },
    {
      header: "Actor / User",
      accessorKey: "user" as const,
      cell: (row: any) => (
        <div>
          <span className="font-semibold text-slate-900 block">{row.user?.fullName || "System Engine"}</span>
          <span className="text-[10px] text-slate-400 font-mono">{row.user?.email || "N/A"}</span>
        </div>
      ),
    },
    {
      header: "Action Code",
      accessorKey: "action" as const,
      cell: (row: any) => (
        <Badge variant={row.action.includes("SECURITY") ? "danger" : "neutral"}>{row.action}</Badge>
      ),
    },
    {
      header: "Target Entity",
      accessorKey: "entityType" as const,
      cell: (row: any) => (
        <span className="font-mono text-xs text-slate-700 font-semibold">
          {row.entityType}:{row.entityId ? row.entityId.substring(0, 8) : "N/A"}
        </span>
      ),
    },
    {
      header: "IP Address",
      accessorKey: "ipAddress" as const,
      cell: (row: any) => (
        <span className="font-mono text-xs text-slate-500">{row.ipAddress || "127.0.0.1"}</span>
      ),
    },
  ];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200/80">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-emerald-600" />
            System Audit Log
          </h1>
          <p className="text-xs text-slate-500 mt-0.5">Immutable system event ledger capturing authentication and operational data updates</p>
        </div>
        <button
          onClick={fetchLogs}
          disabled={isLoading}
          className="p-2 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-md border border-slate-200 transition-colors cursor-pointer"
          title="Refresh Audit Logs"
        >
          <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
        </button>
      </div>

      <DataTable
        columns={columns}
        data={auditLogs}
        keyExtractor={(r) => r.id}
        emptyText={isLoading ? "Loading system audit logs..." : "No system audit logs recorded yet."}
      />
    </div>
  );
}
