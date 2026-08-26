"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  Plus,
  Trash2,
  Calculator,
  Save,
  Send,
  Building2,
  User,
  FolderKanban,
  FileText,
  Percent,
  DollarSign,
  Info,
  CheckCircle2,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { usePermissions } from "@/components/providers/permissions-provider";

interface BOQItemForm {
  id: string;
  room: string;
  category: string;
  itemType: "CUSTOM" | "CATALOG";
  itemDescription: string;
  specifications: string;
  length: number | "";
  height: number | "";
  quantity: number;
  unitKey: "SQFT" | "RFT" | "NOS" | "LUMPSUM" | "SQMT" | "SET";
  unitRate: number;
  internalCostRate: number | "";
  discountAmount: number;
  totalAmount: number;
}

const DEFAULT_ROOMS = [
  "Living Room",
  "Master Bedroom",
  "Kitchen",
  "Dining Area",
  "Foyer",
  "Kids Bedroom",
  "Pooja Room",
  "Bathroom",
  "Balcony",
];

const CATEGORIES = [
  "Woodwork & Carpentry",
  "Modular Kitchen",
  "False Ceiling & POP",
  "Electrical & Lighting",
  "Painting & Wall Finishes",
  "Civil & Plumbing",
  "Loose Furniture",
  "Glass & Mirrors",
  "Hardware & Accessories",
  "Curtains & Soft Furnishings",
];

