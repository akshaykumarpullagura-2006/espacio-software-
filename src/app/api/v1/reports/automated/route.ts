import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { AutomatedReportsService } from "@/modules/reports/automated-reports.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json().catch(() => ({}));
    const reportType = body.reportType || "DAILY";

    let result;
    if (reportType === "MONTHLY") {
      result = await AutomatedReportsService.generateMonthlyReport();
    } else {
      result = await AutomatedReportsService.generateDailyReport();
    }

    return successResponse(result, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
