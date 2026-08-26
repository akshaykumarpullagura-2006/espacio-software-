import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";
import { StockTransferService } from "@/modules/inventory/stock-transfer.service";
import { createStockTransferSchema } from "@/validators/inventory.schema";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const warehouseId = searchParams.get("warehouseId") || undefined;

    const transfers = await StockTransferService.getTransfers(status, warehouseId);
    return successResponse(transfers);
  } catch (error: any) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    const validated = createStockTransferSchema.parse(body);

    const transfer = await StockTransferService.createTransfer(validated, session.userId);
    return successResponse(transfer, undefined, 201);
  } catch (error: any) {
    return errorResponse(error);
  }
}
