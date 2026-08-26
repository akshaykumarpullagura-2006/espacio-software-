import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { AnalyticsService, DatePeriod } from "@/modules/analytics/analytics.service";

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const { searchParams } = new URL(req.url);
    const period = (searchParams.get("period") as DatePeriod) || undefined;
    const startDate = searchParams.get("startDate") || undefined;
    const endDate = searchParams.get("endDate") || undefined;

    const [leadAnalytics, quotationAnalytics] = await Promise.all([
      AnalyticsService.getLeadAnalytics({ period, startDate, endDate }),
      AnalyticsService.getQuotationAnalytics({ period, startDate, endDate }),
    ]);

    return ApiResponse.success({
      period: leadAnalytics.period,
      leads: leadAnalytics,
      quotations: quotationAnalytics,
    });
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch sales analytics", 500);
  }
}
