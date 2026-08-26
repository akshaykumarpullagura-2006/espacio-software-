"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  FileText,
  UploadCloud,
  Search,
  Filter,
  Grid,
  List as ListIcon,
  Star,
  Trash2,
  Download,
  Eye,
  RotateCcw,
  Clock,
  Folder,
  CheckCircle2,
  X,
  File,
  FileCode,
  Image as ImageIcon,
  Sheet,
  Plus,
  RefreshCw,
  ExternalLink,
  ShieldCheck,
  Tag,
} from "lucide-react";
import { formatDate } from "@/lib/utils";

interface DocumentVersionItem {
  id: string;
  versionNumber: number;
  fileName: string;
  fileSize: number;
  mimeType: string;
  changeNote?: string | null;
  uploadedBy?: { id: string; fullName: string } | null;
  createdAt: string;
}

interface DocumentItem {
  id: string;
  referenceNo: string;
  name: string;
  description?: string | null;
  type: string;
  category: string;
  status: string;
  isFavorite: boolean;
  currentVersion: number;
  owner?: { id: string; fullName: string } | null;
  project?: { id: string; referenceNo: string; title: string } | null;
  versions?: DocumentVersionItem[];
  createdAt: string;
  updatedAt: string;
}

export default function DocumentsWorkspacePage() {
  const [viewMode, setViewMode] = useState<"LIST" | "GRID">("LIST");
  const [activeTab, setActiveTab] = useState<"ALL" | "RECENT" | "FAVORITES" | "TRASH">("ALL");

  const [categoryFilter, setCategoryFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");

  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Upload Queue Modal
  const [isUploadModalOpen, setIsUploadModalOpen] = useState(false);
  const [uploadFiles, setUploadFiles] = useState<File[]>([]);
  const [uploadCategory, setUploadCategory] = useState("GENERAL");
  const [uploadType, setUploadType] = useState("OTHER");
  const [uploadName, setUploadName] = useState("");
  const [uploadDesc, setUploadDesc] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Detail / Version History Modal
  const [selectedDoc, setSelectedDoc] = useState<DocumentItem | null>(null);

  const fetchDocuments = useCallback(async () => {
    setIsLoading(true);
    try {
      let url = `/api/v1/documents?tab=${activeTab}&limit=50`;
      if (categoryFilter !== "ALL") url += `&category=${categoryFilter}`;
      if (typeFilter !== "ALL") url += `&type=${typeFilter}`;
      if (searchQuery.trim()) url += `&search=${encodeURIComponent(searchQuery.trim())}`;

      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setDocuments(json.data.documents || []);
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoading(false);
    }
  }, [activeTab, categoryFilter, typeFilter, searchQuery]);

  useEffect(() => {
    fetchDocuments();
  }, [fetchDocuments]);

  const handleUploadSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (uploadFiles.length === 0 || !uploadName.trim()) return;

    setIsSubmitting(true);
    try {
      const formData = new FormData();
      formData.append("file", uploadFiles[0]);
      formData.append("name", uploadName.trim());
      formData.append("description", uploadDesc.trim());
      formData.append("category", uploadCategory);
      formData.append("type", uploadType);

      const res = await fetch("/api/v1/documents", {
        method: "POST",
        body: formData,
      });

      const json = await res.json();
      if (json.success) {
        setIsUploadModalOpen(false);
        setUploadFiles([]);
        setUploadName("");
        setUploadDesc("");
        fetchDocuments();
      }
    } catch {
      // Quiet handling
    } finally {
      setIsSubmitting(false);
    }
  };

  const toggleFavorite = async (docId: string) => {
    try {
      await fetch(`/api/v1/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ toggleFavorite: true }),
      });
      setDocuments((prev) =>
        prev.map((d) => (d.id === docId ? { ...d, isFavorite: !d.isFavorite } : d))
      );
    } catch {
      // Quiet handling
    }
  };

  const moveToTrash = async (docId: string) => {
    try {
      await fetch(`/api/v1/documents/${docId}`, { method: "DELETE" });
      fetchDocuments();
    } catch {
      // Quiet handling
    }
  };

  const restoreFromTrash = async (docId: string) => {
    try {
      await fetch(`/api/v1/documents/${docId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "RESTORE_FROM_TRASH" }),
      });
      fetchDocuments();
    } catch {
      // Quiet handling
    }
  };

  const handleDownload = async (version: DocumentVersionItem) => {
    try {
      // Obtain token mock or direct stream token request
      const downloadUrl = `/api/v1/files/${version.id}/download?token=${encodeURIComponent("demo_token")}`;
      window.open(downloadUrl, "_blank");
    } catch {
      // Quiet handling
    }
  };

  const restoreVersion = async (docId: string, versionNumber: number) => {
    try {
      await fetch(`/api/v1/documents/${docId}/restore`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ versionNumber }),
      });
      // Refresh details
      const res = await fetch(`/api/v1/documents/${docId}`);
      const json = await res.json();
      if (json.success) {
        setSelectedDoc(json.data);
        fetchDocuments();
      }
    } catch {
      // Quiet handling
    }
  };

  const getFileIcon = (mimeType?: string, type?: string) => {
    if (mimeType?.includes("image") || type === "IMAGE") {
      return <ImageIcon className="w-5 h-5 text-purple-600" />;
    }
    if (mimeType?.includes("pdf") || type === "CONTRACT" || type === "QUOTATION") {
      return <FileText className="w-5 h-5 text-rose-600" />;
    }
    if (mimeType?.includes("spreadsheet") || mimeType?.includes("excel") || type === "REPORT") {
      return <Sheet className="w-5 h-5 text-emerald-600" />;
    }
    return <File className="w-5 h-5 text-blue-600" />;
  };

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 B";
    const k = 1024;
    const sizes = ["B", "KB", "MB", "GB"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + " " + sizes[i];
  };

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-walnut/15 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Folder className="w-6 h-6 text-gold" />
            <h1 className="text-xl font-bold text-charcoal tracking-tight">Documents & Files Workspace</h1>
          </div>
          <p className="text-xs text-walnut mt-1">
            Centralized digital file repository with storage abstraction, version control, and multi-entity links.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsUploadModalOpen(true)}
            className="px-3.5 py-1.5 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <UploadCloud className="w-4 h-4" /> Upload Document
          </button>
        </div>
      </div>

      {/* Tabs & View Switcher Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-walnut/15">
        <div className="flex items-center gap-6">
          <button
            onClick={() => setActiveTab("ALL")}
            className={`pb-3 text-sm font-bold border-b-2 transition-colors flex items-center gap-2 cursor-pointer ${
              activeTab === "ALL"
                ? "border-gold text-charcoal"
                : "border-transparent text-walnut hover:text-charcoal"
            }`}
          >
            <Folder className="w-4 h-4" /> All Documents
          </button>

          <button
            onClick={() => setActiveTab("RECENT")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "RECENT"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Clock className="w-4 h-4" /> Recent Uploads
          </button>

          <button
            onClick={() => setActiveTab("FAVORITES")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "FAVORITES"
                ? "border-emerald-600 text-emerald-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Star className="w-4 h-4" /> Favorites
          </button>

          <button
            onClick={() => setActiveTab("TRASH")}
            className={`pb-3 text-sm font-semibold border-b-2 transition-colors flex items-center gap-2 ${
              activeTab === "TRASH"
                ? "border-rose-600 text-rose-600"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <Trash2 className="w-4 h-4" /> Trash
          </button>
        </div>

        <div className="flex items-center gap-2 mb-2">
          <div className="flex items-center border border-slate-300 rounded-lg overflow-hidden bg-slate-100 p-0.5">
            <button
              onClick={() => setViewMode("LIST")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "LIST" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="List View"
            >
              <ListIcon className="w-4 h-4" />
            </button>
            <button
              onClick={() => setViewMode("GRID")}
              className={`p-1.5 rounded-md transition-colors ${
                viewMode === "GRID" ? "bg-white text-slate-900 shadow-2xs" : "text-slate-500 hover:text-slate-900"
              }`}
              title="Grid View"
            >
              <Grid className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={fetchDocuments}
            className="p-1.5 text-slate-400 hover:text-slate-600 rounded-md hover:bg-slate-100 transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Filter Bar */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search by DOC reference, name, or description..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Categories</option>
            <option value="PROJECT">Project</option>
            <option value="FINANCE">Finance</option>
            <option value="PROCUREMENT">Procurement</option>
            <option value="CRM">CRM</option>
            <option value="INVENTORY">Inventory</option>
            <option value="TASKS">Tasks</option>
            <option value="GENERAL">General</option>
          </select>

          <select
            value={typeFilter}
            onChange={(e) => setTypeFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
          >
            <option value="ALL">All Types</option>
            <option value="CONTRACT">Contract</option>
            <option value="QUOTATION">Quotation</option>
            <option value="INVOICE">Invoice</option>
            <option value="RECEIPT">Receipt</option>
            <option value="DRAWING">Drawing</option>
            <option value="SPECIFICATION">Specification</option>
            <option value="REPORT">Report</option>
            <option value="IMAGE">Image</option>
            <option value="OTHER">Other</option>
          </select>
        </div>
      </div>

      {/* DOCUMENT LIST VIEW */}
      {viewMode === "LIST" ? (
        <div className="bg-white rounded-xl border border-slate-200 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/50">
                  <th className="py-3 px-4 font-bold text-slate-700">Reference</th>
                  <th className="py-3 px-4 font-bold text-slate-700">Document Name</th>
                  <th className="py-3 px-4 font-bold text-slate-700">Category / Type</th>
                  <th className="py-3 px-4 font-bold text-slate-700">Version</th>
                  <th className="py-3 px-4 font-bold text-slate-700">Owner</th>
                  <th className="py-3 px-4 font-bold text-slate-700">Size</th>
                  <th className="py-3 px-4 font-bold text-slate-700">Updated</th>
                  <th className="py-3 px-4 font-bold text-slate-700 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-400">
                      Loading document repository...
                    </td>
                  </tr>
                ) : documents.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="p-12 text-center text-slate-500">
                      No documents match the active filters.
                    </td>
                  </tr>
                ) : (
                  documents.map((doc) => {
                    const latestVer = doc.versions && doc.versions[0];
                    return (
                      <tr
                        key={doc.id}
                        onClick={() => setSelectedDoc(doc)}
                        className="hover:bg-slate-50/70 cursor-pointer transition-colors"
                      >
                        <td className="py-3 px-4 font-mono font-bold text-slate-900">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleFavorite(doc.id);
                              }}
                              className={`p-0.5 hover:text-amber-500 ${
                                doc.isFavorite ? "text-amber-500 fill-amber-500" : "text-slate-300"
                              }`}
                            >
                              <Star className="w-3.5 h-3.5" />
                            </button>
                            {doc.referenceNo}
                          </div>
                        </td>
                        <td className="py-3 px-4 font-semibold text-slate-900 max-w-xs">
                          <div className="flex items-center gap-2">
                            {getFileIcon(latestVer?.mimeType, doc.type)}
                            <span className="truncate">{doc.name}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 text-slate-600">
                          <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-slate-100 text-slate-700">
                            {doc.category} • {doc.type}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-emerald-100 text-emerald-800">
                            v{doc.currentVersion}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-slate-700">
                          {doc.owner ? doc.owner.fullName : <span className="text-slate-400">-</span>}
                        </td>
                        <td className="py-3 px-4 text-slate-600 font-mono">
                          {latestVer ? formatBytes(latestVer.fileSize) : "-"}
                        </td>
                        <td className="py-3 px-4 text-slate-600">{formatDate(doc.updatedAt)}</td>
                        <td className="py-3 px-4 text-right">
                          {activeTab === "TRASH" ? (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                restoreFromTrash(doc.id);
                              }}
                              className="px-2.5 py-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded-md transition-colors flex items-center gap-1 ml-auto"
                            >
                              <RotateCcw className="w-3 h-3" /> Restore
                            </button>
                          ) : (
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                moveToTrash(doc.id);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 rounded-md hover:bg-rose-50 transition-colors"
                              title="Move to Trash"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* DOCUMENT GRID VIEW */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {isLoading ? (
            <div className="col-span-full p-12 text-center text-xs text-slate-400">
              Loading document grid...
            </div>
          ) : documents.length === 0 ? (
            <div className="col-span-full p-12 text-center text-xs text-slate-500">
              No documents found.
            </div>
          ) : (
            documents.map((doc) => {
              const latestVer = doc.versions && doc.versions[0];
              return (
                <div
                  key={doc.id}
                  onClick={() => setSelectedDoc(doc)}
                  className="bg-white p-4 rounded-xl border border-slate-200 shadow-2xs hover:shadow-md transition-all cursor-pointer space-y-3 flex flex-col justify-between"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="p-2.5 bg-slate-100 rounded-lg">{getFileIcon(latestVer?.mimeType, doc.type)}</div>
                    <span className="font-mono text-[10px] font-bold px-1.5 py-0.5 bg-slate-100 text-slate-700 rounded">
                      v{doc.currentVersion}
                    </span>
                  </div>

                  <div className="space-y-1">
                    <span className="font-mono text-[10px] font-bold text-slate-400 block">{doc.referenceNo}</span>
                    <h3 className="text-xs font-bold text-slate-900 truncate">{doc.name}</h3>
                  </div>

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-2 border-t border-slate-100">
                    <span>{doc.category}</span>
                    <span>{latestVer ? formatBytes(latestVer.fileSize) : "-"}</span>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}

      {/* UPLOAD DOCUMENT MODAL */}
      {isUploadModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <h3 className="text-sm font-semibold text-slate-900 flex items-center gap-2">
                <UploadCloud className="w-4 h-4 text-emerald-600" /> Upload Enterprise Document
              </h3>
              <button
                onClick={() => setIsUploadModalOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleUploadSubmit} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Select File <span className="text-rose-500">*</span>
                </label>
                <input
                  type="file"
                  required
                  onChange={(e) => {
                    if (e.target.files && e.target.files.length > 0) {
                      setUploadFiles(Array.from(e.target.files));
                      if (!uploadName) {
                        setUploadName(e.target.files[0].name.replace(/\.[^/.]+$/, ""));
                      }
                    }
                  }}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Document Title <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Electrical Layout Agreement V2"
                  value={uploadName}
                  onChange={(e) => setUploadName(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Category</label>
                  <select
                    value={uploadCategory}
                    onChange={(e) => setUploadCategory(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="PROJECT">Project</option>
                    <option value="FINANCE">Finance</option>
                    <option value="PROCUREMENT">Procurement</option>
                    <option value="CRM">CRM</option>
                    <option value="INVENTORY">Inventory</option>
                    <option value="TASKS">Tasks</option>
                    <option value="GENERAL">General</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Document Type</label>
                  <select
                    value={uploadType}
                    onChange={(e) => setUploadType(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg bg-white focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  >
                    <option value="CONTRACT">Contract</option>
                    <option value="QUOTATION">Quotation</option>
                    <option value="INVOICE">Invoice</option>
                    <option value="RECEIPT">Receipt</option>
                    <option value="DRAWING">Drawing</option>
                    <option value="SPECIFICATION">Specification</option>
                    <option value="REPORT">Report</option>
                    <option value="IMAGE">Image</option>
                    <option value="OTHER">Other</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Notes</label>
                <textarea
                  rows={2}
                  placeholder="Additional context or reference instructions..."
                  value={uploadDesc}
                  onChange={(e) => setUploadDesc(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              <div className="pt-3 border-t border-walnut/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsUploadModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-walnut hover:bg-cream rounded-lg transition-colors border border-walnut/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Uploading..." : "Save & Upload"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* DOCUMENT DETAIL & VERSION HISTORY MODAL */}
      {selectedDoc && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-slate-900/40 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-slate-200 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-2 py-0.5 bg-slate-200 text-slate-800 rounded">
                  {selectedDoc.referenceNo}
                </span>
                <span className="text-xs font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  v{selectedDoc.currentVersion}
                </span>
              </div>
              <button
                onClick={() => setSelectedDoc(null)}
                className="p-1 text-slate-400 hover:text-slate-600 rounded-md"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-6">
              <div>
                <h2 className="text-base font-bold text-slate-900">{selectedDoc.name}</h2>
                <p className="text-xs text-slate-500 mt-1">
                  Category: <span className="font-semibold text-slate-700">{selectedDoc.category}</span> • Type: <span className="font-semibold text-slate-700">{selectedDoc.type}</span>
                </p>
                {selectedDoc.description && (
                  <p className="text-xs text-slate-600 mt-2 bg-slate-50 p-3 rounded-lg border border-slate-100">
                    {selectedDoc.description}
                  </p>
                )}
              </div>

              {/* Version History Section */}
              <div className="space-y-3 pt-3 border-t border-slate-100">
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Clock className="w-4 h-4 text-emerald-600" /> Immutable Version History
                </h4>
                <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
                  {selectedDoc.versions && selectedDoc.versions.length > 0 ? (
                    selectedDoc.versions.map((ver) => (
                      <div key={ver.id} className="p-3 bg-white flex items-center justify-between gap-4 text-xs">
                        <div className="space-y-0.5">
                          <div className="flex items-center gap-2">
                            <span className="font-mono font-bold text-slate-900">v{ver.versionNumber}</span>
                            <span className="text-slate-600 font-medium">{ver.fileName}</span>
                            <span className="text-slate-400 font-mono">({formatBytes(ver.fileSize)})</span>
                          </div>
                          <p className="text-[10px] text-slate-400">
                            Uploaded by {ver.uploadedBy ? ver.uploadedBy.fullName : "User"} on {formatDate(ver.createdAt)}
                          </p>
                          {ver.changeNote && <p className="text-[10px] text-slate-600 italic">&quot;{ver.changeNote}&quot;</p>}
                        </div>

                        <div className="flex items-center gap-2 shrink-0">
                          {ver.versionNumber !== selectedDoc.currentVersion && (
                            <button
                              onClick={() => restoreVersion(selectedDoc.id, ver.versionNumber)}
                              className="px-2.5 py-1 text-[10px] font-semibold text-amber-800 bg-amber-50 hover:bg-amber-100 border border-amber-200 rounded transition-colors flex items-center gap-1"
                              title="Restore content from this version as new current version"
                            >
                              <RotateCcw className="w-3 h-3" /> Restore v{ver.versionNumber}
                            </button>
                          )}
                          <button
                            onClick={() => handleDownload(ver)}
                            className="px-2.5 py-1 text-[10px] font-semibold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200 rounded transition-colors flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" /> Download
                          </button>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="p-4 text-center text-xs text-slate-400">No version history records.</div>
                  )}
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-100 bg-slate-50 flex items-center justify-between text-xs text-slate-500">
              <span>Created {formatDate(selectedDoc.createdAt)}</span>
              <button
                onClick={() => setSelectedDoc(null)}
                className="px-4 py-1.5 font-semibold text-slate-700 bg-white hover:bg-slate-100 border border-slate-200 rounded-md"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
