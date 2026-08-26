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
    const body = await req.json().catch(() => ({}));
    const reason = body.reason || "Voided by user request";
    const voided = await GstInvoiceService.voidInvoice(id, reason, session.userId);
    return successResponse(voided);
  } catch (err) {
    return errorResponse(err);
  }
}
