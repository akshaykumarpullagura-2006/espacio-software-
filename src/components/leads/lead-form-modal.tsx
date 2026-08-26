"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { AlertTriangle } from "lucide-react";

interface LeadFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const LeadFormModal: React.FC<LeadFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [formData, setFormData] = useState({
    clientName: "",
    phone: "",
    email: "",
    alternatePhone: "",
    propertyType: "",
    propertyLocation: "",
    propertySize: "",
    budget: "",
    source: "",
    priority: "MEDIUM",
    assignedToId: "",
    tags: "",
    notes: "",
  });

  const [customFieldValues, setCustomFieldValues] = useState<Record<string, string>>({});

  // Dynamic configuration options from API
  const [leadSources, setLeadSources] = useState<any[]>([]);
  const [propertyTypes, setPropertyTypes] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [customFields, setCustomFields] = useState<any[]>([]);
  const [isConfigLoading, setIsConfigLoading] = useState(true);

  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  // Fetch dynamic CRM configuration from backend API
  useEffect(() => {
    if (!isOpen) return;
    const fetchCrmConfig = async () => {
      setIsConfigLoading(true);
      try {
        const res = await fetch("/api/v1/config/crm");
        const json = await res.json();
        if (json.success) {
          const { leadSources: sources, propertyTypes: props, users: uList, customFields: cFields } = json.data;
          setLeadSources(sources || []);
          setPropertyTypes(props || []);
          setUsers(uList || []);
          setCustomFields(cFields || []);

          // Set default select values from DB
          setFormData((prev) => ({
            ...prev,
            source: prev.source || (sources && sources[0]?.key) || "WEBSITE",
            propertyType: prev.propertyType || (props && props[0]?.key) || "RESIDENTIAL",
          }));
        }
      } catch {
        // quiet handling
      } finally {
        setIsConfigLoading(false);
      }
    };

    fetchCrmConfig();
  }, [isOpen]);

  // Live duplicate check
  useEffect(() => {
    if (!formData.phone || formData.phone.length < 10) {
      setDuplicateWarning(null);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const res = await fetch("/api/v1/leads/check-duplicates", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            phone: formData.phone,
            email: formData.email,
            clientName: formData.clientName,
            propertyLocation: formData.propertyLocation,
          }),
        });
        const json = await res.json();
        if (json.success && json.data.isDuplicate) {
          setDuplicateWarning(json.data);
        } else {
          setDuplicateWarning(null);
        }
      } catch {
        // quiet handling
      }
    }, 400);

    return () => clearTimeout(timer);
  }, [formData.phone, formData.email, formData.clientName, formData.propertyLocation]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setIsLoading(true);

    try {
      const payload = {
        ...formData,
        budget: formData.budget ? parseFloat(formData.budget) : undefined,
        customFields: customFieldValues,
      };

      const res = await fetch("/api/v1/leads", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        setError(json.error?.message || "Failed to create lead");
        return;
      }

      onSuccess();
      onClose();
    } catch {
      setError("An unexpected network error occurred.");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Add New Lead" description="Register a new prospective client inquiry" maxWidth="lg">
      <form onSubmit={handleSubmit} className="space-y-5 select-none">
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        {/* Duplicate Lead Alert Banner */}
        {duplicateWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-900 space-y-1">
            <div className="flex items-center gap-2 font-semibold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              Possible Duplicate Lead Found ({duplicateWarning.score}% Match Confidence)
            </div>
            <ul className="list-disc pl-5 text-[11px] text-amber-800 space-y-0.5">
              {duplicateWarning.matchSignals.map((sig: string, idx: number) => (
                <li key={idx}>{sig}</li>
              ))}
            </ul>
            <div className="pt-1 text-[11px] text-amber-700 font-medium">
              Matches existing Lead <span className="font-mono font-bold">{duplicateWarning.matches[0]?.referenceNo}</span> ({duplicateWarning.matches[0]?.clientName}). You may still proceed if this is a legitimate new inquiry.
            </div>
          </div>
        )}

        {/* SECTION A — CUSTOMER */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
            Section A — Customer Details
          </h4>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Customer Name *"
              placeholder="e.g. Vikram Sharma"
              value={formData.clientName}
              onChange={(e) => setFormData({ ...formData, clientName: e.target.value })}
              required
            />
            <Input
              label="Primary Phone *"
              placeholder="+91 99887 76655"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Input
              label="Email Address"
              type="email"
              placeholder="vikram@example.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
            />
            <Input
              label="Alternate Phone"
              placeholder="+91 98765 43210"
              value={formData.alternatePhone}
              onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
            />
          </div>
        </div>

        {/* SECTION B — PROPERTY */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
            Section B — Property Information
          </h4>
          <div className="grid grid-cols-3 gap-3">
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Property Type</label>
              <select
                value={formData.propertyType}
                onChange={(e) => setFormData({ ...formData, propertyType: e.target.value })}
                className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {propertyTypes.map((pt) => (
                  <option key={pt.id || pt.key} value={pt.key}>
                    {pt.name}
                  </option>
                ))}
              </select>
            </div>
            <Input
              label="Property Location"
              placeholder="Jubilee Hills, Hyderabad"
              value={formData.propertyLocation}
              onChange={(e) => setFormData({ ...formData, propertyLocation: e.target.value })}
            />
            <Input
              label="Property Size / Area"
              placeholder="3,500 sq.ft (4BHK)"
              value={formData.propertySize}
              onChange={(e) => setFormData({ ...formData, propertySize: e.target.value })}
            />
          </div>
        </div>

        {/* SECTION C & D — COMMERCIAL & OWNERSHIP */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
            Section C & D — Commercial, Priority & Ownership
          </h4>
          <div className="grid grid-cols-4 gap-3">
            <Input
              label="Estimated Budget (₹)"
              type="number"
              placeholder="3500000"
              value={formData.budget}
              onChange={(e) => setFormData({ ...formData, budget: e.target.value })}
            />
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Lead Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 font-medium"
              >
                <option value="LOW">Low</option>
                <option value="MEDIUM">Medium</option>
                <option value="HIGH">High</option>
                <option value="URGENT">Urgent</option>
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Lead Source</label>
              <select
                value={formData.source}
                onChange={(e) => setFormData({ ...formData, source: e.target.value })}
                className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                {leadSources.map((s) => (
                  <option key={s.id || s.key} value={s.key}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div className="flex flex-col gap-1.5">
              <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Assigned Owner</label>
              <select
                value={formData.assignedToId}
                onChange={(e) => setFormData({ ...formData, assignedToId: e.target.value })}
                className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
              >
                <option value="">-- Unassigned --</option>
                {users.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.fullName}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* DYNAMIC CUSTOM FIELDS SECTION */}
        {customFields.length > 0 && (
          <div className="space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
              Custom Attributes
            </h4>
            <div className="grid grid-cols-2 gap-3">
              {customFields.map((cf) => {
                const options = cf.options ? JSON.parse(cf.options) : [];
                return (
                  <div key={cf.id} className="flex flex-col gap-1.5">
                    <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                      {cf.fieldName} {cf.isRequired && "*"}
                    </label>
                    {cf.fieldType === "DROPDOWN" ? (
                      <select
                        value={customFieldValues[cf.fieldKey] || ""}
                        onChange={(e) => setCustomFieldValues({ ...customFieldValues, [cf.fieldKey]: e.target.value })}
                        className="h-9 px-3 text-xs bg-white border border-slate-200 rounded-md"
                      >
                        <option value="">-- Select --</option>
                        {options.map((opt: string) => (
                          <option key={opt} value={opt}>
                            {opt}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <Input
                        placeholder={cf.fieldName}
                        value={customFieldValues[cf.fieldKey] || ""}
                        onChange={(e) => setCustomFieldValues({ ...customFieldValues, [cf.fieldKey]: e.target.value })}
                      />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* SECTION E — NOTES & TAGS */}
        <div className="space-y-3">
          <h4 className="text-xs font-bold uppercase tracking-wider text-slate-500 border-b border-slate-100 pb-1">
            Section E — Notes & Tags
          </h4>
          <Input
            label="Tags (Comma-separated)"
            placeholder="Luxury, Modern, 4BHK"
            value={formData.tags}
            onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
          />
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-semibold text-slate-700 uppercase tracking-wider">Initial Requirements / Notes</label>
            <textarea
              rows={3}
              placeholder="Client requirement details..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="p-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>
        </div>

        <div className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
          <Button type="button" variant="outline" onClick={onClose} disabled={isLoading}>
            Cancel
          </Button>
          <Button type="submit" variant="primary" isLoading={isLoading}>
            Register Lead
          </Button>
        </div>
      </form>
    </Modal>
  );
};
