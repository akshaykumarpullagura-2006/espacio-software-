import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { StockCountService } from "@/modules/inventory/stock-count.service";
import { createStockCountSchema } from "@/validators/inventory.schema";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId") || undefined;

    const counts = await StockCountService.getStockCounts(warehouseId);
    return ApiResponse.success(counts);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch physical stock counts", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const body = await req.json();
    const validated = createStockCountSchema.parse(body);

    const count = await StockCountService.createStockCount(validated, currentUser.id);
    return ApiResponse.created(count);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to create physical stock count", 400);
  }
}
