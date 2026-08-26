import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { GstInvoiceService } from "@/modules/finance/gst-invoice.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json();
    const result = await GstInvoiceService.createCreditNote(
      id,
      {
        amount: body.amount,
        reason: body.reason,
        taxRate: body.taxRate,
      },
      session.userId
    );
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
