import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { FinanceOverviewService } from "@/modules/finance/finance-overview.service";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { searchParams } = new URL(req.url);
    const year = searchParams.get("year") ? parseInt(searchParams.get("year")!, 10) : undefined;
    const month = searchParams.get("month") ? parseInt(searchParams.get("month")!, 10) : undefined;

    const overview = await FinanceOverviewService.getCompanyOverview(year, month);
    return ApiResponse.success(overview);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch financial overview", 500);
  }
}
