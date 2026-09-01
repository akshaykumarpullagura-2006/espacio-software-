"use client";

import React, { useState, useEffect } from "react";
import { Sparkles, X, Check, Loader2, Wand2 } from "lucide-react";
import { generateAiDescription } from "./quotation-helpers";

interface AiDescriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  itemName: string;
  onApply: (description: string) => void;
}

export function AiDescriptionModal({
  isOpen,
  onClose,
  itemName,
  onApply,
}: AiDescriptionModalProps) {
  const [luxuryLevel, setLuxuryLevel] = useState<"Premium" | "Ultra-Luxury" | "Minimalist">("Premium");
  const [material, setMaterial] = useState("");
  const [details, setDetails] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [generatedText, setGeneratedText] = useState("");
  const [displayedText, setDisplayedText] = useState("");

  // Reset state when modal opens
  useEffect(() => {
    if (isOpen) {
      setGeneratedText("");
      setDisplayedText("");
      setMaterial("");
      setDetails("");
    }
  }, [isOpen, itemName]);

  // Typewriter effect
  useEffect(() => {
    if (!generatedText) return;
    setDisplayedText("");
    let idx = 0;
    const speed = generatedText.length > 200 ? 6 : 14;

    const interval = setInterval(() => {
      setDisplayedText((prev) => prev + generatedText.charAt(idx));
      idx++;
      if (idx >= generatedText.length) {
        clearInterval(interval);
      }
    }, speed);

    return () => clearInterval(interval);
  }, [generatedText]);

  if (!isOpen) return null;

  const handleGenerate = () => {
    setIsGenerating(true);
    setGeneratedText("");
    setDisplayedText("");

    setTimeout(() => {
      const result = generateAiDescription(itemName, luxuryLevel, material, details);
      setGeneratedText(result);
      setIsGenerating(false);
    }, 1200);
  };

  const handleApply = () => {
    onApply(displayedText || generatedText);
    onClose();
  };

  const materialsList = [
    "Century BWP 710 Marine Plywood",
    "Burmese Teak Wood & Veneer",
    "Italian High-Gloss PU Lacquer",
    "20mm Italian Statuario Quartz",
    "Tempered Tinted Fluted Glass",
    "Natural American Walnut Veneer",
    "Anti-Scratch Acrylic 2mm",
    "Brushed Champagne Gold Aluminum Profiles",
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-xl rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-4">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <Sparkles className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">ESPACIO AI Specification Architect</h3>
              <p className="text-xs text-slate-400">
                Generate high-end technical BOQ specifications for <span className="font-semibold text-emerald-400">{itemName || "Selected Item"}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Form Body */}
        <div className="space-y-4 py-4 text-sm">
          {/* Preset Styles */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Design & Luxury Tier
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["Premium", "Ultra-Luxury", "Minimalist"] as const).map((level) => (
                <button
                  key={level}
                  type="button"
                  onClick={() => setLuxuryLevel(level)}
                  className={`rounded-lg border px-3 py-2 text-xs font-medium transition-all ${
                    luxuryLevel === level
                      ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 shadow-sm"
                      : "border-slate-800 bg-slate-800/60 text-slate-300 hover:bg-slate-800"
                  }`}
                >
                  {level}
                </button>
              ))}
            </div>
          </div>

          {/* Primary Material */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Primary Core Material & Finish
            </label>
            <select
              value={material}
              onChange={(e) => setMaterial(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white focus:border-emerald-500 focus:outline-none"
            >
              <option value="">Select recommended material finish...</option>
              {materialsList.map((m) => (
                <option key={m} value={m}>
                  {m}
                </option>
              ))}
            </select>
          </div>

          {/* Custom Specifications */}
          <div>
            <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-slate-400">
              Custom Dimensions / Brand Hardware
            </label>
            <input
              type="text"
              placeholder="e.g. Dimensions 10' x 8', Blum Legrabox, Hafele profile lighting"
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-xs text-white placeholder-slate-500 focus:border-emerald-500 focus:outline-none"
            />
          </div>

          {/* Generate Button */}
          <button
            type="button"
            onClick={handleGenerate}
            disabled={isGenerating || !itemName}
            className="flex w-full items-center justify-center gap-2 rounded-lg bg-emerald-600 px-4 py-2.5 text-xs font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            {isGenerating ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin text-white" />
                Architecting luxury specifications...
              </>
            ) : (
              <>
                <Wand2 className="h-4 w-4" />
                Generate AI Specification
              </>
            )}
          </button>

          {/* Output Box */}
          {(isGenerating || generatedText || displayedText) && (
            <div className="mt-2 space-y-1.5">
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                Generated Specification Preview
              </label>
              <div className="max-h-48 overflow-y-auto rounded-lg border border-slate-700 bg-slate-950 p-3.5 font-mono text-xs leading-relaxed text-emerald-300">
                {isGenerating ? (
                  <div className="space-y-2 py-2">
                    <div className="h-3 w-4/5 animate-pulse rounded bg-slate-800" />
                    <div className="h-3 w-3/5 animate-pulse rounded bg-slate-800" />
                    <div className="h-3 w-5/6 animate-pulse rounded bg-slate-800" />
                  </div>
                ) : (
                  <div className="whitespace-pre-line">
                    {displayedText}
                    {displayedText.length < generatedText.length && (
                      <span className="inline-block h-3.5 w-1.5 animate-pulse bg-emerald-400 align-middle ml-1" />
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 pt-4">
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleApply}
            disabled={!displayedText || isGenerating}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white transition-all hover:bg-emerald-500 disabled:opacity-50"
          >
            <Check className="h-4 w-4" />
            Apply to Quotation
          </button>
        </div>
      </div>
    </div>
  );
}
