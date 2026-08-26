import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PaymentService } from "@/modules/payments/payment.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "payments:read", "GET_PAYMENT_RECEIPT");

    const { id } = await params;
    const receipt = await PaymentService.getPaymentReceipt(id);

    return successResponse(receipt);
  } catch (err) {
    return errorResponse(err);
  }
}
