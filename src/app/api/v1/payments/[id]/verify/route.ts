import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PaymentService } from "@/modules/payments/payment.service";
import { verifyPaymentSchema } from "@/validators/payment.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.requireAdmin(session.userId, "ADMIN_ACCEPTED_PAYMENT");

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const parsed = verifyPaymentSchema.safeParse(body);

    const updated = await PaymentService.verifyPayment(id, parsed.success ? parsed.data : undefined, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
