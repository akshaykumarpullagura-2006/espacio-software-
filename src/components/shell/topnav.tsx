"use client";

import React, { useState, useEffect } from "react";
import { Search, Bell, LogOut, ShieldCheck, Menu, ChevronDown, User as UserIcon } from "lucide-react";
import { GlobalSearchModal } from "./global-search-modal";
import { NotificationDrawer } from "./notification-drawer";
import { useRouter, usePathname } from "next/navigation";
import { Logo } from "@/components/ui/logo";

export interface TopNavProps {
  user?: {
    fullName: string;
    email: string;
    roles: string[];
    accessLevel?: "SUPER_ADMIN" | "ADMIN" | "USER";
  };
  onOpenMobileMenu?: () => void;
}

export const TopNav: React.FC<TopNavProps> = ({ user, onOpenMobileMenu }) => {
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isNotificationsOpen, setIsNotificationsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isUserMenuOpen, setIsUserMenuOpen] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const primaryRole = user?.accessLevel || user?.roles?.[0] || "USER";

  // Listen for Ctrl+K shortcut
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setIsSearchOpen(true);
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const handleLogout = async () => {
    try {
      await fetch("/api/v1/auth/logout", { method: "POST" });
      router.push("/login");
      router.refresh();
    } catch {
      router.push("/login");
    }
  };

  const getPageTitle = () => {
    if (pathname === "/dashboard") return { title: "Dashboard", desc: "Executive Command Center & Business Overview" };
    if (pathname === "/leads" || pathname.startsWith("/leads")) return { title: "Leads", desc: "Manage client inquiries and sales pipeline" };
    if (pathname === "/projects" || pathname.startsWith("/projects")) return { title: "Projects", desc: "Active project execution, stages, and quality" };
    if (pathname === "/quotations" || pathname.startsWith("/quotations")) return { title: "Quotations", desc: "Sales estimates and pricing builder" };
    if (pathname === "/finance/payments" || pathname.startsWith("/finance/payments")) return { title: "Payments", desc: "Client payment collections and milestone receipts" };
    if (pathname === "/finance/expenses" || pathname.startsWith("/finance/expenses")) return { title: "Expenses", desc: "Project costs and operational expense vouchers" };
    if (pathname === "/finance/petty-cash" || pathname.startsWith("/finance/petty-cash")) return { title: "Petty Cash", desc: "Site cash float and employee advances" };
    if (pathname === "/procurement/vendors" || pathname.startsWith("/procurement/vendors")) return { title: "Vendors", desc: "Supplier directory, commercial terms, and ratings" };
    if (pathname === "/procurement/purchase-orders" || pathname.startsWith("/procurement/purchase-orders")) return { title: "Purchase Orders", desc: "Procurement orders and tracking" };
    if (pathname === "/procurement/material-requests" || pathname.startsWith("/procurement/material-requests")) return { title: "Material Requests", desc: "Site item requisitions and approvals" };
    if (pathname.startsWith("/reports")) return { title: "Reports & Analytics", desc: "Financial P&L, project margins, and business intelligence" };
    if (pathname.startsWith("/notifications")) return { title: "Notifications", desc: "System alerts and reminder center" };
    if (pathname.startsWith("/settings")) return { title: "Settings", desc: "Global system configuration and preferences" };
    if (pathname.startsWith("/search")) return { title: "Search Results", desc: "Cross-module search and filter results" };
    return { title: "ESPACIO ERP", desc: "Enterprise operations" };
  };

  const pageInfo = getPageTitle();

  return (
    <>
      <header className="h-14 bg-cream/90 backdrop-blur-md border-b border-walnut/15 px-3.5 sm:px-5 flex items-center justify-between shrink-0 shadow-subtle z-20 sticky top-0 select-none w-full min-w-0">
        {/* Left: Mobile Menu Toggle & Page Context */}
        <div className="flex items-center gap-2 sm:gap-3 min-w-0 flex-1 pr-2">
          {onOpenMobileMenu && (
            <button
              onClick={onOpenMobileMenu}
              className="p-1.5 -ml-1 text-walnut hover:text-charcoal hover:bg-offwhite rounded-md md:hidden shrink-0 cursor-pointer"
              title="Open Navigation Menu"
            >
              <Menu className="w-5 h-5" />
            </button>
          )}

          <div className="md:hidden shrink-0">
            <Logo size="xs" showText={false} />
          </div>

          <div className="min-w-0 truncate">
            <h2 className="text-sm font-bold text-charcoal leading-tight truncate">{pageInfo.title}</h2>
            <p className="text-[11px] text-walnut leading-none mt-0.5 truncate hidden sm:block">{pageInfo.desc}</p>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Global Search Trigger */}
          <button
            onClick={() => setIsSearchOpen(true)}
            className="flex items-center gap-2 sm:gap-3 px-2.5 py-1.5 bg-offwhite border border-walnut/20 rounded-md text-xs text-walnut hover:bg-cream hover:border-walnut/40 transition-colors w-32 sm:w-56 justify-between cursor-pointer shadow-2xs"
          >
            <div className="flex items-center gap-2 truncate">
              <Search className="w-3.5 h-3.5 text-walnut shrink-0" />
              <span className="truncate">Search...</span>
            </div>
            <kbd className="px-1.5 py-0.5 text-[10px] font-mono text-walnut bg-cream border border-walnut/20 rounded hidden sm:inline-block">
              Ctrl+K
            </kbd>
          </button>

          {/* Notifications Button */}
          <button
            onClick={() => setIsNotificationsOpen(true)}
            className="relative p-1.5 text-walnut hover:text-charcoal hover:bg-offwhite rounded-md transition-colors cursor-pointer"
            title="Notifications"
          >
            <Bell className="w-4 h-4" />
            {unreadCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-gold ring-2 ring-cream" />
            )}
          </button>

          <div className="h-4 w-px bg-walnut/20" />

          {/* User Profile Menu */}
          <div className="relative">
            <button
              onClick={() => setIsUserMenuOpen(!isUserMenuOpen)}
              className="flex items-center gap-2 p-1 pl-2 hover:bg-offwhite rounded-md transition-colors text-left cursor-pointer border border-transparent hover:border-walnut/15"
            >
              <div className="w-7 h-7 rounded-full bg-gold-soft border border-gold/40 flex items-center justify-center text-charcoal font-bold text-xs shrink-0 shadow-2xs">
                {user?.fullName?.charAt(0) || "U"}
              </div>
              <div className="hidden lg:block leading-tight">
                <p className="text-xs font-bold text-charcoal truncate max-w-[120px]">{user?.fullName || "User"}</p>
                <p className="text-[10px] text-walnut uppercase tracking-wider font-semibold">{primaryRole}</p>
              </div>
              <ChevronDown className="w-3 h-3 text-walnut hidden lg:block" />
            </button>

            {isUserMenuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setIsUserMenuOpen(false)} />
                <div className="absolute right-0 mt-1 w-52 bg-offwhite border border-walnut/20 rounded-lg shadow-modal py-1.5 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-2 border-b border-walnut/10">
                    <p className="text-xs font-bold text-charcoal">{user?.fullName}</p>
                    <p className="text-[11px] text-walnut truncate">{user?.email}</p>
                    <div className="mt-1 flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3 text-gold" />
                      <span className="text-[10px] font-bold text-walnut uppercase">{primaryRole}</span>
                    </div>
                  </div>

                  <div className="py-1">
                    <button
                      onClick={() => {
                        setIsUserMenuOpen(false);
                        router.push("/settings/profile");
                      }}
                      className="w-full px-3 py-1.5 text-xs text-charcoal hover:bg-gold-soft flex items-center gap-2 transition-colors text-left cursor-pointer"
                    >
                      <UserIcon className="w-3.5 h-3.5 text-walnut" />
                      <span>Profile & Account</span>
                    </button>
                  </div>

                  <div className="border-t border-walnut/10 pt-1">
                    <button
                      onClick={handleLogout}
                      className="w-full px-3 py-1.5 text-xs text-semantic-danger hover:bg-semantic-danger-bg flex items-center gap-2 transition-colors text-left cursor-pointer font-semibold"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Log Out</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Global Search Modal */}
      <GlobalSearchModal isOpen={isSearchOpen} onClose={() => setIsSearchOpen(false)} />

      {/* Notification Drawer */}
      <NotificationDrawer
        isOpen={isNotificationsOpen}
        onClose={() => setIsNotificationsOpen(false)}
        onUnreadCountChange={setUnreadCount}
      />
    </>
  );
};
