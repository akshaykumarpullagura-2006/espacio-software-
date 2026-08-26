"use client";

import React, { useState, useEffect } from "react";
import { X, SlidersHorizontal, AlertCircle, Save } from "lucide-react";

interface AdjustStockModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const AdjustStockModal: React.FC<AdjustStockModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    materialId: "",
    warehouseId: "",
    adjustmentType: "IN" as "IN" | "OUT",
    quantity: "5",
    unitKey: "NOS",
    reason: "Physical audit discrepancy / damaged stock write-off",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
    }
  }, [isOpen]);

  const fetchDropdowns = async () => {
    try {
      const [mRes, wRes] = await Promise.all([
        fetch("/api/v1/inventory/materials?limit=100"),
        fetch("/api/v1/inventory/warehouses"),
      ]);

      const [mData, wData] = await Promise.all([mRes.json(), wRes.json()]);

      if (mData.success) setMaterials(mData.data.materials || []);
      if (wData.success) setWarehouses(wData.data || []);

      if (mData.data?.materials?.length > 0) setFormData((prev) => ({ ...prev, materialId: mData.data.materials[0].id }));
      if (wData.data?.length > 0) setFormData((prev) => ({ ...prev, warehouseId: wData.data[0].id }));
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
      const res = await fetch("/api/v1/inventory/movements/adjust", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: formData.materialId,
          warehouseId: formData.warehouseId,
          adjustmentType: formData.adjustmentType,
          quantity: parseFloat(formData.quantity) || 0,
          unitKey: formData.unitKey,
          reason: formData.reason,
          notes: formData.notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to adjust stock");
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
      <div className="bg-offwhite rounded-xl shadow-2xl border border-walnut/20 w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold-soft text-charcoal border border-gold/40 flex items-center justify-center font-bold">
              <SlidersHorizontal className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-charcoal">Physical Stock Adjustment</h2>
              <p className="text-xs text-walnut">Record stock addition, write-off, or audit correction</p>
            </div>
          </div>
          <button onClick={onClose} className="p-1 rounded-lg text-walnut hover:text-charcoal hover:bg-cream cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-lg bg-semantic-danger-bg border border-semantic-danger-border text-semantic-danger font-semibold flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div className="space-y-1">
            <label className="font-bold text-walnut">Select Material *</label>
            <select
              value={formData.materialId}
              onChange={(e) => {
                const mat = materials.find((m) => m.id === e.target.value);
                setFormData({
                  ...formData,
                  materialId: e.target.value,
                  unitKey: mat ? mat.baseUnitKey : "NOS",
                });
              }}
              className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-semibold focus:border-gold focus:outline-none"
            >
              {materials.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.materialCode} - {m.name}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-walnut">Warehouse *</label>
              <select
                value={formData.warehouseId}
                onChange={(e) => setFormData({ ...formData, warehouseId: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                {warehouses.map((w) => (
                  <option key={w.id} value={w.id}>
                    {w.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Adjustment Type *</label>
              <select
                value={formData.adjustmentType}
                onChange={(e) => setFormData({ ...formData, adjustmentType: e.target.value as "IN" | "OUT" })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-bold focus:border-gold focus:outline-none"
              >
                <option value="IN">+ Increase Stock (ADJUSTMENT_IN)</option>
                <option value="OUT">- Reduce / Write-off Stock (ADJUSTMENT_OUT)</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-walnut">Quantity *</label>
              <input
                type="number"
                step="any"
                required
                min="0.001"
                value={formData.quantity}
                onChange={(e) => setFormData({ ...formData, quantity: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-mono font-bold focus:border-gold focus:outline-none"
              />
            </div>

            <div className="space-y-1">
              <label className="font-bold text-walnut">Unit</label>
              <input
                type="text"
                readOnly
                value={formData.unitKey}
                className="w-full h-9 px-3 bg-cream/60 border border-walnut/15 rounded-lg text-charcoal font-mono font-bold"
              />
            </div>
          </div>

          <div className="space-y-1">
            <label className="font-bold text-walnut">Reason / Justification *</label>
            <input
              type="text"
              required
              placeholder="e.g. Damaged during transport / Physical count discrepancy"
              value={formData.reason}
              onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
              className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-medium focus:border-gold focus:outline-none"
            />
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
              <span>{loading ? "Adjusting..." : "Post Stock Adjustment"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
