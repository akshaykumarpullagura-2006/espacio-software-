import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { DashboardMetricsService } from "@/modules/dashboard/dashboard.service";
import { DashboardPeriod } from "@/modules/dashboard/dashboard.types";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) {
      throw new AuthError("Unauthorized: Session expired or invalid");
    }

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") as DashboardPeriod) || "THIS_MONTH";
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const summary = await DashboardMetricsService.getDashboardSummary(session.userId, {
      period,
      startDate,
      endDate,
    });

    return successResponse(summary);
  } catch (err) {
    return errorResponse(err);
  }
}
