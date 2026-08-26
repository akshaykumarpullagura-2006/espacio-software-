import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { GstInvoiceService } from "@/modules/finance/gst-invoice.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;
    const quotationId = searchParams.get("quotationId") || undefined;

    const summary = await GstInvoiceService.getBillableSummary({
      projectId,
      quotationId,
    });

    return successResponse(summary);
  } catch (err) {
    return errorResponse(err);
  }
}
