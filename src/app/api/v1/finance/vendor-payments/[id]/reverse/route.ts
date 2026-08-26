import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { VendorPaymentService } from "@/modules/finance/vendor-payment.service";
import { z } from "zod";

const reverseSchema = z.object({
  reason: z.string().min(3, "Reversal reason is required"),
});

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { id } = await params;
    const body = await req.json();
    const validated = reverseSchema.parse(body);

    const payment = await VendorPaymentService.reverseVendorPayment(id, validated.reason, currentUser.id);
    return ApiResponse.success(payment);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to reverse vendor payment", 400);
  }
}
