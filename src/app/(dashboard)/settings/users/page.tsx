"use client";

import React, { useState, useEffect, useMemo } from "react";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import {
  Users,
  UserPlus,
  Shield,
  UserX,
  CheckCircle2,
  X,
  Search,
  Key,
  Sliders,
  Check,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Lock,
} from "lucide-react";
import { formatDate } from "@/lib/utils";
import { usePermissions } from "@/components/providers/permissions-provider";

interface UserItem {
  id: string;
  email: string;
  fullName: string;
  phone?: string | null;
  status: string;
  accessLevel: "SUPER_ADMIN" | "ADMIN" | "USER";
  createdAt: string;
  overridesCount: number;
  userRoles: { role: { id: string; name: string; description: string | null } }[];
}

interface PermissionDefinition {
  id: string;
  code: string;
  module: string;
  description: string | null;
}

interface PermissionOverrideItem {
  id?: string;
  permissionId: string;
  code: string;
  module: string;
  effect: "ALLOW" | "DENY";
}

export default function UserManagementPage() {
  const { isSuperAdmin } = usePermissions();
  const [users, setUsers] = useState<UserItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [roleFilter, setRoleFilter] = useState("ALL");

  // Add User Modal state
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPhone, setNewPhone] = useState("");
  const [newAccessLevel, setNewAccessLevel] = useState<"SUPER_ADMIN" | "ADMIN" | "USER">("USER");
  const [newRoleName, setNewRoleName] = useState("USER");
  const [newPassword, setNewPassword] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);

  // Permission Matrix Modal state
  const [isPermModalOpen, setIsPermModalOpen] = useState(false);
  const [activeUser, setActiveUser] = useState<UserItem | null>(null);
  const [allPermissions, setAllPermissions] = useState<PermissionDefinition[]>([]);
  const [userEffectivePerms, setUserEffectivePerms] = useState<string[]>([]);
  const [stagedOverrides, setStagedOverrides] = useState<Map<string, "ALLOW" | "DENY">>(new Map());
  const [permSearch, setPermSearch] = useState("");
  const [selectedModuleTab, setSelectedModuleTab] = useState("ALL");
  const [isSavingPerms, setIsSavingPerms] = useState(false);
  const [permSuccessMessage, setPermSuccessMessage] = useState<string | null>(null);

  // Confirmation Modal
  const [confirmAction, setConfirmAction] = useState<{
    title: string;
    message: string;
    onConfirm: () => void;
  } | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/settings/users");
      const json = await res.json();
      if (json.success) {
        setUsers(json.data || []);
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    if (!newEmail || !newName) return;

    setIsSubmitting(true);
    try {
      const res = await fetch("/api/v1/settings/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newEmail,
          fullName: newName,
          phone: newPhone || undefined,
          accessLevel: newAccessLevel,
          roleName: newRoleName,
          password: newPassword || undefined,
          status: "ACTIVE",
        }),
      });

      const json = await res.json();
      if (json.success) {
        setIsAddModalOpen(false);
        setNewEmail("");
        setNewName("");
        setNewPhone("");
        setNewPassword("");
        setNewAccessLevel("USER");
        setNewRoleName("USER");
        fetchUsers();
      } else {
        setFormError(json.error?.message || "Failed to create user");
      }
    } catch (err: any) {
      setFormError(err.message || "An unexpected error occurred");
    } finally {
      setIsSubmitting(false);
    }
  };

  const openPermissionMatrix = async (user: UserItem) => {
    setActiveUser(user);
    setIsPermModalOpen(true);
    setPermSuccessMessage(null);
    setPermSearch("");
    setSelectedModuleTab("ALL");

    try {
      const res = await fetch(`/api/v1/settings/users/${user.id}/permissions`);
      const json = await res.json();
      if (json.success) {
        setAllPermissions(json.data.allPermissions || []);
        setUserEffectivePerms(json.data.effectivePermissions || []);

        const overridesMap = new Map<string, "ALLOW" | "DENY">();
        for (const ov of (json.data.overrides || []) as PermissionOverrideItem[]) {
          overridesMap.set(ov.code, ov.effect);
        }
        setStagedOverrides(overridesMap);
      }
    } catch {
      // Quiet handling
    }
  };

  const handleTogglePermission = (code: string) => {
    const next = new Map(stagedOverrides);
    const current = next.get(code);

    if (current === "ALLOW") {
      // Switch from ALLOW to DENY
      next.set(code, "DENY");
    } else if (current === "DENY") {
      // Remove override (reset to inherited role permission)
      next.delete(code);
    } else {
      // No override currently: if currently effective, set DENY; if not, set ALLOW
      const isCurrentlyAllowed = userEffectivePerms.includes(code) || userEffectivePerms.includes("*");
      if (isCurrentlyAllowed) {
        next.set(code, "DENY");
      } else {
        next.set(code, "ALLOW");
      }
    }
    setStagedOverrides(next);
  };

  const handleSetModulePermissions = (moduleName: string, action: "ALLOW_ALL" | "DENY_ALL" | "RESET") => {
    const next = new Map(stagedOverrides);
    const targetPerms = allPermissions.filter((p) => p.module === moduleName);

    for (const p of targetPerms) {
      if (action === "ALLOW_ALL") {
        next.set(p.code, "ALLOW");
      } else if (action === "DENY_ALL") {
        next.set(p.code, "DENY");
      } else {
        next.delete(p.code);
      }
    }
    setStagedOverrides(next);
  };

  const handleSavePermissions = async () => {
    if (!activeUser) return;
    setIsSavingPerms(true);
    setPermSuccessMessage(null);

    const overridesArray = Array.from(stagedOverrides.entries()).map(([code, effect]) => ({
      code,
      effect,
    }));

    try {
      const res = await fetch(`/api/v1/settings/users/${activeUser.id}/permissions`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ overrides: overridesArray }),
      });

      const json = await res.json();
      if (json.success) {
        setUserEffectivePerms(json.data.effectivePermissions || []);
        setPermSuccessMessage("Permissions updated successfully and audit logged.");
        fetchUsers();
      }
    } catch {
      // Quiet handling
    } finally {
      setIsSavingPerms(false);
    }
  };

  const handleDeactivate = (userId: string, userName: string) => {
    setConfirmAction({
      title: "Deactivate User Account",
      message: `Are you sure you want to deactivate ${userName}? They will be immediately blocked from logging in, but all their historical records, project assignments, and audit logs will be safely preserved.`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/settings/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ deactivate: true }),
          });
          const json = await res.json();
          if (json.success) {
            fetchUsers();
          } else {
            alert(json.error?.message || "Failed to deactivate user");
          }
        } catch {
          // Quiet handling
        }
        setConfirmAction(null);
      },
    });
  };

  const handleReactivate = (userId: string, userName: string) => {
    setConfirmAction({
      title: "Reactivate User Account",
      message: `Restore active access for ${userName}?`,
      onConfirm: async () => {
        try {
          const res = await fetch(`/api/v1/settings/users/${userId}`, {
            method: "PATCH",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reactivate: true }),
          });
          const json = await res.json();
          if (json.success) {
            fetchUsers();
          }
        } catch {
          // Quiet handling
        }
        setConfirmAction(null);
      },
    });
  };

  // Filtered user list
  const filteredUsers = useMemo(() => {
    return users.filter((u) => {
      const matchSearch =
        u.fullName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        u.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (u.phone && u.phone.includes(searchQuery));

      const matchStatus = statusFilter === "ALL" || u.status === statusFilter;
      const matchRole =
        roleFilter === "ALL" ||
        u.accessLevel === roleFilter ||
        u.userRoles.some((r) => r.role.name === roleFilter);

      return matchSearch && matchStatus && matchRole;
    });
  }, [users, searchQuery, statusFilter, roleFilter]);

  // Unique modules list for tabs
  const modulesList = useMemo(() => {
    const set = new Set<string>();
    for (const p of allPermissions) {
      set.add(p.module);
    }
    return ["ALL", ...Array.from(set).sort()];
  }, [allPermissions]);

  // Filtered permissions in modal
  const filteredModalPermissions = useMemo(() => {
    return allPermissions.filter((p) => {
      const matchTab = selectedModuleTab === "ALL" || p.module === selectedModuleTab;
      const matchSearch =
        !permSearch ||
        p.code.toLowerCase().includes(permSearch.toLowerCase()) ||
        (p.description && p.description.toLowerCase().includes(permSearch.toLowerCase()));
      return matchTab && matchSearch;
    });
  }, [allPermissions, selectedModuleTab, permSearch]);

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-cream/40">
      <SettingsSidebar />

      <main className="flex-1 p-4 sm:p-6 max-w-6xl space-y-6">
        {/* Header */}
        <div className="border-b border-walnut/15 pb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-bold text-charcoal tracking-tight flex items-center gap-2">
              <Users className="w-5 h-5 text-gold" /> User & Access Administration
            </h1>
            <p className="text-xs text-walnut mt-0.5">
              Manage system accounts, 3-tier authority roles (Super Admin, Admin, User), and custom module/action permission overrides.
            </p>
          </div>

          {isSuperAdmin && (
            <button
              onClick={() => setIsAddModalOpen(true)}
              className="px-4 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold flex items-center gap-2 transition-colors cursor-pointer self-start sm:self-auto"
            >
              <UserPlus className="w-4 h-4" /> Add New User
            </button>
          )}
        </div>

        {/* Filters Bar */}
        <div className="bg-white p-3.5 rounded-xl border border-walnut/15 shadow-2xs flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2 flex-1 min-w-[240px]">
            <div className="relative w-full max-w-md">
              <Search className="w-4 h-4 text-walnut/60 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search by name, email, or phone..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-3 py-1.5 text-xs bg-cream/30 border border-walnut/20 rounded-lg text-charcoal placeholder:text-walnut/50 focus:outline-none focus:border-gold"
              />
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-cream/30 border border-walnut/20 rounded-lg text-charcoal font-medium focus:outline-none focus:border-gold"
            >
              <option value="ALL">All Statuses</option>
              <option value="ACTIVE">Active Only</option>
              <option value="DEACTIVATED">Deactivated Only</option>
            </select>

            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value)}
              className="px-2.5 py-1.5 text-xs bg-cream/30 border border-walnut/20 rounded-lg text-charcoal font-medium focus:outline-none focus:border-gold"
            >
              <option value="ALL">All Authority Roles</option>
              <option value="SUPER_ADMIN">SUPER ADMIN</option>
              <option value="ADMIN">ADMIN</option>
              <option value="USER">USER</option>
            </select>
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white rounded-xl border border-walnut/15 shadow-2xs overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-walnut/15 bg-cream/40">
                  <th className="py-3 px-4 font-bold text-charcoal">User Account</th>
                  <th className="py-3 px-4 font-bold text-charcoal">Authority Level</th>
                  <th className="py-3 px-4 font-bold text-charcoal">Status</th>
                  <th className="py-3 px-4 font-bold text-charcoal">Permissions Matrix</th>
                  <th className="py-3 px-4 font-bold text-charcoal">Created At</th>
                  <th className="py-3 px-4 font-bold text-charcoal text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-walnut/10">
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-walnut/60">
                      Loading user accounts...
                    </td>
                  </tr>
                ) : filteredUsers.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="p-12 text-center text-walnut/60">
                      No user accounts found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredUsers.map((user) => {
                    const isDeactivated = user.status === "DEACTIVATED";
                    const isSuper = user.accessLevel === "SUPER_ADMIN";
                    const isAdmin = user.accessLevel === "ADMIN";

                    return (
                      <tr key={user.id} className="hover:bg-cream/20 transition-colors">
                        <td className="py-3.5 px-4">
                          <div className="font-bold text-charcoal flex items-center gap-1.5">
                            {user.fullName}
                            {isSuper && (
                              <span className="p-0.5 rounded bg-gold/20 text-gold-darker text-[10px]" title="Super Admin">
                                <Sparkles className="w-3 h-3 text-gold" />
                              </span>
                            )}
                          </div>
                          <div className="text-walnut text-[11px] font-mono mt-0.5">{user.email}</div>
                          {user.phone && <div className="text-walnut/70 text-[10px]">{user.phone}</div>}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2.5 py-1 text-[10px] font-bold font-mono rounded-md border ${
                              isSuper
                                ? "bg-amber-100 text-amber-900 border-amber-300 shadow-2xs"
                                : isAdmin
                                ? "bg-slate-800 text-white border-slate-900"
                                : "bg-cream text-charcoal border-walnut/20"
                            }`}
                          >
                            {user.accessLevel}
                          </span>
                          {user.userRoles?.[0]?.role?.name && user.userRoles[0].role.name !== user.accessLevel && (
                            <div className="text-[10px] text-walnut/70 mt-1 font-mono">
                              Template: {user.userRoles[0].role.name}
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 text-[10px] font-bold rounded-full ${
                              user.status === "ACTIVE"
                                ? "bg-emerald-100 text-emerald-800 border border-emerald-200"
                                : "bg-rose-100 text-rose-800 border border-rose-200"
                            }`}
                          >
                            {user.status}
                          </span>
                        </td>

                        <td className="py-3.5 px-4">
                          {isSuper ? (
                            <span className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
                              <Shield className="w-3.5 h-3.5 text-gold" /> Universal Access (*)
                            </span>
                          ) : (
                            <div className="space-y-1">
                              <div className="text-[11px] text-charcoal">
                                {user.overridesCount > 0 ? (
                                  <span className="font-semibold text-gold-darker">
                                    {user.overridesCount} Custom Overrides
                                  </span>
                                ) : (
                                  <span className="text-walnut/80">Inherited from Role</span>
                                )}
                              </div>
                            </div>
                          )}
                        </td>

                        <td className="py-3.5 px-4 text-walnut font-tabular">
                          {formatDate(user.createdAt)}
                        </td>

                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            {isSuperAdmin && (
                              <button
                                onClick={() => openPermissionMatrix(user)}
                                className="px-2.5 py-1 text-[11px] font-bold text-charcoal bg-cream hover:bg-cream-hover border border-walnut/20 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                title="Manage custom module & action permissions"
                              >
                                <Sliders className="w-3 h-3 text-gold" /> Permissions
                              </button>
                            )}

                            {isSuperAdmin && !isDeactivated && (
                              <button
                                onClick={() => handleDeactivate(user.id, user.fullName)}
                                className="px-2 py-1 text-[11px] font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                title="Deactivate user account"
                              >
                                <UserX className="w-3 h-3" />
                              </button>
                            )}

                            {isSuperAdmin && isDeactivated && (
                              <button
                                onClick={() => handleReactivate(user.id, user.fullName)}
                                className="px-2.5 py-1 text-[11px] font-bold text-emerald-700 hover:bg-emerald-50 border border-emerald-200 rounded-md transition-colors flex items-center gap-1 cursor-pointer"
                                title="Reactivate user account"
                              >
                                <Check className="w-3 h-3" /> Reactivate
                              </button>
                            )}
                          </div>
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
        {/* ADD USER MODAL */}
        {/* ========================================================= */}
        {isAddModalOpen && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-2xl border border-walnut/20 w-full max-w-lg overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70">
                <div>
                  <h3 className="text-base font-bold text-charcoal">Create New System User</h3>
                  <p className="text-xs text-walnut">Add a new operational team member or management account.</p>
                </div>
                <button
                  onClick={() => setIsAddModalOpen(false)}
                  className="p-1 text-walnut hover:text-charcoal rounded-md cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <form onSubmit={handleAddUser} className="p-6 space-y-4">
                {formError && (
                  <div className="p-3 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                    {formError}
                  </div>
                )}

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div className="sm:col-span-2">
                    <label className="block text-xs font-bold text-walnut mb-1">
                      Full Name <span className="text-rose-600">*</span>
                    </label>
                    <input
                      type="text"
                      required
                      placeholder="e.g. Soheb Khan"
                      value={newName}
                      onChange={(e) => setNewName(e.target.value)}
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
                      value={newEmail}
                      onChange={(e) => setNewEmail(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">Phone Number</label>
                    <input
                      type="text"
                      placeholder="+91 98765 43210"
                      value={newPhone}
                      onChange={(e) => setNewPhone(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">
                      Authority Level <span className="text-rose-600">*</span>
                    </label>
                    <select
                      value={newAccessLevel}
                      onChange={(e) => {
                        const val = e.target.value as "SUPER_ADMIN" | "ADMIN" | "USER";
                        setNewAccessLevel(val);
                        setNewRoleName(val);
                      }}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 rounded-lg bg-cream/30 text-charcoal font-semibold focus:outline-none focus:border-gold"
                    >
                      <option value="USER">USER (Standard Operations)</option>
                      <option value="ADMIN">ADMIN (Operational Manager)</option>
                      <option value="SUPER_ADMIN">SUPER ADMIN (Full System Authority)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-bold text-walnut mb-1">
                      Initial Password (Optional)
                    </label>
                    <input
                      type="password"
                      placeholder="Auto-generated if empty"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full px-3 py-2 text-xs border border-walnut/20 bg-cream/30 rounded-lg text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>
                </div>

                <div className="pt-4 border-t border-walnut/15 flex items-center justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setIsAddModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-walnut hover:bg-cream rounded-lg transition-colors border border-walnut/20 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="px-5 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    {isSubmitting ? "Creating Account..." : "Create User Account"}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* PERMISSION MATRIX MODAL / DRAWER */}
        {/* ========================================================= */}
        {isPermModalOpen && activeUser && (
          <div className="fixed inset-0 z-50 overflow-y-auto flex items-center justify-center p-3 sm:p-6 bg-charcoal/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-2xl border border-walnut/20 w-full max-w-4xl max-h-[90vh] flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-150">
              {/* Modal Header */}
              <div className="px-6 py-4 border-b border-walnut/15 flex items-center justify-between bg-cream/70 shrink-0">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-lg bg-gold/20 flex items-center justify-center text-gold-darker font-bold">
                    <Shield className="w-5 h-5 text-gold" />
                  </div>
                  <div>
                    <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
                      Permissions Matrix: <span className="text-gold-darker">{activeUser.fullName}</span>
                      <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-white border border-walnut/20 text-charcoal">
                        {activeUser.accessLevel}
                      </span>
                    </h3>
                    <p className="text-xs text-walnut">
                      Configure granular module and action-level permission overrides for this specific user.
                    </p>
                  </div>
                </div>

                <button
                  onClick={() => setIsPermModalOpen(false)}
                  className="p-1.5 text-walnut hover:text-charcoal rounded-md cursor-pointer"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Status Alert */}
              {activeUser.accessLevel === "SUPER_ADMIN" ? (
                <div className="p-4 bg-amber-50 border-b border-amber-200 text-xs text-amber-900 flex items-center gap-2 shrink-0">
                  <Sparkles className="w-4 h-4 text-amber-600 shrink-0" />
                  <span>
                    <strong>Super Admin Notice:</strong> This user holds <code>SUPER_ADMIN</code> authority and automatically possesses unrestricted universal access (<code>*</code>). Direct overrides will take effect if their role changes.
                  </span>
                </div>
              ) : permSuccessMessage ? (
                <div className="p-3 bg-emerald-50 border-b border-emerald-200 text-xs text-emerald-800 flex items-center gap-2 shrink-0">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                  {permSuccessMessage}
                </div>
              ) : null}

              {/* Controls & Module Tabs */}
              <div className="p-4 border-b border-walnut/15 space-y-3 bg-white shrink-0">
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="relative w-full sm:w-72">
                    <Search className="w-3.5 h-3.5 text-walnut/60 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      placeholder="Search permissions..."
                      value={permSearch}
                      onChange={(e) => setPermSearch(e.target.value)}
                      className="w-full pl-8 pr-3 py-1 text-xs bg-cream/30 border border-walnut/20 rounded-md text-charcoal focus:outline-none focus:border-gold"
                    />
                  </div>

                  <div className="flex items-center gap-2 self-end sm:self-auto text-[11px]">
                    <span className="text-walnut">Legend:</span>
                    <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 font-bold border border-emerald-200">
                      ALLOW Override
                    </span>
                    <span className="px-2 py-0.5 rounded bg-rose-100 text-rose-800 font-bold border border-rose-200">
                      DENY Override
                    </span>
                    <span className="px-2 py-0.5 rounded bg-slate-100 text-slate-700 border border-slate-200">
                      Inherited
                    </span>
                  </div>
                </div>

                {/* Module Tabs */}
                <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs font-semibold">
                  {modulesList.map((mod) => (
                    <button
                      key={mod}
                      onClick={() => setSelectedModuleTab(mod)}
                      className={`px-3 py-1 rounded-md transition-colors whitespace-nowrap cursor-pointer ${
                        selectedModuleTab === mod
                          ? "bg-gold text-charcoal font-bold shadow-2xs"
                          : "bg-cream/40 text-walnut hover:bg-cream"
                      }`}
                    >
                      {mod}
                    </button>
                  ))}
                </div>
              </div>

              {/* Permissions Grid / List */}
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 bg-cream/10 space-y-3">
                {selectedModuleTab !== "ALL" && (
                  <div className="flex items-center justify-between pb-2 border-b border-walnut/15">
                    <span className="text-xs font-bold text-charcoal uppercase tracking-wider">
                      Module: {selectedModuleTab} ({filteredModalPermissions.length} permissions)
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleSetModulePermissions(selectedModuleTab, "ALLOW_ALL")}
                        className="px-2 py-0.5 text-[10px] font-bold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded cursor-pointer"
                      >
                        Allow All in {selectedModuleTab}
                      </button>
                      <button
                        onClick={() => handleSetModulePermissions(selectedModuleTab, "DENY_ALL")}
                        className="px-2 py-0.5 text-[10px] font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded cursor-pointer"
                      >
                        Deny All in {selectedModuleTab}
                      </button>
                      <button
                        onClick={() => handleSetModulePermissions(selectedModuleTab, "RESET")}
                        className="px-2 py-0.5 text-[10px] font-medium text-walnut bg-cream hover:bg-cream-hover border border-walnut/20 rounded cursor-pointer"
                      >
                        Reset Module
                      </button>
                    </div>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-2.5">
                  {filteredModalPermissions.map((perm) => {
                    const override = stagedOverrides.get(perm.code);
                    const isInherited = userEffectivePerms.includes(perm.code) || userEffectivePerms.includes("*");

                    return (
                      <div
                        key={perm.id}
                        onClick={() => handleTogglePermission(perm.code)}
                        className={`p-3 rounded-lg border transition-all cursor-pointer select-none flex items-start justify-between gap-3 ${
                          override === "ALLOW"
                            ? "bg-emerald-50/80 border-emerald-300 shadow-2xs"
                            : override === "DENY"
                            ? "bg-rose-50/80 border-rose-300 shadow-2xs"
                            : isInherited
                            ? "bg-white border-walnut/20 hover:border-gold/50"
                            : "bg-cream/20 border-walnut/10 hover:border-walnut/30 opacity-75"
                        }`}
                      >
                        <div className="space-y-1 min-w-0">
                          <div className="flex items-center gap-2">
                            <span className="font-mono text-xs font-bold text-charcoal">{perm.code}</span>
                            <span className="px-1.5 py-0.2 text-[9px] font-mono rounded bg-cream border border-walnut/15 text-walnut">
                              {perm.module}
                            </span>
                          </div>
                          {perm.description && (
                            <p className="text-[11px] text-walnut line-clamp-2">{perm.description}</p>
                          )}
                        </div>

                        <div className="shrink-0 flex flex-col items-end gap-1">
                          {override === "ALLOW" ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-emerald-600 text-white shadow-2xs flex items-center gap-1">
                              <Check className="w-3 h-3" /> ALLOW
                            </span>
                          ) : override === "DENY" ? (
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-rose-600 text-white shadow-2xs flex items-center gap-1">
                              <X className="w-3 h-3" /> DENY
                            </span>
                          ) : isInherited ? (
                            <span className="px-2 py-0.5 text-[10px] font-semibold rounded bg-slate-100 text-slate-700 border border-slate-200">
                              Active (Role)
                            </span>
                          ) : (
                            <span className="px-2 py-0.5 text-[10px] font-medium rounded bg-cream text-walnut border border-walnut/15">
                              Disabled
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Modal Footer */}
              <div className="p-4 border-t border-walnut/15 bg-cream/40 flex items-center justify-between shrink-0">
                <div className="text-xs text-walnut">
                  {stagedOverrides.size > 0 ? (
                    <span className="font-semibold text-charcoal">
                      {stagedOverrides.size} explicit custom override(s) configured.
                    </span>
                  ) : (
                    <span>No explicit overrides; using inherited role permissions.</span>
                  )}
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setIsPermModalOpen(false)}
                    className="px-4 py-2 text-xs font-bold text-walnut hover:bg-cream rounded-lg transition-colors border border-walnut/20 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={handleSavePermissions}
                    disabled={isSavingPerms}
                    className="px-5 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold transition-colors disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
                  >
                    {isSavingPerms ? "Saving Overrides..." : "Save Permission Changes"}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ========================================================= */}
        {/* CONFIRMATION MODAL */}
        {/* ========================================================= */}
        {confirmAction && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-charcoal/60 backdrop-blur-xs">
            <div className="bg-white rounded-xl shadow-2xl border border-walnut/20 max-w-md w-full p-6 space-y-4 animate-in fade-in zoom-in-95 duration-150">
              <h3 className="text-base font-bold text-charcoal flex items-center gap-2">
                <AlertTriangle className="w-5 h-5 text-amber-500" />
                {confirmAction.title}
              </h3>
              <p className="text-xs text-walnut leading-relaxed">{confirmAction.message}</p>
              <div className="pt-3 border-t border-walnut/15 flex items-center justify-end gap-3">
                <button
                  onClick={() => setConfirmAction(null)}
                  className="px-4 py-1.5 text-xs font-semibold text-walnut hover:bg-cream rounded-lg border border-walnut/20 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  onClick={confirmAction.onConfirm}
                  className="px-4 py-1.5 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-lg transition-colors cursor-pointer"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
