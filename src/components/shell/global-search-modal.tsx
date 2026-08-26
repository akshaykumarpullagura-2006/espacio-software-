"use client";

import React, { useState, useEffect, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Loader2,
  FileText,
  FolderKanban,
  Users,
  Wallet,
  Truck,
  ChevronRight,
  Command,
  PlusCircle,
  Copy,
  Check,
  Clock,
  Sparkles,
  ArrowRight,
  UserCheck,
  Package,
  Building2,
  ArrowLeftRight,
  ShoppingBag,
  CreditCard,
  Receipt,
  Banknote,
  BarChart3,
  ShieldAlert,
  FolderPlus,
  UserPlus,
  ShoppingCart,
  ClipboardPlus,
  ArrowDownLeft,
  AlertTriangle,
  AlertCircle,
} from "lucide-react";
import { SearchResultItem } from "@/modules/search/search.service";
import { CommandItem } from "@/modules/search/command-registry";

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const ICON_MAP: Record<string, React.ElementType> = {
  Users,
  FolderKanban,
  FileText,
  UserCheck,
  Truck,
  ShoppingBag,
  FileSpreadsheet: FileText,
  Package,
  ArrowLeftRight,
  Building2,
  Wallet,
  CreditCard,
  Receipt,
  Banknote,
  BarChart3,
  ShieldAlert,
  PlusCircle,
  FolderPlus,
  UserPlus,
  ShoppingCart,
  ClipboardPlus,
  ArrowDownLeft,
  AlertTriangle,
  AlertCircle,
  Clock,
};

