"use client";

import React, { useState } from "react";
import { Filter, Plus, X, Bookmark, Save, Trash2, Check, Sparkles, SlidersHorizontal } from "lucide-react";
import {
  FilterGroup,
  FilterCondition,
  FilterEngine,
  EntityFieldDefinition,
  FilterOperator,
} from "@/modules/search/filter-engine";

export interface AdvancedFilterBuilderProps {
  entityType: string;
  initialFilterGroup?: FilterGroup;
  onApplyFilters: (group: FilterGroup) => void;
  quickFilters?: { label: string; group: FilterGroup }[];
}

export const AdvancedFilterBuilder: React.FC<AdvancedFilterBuilderProps> = ({
  entityType,
  initialFilterGroup,
  onApplyFilters,
  quickFilters = [],
}) => {
  const fields = FilterEngine.getEntityFields(entityType);

  const [isOpen, setIsOpen] = useState(false);
  const [filterGroup, setFilterGroup] = useState<FilterGroup>(
    initialFilterGroup || {
      id: "root",
      logicalOperator: "AND",
      conditions: [],
    }
  );

  const [savedViews, setSavedViews] = useState<{ id: string; name: string; filterRules: string }[]>([]);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [newViewName, setNewViewName] = useState("");

  const addCondition = () => {
    if (fields.length === 0) return;
    const defaultField = fields[0];
    const newCond: FilterCondition = {
      id: `cond-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      field: defaultField.key,
      operator: defaultField.operators[0] || "EQUALS",
      value: "",
    };
    const updated = {
      ...filterGroup,
      conditions: [...filterGroup.conditions, newCond],
    };
    setFilterGroup(updated);
  };

  const removeCondition = (id: string) => {
    const updated = {
      ...filterGroup,
      conditions: filterGroup.conditions.filter((c) => c.id !== id),
    };
    setFilterGroup(updated);
    onApplyFilters(updated);
  };

  const updateCondition = (id: string, updates: Partial<FilterCondition>) => {
    const updated = {
      ...filterGroup,
      conditions: filterGroup.conditions.map((c) => (c.id === id ? { ...c, ...updates } : c)),
    };
    setFilterGroup(updated);
  };

  const clearAllFilters = () => {
    const cleared: FilterGroup = { id: "root", logicalOperator: "AND", conditions: [] };
    setFilterGroup(cleared);
    onApplyFilters(cleared);
  };

  const handleApply = () => {
    onApplyFilters(filterGroup);
    setIsOpen(false);
  };

  const handleSaveView = async () => {
    if (!newViewName.trim()) return;
    try {
      const res = await fetch("/api/v1/search/saved-views", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entityType,
          name: newViewName.trim(),
          filterRules: filterGroup,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setSavedViews((prev) => [...prev, json.data]);
        setSaveModalOpen(false);
        setNewViewName("");
      }
    } catch {
      // ignore
    }
  };

  const activeCount = filterGroup.conditions.length;

  return (
    <div className="space-y-2">
      {/* Trigger Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap items-center gap-2">
          {/* Main Filter Toggle Button */}
          <button
            onClick={() => setIsOpen(!isOpen)}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-md border transition-all cursor-pointer ${
              activeCount > 0
                ? "bg-gold-soft text-charcoal border-gold shadow-2xs"
                : "bg-offwhite text-charcoal border-walnut/20 hover:bg-cream hover:border-walnut/40"
            }`}
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-walnut" />
            <span>Filters</span>
            {activeCount > 0 && (
              <span className="px-1.5 py-0.2 bg-gold text-charcoal rounded-full text-[10px] font-mono font-bold">
                {activeCount}
              </span>
            )}
          </button>

          {/* Quick Filters Presets */}
          {quickFilters.length > 0 && (
            <div className="flex items-center gap-1.5 border-l border-walnut/15 pl-2">
              <span className="text-[11px] font-bold text-walnut uppercase tracking-wider hidden sm:inline">
                Quick:
              </span>
              {quickFilters.map((q, idx) => (
                <button
                  key={idx}
                  onClick={() => {
                    setFilterGroup(q.group);
                    onApplyFilters(q.group);
                  }}
                  className="px-2.5 py-1 text-xs font-semibold text-charcoal bg-offwhite hover:bg-cream border border-walnut/15 rounded-md transition-colors cursor-pointer"
                >
                  {q.label}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Clear All */}
        {activeCount > 0 && (
          <button
            onClick={clearAllFilters}
            className="text-xs font-semibold text-walnut hover:text-semantic-danger transition-colors flex items-center gap-1 cursor-pointer"
          >
            <Trash2 className="w-3.5 h-3.5" /> Clear All
          </button>
        )}
      </div>

      {/* Active Filter Chips System */}
      {activeCount > 0 && (
        <div className="flex flex-wrap items-center gap-1.5 px-1">
          {filterGroup.conditions.map((cond) => {
            const fieldDef = fields.find((f) => f.key === cond.field);
            const label = fieldDef ? fieldDef.label : cond.field;
            return (
              <div
                key={cond.id}
                className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium bg-gold-soft text-charcoal border border-gold/40 rounded-md shadow-2xs"
              >
                <span className="font-bold text-charcoal">{label}:</span>
                <span>{String(cond.value)}</span>
                <button
                  onClick={() => removeCondition(cond.id)}
                  className="hover:bg-gold/20 p-0.5 rounded text-walnut hover:text-charcoal transition-colors cursor-pointer"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Filter Builder Panel */}
      {isOpen && (
        <div className="p-4 bg-offwhite border border-walnut/20 rounded-lg space-y-4 shadow-subtle animate-in fade-in zoom-in-95 duration-100">
          <div className="flex items-center justify-between border-b border-walnut/10 pb-2">
            <h4 className="text-xs font-bold uppercase tracking-wider text-charcoal flex items-center gap-2">
              <Filter className="w-3.5 h-3.5 text-walnut" /> Filter Builder ({entityType})
            </h4>
            <div className="flex items-center gap-2">
              {activeCount > 0 && (
                <button
                  onClick={() => setSaveModalOpen(true)}
                  className="text-xs font-semibold text-walnut hover:text-charcoal flex items-center gap-1 cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5 text-walnut" /> Save View
                </button>
              )}
            </div>
          </div>

          {/* Condition Lines */}
          <div className="space-y-2">
            {filterGroup.conditions.length === 0 ? (
              <p className="text-xs text-walnut italic">No filters added yet. Click &quot;Add Filter Condition&quot; below.</p>
            ) : (
              filterGroup.conditions.map((cond, idx) => {
                const currentField = fields.find((f) => f.key === cond.field) || fields[0];
                const availableOps = currentField ? currentField.operators : ["EQUALS"];

                return (
                  <div key={cond.id} className="flex flex-wrap items-center gap-2 bg-cream/50 p-2 border border-walnut/15 rounded-md">
                    {idx > 0 && (
                      <span className="text-[10px] font-bold px-1.5 py-0.5 bg-offwhite text-walnut rounded border border-walnut/15">
                        {filterGroup.logicalOperator}
                      </span>
                    )}

                    {/* Field selector */}
                    <select
                      value={cond.field}
                      onChange={(e) => {
                        const newF = fields.find((f) => f.key === e.target.value);
                        updateCondition(cond.id, {
                          field: e.target.value,
                          operator: newF?.operators[0] || "EQUALS",
                          value: "",
                        });
                      }}
                      className="text-xs border border-walnut/20 rounded px-2 py-1 bg-offwhite text-charcoal outline-none focus:ring-1 focus:ring-gold"
                    >
                      {fields.map((f) => (
                        <option key={f.key} value={f.key}>
                          {f.label}
                        </option>
                      ))}
                    </select>

                    {/* Operator selector */}
                    <select
                      value={cond.operator}
                      onChange={(e) => updateCondition(cond.id, { operator: e.target.value as FilterOperator })}
                      className="text-xs border border-walnut/20 rounded px-2 py-1 bg-offwhite text-charcoal outline-none focus:ring-1 focus:ring-gold"
                    >
                      {availableOps.map((op) => (
                        <option key={op} value={op}>
                          {op.replace(/_/g, " ")}
                        </option>
                      ))}
                    </select>

                    {/* Value Input */}
                    {currentField?.options ? (
                      <select
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                        className="text-xs border border-walnut/20 rounded px-2 py-1 bg-offwhite text-charcoal outline-none min-w-32 focus:ring-1 focus:ring-gold"
                      >
                        <option value="">-- Select --</option>
                        {currentField.options.map((opt) => (
                          <option key={opt.value} value={opt.value}>
                            {opt.label}
                          </option>
                        ))}
                      </select>
                    ) : (
                      <input
                        type={currentField?.type === "NUMBER" ? "number" : currentField?.type === "DATE" ? "date" : "text"}
                        value={cond.value}
                        onChange={(e) => updateCondition(cond.id, { value: e.target.value })}
                        placeholder="Filter value..."
                        className="text-xs border border-walnut/20 rounded px-2 py-1 bg-offwhite text-charcoal outline-none min-w-36 focus:ring-1 focus:ring-gold placeholder:text-walnut/50"
                      />
                    )}

                    <button
                      onClick={() => removeCondition(cond.id)}
                      className="p-1 text-walnut hover:text-semantic-danger transition-colors ml-auto cursor-pointer"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                );
              })
            )}
          </div>

          {/* Action Footer */}
          <div className="flex items-center justify-between pt-2 border-t border-walnut/10">
            <button
              onClick={addCondition}
              className="px-3 py-1.5 text-xs font-bold text-charcoal bg-gold-soft hover:bg-gold/30 border border-gold/40 rounded-md flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 text-walnut" /> Add Condition
            </button>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setIsOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-walnut hover:text-charcoal hover:bg-cream rounded-md transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleApply}
                className="px-4 py-1.5 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-md transition-colors shadow-gold cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Save View Modal */}
      {saveModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/50 backdrop-blur-xs">
          <div className="bg-offwhite rounded-xl p-5 max-w-sm w-full shadow-modal border border-walnut/20 space-y-4">
            <h3 className="text-sm font-bold text-charcoal">Save Filter View</h3>
            <input
              type="text"
              value={newViewName}
              onChange={(e) => setNewViewName(e.target.value)}
              placeholder="e.g. My Pending Orders"
              className="w-full text-xs p-2 border border-walnut/20 rounded-md bg-cream/40 text-charcoal outline-none focus:ring-1 focus:ring-gold placeholder:text-walnut/50"
            />
            <div className="flex justify-end gap-2">
              <button
                onClick={() => setSaveModalOpen(false)}
                className="px-3 py-1.5 text-xs font-semibold text-walnut hover:text-charcoal hover:bg-cream rounded-md"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveView}
                className="px-3.5 py-1.5 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-md shadow-gold"
              >
                Save View
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
