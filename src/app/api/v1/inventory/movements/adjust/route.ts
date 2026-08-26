import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";
import { StockMovementService } from "@/modules/inventory/stock-movement.service";
import { adjustStockSchema } from "@/validators/inventory.schema";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    const validated = adjustStockSchema.parse(body);

    const movement = await StockMovementService.adjustStock(validated, session.userId);
    return successResponse(movement);
  } catch (error: any) {
    return errorResponse(error);
  }
}
