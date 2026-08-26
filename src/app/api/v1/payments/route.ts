import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { PaymentService } from "@/modules/payments/payment.service";
import { recordPaymentSchema } from "@/validators/payment.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "payments:read", "GET_PAYMENTS_LIST");

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const paymentMethod = searchParams.get("paymentMethod") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = parseInt(searchParams.get("page") || "1", 10);
    const limit = parseInt(searchParams.get("limit") || "20", 10);

    const data = await PaymentService.getPayments({
      projectId,
      clientId,
      paymentMethod,
      status,
      search,
      page,
      limit,
    });

    return successResponse(data.payments, data.pagination);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "payments:write", "RECORD_CLIENT_PAYMENT");

    const body = await req.json();
    const parsed = recordPaymentSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid payment recording payload", parsed.error.format());
    }

    const payment = await PaymentService.recordPayment(parsed.data, session.userId);
    return successResponse(payment, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
