import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { DocumentService } from "@/modules/documents/document.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(_req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const metrics = await DocumentService.getDocumentMetrics();
    return successResponse(metrics);
  } catch (err) {
    return errorResponse(err);
  }
}
