"use client";

import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { X, Printer, CheckCircle2, Building, Receipt } from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";

interface PaymentReceiptModalProps {
  paymentId: string | null;
  isOpen: boolean;
  onClose: () => void;
}

export const PaymentReceiptModal: React.FC<PaymentReceiptModalProps> = ({
  paymentId,
  isOpen,
  onClose,
}) => {
  const [receiptData, setReceiptData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && paymentId) {
      fetchReceipt();
    } else {
      setReceiptData(null);
    }
  }, [isOpen, paymentId]);

  const fetchReceipt = async () => {
    if (!paymentId) return;
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/payments/${paymentId}/receipt`);
      const json = await res.json();
      if (json.success) {
        setReceiptData(json.data);
      }
    } catch {
      // quiet error handling
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#4A433D]/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-[#F6EFE3] rounded-xl shadow-2xl border border-[#6F5642]/20 w-full max-w-2xl overflow-hidden my-8">
        {/* Header Bar */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-[#6F5642]/15 bg-[#ECF4F0]">
          <div className="flex items-center gap-2">
            <Receipt className="w-5 h-5 text-[#6F5642]" />
            <h2 className="text-base font-bold text-[#4A433D] tracking-tight">Official Payment Voucher</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrint}
              disabled={isLoading || !receiptData}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-[#F2B455] text-[#4A433D] hover:bg-[#F2B455]/90 transition-colors shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              Print Voucher
            </button>
            <button
              onClick={onClose}
              className="p-1 rounded-lg text-[#6F5642] hover:bg-[#6F5642]/10 transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Receipt Content Printable Body */}
        <div className="p-8 space-y-6 text-[#4A433D] bg-white print:p-0 print:m-0" id="printable-payment-receipt">
          {isLoading ? (
            <div className="py-16 text-center text-[#6F5642] text-xs">
              Generating payment voucher...
            </div>
          ) : !receiptData ? (
            <div className="py-16 text-center text-[#6F5642] text-xs">
              Unable to load payment receipt data.
            </div>
          ) : (
            <>
              {/* Company & Voucher Header */}
              <div className="flex items-start justify-between border-b border-[#6F5642]/20 pb-5">
                <div>
                  <h1 className="text-lg font-bold text-[#4A433D] tracking-wider uppercase">
                    {receiptData.company?.name || "ESPACIO INTERIORS"}
                  </h1>
                  <p className="text-[11px] text-[#6F5642] font-medium">
                    {receiptData.company?.tagline || "Turnkey Architecture & Interior Execution"}
                  </p>
                  <p className="text-[10px] text-[#6F5642]/80 mt-1 max-w-xs leading-relaxed">
                    {receiptData.company?.address}
                  </p>
                  <p className="text-[10px] text-[#6F5642] font-mono mt-0.5">
                    GSTIN: {receiptData.company?.gstin} | Tel: {receiptData.company?.phone}
                  </p>
                </div>
                <div className="text-right">
                  <div className="inline-block px-3 py-1 bg-[#ECF4F0] border border-[#6F5642]/20 rounded-md text-xs font-mono font-bold text-[#4A433D]">
                    {receiptData.receiptNo}
                  </div>
                  <p className="text-[11px] text-[#6F5642] mt-1.5 font-medium">
                    Date: <span className="font-semibold text-[#4A433D]">{formatDate(receiptData.receiptDate)}</span>
                  </p>
                  <p className="text-[10px] font-semibold text-emerald-700 mt-1 flex items-center justify-end gap-1">
                    <CheckCircle2 className="w-3 h-3 inline" />
                    Status: {receiptData.payment?.status}
                  </p>
                </div>
              </div>

              {/* Billed To / Client & Project Metadata */}
              <div className="grid grid-cols-2 gap-4 bg-[#F6EFE3]/50 p-4 rounded-lg border border-[#6F5642]/10 text-xs">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">Received From:</span>
                  <div className="font-bold text-sm text-[#4A433D] mt-0.5">{receiptData.client?.fullName || "Client"}</div>
                  {receiptData.client?.phone && (
                    <div className="text-[11px] text-[#6F5642] mt-0.5">Phone: {receiptData.client.phone}</div>
                  )}
                  {receiptData.client?.email && (
                    <div className="text-[11px] text-[#6F5642]">Email: {receiptData.client.email}</div>
                  )}
                  {receiptData.client?.billingAddress && (
                    <div className="text-[10px] text-[#6F5642]/80 mt-1 leading-tight">{receiptData.client.billingAddress}</div>
                  )}
                </div>

                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">Project Account:</span>
                  <div className="font-bold text-sm text-[#4A433D] mt-0.5">{receiptData.project?.title}</div>
                  <div className="text-[11px] font-mono font-semibold text-[#6F5642] mt-0.5">
                    Project ID: {receiptData.project?.referenceNo}
                  </div>
                  {receiptData.milestone && (
                    <div className="text-[11px] text-[#4A433D] font-medium mt-1">
                      Milestone: <span className="font-semibold">{receiptData.milestone.title} ({receiptData.milestone.milestonePct}%)</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Payment Amount Card */}
              <div className="p-4 bg-[#ECF4F0] border border-[#6F5642]/15 rounded-lg flex items-center justify-between">
                <div>
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">Payment Mode</span>
                  <div className="font-semibold text-xs text-[#4A433D] mt-0.5">
                    {(receiptData.payment?.paymentMethod || "OTHER").replace(/_/g, " ")}
                  </div>
                  {receiptData.payment?.externalReference && (
                    <div className="text-[11px] font-mono text-[#6F5642] mt-0.5">
                      Ref / Txn No: {receiptData.payment.externalReference}
                    </div>
                  )}
                </div>

                <div className="text-right">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#6F5642]">Amount Received</span>
                  <div className="text-xl font-bold font-mono text-[#4A433D] tabular-nums mt-0.5">
                    {formatCurrency(receiptData.payment?.amount || 0)}
                  </div>
                </div>
              </div>

              {/* Project Financial Summary Table */}
              <div className="border border-[#6F5642]/15 rounded-lg overflow-hidden text-xs">
                <div className="bg-[#F6EFE3] px-3 py-2 font-bold text-[11px] text-[#4A433D] uppercase tracking-wider border-b border-[#6F5642]/15">
                  Project Account Summary
                </div>
                <div className="divide-y divide-[#6F5642]/10 bg-white">
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-[#6F5642]">Total Contract Value:</span>
                    <span className="font-mono font-semibold text-[#4A433D] tabular-nums">
                      {formatCurrency(receiptData.financialSummary?.totalContractValue || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between px-3 py-2">
                    <span className="text-[#6F5642]">Total Verified Collections To Date:</span>
                    <span className="font-mono font-semibold text-emerald-700 tabular-nums">
                      {formatCurrency(receiptData.financialSummary?.totalPaidToDate || 0)}
                    </span>
                  </div>
                  <div className="flex justify-between px-3 py-2 bg-[#ECF4F0]/40 font-bold">
                    <span className="text-[#4A433D]">Remaining Project Balance:</span>
                    <span className="font-mono text-[#4A433D] tabular-nums">
                      {formatCurrency(receiptData.financialSummary?.remainingOutstandingBalance || 0)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Signatures & Footer Note */}
              <div className="pt-8 grid grid-cols-2 gap-8 text-[10px] text-[#6F5642]">
                <div>
                  <div className="border-b border-[#6F5642]/40 pb-8"></div>
                  <p className="mt-1 font-semibold text-[#4A433D]">Client Acknowledgment</p>
                </div>
                <div className="text-right">
                  <div className="border-b border-[#6F5642]/40 pb-8"></div>
                  <p className="mt-1 font-semibold text-[#4A433D]">Authorized Signatory (ESPACIO)</p>
                </div>
              </div>

              <div className="text-center text-[9px] text-[#6F5642]/70 pt-2 border-t border-[#6F5642]/10">
                This is a computer-generated commercial payment voucher generated by ESPACIO ERP.
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
