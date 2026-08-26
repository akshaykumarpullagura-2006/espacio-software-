import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { GstInvoiceService } from "@/modules/finance/gst-invoice.service";
import { createGstInvoiceSchema } from "@/validators/finance.schema";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const projectId = searchParams.get("projectId") || undefined;

    const invoices = await GstInvoiceService.getInvoices({ status, clientId, projectId });
    return ApiResponse.success(invoices);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch GST invoices", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const body = await req.json();
    const validated = createGstInvoiceSchema.parse(body);

    const invoice = await GstInvoiceService.createInvoice({
      ...validated,
      createdById: currentUser.id,
    });
    return ApiResponse.created(invoice);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to create GST invoice", 400);
  }
}
