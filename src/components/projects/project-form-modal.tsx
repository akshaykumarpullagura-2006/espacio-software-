"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { X, Building2, MapPin, Calendar, DollarSign, UserCheck, AlertCircle } from "lucide-react";
import { PROJECT_PRIORITIES, PROJECT_STATUSES } from "@/validators/project.schema";

interface ProjectFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: (project: any) => void;
  initialData?: any;
}

export const ProjectFormModal: React.FC<ProjectFormModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
  initialData,
}) => {
  const isEdit = Boolean(initialData?.id);

  const [formData, setFormData] = useState({
    title: "",
    clientId: "",
    propertyTypeKey: "APARTMENT_INTERIOR",
    totalBudget: 0,
    startDate: new Date().toISOString().split("T")[0],
    targetCompletionDate: "",
    priority: "MEDIUM",
    status: "ACTIVE",
    siteAddress: "",
    city: "Hyderabad",
    state: "Telangana",
    postalCode: "",
    notes: "",
  });

  const [clients, setClients] = useState<any[]>([]);
  const [employees, setEmployees] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      if (initialData) {
        setFormData({
          title: initialData.title || "",
          clientId: initialData.clientId || initialData.client?.id || "",
          propertyTypeKey: initialData.propertyTypeKey || "APARTMENT_INTERIOR",
          totalBudget: initialData.contractValue || initialData.revisedBudget || initialData.totalBudget || 0,
          startDate: initialData.startDate ? new Date(initialData.startDate).toISOString().split("T")[0] : new Date().toISOString().split("T")[0],
          targetCompletionDate: initialData.targetCompletionDate ? new Date(initialData.targetCompletionDate).toISOString().split("T")[0] : "",
          priority: initialData.priority || "MEDIUM",
          status: initialData.status || "ACTIVE",
          siteAddress: initialData.siteAddress || "",
          city: initialData.city || "Hyderabad",
          state: initialData.state || "Telangana",
          postalCode: initialData.postalCode || "",
          notes: initialData.notes || "",
        });
      } else {
        setFormData({
          title: "",
          clientId: "",
          propertyTypeKey: "APARTMENT_INTERIOR",
          totalBudget: 0,
          startDate: new Date().toISOString().split("T")[0],
          targetCompletionDate: "",
          priority: "MEDIUM",
          status: "ACTIVE",
          siteAddress: "",
          city: "Hyderabad",
          state: "Telangana",
          postalCode: "",
          notes: "",
        });
      }
      loadDependencies();
    }
  }, [isOpen, initialData]);

  const loadDependencies = async () => {
    try {
      const [clientsRes] = await Promise.all([
        fetch("/api/v1/clients?limit=100"),
      ]);
      const clientsJson = await clientsRes.json();
      if (clientsJson.success) setClients(clientsJson.data);
    } catch {
      // quiet fallback
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");

    try {
      const url = isEdit ? `/api/v1/projects/${initialData.id}` : "/api/v1/projects";
      const method = isEdit ? "PATCH" : "POST";

      const payload = {
        ...formData,
        totalBudget: Number(formData.totalBudget) || 0,
        contractValue: Number(formData.totalBudget) || 0,
      };

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (json.success) {
        onSuccess(json.data);
        onClose();
      } else {
        setError(json.error?.message || "Failed to save project");
      }
    } catch {
      setError("Network error submitting project details");
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in duration-200">
      <div className="bg-white border border-slate-200 rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Building2 className="w-5 h-5 text-emerald-600" />
            <div>
              <h2 className="text-sm font-bold text-slate-900">
                {isEdit ? `Edit Project: ${initialData.referenceNo}` : "Create New Project"}
              </h2>
              <p className="text-[11px] text-slate-500">
                {isEdit ? "Update project execution details and timeline" : "Initialize a new project record"}
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto p-6 space-y-4">
          {error && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg flex items-center gap-2 text-rose-700 text-xs">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Project Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Project Title <span className="text-rose-500">*</span>
            </label>
            <Input
              required
              placeholder="e.g. Luxury 4BHK Villa - Indiranagar"
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
            />
          </div>

          {/* Client & Property Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client <span className="text-rose-500">*</span>
              </label>
              <select
                required
                disabled={isEdit}
                value={formData.clientId}
                onChange={(e) => setFormData({ ...formData, clientId: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900 disabled:bg-slate-100"
              >
                <option value="">Select Client</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.fullName} ({c.phone})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Property Type</label>
              <select
                value={formData.propertyTypeKey}
                onChange={(e) => setFormData({ ...formData, propertyTypeKey: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              >
                <option value="APARTMENT_INTERIOR">Apartment Interior</option>
                <option value="VILLA_INTERIOR">Villa / Independent House</option>
                <option value="COMMERCIAL_OFFICE">Commercial Office</option>
                <option value="RENOVATION">Renovation & Remodel</option>
              </select>
            </div>
          </div>

          {/* Contract Value & Priority */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Contract Value / Budget (₹) <span className="text-rose-500">*</span>
              </label>
              <div className="relative">
                <DollarSign className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="number"
                  required
                  min="0"
                  placeholder="0.00"
                  className="pl-8 tabular-nums font-semibold"
                  value={formData.totalBudget || ""}
                  onChange={(e) => setFormData({ ...formData, totalBudget: parseFloat(e.target.value) || 0 })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Priority</label>
              <select
                value={formData.priority}
                onChange={(e) => setFormData({ ...formData, priority: e.target.value })}
                className="w-full h-9 px-3 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              >
                {PROJECT_PRIORITIES.map((p) => (
                  <option key={p} value={p}>
                    {p}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Start Date & Target Completion Date */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Start Date</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="date"
                  className="pl-8"
                  value={formData.startDate}
                  onChange={(e) => setFormData({ ...formData, startDate: e.target.value })}
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Target Completion Date</label>
              <div className="relative">
                <Calendar className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <Input
                  type="date"
                  className="pl-8"
                  value={formData.targetCompletionDate}
                  onChange={(e) => setFormData({ ...formData, targetCompletionDate: e.target.value })}
                />
              </div>
            </div>
          </div>

          {/* Site Address */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Site Address</label>
            <div className="relative">
              <MapPin className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-3" />
              <textarea
                rows={2}
                placeholder="Flat / House No, Street, Landmark, Area..."
                value={formData.siteAddress}
                onChange={(e) => setFormData({ ...formData, siteAddress: e.target.value })}
                className="w-full pl-8 pr-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
              />
            </div>
          </div>

          {/* City & State */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">City</label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">State</label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-[11px] font-semibold text-slate-700 mb-1">Postal Code</label>
              <Input
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
              />
            </div>
          </div>

          {/* Internal Notes */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Internal Execution Notes</label>
            <textarea
              rows={2}
              placeholder="Special instructions, site access notes, key client preferences..."
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500 text-slate-900"
            />
          </div>

          {/* Footer */}
          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button type="button" variant="outline" size="sm" onClick={onClose} disabled={isLoading}>
              Cancel
            </Button>
            <Button type="submit" size="sm" disabled={isLoading}>
              {isLoading ? "Saving..." : isEdit ? "Update Project" : "Create Project"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};
