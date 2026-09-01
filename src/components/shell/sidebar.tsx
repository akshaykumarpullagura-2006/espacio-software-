"use client";

import React, { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";
import { usePermissions } from "@/components/providers/permissions-provider";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  Receipt,
  Wallet,
  Coins,
  Truck,
  ShoppingCart,
  Package,
  BarChart3,
  Bell,
  Settings,
  ChevronLeft,
  ChevronRight,
  X,
} from "lucide-react";

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
  permission?: string;
  adminOnly?: boolean;
}

interface NavSection {
  title: string;
  items: NavItem[];
}

const navSections: NavSection[] = [
  {
    title: "MAIN",
    items: [
      { label: "Dashboard", href: "/dashboard", icon: <LayoutDashboard className="w-4 h-4" /> },
      { label: "Leads", href: "/leads", icon: <Users className="w-4 h-4" />, permission: "leads:read" },
      { label: "Projects", href: "/projects", icon: <FolderKanban className="w-4 h-4" />, permission: "projects:read" },
      { label: "Quotations", href: "/quotations", icon: <FileText className="w-4 h-4" />, permission: "quotations:read" },
      { label: "Payments", href: "/finance/payments", icon: <Receipt className="w-4 h-4" />, permission: "payments:read" },
      { label: "Expenses", href: "/finance/expenses", icon: <Wallet className="w-4 h-4" />, permission: "expenses:read" },
      { label: "Petty Cash", href: "/finance/petty-cash", icon: <Coins className="w-4 h-4" />, permission: "petty_cash:read" },
      { label: "Vendors", href: "/procurement/vendors", icon: <Truck className="w-4 h-4" />, permission: "vendors:read" },
      { label: "Purchase Orders", href: "/procurement/purchase-orders", icon: <ShoppingCart className="w-4 h-4" />, permission: "purchase_orders:read" },
      { label: "Material Requests", href: "/procurement/material-requests", icon: <Package className="w-4 h-4" />, permission: "material_requests:read" },
    ],
  },
  {
    title: "INSIGHTS",
    items: [
      { label: "Reports & Analytics", href: "/reports", icon: <BarChart3 className="w-4 h-4" />, permission: "reports:read" },
    ],
  },
  {
    title: "SYSTEM",
    items: [
      { label: "Notifications", href: "/notifications", icon: <Bell className="w-4 h-4" /> },
      { label: "Settings", href: "/settings", icon: <Settings className="w-4 h-4" />, permission: "settings:manage" },
    ],
  },
];

