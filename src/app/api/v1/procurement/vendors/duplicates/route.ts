import { NextRequest } from "next/server";
import { getCurrentUser } from "@/lib/auth";
import { ApiResponse } from "@/lib/response";
import { detectDuplicateVendorSchema } from "@/validators/vendor.schema";
import { VendorService } from "@/modules/vendors/vendor.service";

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser();
    if (!user) return ApiResponse.unauthorized();

    const body = await req.json();
    const validated = detectDuplicateVendorSchema.parse(body);

    const duplicates = await VendorService.detectDuplicates(validated);
    return ApiResponse.success(duplicates);
  } catch (error: any) {
    return ApiResponse.error(error.message || "Failed to check duplicate vendors", 400);
  }
}
