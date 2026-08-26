import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { revisePurchaseOrderSchema } from "@/validators/procurement.schema";
import { PurchaseOrderService } from "@/modules/procurement/purchase-order.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const { id } = await params;
    const body = await req.json();
    const validated = revisePurchaseOrderSchema.parse(body);

    const revised = await PurchaseOrderService.revisePurchaseOrder(id, validated, user.id);
    return ApiResponse.success(revised, { message: `Purchase order revised to Revision ${revised.revision}` });
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to revise purchase order", 400);
  }
}
