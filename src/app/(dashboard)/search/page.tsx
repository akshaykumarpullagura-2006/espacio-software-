"use client";

import React, { useState, useEffect, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  FolderKanban,
  Users,
  FileText,
  Truck,
  Wallet,
  Package,
  ChevronRight,
  SlidersHorizontal,
  ArrowUpDown,
  Copy,
  Check,
  Building2,
  Receipt,
  CreditCard,
  ShoppingBag,
} from "lucide-react";
import { SearchResultItem } from "@/modules/search/search.service";
import { AdvancedFilterBuilder } from "@/components/ui/advanced-filter-builder";
import { FilterGroup } from "@/modules/search/filter-engine";

function SearchPageContent() {
  const searchParams = useSearchParams();
  const router = useRouter();

  const initialQuery = searchParams.get("q") || "";
  const initialModule = searchParams.get("module") || "ALL";

  const [query, setQuery] = useState(initialQuery);
  const [activeModule, setActiveModule] = useState(initialModule);
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [moduleCounts, setModuleCounts] = useState<Record<string, number>>({});
  const [totalResults, setTotalResults] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [didYouMean, setDidYouMean] = useState<string | undefined>();
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  // Pagination & Sorting
  const [page, setPage] = useState(1);
  const pageSize = 15;

  const executeSearch = useCallback(
    async (q: string, mod: string, pageNum: number) => {
      if (!q.trim()) {
        setResults([]);
        setTotalResults(0);
        return;
      }

      setIsLoading(true);
      try {
        const offset = (pageNum - 1) * pageSize;
        const modParam = mod !== "ALL" ? `&module=${encodeURIComponent(mod)}` : "";
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(q.trim())}${modParam}&limit=${pageSize}&offset=${offset}`);
        const json = await res.json();

        if (json.success && json.data) {
          setResults(json.data.results || []);
          setTotalResults(json.data.totalResults || 0);
          setModuleCounts(json.data.moduleCounts || {});
          setDidYouMean(json.data.didYouMean);
        }
      } catch (err) {
        console.error("Search page error:", err);
      } finally {
        setIsLoading(false);
      }
    },
    [pageSize]
  );

  useEffect(() => {
    executeSearch(query, activeModule, page);
  }, [query, activeModule, page, executeSearch]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setPage(1);
    router.push(`/search?q=${encodeURIComponent(query.trim())}&module=${activeModule}`);
  };

  const handleModuleChange = (mod: string) => {
    setActiveModule(mod);
    setPage(1);
    router.push(`/search?q=${encodeURIComponent(query.trim())}&module=${mod}`);
  };

  const copyRef = (refNo: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(refNo);
    setCopiedRef(refNo);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const totalPages = Math.ceil(totalResults / pageSize);

  const MODULE_TABS = [
    { key: "ALL", label: "All Modules" },
    { key: "PROJECTS", label: "Projects" },
    { key: "CRM", label: "Leads & Clients" },
    { key: "PROCUREMENT", label: "Procurement" },
    { key: "FINANCE", label: "Finance" },
    { key: "INVENTORY", label: "Inventory" },
  ];

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header Search Surface */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
        <form onSubmit={handleSearchSubmit} className="flex gap-3">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search across all modules by reference (PO-2026-0004, PROJ-2026-0001), name, phone, email..."
              className="w-full pl-10 pr-4 py-2.5 bg-slate-50 border border-slate-200 rounded-lg text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-emerald-500 focus:bg-white transition-all font-medium"
            />
          </div>
          <button
            type="submit"
            className="px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-lg transition-colors shadow-2xs cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Module Filter Tabs */}
        <div className="flex items-center gap-2 border-b border-slate-100 overflow-x-auto pb-2">
          {MODULE_TABS.map((tab) => {
            const count = tab.key === "ALL" ? totalResults : moduleCounts[tab.label] || 0;
            const isActive = activeModule === tab.key;

            return (
              <button
                key={tab.key}
                onClick={() => handleModuleChange(tab.key)}
                className={`px-3 py-1.5 rounded-md text-xs font-semibold whitespace-nowrap transition-colors cursor-pointer ${
                  isActive
                    ? "bg-emerald-50 text-emerald-800 border border-emerald-200"
                    : "text-slate-600 hover:bg-slate-100 border border-transparent"
                }`}
              >
                {tab.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Query Suggestions */}
      {didYouMean && (
        <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
          <span className="font-semibold">Did you mean?</span>
          <button
            onClick={() => setQuery(didYouMean)}
            className="underline hover:no-underline font-bold text-amber-900 cursor-pointer"
          >
            {didYouMean}
          </button>
        </div>
      )}

      {/* Main Results View */}
      <div className="space-y-4">
        {/* Results Counter & Meta */}
        <div className="flex items-center justify-between text-xs text-slate-500 font-medium px-1">
          <span>
            Found <span className="font-bold text-slate-900">{totalResults}</span> records for{" "}
            <span className="font-semibold text-slate-900">&quot;{query}&quot;</span>
          </span>
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-emerald-600" />}
        </div>

        {/* Results Grid */}
        {results.length === 0 && !isLoading ? (
          <div className="bg-white p-12 rounded-xl border border-slate-200 text-center space-y-3">
            <Search className="w-8 h-8 text-slate-300 mx-auto" />
            <h3 className="text-sm font-bold text-slate-800">No matching records found</h3>
            <p className="text-xs text-slate-500 max-w-md mx-auto">
              We couldn&apos;t find any records matching &quot;{query}&quot;. Try checking for typos or searching by exact reference number (e.g. PO-2026-0004, PROJ-2026-0001).
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {results.map((item) => (
              <div
                key={`${item.type}-${item.id}`}
                onClick={() => router.push(item.href)}
                className="bg-white p-4 rounded-xl border border-slate-200 hover:border-slate-300 hover:shadow-subtle transition-all cursor-pointer group flex flex-col sm:flex-row sm:items-center justify-between gap-4"
              >
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="text-[10px] font-mono font-bold uppercase tracking-wider px-2 py-0.5 bg-slate-100 text-slate-700 rounded border">
                      {item.typeLabel}
                    </span>
                    <span className="text-sm font-semibold text-slate-900 group-hover:text-emerald-700 transition-colors">
                      {item.title}
                    </span>
                    <span className="text-xs font-mono font-medium text-slate-600 px-1.5 py-0.2 bg-slate-50 border rounded">
                      {item.referenceNo}
                    </span>
                    {item.status && (
                      <span className="text-[10px] font-semibold px-2 py-0.5 bg-emerald-100 text-emerald-800 rounded">
                        {item.status}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">{item.subtitle}</p>

                  {/* Related Records Graph Link */}
                  {item.relatedRecords && item.relatedRecords.length > 0 && (
                    <div className="flex items-center gap-2 pt-1">
                      <span className="text-[10px] font-semibold text-slate-400 uppercase">Related:</span>
                      {item.relatedRecords.map((rel) => (
                        <span
                          key={rel.id}
                          onClick={(e) => {
                            e.stopPropagation();
                            router.push(rel.href);
                          }}
                          className="text-[11px] text-emerald-600 hover:underline font-medium cursor-pointer"
                        >
                          {rel.type}: {rel.title}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex items-center gap-3 shrink-0">
                  {item.amount !== undefined && (
                    <span className="text-xs font-mono font-bold text-slate-900">
                      ₹{item.amount.toLocaleString("en-IN")}
                    </span>
                  )}
                  <button
                    onClick={(e) => copyRef(item.referenceNo, e)}
                    title="Copy Reference"
                    className="p-1.5 hover:bg-slate-100 rounded text-slate-400 hover:text-slate-600 transition-colors"
                  >
                    {copiedRef === item.referenceNo ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                  <ChevronRight className="w-4 h-4 text-slate-300 group-hover:text-slate-600 transition-colors" />
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Pagination Controls */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between pt-4 text-xs text-slate-500 font-medium">
            <span>
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-2">
              <button
                disabled={page <= 1}
                onClick={() => setPage((p) => p - 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded disabled:opacity-50 hover:bg-slate-50"
              >
                Previous
              </button>
              <button
                disabled={page >= totalPages}
                onClick={() => setPage((p) => p + 1)}
                className="px-3 py-1.5 bg-white border border-slate-200 rounded disabled:opacity-50 hover:bg-slate-50"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default function SearchPage() {
  return (
    <Suspense fallback={<div className="p-8 text-center text-xs text-slate-400">Loading search page...</div>}>
      <SearchPageContent />
    </Suspense>
  );
}
