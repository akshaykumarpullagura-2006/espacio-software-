import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { PayableService } from "@/modules/finance/payable.service";
import { createPayableSchema } from "@/validators/finance.schema";

export async function GET(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get("vendorId") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const purchaseOrderId = searchParams.get("purchaseOrderId") || undefined;
    const status = searchParams.get("status") || undefined;
    const overdueOnly = searchParams.get("overdueOnly") === "true";
    const search = searchParams.get("search") || undefined;

    const payables = await PayableService.getPayables({
      vendorId,
      projectId,
      purchaseOrderId,
      status,
      overdueOnly,
      search,
    });

    return ApiResponse.success(payables);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch payables", 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const currentUser = await getCurrentUser(req);
    if (!currentUser) return ApiResponse.unauthorized();

    const body = await req.json();
    const validated = createPayableSchema.parse(body);

    const payable = await PayableService.createPayable(validated, currentUser.id);
    return ApiResponse.created(payable);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to create payable", 400);
  }
}
