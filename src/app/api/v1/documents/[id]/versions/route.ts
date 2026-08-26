import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { DocumentService } from "@/modules/documents/document.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const document = await DocumentService.getDocumentById(id);
    return successResponse(document.versions);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { id } = await params;
    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const changeNote = (formData.get("changeNote") as string) || undefined;

    if (!file) {
      throw new ValidationError("Physical file is required for new version");
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const version = await DocumentService.uploadNewVersion(
      id,
      fileBuffer,
      file.name,
      file.type || "application/octet-stream",
      session.userId,
      changeNote
    );

    return successResponse(version, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
