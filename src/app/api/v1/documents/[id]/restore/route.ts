import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { DocumentService } from "@/modules/documents/document.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json();

    if (body.action === "RESTORE_FROM_TRASH") {
      const restored = await DocumentService.restoreFromTrash(id, session.userId);
      return successResponse(restored);
    }

    if (!body.versionNumber) {
      throw new ValidationError("versionNumber is required to restore an earlier version");
    }

    const restoredVersion = await DocumentService.restoreVersion(
      id,
      parseInt(body.versionNumber, 10),
      session.userId
    );

    return successResponse(restoredVersion);
  } catch (err) {
    return errorResponse(err);
  }
}
