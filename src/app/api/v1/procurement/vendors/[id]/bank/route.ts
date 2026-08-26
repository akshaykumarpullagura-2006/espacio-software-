import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { updateVendorBankSchema } from "@/validators/vendor.schema";
import { VendorService } from "@/modules/vendors/vendor.service";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const { id } = await params;
    const body = await req.json();
    const validated = updateVendorBankSchema.parse(body);

    const updated = await VendorService.updateBankDetails(id, validated, user.id);
    return ApiResponse.success(updated, { message: "Vendor bank details updated successfully" });
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to update vendor bank details", 400);
  }
}
