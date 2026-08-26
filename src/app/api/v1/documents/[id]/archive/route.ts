import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { DocumentService } from "@/modules/documents/document.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json().catch(() => ({}));
    const action = body.action || "ARCHIVE";

    if (action === "UNARCHIVE") {
      const restored = await DocumentService.unarchiveDocument(id, session.userId);
      return successResponse(restored);
    }

    const archived = await DocumentService.archiveDocument(id, session.userId);
    return successResponse(archived);
  } catch (err) {
    return errorResponse(err);
  }
}
