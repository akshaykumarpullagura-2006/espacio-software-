import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PaymentService } from "@/modules/payments/payment.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "payments:read", "GET_PAYMENTS_TIMELINE");

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId");
    if (!projectId) {
      throw new ValidationError("projectId query parameter is required");
    }

    const timeline = await PaymentService.getPaymentTimeline(projectId);
    return successResponse(timeline);
  } catch (err) {
    return errorResponse(err);
  }
}
