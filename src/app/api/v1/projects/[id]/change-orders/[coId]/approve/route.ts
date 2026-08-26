import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ChangeOrderService } from "@/modules/projects/change-order.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; coId: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:change_order", "APPROVE_CHANGE_ORDER");

    const { coId } = await params;
    const approved = await ChangeOrderService.approveChangeOrder(coId, session.userId);
    return successResponse(approved);
  } catch (err) {
    return errorResponse(err);
  }
}