export interface SidebarProps {
  isMobileOpen?: boolean;
  onCloseMobile?: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ isMobileOpen, onCloseMobile }) => {
  const pathname = usePathname();
  const [isCollapsed, setIsCollapsed] = useState(false);
  const { can, isSuperAdmin, isAdmin } = usePermissions();

  const filteredSections = navSections
    .map((section) => {
      const filteredItems = section.items.filter((item) => {
        if (isSuperAdmin) return true;
        if (item.adminOnly && !isAdmin) return false;
        if (item.permission && !can(item.permission)) return false;
        return true;
      });

      return {
        ...section,
        items: filteredItems,
      };
    })
    .filter((section) => section.items.length > 0);

  const renderNavContent = (isMobileView: boolean) => (
    <>
      {/* Brand Header */}
      <div className="h-14 sm:h-16 px-4 flex items-center justify-between border-b border-walnut/30 shrink-0 bg-[#423C36]">
        <Link
          href="/dashboard"
          onClick={() => isMobileView && onCloseMobile?.()}
          className="flex items-center gap-3 overflow-hidden"
        >
          <Logo
            size="sm"
            light
            subtitle="INTERIORS & MODULAR"
            collapsed={isCollapsed && !isMobileView}
          />
        </Link>
        {isMobileView && (
          <button
            onClick={onCloseMobile}
            className="p-1 rounded-md text-[#E8DEC8] hover:text-[#FAF6EF] hover:bg-walnut/30 cursor-pointer"
            title="Close navigation"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Navigation Sections */}
      <nav className="flex-1 px-2.5 py-3 space-y-4 overflow-y-auto overflow-x-hidden">
        {filteredSections.map((section) => (
          <div key={section.title} className="space-y-1">
            {!isCollapsed || isMobileView ? (
              <h3 className="px-2.5 text-[10px] font-bold text-[#D4C3B3] uppercase tracking-wider">
                {section.title}
              </h3>
            ) : (
              <div className="h-px bg-walnut/25 my-2 mx-1" />
            )}

            {section.items.map((item) => {
              const isActive = pathname === item.href || (item.href !== "/dashboard" && pathname.startsWith(item.href + "/"));

              return (
                <div key={item.href} className="relative group">
                  <Link
                    href={item.href}
                    prefetch={true}
                    onClick={() => isMobileView && onCloseMobile?.()}
                    className={cn(
                      "flex items-center gap-2.5 px-2.5 py-1.5 text-xs font-medium rounded-md transition-all duration-150 cursor-pointer",
                      isActive
                        ? "bg-gold text-charcoal font-bold shadow-gold"
                        : "text-[#FAF6EF] hover:bg-walnut/30 hover:text-white"
                    )}
                  >
                    <span className={cn(isActive ? "text-charcoal" : "text-[#E8DEC8] group-hover:text-white")}>
                      {item.icon}
                    </span>
                    {(!isCollapsed || isMobileView) && <span className="truncate">{item.label}</span>}
                  </Link>

                  {/* Tooltip on Collapsed Hover (Desktop only) */}
                  {isCollapsed && !isMobileView && (
                    <div className="absolute left-full top-1/2 -translate-y-1/2 ml-2 px-2.5 py-1 bg-[#4A433D] text-cream text-xs font-medium rounded-md shadow-modal border border-walnut/30 whitespace-nowrap opacity-0 pointer-events-none group-hover:opacity-100 transition-opacity z-50">
                      {item.label}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
      </nav>

      {/* Collapse Toggle Footer (Desktop only) */}
      {!isMobileView && (
        <div className="p-2 border-t border-walnut/30 flex items-center justify-between shrink-0 bg-[#423C36]">
          {!isCollapsed && <span className="text-[10px] font-mono text-[#D4C3B3] pl-2 font-semibold">v1.0.0</span>}
          <button
            onClick={() => setIsCollapsed(!isCollapsed)}
            className="p-1.5 rounded-md text-[#E8DEC8] hover:text-[#FAF6EF] hover:bg-walnut/30 transition-colors w-full flex items-center justify-center cursor-pointer"
            title={isCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
          >
            {isCollapsed ? <ChevronRight className="w-4 h-4" /> : <ChevronLeft className="w-4 h-4" />}
          </button>
        </div>
      )}
    </>
  );

  return (
    <>
      {/* Desktop Permanent Sidebar (Hidden on mobile/tablet below md) */}
      <aside
        className={cn(
          "hidden md:flex bg-[#4A433D] text-[#FAF6EF] border-r border-walnut/20 flex-col shrink-0 min-h-screen select-none transition-all duration-200 z-30 relative",
          isCollapsed ? "w-16" : "w-64"
        )}
      >
        {renderNavContent(false)}
      </aside>

      {/* Mobile Slide-over Drawer & Backdrop (Rendered only on < md when open) */}
      {isMobileOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex">
          {/* Backdrop */}
          <div
            className="fixed inset-0 bg-charcoal/60 backdrop-blur-xs transition-opacity"
            onClick={onCloseMobile}
          />

          {/* Sliding Drawer */}
          <aside className="relative flex flex-col w-64 max-w-[80vw] bg-[#4A433D] text-[#FAF6EF] border-r border-walnut/20 h-full shadow-2xl z-50 animate-in slide-in-from-left duration-200">
            {renderNavContent(true)}
          </aside>
        </div>
      )}
    </>
  );
};
