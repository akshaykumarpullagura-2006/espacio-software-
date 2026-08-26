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
    const { entityType, entityId } = body;

    if (!entityType || !entityId) {
      throw new ValidationError("entityType and entityId are required");
    }

    const link = await DocumentService.linkDocumentToEntity(id, entityType, entityId, session.userId);
    return successResponse(link, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");
    const entityId = searchParams.get("entityId");

    if (!entityType || !entityId) {
      throw new ValidationError("entityType and entityId query parameters are required");
    }

    const result = await DocumentService.unlinkDocumentFromEntity(id, entityType, entityId, session.userId);
    return successResponse(result);
  } catch (err) {
    return errorResponse(err);
  }
}
