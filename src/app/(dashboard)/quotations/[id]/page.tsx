"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import {
  ArrowLeft,
  FileText,
  Printer,
  Edit,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Eye,
  Calendar,
  Building2,
  User,
  FolderKanban,
  Send,
  Layers,
  Sparkles,
  ShieldCheck,
  Clock,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge, BadgeVariant } from "@/components/ui/badge";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Modal } from "@/components/ui/modal";
import { usePermissions } from "@/components/providers/permissions-provider";

interface QuotationDetail {
  id: string;
  referenceNo: string;
  title: string;
  revision: number;
  status: string;
  subtotal: number;
  discountType: string | null;
  discountValue: number;
  discountAmount: number;
  adjustmentAmount: number;
  adjustmentReason: string | null;
  taxRate: number;
  taxAmount: number;
  totalAmount: number;
  validityDate: string | null;
  approvedAt: string | null;
  approvedById: string | null;
  clientApprovedName: string | null;
  approvalNotes: string | null;
  sentAt: string | null;
  termsAndConditions: string | null;
  notes: string | null;
  internalNotes?: string | null;
  createdAt: string;
  updatedAt: string;
  lead: {
    id: string;
    referenceNo: string;
    clientName: string;
    phone: string;
    email: string | null;
    location: string | null;
    stage: string;
  } | null;
  client: {
    id: string;
    referenceNo: string;
    fullName: string;
    phone: string;
    email: string | null;
    address: string | null;
    city: string | null;
    state: string | null;
    gstin: string | null;
  } | null;
  project: {
    id: string;
    referenceNo: string;
    title: string;
    stage: string;
    contractValue: number;
    siteAddress: string | null;
  } | null;
  createdBy: { id: string; fullName: string; email: string } | null;
  approvedBy: { id: string; fullName: string; email: string } | null;
  parentQuotation: {
    id: string;
    referenceNo: string;
    revision: number;
    totalAmount: number;
    status: string;
    createdAt: string;
  } | null;
  childRevisions: Array<{
    id: string;
    referenceNo: string;
    revision: number;
    totalAmount: number;
    status: string;
    createdAt: string;
  }>;
  items: Array<{
    id: string;
    room: string;
    category: string;
    itemType: string;
    itemDescription: string;
    specifications: string | null;
    length: number | null;
    height: number | null;
    quantity: number;
    unitKey: string;
    unitRate: number;
    internalCostRate?: number | null;
    discountAmount: number;
    totalAmount: number;
    sortOrder: number;
  }>;
  roomGroups: Array<{
    room: string;
    subtotal: number;
    items: Array<any>;
  }>;
}

