"use client";

import React, { useState, useEffect } from "react";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { HardDrive, Play, ShieldCheck, AlertTriangle, Clock, RefreshCw, CheckCircle2 } from "lucide-react";
import { formatDate } from "@/lib/utils";

interface BackupStatus {
  offsiteStatus: string;
  lastBackupNo: string;
  lastBackupDate: string | null;
  nextScheduledBackupDate: string;
  totalCount: number;
  failedCount: number;
  lastFileSize: number;
  destination: string;
}

interface BackupItem {
  id: string;
  backupNo: string;
  status: string;
  destination: string;
  fileSize: number;
  startedAt: string;
  completedAt?: string | null;
  errorMessage?: string | null;
}

export default function AutomatedBackupSettingsPage() {
  const [status, setStatus] = useState<BackupStatus | null>(null);
  const [history, setHistory] = useState<BackupItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchBackupData();
  }, []);

  const fetchBackupData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/settings/backup");
      const json = await res.json();
      if (json.success && json.data) {
        setStatus(json.data.status);
        setHistory(json.data.history || []);
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  const handleRunBackup = async () => {
    setIsRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/settings/backup", { method: "POST" });
      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: `Backup snapshot ${json.data.backupNo} created and transferred to off-site storage!` });
        fetchBackupData();
      } else {
        setMessage({ type: "error", text: json.error?.message || "Backup failed" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Backup execution error" });
    } finally {
      setIsRunning(false);
    }
  };

  const handleTestBackup = async () => {
    setIsRunning(true);
    setMessage(null);
    try {
      const res = await fetch("/api/v1/settings/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "TEST_BACKUP" }),
      });
      const json = await res.json();
      if (json.success && json.data.success) {
        setMessage({ type: "success", text: json.data.message });
        fetchBackupData();
      } else {
        setMessage({ type: "error", text: json.data?.message || "Test backup failed" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Test execution error" });
    } finally {
      setIsRunning(false);
    }
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50/50">
      <SettingsSidebar />

      <main className="flex-1 p-6 max-w-5xl space-y-6">
        <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-emerald-600" /> Automated Off-Site Backup
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Single-PC office protection: Automated, encrypted database backups transferred to off-site cloud storage.
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleTestBackup}
              disabled={isRunning}
              className="px-3.5 py-1.5 text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded-lg shadow-2xs transition-colors disabled:opacity-50"
            >
              Test Off-Site Target
            </button>
            <button
              onClick={handleRunBackup}
              disabled={isRunning}
              className="px-3.5 py-1.5 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-charcoal" /> {isRunning ? "Backing Up..." : "Run Immediate Backup"}
            </button>
          </div>
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
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {/* Status Dashboard */}
        {status && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Off-Site Status</span>
              <div className="flex items-center gap-2 pt-1">
                <ShieldCheck className="w-5 h-5 text-emerald-600" />
                <span className="text-sm font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  {status.offsiteStatus}
                </span>
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Last Backup</span>
              <div className="text-xs font-bold text-slate-900 font-mono pt-1">
                {status.lastBackupNo} ({formatBytes(status.lastFileSize)})
              </div>
              <p className="text-[10px] text-slate-500">
                {status.lastBackupDate ? formatDate(status.lastBackupDate) : "No prior backup"}
              </p>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Next Auto Schedule</span>
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-900 pt-1">
                <Clock className="w-4 h-4 text-emerald-600" /> 02:00 AM (Daily)
              </div>
            </div>

            <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs space-y-1">
              <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Storage Destination</span>
              <div className="text-xs font-bold font-mono text-slate-900 pt-1">{status.destination}</div>
            </div>
          </div>
        )}

        {/* Backup History Log Table */}
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="px-5 py-3 border-b border-slate-100 flex items-center justify-between bg-slate-50">
            <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Automated Backup Audit History</h3>
            <button onClick={fetchBackupData} className="p-1 text-slate-400 hover:text-slate-600 rounded">
              <RefreshCw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="py-3 px-4 font-bold text-slate-700">Backup Reference</th>
                  <th className="py-3 px-4 font-bold text-slate-700">Status</th>
                  <th className="py-3 px-4 font-bold text-slate-700">Destination</th>
                  <th className="py-3 px-4 font-bold text-slate-700">Size</th>
                  <th className="py-3 px-4 font-bold text-slate-700">Timestamp</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-400">
                      Loading backup log history...
                    </td>
                  </tr>
                ) : history.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="p-12 text-center text-slate-500">
                      No automated backup logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  history.map((item) => (
                    <tr key={item.id} className="hover:bg-slate-50/70 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-900">{item.backupNo}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded ${
                            item.status === "SUCCESS"
                              ? "bg-emerald-100 text-emerald-800"
                              : "bg-rose-100 text-rose-800"
                          }`}
                        >
                          {item.status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-600 font-mono text-[11px]">{item.destination}</td>
                      <td className="py-3 px-4 text-slate-600 font-mono">{formatBytes(item.fileSize)}</td>
                      <td className="py-3 px-4 text-slate-500">{formatDate(item.startedAt)}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
}
