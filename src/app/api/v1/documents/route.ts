import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { DocumentService } from "@/modules/documents/document.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const { searchParams } = new URL(req.url);
    const tab = (searchParams.get("tab") as any) || "ALL";
    const category = searchParams.get("category") || undefined;
    const type = searchParams.get("type") || undefined;
    const visibility = searchParams.get("visibility") || undefined;
    const status = searchParams.get("status") || undefined;
    const search = searchParams.get("search") || undefined;
    const projectId = searchParams.get("projectId") || undefined;
    const clientId = searchParams.get("clientId") || undefined;
    const leadId = searchParams.get("leadId") || undefined;
    const entityType = searchParams.get("entityType") || undefined;
    const entityId = searchParams.get("entityId") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const data = await DocumentService.getDocuments({
      tab,
      category,
      type,
      visibility,
      status,
      search,
      projectId,
      clientId,
      leadId,
      entityType,
      entityId,
      requestingUserId: session.userId,
      page,
      limit,
    });

    return successResponse(data);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const formData = await req.formData();
    const file = formData.get("file") as File | null;
    const name = formData.get("name") as string | null;
    const description = (formData.get("description") as string) || undefined;
    const type = (formData.get("type") as string) || "OTHER";
    const category = (formData.get("category") as string) || "GENERAL";
    const visibility = (formData.get("visibility") as any) || "INTERNAL";
    const projectId = (formData.get("projectId") as string) || undefined;
    const clientId = (formData.get("clientId") as string) || undefined;
    const leadId = (formData.get("leadId") as string) || undefined;
    const sourceType = (formData.get("sourceType") as string) || undefined;
    const sourceId = (formData.get("sourceId") as string) || undefined;
    const entityType = (formData.get("entityType") as string) || undefined;
    const entityId = (formData.get("entityId") as string) || undefined;
    const tagsRaw = formData.get("tags") as string | null;
    const tags = tagsRaw ? JSON.parse(tagsRaw) : undefined;

    if (!name || !file) {
      throw new ValidationError("Document name and physical file are required");
    }

    const arrayBuffer = await file.arrayBuffer();
    const fileBuffer = Buffer.from(arrayBuffer);

    const result = await DocumentService.createDocument({
      name,
      description,
      type,
      category,
      visibility,
      createdById: session.userId,
      projectId,
      clientId,
      leadId,
      sourceType,
      sourceId,
      entityType,
      entityId,
      tags,
      fileBuffer,
      originalFileName: file.name,
      mimeType: file.type || "application/octet-stream",
    });

    return successResponse(result, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
