import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";
import { StockTransferService } from "@/modules/inventory/stock-transfer.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const transfer = await StockTransferService.receiveTransfer(id, session.userId);
    return successResponse(transfer);
  } catch (error: any) {
    return errorResponse(error);
  }
}
