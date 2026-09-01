"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, AlertTriangle, CheckCircle2, DollarSign } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProjectId?: string;
  initialClientId?: string;
  initialMilestoneId?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProjectId,
  initialClientId,
  initialMilestoneId,
}) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || "");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState(initialMilestoneId || "");

  const [amount, setAmount] = useState("");
  const [paymentDate, setPaymentDate] = useState(new Date().toISOString().split("T")[0]);
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [externalReference, setExternalReference] = useState("");
  const [notes, setNotes] = useState("");

  // Live financial status
  const [financials, setFinancials] = useState<any>(null);
  const [projectMilestones, setProjectMilestones] = useState<any[]>([]);
  const [isLoadingFinancials, setIsLoadingFinancials] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
      fetchProjects();
    }
  }, [isOpen]);

  useEffect(() => {
    if (initialProjectId) setSelectedProjectId(initialProjectId);
    if (initialClientId) setSelectedClientId(initialClientId);
    if (initialMilestoneId) setSelectedMilestoneId(initialMilestoneId);
  }, [initialProjectId, initialClientId, initialMilestoneId]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/v1/config/payments");
      const json = await res.json();
      if (json.success && json.data.paymentMethods) {
        setPaymentMethods(json.data.paymentMethods);
      }
    } catch {
      // quiet error handling
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/v1/projects?limit=100");
      const json = await res.json();
      if (json.success) setProjects(json.data);
    } catch {
      // quiet error handling
    }
  };

  const fetchProjectDetails = async (projId: string) => {
    if (!projId) return;
    setIsLoadingFinancials(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/projects/${projId}`);
      const json = await res.json();
      if (json.success && json.data?.project) {
        const proj = json.data.project;
        setProjectMilestones(proj.paymentMilestones || proj.milestones || []);
        setSelectedClientId(proj.clientId);

        const totalBudget = proj.revisedBudget || proj.contractValue || 0;
        const verifiedPaid = (proj.payments || [])
          .filter((p: any) => p.status === "VERIFIED")
          .reduce((acc: number, p: any) => acc + p.amount, 0);
        const remaining = Math.max(0, totalBudget - verifiedPaid);

        setFinancials({
          totalBudget,
          verifiedPaid,
          remaining,
        });
      }
    } catch {
      // quiet error handling
    } finally {
      setIsLoadingFinancials(false);
    }
  };

  useEffect(() => {
    if (selectedProjectId) {
      fetchProjectDetails(selectedProjectId);
    } else {
      setFinancials(null);
      setProjectMilestones([]);
    }
  }, [selectedProjectId]);

  if (!isOpen) return null;

  const enteredAmount = parseFloat(amount || "0");
  const isOverpaying = financials && enteredAmount > financials.remaining + 0.01;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !amount || enteredAmount <= 0) {
      setError("Please specify a valid project and positive amount.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/v1/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          clientId: selectedClientId || undefined,
          milestoneId: selectedMilestoneId || undefined,
          amount: parseFloat(amount),
          paymentDate,
          paymentMethod,
          externalReference: externalReference.trim() || undefined,
          notes: notes.trim() || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to record payment.");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Network error submitting payment.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A433D]/50 backdrop-blur-xs select-none">
      <div className="bg-[#F6EFE3] rounded-xl shadow-2xl border border-[#6F5642]/20 w-full max-w-lg overflow-hidden animate-fadeIn">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-[#ECF4F0] border-b border-[#6F5642]/15 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-[#4A433D] tracking-tight">Record Client Payment</h3>
            <p className="text-xs text-[#6F5642] mt-0.5">Authoritative financial collection receipt ledger entry</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-[#6F5642] hover:bg-[#6F5642]/10 rounded-lg transition-colors cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-rose-600" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-[#6F5642] uppercase tracking-wider">Target Project *</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-9 px-3 text-xs bg-white border border-[#6F5642]/20 rounded-md font-semibold text-[#4A433D] focus:border-[#F2B455] focus:outline-none"
              required
            >
              <option value="">Select a Project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.referenceNo} — {p.title} ({p.client?.name || p.client?.fullName || "Client"})
                </option>
              ))}
            </select>
          </div>

          {/* Authoritative Financial Summary Strip */}
          {selectedProjectId && financials && (
            <div className="p-3.5 bg-white border border-[#6F5642]/15 rounded-lg grid grid-cols-3 gap-2 text-center text-xs shadow-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6F5642] block">Project Value</span>
                <span className="font-mono font-bold text-[#4A433D] tabular-nums">{formatCurrency(financials.totalBudget)}</span>
              </div>
              <div className="border-x border-[#6F5642]/15">
                <span className="text-[10px] uppercase font-bold text-emerald-700 block">Verified Paid</span>
                <span className="font-mono font-bold text-emerald-700 tabular-nums">{formatCurrency(financials.verifiedPaid)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-[#6F5642] block">Remaining Due</span>
                <span className="font-mono font-bold text-[#4A433D] tabular-nums">{formatCurrency(financials.remaining)}</span>
              </div>
            </div>
          )}

          {/* Amount & Method Grid */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Payment Amount (₹) *"
              type="number"
              placeholder="100000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />

            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#6F5642] uppercase tracking-wider">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="h-9 px-3 text-xs bg-white border border-[#6F5642]/20 rounded-md font-semibold text-[#4A433D] focus:border-[#F2B455] focus:outline-none"
                required
              >
                {paymentMethods.length > 0 ? (
                  paymentMethods.map((pm) => (
                    <option key={pm.key} value={pm.key}>
                      {pm.name}
                    </option>
                  ))
                ) : (
                  <>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                    <option value="UPI">UPI Payment</option>
                    <option value="CHEQUE">Cheque / Demand Draft</option>
                    <option value="CASH">Cash</option>
                    <option value="CREDIT_CARD">Credit / Debit Card</option>
                  </>
                )}
              </select>
            </div>
          </div>

          {isOverpaying && (
            <div className="p-2.5 bg-amber-50 border border-amber-200 rounded-md text-[11px] text-amber-800 flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Warning: Amount exceeds remaining project balance of {formatCurrency(financials.remaining)}.</span>
            </div>
          )}

          {/* Milestone Selection (Optional) */}
          {projectMilestones.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-[#6F5642] uppercase tracking-wider">Link Payment Milestone (Optional)</label>
              <select
                value={selectedMilestoneId}
                onChange={(e) => setSelectedMilestoneId(e.target.value)}
                className="h-9 px-3 text-xs bg-white border border-[#6F5642]/20 rounded-md text-[#4A433D] focus:border-[#F2B455] focus:outline-none font-medium"
              >
                <option value="">General Project Payment (Unallocated)</option>
                {projectMilestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title || m.name} ({m.milestonePct || 0}%) — {formatCurrency(m.amount)} (Paid: {formatCurrency(m.paidAmount || 0)})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Payment Date & External Reference */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Payment Date *"
              type="date"
              value={paymentDate}
              onChange={(e) => setPaymentDate(e.target.value)}
              required
            />
            <Input
              label="Txn Ref / Cheque No"
              placeholder="UTR / Cheque #0012"
              value={externalReference}
              onChange={(e) => setExternalReference(e.target.value)}
            />
          </div>

          <Input
            label="Internal Notes"
            placeholder="Payment notes or clearance reference..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-[#6F5642]/15">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Record Payment
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
