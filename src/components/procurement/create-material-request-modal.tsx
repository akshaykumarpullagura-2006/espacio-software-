"use client";

import React, { useState, useEffect } from "react";

interface CreateMaterialRequestModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface ItemRow {
  materialName: string;
  description: string;
  requestedQuantity: string;
  unitKey: string;
  estimatedRate: string;
}

export function CreateMaterialRequestModal({ isOpen, onClose, onSuccess }: CreateMaterialRequestModalProps) {
  const [purposes, setPurposes] = useState<any[]>([]);
  const [units, setUnits] = useState<any[]>([]);
  const [projects, setProjects] = useState<any[]>([]);

  const [projectId, setProjectId] = useState("");
  const [requiredDate, setRequiredDate] = useState(
    new Date(Date.now() + 86400000 * 7).toISOString().split("T")[0]
  );
  const [priority, setPriority] = useState("MEDIUM");
  const [purposeKey, setPurposeKey] = useState("PROJECT_EXECUTION");
  const [notes, setNotes] = useState("");

  const [items, setItems] = useState<ItemRow[]>([
    { materialName: "", description: "", requestedQuantity: "10", unitKey: "NOS", estimatedRate: "" },
  ]);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      fetchConfigs();
      fetchProjects();
    }
  }, [isOpen]);

  async function fetchConfigs() {
    try {
      const res = await fetch("/api/v1/config/procurement");
      if (res.ok) {
        const data = await res.json();
        if (data.data?.purposes) setPurposes(data.data.purposes);
        if (data.data?.units) setUnits(data.data.units);
      }
    } catch (e) {
      console.error("Failed to load procurement config", e);
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

  if (!isOpen) return null;

  function handleAddItem() {
    setItems([
      ...items,
      { materialName: "", description: "", requestedQuantity: "10", unitKey: "NOS", estimatedRate: "" },
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

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const payloadItems = items.map((i) => {
        const qty = parseFloat(i.requestedQuantity);
        if (isNaN(qty) || qty <= 0) throw new Error("Item quantity must be a positive number.");
        const rate = i.estimatedRate ? parseFloat(i.estimatedRate) : undefined;
        return {
          materialName: i.materialName,
          description: i.description || undefined,
          requestedQuantity: qty,
          unitKey: i.unitKey,
          estimatedRate: rate,
        };
      });

      const res = await fetch("/api/v1/procurement/material-requests", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          projectId: projectId || undefined,
          requiredDate,
          priority,
          purposeKey,
          notes: notes || undefined,
          items: payloadItems,
        }),
      });

      const json = await res.json();

      if (!res.ok) {
        throw new Error(json.error?.message || "Failed to create material request");
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
      <div className="w-full max-w-3xl max-h-[90vh] overflow-y-auto rounded-xl bg-offwhite border border-walnut/20 shadow-modal">
        <div className="flex items-center justify-between border-b border-walnut/15 px-6 py-4 sticky top-0 bg-cream/90 backdrop-blur-md z-10">
          <div>
            <h2 className="text-base font-bold text-charcoal">Create Material Request</h2>
            <p className="text-xs text-walnut">Internal requisition for site or stock requirement (MR-YYYY-XXXX)</p>
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
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Link Project (Optional for Stock)
              </label>
              <select
                value={projectId}
                onChange={(e) => setProjectId(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                <option value="">General Stock / Operations</option>
                {projects.map((p) => (
                  <option key={p.id} value={p.id}>
                    {p.referenceNo} — {p.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Required By Date *
              </label>
              <input
                type="date"
                value={requiredDate}
                onChange={(e) => setRequiredDate(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Priority
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                <option value="LOW">LOW</option>
                <option value="MEDIUM">MEDIUM</option>
                <option value="HIGH">HIGH (Urgent Site)</option>
                <option value="URGENT">URGENT (Stoppage Risk)</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
                Requisition Purpose
              </label>
              <select
                value={purposeKey}
                onChange={(e) => setPurposeKey(e.target.value)}
                className="w-full rounded-md border border-walnut/20 bg-cream/40 p-2.5 text-xs text-charcoal font-semibold focus:border-gold focus:outline-none"
              >
                {purposes.map((p) => (
                  <option key={p.key} value={p.key}>
                    {p.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Section 2: Items Table */}
          <div className="space-y-3">
            <div className="flex justify-between items-center border-b border-walnut/15 pb-1">
              <h3 className="text-xs font-bold uppercase tracking-wider text-charcoal">
                Requested Material Line Items *
              </h3>
              <button
                type="button"
                onClick={handleAddItem}
                className="text-xs font-bold text-charcoal hover:text-gold cursor-pointer transition-colors"
              >
                + Add Another Material Item
              </button>
            </div>

            <div className="space-y-3">
              {items.map((item, idx) => (
                <div key={idx} className="p-3 rounded-md border border-walnut/15 bg-cream/40 space-y-2 text-xs">
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-charcoal">Item #{idx + 1}</span>
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
                        placeholder="Material Name (e.g. BWP 19mm Commercial Plywood)"
                        value={item.materialName}
                        onChange={(e) => handleItemChange(idx, "materialName", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 text-charcoal focus:border-gold focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder="Specifications / Grade"
                        value={item.description}
                        onChange={(e) => handleItemChange(idx, "description", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 text-charcoal focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-[10px] font-bold text-walnut uppercase">Quantity *</label>
                      <input
                        type="number"
                        placeholder="10"
                        value={item.requestedQuantity}
                        onChange={(e) => handleItemChange(idx, "requestedQuantity", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 font-mono text-charcoal focus:border-gold focus:outline-none"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-walnut uppercase">Unit *</label>
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
                      <label className="block text-[10px] font-bold text-walnut uppercase">Est. Rate (₹)</label>
                      <input
                        type="number"
                        placeholder="2400"
                        value={item.estimatedRate}
                        onChange={(e) => handleItemChange(idx, "estimatedRate", e.target.value)}
                        className="w-full rounded-md border border-walnut/20 bg-offwhite p-2 font-mono text-charcoal focus:border-gold focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-walnut uppercase tracking-wider mb-1">
              Requisition Notes &amp; Special Site Instructions
            </label>
            <textarea
              rows={2}
              placeholder="e.g. Unload at basement storage, deliver before 10 AM..."
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
              {loading ? "Creating..." : "Save Material Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
