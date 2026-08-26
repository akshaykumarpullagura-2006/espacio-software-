import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { GstInvoiceService } from "@/modules/finance/gst-invoice.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { id } = await params;
    const invoice = await GstInvoiceService.getInvoiceById(id);
    return ApiResponse.success(invoice);
  } catch (error: any) {
    return ApiResponse.error(error.message || "GST invoice not found", 404);
  }
}
