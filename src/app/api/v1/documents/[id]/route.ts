import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { DocumentService } from "@/modules/documents/document.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const document = await DocumentService.getDocumentById(id);
    return successResponse(document);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const body = await req.json();

    if (body.toggleFavorite) {
      const updated = await DocumentService.toggleFavorite(id);
      return successResponse(updated);
    }

    const updated = await DocumentService.updateDocument(id, body, session.userId);
    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const trashed = await DocumentService.moveToTrash(id, session.userId);
    return successResponse(trashed);
  } catch (err) {
    return errorResponse(err);
  }
}
