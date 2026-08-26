import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { DuplicateClientDetectionService } from "@/modules/clients/duplicate-detection.service";
import { checkDuplicateClientSchema } from "@/validators/client.schema";
import { errorResponse, successResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    const parsed = checkDuplicateClientSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid payload for duplicate check", parsed.error.format());
    }

    const result = await DuplicateClientDetectionService.checkDuplicates(parsed.data);
    return successResponse(result);
  } catch (error) {
    return errorResponse(error);
  }
}
