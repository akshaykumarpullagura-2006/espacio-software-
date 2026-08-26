import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { VendorService } from "@/modules/vendors/vendor.service";
import { createVendorSchema } from "@/validators/vendor.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "vendors:read", "GET_VENDORS_LIST");

    const { searchParams } = new URL(req.url);
    const categoryKey = searchParams.get("categoryKey") || undefined;
    const status = searchParams.get("status") || undefined;
    const city = searchParams.get("city") || undefined;
    const paymentTermsKey = searchParams.get("paymentTermsKey") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await VendorService.getVendors({
      categoryKey,
      status,
      city,
      paymentTermsKey,
      search,
      page,
      limit,
    });

    return successResponse(result.vendors, result.pagination);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "vendors:write", "CREATE_VENDOR");

    const body = await req.json();
    const parsed = createVendorSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid vendor payload", parsed.error.format());
    }

    const vendor = await VendorService.createVendor(parsed.data, session.userId);

    return successResponse(vendor, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
