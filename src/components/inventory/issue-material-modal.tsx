"use client";

import React, { useState, useEffect } from "react";
import { X, ArrowRightLeft, AlertCircle, CheckCircle2 } from "lucide-react";

interface IssueMaterialModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export const IssueMaterialModal: React.FC<IssueMaterialModalProps> = ({
  isOpen,
  onClose,
  onSuccess,
}) => {
  const [materials, setMaterials] = useState<any[]>([]);
  const [warehouses, setWarehouses] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [formData, setFormData] = useState({
    materialId: "",
    warehouseId: "",
    projectId: "",
    quantity: "10",
    unitKey: "NOS",
    purpose: "Site execution material issue",
    notes: "",
  });

  useEffect(() => {
    if (isOpen) {
      fetchDropdowns();
    }
  }, [isOpen]);

  const fetchDropdowns = async () => {
    try {
      const [mRes, wRes, pRes] = await Promise.all([
        fetch("/api/v1/inventory/materials?limit=100"),
        fetch("/api/v1/inventory/warehouses"),
        fetch("/api/v1/projects"),
      ]);

      const [mData, wData, pData] = await Promise.all([
        mRes.json(),
        wRes.json(),
        pRes.json(),
      ]);

      if (mData.success) setMaterials(mData.data.materials || []);
      if (wData.success) setWarehouses(wData.data || []);
      if (pData.success) setProjects(pData.data?.projects || pData.data || []);

      if (mData.data?.materials?.length > 0) setFormData((prev) => ({ ...prev, materialId: mData.data.materials[0].id }));
      if (wData.data?.length > 0) setFormData((prev) => ({ ...prev, warehouseId: wData.data[0].id }));
      if (pData.data?.projects?.length > 0) setFormData((prev) => ({ ...prev, projectId: pData.data.projects[0].id }));
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
      const res = await fetch("/api/v1/inventory/movements/issue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          materialId: formData.materialId,
          warehouseId: formData.warehouseId,
          projectId: formData.projectId,
          quantity: parseFloat(formData.quantity) || 0,
          unitKey: formData.unitKey,
          purpose: formData.purpose,
          notes: formData.notes || undefined,
        }),
      });

      const data = await res.json();
      if (!res.ok || !data.success) {
        throw new Error(data.error || "Failed to issue material to project");
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const selectedMat = materials.find((m) => m.id === formData.materialId);

  return (
    <div className="fixed inset-0 z-50 bg-charcoal/50 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-offwhite rounded-xl shadow-2xl border border-walnut/20 w-full max-w-lg overflow-hidden flex flex-col">
        <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-gold-soft text-charcoal border border-gold/40 flex items-center justify-center font-bold">
              <ArrowRightLeft className="w-5 h-5 text-gold" />
            </div>
            <div>
              <h2 className="text-base font-bold text-charcoal">Issue Material to Site</h2>
              <p className="text-xs text-walnut">Dispatch stock from warehouse to project location</p>
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
                  {m.materialCode} - {m.name} (Avail: {m.availableStock} {m.baseUnitKey})
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-walnut">Source Warehouse *</label>
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
              <label className="font-bold text-walnut">Target Project *</label>
              <select
                value={formData.projectId}
                onChange={(e) => setFormData({ ...formData, projectId: e.target.value })}
                className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.referenceNo} - {p.title}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1">
              <label className="font-bold text-walnut">Quantity to Issue *</label>
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
            <label className="font-bold text-walnut">Purpose / Dispatch Note *</label>
            <input
              type="text"
              required
              placeholder="e.g. Living room wall paneling work"
              value={formData.purpose}
              onChange={(e) => setFormData({ ...formData, purpose: e.target.value })}
              className="w-full h-9 px-3 border border-walnut/20 bg-cream/40 rounded-lg text-charcoal font-medium focus:border-gold focus:outline-none"
            />
          </div>

          {selectedMat && (
            <div className="p-3 bg-cream/50 border border-walnut/15 rounded-lg flex items-center justify-between text-xs text-walnut font-medium">
              <span>Available Stock:</span>
              <span className="font-bold text-charcoal font-mono">
                {selectedMat.availableStock} {selectedMat.baseUnitKey}
              </span>
            </div>
          )}

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
              <CheckCircle2 className="w-4 h-4" />
              <span>{loading ? "Issuing..." : "Confirm Issue to Site"}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
