"use client";

import React, { useState } from "react";
import { X, Send, MessageSquare, Mail, Cloud, Check, Loader2 } from "lucide-react";
import type { Invoice } from "./types";
import { formatCurrency } from "@/lib/utils";

interface ModalBaseProps {
  isOpen: boolean;
  onClose: () => void;
  invoice: Invoice;
  totals: { grandTotal: number; balanceDue: number };
}

export function WhatsAppModal({ isOpen, onClose, invoice, totals }: ModalBaseProps) {
  const [phoneNumber, setPhoneNumber] = useState(invoice.client.phone.replace(/[^0-9]/g, "") || "");
  const [customNote, setCustomNote] = useState(
    `Dear ${invoice.client.name},\n\nPlease find your official ${invoice.mode} (#${invoice.invoiceNumber}) from Espacio Interiors for ₹${totals.grandTotal.toLocaleString("en-IN")}.\n\nThank you for choosing Espacio!`
  );

  if (!isOpen) return null;

  const handleSend = () => {
    const cleanPhone = phoneNumber.replace(/[^0-9]/g, "");
    const encoded = encodeURIComponent(customNote);
    const url = `https://wa.me/${cleanPhone}?text=${encoded}`;
    window.open(url, "_blank");
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-emerald-500/10 text-emerald-400">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Share via WhatsApp</h3>
              <p className="text-xs text-slate-400">Send direct WhatsApp message with document details</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 py-4 text-xs">
          <div>
            <label className="mb-1 block font-semibold text-slate-300">Recipient WhatsApp Number</label>
            <input
              type="text"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="e.g. 919848011223 (with country code)"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-300">Message Content</label>
            <textarea
              rows={5}
              value={customNote}
              onChange={(e) => setCustomNote(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 p-3 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500"
          >
            <Send className="h-3.5 w-3.5" />
            Open WhatsApp
          </button>
        </div>
      </div>
    </div>
  );
}

export function EmailModal({ isOpen, onClose, invoice, totals }: ModalBaseProps) {
  const [recipient, setRecipient] = useState(invoice.client.email || "");
  const [subject, setSubject] = useState(`${invoice.mode} #${invoice.invoiceNumber} - Espacio Interiors`);
  const [isSending, setIsSending] = useState(false);
  const [sentSuccess, setSentSuccess] = useState(false);

  if (!isOpen) return null;

  const handleSend = () => {
    setIsSending(true);
    setTimeout(() => {
      setIsSending(false);
      setSentSuccess(true);
      setTimeout(() => {
        setSentSuccess(false);
        onClose();
      }, 1500);
    }, 1200);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-lg rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-blue-500/10 text-blue-400">
              <Mail className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Email Quotation</h3>
              <p className="text-xs text-slate-400">Send PDF copy directly to client mailbox</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-3.5 py-4 text-xs">
          <div>
            <label className="mb-1 block font-semibold text-slate-300">Client Email Address</label>
            <input
              type="email"
              value={recipient}
              onChange={(e) => setRecipient(e.target.value)}
              placeholder="e.g. client@example.com"
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>

          <div>
            <label className="mb-1 block font-semibold text-slate-300">Email Subject</label>
            <input
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full rounded-lg border border-slate-700 bg-slate-800 px-3 py-2 text-white focus:border-emerald-500 focus:outline-none"
            />
          </div>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSend}
            disabled={isSending || !recipient}
            className="flex items-center gap-1.5 rounded-lg bg-blue-600 px-4 py-2 text-xs font-semibold text-white hover:bg-blue-500 disabled:opacity-50"
          >
            {isSending ? (
              <Loader2 className="h-3.5 w-3.5 animate-spin" />
            ) : sentSuccess ? (
              <Check className="h-3.5 w-3.5" />
            ) : (
              <Send className="h-3.5 w-3.5" />
            )}
            {sentSuccess ? "Dispatched!" : isSending ? "Sending..." : "Send Email"}
          </button>
        </div>
      </div>
    </div>
  );
}

export function GoogleDriveModal({ isOpen, onClose, invoice }: ModalBaseProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [uploaded, setUploaded] = useState(false);

  if (!isOpen) return null;

  const handleUpload = () => {
    setIsUploading(true);
    setTimeout(() => {
      setIsUploading(false);
      setUploaded(true);
      setTimeout(() => {
        setUploaded(false);
        onClose();
      }, 1500);
    }, 1400);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm">
      <div className="w-full max-w-md rounded-xl border border-slate-700 bg-slate-900 p-6 text-slate-100 shadow-2xl">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3.5">
          <div className="flex items-center gap-2.5">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-amber-500/10 text-amber-400">
              <Cloud className="h-5 w-5" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Save to Cloud Workspace</h3>
              <p className="text-xs text-slate-400">Backup PDF and JSON to Project Drive folder</p>
            </div>
          </div>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:text-white">
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="py-4 text-xs text-slate-300">
          <p>
            Destination: <strong className="text-white">ESPACIO Drive &gt; Projects &gt; {invoice.project.name || "General"} &gt; Quotations</strong>
          </p>
          <p className="mt-2 text-slate-400">File: <span className="font-mono text-emerald-400">{invoice.invoiceNumber}.pdf</span></p>
        </div>

        <div className="flex items-center justify-end gap-2.5 border-t border-slate-800 pt-4">
          <button
            onClick={onClose}
            className="rounded-lg border border-slate-700 bg-slate-800 px-4 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700"
          >
            Close
          </button>
          <button
            onClick={handleUpload}
            disabled={isUploading}
            className="flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-2 text-xs font-semibold text-white hover:bg-emerald-500 disabled:opacity-50"
          >
            {isUploading ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Cloud className="h-3.5 w-3.5" />}
            {uploaded ? "Saved to Drive!" : isUploading ? "Syncing..." : "Sync to Drive"}
          </button>
        </div>
      </div>
    </div>
  );
}
