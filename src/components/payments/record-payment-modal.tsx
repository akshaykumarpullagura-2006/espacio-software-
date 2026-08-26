"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, AlertTriangle, CheckCircle2 } from "lucide-react";
import { formatCurrency } from "@/lib/utils";

interface RecordPaymentModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProjectId?: string;
  initialClientId?: string;
}

export const RecordPaymentModal: React.FC<RecordPaymentModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProjectId,
  initialClientId,
}) => {
  const [projects, setProjects] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");
  const [selectedClientId, setSelectedClientId] = useState(initialClientId || "");
  const [selectedMilestoneId, setSelectedMilestoneId] = useState("");

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
  }, [initialProjectId, initialClientId]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/v1/config/payments");
      const json = await res.json();
      if (json.success && json.data.paymentMethods) {
        setPaymentMethods(json.data.paymentMethods);
      }
    } catch {
      // quiet handling
    }
  };

  const fetchProjects = async () => {
    try {
      const res = await fetch("/api/v1/projects?limit=100");
      const json = await res.json();
      if (json.success) setProjects(json.data);
    } catch {
      // quiet handling
    }
  };

  const fetchProjectDetails = async (projId: string) => {
    if (!projId) return;
    setIsLoadingFinancials(true);
    setError("");
    try {
      const res = await fetch(`/api/v1/projects/${projId}`);
      const json = await res.json();
      if (json.success) {
        setProjectMilestones(json.data.project.milestones || []);
        setSelectedClientId(json.data.project.clientId);

        // Calculate project financials
        const totalBudget = json.data.project.revisedBudget || json.data.project.totalBudget || 0;
        const verifiedPaid = (json.data.project.payments || [])
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
      // quiet handling
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
  const isOverpaying = financials && enteredAmount > financials.remaining;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedProjectId || !amount) {
      setError("Please specify a project and valid amount.");
      return;
    }

    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/v1/finance/payments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: selectedProjectId,
          clientId: selectedClientId || undefined,
          milestoneId: selectedMilestoneId || undefined,
          amount: parseFloat(amount),
          paymentDate,
          paymentMethod,
          externalReference: externalReference || undefined,
          notes: notes || undefined,
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
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs select-none">
      <div className="bg-offwhite rounded-xl shadow-2xl border border-walnut/20 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Modal Header */}
        <div className="px-6 py-4 bg-cream/70 border-b border-walnut/15 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-charcoal">Record Client Payment</h3>
            <p className="text-xs text-walnut mt-0.5">Authoritative financial collection ledger entry</p>
          </div>
          <button onClick={onClose} className="p-1 text-walnut hover:text-charcoal rounded cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {error && (
          <div className="mx-6 mt-4 p-3 bg-semantic-danger-bg border border-semantic-danger-border rounded-md text-xs text-semantic-danger font-semibold flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-semantic-danger" />
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {/* Project Selection */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-walnut uppercase tracking-wider">Target Project *</label>
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="h-9 px-3 text-xs bg-cream/40 border border-walnut/20 rounded-md font-semibold text-charcoal focus:border-gold focus:outline-none"
              required
            >
              <option value="">Select a Project...</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.referenceNo} — {p.title} ({p.client?.name})
                </option>
              ))}
            </select>
          </div>

          {/* Authoritative Financial Summary Strip */}
          {selectedProjectId && financials && (
            <div className="p-3 bg-cream/50 border border-walnut/15 rounded-lg grid grid-cols-3 gap-2 text-center text-xs">
              <div>
                <span className="text-[10px] uppercase font-bold text-walnut block">Project Value</span>
                <span className="font-mono font-bold text-charcoal">{formatCurrency(financials.totalBudget)}</span>
              </div>
              <div className="border-x border-walnut/15">
                <span className="text-[10px] uppercase font-bold text-semantic-success block">Already Paid</span>
                <span className="font-mono font-bold text-semantic-success">{formatCurrency(financials.verifiedPaid)}</span>
              </div>
              <div>
                <span className="text-[10px] uppercase font-bold text-walnut block">Remaining</span>
                <span className="font-mono font-bold text-charcoal">{formatCurrency(financials.remaining)}</span>
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
              <label className="text-xs font-bold text-walnut uppercase tracking-wider">Payment Method *</label>
              <select
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
                className="h-9 px-3 text-xs bg-cream/40 border border-walnut/20 rounded-md font-semibold text-charcoal focus:border-gold focus:outline-none"
                required
              >
                {paymentMethods.map((pm) => (
                  <option key={pm.key} value={pm.key}>
                    {pm.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {isOverpaying && (
            <div className="p-2.5 bg-semantic-warning-bg border border-semantic-warning-border rounded-md text-[11px] text-semantic-warning flex items-center gap-2 font-semibold">
              <AlertTriangle className="w-4 h-4 text-semantic-warning shrink-0" />
              <span>Warning: Entered amount exceeds remaining project balance of {formatCurrency(financials.remaining)}.</span>
            </div>
          )}

          {/* Milestone Selection (Optional) */}
          {projectMilestones.length > 0 && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-walnut uppercase tracking-wider">Link Payment Milestone (Optional)</label>
              <select
                value={selectedMilestoneId}
                onChange={(e) => setSelectedMilestoneId(e.target.value)}
                className="h-9 px-3 text-xs bg-cream/40 border border-walnut/20 rounded-md text-charcoal focus:border-gold focus:outline-none"
              >
                <option value="">General Project Payment (Unallocated)</option>
                {projectMilestones.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name} — {formatCurrency(m.amount)} (Paid: {formatCurrency(m.paidAmount)})
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
              placeholder="HDFC-N99281 / Cheque #0012"
              value={externalReference}
              onChange={(e) => setExternalReference(e.target.value)}
            />
          </div>

          <Input
            label="Internal Notes"
            placeholder="Advance confirmation fee via IMPS..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-walnut/15">
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
