"use client";

import React, { useState, useEffect } from "react";

interface CategoryItem {
  key: string;
  name: string;
}

interface PaymentTermItem {
  key: string;
  name: string;
}

interface AddVendorModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function AddVendorModal({ isOpen, onClose, onSuccess }: AddVendorModalProps) {
  const [categories, setCategories] = useState<CategoryItem[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<PaymentTermItem[]>([]);

  // Form State
  const [name, setName] = useState("");
  const [legalName, setLegalName] = useState("");
  const [categoryKey, setCategoryKey] = useState("PLYWOOD");
  const [contactPerson, setContactPerson] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState("");
  const [address, setAddress] = useState("");
  const [city, setCity] = useState("Hyderabad");
  const [state, setState] = useState("Telangana");
  const [postalCode, setPostalCode] = useState("");
  const [gstin, setGstin] = useState("");
  const [pan, setPan] = useState("");
  const [paymentTermsKey, setPaymentTermsKey] = useState("DAYS_30");
  const [creditLimit, setCreditLimit] = useState("500000");
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [notes, setNotes] = useState("");

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVendorConfigs();
    }
  }, [isOpen]);

  async function fetchVendorConfigs() {
    try {
      const res = await fetch("/api/v1/config/vendors");
      if (res.ok) {
        const data = await res.json();
        if (data.data?.categories) setCategories(data.data.categories);
        if (data.data?.paymentTerms) setPaymentTerms(data.data.paymentTerms);
      }
    } catch (e) {
      console.error("Failed to load vendor configs", e);
    }
  }

  if (!isOpen) return null;

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch("/api/v1/procurement/vendors", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          legalName: legalName || undefined,
          categoryKey,
          contactPerson: contactPerson || undefined,
          phone,
          email: email || undefined,
          website: website || undefined,
          address: address || undefined,
          city: city || undefined,
          state: state || undefined,
          postalCode: postalCode || undefined,
          gstin: gstin || undefined,
          pan: pan || undefined,
          paymentTermsKey,
          creditLimit: parseFloat(creditLimit) || 0,
          bankName: bankName || undefined,
          bankAccountNo: bankAccountNo || undefined,
          bankIfsc: bankIfsc || undefined,
          notes: notes || undefined,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to register new vendor");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message || "An unexpected error occurred.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-charcoal/50 backdrop-blur-xs p-4">
      <div className="w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl bg-offwhite border border-walnut/20 shadow-modal">
        <div className="flex items-center justify-between border-b border-walnut/15 px-6 py-4 sticky top-0 bg-cream/90 backdrop-blur-md z-10">
          <div>
            <h2 className="text-base font-bold text-charcoal">Register New Supplier / Vendor</h2>
            <p className="text-xs text-walnut">Create vendor master record (VEN-YYYY-XXXX)</p>
          </div>
          <button
            onClick={onClose}
            className="text-walnut hover:text-charcoal cursor-pointer"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-md border border-semantic-danger-border bg-semantic-danger-bg p-3 text-xs font-semibold text-semantic-danger">
              {error}
            </div>
          )}

          {/* Section 1: Basic Information */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal border-b border-walnut/15 pb-1">
              1. Basic Supplier Information
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  Vendor Name *
                </label>
                <input
                  type="text"
                  placeholder="e.g. Venasai Plywoods"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-medium focus:border-gold focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  Legal Entity Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Venasai Building Products Pvt Ltd"
                  value={legalName}
                  onChange={(e) => setLegalName(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-medium focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  Category *
                </label>
                <select
                  value={categoryKey}
                  onChange={(e) => setCategoryKey(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
                  required
                >
                  {categories.map((c) => (
                    <option key={c.key} value={c.key}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  Primary Contact Person
                </label>
                <input
                  type="text"
                  placeholder="e.g. Ramesh Sharma"
                  value={contactPerson}
                  onChange={(e) => setContactPerson(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-medium focus:border-gold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Contact & Address */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal border-b border-walnut/15 pb-1">
              2. Contact &amp; Address Details
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  Phone Number *
                </label>
                <input
                  type="text"
                  placeholder="+91 98490 11223"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-medium focus:border-gold focus:outline-none"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <input
                  type="email"
                  placeholder="orders@venasai.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-medium focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  City
                </label>
                <input
                  type="text"
                  value={city}
                  onChange={(e) => setCity(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-medium focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  State
                </label>
                <input
                  type="text"
                  value={state}
                  onChange={(e) => setState(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-medium focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  Postal Code
                </label>
                <input
                  type="text"
                  placeholder="500072"
                  value={postalCode}
                  onChange={(e) => setPostalCode(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs font-mono text-charcoal focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Full Street Address
              </label>
              <input
                type="text"
                placeholder="Plot 42, Kukatpally Industrial Area"
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-medium focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          {/* Section 3: Tax & Commercial Terms */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal border-b border-walnut/15 pb-1">
              3. Tax &amp; Commercial Terms
            </h3>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  GSTIN
                </label>
                <input
                  type="text"
                  placeholder="36AAACV1234F1Z9"
                  value={gstin}
                  onChange={(e) => setGstin(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs font-mono uppercase text-charcoal focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  PAN Number
                </label>
                <input
                  type="text"
                  placeholder="AAACV1234F"
                  value={pan}
                  onChange={(e) => setPan(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs font-mono uppercase text-charcoal focus:border-gold focus:outline-none"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  Payment Terms
                </label>
                <select
                  value={paymentTermsKey}
                  onChange={(e) => setPaymentTermsKey(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
                >
                  {paymentTerms.map((pt) => (
                    <option key={pt.key} value={pt.key}>
                      {pt.name}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  Approved Credit Limit (₹)
                </label>
                <input
                  type="number"
                  placeholder="500000"
                  value={creditLimit}
                  onChange={(e) => setCreditLimit(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs font-mono font-bold text-charcoal focus:border-gold focus:outline-none"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Bank Details */}
          <div className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal border-b border-walnut/15 pb-1">
              4. Bank Details (Financial Confidential)
            </h3>
            <div className="grid grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  Bank Name
                </label>
                <input
                  type="text"
                  placeholder="HDFC Bank"
                  value={bankName}
                  onChange={(e) => setBankName(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-medium focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  Account Number
                </label>
                <input
                  type="text"
                  placeholder="50200011223344"
                  value={bankAccountNo}
                  onChange={(e) => setBankAccountNo(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs font-mono text-charcoal focus:border-gold focus:outline-none"
                />
              </div>
              <div>
                <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                  IFSC Code
                </label>
                <input
                  type="text"
                  placeholder="HDFC0000123"
                  value={bankIfsc}
                  onChange={(e) => setBankIfsc(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs font-mono uppercase text-charcoal focus:border-gold focus:outline-none"
                />
              </div>
            </div>
          </div>

          <div className="flex justify-end space-x-3 pt-4 border-t border-walnut/15 sticky bottom-0 bg-offwhite py-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-md border border-walnut/20 px-4 py-2 text-xs font-bold text-walnut hover:bg-cream cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="rounded-md bg-gold px-4 py-2 text-xs font-bold text-charcoal hover:bg-gold-hover shadow-gold disabled:opacity-50 cursor-pointer"
            >
              {loading ? "Registering..." : "Register Vendor"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
