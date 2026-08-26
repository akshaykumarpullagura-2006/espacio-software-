"use client";

import React, { useState, useEffect } from "react";
import { SettingsSidebar } from "@/components/settings/settings-sidebar";
import { UserCheck, Save, CheckCircle2, AlertCircle, Shield } from "lucide-react";

export default function UserProfileSettingsPage() {
  const [profile, setProfile] = useState({
    id: "",
    email: "",
    fullName: "",
    phone: "",
    avatarUrl: "",
    userRoles: [] as any[],
  });

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/v1/settings/profile");
      const json = await res.json();
      if (json.success && json.data) {
        setProfile({
          id: json.data.id || "",
          email: json.data.email || "",
          fullName: json.data.fullName || "",
          phone: json.data.phone || "",
          avatarUrl: json.data.avatarUrl || "",
          userRoles: json.data.userRoles || [],
        });
      }
    } catch {
      // Quiet handling
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    setMessage(null);

    try {
      const res = await fetch("/api/v1/settings/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fullName: profile.fullName,
          phone: profile.phone,
          avatarUrl: profile.avatarUrl,
        }),
      });

      const json = await res.json();
      if (json.success) {
        setMessage({ type: "success", text: "Personal profile updated successfully" });
      } else {
        setMessage({ type: "error", text: json.error?.message || "Failed to update profile" });
      }
    } catch (err: any) {
      setMessage({ type: "error", text: err.message || "An error occurred" });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="flex flex-col md:flex-row min-h-screen bg-slate-50/50">
      <SettingsSidebar />

      <main className="flex-1 p-6 max-w-3xl space-y-6">
        <div className="border-b border-slate-200 pb-4 flex items-center justify-between">
          <div>
            <h1 className="text-xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" /> Personal Profile Settings
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Manage your personal user account profile and contact preferences. Role escalation must be performed by Administrators.
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
            Loading user profile...
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-4">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2">
                User Details
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Full Name</label>
                  <input
                    type="text"
                    required
                    value={profile.fullName}
                    onChange={(e) => setProfile({ ...profile, fullName: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Email Address <span className="text-slate-400 font-normal">(System ID - Read Only)</span>
                  </label>
                  <input
                    type="email"
                    disabled
                    value={profile.email}
                    className="w-full px-3 py-1.5 text-xs border border-slate-200 rounded-lg bg-slate-100 text-slate-500 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Phone Number</label>
                  <input
                    type="text"
                    value={profile.phone}
                    onChange={(e) => setProfile({ ...profile, phone: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">Avatar Image URL</label>
                  <input
                    type="text"
                    placeholder="https://example.com/avatar.jpg"
                    value={profile.avatarUrl}
                    onChange={(e) => setProfile({ ...profile, avatarUrl: e.target.value })}
                    className="w-full px-3 py-1.5 text-xs border border-slate-300 rounded-lg focus:outline-hidden focus:ring-2 focus:ring-emerald-500/20"
                  />
                </div>
              </div>
            </div>

            <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-2xs space-y-3">
              <h2 className="text-xs font-bold text-slate-900 uppercase tracking-wider border-b border-slate-100 pb-2 flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-emerald-600" /> Assigned Roles & System Authorization
              </h2>

              <div className="flex flex-wrap items-center gap-2 pt-1">
                {profile.userRoles && profile.userRoles.length > 0 ? (
                  profile.userRoles.map((ur: any) => (
                    <span
                      key={ur.role?.id || ur.id}
                      className="px-2.5 py-1 text-xs font-bold font-mono rounded-md bg-emerald-100 text-emerald-800 border border-emerald-200"
                    >
                      {ur.role?.name || "STAFF"}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-500">Standard Staff Access</span>
                )}
              </div>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="submit"
                disabled={isSaving}
                className="px-4 py-2 text-xs font-bold text-charcoal bg-gold hover:bg-gold-hover rounded-lg shadow-gold flex items-center gap-1.5 transition-colors disabled:opacity-50 cursor-pointer"
              >
                <Save className="w-4 h-4" /> {isSaving ? "Saving..." : "Save Profile"}
              </button>
            </div>
          </form>
        )}
      </main>
    </div>
  );
}
