"use client";

import React, { useState, useEffect, useMemo } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  Users,
  UserPlus,
  Search,
  Building2,
  Briefcase,
  ShieldCheck,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  X,
  ChevronRight,
  TrendingUp,
  Receipt,
  UserCheck,
  Sparkles,
  Phone,
  Mail,
  SlidersHorizontal,
} from "lucide-react";
import { formatCurrency, formatDate } from "@/lib/utils";
import { usePermissions } from "@/components/providers/permissions-provider";

interface EmployeeItem {
  id: string;
  employeeNo: string;
  fullName: string;
  email: string;
  phone?: string | null;
  department: string;
  designation: string;
  joiningDate: string;
  status: string;
  currentSalary?: number;
  user?: {
    id: string;
    email: string;
    accessLevel: string;
    status: string;
    userRoles: { role: { name: string } }[];
  } | null;
  salaryStructures: { baseSalary: number; paymentMethod: string; isActive: boolean }[];
  _count: {
    salaryPayments: number;
    expenses: number;
  };
}

export default function EmployeesPage() {
  const router = useRouter();
  const { can, isSuperAdmin, isAdmin } = usePermissions();
  const [employees, setEmployees] = useState<EmployeeItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [departmentFilter, setDepartmentFilter] = useState("ALL");
  const [statusFilter, setStatusFilter] = useState("ACTIVE");

  // Add Employee Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [department, setDepartment] = useState("OPERATIONS");
  const [designation, setDesignation] = useState("");
  const [joiningDate, setJoiningDate] = useState(new Date().toISOString().split("T")[0]);
  const [address, setAddress] = useState("");
  const [emergencyContact, setEmergencyContact] = useState("");
  const [emergencyPhone, setEmergencyPhone] = useState("");
  const [bankName, setBankName] = useState("");
  const [bankAccountNo, setBankAccountNo] = useState("");
  const [bankIfsc, setBankIfsc] = useState("");
  const [upiId, setUpiId] = useState("");
  const [baseSalary, setBaseSalary] = useState<number>(20000);
  const [paymentMethod, setPaymentMethod] = useState("UPI");
  const [createUserAccount, setCreateUserAccount] = useState(true);
  const [accessLevel, setAccessLevel] = useState<"USER" | "ADMIN" | "SUPER_ADMIN">("USER");
  const [roleName, setRoleName] = useState("USER");
  const [password, setPassword] = useState("");

  const canManageSalary = isSuperAdmin || can("employees:manage_salary");
  const canViewSalary = canManageSalary || can("employees:view_salary");
  const canCreateEmployee = isSuperAdmin || can("employees:write");

  useEffect(() => {
    fetchEmployees();
  }, [departmentFilter, statusFilter]);

  const fetchEmployees = async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (departmentFilter !== "ALL") params.append("department", departmentFilter);
      if (statusFilter !== "ALL") params.append("status", statusFilter);

      const res = await fetch(`/api/v1/employees?${params.toString()}`);
      const json = await res.json();
      if (json.success) {
        setEmployees(json.data.employees || []);
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setIsSubmitting(true);

    try {
      const res = await fetch("/api/v1/employees", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName,
          email,
          phone: phone || null,
          department,
          designation,
          joiningDate,
          address: address || null,
          emergencyContact: emergencyContact || null,
          emergencyPhone: emergencyPhone || null,
          bankName: bankName || null,
          bankAccountNo: bankAccountNo || null,
          bankIfsc: bankIfsc || null,
          upiId: upiId || null,
          baseSalary: Number(baseSalary) || 0,
          paymentMethod,
          createUserAccount,
          accessLevel,
          roleName,
          password: password || undefined,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsAddModalOpen(false);
        // Reset form
        setFullName("");
        setEmail("");
        setPhone("");
        setDesignation("");
        setPassword("");
        fetchEmployees();
        if (json.data?.id) {
          router.push(`/employees/${json.data.id}`);
        }
      } else {
        setFormError(json.error?.message || "Failed to create employee profile");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Metrics overview calculations
  const metrics = useMemo(() => {
    const totalStaff = employees.length;
    const activeStaff = employees.filter((e) => e.status === "ACTIVE").length;
    const monthlySalaryOutflow = employees
      .filter((e) => e.status === "ACTIVE")
      .reduce((acc, curr) => acc + (curr.currentSalary || 0), 0);

    return {
      totalStaff,
      activeStaff,
      monthlySalaryOutflow,
    };
  }, [employees]);

  // Client-side search filtering
  const filteredEmployees = useMemo(() => {
    if (!searchQuery.trim()) return employees;
    const q = searchQuery.toLowerCase();
    return employees.filter(
      (e) =>
        e.fullName.toLowerCase().includes(q) ||
        e.employeeNo.toLowerCase().includes(q) ||
        e.email.toLowerCase().includes(q) ||
        (e.phone && e.phone.includes(q)) ||
        e.designation.toLowerCase().includes(q)
    );
  }, [employees, searchQuery]);

  return (
    <div className="space-y-6 select-none max-w-7xl mx-auto">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-walnut/15 pb-4">
        <div>
          <h1 className="text-2xl font-bold text-charcoal tracking-tight flex items-center gap-2.5">
            <Users className="w-6 h-6 text-gold" /> Employee & Staff Management
          </h1>
          <p className="text-xs text-walnut mt-1">
            Company workforce directory, employment profiles, RBAC mappings, salary compensation, and direct expense tracking.
          </p>
        </div>

        {canCreateEmployee && (
          <button
            onClick={() => setIsAddModalOpen(true)}
            className="px-4 py-2.5 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
          >
            <UserPlus className="w-4 h-4" /> Add New Employee
          </button>
        )}
      </div>

      {/* Metrics Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-xl border border-walnut/15 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-walnut uppercase tracking-wider">Total Staff Members</p>
            <p className="text-2xl font-bold text-charcoal mt-1 font-tabular">{metrics.totalStaff}</p>
            <p className="text-[10px] text-walnut/70 mt-0.5">{metrics.activeStaff} Active in Directory</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-emerald-50 text-emerald-700 flex items-center justify-center">
            <UserCheck className="w-5 h-5" />
          </div>
        </div>

        <div className="bg-white p-4 rounded-xl border border-walnut/15 shadow-2xs flex items-center justify-between">
          <div>
            <p className="text-[11px] font-bold text-walnut uppercase tracking-wider">Active Departments</p>
            <p className="text-2xl font-bold text-charcoal mt-1 font-tabular">6</p>
            <p className="text-[10px] text-walnut/70 mt-0.5">Design, Execution, Sales, Finance, Ops</p>
          </div>
          <div className="w-11 h-11 rounded-lg bg-blue-50 text-blue-700 flex items-center justify-center">
            <Building2 className="w-5 h-5" />
          </div>
        </div>

        {canViewSalary && (
          <div className="bg-white p-4 rounded-xl border border-walnut/15 shadow-2xs flex items-center justify-between">
            <div>
              <p className="text-[11px] font-bold text-walnut uppercase tracking-wider">Monthly Base Salary Outflow</p>
              <p className="text-2xl font-bold text-charcoal mt-1 font-tabular">
                {formatCurrency(metrics.monthlySalaryOutflow)}
              </p>
              <p className="text-[10px] text-emerald-700 mt-0.5 font-semibold">Active Monthly Payroll</p>
            </div>
            <div className="w-11 h-11 rounded-lg bg-amber-50 text-amber-700 flex items-center justify-center">
              <CreditCard className="w-5 h-5" />
            </div>
          </div>
        )}
      </div>

      {/* Search & Filter Bar */}
      <div className="bg-white p-3.5 rounded-xl border border-walnut/15 shadow-2xs flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2 flex-1 min-w-[260px]">
          <div className="relative w-full max-w-md">
            <Search className="w-4 h-4 text-walnut/60 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by name, employee ID, email, or role..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-cream/30 border border-walnut/20 rounded-lg text-charcoal placeholder:text-walnut/50 focus:outline-none focus:border-gold"
            />
          </div>
        </div>

        <div className="flex items-center gap-2 flex-wrap">
          <select
            value={departmentFilter}
            onChange={(e) => setDepartmentFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-cream/30 border border-walnut/20 rounded-lg text-charcoal font-medium focus:outline-none focus:border-gold"
          >
            <option value="ALL">All Departments</option>
            <option value="OPERATIONS">Operations</option>
            <option value="DESIGN">Design</option>
            <option value="FINANCE">Finance</option>
            <option value="SALES">Sales</option>
            <option value="SITE_EXECUTION">Site Execution</option>
            <option value="MANAGEMENT">Management</option>
          </select>

          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-2.5 py-1.5 text-xs bg-cream/30 border border-walnut/20 rounded-lg text-charcoal font-medium focus:outline-none focus:border-gold"
          >
            <option value="ACTIVE">Active Staff</option>
            <option value="INACTIVE">Inactive / Past</option>
            <option value="ALL">All Statuses</option>
          </select>
        </div>
      </div>

      {/* Employee Directory Table */}
      <div className="bg-white rounded-xl border border-walnut/15 shadow-2xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-walnut/15 bg-cream/40">
                <th className="py-3.5 px-4 font-bold text-charcoal">Employee Details</th>
                <th className="py-3.5 px-4 font-bold text-charcoal">Department & Role</th>
                <th className="py-3.5 px-4 font-bold text-charcoal">Joining Date</th>
                {canViewSalary && <th className="py-3.5 px-4 font-bold text-charcoal">Base Salary</th>}
                <th className="py-3.5 px-4 font-bold text-charcoal">Status</th>
                <th className="py-3.5 px-4 font-bold text-charcoal text-right">Profile</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-walnut/10">
              {isLoading ? (
                <tr>
                  <td colSpan={canViewSalary ? 6 : 5} className="p-12 text-center text-walnut/60">
                    Loading employee directory...
                  </td>
                </tr>
              ) : filteredEmployees.length === 0 ? (
                <tr>
                  <td colSpan={canViewSalary ? 6 : 5} className="p-12 text-center text-walnut/60">
                    No employee records found matching your filters.
                  </td>
                </tr>
              ) : (
                filteredEmployees.map((emp) => {
                  const isActive = emp.status === "ACTIVE";
                  const accessLevel = emp.user?.accessLevel || "USER";

                  return (
                    <tr
                      key={emp.id}
                      onClick={() => router.push(`/employees/${emp.id}`)}
                      className="hover:bg-cream/20 transition-colors cursor-pointer group"
                    >
                      <td className="py-3.5 px-4">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-lg bg-gold/15 text-gold-darker font-bold flex items-center justify-center text-xs shrink-0 group-hover:bg-gold group-hover:text-charcoal transition-colors">
                            {emp.fullName.charAt(0)}
                          </div>
                          <div>
                            <div className="font-bold text-charcoal group-hover:text-gold-darker transition-colors flex items-center gap-1.5">
                              {emp.fullName}
                              {accessLevel === "SUPER_ADMIN" && (
                                <span className="p-0.5 rounded bg-gold/20 text-gold-darker text-[10px]" title="Super Admin">
                                  <Sparkles className="w-3 h-3 text-gold" />
                                </span>
                              )}
                            </div>
                            <div className="text-walnut text-[11px] font-mono flex items-center gap-2 mt-0.5">
                              <span className="font-semibold text-charcoal">{emp.employeeNo}</span>
                              <span>•</span>
                              <span>{emp.email}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      <td className="py-3.5 px-4">
                        <div className="font-semibold text-charcoal">{emp.designation}</div>
                        <div className="text-[10px] text-walnut uppercase tracking-wider font-mono mt-0.5">
                          {emp.department}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-walnut font-tabular">
                        {formatDate(emp.joiningDate)}
                      </td>

                      {canViewSalary && (
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-charcoal font-tabular">
                            {emp.currentSalary !== undefined ? formatCurrency(emp.currentSalary) : "—"}
                          </span>
                          <span className="text-[10px] text-walnut block font-mono">Monthly Base</span>
                        </td>
                      )}

                      <td className="py-3.5 px-4">
                        <span
                          className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                            isActive
                              ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                              : "bg-rose-100 text-rose-800 border border-rose-200"
                          }`}
                        >
                          {emp.status}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-right">
                        <span className="inline-flex items-center gap-1 text-xs font-bold text-charcoal group-hover:text-gold-darker">
                          View <ChevronRight className="w-3.5 h-3.5" />
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* ========================================================= */}
      {/* ADD EMPLOYEE MODAL */}
      {/* ========================================================= */}
      {isAddModalOpen && (
        <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-charcoal/60 backdrop-blur-xs">
          <div className="bg-white rounded-xl shadow-2xl border border-walnut/20 w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150 max-h-[92vh] flex flex-col">
            <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70 shrink-0">
              <div>
                <h3 className="text-base font-bold text-charcoal">Add New Employee Profile</h3>
                <p className="text-xs text-walnut">Create personal records, employment details, and initial salary structure.</p>
              </div>
              <button
                onClick={() => setIsAddModalOpen(false)}
                className="p-1 text-walnut hover:text-charcoal rounded-md cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddEmployee} className="overflow-y-auto p-6 space-y-5 flex-1">
              {formError && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                  {formError}
                </div>
              )}

              {/* Personal Details */}
              <div>
                <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider border-b border-walnut/15 pb-1 mb-3">
                  1. Personal & Contact Information
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-walnut mb-1">
                      Full Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Soheb Khan"
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">
                      Email Address <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="email"
                      required
                      placeholder="soheb@espacio.in"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={phone}
                      onChange={(e) => setPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">Emergency Contact Person</label>
                    <input
                      type="text"
                      placeholder="Name / Relationship"
                      value={emergencyContact}
                      onChange={(e) => setEmergencyContact(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">Emergency Phone</label>
                    <input
                      type="text"
                      placeholder="+91 98765 00000"
                      value={emergencyPhone}
                      onChange={(e) => setEmergencyPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
              </div>

              {/* Employment Details */}
              <div>
                <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider border-b border-walnut/15 pb-1 mb-3">
                  2. Employment Details & Department
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">
                      Department <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={department}
                      onChange={(e) => setDepartment(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal font-semibold focus:outline-none focus:border-gold"
                    >
                      <option value="OPERATIONS">Operations</option>
                      <option value="DESIGN">Design</option>
                      <option value="FINANCE">Finance</option>
                      <option value="SALES">Sales</option>
                      <option value="SITE_EXECUTION">Site Execution</option>
                      <option value="MANAGEMENT">Management</option>
                      <option value="PROCUREMENT">Procurement</option>
                      <option value="HR">HR</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">
                      Designation <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Senior Interior Designer"
                      value={designation}
                      onChange={(e) => setDesignation(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">Date of Joining</label>
                    <input
                      type="date"
                      value={joiningDate}
                      onChange={(e) => setJoiningDate(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
              </div>

              {/* Salary & Banking */}
              <div>
                <h4 className="text-xs font-bold text-charcoal uppercase tracking-wider border-b border-walnut/15 pb-1 mb-3">
                  3. Compensation & Banking
                </h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">
                      Monthly Base Salary (₹)
                    </label>
                    <input
                      type="number"
                      min="0"
                      step="500"
                      value={baseSalary}
                      onChange={(e) => setBaseSalary(parseFloat(e.target.value) || 0)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal font-bold font-tabular focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">Payment Method</label>
                    <select
                      value={paymentMethod}
                      onChange={(e) => setPaymentMethod(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal font-semibold focus:outline-none focus:border-gold"
                    >
                      <option value="UPI">UPI</option>
                      <option value="BANK_TRANSFER">Bank Transfer (NEFT/RTGS/IMPS)</option>
                      <option value="CASH">Cash</option>
                      <option value="CHEQUE">Cheque</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">UPI ID</label>
                    <input
                      type="text"
                      placeholder="soheb@okaxis"
                      value={upiId}
                      onChange={(e) => setUpiId(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">Bank Name & A/C No.</label>
                    <input
                      type="text"
                      placeholder="HDFC Bank - 50100XXXXXXX"
                      value={bankAccountNo}
                      onChange={(e) => setBankAccountNo(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>
              </div>

              {/* Login Account & Access */}
              <div className="bg-cream/40 p-4 rounded-xl border border-walnut/15 space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="text-xs font-bold text-charcoal">System Login Account</h4>
                    <p className="text-[11px] text-walnut">Allow employee to log in to the ERP web application.</p>
                  </div>
                  <input
                    type="checkbox"
                    checked={createUserAccount}
                    onChange={(e) => setCreateUserAccount(e.target.checked)}
                    className="w-4 h-4 text-gold rounded border-walnut/30 focus:ring-gold cursor-pointer"
                  />
                </div>

                {createUserAccount && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-walnut/10">
                    <div>
                      <label className="block text-[11px] font-bold text-walnut mb-1">Authority Role</label>
                      <select
                        value={accessLevel}
                        onChange={(e) => {
                          const val = e.target.value as "USER" | "ADMIN" | "SUPER_ADMIN";
                          setAccessLevel(val);
                          setRoleName(val);
                        }}
                        className="w-full px-3 py-1.5 text-xs border border-walnut/20 bg-white rounded-lg text-charcoal font-semibold focus:outline-none focus:border-gold"
                      >
                        <option value="USER">USER (Standard Operations)</option>
                        <option value="ADMIN">ADMIN (Operational Manager)</option>
                        <option value="SUPER_ADMIN">SUPER ADMIN (Full Authority)</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-walnut mb-1">Initial Password (Optional)</label>
                      <input
                        type="password"
                        placeholder="Auto-generated if empty"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        className="w-full px-3 py-1.5 text-xs border border-walnut/20 bg-white rounded-lg text-charcoal focus:outline-none focus:border-gold"
                      />
                    </div>
                  </div>
                )}
              </div>

              {/* Footer */}
              <div className="pt-4 border-t border-walnut/15 flex items-center justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsAddModalOpen(false)}
                  className="px-4 py-2 text-xs font-bold text-walnut hover:bg-cream rounded-lg border border-walnut/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold transition-colors disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? "Creating Employee..." : "Create Employee Record"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
