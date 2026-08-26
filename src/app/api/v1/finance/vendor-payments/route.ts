import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { VendorPaymentService } from "@/modules/finance/vendor-payment.service";
import { recordVendorPaymentSchema } from "@/validators/finance.schema";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId") || undefined;
    const payableId = searchParams.get("payableId") || undefined;

    const payments = await VendorPaymentService.getVendorPayments(vendorId, payableId);
    return ApiResponse.success(payments);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch vendor payments", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const body = await req.json();
    const validated = recordVendorPaymentSchema.parse(body);

    const payment = await VendorPaymentService.recordVendorPayment(validated, currentUser.id);
    return ApiResponse.created(payment);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to record vendor payment", 400);
  }
}
