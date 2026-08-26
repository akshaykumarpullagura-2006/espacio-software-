import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { GstInvoiceService } from "@/modules/finance/gst-invoice.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(_req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const metrics = await GstInvoiceService.getInvoiceDashboardMetrics();
    return successResponse(metrics);
  } catch (err) {
    return errorResponse(err);
  }
}
