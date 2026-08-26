import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { GstInvoiceService } from "@/modules/finance/gst-invoice.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const result = await GstInvoiceService.generateAndLinkInvoiceDocument(id, session.userId);
    return successResponse(result, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
