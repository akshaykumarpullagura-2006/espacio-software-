import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PurchaseOrderService } from "@/modules/procurement/purchase-order.service";
import { createPurchaseOrderSchema } from "@/validators/procurement.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "purchase_orders:read", "GET_PURCHASE_ORDERS");

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const materialRequestId = searchParams.get("materialRequestId") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await PurchaseOrderService.getPurchaseOrders({
      vendorId,
      projectId,
      materialRequestId,
      status,
      search,
      page,
      limit,
    });

    return successResponse(result.purchaseOrders, result.pagination);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "purchase_orders:write", "CREATE_PURCHASE_ORDER");

    const body = await req.json();
    const parsed = createPurchaseOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid purchase order payload", parsed.error.format());
    }

    const po = await PurchaseOrderService.createPurchaseOrder(parsed.data, session.userId);

    return successResponse(po, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
