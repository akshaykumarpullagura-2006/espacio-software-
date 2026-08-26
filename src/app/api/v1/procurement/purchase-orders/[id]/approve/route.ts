import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PurchaseOrderService } from "@/modules/procurement/purchase-order.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "purchase_orders:approve", "APPROVE_PURCHASE_ORDER");

    const { id } = await params;
    const approved = await PurchaseOrderService.approvePurchaseOrder(id, session.userId);

    return successResponse(approved);
  } catch (error) {
    return errorResponse(error);
  }
}
