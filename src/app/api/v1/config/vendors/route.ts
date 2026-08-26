import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { VendorConfigService } from "@/modules/vendors/vendor-config.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const [categories, paymentTerms] = await Promise.all([
      VendorConfigService.getVendorCategories(),
      VendorConfigService.getPaymentTerms(),
    ]);

    return successResponse({ categories, paymentTerms });
  } catch (error) {
    return errorResponse(error);
  }
}
