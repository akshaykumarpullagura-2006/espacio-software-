import React from "react";
import { redirect } from "next/navigation";
import { AuthService } from "@/modules/auth/auth.service";
import { DashboardMetricsService } from "@/modules/dashboard/dashboard.service";
import { ApprovalsService } from "@/modules/approvals/approvals.service";
import { DashboardClient } from "./dashboard-client";

export const revalidate = 0; // Dynamic server rendering
export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const session = await AuthService.getSessionFromCookies();

  if (!session) {
    redirect("/login");
  }

  const accessLevel = session.accessLevel || (session.roles?.includes("ADMIN") ? "ADMIN" : "USER");

  // Pre-fetch initial authoritative data from Database via DashboardMetricsService
  const initialSummary = await DashboardMetricsService.getDashboardSummary(session.userId, {
    period: "THIS_MONTH",
  });

  // If Admin, pre-fetch pending approvals queue
  let initialApprovals = undefined;
  if (accessLevel === "ADMIN") {
    try {
      initialApprovals = await ApprovalsService.getPendingApprovals();
    } catch {
      // Quiet handling
    }
  }

  return (
    <DashboardClient
      initialData={initialSummary}
      initialApprovals={initialApprovals}
      user={{
        id: session.userId,
        email: session.email,
        fullName: session.fullName,
        accessLevel,
      }}
    />
  );
}
