"use client";

import React, { useState, useEffect } from "react";

interface CreatePurchaseOrderModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemRow {
  materialName: string;
  description: string;
  quantity: string;
  unitKey: string;
  rate: string;
  discount: string;
  taxRate: string;
}

export function CreatePurchaseOrderModal({ isOpen, onClose, onSuccess }: CreatePurchaseOrderModalProps) {
  const [vendors, setVendors] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [materialRequests, setMaterialRequests] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [paymentTerms, setPaymentTerms] = useState<any[]>([]);

  const [vendorId, setVendorId] = useState("");
  const [projectId, setProjectId] = useState("");
  const [materialRequestId, setMaterialRequestId] = useState("");
  const [poDate, setPoDate] = useState(new Date().toISOString().split("T")[0]);
  const [expectedDeliveryDate, setExpectedDeliveryDate] = useState(
    new Date(Date.now() + 86400000 * 5).toISOString().split("T")[0]
  );
  const [paymentTermsKey, setPaymentTermsKey] = useState("DAYS_30");
  const [discount, setDiscount] = useState("0");
  const [tax, setTax] = useState("0");
  const [shippingCharges, setShippingCharges] = useState("0");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<ItemRow[]>([
    { materialName: "", description: "", quantity: "10", unitKey: "NOS", rate: "1000", discount: "0", taxRate: "18" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchVendors();
      fetchProjects();
      fetchMaterialRequests();
      fetchConfigs();
    }
  }, [isOpen]);

  async function fetchVendors() {
    try {
      const res = await fetch("/api/v1/procurement/vendors?status=ACTIVE");
      if (res.ok) {
        const data = await res.json();
        setVendors(data.data || []);
        if (data.data && data.data.length > 0) setVendorId(data.data[0].id);
      }
    } catch (e) {
      console.error("Failed to load vendors", e);
    }
  }

  async function fetchProjects() {
    try {
      const res = await fetch("/api/v1/projects");
      if (res.ok) {
        const data = await res.json();
        setProjects(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load projects", e);
    }
  }

  async function fetchMaterialRequests() {
    try {
      const res = await fetch("/api/v1/procurement/material-requests?status=APPROVED");
      if (res.ok) {
        const data = await res.json();
        setMaterialRequests(data.data || []);
      }
    } catch (e) {
      console.error("Failed to load material requests", e);
    }
  }

  async function fetchConfigs() {
    try {
      const [pRes, vRes] = await Promise.all([
        fetch("/api/v1/config/procurement"),
        fetch("/api/v1/config/vendors"),
      ]);
      if (pRes.ok) {
        const pData = await pRes.json();
        if (pData.data?.units) setUnits(pData.data.units);
      }
      if (vRes.ok) {
        const vData = await vRes.json();
        if (vData.data?.paymentTerms) setPaymentTerms(vData.data.paymentTerms);
      }
    } catch (e) {
      console.error("Failed to load configs", e);
    }
  }

  if (!isOpen) return null;

  function handleAddItem() {
    setItems([
      ...items,
      { materialName: "", description: "", quantity: "1", unitKey: "NOS", rate: "1000", discount: "0", taxRate: "18" },
    ]);
  }

  function handleRemoveItem(index: number) {
    if (items.length === 1) return;
    setItems(items.filter((_, i) => i !== index));
  }

  function handleItemChange(index: number, field: keyof ItemRow, value: string) {
    const next = [...items];
    next[index][field] = value;
    setItems(next);
  }

  function formatCurrency(val: number) {
    return `₹${val.toLocaleString("en-IN", { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  // Calculate live PO totals
  const subtotal = items.reduce((acc, i) => {
    const qty = parseFloat(i.quantity) || 0;
    const rate = parseFloat(i.rate) || 0;
    const disc = parseFloat(i.discount) || 0;
    const taxR = parseFloat(i.taxRate) || 0;
    const lineGross = qty * rate - disc;
    const lineTax = (lineGross * taxR) / 100;
    return acc + lineGross + lineTax;
  }, 0);

  const computedGrandTotal =
    subtotal - (parseFloat(discount) || 0) + (parseFloat(tax) || 0) + (parseFloat(shippingCharges) || 0);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      if (!vendorId) throw new Error("Please select a vendor.");

      const payloadItems = items.map((i) => {
        const qty = parseFloat(i.quantity);
        const rate = parseFloat(i.rate);
        if (isNaN(qty) || qty <= 0) throw new Error("Quantity must be greater than 0");
        if (isNaN(rate) || rate < 0) throw new Error("Rate must be valid");

        return {
          materialName: i.materialName,
          description: i.description || undefined,
          quantity: qty,
          unitKey: i.unitKey,
          rate: rate,
          discount: parseFloat(i.discount) || 0,
          taxRate: parseFloat(i.taxRate) || 0,
        };
      });

      const res = await fetch("/api/v1/procurement/purchase-orders", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          vendorId,
          projectId: projectId || undefined,
          materialRequestId: materialRequestId || undefined,
          poDate,
          expectedDeliveryDate: expectedDeliveryDate || undefined,
          paymentTermsKey,
          discount: parseFloat(discount) || 0,
          tax: parseFloat(tax) || 0,
          shippingCharges: parseFloat(shippingCharges) || 0,
          notes: notes || undefined,
          items: payloadItems,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create Purchase Order");
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
      <div className="w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-xl bg-offwhite border border-walnut/20 shadow-modal">
        <div className="flex items-center justify-between border-b border-walnut/15 px-6 py-4 sticky top-0 bg-cream/90 backdrop-blur-md z-10">
          <div>
            <h2 className="text-base font-bold text-charcoal">Issue Purchase Order</h2>
            <p className="text-xs text-walnut">Commercial procurement commitment to supplier (PO-YYYY-XXXX)</p>
          </div>
          <button onClick={onClose} className="text-walnut hover:text-charcoal cursor-pointer">
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {error && (
            <div className="rounded-md border border-semantic-danger-border bg-semantic-danger-bg p-3 text-xs font-semibold text-semantic-danger">
              {error}
            </div>
          )}

          {/* Section 1: Header Information */}
          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Select Supplier / Vendor *
              </label>
              <select
                value={vendorId}
                onChange={(e) => setVendorId(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
                required
              >
                <option value="">Select Vendor...</option>
                {vendors.map((v) => (
                  <option key={v.id} value={v.id}>
                    {v.referenceNo} — {v.name} ({v.categoryKey})
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Link Project (Optional)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                <option value="">General Procurement</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.referenceNo} — {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Link Approved MR (Optional)
              </label>
              <select
                value={materialRequestId}
                onChange={(e) => setMaterialRequestId(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                <option value="">Standalone Purchase Order</option>
                {materialRequests.map((mr) => (
                  <option key={mr.id} value={mr.id}>
                    {mr.referenceNo} ({mr.items?.length || 0} items)
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                PO Date *
              </label>
              <input
                type="date"
                value={poDate}
                onChange={(e) => setPoDate(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Expected Delivery Date
              </label>
              <input
                type="date"
                value={expectedDeliveryDate}
                onChange={(e) => setExpectedDeliveryDate(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
              />
            </div>

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
          </div>

          {/* Section 2: Items Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-walnut/15 pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                Purchase Order Line Items *
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-charcoal hover:text-gold cursor-pointer transition-colors"
              >
                + Add Another Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-md border border-walnut/15 bg-cream/40 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-charcoal">Line Item #{idx + 1}</span>
                    {items.length > 1 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveItem(idx)}
                        className="text-semantic-danger font-semibold cursor-pointer"
                      >
                        Remove
                      </button>
                    )}
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div className="col-span-2">
                      <input
                        type="text"
                        placeholder="Material / Product Name (e.g. Venasai BWP Plywood 19mm)"
                        value={item.materialName}
                        onChange={(e) => handleItemChange(idx, "materialName", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 text-charcoal focus:border-gold focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Specs / Grade"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 text-charcoal focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-5 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-walnut uppercase">Qty *</label>
                      <input
                        type="number"
                        placeholder="10"
                        value={item.quantity}
                        onChange={(e) => handleItemChange(idx, "quantity", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 font-mono text-charcoal focus:border-gold focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-walnut uppercase">Unit</label>
                      <select
                        value={item.unitKey}
                        onChange={(e) => handleItemChange(idx, "unitKey", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 text-charcoal focus:border-gold focus:outline-none font-semibold"
                      >
                        {units.map((u) => (
                          <option key={u.key} value={u.key}>
                            {u.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-walnut uppercase">Rate (₹) *</label>
                      <input
                        type="number"
                        placeholder="2400"
                        value={item.rate}
                        onChange={(e) => handleItemChange(idx, "rate", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 font-mono text-charcoal focus:border-gold focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-walnut uppercase">Discount (₹)</label>
                      <input
                        type="number"
                        placeholder="0"
                        value={item.discount}
                        onChange={(e) => handleItemChange(idx, "discount", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 font-mono text-charcoal focus:border-gold focus:outline-none"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-walnut uppercase">GST %</label>
                      <input
                        type="number"
                        placeholder="18"
                        value={item.taxRate}
                        onChange={(e) => handleItemChange(idx, "taxRate", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 font-mono text-charcoal focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Section 3: Summary Totals */}
          <div className="rounded-xl border border-walnut/15 bg-cream/50 p-4 space-y-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">Commercial Summary &amp; Charges</h3>
            <div className="grid grid-cols-3 gap-4 text-xs">
              <div>
                <label className="block font-bold text-walnut mb-1">PO-Level Discount (₹)</label>
                <input
                  type="number"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 font-mono text-charcoal"
                />
              </div>
              <div>
                <label className="block font-bold text-walnut mb-1">Additional Tax (₹)</label>
                <input
                  type="number"
                  value={tax}
                  onChange={(e) => setTax(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 font-mono text-charcoal"
                />
              </div>
              <div>
                <label className="block font-bold text-walnut mb-1">Shipping &amp; Freight (₹)</label>
                <input
                  type="number"
                  value={shippingCharges}
                  onChange={(e) => setShippingCharges(e.target.value)}
                  className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 font-mono text-charcoal"
                />
              </div>
            </div>

            <div className="flex justify-between items-center border-t border-walnut/15 pt-3">
              <span className="text-xs font-bold uppercase text-walnut">Calculated PO Grand Total</span>
              <span className="text-xl font-bold font-mono text-charcoal">
                {formatCurrency(computedGrandTotal)}
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
              Purchase Order Commercial Terms &amp; Site Delivery Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Unload at site location, submit test certificate with bill..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2 text-xs text-charcoal focus:border-gold focus:outline-none"
            />
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
              {loading ? "Issuing..." : "Create Purchase Order"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
