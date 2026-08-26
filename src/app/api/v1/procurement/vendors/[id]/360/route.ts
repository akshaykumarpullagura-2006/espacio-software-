import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { VendorService } from "@/modules/vendors/vendor.service";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const { id } = await params;
    const vendor360 = await VendorService.getVendor360(id, user.id);
    return ApiResponse.success(vendor360);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to fetch vendor 360 profile", 404);
  }
}
