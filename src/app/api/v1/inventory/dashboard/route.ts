import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { InventoryDashboardService } from "@/modules/inventory/inventory-dashboard.service";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const metrics = await InventoryDashboardService.getMetrics();
    return ApiResponse.success(metrics);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch inventory dashboard metrics", 500);
  }
}
