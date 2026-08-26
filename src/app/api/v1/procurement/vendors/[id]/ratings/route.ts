import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { VendorService } from "@/modules/vendors/vendor.service";
import { logVendorRatingSchema } from "@/validators/vendor.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "vendors:rate", "LOG_VENDOR_RATING");

    const { id } = await params;
    const body = await req.json();
    const parsed = logVendorRatingSchema.safeParse({ ...body, vendorId: id });
    if (!parsed.success) {
      throw new ValidationError("Invalid vendor rating payload", parsed.error.format());
    }

    const rating = await VendorService.logRating(parsed.data, session.userId);

    return successResponse(rating, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
