"use client";

import React, { useState, useEffect } from "react";
import { X, Boxes, AlertCircle, Save } from "lucide-react";

interface CreateMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const CreateMaterialModal: React.FC<CreateMaterialModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [categories, setCategories] = useState<any[]>([]);
  const [brands, setBrands] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    name: "",
    sku: "",
    categoryKey: "PLYWOOD",
    brandKey: "CENTURY_PLY",
    description: "",
    modelVariant: "",
    baseUnitKey: "SHEET",
    purchaseUnitKey: "BUNDLE",
    minStock: "10",
    reorderLevel: "30",
    maxStock: "300",
    purchaseCost: "2400",
    standardCost: "2400",
    sellingPrice: "3200",
    materialType: "STOCK",
  });

  useEffect(() => {
    if (isOpen) {
      fetchConfig();
    }
  }, [isOpen]);

  const fetchConfig = async () => {
    try {
      const res = await fetch("/api/v1/config/inventory");
      const data = await res.json();
      if (data.success) {
        setCategories(data.data.categories || []);
        setBrands(data.data.brands || []);
        setUnits(data.data.units || []);
      }
    } catch (err) {
      console.error(err);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/v1/inventory/materials", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          sku: formData.sku || undefined,
          categoryKey: formData.categoryKey,
          brandKey: formData.brandKey || undefined,
          description: formData.description || undefined,
          modelVariant: formData.modelVariant || undefined,
          baseUnitKey: formData.baseUnitKey,
          purchaseUnitKey: formData.purchaseUnitKey || formData.baseUnitKey,
          minStock: parseFloat(formData.minStock) || 0,
          reorderLevel: parseFloat(formData.reorderLevel) || 0,
          maxStock: formData.maxStock ? parseFloat(formData.maxStock) : undefined,
          purchaseCost: parseFloat(formData.purchaseCost) || 0,
          standardCost: parseFloat(formData.standardCost) || 0,
          sellingPrice: formData.sellingPrice ? parseFloat(formData.sellingPrice) : undefined,
          materialType: formData.materialType,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to create material");
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
      <div className="bg-offwhite rounded-xl shadow-2xl border border-walnut/20 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold-soft text-charcoal border border-gold/40 flex items-center justify-center font-bold">
              <Boxes className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-charcoal">Register New Material</h2>
              <p className="text-xs text-walnut">Create item master record with stock parameters</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-walnut hover:text-charcoal hover:bg-cream cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-4 overflow-y-auto flex-1 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-semantic-danger-bg border border-semantic-danger-border text-semantic-danger font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-walnut">Material Name *</label>
              <input
                type="text"
                required
                placeholder="e.g. WPC Walnut Fluted Panel (8ft x 120mm)"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-medium focus:border-gold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">SKU Code (Optional)</label>
              <input
                type="text"
                placeholder="e.g. SKU-WPC-WALNUT-01"
                value={formData.sku}
                onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-mono focus:border-gold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Category *</label>
              <select
                value={formData.categoryKey}
                onChange={(e) => setFormData({ ...formData, categoryKey: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                {categories.map((c) => (
                  <option key={c.key} value={c.key}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Brand</label>
              <select
                value={formData.brandKey}
                onChange={(e) => setFormData({ ...formData, brandKey: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                <option value="">Select Brand</option>
                {brands.map((b) => (
                  <option key={b.key} value={b.key}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Base Unit *</label>
              <select
                value={formData.baseUnitKey}
                onChange={(e) => setFormData({ ...formData, baseUnitKey: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                {units.map((u) => (
                  <option key={u.key} value={u.key}>
                    {u.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Min Stock Threshold</label>
              <input
                type="number"
                min="0"
                value={formData.minStock}
                onChange={(e) => setFormData({ ...formData, minStock: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-mono focus:border-gold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Reorder Level (Alert Trigger) *</label>
              <input
                type="number"
                min="0"
                value={formData.reorderLevel}
                onChange={(e) => setFormData({ ...formData, reorderLevel: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg font-mono text-charcoal font-bold focus:border-gold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Purchase Cost (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.purchaseCost}
                onChange={(e) => setFormData({ ...formData, purchaseCost: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-mono tabular-nums focus:border-gold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Selling Price (₹)</label>
              <input
                type="number"
                min="0"
                value={formData.sellingPrice}
                onChange={(e) => setFormData({ ...formData, sellingPrice: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-mono tabular-nums focus:border-gold focus:outline-none"
              />
            </div>

            <div className="space-y-1 md:col-span-2">
              <label className="font-bold text-walnut">Specification &amp; Description</label>
              <textarea
                rows={2}
                placeholder="Product specs, dimensions, thickness, finish details..."
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                className="w-full p-2.5 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal focus:border-gold focus:outline-none"
              />
            </div>
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
              <span>{loading ? "Saving..." : "Save Material Master"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
