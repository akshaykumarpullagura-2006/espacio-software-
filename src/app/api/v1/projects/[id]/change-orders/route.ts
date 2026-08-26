import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { ChangeOrderService } from "@/modules/projects/change-order.service";
import { createChangeOrderSchema } from "@/validators/project.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "projects:change_order", "CREATE_CHANGE_ORDER");

    const { id } = await params;
    const body = await req.json();

    if (body.action === "approve" && body.changeOrderId) {
      const approved = await ChangeOrderService.approveChangeOrder(body.changeOrderId, session.userId);
      return successResponse(approved);
    }

    const parsed = createChangeOrderSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid change order payload", parsed.error.format());
    }

    const co = await ChangeOrderService.createChangeOrder(id, parsed.data, session.userId);
    return successResponse(co, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
