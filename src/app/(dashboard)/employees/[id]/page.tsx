"use client";

import React, { useState, useEffect, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import {
  Users,
  UserCheck,
  Building2,
  Briefcase,
  Shield,
  CreditCard,
  Receipt,
  Calendar,
  Phone,
  Mail,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Sparkles,
  ChevronLeft,
  DollarSign,
  PlusCircle,
  RotateCcw,
  Sliders,
  Wallet,
  Clock,
  ArrowUpRight,
  X,
  ExternalLink,
  ShieldCheck,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { usePermissions } from "@/components/providers/permissions-provider";

interface EmployeeProfileData {
  id: string;
  employeeNo: string;
  fullName: string;
  email: string;
  phone?: string | null;
  department: string;
  designation: string;
  joiningDate: string;
  status: string;
  address?: string | null;
  emergencyContact?: string | null;
  emergencyPhone?: string | null;
  bankName?: string | null;
  bankAccountNo?: string | null;
  bankIfsc?: string | null;
  upiId?: string | null;
  notes?: string | null;
  currentSalary?: number;
  isViewingSelf?: boolean;
  user?: {
    id: string;
    email: string;
    accessLevel: string;
    status: string;
    userRoles: { role: { name: string } }[];
  } | null;
  salaryStructures: {
    id: string;
    baseSalary: number;
    paymentMethod: string;
    effectiveFrom: string;
    isActive: boolean;
    notes?: string | null;
  }[];
  salaryPayments: {
    id: string;
    referenceNo: string;
    periodMonth: number;
    periodYear: number;
    amount: number;
    paymentDate: string;
    paymentMethod: string;
    referenceNoExternal?: string | null;
    status: string;
    reversalReason?: string | null;
    notes?: string | null;
    expense?: {
      id: string;
      referenceNo: string;
      amount: number;
      status: string;
    } | null;
  }[];
  expenses: {
    id: string;
    referenceNo: string;
    categoryKey: string;
    amount: number;
    status: string;
    expenseDate: string;
    description: string;
    project?: { id: string; referenceNo: string; title: string } | null;
  }[];
  advances: any[];
  advanceSummary: {
    totalIssued: number;
    totalSpent: number;
    remainingBalance: number;
  };
}

export default function EmployeeProfilePage() {
  const params = useParams();
  const router = useRouter();
  const employeeId = params?.id as string;
  const { can, isSuperAdmin } = usePermissions();

  const [employee, setEmployee] = useState<EmployeeProfileData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"OVERVIEW" | "SALARY" | "EXPENSES" | "ADVANCES" | "COST_SUMMARY">("OVERVIEW");

  // Salary Credit Modal state
  const [isCreditModalOpen, setIsCreditModalOpen] = useState(false);
  const [creditMonth, setCreditMonth] = useState<number>(new Date().getMonth() + 1);
  const [creditYear, setCreditYear] = useState<number>(new Date().getFullYear());
  const [creditAmount, setCreditAmount] = useState<number>(0);
  const [creditPaymentMethod, setCreditPaymentMethod] = useState("UPI");
  const [creditReference, setCreditReference] = useState("");
  const [creditNotes, setCreditNotes] = useState("");
  const [isCrediting, setIsCrediting] = useState(false);
  const [creditError, setCreditError] = useState<string | null>(null);
  const [creditSuccess, setCreditSuccess] = useState<string | null>(null);

  // Configure Salary Modal state
  const [isConfigureSalaryOpen, setIsConfigureSalaryOpen] = useState(false);
  const [newBaseSalary, setNewBaseSalary] = useState<number>(0);
  const [newSalaryMethod, setNewSalaryMethod] = useState("UPI");
  const [newSalaryNotes, setNewSalaryNotes] = useState("");
  const [isSavingSalary, setIsSavingSalary] = useState(false);

  // Salary Reversal Modal state
  const [reversalTarget, setReversalTarget] = useState<{ id: string; referenceNo: string; period: string } | null>(null);
  const [reversalReason, setReversalReason] = useState("");
  const [isReversing, setIsReversing] = useState(false);

  // Cost Breakdown state
  const [summaryMonth, setSummaryMonth] = useState<number>(new Date().getMonth() + 1);
  const [summaryYear, setSummaryYear] = useState<number>(new Date().getFullYear());
  const [monthlySummary, setMonthlySummary] = useState<any>(null);
  const [isLoadingSummary, setIsLoadingSummary] = useState(false);

  const canManageSalary = isSuperAdmin || can("employees:manage_salary");
  const canViewSalary = canManageSalary || can("employees:view_salary") || employee?.isViewingSelf;

  useEffect(() => {
    if (employeeId) {
      fetchEmployee();
    }
  }, [employeeId]);

  useEffect(() => {
    if (employeeId && activeTab === "COST_SUMMARY") {
      fetchMonthlySummary();
    }
  }, [employeeId, summaryMonth, summaryYear, activeTab]);

  const fetchEmployee = async () => {
    setIsLoading(true);
    try {
      const res = await fetch(`/api/v1/employees/${employeeId}`);
      const json = await res.json();
      if (json.success && json.data) {
        setEmployee(json.data);
        const activeSalary = json.data.currentSalary || json.data.salaryStructures?.find((s: any) => s.isActive)?.baseSalary || 0;
        setCreditAmount(activeSalary);
        setNewBaseSalary(activeSalary);
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMonthlySummary = async () => {
    setIsLoadingSummary(true);
    try {
      const res = await fetch(`/api/v1/employees/${employeeId}/financial-summary?month=${summaryMonth}&year=${summaryYear}`);
      const json = await res.json();
      if (json.success) {
        setMonthlySummary(json.data);
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoadingSummary(false);
    }
  };

  const handleCreditSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setCreditError(null);
    setCreditSuccess(null);
    setIsCrediting(true);

    try {
      const res = await fetch(`/api/v1/employees/${employeeId}/salary/credit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          periodMonth: creditMonth,
          periodYear: creditYear,
          amount: Number(creditAmount),
          paymentMethod: creditPaymentMethod,
          referenceNoExternal: creditReference || null,
          notes: creditNotes || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setCreditSuccess("Salary credited successfully and linked Expense created.");
        setIsCreditModalOpen(false);
        setCreditReference("");
        setCreditNotes("");
        fetchEmployee();
      } else {
        setCreditError(json.error?.message || "Failed to credit salary");
      }
    } catch (err: any) {
      setCreditError(err.message || "An unexpected error occurred");
    } finally {
      setIsCrediting(false);
    }
  };

  const handleConfigureSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSavingSalary(true);
    try {
      const res = await fetch(`/api/v1/employees/${employeeId}/salary/configure`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          baseSalary: Number(newBaseSalary),
          paymentMethod: newSalaryMethod,
          notes: newSalaryNotes || null,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsConfigureSalaryOpen(false);
        fetchEmployee();
      } else {
        alert(json.error?.message || "Failed to update salary");
      }
    } catch {
      // Quiet handling
    } finally {
      setIsSavingSalary(false);
    }
  };

  const handleReverseSalary = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!reversalTarget || !reversalReason) return;
    setIsReversing(true);

    try {
      const res = await fetch(`/api/v1/employees/${employeeId}/salary/reverse`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          paymentId: reversalTarget.id,
          reason: reversalReason,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setReversalTarget(null);
        setReversalReason("");
        fetchEmployee();
      } else {
        alert(json.error?.message || "Failed to reverse salary payment");
      }
    } catch {
      // Quiet handling
    } finally {
      setIsReversing(false);
    }
  };

  const handleDeactivate = async () => {
    if (!confirm(`Are you sure you want to deactivate ${employee?.fullName}? They will be blocked from logging in, but all historical salary, project, and expense records will remain preserved.`)) {
      return;
    }

    try {
      const res = await fetch(`/api/v1/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deactivate: true }),
      });
      const json = await res.json();
      if (json.success) {
        fetchEmployee();
      } else {
        alert(json.error?.message || "Failed to deactivate employee");
      }
    } catch {
      // Quiet handling
    }
  };

  const handleReactivate = async () => {
    try {
      const res = await fetch(`/api/v1/employees/${employeeId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ reactivate: true }),
      });
      const json = await res.json();
      if (json.success) {
        fetchEmployee();
      }
    } catch {
      // Quiet handling
    }
  };

  const monthNames = [
    "January", "February", "March", "April", "May", "June",
    "July", "August", "September", "October", "November", "December"
  ];

  if (isLoading) {
    return (
      <div className="p-12 text-center text-walnut/60 select-none">
        Loading employee profile...
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="p-12 text-center text-rose-800 select-none space-y-3">
        <AlertCircle className="w-8 h-8 text-rose-600 mx-auto" />
        <p className="font-bold">Employee record not found</p>
        <Link href="/employees" className="text-xs text-gold font-bold hover:underline">
          Return to Employee Directory
        </Link>
      </div>
    );
  }

  const isActive = employee.status === "ACTIVE";

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto">
      {/* Breadcrumb & Navigation */}
      <div className="flex items-center gap-2 text-xs text-walnut font-medium">
        <Link href="/employees" className="hover:text-charcoal flex items-center gap-1">
          <ChevronLeft className="w-3.5 h-3.5" /> Employee Directory
        </Link>
        <span>/</span>
        <span className="text-charcoal font-bold">{employee.fullName}</span>
      </div>

      {/* Employee Profile Header Card */}
      <div className="bg-white rounded-xl border border-walnut/15 p-5 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-xl bg-gold/20 text-gold-darker font-bold text-xl flex items-center justify-center border border-gold/30 shrink-0">
              {employee.fullName.charAt(0)}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl font-bold text-charcoal">{employee.fullName}</h1>
                <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cream border border-walnut/20 text-charcoal">
                  {employee.employeeNo}
                </span>
                <span
                  className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                    isActive
                      ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                      : "bg-rose-100 text-rose-800 border border-rose-200"
                  }`}
                >
                  {employee.status}
                </span>
              </div>
              <p className="text-xs font-semibold text-walnut flex items-center gap-2">
                <span>{employee.designation}</span>
                <span>•</span>
                <span className="uppercase text-[10px] tracking-wider">{employee.department}</span>
              </p>
              <div className="text-[11px] text-walnut/80 flex items-center gap-3 flex-wrap">
                <span className="flex items-center gap-1 font-mono">
                  <Mail className="w-3 h-3 text-walnut/60" /> {employee.email}
                </span>
                {employee.phone && (
                  <span className="flex items-center gap-1">
                    <Phone className="w-3 h-3 text-walnut/60" /> {employee.phone}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Header Action Controls */}
          <div className="flex items-center gap-2 self-start md:self-auto">
            {canManageSalary && isActive && (
              <button
                onClick={() => setIsCreditModalOpen(true)}
                className="px-4 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <DollarSign className="w-4 h-4" /> Credit Salary
              </button>
            )}

            {isSuperAdmin && isActive && (
              <button
                onClick={handleDeactivate}
                className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
              >
                Deactivate
              </button>
            )}

            {isSuperAdmin && !isActive && (
              <button
                onClick={handleReactivate}
                className="px-3 py-2 text-xs font-bold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-lg transition-colors cursor-pointer"
              >
                Reactivate Account
              </button>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 border-t border-walnut/15 mt-5 pt-3 overflow-x-auto text-xs font-semibold">
          <button
            onClick={() => setActiveTab("OVERVIEW")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "OVERVIEW" ? "bg-charcoal text-white font-bold" : "text-walnut hover:bg-cream"
            }`}
          >
            Overview & Details
          </button>
          {canViewSalary && (
            <button
              onClick={() => setActiveTab("SALARY")}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "SALARY" ? "bg-charcoal text-white font-bold" : "text-walnut hover:bg-cream"
              }`}
            >
              Salary & Payments ({employee.salaryPayments?.length || 0})
            </button>
          )}
          <button
            onClick={() => setActiveTab("EXPENSES")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "EXPENSES" ? "bg-charcoal text-white font-bold" : "text-walnut hover:bg-cream"
            }`}
          >
            Direct Expenses ({employee.expenses?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab("ADVANCES")}
            className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
              activeTab === "ADVANCES" ? "bg-charcoal text-white font-bold" : "text-walnut hover:bg-cream"
            }`}
          >
            Petty Cash & Advances ({employee.advances?.length || 0})
          </button>
          {canViewSalary && (
            <button
              onClick={() => setActiveTab("COST_SUMMARY")}
              className={`px-3 py-1.5 rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === "COST_SUMMARY" ? "bg-charcoal text-white font-bold" : "text-walnut hover:bg-cream"
              }`}
            >
              Monthly Cost Summary
            </button>
          )}
        </div>
      </div>

      {/* ========================================================= */}
      {/* TAB 1: OVERVIEW & DETAILS */}
      {/* ========================================================= */}
      {activeTab === "OVERVIEW" && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Employment Card */}
          <div className="bg-white rounded-xl border border-walnut/15 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-2 border-b border-walnut/15 pb-2">
              <Briefcase className="w-4 h-4 text-gold" /> Employment & Designation
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-walnut text-[11px] block">Department</span>
                <span className="font-bold text-charcoal">{employee.department}</span>
              </div>
              <div>
                <span className="text-walnut text-[11px] block">Designation</span>
                <span className="font-bold text-charcoal">{employee.designation}</span>
              </div>
              <div>
                <span className="text-walnut text-[11px] block">Joining Date</span>
                <span className="font-bold text-charcoal font-tabular">{formatDate(employee.joiningDate)}</span>
              </div>
              <div>
                <span className="text-walnut text-[11px] block">Status</span>
                <span className="font-bold text-charcoal">{employee.status}</span>
              </div>
            </div>
          </div>

          {/* Account & Security Card */}
          <div className="bg-white rounded-xl border border-walnut/15 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-2 border-b border-walnut/15 pb-2">
              <Shield className="w-4 h-4 text-gold" /> System Account & RBAC
            </h3>
            {employee.user ? (
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div>
                  <span className="text-walnut text-[11px] block">Account Authority</span>
                  <span className="font-bold text-charcoal font-mono">{employee.user.accessLevel}</span>
                </div>
                <div>
                  <span className="text-walnut text-[11px] block">Account Status</span>
                  <span className="font-bold text-emerald-700">{employee.user.status}</span>
                </div>
                <div>
                  <span className="text-walnut text-[11px] block">Assigned Role</span>
                  <span className="font-bold text-charcoal font-mono">
                    {employee.user.userRoles?.[0]?.role?.name || "USER"}
                  </span>
                </div>
                {isSuperAdmin && (
                  <div>
                    <span className="text-walnut text-[11px] block">Permissions Management</span>
                    <Link
                      href={`/settings/users`}
                      className="text-gold font-bold hover:underline inline-flex items-center gap-1"
                    >
                      Configure Overrides <ArrowUpRight className="w-3 h-3" />
                    </Link>
                  </div>
                )}
              </div>
            ) : (
              <div className="text-xs text-walnut">
                No system login account linked to this employee profile.
              </div>
            )}
          </div>

          {/* Banking & UPI Details */}
          <div className="bg-white rounded-xl border border-walnut/15 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-2 border-b border-walnut/15 pb-2">
              <CreditCard className="w-4 h-4 text-gold" /> Banking & UPI Information
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-walnut text-[11px] block">UPI ID</span>
                <span className="font-bold text-charcoal font-mono">{employee.upiId || "—"}</span>
              </div>
              <div>
                <span className="text-walnut text-[11px] block">Bank Name</span>
                <span className="font-bold text-charcoal">{employee.bankName || "—"}</span>
              </div>
              <div>
                <span className="text-walnut text-[11px] block">Account Number</span>
                <span className="font-bold text-charcoal font-mono">{employee.bankAccountNo || "—"}</span>
              </div>
              <div>
                <span className="text-walnut text-[11px] block">IFSC Code</span>
                <span className="font-bold text-charcoal font-mono">{employee.bankIfsc || "—"}</span>
              </div>
            </div>
          </div>

          {/* Emergency Contact */}
          <div className="bg-white rounded-xl border border-walnut/15 p-5 shadow-2xs space-y-4">
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider flex items-center gap-2 border-b border-walnut/15 pb-2">
              <Phone className="w-4 h-4 text-gold" /> Emergency Contacts
            </h3>
            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <span className="text-walnut text-[11px] block">Emergency Contact</span>
                <span className="font-bold text-charcoal">{employee.emergencyContact || "—"}</span>
              </div>
              <div>
                <span className="text-walnut text-[11px] block">Emergency Phone</span>
                <span className="font-bold text-charcoal">{employee.emergencyPhone || "—"}</span>
              </div>
              <div className="col-span-2">
                <span className="text-walnut text-[11px] block">Residential Address</span>
                <span className="text-charcoal font-medium">{employee.address || "—"}</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 2: SALARY & COMPENSATION */}
      {/* ========================================================= */}
      {activeTab === "SALARY" && canViewSalary && (
        <div className="space-y-6">
          {/* Current Active Base Salary Card */}
          <div className="bg-white rounded-xl border border-walnut/15 p-5 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-gradient-to-r from-cream/60 to-white">
            <div>
              <p className="text-xs font-bold text-walnut uppercase tracking-wider">Current Monthly Base Salary</p>
              <p className="text-3xl font-bold text-charcoal mt-1 font-tabular">
                {employee.currentSalary !== undefined ? formatCurrency(employee.currentSalary) : "—"}
              </p>
              <p className="text-xs text-walnut mt-0.5">
                Standard monthly payment cycle via {employee.salaryStructures[0]?.paymentMethod || "UPI"}
              </p>
            </div>

            {canManageSalary && (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setIsConfigureSalaryOpen(true)}
                  className="px-3 py-2 text-xs font-bold text-charcoal bg-white hover:bg-cream border border-walnut/20 rounded-lg transition-colors cursor-pointer"
                >
                  Update Base Salary
                </button>
                {isActive && (
                  <button
                    onClick={() => setIsCreditModalOpen(true)}
                    className="px-4 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <DollarSign className="w-4 h-4" /> Credit Salary
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Salary Payments Table */}
          <div className="bg-white rounded-xl border border-walnut/15 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-walnut/15 bg-cream/30 flex items-center justify-between">
              <div>
                <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                  Salary Credit History ({employee.salaryPayments?.length || 0})
                </h3>
                <p className="text-[11px] text-walnut">
                  Every credited salary automatically generates a linked approved Business Expense.
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-walnut/15 bg-cream/20">
                    <th className="py-3 px-4 font-bold text-charcoal">Salary Period</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Amount</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Status</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Payment Date</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Method & Ref</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Linked Expense</th>
                    {canManageSalary && <th className="py-3 px-4 font-bold text-charcoal text-right">Actions</th>}
                  </tr>
                </thead>
                <tbody className="divide-y divide-walnut/10">
                  {employee.salaryPayments?.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="p-8 text-center text-walnut/60">
                        No salary credit transactions recorded yet.
                      </td>
                    </tr>
                  ) : (
                    employee.salaryPayments.map((p) => {
                      const isPaid = p.status === "PAID";
                      const monthName = monthNames[p.periodMonth - 1] || `Month ${p.periodMonth}`;

                      return (
                        <tr key={p.id} className="hover:bg-cream/20 transition-colors">
                          <td className="py-3.5 px-4 font-bold text-charcoal font-tabular">
                            {monthName} {p.periodYear}
                            <span className="text-[10px] text-walnut font-mono block">{p.referenceNo}</span>
                          </td>

                          <td className="py-3.5 px-4 font-bold text-charcoal font-tabular">
                            {formatCurrency(p.amount)}
                          </td>

                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                                isPaid
                                  ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                  : "bg-amber-100 text-amber-800 border border-amber-200"
                              }`}
                            >
                              {p.status}
                            </span>
                            {p.reversalReason && (
                              <span className="text-[10px] text-rose-700 block mt-0.5">
                                Reason: {p.reversalReason}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4 text-walnut font-tabular">
                            {formatDate(p.paymentDate)}
                          </td>

                          <td className="py-3.5 px-4">
                            <span className="font-semibold text-charcoal">{p.paymentMethod}</span>
                            {p.referenceNoExternal && (
                              <span className="text-[10px] text-walnut font-mono block">
                                Ref: {p.referenceNoExternal}
                              </span>
                            )}
                          </td>

                          <td className="py-3.5 px-4">
                            {p.expense ? (
                              <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cream border border-walnut/20 text-charcoal inline-flex items-center gap-1">
                                <Receipt className="w-3 h-3 text-gold" /> {p.expense.referenceNo}
                              </span>
                            ) : (
                              <span className="text-walnut/60">—</span>
                            )}
                          </td>

                          {canManageSalary && (
                            <td className="py-3.5 px-4 text-right">
                              {isPaid && (
                                <button
                                  onClick={() => setReversalTarget({ id: p.id, referenceNo: p.referenceNo, period: `${monthName} ${p.periodYear}` })}
                                  className="px-2.5 py-1 text-[11px] font-semibold text-amber-800 hover:bg-amber-50 border border-amber-200 rounded transition-colors cursor-pointer"
                                  title="Reverse salary credit"
                                >
                                  Reverse
                                </button>
                              )}
                            </td>
                          )}
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Salary Structure Timeline */}
          <div className="bg-white rounded-xl border border-walnut/15 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-walnut/15 bg-cream/30">
              <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                Base Salary Structure Timeline
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-walnut/15 bg-cream/20">
                    <th className="py-3 px-4 font-bold text-charcoal">Effective Date</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Base Amount</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Payment Mode</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-walnut/10">
                  {employee.salaryStructures.map((s) => (
                    <tr key={s.id}>
                      <td className="py-3 px-4 font-tabular text-charcoal font-semibold">
                        {formatDate(s.effectiveFrom)}
                      </td>
                      <td className="py-3 px-4 font-bold text-charcoal font-tabular">
                        {formatCurrency(s.baseSalary)}
                      </td>
                      <td className="py-3 px-4 text-walnut">{s.paymentMethod}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            s.isActive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-slate-100 text-slate-700"
                          }`}
                        >
                          {s.isActive ? "Current Active" : "Historical"}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 3: DIRECT EXPENSES */}
      {/* ========================================================= */}
      {activeTab === "EXPENSES" && (
        <div className="bg-white rounded-xl border border-walnut/15 shadow-2xs overflow-hidden">
          <div className="p-4 border-b border-walnut/15 bg-cream/30">
            <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
              Direct Employee Incurred Expenses ({employee.expenses?.length || 0})
            </h3>
            <p className="text-[11px] text-walnut">
              Direct project and general expenses submitted by or attributed to this employee.
            </p>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-walnut/15 bg-cream/20">
                  <th className="py-3 px-4 font-bold text-charcoal">Expense Details</th>
                  <th className="py-3 px-4 font-bold text-charcoal">Category</th>
                  <th className="py-3 px-4 font-bold text-charcoal">Project Link</th>
                  <th className="py-3 px-4 font-bold text-charcoal">Amount</th>
                  <th className="py-3 px-4 font-bold text-charcoal">Status</th>
                  <th className="py-3 px-4 font-bold text-charcoal">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-walnut/10">
                {employee.expenses?.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-8 text-center text-walnut/60">
                      No direct expenses attributed to this employee.
                    </td>
                  </tr>
                ) : (
                  employee.expenses.map((exp) => (
                    <tr key={exp.id} className="hover:bg-cream/20 transition-colors">
                      <td className="py-3 px-4">
                        <div className="font-bold text-charcoal">{exp.referenceNo}</div>
                        <div className="text-[11px] text-walnut line-clamp-1">{exp.description}</div>
                      </td>

                      <td className="py-3 px-4">
                        <span className="px-2 py-0.5 text-[10px] font-mono font-bold rounded bg-cream border border-walnut/20 text-charcoal">
                          {exp.categoryKey}
                        </span>
                      </td>

                      <td className="py-3 px-4">
                        {exp.project ? (
                          <Link
                            href={`/projects/${exp.project.id}`}
                            className="font-semibold text-charcoal hover:text-gold-darker flex items-center gap-1"
                          >
                            <span>{exp.project.referenceNo}</span>
                            <ExternalLink className="w-3 h-3 text-walnut/60" />
                          </Link>
                        ) : (
                          <span className="text-walnut/60">General Business</span>
                        )}
                      </td>

                      <td className="py-3 px-4 font-bold text-charcoal font-tabular">
                        {formatCurrency(exp.amount)}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            exp.status === "PAID" || exp.status === "APPROVED"
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : exp.status === "SUBMITTED"
                              ? "bg-blue-100 text-blue-800 border border-blue-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {exp.status}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-walnut font-tabular">
                        {formatDate(exp.expenseDate)}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 4: ADVANCES & PETTY CASH */}
      {/* ========================================================= */}
      {activeTab === "ADVANCES" && (
        <div className="space-y-6">
          {/* Summary Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="bg-white p-4 rounded-xl border border-walnut/15 shadow-2xs">
              <p className="text-[11px] font-bold text-walnut uppercase tracking-wider">Total Advances Issued</p>
              <p className="text-2xl font-bold text-charcoal mt-1 font-tabular">
                {formatCurrency(employee.advanceSummary?.totalIssued || 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-walnut/15 shadow-2xs">
              <p className="text-[11px] font-bold text-walnut uppercase tracking-wider">Total Petty Expenses Spent</p>
              <p className="text-2xl font-bold text-charcoal mt-1 font-tabular">
                {formatCurrency(employee.advanceSummary?.totalSpent || 0)}
              </p>
            </div>
            <div className="bg-white p-4 rounded-xl border border-walnut/15 shadow-2xs">
              <p className="text-[11px] font-bold text-walnut uppercase tracking-wider">Current Advance Float Balance</p>
              <p className="text-2xl font-bold text-amber-700 mt-1 font-tabular">
                {formatCurrency(employee.advanceSummary?.remainingBalance || 0)}
              </p>
            </div>
          </div>

          {/* Advances Table */}
          <div className="bg-white rounded-xl border border-walnut/15 shadow-2xs overflow-hidden">
            <div className="p-4 border-b border-walnut/15 bg-cream/30">
              <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                Petty Cash Advance Floats ({employee.advances?.length || 0})
              </h3>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="border-b border-walnut/15 bg-cream/20">
                    <th className="py-3 px-4 font-bold text-charcoal">Advance Ref</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Purpose</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Project</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Amount</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Status</th>
                    <th className="py-3 px-4 font-bold text-charcoal">Issued Date</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-walnut/10">
                  {employee.advances?.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="p-8 text-center text-walnut/60">
                        No petty cash advance floats recorded for this employee.
                      </td>
                    </tr>
                  ) : (
                    employee.advances.map((adv: any) => (
                      <tr key={adv.id} className="hover:bg-cream/20 transition-colors">
                        <td className="py-3 px-4 font-bold text-charcoal font-mono">{adv.referenceNo}</td>
                        <td className="py-3 px-4 text-charcoal">{adv.purpose}</td>
                        <td className="py-3 px-4 text-walnut">{adv.project?.referenceNo || "—"}</td>
                        <td className="py-3 px-4 font-bold text-charcoal font-tabular">{formatCurrency(adv.amount)}</td>
                        <td className="py-3 px-4">
                          <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-cream border border-walnut/20 text-charcoal">
                            {adv.status}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-walnut font-tabular">{formatDate(adv.issuedDate)}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* TAB 5: MONTHLY FINANCIAL SUMMARY */}
      {/* ========================================================= */}
      {activeTab === "COST_SUMMARY" && canViewSalary && (
        <div className="space-y-6">
          {/* Month / Year Filter Controls */}
          <div className="bg-white p-4 rounded-xl border border-walnut/15 shadow-2xs flex flex-wrap items-center justify-between gap-4">
            <div>
              <h3 className="text-xs font-bold text-charcoal uppercase tracking-wider">
                Monthly Employee Cost Calculation
              </h3>
              <p className="text-[11px] text-walnut">
                True company cost = Net Paid Salary + Direct Approved Expenses.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <select
                value={summaryMonth}
                onChange={(e) => setSummaryMonth(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 text-xs bg-cream/30 border border-walnut/20 rounded-lg text-charcoal font-semibold focus:outline-none focus:border-gold"
              >
                {monthNames.map((m, idx) => (
                  <option key={m} value={idx + 1}>
                    {m}
                  </option>
                ))}
              </select>

              <select
                value={summaryYear}
                onChange={(e) => setSummaryYear(parseInt(e.target.value, 10))}
                className="px-3 py-1.5 text-xs bg-cream/30 border border-walnut/20 rounded-lg text-charcoal font-semibold focus:outline-none focus:border-gold"
              >
                <option value={2025}>2025</option>
                <option value={2026}>2026</option>
                <option value={2027}>2027</option>
              </select>
            </div>
          </div>

          {isLoadingSummary ? (
            <div className="p-8 text-center text-walnut/60">Loading financial summary...</div>
          ) : monthlySummary ? (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="bg-white p-5 rounded-xl border border-walnut/15 shadow-2xs space-y-2">
                <p className="text-xs font-bold text-walnut uppercase tracking-wider">Net Paid Salary</p>
                <p className="text-2xl font-bold text-charcoal font-tabular">
                  {formatCurrency(monthlySummary.salary.amount)}
                </p>
                <p className="text-[11px] text-walnut">
                  {monthlySummary.salary.paid ? (
                    <span className="text-emerald-700 font-semibold flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5" /> Credited (Ref: {monthlySummary.salary.referenceNo})
                    </span>
                  ) : (
                    <span className="text-amber-700 font-semibold">Pending Credit</span>
                  )}
                </p>
              </div>

              <div className="bg-white p-5 rounded-xl border border-walnut/15 shadow-2xs space-y-2">
                <p className="text-xs font-bold text-walnut uppercase tracking-wider">Direct Employee Expenses</p>
                <p className="text-2xl font-bold text-charcoal font-tabular">
                  {formatCurrency(monthlySummary.directExpenses.total)}
                </p>
                <p className="text-[11px] text-walnut">
                  {monthlySummary.directExpenses.count} approved project/site expense(s)
                </p>
              </div>

              <div className="bg-gradient-to-br from-charcoal to-[#2E2824] text-white p-5 rounded-xl border border-charcoal shadow-md space-y-2">
                <p className="text-xs font-bold text-gold uppercase tracking-wider">Total Monthly Company Cost</p>
                <p className="text-3xl font-bold text-white font-tabular">
                  {formatCurrency(monthlySummary.totalCompanyCost)}
                </p>
                <p className="text-[11px] text-cream/70">
                  Calculated accurately without double-entry.
                </p>
              </div>
            </div>
          ) : null}
        </div>
      )}

      {/* ========================================================= */}
      {/* CREDIT SALARY MODAL */}
      {/* ========================================================= */}
      {isCreditModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-walnut/20 max-w-lg w-full overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70">
              <div>
                <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
                  <DollarSign className="w-5 h-5 text-gold" /> Credit Salary: {employee.fullName}
                </h3>
                <p className="text-xs text-walnut">Execute controlled salary payment and generate linked business expense.</p>
              </div>
              <button
                onClick={() => setIsCreditModalOpen(false)}
                className="p-1 text-walnut hover:text-charcoal rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreditSalary} className="p-6 space-y-4">
              {creditError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {creditError}
                </div>
              )}

              {/* Notice Banner */}
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-800 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
                <span>
                  <strong>Atomic Transaction:</strong> Confirming this salary credit creates the employee payment record AND automatically generates the canonical approved <strong>Business Expense (Category: Salary)</strong>.
                </span>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-walnut mb-1">Salary Month</label>
                  <select
                    value={creditMonth}
                    onChange={(e) => setCreditMonth(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal font-semibold focus:outline-none focus:border-gold"
                  >
                    {monthNames.map((m, idx) => (
                      <option key={m} value={idx + 1}>
                        {m}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-walnut mb-1">Salary Year</label>
                  <input
                    type="number"
                    value={creditYear}
                    onChange={(e) => setCreditYear(parseInt(e.target.value, 10))}
                    className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal font-semibold focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-walnut mb-1">
                    Amount to Credit (₹) <span className="text-rose-600">*</span>
                  </label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={creditAmount}
                    onChange={(e) => setCreditAmount(parseFloat(e.target.value) || 0)}
                    className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal font-bold font-tabular focus:outline-none focus:border-gold"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-walnut mb-1">Payment Method</label>
                  <select
                    value={creditPaymentMethod}
                    onChange={(e) => setCreditPaymentMethod(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal font-semibold focus:outline-none focus:border-gold"
                  >
                    <option value="UPI">UPI</option>
                    <option value="BANK_TRANSFER">Bank Transfer (NEFT/IMPS)</option>
                    <option value="CASH">Cash</option>
                    <option value="CHEQUE">Cheque</option>
                  </select>
                </div>

                <div className="col-span-2">
                  <label className="block text-xs font-bold text-walnut mb-1">
                    External Reference / UTR Number (Optional)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. UPI-1234567890 or Bank UTR"
                    value={creditReference}
                    onChange={(e) => setCreditReference(e.target.value)}
                    className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-walnut/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsCreditModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-walnut hover:bg-cream rounded-lg border border-walnut/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isCrediting}
                  className="px-5 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isCrediting ? "Crediting..." : "Confirm Salary Credit"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* CONFIGURE BASE SALARY MODAL */}
      {/* ========================================================= */}
      {isConfigureSalaryOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-walnut/20 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-gold" /> Update Base Salary Structure
            </h3>
            <p className="text-xs text-walnut">
              Updates the current active base salary while preserving historical salary records in the audit timeline.
            </p>

            <form onSubmit={handleConfigureSalary} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-walnut mb-1">New Monthly Base Salary (₹)</label>
                <input
                  type="number"
                  min="0"
                  step="500"
                  required
                  value={newBaseSalary}
                  onChange={(e) => setNewBaseSalary(parseFloat(e.target.value) || 0)}
                  className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal font-bold font-tabular focus:outline-none focus:border-gold"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-walnut mb-1">Payment Method</label>
                <select
                  value={newSalaryMethod}
                  onChange={(e) => setNewSalaryMethod(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal font-semibold focus:outline-none focus:border-gold"
                >
                  <option value="UPI">UPI</option>
                  <option value="BANK_TRANSFER">Bank Transfer</option>
                  <option value="CASH">Cash</option>
                  <option value="CHEQUE">Cheque</option>
                </select>
              </div>

              <div className="pt-3 border-t border-walnut/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsConfigureSalaryOpen(false)}
                  className="px-4 py-1.5 text-xs font-bold text-walnut hover:bg-cream rounded-lg border border-walnut/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSavingSalary}
                  className="px-4 py-1.5 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSavingSalary ? "Saving..." : "Update Base Salary"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REVERSAL MODAL */}
      {/* ========================================================= */}
      {reversalTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-walnut/20 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
            <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
              <RotateCcw className="w-5 h-5 text-amber-500" /> Reverse Salary Credit
            </h3>
            <p className="text-xs text-walnut leading-relaxed">
              You are about to reverse salary payment <strong>{reversalTarget.referenceNo}</strong> ({reversalTarget.period}). This will mark the salary payment as <code>REVERSED</code> and automatically cancel the linked expense with an audit trail.
            </p>

            <form onSubmit={handleReverseSalary} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-walnut mb-1">
                  Reason for Reversal <span className="text-rose-600">*</span>
                </label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Bank transfer failed / duplicate entry corrected"
                  value={reversalReason}
                  onChange={(e) => setReversalReason(e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                />
              </div>

              <div className="pt-3 border-t border-walnut/15 flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setReversalTarget(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-walnut hover:bg-cream rounded-lg border border-walnut/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isReversing}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isReversing ? "Reversing..." : "Confirm Reversal"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
