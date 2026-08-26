import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { GoodsReceiptService } from "@/modules/procurement/goods-receipt.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "goods_receipts:read", "GET_GOODS_RECEIPT_DETAIL");

    const { id } = await params;
    const grn = await GoodsReceiptService.getGoodsReceiptById(id);

    return successResponse(grn);
  } catch (error) {
    return errorResponse(error);
  }
}
