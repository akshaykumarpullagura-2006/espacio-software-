import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";
import { StockMovementService } from "@/modules/inventory/stock-movement.service";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { searchParams } = new URL(req.url);
    const materialId = searchParams.get("materialId") || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const movementType = searchParams.get("movementType") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await StockMovementService.getMovements({
      materialId,
      warehouseId,
      projectId,
      movementType,
      search,
      page,
      limit,
    });
    return successResponse(result);
  } catch (error: any) {
    return errorResponse(error);
  }
}
