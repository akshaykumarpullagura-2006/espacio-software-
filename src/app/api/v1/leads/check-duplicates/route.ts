import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { DuplicateDetectionService } from "@/modules/leads/duplicate-detection.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    if (!body.phone || typeof body.phone !== "string") {
      throw new ValidationError("phone is required for duplicate check");
    }

    const result = await DuplicateDetectionService.checkDuplicates({
      phone: body.phone,
      email: body.email,
      clientName: body.clientName,
      location: body.location || body.propertyLocation,
      propertyLocation: body.propertyLocation || body.location,
      excludeLeadId: body.excludeLeadId,
    });

    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
