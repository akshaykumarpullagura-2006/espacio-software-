"use client";

import React, { useState, useEffect } from "react";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { Shield, Check, Lock, Save, CheckCircle2, AlertCircle } from "lucide-react";

interface PermissionItem {
  id: string;
  code: string;
  module: string;
  description?: string | null;
}

interface RoleItem {
  id: string;
  name: string;
  description?: string | null;
  rolePermissions: { permissionId: string }[];
}

export default function RolesPermissionsPage() {
  const [roles, setRoles] = useState<RoleItem[]>([]);
  const [permissions, setPermissions] = useState<PermissionItem[]>([]);
  const [selectedRole, setSelectedRole] = useState<RoleItem | null>(null);
  const [activePermissions, setActivePermissions] = useState<Set<string>>(new Set());

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/settings/roles");
      const json = await res.json();
      if (json.success && json.data) {
        const fetchedRoles = json.data.roles || [];
        const fetchedPerms = json.data.permissions || [];
        setRoles(fetchedRoles);
        setPermissions(fetchedPerms);

        if (fetchedRoles.length > 0) {
          setSelectedRole(fetchedRoles[0]);
          const currentPermIds = new Set<string>(
            fetchedRoles[0].rolePermissions?.map((rp: any) => rp.permissionId) || []
          );
          setActivePermissions(currentPermIds);
        }
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  const handleSelectRole = (role: RoleItem) => {
    setSelectedRole(role);
    const currentPermIds = new Set<string>(
      role.rolePermissions?.map((rp: any) => rp.permissionId) || []
    );
    setActivePermissions(currentPermIds);
    setMessage(null);
  };

  const togglePermission = (permId: string) => {
    setActivePermissions((prev) => {
      const next = new Set(prev);
      if (next.has(permId)) {
        next.delete(permId);
      } else {
        next.add(permId);
      }
      return next;
    });
  };

  const handleSavePermissions = async () => {
    if (!selectedRole) return;
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/settings/roles", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          roleId: selectedRole.id,
          permissionIds: Array.from(activePermissions),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: `Permissions updated for ${selectedRole.name} role` });
        fetchData();
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to save permissions" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "Error saving permissions" });
    } finally {
      setIsSaving(false);
    }
  };

  // Group permissions by module
  const moduleGroupedPermissions = permissions.reduce<Record<string, PermissionItem[]>>((acc, perm) => {
    const mod = perm.module || "SYSTEM";
    if (!acc[mod]) acc[mod] = [];
    acc[mod].push(perm);
    return acc;
  }, {});

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50/50">
      <SettingsSidebar />

      <main className="flex-1 p-6 max-w-5xl space-y-6">
        <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Shield className="w-5 h-5 text-emerald-600" /> Roles & Permission Matrix
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Configuration-driven authorization matrix. Leadership role retains full administrative access across all modules.
            </p>
          </div>
        </div>

        {message && (
          <div
            className={`p-3.5 rounded-lg border text-xs font-medium flex items-center gap-2 ${
              message.type === "success"
                ? "bg-emerald-50 text-emerald-800 border-emerald-200"
                : "bg-rose-50 text-rose-800 border-rose-200"
            }`}
          >
            {message.type === "success" ? (
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            ) : (
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            )}
            <span>{message.text}</span>
          </div>
        )}

        {isLoading ? (
          <div className="bg-white p-8 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
            Loading permission matrix...
          </div>
        ) : (
          <div className="space-y-6">
            {/* Role Selector Chips */}
            <div className="flex items-center gap-2 overflow-x-auto pb-2 border-b border-slate-200">
              {roles.map((role) => (
                <button
                  key={role.id}
                  onClick={() => handleSelectRole(role)}
                  className={`px-3.5 py-1.5 text-xs font-bold font-mono rounded-lg transition-colors shrink-0 ${
                    selectedRole?.id === role.id
                      ? "bg-slate-900 text-white shadow-2xs"
                      : "bg-white text-slate-700 hover:bg-slate-100 border border-slate-200"
                  }`}
                >
                  {role.name}
                </button>
              ))}
            </div>

            {selectedRole && (
              <div className="bg-white rounded-xl border border-slate-200 shadow-2xs p-5 space-y-6">
                <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                  <div>
                    <h3 className="text-sm font-bold text-slate-900">{selectedRole.name} Role Permissions</h3>
                    <p className="text-xs text-slate-500">{selectedRole.description || "Configurable role permissions"}</p>
                  </div>
                  <button
                    onClick={handleSavePermissions}
                    disabled={isSaving}
                    className="px-4 py-1.5 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
                  >
                    <Save className="w-3.5 h-3.5" /> {isSaving ? "Saving..." : "Save Matrix"}
                  </button>
                </div>

                {/* Module Permission Matrix */}
                <div className="space-y-6">
                  {Object.entries(moduleGroupedPermissions).map(([modName, perms]) => (
                    <div key={modName} className="space-y-2">
                      <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider bg-slate-50 p-2 rounded-md border border-slate-100">
                        {modName} Module
                      </h4>

                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 pt-1">
                        {perms.map((perm) => {
                          const isChecked = activePermissions.has(perm.id);
                          return (
                            <div
                              key={perm.id}
                              onClick={() => togglePermission(perm.id)}
                              className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                                isChecked
                                  ? "bg-gold-soft border-gold/50 text-charcoal"
                                  : "bg-offwhite border-walnut/20 text-walnut hover:bg-cream"
                              }`}
                            >
                              <div
                                className={`w-4 h-4 rounded border mt-0.5 flex items-center justify-center shrink-0 ${
                                  isChecked ? "bg-gold border-gold text-charcoal" : "border-walnut/30 bg-offwhite"
                                }`}
                              >
                                {isChecked && <Check className="w-3 h-3 stroke-[3]" />}
                              </div>
                              <div className="space-y-0.5">
                                <span className="font-mono text-xs font-bold text-slate-900 block">{perm.code}</span>
                                {perm.description && <p className="text-[11px] text-slate-500">{perm.description}</p>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
