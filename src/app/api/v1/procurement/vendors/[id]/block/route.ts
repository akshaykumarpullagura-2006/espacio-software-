import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { VendorService } from "@/modules/vendors/vendor.service";
import { blockVendorSchema } from "@/validators/vendor.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "vendors:block", "BLOCK_VENDOR");

    const { id } = await params;
    const body = await req.json();
    const parsed = blockVendorSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid block vendor payload", parsed.error.format());
    }

    const blocked = await VendorService.blockVendor(id, parsed.data, session.userId);

    return successResponse(blocked, undefined, 200);
  } catch (error) {
    return errorResponse(error);
  }
}
