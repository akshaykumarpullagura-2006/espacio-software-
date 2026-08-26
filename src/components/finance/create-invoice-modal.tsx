"use client";

import React, { useState, useEffect } from "react";
import { X, FileText, AlertCircle, Save, Plus, Trash2 } from "lucide-react";

interface CreateInvoiceModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateInvoiceModal: React.FC<CreateInvoiceModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [clients, setClients] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    clientId: "",
    projectId: "",
    customerName: "",
    customerGstin: "",
    customerAddress: "",
    stateCode: "36",
    placeOfSupply: "Telangana",
    isInterState: false,
    notes: "",
  });

  const [items, setItems] = useState([
    {
      description: "Custom Interior Execution & Modular Woodwork",
      hsnSacCode: "995476",
      quantity: 1,
      unitKey: "NOS",
      unitRate: 200000,
      discount: 0,
      gstRate: 18,
    },
  ]);

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
    }
  }, [isOpen]);

  const fetchDropdowns = async () => {
    try {
      const [cRes, pRes] = await Promise.all([fetch("/api/v1/clients"), fetch("/api/v1/projects")]);
      const [cData, pData] = await Promise.all([cRes.json(), pRes.json()]);

      if (cData.success) setClients(cData.data?.clients || cData.data || []);
      if (pData.success) setProjects(pData.data?.projects || pData.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleAddItem = () => {
    setItems([
      ...items,
      {
        description: "",
        hsnSacCode: "995476",
        quantity: 1,
        unitKey: "NOS",
        unitRate: 0,
        discount: 0,
        gstRate: 18,
      },
    ]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) return;
    setItems(items.filter((_, i) => i !== index));
  };

  const handleItemChange = (index: number, field: string, value: any) => {
    const newItems = [...items];
    (newItems[index] as any)[field] = value;
    setItems(newItems);
  };

  const calculateSubtotal = () => items.reduce((acc, item) => acc + item.quantity * item.unitRate - (item.discount || 0), 0);
  const subtotal = calculateSubtotal();
  const taxRate = items[0]?.gstRate || 18;
  const tax = (subtotal * taxRate) / 100;
  const grandTotal = Math.round(subtotal + tax);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/finance/invoices", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          items: items.map((item) => ({
            ...item,
            quantity: parseFloat(item.quantity as any) || 0,
            unitRate: parseFloat(item.unitRate as any) || 0,
            discount: parseFloat(item.discount as any) || 0,
            gstRate: parseFloat(item.gstRate as any) || 18,
          })),
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to generate GST invoice");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-offwhite rounded-xl shadow-2xl border border-walnut/20 w-full max-w-3xl overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold-soft text-charcoal border border-gold/40 flex items-center justify-center font-bold">
              <FileText className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-charcoal">Generate GST Tax Invoice</h2>
              <p className="text-xs text-walnut">Create official tax invoice with CGST/SGST/IGST breakdown</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-walnut hover:text-charcoal hover:bg-cream cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-semantic-danger-bg border border-semantic-danger-border text-semantic-danger font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-walnut">Client / Customer *</label>
              <input
                type="text"
                required
                placeholder="Customer Full Name"
                value={formData.customerName}
                onChange={(e) => setFormData({ ...formData, customerName: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-medium focus:border-gold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Customer GSTIN (Optional)</label>
              <input
                type="text"
                placeholder="e.g. 36AAAPL1234C1Z9"
                value={formData.customerGstin}
                onChange={(e) => setFormData({ ...formData, customerGstin: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-mono focus:border-gold focus:outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-walnut">Link Project (Optional)</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                <option value="">No Project Link</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.referenceNo} - {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Tax Type</label>
              <select
                value={formData.isInterState ? "IGST" : "CGST_SGST"}
                onChange={(e) => setFormData({ ...formData, isInterState: e.target.value === "IGST" })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-bold focus:border-gold focus:outline-none"
              >
                <option value="CGST_SGST">Intra-state (CGST 9% + SGST 9%)</option>
                <option value="IGST">Inter-state (IGST 18%)</option>
              </select>
            </div>
          </div>

          {/* Line Items Table */}
          <div className="space-y-2 border-t border-walnut/15 pt-3">
            <div className="flex items-center justify-between">
              <h3 className="font-bold text-charcoal text-xs uppercase tracking-wider">Invoice Line Items</h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="px-2.5 py-1 bg-cream hover:bg-gold-soft border border-walnut/20 text-charcoal font-bold rounded-lg text-[11px] flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Add Item Line</span>
              </button>
            </div>

            <div className="border border-walnut/20 rounded-lg overflow-hidden">
              <table className="w-full text-left text-xs border-collapse">
                <thead className="bg-cream/70 text-walnut text-[10px] font-bold uppercase">
                  <tr>
                    <th className="px-3 py-2">Description</th>
                    <th className="px-3 py-2 w-24">HSN/SAC</th>
                    <th className="px-3 py-2 w-20 text-right">Qty</th>
                    <th className="px-3 py-2 w-28 text-right">Rate (₹)</th>
                    <th className="px-3 py-2 w-28 text-right">Amount (₹)</th>
                    <th className="px-3 py-2 w-10"></th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-walnut/10 bg-offwhite">
                  {items.map((item, idx) => (
                    <tr key={idx}>
                      <td className="p-2">
                        <input
                          type="text"
                          required
                          value={item.description}
                          onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                          className="w-full h-8 px-2 border border-walnut/20 bg-cream/40 rounded text-charcoal focus:border-gold focus:outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="text"
                          value={item.hsnSacCode}
                          onChange={(e) => handleItemChange(idx, "hsnSacCode", e.target.value)}
                          className="w-full h-8 px-2 border border-walnut/20 bg-cream/40 rounded text-charcoal font-mono focus:border-gold focus:outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="1"
                          value={item.quantity}
                          onChange={(e) => handleItemChange(idx, "quantity", parseFloat(e.target.value) || 0)}
                          className="w-full h-8 px-2 border border-walnut/20 bg-cream/40 rounded text-right font-mono text-charcoal focus:border-gold focus:outline-none"
                        />
                      </td>
                      <td className="p-2">
                        <input
                          type="number"
                          min="0"
                          value={item.unitRate}
                          onChange={(e) => handleItemChange(idx, "unitRate", parseFloat(e.target.value) || 0)}
                          className="w-full h-8 px-2 border border-walnut/20 bg-cream/40 rounded text-right font-mono font-bold text-charcoal focus:border-gold focus:outline-none"
                        />
                      </td>
                      <td className="p-2 text-right font-bold font-mono text-charcoal tabular-nums">
                        ₹{(item.quantity * item.unitRate).toLocaleString("en-IN")}
                      </td>
                      <td className="p-2 text-center">
                        <button
                          type="button"
                          onClick={() => handleRemoveItem(idx)}
                          className="p-1 text-walnut hover:text-semantic-danger rounded cursor-pointer"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          <div className="p-3 bg-cream/50 border border-walnut/15 rounded-lg flex items-center justify-between text-xs font-bold text-charcoal">
            <span>Taxable: ₹{subtotal.toLocaleString("en-IN")}</span>
            <span>GST ({taxRate}%): ₹{tax.toLocaleString("en-IN")}</span>
            <span className="text-charcoal font-bold font-mono text-sm">Grand Total: ₹{grandTotal.toLocaleString("en-IN")}</span>
          </div>

          <div className="pt-4 border-t border-walnut/15 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-bold text-walnut hover:bg-cream rounded-lg border border-walnut/20 cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading}
              className="px-4 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover shadow-gold rounded-lg flex items-center gap-1.5 disabled:opacity-50 cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{loading ? "Generating..." : "Generate GST Invoice"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
