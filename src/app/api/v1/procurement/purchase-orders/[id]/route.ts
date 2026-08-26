import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PurchaseOrderService } from "@/modules/procurement/purchase-order.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "purchase_orders:read", "GET_PURCHASE_ORDER_DETAIL");

    const { id } = await params;
    const po = await PurchaseOrderService.getPurchaseOrderById(id);

    return successResponse(po);
  } catch (error) {
    return errorResponse(error);
  }
}
