import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { ProcurementDashboardService } from "@/modules/procurement/procurement-dashboard.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const summary = await ProcurementDashboardService.getSummary();

    return successResponse(summary);
  } catch (error) {
    return errorResponse(error);
  }
}