export default function NewQuotationPage() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { can, isSuperAdmin } = usePermissions();
  const canManagePricing = isSuperAdmin || can("quotations:manage_pricing");

  const initialLeadId = searchParams.get("leadId") || "";
  const initialProjectId = searchParams.get("projectId") || "";

  // Basic Information
  const [title, setTitle] = useState("Interior Design & Execution Quotation");
  const [sourceType, setSourceType] = useState<"LEAD" | "PROJECT" | "DIRECT">(
    initialProjectId ? "PROJECT" : initialLeadId ? "LEAD" : "LEAD"
  );
  const [selectedLeadId, setSelectedLeadId] = useState(initialLeadId);
  const [selectedProjectId, setSelectedProjectId] = useState(initialProjectId);
  const [selectedClientId, setSelectedClientId] = useState("");

  // Lead / Project options for dropdown
  const [leadsList, setLeadsList] = useState<any[]>([]);
  const [projectsList, setProjectsList] = useState<any[]>([]);
  const [clientsList, setClientsList] = useState<any[]>([]);

  // Client Details Preview
  const [clientDetails, setClientDetails] = useState({
    name: "",
    phone: "",
    email: "",
    location: "",
  });

  const [validityDays, setValidityDays] = useState(30);

  // BOQ Items
  const [items, setItems] = useState<BOQItemForm[]>([
    {
      id: "item-1",
      room: "Living Room",
      category: "Woodwork & Carpentry",
      itemType: "CUSTOM",
      itemDescription: "TV Entertainment Unit with back paneling and ledges",
      specifications: "18mm BWP Marine Plywood, 1mm Merino Gloss Laminate, Hafele hardware",
      length: 10,
      height: 7,
      quantity: 70,
      unitKey: "SQFT",
      unitRate: 1800,
      internalCostRate: 1200,
      discountAmount: 0,
      totalAmount: 126000,
    },
  ]);

  const [activeRoom, setActiveRoom] = useState<string>("Living Room");
  const [customRoomInput, setCustomRoomInput] = useState("");

  // Commercial Pricing State
  const [discountType, setDiscountType] = useState<"PERCENTAGE" | "FIXED" | "NONE">("NONE");
  const [discountValue, setDiscountValue] = useState<number>(0);
  const [taxRate, setTaxRate] = useState<number>(18); // Default 18% GST
  const [adjustmentAmount, setAdjustmentAmount] = useState<number>(0);
  const [adjustmentReason, setAdjustmentReason] = useState<string>("");

  // Terms & Notes
  const [termsAndConditions, setTermsAndConditions] = useState(
    "1. 10% Booking Advance, 40% Material Procurement, 40% Execution, 10% Handover.\n2. Quotation is valid for 30 days from issuance date."
  );
  const [notes, setNotes] = useState("Inclusive of delivery, installation, and cleanup at site.");
  const [internalNotes, setInternalNotes] = useState("");

  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  // Load leads, projects, and clients on mount
  useEffect(() => {
    async function loadOptions() {
      try {
        const [leadsRes, projectsRes, clientsRes] = await Promise.all([
          fetch("/api/v1/leads?limit=100"),
          fetch("/api/v1/projects?limit=100"),
          fetch("/api/v1/clients?limit=100"),
        ]);

        const [leadsJson, projectsJson, clientsJson] = await Promise.all([
          leadsRes.json(),
          projectsRes.json(),
          clientsRes.json(),
        ]);

        if (leadsJson.success) setLeadsList(leadsJson.data.leads || []);
        if (projectsJson.success) setProjectsList(projectsJson.data.projects || []);
        if (clientsJson.success) setClientsList(clientsJson.data.clients || []);
      } catch (err) {
        console.error("Failed to load entity dropdowns", err);
      }
    }
    loadOptions();
  }, []);

  // Update client details on selection
  useEffect(() => {
    if (sourceType === "LEAD" && selectedLeadId) {
      const lead = leadsList.find((l) => l.id === selectedLeadId);
      if (lead) {
        setClientDetails({
          name: lead.clientName || "",
          phone: lead.phone || "",
          email: lead.email || "",
          location: lead.location || "",
        });
      }
    } else if (sourceType === "PROJECT" && selectedProjectId) {
      const proj = projectsList.find((p) => p.id === selectedProjectId);
      if (proj) {
        setClientDetails({
          name: proj.client?.fullName || proj.title || "",
          phone: proj.client?.phone || "",
          email: proj.client?.email || "",
          location: proj.siteAddress || "",
        });
      }
    } else if (sourceType === "DIRECT" && selectedClientId) {
      const cli = clientsList.find((c) => c.id === selectedClientId);
      if (cli) {
        setClientDetails({
          name: cli.fullName || "",
          phone: cli.phone || "",
          email: cli.email || "",
          location: cli.address || "",
        });
      }
    }
  }, [sourceType, selectedLeadId, selectedProjectId, selectedClientId, leadsList, projectsList, clientsList]);

  // Recalculate line totals
  const handleItemChange = (index: number, field: keyof BOQItemForm, value: any) => {
    const updated = [...items];
    const item = { ...updated[index], [field]: value };

    // Auto calculate area if length and height are changed
    if (field === "length" || field === "height") {
      const l = field === "length" ? Number(value) : Number(item.length);
      const h = field === "height" ? Number(value) : Number(item.height);
      if (l > 0 && h > 0 && item.unitKey === "SQFT") {
        item.quantity = Math.round((l * h + Number.EPSILON) * 100) / 100;
      }
    }

    // Auto calculate line total
    const qty = Number(item.quantity) || 0;
    const rate = Number(item.unitRate) || 0;
    const disc = Math.max(0, Number(item.discountAmount) || 0);
    item.totalAmount = Math.max(0, Math.round((qty * rate - disc + Number.EPSILON) * 100) / 100);

    updated[index] = item;
    setItems(updated);
  };

  const handleAddItem = (roomName: string) => {
    const newItem: BOQItemForm = {
      id: `item-${Date.now()}`,
      room: roomName,
      category: "Woodwork & Carpentry",
      itemType: "CUSTOM",
      itemDescription: "",
      specifications: "",
      length: "",
      height: "",
      quantity: 1,
      unitKey: "SQFT",
      unitRate: 0,
      internalCostRate: "",
      discountAmount: 0,
      totalAmount: 0,
    };
    setItems([...items, newItem]);
  };

  const handleRemoveItem = (index: number) => {
    if (items.length <= 1) {
      alert("A quotation must have at least one BOQ line item.");
      return;
    }
    const updated = items.filter((_, i) => i !== index);
    setItems(updated);
  };

  const handleAddCustomRoom = () => {
    if (!customRoomInput.trim()) return;
    const roomName = customRoomInput.trim();
    setActiveRoom(roomName);
    handleAddItem(roomName);
    setCustomRoomInput("");
  };

  // Group items by Room
  const roomGroups = useMemo(() => {
    const groups: Record<string, BOQItemForm[]> = {};
    items.forEach((item) => {
      const r = item.room || "General";
      if (!groups[r]) groups[r] = [];
      groups[r].push(item);
    });
    return groups;
  }, [items]);

  // Overall Financial Calculations
  const calculations = useMemo(() => {
    let subtotal = 0;
    let totalInternalCost = 0;

    items.forEach((item) => {
      subtotal += item.totalAmount;
      if (item.internalCostRate) {
        totalInternalCost += (Number(item.internalCostRate) || 0) * (Number(item.quantity) || 0);
      }
    });

    subtotal = Math.round((subtotal + Number.EPSILON) * 100) / 100;

    let quoteDiscountAmount = 0;
    if (discountType === "PERCENTAGE" && discountValue > 0) {
      quoteDiscountAmount = Math.round(((subtotal * Math.min(100, discountValue)) / 100 + Number.EPSILON) * 100) / 100;
    } else if (discountType === "FIXED" && discountValue > 0) {
      quoteDiscountAmount = Math.min(subtotal, discountValue);
    }

    const taxableAmount = Math.max(0, Math.round((subtotal - quoteDiscountAmount + Number.EPSILON) * 100) / 100);
    const taxAmount = taxRate > 0 ? Math.round(((taxableAmount * taxRate) / 100 + Number.EPSILON) * 100) / 100 : 0;
    const finalAdjustment = Number(adjustmentAmount) || 0;
    const grandTotal = Math.max(0, Math.round((taxableAmount + taxAmount + finalAdjustment + Number.EPSILON) * 100) / 100);

    const margin = Math.round((taxableAmount - totalInternalCost + Number.EPSILON) * 100) / 100;
    const marginPct = taxableAmount > 0 ? Math.round(((margin / taxableAmount) * 100 + Number.EPSILON) * 10) / 10 : 0;

    return {
      subtotal,
      discountAmount: quoteDiscountAmount,
      taxableAmount,
      taxAmount,
      adjustmentAmount: finalAdjustment,
      grandTotal,
      totalInternalCost,
      margin,
      marginPct,
    };
  }, [items, discountType, discountValue, taxRate, adjustmentAmount]);

  // Submit Handler
  const handleSubmit = async (submitStatus: "DRAFT" | "READY_TO_SEND") => {
    try {
      setSubmitting(true);
      setErrorMsg("");

      if (items.some((i) => !i.itemDescription.trim())) {
        setErrorMsg("Please provide an item description for all BOQ line items.");
        setSubmitting(false);
        return;
      }

      const payload = {
        title,
        leadId: sourceType === "LEAD" ? selectedLeadId || null : null,
        projectId: sourceType === "PROJECT" ? selectedProjectId || null : null,
        clientId: sourceType === "DIRECT" ? selectedClientId || null : null,
        validityDate: new Date(Date.now() + validityDays * 24 * 60 * 60 * 1000).toISOString(),
        discountType: discountType === "NONE" ? null : discountType,
        discountValue: Number(discountValue) || 0,
        taxRate: Number(taxRate) || 0,
        adjustmentAmount: Number(adjustmentAmount) || 0,
        adjustmentReason: adjustmentReason || null,
        termsAndConditions,
        notes,
        internalNotes: canManagePricing ? internalNotes : null,
        items: items.map((i, idx) => ({
          room: i.room,
          category: i.category,
          itemType: i.itemType,
          itemDescription: i.itemDescription,
          specifications: i.specifications || null,
          length: i.length ? Number(i.length) : null,
          height: i.height ? Number(i.height) : null,
          quantity: Number(i.quantity) || 1,
          unitKey: i.unitKey,
          unitRate: Number(i.unitRate) || 0,
          internalCostRate: i.internalCostRate ? Number(i.internalCostRate) : null,
          discountAmount: Number(i.discountAmount) || 0,
          sortOrder: idx,
        })),
      };

      const res = await fetch("/api/v1/quotations", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const json = await res.json();
      if (!res.ok || !json.success) {
        throw new Error(json.error?.message || "Failed to create quotation");
      }

      const quoteId = json.data.id;

      // If submit for review, update status
      if (submitStatus === "READY_TO_SEND") {
        await fetch(`/api/v1/quotations/${quoteId}/status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "READY_TO_SEND", notes: "Submitted for client presentation" }),
        });
      }

      router.push(`/quotations/${quoteId}`);
    } catch (err: any) {
      setErrorMsg(err.message || "An unexpected error occurred while saving quotation");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <Link href="/quotations">
            <Button variant="outline" size="sm" className="h-9 w-9 p-0 text-slate-600">
              <ArrowLeft className="w-4 h-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-xl font-bold text-slate-900">Create Commercial Quotation & BOQ</h1>
            <p className="text-xs text-slate-500">
              Build room-wise detailed bill of quantities, apply rates, and calculate commercial totals
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Button
            variant="outline"
            disabled={submitting}
            onClick={() => handleSubmit("DRAFT")}
            className="gap-1.5 text-xs font-medium text-slate-700"
          >
            <Save className="w-3.5 h-3.5" />
            Save Draft
          </Button>

          <Button
            disabled={submitting}
            onClick={() => handleSubmit("READY_TO_SEND")}
            className="bg-emerald-600 hover:bg-emerald-700 text-white gap-1.5 text-xs font-medium shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
            Save & Finalize Quotation
          </Button>
        </div>
      </div>

      {errorMsg && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-center gap-2">
          <Info className="w-4 h-4 shrink-0" />
          <span>{errorMsg}</span>
        </div>
      )}

      {/* Form Content Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Columns: Information & BOQ Line Items */}
        <div className="lg:col-span-2 space-y-6">
          {/* 1. Quotation Header & Context Card */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <FileText className="w-4 h-4 text-emerald-600" />
                1. Quotation Context & Client Information
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Quotation Title / Subject</label>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  placeholder="e.g. 3BHK Luxury Interior Execution Proposal"
                />
              </div>

              {/* Source Type Selector */}
              <div className="grid grid-cols-3 gap-3">
                <button
                  type="button"
                  onClick={() => setSourceType("LEAD")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    sourceType === "LEAD"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <User className="w-4 h-4 text-emerald-600" />
                    <span className="text-xs">From Lead</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType("PROJECT")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    sourceType === "PROJECT"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <FolderKanban className="w-4 h-4 text-purple-600" />
                    <span className="text-xs">From Project</span>
                  </div>
                </button>

                <button
                  type="button"
                  onClick={() => setSourceType("DIRECT")}
                  className={`p-3 rounded-lg border text-left transition-all ${
                    sourceType === "DIRECT"
                      ? "border-emerald-600 bg-emerald-50/50 text-emerald-950 font-semibold"
                      : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Building2 className="w-4 h-4 text-blue-600" />
                    <span className="text-xs">Direct Client</span>
                  </div>
                </button>
              </div>

              {/* Dropdown based on source */}
              {sourceType === "LEAD" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Select Lead</label>
                  <select
                    value={selectedLeadId}
                    onChange={(e) => setSelectedLeadId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">-- Select Active CRM Lead --</option>
                    {leadsList.map((lead) => (
                      <option key={lead.id} value={lead.id}>
                        {lead.referenceNo} - {lead.clientName} ({lead.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sourceType === "PROJECT" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Select Project</label>
                  <select
                    value={selectedProjectId}
                    onChange={(e) => setSelectedProjectId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">-- Select Existing Project --</option>
                    {projectsList.map((proj) => (
                      <option key={proj.id} value={proj.id}>
                        {proj.referenceNo} - {proj.title}
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {sourceType === "DIRECT" && (
                <div>
                  <label className="block text-xs font-medium text-slate-700 mb-1">Select Client</label>
                  <select
                    value={selectedClientId}
                    onChange={(e) => setSelectedClientId(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500"
                  >
                    <option value="">-- Select Client Record --</option>
                    {clientsList.map((cli) => (
                      <option key={cli.id} value={cli.id}>
                        {cli.referenceNo} - {cli.fullName} ({cli.phone})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Auto-filled client info snippet */}
              {clientDetails.name && (
                <div className="bg-slate-50 p-3.5 rounded-lg border border-slate-200 text-xs grid grid-cols-2 gap-2">
                  <div>
                    <span className="text-slate-400">Client Name:</span>{" "}
                    <strong className="text-slate-800">{clientDetails.name}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Phone:</span>{" "}
                    <strong className="text-slate-800">{clientDetails.phone || "N/A"}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Email:</span>{" "}
                    <span className="text-slate-700">{clientDetails.email || "N/A"}</span>
                  </div>
                  <div>
                    <span className="text-slate-400">Location:</span>{" "}
                    <span className="text-slate-700">{clientDetails.location || "N/A"}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* 2. Room-wise BOQ Builder */}
          <Card className="border-slate-200 shadow-2xs">
            <CardHeader className="pb-3 border-b border-slate-100 flex flex-row items-center justify-between">
              <CardTitle className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <Calculator className="w-4 h-4 text-emerald-600" />
                2. Room-Wise BOQ Items & Dimensions
              </CardTitle>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  placeholder="+ Custom Room"
                  value={customRoomInput}
                  onChange={(e) => setCustomRoomInput(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleAddCustomRoom()}
                  className="px-2.5 py-1 text-xs bg-slate-50 border border-slate-200 rounded-lg w-32 focus:w-40 transition-all focus:bg-white"
                />
                <Button
                  size="sm"
                  variant="outline"
                  onClick={handleAddCustomRoom}
                  className="h-7 text-2xs px-2"
                >
                  Add Room
                </Button>
              </div>
            </CardHeader>

            <CardContent className="p-5 space-y-6">
              {/* Room Tabs */}
              <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-100">
                {Object.keys(roomGroups).map((room) => (
                  <button
                    key={room}
                    type="button"
                    onClick={() => setActiveRoom(room)}
                    className={`px-3 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-all flex items-center gap-1.5 ${
                      activeRoom === room
                        ? "bg-slate-900 text-white shadow-2xs"
                        : "bg-slate-100 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                    }`}
                  >
                    <span>{room}</span>
                    <span
                      className={`text-2xs px-1.5 py-0.2 rounded-full ${
                        activeRoom === room ? "bg-slate-700 text-white" : "bg-slate-200 text-slate-700"
                      }`}
                    >
                      {roomGroups[room]?.length || 0}
                    </span>
                  </button>
                ))}
              </div>

              {/* Items for Selected Room */}
              <div className="space-y-4">
                {items
                  .map((item, originalIndex) => ({ item, originalIndex }))
                  .filter(({ item }) => (item.room || "General") === activeRoom)
                  .map(({ item, originalIndex }, idx) => (
                    <div
                      key={item.id}
                      className="p-4 bg-slate-50/70 border border-slate-200 rounded-xl space-y-3 relative group"
                    >
                      <div className="flex items-center justify-between pb-2 border-b border-slate-200/60">
                        <div className="flex items-center gap-2">
                          <span className="w-5 h-5 rounded-full bg-slate-200 text-slate-700 text-2xs font-bold flex items-center justify-center">
                            {idx + 1}
                          </span>
                          <select
                            value={item.category}
                            onChange={(e) => handleItemChange(originalIndex, "category", e.target.value)}
                            className="text-xs font-semibold bg-white border border-slate-200 rounded px-2 py-1 text-slate-800"
                          >
                            {CATEGORIES.map((cat) => (
                              <option key={cat} value={cat}>
                                {cat}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="flex items-center gap-2">
                          <div className="text-right font-mono text-sm font-bold text-slate-900">
                            ₹{item.totalAmount.toLocaleString("en-IN")}
                          </div>
                          <button
                            type="button"
                            onClick={() => handleRemoveItem(originalIndex)}
                            className="text-slate-400 hover:text-red-600 transition-colors p-1"
                            title="Remove line item"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Item Description & Specs */}
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                        <div>
                          <label className="block text-2xs font-medium text-slate-600 mb-0.5">Item Description</label>
                          <input
                            type="text"
                            placeholder="e.g. Master Bedroom 4-Door Wardrobe"
                            value={item.itemDescription}
                            onChange={(e) => handleItemChange(originalIndex, "itemDescription", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                        <div>
                          <label className="block text-2xs font-medium text-slate-600 mb-0.5">Specifications / Materials</label>
                          <input
                            type="text"
                            placeholder="e.g. 18mm BWP Plywood, 1mm Laminate, Soft-close hinges"
                            value={item.specifications}
                            onChange={(e) => handleItemChange(originalIndex, "specifications", e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs bg-white border border-slate-200 rounded focus:ring-1 focus:ring-emerald-500"
                          />
                        </div>
                      </div>

                      {/* Dimension & Rate Grid */}
                      <div className="grid grid-cols-2 sm:grid-cols-6 gap-2 text-xs">
                        <div>
                          <label className="block text-2xs text-slate-500 mb-0.5">Length (ft)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="L"
                            value={item.length}
                            onChange={(e) => handleItemChange(originalIndex, "length", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-center font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-2xs text-slate-500 mb-0.5">Height (ft)</label>
                          <input
                            type="number"
                            step="0.1"
                            placeholder="H"
                            value={item.height}
                            onChange={(e) => handleItemChange(originalIndex, "height", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-center font-mono"
                          />
                        </div>
                        <div>
                          <label className="block text-2xs text-slate-500 mb-0.5">Quantity / Area</label>
                          <input
                            type="number"
                            step="0.1"
                            value={item.quantity}
                            onChange={(e) => handleItemChange(originalIndex, "quantity", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-center font-mono font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-2xs text-slate-500 mb-0.5">Unit</label>
                          <select
                            value={item.unitKey}
                            onChange={(e) => handleItemChange(originalIndex, "unitKey", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-center font-semibold"
                          >
                            <option value="SQFT">SQFT</option>
                            <option value="RFT">RFT</option>
                            <option value="NOS">NOS</option>
                            <option value="LUMPSUM">LUMPSUM</option>
                            <option value="SQMT">SQMT</option>
                            <option value="SET">SET</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-2xs text-slate-500 mb-0.5">Rate (₹)</label>
                          <input
                            type="number"
                            value={item.unitRate}
                            onChange={(e) => handleItemChange(originalIndex, "unitRate", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-right font-mono font-semibold"
                          />
                        </div>
                        <div>
                          <label className="block text-2xs text-slate-500 mb-0.5">Discount (₹)</label>
                          <input
                            type="number"
                            value={item.discountAmount}
                            onChange={(e) => handleItemChange(originalIndex, "discountAmount", e.target.value)}
                            className="w-full px-2 py-1 bg-white border border-slate-200 rounded text-right font-mono text-red-600"
                          />
                        </div>
                      </div>

                      {/* Internal Cost field (if permitted) */}
                      {canManagePricing && (
                        <div className="pt-2 border-t border-dashed border-slate-200 flex items-center justify-between text-2xs text-slate-500">
                          <div className="flex items-center gap-2">
                            <span className="text-amber-600 font-medium">Internal Cost Rate (₹):</span>
                            <input
                              type="number"
                              placeholder="Estimated COGS"
                              value={item.internalCostRate}
                              onChange={(e) => handleItemChange(originalIndex, "internalCostRate", e.target.value)}
                              className="w-24 px-2 py-0.5 bg-amber-50/50 border border-amber-200 rounded font-mono text-xs"
                            />
                          </div>
                          <div className="text-slate-400">
                            (Excluded from Client Facing PDF)
                          </div>
                        </div>
                      )}
                    </div>
                  ))}

                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleAddItem(activeRoom)}
                  className="w-full py-2.5 border-dashed border-slate-300 text-slate-600 hover:border-emerald-500 hover:text-emerald-700 text-xs gap-1.5"
                >
                  <Plus className="w-3.5 h-3.5" />
                  Add Line Item to {activeRoom}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Right 1 Column: Commercial Calculation Engine & Terms */}
        <div className="space-y-6">
          {/* Pricing Engine Card */}
          <Card className="border-slate-200 shadow-2xs sticky top-6">
            <CardHeader className="pb-3 border-b border-slate-100 bg-slate-900 text-white rounded-t-xl">
              <CardTitle className="text-base font-bold flex items-center justify-between">
                <span>Commercial Summary</span>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 px-2 py-0.5 rounded">
                  Live Engine
                </span>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-5 space-y-4">
              {/* Gross Subtotal */}
              <div className="flex justify-between items-center text-sm">
                <span className="text-slate-600">BOQ Gross Subtotal:</span>
                <span className="font-mono font-semibold text-slate-900">
                  ₹{calculations.subtotal.toLocaleString("en-IN")}
                </span>
              </div>

              {/* Quotation Discount Controls */}
              <div className="p-3 bg-slate-50 rounded-lg border border-slate-200 space-y-2">
                <div className="flex items-center justify-between text-xs font-semibold text-slate-700">
                  <span>Quotation Discount:</span>
                  <div className="flex gap-1">
                    <button
                      type="button"
                      onClick={() => setDiscountType("NONE")}
                      className={`px-1.5 py-0.5 text-2xs rounded ${
                        discountType === "NONE" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      None
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("PERCENTAGE")}
                      className={`px-1.5 py-0.5 text-2xs rounded ${
                        discountType === "PERCENTAGE" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      %
                    </button>
                    <button
                      type="button"
                      onClick={() => setDiscountType("FIXED")}
                      className={`px-1.5 py-0.5 text-2xs rounded ${
                        discountType === "FIXED" ? "bg-slate-800 text-white" : "bg-slate-200 text-slate-600"
                      }`}
                    >
                      ₹
                    </button>
                  </div>
                </div>

                {discountType !== "NONE" && (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      placeholder={discountType === "PERCENTAGE" ? "Discount %" : "Discount Amount (₹)"}
                      value={discountValue}
                      onChange={(e) => setDiscountValue(Number(e.target.value))}
                      className="w-full px-2 py-1 text-xs bg-white border border-slate-200 rounded font-mono"
                    />
                    <span className="text-xs font-mono font-bold text-red-600 whitespace-nowrap">
                      -₹{calculations.discountAmount.toLocaleString("en-IN")}
                    </span>
                  </div>
                )}
              </div>

              {/* Taxable Amount */}
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span>Taxable Amount:</span>
                <span className="font-mono font-semibold text-slate-800">
                  ₹{calculations.taxableAmount.toLocaleString("en-IN")}
                </span>
              </div>

              {/* Tax / GST Selector */}
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-600">GST Rate:</span>
                <div className="flex items-center gap-1.5">
                  <select
                    value={taxRate}
                    onChange={(e) => setTaxRate(Number(e.target.value))}
                    className="px-2 py-1 text-xs bg-white border border-slate-200 rounded font-semibold text-slate-800"
                  >
                    <option value={0}>0% (Exempt)</option>
                    <option value={5}>5%</option>
                    <option value={12}>12%</option>
                    <option value={18}>18% (Standard)</option>
                    <option value={28}>28%</option>
                  </select>
                  <span className="font-mono text-slate-800 font-semibold">
                    ₹{calculations.taxAmount.toLocaleString("en-IN")}
                  </span>
                </div>
              </div>

              {/* Manual Commercial Adjustment */}
              <div className="p-3 bg-amber-50/50 rounded-lg border border-amber-200/60 space-y-2">
                <div className="text-xs font-semibold text-amber-900">Commercial Adjustment (± ₹)</div>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Adjustment ₹"
                    value={adjustmentAmount}
                    onChange={(e) => setAdjustmentAmount(Number(e.target.value))}
                    className="px-2 py-1 text-xs bg-white border border-amber-200 rounded font-mono"
                  />
                  <input
                    type="text"
                    placeholder="Reason"
                    value={adjustmentReason}
                    onChange={(e) => setAdjustmentReason(e.target.value)}
                    className="px-2 py-1 text-xs bg-white border border-amber-200 rounded"
                  />
                </div>
              </div>

              {/* Grand Total */}
              <div className="p-4 bg-emerald-600 text-white rounded-xl shadow-sm flex items-center justify-between">
                <div>
                  <p className="text-2xs uppercase tracking-wider text-emerald-100 font-semibold">Final Grand Total</p>
                  <h2 className="text-2xl font-black font-mono mt-0.5">
                    ₹{calculations.grandTotal.toLocaleString("en-IN")}
                  </h2>
                </div>
                <Sparkles className="w-6 h-6 text-emerald-200" />
              </div>

              {/* Internal Profit Margin Box (Hidden from regular users) */}
              {canManagePricing && (
                <div className="p-3 bg-slate-100 rounded-lg border border-slate-200 text-xs space-y-1">
                  <div className="flex justify-between font-medium text-slate-600">
                    <span>Est. Internal Cost:</span>
                    <span className="font-mono">₹{calculations.totalInternalCost.toLocaleString("en-IN")}</span>
                  </div>
                  <div className="flex justify-between font-bold text-slate-900">
                    <span>Projected Margin:</span>
                    <span className="font-mono text-emerald-700">
                      ₹{calculations.margin.toLocaleString("en-IN")} ({calculations.marginPct}%)
                    </span>
                  </div>
                </div>
              )}

              {/* Terms & Conditions */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Commercial Terms & Milestones</label>
                <textarea
                  rows={3}
                  value={termsAndConditions}
                  onChange={(e) => setTermsAndConditions(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Client Notes */}
              <div>
                <label className="block text-xs font-medium text-slate-700 mb-1">Client Notes</label>
                <textarea
                  rows={2}
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  className="w-full p-2.5 text-xs bg-white border border-slate-200 rounded-lg focus:ring-2 focus:ring-emerald-500/20"
                />
              </div>

              {/* Action Buttons */}
              <div className="pt-2 space-y-2">
                <Button
                  disabled={submitting}
                  onClick={() => handleSubmit("READY_TO_SEND")}
                  className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-semibold py-2.5 text-xs shadow-sm"
                >
                  <Send className="w-4 h-4 mr-1.5" />
                  Save & Finalize Quotation
                </Button>

                <Button
                  variant="outline"
                  disabled={submitting}
                  onClick={() => handleSubmit("DRAFT")}
                  className="w-full text-slate-700 py-2.5 text-xs"
                >
                  <Save className="w-4 h-4 mr-1.5" />
                  Save as Draft
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
