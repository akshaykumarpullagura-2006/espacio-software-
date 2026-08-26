import React from "react";
import { AppShell } from "@/components/shell/app-shell";
import { AuthService } from "@/modules/auth/auth.service";
import { redirect } from "next/navigation";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  const session = await AuthService.getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  const permissions =
    session.permissions ||
    (session.accessLevel === "SUPER_ADMIN" ? ["*"] : []);

  return (
    <AppShell
      user={{
        fullName: session.fullName,
        email: session.email,
        roles: session.roles,
        accessLevel: session.accessLevel,
        permissions,
      }}
    >
      {children}
    </AppShell>
  );
}
