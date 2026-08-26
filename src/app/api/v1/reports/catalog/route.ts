import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { ReportsService } from "@/modules/reports/reports.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const catalog = await ReportsService.getReportCatalog(user.id);
    return ApiResponse.success(catalog);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch reports catalog", 500);
  }
}