export default function QuotationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const quoteId = params.id as string;
  const { can, isSuperAdmin, isAdmin } = usePermissions();

  const [quotation, setQuotation] = useState<QuotationDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const [activeTab, setActiveTab] = useState<"BOQ" | "REVISIONS" | "TERMS" | "APPROVAL">("BOQ");

  // Modals
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [approverName, setApproverName] = useState("");
  const [approvalNotes, setApprovalNotes] = useState("");
  const [approving, setApproving] = useState(false);

  const [showReviseModal, setShowReviseModal] = useState(false);
  const [revisionNotes, setRevisionNotes] = useState("");
  const [revising, setRevising] = useState(false);

  const [showStatusModal, setShowStatusModal] = useState(false);
  const [newStatus, setNewStatus] = useState("");
  const [statusNotes, setStatusNotes] = useState("");
  const [updatingStatus, setUpdatingStatus] = useState(false);

  const canApprove = isSuperAdmin || isAdmin || can("quotations:approve");
  const canManagePricing = isSuperAdmin || can("quotations:manage_pricing");

  const fetchQuotation = useCallback(async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/v1/quotations/${quoteId}`);
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to load quotation");
      }
      setQuotation(json.data);
    } catch (err: any) {
      setErrorMsg(err.message || "Failed to load quotation details");
    } finally {
      setLoading(false);
    }
  }, [quoteId]);

  useEffect(() => {
    fetchQuotation();
  }, [fetchQuotation]);

  const handleApprove = async () => {
    try {
      setApproving(true);
      const res = await fetch(`/api/v1/quotations/${quoteId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          clientApprovedName: approverName || quotation?.client?.fullName || quotation?.lead?.clientName,
          approvalNotes,
        }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to approve quotation");
      }
      setShowApproveModal(false);
      fetchQuotation();
    } catch (err: any) {
      alert(err.message || "Approval failed");
    } finally {
      setApproving(false);
    }
  };

  const handleRevise = async () => {
    try {
      setRevising(true);
      const res = await fetch(`/api/v1/quotations/${quoteId}/revise`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ notes: revisionNotes }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to revise quotation");
      }
      setShowReviseModal(false);
      router.push(`/quotations/${json.data.id}`);
    } catch (err: any) {
      alert(err.message || "Revision failed");
    } finally {
      setRevising(false);
    }
  };

  const handleStatusChange = async () => {
    try {
      setUpdatingStatus(true);
      const res = await fetch(`/api/v1/quotations/${quoteId}/status`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus, notes: statusNotes }),
      });
      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to update status");
      }
      setShowStatusModal(false);
      fetchQuotation();
    } catch (err: any) {
      alert(err.message || "Status update failed");
    } finally {
      setUpdatingStatus(false);
    }
  };

  const getStatusBadgeVariant = (status: string): BadgeVariant => {
    switch (status) {
      case "APPROVED":
        return "completed";
      case "SENT":
      case "READY_TO_SEND":
        return "active";
      case "INTERNAL_REVIEW":
      case "NEGOTIATION":
        return "pending";
      case "REJECTED":
      case "CANCELLED":
        return "danger";
      case "DRAFT":
      case "SUPERSEDED":
      default:
        return "neutral";
    }
  };

  if (loading) {
    return (
      <div className="p-12 text-center text-slate-500">
        <div className="animate-spin w-8 h-8 border-3 border-emerald-600 border-t-transparent rounded-full mx-auto mb-3" />
        <p className="text-sm font-medium">Hydrating Quotation & BOQ details...</p>
      </div>
    );
  }

  if (errorMsg || !quotation) {
    return (
      <div className="p-8 max-w-2xl mx-auto text-center space-y-4">
        <div className="w-12 h-12 bg-red-50 text-red-600 rounded-full flex items-center justify-center mx-auto">
          <AlertCircle className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-900">Quotation Not Found</h2>
        <p className="text-sm text-slate-500">{errorMsg || "The requested quotation record could not be loaded."}</p>
        <Link href="/quotations">
          <Button variant="outline" size="sm">
            Back to Directory
          </Button>
        </Link>
      </div>
    );
  }

  const clientName = quotation.client?.fullName || quotation.lead?.clientName || "Direct Prospect";
  const isEditable = ["DRAFT", "INTERNAL_REVIEW", "NEGOTIATION"].includes(quotation.status);

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header Hub */}
      <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div className="flex items-center gap-4">
            <Link href="/quotations">
              <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-slate-600">
                <ArrowLeft className="w-4 h-4" />
              </Button>
            </Link>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-2xl font-bold text-slate-900 font-mono tracking-tight">
                  {quotation.referenceNo}
                </h1>
                <span className="text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                  Version {quotation.revision}
                </span>
                <Badge variant={getStatusBadgeVariant(quotation.status)}>
                  {quotation.status}
                </Badge>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                {quotation.title} &bull; Prepared by {quotation.createdBy?.fullName || "System"} on{" "}
                {new Date(quotation.createdAt).toLocaleDateString("en-IN", {
                  day: "2-digit",
                  month: "short",
                  year: "numeric",
                })}
              </p>
            </div>
          </div>

          {/* Top Actions */}
          <div className="flex flex-wrap items-center gap-2">
            <a href={`/api/v1/quotations/${quotation.id}/pdf`} target="_blank" rel="noopener noreferrer">
              <Button variant="outline" size="sm" className="gap-1.5 text-xs text-slate-700 hover:text-emerald-700">
                <Printer className="w-3.5 h-3.5" />
                Print / PDF
              </Button>
            </a>

            {/* Status Change Button */}
            {quotation.status !== "APPROVED" && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setNewStatus(quotation.status);
                  setShowStatusModal(true);
                }}
                className="gap-1.5 text-xs text-slate-700"
              >
                <Send className="w-3.5 h-3.5" />
                Status
              </Button>
            )}

            {/* Revision Button */}
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowReviseModal(true)}
              className="gap-1.5 text-xs text-blue-700 hover:bg-blue-50 border-blue-200"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Create Revision (v{quotation.revision + 1})
            </Button>

            {/* Approve Button */}
            {canApprove && quotation.status !== "APPROVED" && (
              <Button
                size="sm"
                onClick={() => {
                  setApproverName(clientName);
                  setShowApproveModal(true);
                }}
                className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-semibold shadow-sm"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                Approve Quotation
              </Button>
            )}
          </div>
        </div>

        {/* Client & Project Bar */}
        <div className="pt-4 border-t border-slate-100 grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400">Client:</span>{" "}
              <strong className="text-slate-800">{clientName}</strong>
              {quotation.client?.phone && <span className="text-slate-500 ml-1">({quotation.client.phone})</span>}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <FolderKanban className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400">Project / Scope:</span>{" "}
              {quotation.project ? (
                <Link href={`/projects`} className="text-purple-700 font-semibold hover:underline">
                  {quotation.project.referenceNo} ({quotation.project.title})
                </Link>
              ) : quotation.lead ? (
                <Link href={`/leads`} className="text-amber-700 font-semibold hover:underline">
                  Lead: {quotation.lead.referenceNo}
                </Link>
              ) : (
                <span className="text-slate-600">Standalone Proposal</span>
              )}
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-400 shrink-0" />
            <div>
              <span className="text-slate-400">Validity:</span>{" "}
              <span className="text-slate-700 font-medium">
                {quotation.validityDate
                  ? new Date(quotation.validityDate).toLocaleDateString("en-IN", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })
                  : "30 Days"}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Main Tab Navigation */}
      <div className="flex items-center gap-2 border-b border-slate-200">
        <button
          onClick={() => setActiveTab("BOQ")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "BOQ"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <Layers className="w-4 h-4" />
          BOQ & Line Items ({quotation.items.length})
        </button>

        <button
          onClick={() => setActiveTab("REVISIONS")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "REVISIONS"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <RotateCcw className="w-4 h-4" />
          Revision History ({1 + quotation.childRevisions.length})
        </button>

        <button
          onClick={() => setActiveTab("TERMS")}
          className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
            activeTab === "TERMS"
              ? "border-emerald-600 text-emerald-700"
              : "border-transparent text-slate-500 hover:text-slate-900"
          }`}
        >
          <FileText className="w-4 h-4" />
          Terms & Milestones
        </button>

        {quotation.status === "APPROVED" && (
          <button
            onClick={() => setActiveTab("APPROVAL")}
            className={`px-4 py-2.5 text-xs font-semibold border-b-2 transition-all flex items-center gap-1.5 ${
              activeTab === "APPROVAL"
                ? "border-emerald-600 text-emerald-700"
                : "border-transparent text-slate-500 hover:text-slate-900"
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Approval Sign-off
          </button>
        )}
      </div>

      {/* Tab 1: BOQ & Items Content */}
      {activeTab === "BOQ" && (
        <div className="space-y-6">
          {quotation.roomGroups.map((group, gIdx) => (
            <Card key={group.room} className="border-slate-200 shadow-2xs overflow-hidden">
              <CardHeader className="py-3 px-5 bg-slate-900 text-white flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-bold tracking-wide">
                  {gIdx + 1}. {group.room.toUpperCase()}
                </CardTitle>
                <div className="font-mono text-xs font-semibold text-emerald-400">
                  Subtotal: ₹{group.subtotal.toLocaleString("en-IN")}
                </div>
              </CardHeader>

              <CardContent className="p-0 overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                      <th className="py-2.5 px-3 w-10 text-center">#</th>
                      <th className="py-2.5 px-4">Description & Specs</th>
                      <th className="py-2.5 px-3">Trade</th>
                      <th className="py-2.5 px-3 text-center">Qty / Area</th>
                      <th className="py-2.5 px-3 text-center">Unit</th>
                      <th className="py-2.5 px-3 text-right">Rate (₹)</th>
                      <th className="py-2.5 px-3 text-right">Disc (₹)</th>
                      <th className="py-2.5 px-4 text-right">Total (₹)</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {group.items.map((item, idx) => (
                      <tr key={item.id} className="hover:bg-slate-50/50">
                        <td className="py-3 px-3 text-center text-slate-400 font-mono">{idx + 1}</td>
                        <td className="py-3 px-4">
                          <strong className="text-slate-900 text-xs">{item.itemDescription}</strong>
                          {item.specifications && (
                            <p className="text-2xs text-slate-500 mt-0.5">{item.specifications}</p>
                          )}
                          {item.length && item.height && (
                            <span className="inline-block mt-1 text-2xs text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded font-mono border border-emerald-200">
                              Dim: {item.length} ft &times; {item.height} ft
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-3 text-slate-600">{item.category}</td>
                        <td className="py-3 px-3 text-center font-mono font-semibold text-slate-800">
                          {item.quantity}
                        </td>
                        <td className="py-3 px-3 text-center text-slate-600">{item.unitKey}</td>
                        <td className="py-3 px-3 text-right font-mono text-slate-800">
                          {item.unitRate.toLocaleString("en-IN")}
                        </td>
                        <td className="py-3 px-3 text-right font-mono text-red-600">
                          {item.discountAmount > 0 ? `-${item.discountAmount.toLocaleString("en-IN")}` : "0"}
                        </td>
                        <td className="py-3 px-4 text-right font-mono font-bold text-slate-900">
                          ₹{item.totalAmount.toLocaleString("en-IN")}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </CardContent>
            </Card>
          ))}

          {/* Financial Totals Summary Card */}
          <div className="flex justify-end">
            <Card className="w-full sm:w-96 border-slate-200 shadow-2xs">
              <CardHeader className="py-3 px-4 bg-slate-50 border-b border-slate-200">
                <CardTitle className="text-xs font-bold uppercase tracking-wider text-slate-700">
                  Financial Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="p-4 space-y-2 text-xs">
                <div className="flex justify-between text-slate-600">
                  <span>BOQ Gross Subtotal:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    ₹{quotation.subtotal.toLocaleString("en-IN")}
                  </span>
                </div>

                {quotation.discountAmount > 0 && (
                  <div className="flex justify-between text-red-600">
                    <span>
                      Quotation Discount {quotation.discountType === "PERCENTAGE" ? `(${quotation.discountValue}%)` : ""}:
                    </span>
                    <span className="font-mono font-semibold">
                      -₹{quotation.discountAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                <div className="flex justify-between text-slate-600">
                  <span>Taxable Value:</span>
                  <span className="font-mono font-semibold text-slate-800">
                    ₹{Math.max(0, quotation.subtotal - quotation.discountAmount).toLocaleString("en-IN")}
                  </span>
                </div>

                {quotation.taxAmount > 0 && (
                  <div className="flex justify-between text-slate-600">
                    <span>GST ({quotation.taxRate}%):</span>
                    <span className="font-mono font-semibold text-slate-800">
                      ₹{quotation.taxAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                {quotation.adjustmentAmount !== 0 && (
                  <div className="flex justify-between text-amber-700">
                    <span>
                      Adjustment {quotation.adjustmentReason ? `(${quotation.adjustmentReason})` : ""}:
                    </span>
                    <span className="font-mono font-semibold">
                      {quotation.adjustmentAmount > 0 ? "+" : ""}₹
                      {quotation.adjustmentAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}

                <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-sm font-bold text-slate-900">
                  <span>Final Grand Total:</span>
                  <span className="font-mono text-base text-emerald-700">
                    ₹{quotation.totalAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Tab 2: Revision History */}
      {activeTab === "REVISIONS" && (
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="py-4 px-6 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              Quotation Version History & Timeline
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6">
            <div className="space-y-4">
              {/* Parent Quotation (if this is a revised version) */}
              {quotation.parentQuotation && (
                <div className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">
                        {quotation.parentQuotation.referenceNo}
                      </span>
                      <span className="text-2xs bg-slate-200 px-1.5 py-0.2 rounded font-semibold text-slate-700">
                        v{quotation.parentQuotation.revision}
                      </span>
                      <Badge variant="neutral">{quotation.parentQuotation.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Created on {new Date(quotation.parentQuotation.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-800 text-sm">
                      ₹{quotation.parentQuotation.totalAmount.toLocaleString("en-IN")}
                    </div>
                    <Link href={`/quotations/${quotation.parentQuotation.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-2xs mt-1">
                        View Predecessor
                      </Button>
                    </Link>
                  </div>
                </div>
              )}

              {/* Current Active Quotation */}
              <div className="p-4 bg-emerald-50/60 border-2 border-emerald-500 rounded-xl flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-emerald-950 text-base">
                      {quotation.referenceNo}
                    </span>
                    <span className="text-xs bg-emerald-200 text-emerald-900 px-2 py-0.5 rounded font-bold">
                      Current Version (v{quotation.revision})
                    </span>
                    <Badge variant={getStatusBadgeVariant(quotation.status)}>{quotation.status}</Badge>
                  </div>
                  <p className="text-xs text-emerald-800 mt-1">
                    Created on {new Date(quotation.createdAt).toLocaleDateString("en-IN")} by{" "}
                    {quotation.createdBy?.fullName || "Staff"}
                  </p>
                </div>

                <div className="text-right">
                  <div className="font-mono font-black text-emerald-800 text-base">
                    ₹{quotation.totalAmount.toLocaleString("en-IN")}
                  </div>
                </div>
              </div>

              {/* Child Revisions */}
              {quotation.childRevisions.map((child) => (
                <div
                  key={child.id}
                  className="p-4 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-slate-800">{child.referenceNo}</span>
                      <span className="text-2xs bg-blue-100 text-blue-700 px-1.5 py-0.2 rounded font-semibold">
                        v{child.revision}
                      </span>
                      <Badge variant={getStatusBadgeVariant(child.status)}>{child.status}</Badge>
                    </div>
                    <p className="text-xs text-slate-500 mt-1">
                      Created on {new Date(child.createdAt).toLocaleDateString("en-IN")}
                    </p>
                  </div>

                  <div className="text-right">
                    <div className="font-mono font-bold text-slate-800 text-sm">
                      ₹{child.totalAmount.toLocaleString("en-IN")}
                    </div>
                    <Link href={`/quotations/${child.id}`}>
                      <Button variant="outline" size="sm" className="h-7 text-2xs mt-1">
                        View Version
                      </Button>
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Tab 3: Terms & Notes */}
      {activeTab === "TERMS" && (
        <Card className="border-slate-200 shadow-2xs">
          <CardHeader className="py-4 px-6 border-b border-slate-100">
            <CardTitle className="text-sm font-bold text-slate-800">
              Commercial Terms, Notes & Milestone Schedule
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-6 text-xs">
            <div>
              <h4 className="font-semibold text-slate-800 uppercase tracking-wider mb-2">
                Payment Milestones & Commercial Conditions
              </h4>
              <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 font-mono whitespace-pre-wrap text-slate-700">
                {quotation.termsAndConditions || "Standard ESPACIO milestone conditions apply."}
              </div>
            </div>

            {quotation.notes && (
              <div>
                <h4 className="font-semibold text-slate-800 uppercase tracking-wider mb-2">Client Notes</h4>
                <div className="p-4 bg-slate-50 rounded-lg border border-slate-200 text-slate-700">
                  {quotation.notes}
                </div>
              </div>
            )}

            {canManagePricing && quotation.internalNotes && (
              <div>
                <h4 className="font-semibold text-amber-800 uppercase tracking-wider mb-2">
                  Internal Team Notes (Private)
                </h4>
                <div className="p-4 bg-amber-50 rounded-lg border border-amber-200 text-amber-900">
                  {quotation.internalNotes}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Tab 4: Approval Sign-off */}
      {activeTab === "APPROVAL" && quotation.status === "APPROVED" && (
        <Card className="border-emerald-200 bg-emerald-50/40 shadow-2xs">
          <CardHeader className="py-4 px-6 border-b border-emerald-100">
            <CardTitle className="text-sm font-bold text-emerald-900 flex items-center gap-2">
              <CheckCircle2 className="w-5 h-5 text-emerald-600" />
              Verified Quotation Sign-Off
            </CardTitle>
          </CardHeader>
          <CardContent className="p-6 space-y-4 text-xs">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <span className="text-slate-500">Approved Date:</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {quotation.approvedAt
                    ? new Date(quotation.approvedAt).toLocaleString("en-IN")
                    : "Recorded"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Approving User (ERP Staff):</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {quotation.approvedBy?.fullName || "Authorized Manager"}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Client Sign-off Name:</span>
                <p className="font-bold text-slate-900 mt-0.5">
                  {quotation.clientApprovedName || clientName}
                </p>
              </div>
              <div>
                <span className="text-slate-500">Approved Commercial Value:</span>
                <p className="font-mono font-bold text-emerald-700 text-sm mt-0.5">
                  ₹{quotation.totalAmount.toLocaleString("en-IN")}
                </p>
              </div>
            </div>

            {quotation.approvalNotes && (
              <div className="pt-3 border-t border-emerald-200">
                <span className="text-slate-500">Approval / Sign-off Notes:</span>
                <p className="text-slate-800 mt-1">{quotation.approvalNotes}</p>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* APPROVE QUOTATION MODAL */}
      <Modal
        isOpen={showApproveModal}
        onClose={() => setShowApproveModal(false)}
        title="Approve Commercial Quotation"
      >
        <div className="space-y-4 text-xs">
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-lg text-emerald-900 space-y-1">
            <p className="font-bold text-sm">Approving: {quotation.referenceNo}</p>
            <p>
              Commercial Value: <strong>₹{quotation.totalAmount.toLocaleString("en-IN")}</strong>
            </p>
            <p className="text-2xs text-emerald-700">
              Note: Approving this quotation will lock financial fields, transition linked Lead to &quot;WON&quot;, and set project baseline budget.
            </p>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Client Sign-off Name</label>
            <input
              type="text"
              value={approverName}
              onChange={(e) => setApproverName(e.target.value)}
              placeholder="e.g. Mr. Rajesh Sharma"
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Approval Notes / Sign-off Reference</label>
            <textarea
              rows={3}
              value={approvalNotes}
              onChange={(e) => setApprovalNotes(e.target.value)}
              placeholder="e.g. Client confirmed via signed BOQ document on 23-Aug-2026"
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setShowApproveModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={approving}
              onClick={handleApprove}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold"
            >
              {approving ? "Recording Approval..." : "Confirm & Sign-Off"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* CREATE REVISION MODAL */}
      <Modal
        isOpen={showReviseModal}
        onClose={() => setShowReviseModal(false)}
        title={`Create Quotation Revision (v${quotation.revision + 1})`}
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-600">
            This will clone all BOQ items and dimensions from <strong>{quotation.referenceNo}</strong> into a new draft revision <strong>v{quotation.revision + 1}</strong>.
          </p>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Reason for Revision</label>
            <textarea
              rows={3}
              value={revisionNotes}
              onChange={(e) => setRevisionNotes(e.target.value)}
              placeholder="e.g. Client requested adding modular wardrobe in Guest Bedroom and upgrading kitchen hardware"
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setShowReviseModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={revising}
              onClick={handleRevise}
              className="bg-blue-600 hover:bg-blue-700 text-white font-semibold"
            >
              {revising ? "Generating Revision..." : "Create Revision Version"}
            </Button>
          </div>
        </div>
      </Modal>

      {/* STATUS CHANGE MODAL */}
      <Modal
        isOpen={showStatusModal}
        onClose={() => setShowStatusModal(false)}
        title="Update Quotation Lifecycle Status"
      >
        <div className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">New Status</label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full px-3 py-2 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 font-semibold"
            >
              <option value="DRAFT">DRAFT</option>
              <option value="INTERNAL_REVIEW">INTERNAL_REVIEW</option>
              <option value="READY_TO_SEND">READY_TO_SEND</option>
              <option value="SENT">SENT (Sent to Client)</option>
              <option value="NEGOTIATION">NEGOTIATION</option>
              <option value="REJECTED">REJECTED</option>
              <option value="CANCELLED">CANCELLED</option>
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Transition Notes</label>
            <textarea
              rows={2}
              value={statusNotes}
              onChange={(e) => setStatusNotes(e.target.value)}
              placeholder="Notes on client feedback or review"
              className="w-full p-2.5 border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
            />
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <Button variant="outline" size="sm" onClick={() => setShowStatusModal(false)}>
              Cancel
            </Button>
            <Button
              size="sm"
              disabled={updatingStatus}
              onClick={handleStatusChange}
              className="bg-slate-900 text-white font-semibold"
            >
              {updatingStatus ? "Updating..." : "Update Status"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
}
