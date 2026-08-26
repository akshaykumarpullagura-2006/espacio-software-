import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PurchaseOrderService } from "@/modules/procurement/purchase-order.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "purchase_orders:cancel", "CANCEL_PURCHASE_ORDER");

    const { id } = await params;
    const body = await req.json();
    if (!body.reason || body.reason.trim() === "") {
      throw new ValidationError("Cancellation reason is required");
    }

    const cancelled = await PurchaseOrderService.cancelPurchaseOrder(id, body.reason, session.userId);

    return successResponse(cancelled);
  } catch (error) {
    return errorResponse(error);
  }
}