export const GlobalSearchModal: React.FC<GlobalSearchModalProps> = ({ isOpen, onClose }) => {
  const [query, setQuery] = useState("");
  const [searchResults, setSearchResults] = useState<SearchResultItem[]>([]);
  const [commands, setCommands] = useState<CommandItem[]>([]);
  const [recentSearches, setRecentSearches] = useState<{ id: string; query: string }[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const [copiedRef, setCopiedRef] = useState<string | null>(null);

  const inputRef = useRef<HTMLInputElement>(null);
  const router = useRouter();

  // Load initial commands & recent searches when opened
  useEffect(() => {
    if (!isOpen) return;

    setQuery("");
    setSelectedIndex(0);

    const loadInitial = async () => {
      try {
        const [cmdRes, recentRes] = await Promise.all([
          fetch("/api/v1/search/commands"),
          fetch("/api/v1/search/recent"),
        ]);
        const cmdJson = await cmdRes.json();
        const recentJson = await recentRes.json();

        if (cmdJson.success) setCommands(cmdJson.data);
        if (recentJson.success) setRecentSearches(recentJson.data);
      } catch {
        // quiet error
      }
    };

    loadInitial();

    setTimeout(() => {
      inputRef.current?.focus();
    }, 50);
  }, [isOpen]);

  // Live Query debounced search
  useEffect(() => {
    if (!query.trim()) {
      setSearchResults([]);
      setIsLoading(false);
      return;
    }

    setIsLoading(true);
    const handler = setTimeout(async () => {
      try {
        const res = await fetch(`/api/v1/search?q=${encodeURIComponent(query.trim())}&limit=8`);
        const json = await res.json();
        if (json.success) {
          setSearchResults(json.data.results);
          setSelectedIndex(0);
        }
      } catch {
        // Quiet handling
      } finally {
        setIsLoading(false);
      }
    }, 180);

    return () => clearTimeout(handler);
  }, [query]);

  // Filter commands locally based on query
  const filteredCommands = query.trim()
    ? commands.filter(
        (c) =>
          c.title.toLowerCase().includes(query.toLowerCase()) ||
          c.keywords?.some((k) => k.toLowerCase().includes(query.toLowerCase()))
      )
    : commands.slice(0, 6);

  const totalNavItems = filteredCommands.length + searchResults.length;

  const handleSelectHref = useCallback(
    (href: string, saveQueryTerm?: string) => {
      onClose();
      if (saveQueryTerm) {
        fetch("/api/v1/search/recent", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ query: saveQueryTerm }),
        }).catch(() => {});
      }
      router.push(href);
    },
    [onClose, router]
  );

  // Keyboard navigation (Arrow keys + Enter + Escape)
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      } else if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev + 1 < totalNavItems ? prev + 1 : 0));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) => (prev - 1 >= 0 ? prev - 1 : Math.max(0, totalNavItems - 1)));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (totalNavItems === 0 && query.trim()) {
          handleSelectHref(`/search?q=${encodeURIComponent(query.trim())}`, query.trim());
          return;
        }

        if (selectedIndex < filteredCommands.length) {
          const cmd = filteredCommands[selectedIndex];
          if (cmd && cmd.href) handleSelectHref(cmd.href);
        } else {
          const resultIndex = selectedIndex - filteredCommands.length;
          const res = searchResults[resultIndex];
          if (res) handleSelectHref(res.href, query.trim());
        }
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, selectedIndex, totalNavItems, filteredCommands, searchResults, query, handleSelectHref, onClose]);

  const copyToClipboard = (text: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(text);
    setCopiedRef(text);
    setTimeout(() => setCopiedRef(null), 2000);
  };

  const clearRecentSearches = async (e: React.MouseEvent) => {
    e.stopPropagation();
    await fetch("/api/v1/search/recent", { method: "DELETE" });
    setRecentSearches([]);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 sm:pt-20 p-3 sm:p-4">
      {/* Backdrop */}
      <div className="fixed inset-0 bg-charcoal/50 backdrop-blur-xs transition-opacity" onClick={onClose} />

      {/* Surface Overlay */}
      <div className="relative w-full max-w-2xl bg-offwhite rounded-xl shadow-2xl border border-walnut/20 z-10 overflow-hidden flex flex-col animate-in zoom-in-95 duration-150">
        {/* Search Header */}
        <div className="px-4 py-3.5 border-b border-walnut/15 flex items-center gap-3 bg-cream/70">
          <Search className="w-5 h-5 text-walnut shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Type a command or search PO-2026-0004, Project, Vendor, Client..."
            className="w-full text-sm sm:text-base font-medium bg-transparent border-none outline-none text-charcoal placeholder:text-walnut/50"
          />
          {isLoading && <Loader2 className="w-4 h-4 animate-spin text-gold shrink-0" />}
          <div className="flex items-center gap-1 shrink-0">
            <kbd className="px-2 py-1 text-[10px] font-mono font-medium text-walnut bg-offwhite border border-walnut/20 rounded shadow-2xs">
              ESC
            </kbd>
          </div>
        </div>

        {/* Results Container */}
        <div className="max-h-[60vh] overflow-y-auto p-2 space-y-3 divide-y divide-walnut/10">
          {/* Default / Empty state with Recent Searches & Quick Modules */}
          {!query.trim() && (
            <div className="p-2 space-y-4">
              {recentSearches.length > 0 && (
                <div>
                  <div className="flex items-center justify-between px-2 py-1">
                    <span className="text-[11px] font-bold tracking-wider text-walnut uppercase flex items-center gap-1.5">
                      <Clock className="w-3 h-3 text-gold" /> Recent Searches
                    </span>
                    <button
                      onClick={clearRecentSearches}
                      className="text-[11px] text-walnut hover:text-charcoal transition-colors cursor-pointer"
                    >
                      Clear
                    </button>
                  </div>
                  <div className="mt-1 flex flex-wrap gap-1.5 px-2">
                    {recentSearches.map((item) => (
                      <button
                        key={item.id}
                        onClick={() => setQuery(item.query)}
                        className="px-2.5 py-1 text-xs text-charcoal bg-cream/60 hover:bg-cream border border-walnut/15 rounded-md transition-colors font-medium flex items-center gap-1.5 cursor-pointer"
                      >
                        <span>{item.query}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Quick Navigation Commands */}
              <div>
                <span className="px-2 py-1 text-[11px] font-bold tracking-wider text-walnut uppercase flex items-center gap-1.5">
                  <Command className="w-3 h-3 text-gold" /> Quick Commands & Navigation
                </span>
                <div className="mt-1 space-y-0.5">
                  {commands.slice(0, 6).map((cmd, index) => {
                    const IconComponent = ICON_MAP[cmd.iconName] || FolderKanban;
                    const isSelected = selectedIndex === index;

                    return (
                      <div
                        key={cmd.id}
                        onClick={() => cmd.href && handleSelectHref(cmd.href)}
                        className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                          isSelected
                            ? "bg-gold-soft text-charcoal border border-gold/40 shadow-2xs"
                            : "hover:bg-cream/60 text-charcoal"
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className={`p-1.5 rounded-md ${isSelected ? "bg-gold text-charcoal font-bold" : "bg-cream text-walnut"}`}>
                            <IconComponent className="w-4 h-4" />
                          </div>
                          <div>
                            <span className="text-xs sm:text-sm font-bold">{cmd.title}</span>
                            {cmd.subtitle && <p className="text-[11px] text-walnut">{cmd.subtitle}</p>}
                          </div>
                        </div>
                        <ArrowRight className="w-3.5 h-3.5 text-walnut" />
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          )}

          {/* Search Query Mode */}
          {query.trim() && (
            <div className="space-y-4 pt-1">
              {/* Commands matching query */}
              {filteredCommands.length > 0 && (
                <div>
                  <span className="px-2 py-1 text-[11px] font-bold tracking-wider text-walnut uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3.5 h-3.5 text-gold" /> Commands & Actions
                  </span>
                  <div className="mt-1 space-y-0.5">
                    {filteredCommands.map((cmd, idx) => {
                      const IconComponent = ICON_MAP[cmd.iconName] || FolderKanban;
                      const isSelected = selectedIndex === idx;

                      return (
                        <div
                          key={cmd.id}
                          onClick={() => cmd.href && handleSelectHref(cmd.href)}
                          className={`flex items-center justify-between px-3 py-2 rounded-lg cursor-pointer transition-colors ${
                            isSelected
                              ? "bg-gold-soft text-charcoal border border-gold/40 shadow-2xs"
                              : "hover:bg-cream/60 text-charcoal"
                          }`}
                        >
                          <div className="flex items-center gap-2.5">
                            <div className={`p-1.5 rounded-md ${isSelected ? "bg-gold text-charcoal font-bold" : "bg-cream text-walnut"}`}>
                              <IconComponent className="w-3.5 h-3.5" />
                            </div>
                            <span className="text-xs sm:text-sm font-bold">{cmd.title}</span>
                          </div>
                          {cmd.category === "CREATE" && (
                            <span className="px-1.5 py-0.5 text-[10px] font-bold bg-gold text-charcoal rounded">
                              Action
                            </span>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* ERP Record Search Results */}
              <div>
                <div className="flex items-center justify-between px-2 py-1">
                  <span className="text-[11px] font-bold tracking-wider text-walnut uppercase flex items-center gap-1.5">
                    <Search className="w-3.5 h-3.5 text-gold" /> Search Results ({searchResults.length})
                  </span>
                  {searchResults.length > 0 && (
                    <button
                      onClick={() => handleSelectHref(`/search?q=${encodeURIComponent(query.trim())}`, query.trim())}
                      className="text-xs font-bold text-charcoal hover:text-gold transition-colors flex items-center gap-1 cursor-pointer"
                    >
                      View All on Search Page <ArrowRight className="w-3 h-3 text-gold" />
                    </button>
                  )}
                </div>

                {searchResults.length === 0 && !isLoading ? (
                  <div className="p-8 text-center">
                    <p className="text-xs text-charcoal font-medium">
                      No records matched <span className="font-bold">&quot;{query}&quot;</span>
                    </p>
                    <p className="text-[11px] text-walnut mt-1">
                      Try searching with exact reference numbers (e.g. PO-2026-0004, PROJ-2026-0001) or names.
                    </p>
                  </div>
                ) : (
                  <div className="mt-1 space-y-1">
                    {searchResults.map((item, resIdx) => {
                      const overallIdx = filteredCommands.length + resIdx;
                      const isSelected = selectedIndex === overallIdx;

                      return (
                        <div
                          key={`${item.type}-${item.id}`}
                          onClick={() => handleSelectHref(item.href, item.title)}
                          className={`p-3 rounded-lg border transition-all cursor-pointer group ${
                            isSelected
                              ? "bg-[#36302B] text-[#FAF6EF] border-[#36302B] shadow-md"
                              : "bg-cream/40 border-walnut/10 hover:border-walnut/30 hover:bg-cream"
                          }`}
                        >
                          <div className="flex items-start justify-between gap-3">
                            <div className="space-y-1">
                              <div className="flex items-center gap-2">
                                <span className={`text-xs font-mono font-bold px-1.5 py-0.5 rounded ${
                                  isSelected ? "bg-gold text-charcoal" : "bg-offwhite text-walnut border border-walnut/15"
                                }`}>
                                  {item.typeLabel}
                                </span>
                                <span className="text-sm font-bold tracking-tight">{item.title}</span>
                                <span className={`text-[11px] font-mono px-1.5 py-0.2 border rounded ${
                                  isSelected ? "border-walnut/40 text-cream" : "border-walnut/20 text-walnut bg-cream"
                                }`}>
                                  {item.referenceNo}
                                </span>
                              </div>
                              <p className={`text-xs ${isSelected ? "text-[#D8C9B9]" : "text-walnut"}`}>
                                {item.subtitle}
                              </p>

                              {/* Related Graph links */}
                              {item.relatedRecords && item.relatedRecords.length > 0 && (
                                <div className="flex items-center gap-2 pt-1">
                                  <span className={`text-[10px] uppercase font-bold ${isSelected ? "text-[#A8917D]" : "text-walnut"}`}>
                                    Related:
                                  </span>
                                  {item.relatedRecords.map((rel) => (
                                    <span
                                      key={rel.id}
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleSelectHref(rel.href);
                                      }}
                                      className={`text-[11px] font-medium underline hover:no-underline cursor-pointer ${
                                        isSelected ? "text-gold hover:text-gold-hover" : "text-charcoal hover:text-gold"
                                      }`}
                                    >
                                      {rel.type}: {rel.title}
                                    </span>
                                  ))}
                                </div>
                              )}
                            </div>

                            <div className="flex items-center gap-1.5 shrink-0">
                              <button
                                title="Copy Reference Number"
                                onClick={(e) => copyToClipboard(item.referenceNo, e)}
                                className={`p-1.5 rounded transition-colors ${
                                  isSelected ? "hover:bg-walnut/30 text-cream" : "hover:bg-offwhite text-walnut hover:text-charcoal"
                                }`}
                              >
                                {copiedRef === item.referenceNo ? (
                                  <Check className="w-3.5 h-3.5 text-gold" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                              <ChevronRight className={`w-4 h-4 ${isSelected ? "text-gold" : "text-walnut group-hover:text-charcoal"}`} />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer shortcuts helper */}
        <div className="px-4 py-2.5 bg-cream/70 border-t border-walnut/15 flex items-center justify-between text-[11px] text-walnut font-medium">
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-offwhite border border-walnut/20 rounded font-mono text-[10px] text-charcoal">↑</kbd> <kbd className="px-1.5 py-0.5 bg-offwhite border border-walnut/20 rounded font-mono text-[10px] text-charcoal">↓</kbd> Navigate</span>
            <span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 bg-offwhite border border-walnut/20 rounded font-mono text-[10px] text-charcoal">↵</kbd> Select</span>
          </div>
          <span className="font-semibold text-charcoal">ESPACIO ERP Command Center</span>
        </div>
      </div>
    </div>
  );
};
