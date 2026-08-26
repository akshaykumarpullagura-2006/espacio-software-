import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { VendorService } from "@/modules/vendors/vendor.service";
import { createVendorSchema } from "@/validators/vendor.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "vendors:read", "GET_VENDOR_DETAIL");

    const { id } = await params;
    const vendor = await VendorService.getVendorById(id);

    return successResponse(vendor);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "vendors:write", "UPDATE_VENDOR");

    const { id } = await params;
    const body = await req.json();
    const parsed = createVendorSchema.partial().safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid vendor update payload", parsed.error.format());
    }

    const updated = await VendorService.updateVendor(id, parsed.data, session.userId);

    return successResponse(updated);
  } catch (error) {
    return errorResponse(error);
  }
}
