import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { ReportsService } from "@/modules/reports/reports.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const body = await req.json();
    const { reportKey, filter } = body;

    if (!reportKey) {
      return ApiResponse.error("reportKey is required", 400);
    }

    const report = await ReportsService.generateReport(reportKey, filter || {}, user.id);
    return ApiResponse.success(report);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to generate report", 500);
  }
}
