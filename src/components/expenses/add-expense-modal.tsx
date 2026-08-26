"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, AlertTriangle } from "lucide-react";

interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  initialProjectId?: string;
}

export const AddExpenseModal: React.FC<AddExpenseModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialProjectId,
}) => {
  const [expenseType, setExpenseType] = useState<"PROJECT" | "BUSINESS">("PROJECT");
  const [categories, setCategories] = useState<any[]>([]);
  const [paymentMethods, setPaymentMethods] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const [selectedCategoryKey, setSelectedCategoryKey] = useState("");
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId || "");
  const [vendorName, setVendorName] = useState("");
  const [description, setDescription] = useState("");
  const [amount, setAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("BANK_TRANSFER");
  const [expenseDate, setExpenseDate] = useState(new Date().toISOString().split("T")[0]);
  const [referenceNoExternal, setReferenceNoExternal] = useState("");
  const [notes, setNotes] = useState("");

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      fetchCategories(expenseType);
      fetchPaymentMethods();
      fetchProjects();
    }
  }, [isOpen, expenseType]);

  useEffect(() => {
    if (initialProjectId) setSelectedProjectId(initialProjectId);
  }, [initialProjectId]);

  const fetchCategories = async (type: string) => {
    try {
      const res = await fetch(`/api/v1/config/expenses?type=${type}`);
      const json = await res.json();
      if (json.success && json.data.categories) {
        setCategories(json.data.categories);
        if (json.data.categories.length > 0) {
          setSelectedCategoryKey(json.data.categories[0].key);
        }
      }
    } catch {
      // quiet handling
    }
  };

  const fetchPaymentMethods = async () => {
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

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!description || !amount || parseFloat(amount) <= 0) return;
    if (expenseType === "PROJECT" && !selectedProjectId) {
      setError("Project selection is required for Project Expenses.");
      return;
    }
    setIsSubmitting(true);
    setError("");

    try {
      const res = await fetch("/api/v1/finance/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          type: expenseType,
          categoryKey: selectedCategoryKey,
          projectId: expenseType === "PROJECT" ? selectedProjectId : undefined,
          vendorName: vendorName || undefined,
          description,
          amount: parseFloat(amount),
          paymentMethod,
          expenseDate,
          referenceNoExternal: referenceNoExternal || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to record expense.");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("Network error recording expense.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs select-none">
      <div className="bg-offwhite rounded-xl shadow-2xl border border-walnut/20 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in duration-150">
        {/* Header */}
        <div className="px-6 py-4 bg-cream/70 border-b border-walnut/15 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-charcoal">Record Business / Project Expense</h3>
            <p className="text-xs text-walnut mt-0.5">Authoritative financial outgoing ledger entry</p>
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
          {/* Expense Classification Segment */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-bold text-walnut uppercase tracking-wider">Classification *</label>
            <div className="grid grid-cols-2 gap-2 p-1 bg-cream/50 rounded-lg border border-walnut/15">
              <button
                type="button"
                onClick={() => setExpenseType("PROJECT")}
                className={`py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  expenseType === "PROJECT" ? "bg-gold text-charcoal shadow-2xs border border-gold/60" : "text-walnut hover:text-charcoal hover:bg-cream"
                }`}
              >
                Project Expense
              </button>
              <button
                type="button"
                onClick={() => setExpenseType("BUSINESS")}
                className={`py-1.5 text-xs font-bold rounded-md transition-colors cursor-pointer ${
                  expenseType === "BUSINESS" ? "bg-gold text-charcoal shadow-2xs border border-gold/60" : "text-walnut hover:text-charcoal hover:bg-cream"
                }`}
              >
                Business Overhead
              </button>
            </div>
          </div>

          {/* Conditional Project Selection */}
          {expenseType === "PROJECT" && (
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-walnut uppercase tracking-wider">Associated Project *</label>
              <select
                value={selectedProjectId}
                onChange={(e) => setSelectedProjectId(e.target.value)}
                className="h-9 px-3 text-xs bg-cream/40 border border-walnut/20 rounded-md font-semibold text-charcoal focus:border-gold focus:outline-none"
                required
              >
                <option value="">Select Project...</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.referenceNo} — {p.title} ({p.client?.name})
                  </option>
                ))}
              </select>
            </div>
          )}

          {/* Category & Amount Grid */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-bold text-walnut uppercase tracking-wider">Expense Category *</label>
              <select
                value={selectedCategoryKey}
                onChange={(e) => setSelectedCategoryKey(e.target.value)}
                className="h-9 px-3 text-xs bg-cream/40 border border-walnut/20 rounded-md font-semibold text-charcoal focus:border-gold focus:outline-none"
                required
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <Input
              label="Expense Amount (₹) *"
              type="number"
              placeholder="45000"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              required
            />
          </div>

          {/* Description */}
          <Input
            label="Description / Purpose *"
            placeholder="Plywood sheets, site labour payout, office rent..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            required
          />

          {/* Vendor Name & Bill Ref */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Vendor / Supplier Name"
              placeholder="Century Plywood / Ramesh Carpentry"
              value={vendorName}
              onChange={(e) => setVendorName(e.target.value)}
            />
            <Input
              label="Bill / Invoice Number"
              placeholder="INV-9901 / Receipt #012"
              value={referenceNoExternal}
              onChange={(e) => setReferenceNoExternal(e.target.value)}
            />
          </div>

          {/* Date & Payment Method */}
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Expense Date *"
              type="date"
              value={expenseDate}
              onChange={(e) => setExpenseDate(e.target.value)}
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

          <Input
            label="Internal Notes"
            placeholder="Site delivery voucher attached..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />

          {/* Buttons */}
          <div className="flex justify-end gap-2 pt-3 border-t border-walnut/15">
            <Button type="button" variant="outline" size="sm" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" variant="primary" size="sm" isLoading={isSubmitting}>
              Record Expense
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
