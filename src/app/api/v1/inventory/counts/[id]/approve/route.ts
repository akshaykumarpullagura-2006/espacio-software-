import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { StockCountService } from "@/modules/inventory/stock-count.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { id } = await params;
    const count = await StockCountService.approveStockCount(id, currentUser.id);
    return ApiResponse.success(count);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to approve stock count", 400);
  }
}
