"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Building,
  Users,
  Shield,
  Sliders,
  Layers,
  Bell,
  HardDrive,
  UserCheck,
} from "lucide-react";

interface SettingsNavSection {
  title: string;
  items: {
    label: string;
    href: string;
    icon: React.ElementType;
  }[];
}

const navSections: SettingsNavSection[] = [
  {
    title: "COMPANY",
    items: [
      { label: "Company Profile", href: "/settings", icon: Building },
    ],
  },
  {
    title: "PEOPLE & ACCESS",
    items: [
      { label: "User Management", href: "/settings/users", icon: Users },
      { label: "Roles & Permissions", href: "/settings/roles", icon: Shield },
    ],
  },
  {
    title: "BUSINESS",
    items: [
      { label: "Business Preferences", href: "/settings/preferences", icon: Sliders },
      { label: "Project Stages", href: "/settings/stages", icon: Layers },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Notification Settings", href: "/settings/notifications", icon: Bell },
      { label: "Backup Settings", href: "/settings/backup", icon: HardDrive },
    ],
  },
  {
    title: "PERSONAL",
    items: [
      { label: "Profile Settings", href: "/settings/profile", icon: UserCheck },
    ],
  },
];

export function SettingsSidebar() {
  const pathname = usePathname();

  return (
    <aside className="w-full md:w-64 bg-offwhite border-r border-walnut/15 p-4 shrink-0 space-y-6">
      <div>
        <h2 className="text-xs font-bold uppercase tracking-wider text-charcoal">Settings Control Plane</h2>
        <p className="text-[11px] text-walnut mt-0.5">System administration &amp; preferences</p>
      </div>

      <nav className="space-y-5">
        {navSections.map((section) => (
          <div key={section.title} className="space-y-1">
            <span className="text-[10px] font-bold text-walnut uppercase tracking-wider block px-2 mb-1">
              {section.title}
            </span>
            <div className="space-y-0.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                const isActive = pathname === item.href;
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`flex items-center gap-2.5 px-3 py-2 text-xs font-semibold rounded-lg transition-colors ${
                      isActive
                        ? "bg-gold-soft text-charcoal font-bold border-l-2 border-gold shadow-2xs"
                        : "text-walnut hover:bg-cream hover:text-charcoal"
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? "text-gold" : "text-walnut"}`} />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        ))}
      </nav>
    </aside>
  );
}
