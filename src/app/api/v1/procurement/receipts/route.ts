import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { GoodsReceiptService } from "@/modules/procurement/goods-receipt.service";
import { createGoodsReceiptSchema } from "@/validators/procurement.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "goods_receipts:read", "GET_GOODS_RECEIPTS");

    const { searchParams } = new URL(req.url);
    const purchaseOrderId = searchParams.get("purchaseOrderId") || undefined;
    const vendorId = searchParams.get("vendorId") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await GoodsReceiptService.getGoodsReceipts({
      purchaseOrderId,
      vendorId,
      projectId,
      status,
      search,
      page,
      limit,
    });

    return successResponse(result.receipts, result.pagination);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "goods_receipts:write", "CREATE_GOODS_RECEIPT");

    const body = await req.json();
    const parsed = createGoodsReceiptSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid goods receipt payload", parsed.error.format());
    }

    const grn = await GoodsReceiptService.createGoodsReceipt(parsed.data, session.userId);

    return successResponse(grn, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
