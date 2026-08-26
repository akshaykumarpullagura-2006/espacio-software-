"use client";

import React, { useState, useEffect } from "react";
import { Wallet, Plus, Building2, CreditCard, ArrowRightLeft } from "lucide-react";
import { CreateAccountModal } from "@/components/finance/create-account-modal";
import { TransferFundsModal } from "@/components/finance/transfer-funds-modal";


export default function FinancialAccountsPage() {
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isTransferModalOpen, setIsTransferModalOpen] = useState(false);

  useEffect(() => {
    fetchAccounts();
  }, []);

  const fetchAccounts = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/v1/finance/accounts");
      const data = await res.json();
      if (data.success) {
        setAccounts(data.data || []);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="p-6 space-y-6 max-w-[1600px] mx-auto text-xs">
      {/* Top Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-xl font-bold text-slate-900 tracking-tight">Financial Accounts & Cash Lockers</h1>
          <p className="text-slate-500 mt-1">
            Authoritative operating accounts (HDFC Bank, Cash Locker, UPI) driving liquid position
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsTransferModalOpen(true)}
            className="px-3 py-2 bg-white border border-slate-300 hover:bg-slate-50 text-slate-700 font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ArrowRightLeft className="w-4 h-4 text-emerald-600" />
            <span>Transfer Funds</span>
          </button>

          <button
            onClick={() => setIsCreateModalOpen(true)}
            className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-white font-semibold rounded-lg shadow-sm flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>New Financial Account</span>
          </button>
        </div>
      </div>

      {/* Account Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {loading ? (
          <div className="col-span-full py-12 text-center text-slate-400">Loading accounts...</div>
        ) : accounts.length === 0 ? (
          <div className="col-span-full py-12 text-center text-slate-400">No financial accounts registered</div>
        ) : (
          accounts.map((a) => (
            <div key={a.id} className="bg-white border border-slate-200 rounded-xl p-5 shadow-sm space-y-4">
              <div className="flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
                    <Wallet className="w-5 h-5" />
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-900 text-sm">{a.name}</h3>
                    <span className="font-mono text-[10px] text-slate-500 font-semibold">{a.accountCode}</span>
                  </div>
                </div>
                <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-slate-100 text-slate-700">
                  {a.type}
                </span>
              </div>

              <div className="p-3 bg-slate-50 rounded-lg border border-slate-100 flex items-center justify-between">
                <span className="text-slate-500 font-semibold uppercase text-[10px]">Current Balance</span>
                <span className="text-xl font-bold text-emerald-700 tabular-nums">
                  ₹{a.currentBalance.toLocaleString("en-IN")}
                </span>
              </div>

              {a.type === "BANK" && (
                <div className="text-slate-600 text-xs border-t border-slate-100 pt-3 space-y-1 font-mono">
                  <div>Bank: <strong className="text-slate-900">{a.bankName || "-"}</strong></div>
                  <div>A/C: <strong className="text-slate-900">{a.accountNo || "-"}</strong></div>
                  <div>IFSC: <strong className="text-slate-900">{a.ifscCode || "-"}</strong></div>
                </div>
              )}
            </div>
          ))
        )}
      </div>

      <CreateAccountModal
        isOpen={isCreateModalOpen}
        onClose={() => setIsCreateModalOpen(false)}
        onSuccess={() => fetchAccounts()}
      />

      <TransferFundsModal
        isOpen={isTransferModalOpen}
        onClose={() => setIsTransferModalOpen(false)}
        onSuccess={() => fetchAccounts()}
        accounts={accounts}
      />
    </div>
  );
}

