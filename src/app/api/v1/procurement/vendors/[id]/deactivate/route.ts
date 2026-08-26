import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { deactivateVendorSchema } from "@/validators/vendor.schema";
import { VendorService } from "@/modules/vendors/vendor.service";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const { id } = await params;
    const body = await req.json();
    const validated = deactivateVendorSchema.parse(body);

    const updated = await VendorService.deactivateVendor(id, validated, user.id);
    return ApiResponse.success(updated, { message: "Vendor deactivated successfully" });
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to deactivate vendor", 400);
  }
}
