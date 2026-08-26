import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PaymentService } from "@/modules/payments/payment.service";
import { reversePaymentSchema } from "@/validators/payment.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "payments:reverse", "REVERSE_CLIENT_PAYMENT");

    const { id } = await params;
    const body = await req.json();
    const parsed = reversePaymentSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid reversal payload", parsed.error.format());
    }

    const reversed = await PaymentService.reversePayment(id, parsed.data, session.userId);
    return successResponse(reversed);
  } catch (err) {
    return errorResponse(err);
  }
}
