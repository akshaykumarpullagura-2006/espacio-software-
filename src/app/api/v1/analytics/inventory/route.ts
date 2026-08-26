import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { AnalyticsService } from "@/modules/analytics/analytics.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const data = await AnalyticsService.getInventoryAnalytics();
    return ApiResponse.success(data);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch inventory analytics", 500);
  }
}
