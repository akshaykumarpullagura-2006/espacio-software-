"use client";

import React, { useState, useEffect } from "react";
import { Modal } from "@/components/ui/modal";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { AlertTriangle, Building, CheckCircle, Mail, MapPin, Phone, ShieldCheck, Tag, User } from "lucide-react";

interface ClientFormModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  client?: any;
}

export function ClientFormModal({
  isOpen,
  onClose,
  onSuccess,
  client,
}: ClientFormModalProps) {
  const isEdit = !!client;

  const [formData, setFormData] = useState({
    fullName: "",
    phone: "",
    alternatePhone: "",
    email: "",
    companyName: "",
    clientType: "INDIVIDUAL",
    status: "ACTIVE",
    address: "",
    city: "",
    state: "",
    postalCode: "",
    country: "India",
    gstin: "",
    pan: "",
    billingAddress: "",
    shippingAddress: "",
    preferredContactMethod: "PHONE",
    tags: "",
    notes: "",
  });

  const [errors, setErrors] = useState<Record<string, string>>({});
  const [duplicateWarning, setDuplicateWarning] = useState<any>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (client) {
      setFormData({
        fullName: client.fullName || "",
        phone: client.phone || "",
        alternatePhone: client.alternatePhone || "",
        email: client.email || "",
        companyName: client.companyName || "",
        clientType: client.clientType || "INDIVIDUAL",
        status: client.status || "ACTIVE",
        address: client.address || "",
        city: client.city || "",
        state: client.state || "",
        postalCode: client.postalCode || "",
        country: client.country || "India",
        gstin: client.gstin || "",
        pan: client.pan || "",
        billingAddress: client.billingAddress || "",
        shippingAddress: client.shippingAddress || "",
        preferredContactMethod: client.preferredContactMethod || "PHONE",
        tags: client.tags || "",
        notes: client.notes || "",
      });
    } else {
      setFormData({
        fullName: "",
        phone: "",
        alternatePhone: "",
        email: "",
        companyName: "",
        clientType: "INDIVIDUAL",
        status: "ACTIVE",
        address: "",
        city: "",
        state: "",
        postalCode: "",
        country: "India",
        gstin: "",
        pan: "",
        billingAddress: "",
        shippingAddress: "",
        preferredContactMethod: "PHONE",
        tags: "",
        notes: "",
      });
    }
    setErrors({});
    setDuplicateWarning(null);
  }, [client, isOpen]);

  // Live duplicate check on phone or email blur
  const checkDuplicates = async () => {
    if (!formData.phone && !formData.email && !formData.gstin) return;
    try {
      const res = await fetch("/api/v1/clients/check-duplicates", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          phone: formData.phone || undefined,
          email: formData.email || undefined,
          gstin: formData.gstin || undefined,
          companyName: formData.companyName || undefined,
          fullName: formData.fullName || undefined,
          excludeId: client?.id,
        }),
      });
      const data = await res.json();
      if (data.success && data.data?.isDuplicate) {
        setDuplicateWarning(data.data);
      } else {
        setDuplicateWarning(null);
      }
    } catch {
      // Non-blocking duplicate check
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrors({});

    // Client-side quick validations
    const errs: Record<string, string> = {};
    if (!formData.fullName.trim()) errs.fullName = "Full name is required";
    if (!formData.phone.trim()) errs.phone = "Phone number is required";
    if (formData.gstin && !/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/.test(formData.gstin.trim())) {
      errs.gstin = "Invalid 15-digit GSTIN format (e.g. 29AAAAA0000A1Z5)";
    }
    if (formData.pan && !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(formData.pan.trim())) {
      errs.pan = "Invalid 10-character PAN format (e.g. ABCDE1234F)";
    }

    if (Object.keys(errs).length > 0) {
      setErrors(errs);
      return;
    }

    setIsSubmitting(true);
    try {
      const url = isEdit ? `/api/v1/clients/${client.id}` : "/api/v1/clients";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.message || "Failed to save client");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrors({ form: err.message || "An unexpected error occurred" });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? `Edit Client: ${client?.fullName}` : "Create New Client"}
      maxWidth="2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && (
          <div className="p-3 bg-rose-50 border border-rose-200 rounded-md text-xs text-rose-700 flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
            <span>{errors.form}</span>
          </div>
        )}

        {duplicateWarning && (
          <div className="p-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-800 space-y-1">
            <div className="flex items-center gap-1.5 font-bold text-amber-900">
              <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
              <span>Possible Existing Client Found ({duplicateWarning.score}% match confidence)</span>
            </div>
            <div className="text-[11px] text-amber-700 pl-5">
              {duplicateWarning.matches.map((m: any) => (
                <div key={m.id} className="py-0.5">
                  <span className="font-semibold">{m.fullName}</span> ({m.referenceNo}) — {m.phone} | {m.matchReason}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Section 1: Basic Information */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-emerald-600" />
            <span>Client Identification</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Full Name <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formData.fullName}
                onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                onBlur={checkDuplicates}
                placeholder="e.g. Vikram Malhotra"
                required
              />
              {errors.fullName && <p className="text-[10px] text-rose-500 mt-0.5">{errors.fullName}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Client Type
              </label>
              <select
                value={formData.clientType}
                onChange={(e) => setFormData({ ...formData, clientType: e.target.value })}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800 font-medium outline-none focus:border-emerald-500"
              >
                <option value="INDIVIDUAL">Individual / Homeowner</option>
                <option value="BUSINESS">Business / Corporate</option>
                <option value="COMMERCIAL">Commercial / Retail</option>
                <option value="RESIDENTIAL">Residential Property</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 2: Contact Information */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Phone className="w-3.5 h-3.5 text-emerald-600" />
            <span>Contact Information</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary Phone <span className="text-rose-500">*</span>
              </label>
              <Input
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                onBlur={checkDuplicates}
                placeholder="e.g. +91 98765 43210"
                required
              />
              {errors.phone && <p className="text-[10px] text-rose-500 mt-0.5">{errors.phone}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Alternate Phone
              </label>
              <Input
                value={formData.alternatePhone}
                onChange={(e) => setFormData({ ...formData, alternatePhone: e.target.value })}
                placeholder="e.g. +91 98111 22233"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Email Address
              </label>
              <Input
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                onBlur={checkDuplicates}
                placeholder="e.g. client@example.com"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Preferred Contact Method
              </label>
              <select
                value={formData.preferredContactMethod}
                onChange={(e) => setFormData({ ...formData, preferredContactMethod: e.target.value })}
                className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800 font-medium outline-none focus:border-emerald-500"
              >
                <option value="PHONE">Phone Call</option>
                <option value="WHATSAPP">WhatsApp</option>
                <option value="EMAIL">Email</option>
              </select>
            </div>
          </div>
        </div>

        {/* Section 3: Business & Tax Details */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <Building className="w-3.5 h-3.5 text-emerald-600" />
            <span>Business & Tax Details (Optional)</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Company / Legal Name
              </label>
              <Input
                value={formData.companyName}
                onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                onBlur={checkDuplicates}
                placeholder="e.g. Acme Realty Pvt Ltd"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                GSTIN
              </label>
              <Input
                value={formData.gstin}
                onChange={(e) => setFormData({ ...formData, gstin: e.target.value.toUpperCase() })}
                onBlur={checkDuplicates}
                placeholder="29AAAAA0000A1Z5"
              />
              {errors.gstin && <p className="text-[10px] text-rose-500 mt-0.5">{errors.gstin}</p>}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                PAN
              </label>
              <Input
                value={formData.pan}
                onChange={(e) => setFormData({ ...formData, pan: e.target.value.toUpperCase() })}
                placeholder="ABCDE1234F"
              />
              {errors.pan && <p className="text-[10px] text-rose-500 mt-0.5">{errors.pan}</p>}
            </div>
          </div>
        </div>

        {/* Section 4: Address Details */}
        <div>
          <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2 flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-emerald-600" />
            <span>Address & Location</span>
          </h4>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="sm:col-span-3">
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Primary / Site Address
              </label>
              <Input
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                placeholder="e.g. Flat 402, Prestige Towers, Indiranagar"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                City
              </label>
              <Input
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                placeholder="e.g. Bangalore"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                State
              </label>
              <Input
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                placeholder="e.g. Karnataka"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Postal Code
              </label>
              <Input
                value={formData.postalCode}
                onChange={(e) => setFormData({ ...formData, postalCode: e.target.value })}
                placeholder="e.g. 560038"
              />
            </div>
          </div>
        </div>

        {/* Section 5: Tags & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Tag className="w-3 h-3 text-slate-500" />
              <span>Tags (comma separated)</span>
            </label>
            <Input
              value={formData.tags}
              onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
              placeholder="e.g. VIP, Luxury, Repeat Client"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Client Status
            </label>
            <select
              value={formData.status}
              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
              className="w-full h-9 px-3 bg-white border border-slate-200 rounded-md text-xs text-slate-800 font-medium outline-none focus:border-emerald-500"
            >
              <option value="ACTIVE">ACTIVE</option>
              <option value="INACTIVE">INACTIVE</option>
              <option value="PROSPECT">PROSPECT</option>
              <option value="CUSTOMER">CUSTOMER</option>
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-200">
          <Button type="button" variant="outline" onClick={onClose} disabled={isSubmitting}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? "Saving..." : isEdit ? "Save Changes" : "Create Client"}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
