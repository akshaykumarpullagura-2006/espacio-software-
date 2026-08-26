import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { DocumentService } from "@/modules/documents/document.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";
import { db } from "@/lib/db";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const requests = await db.documentRequest.findMany({
      orderBy: { createdAt: "desc" },
      include: { document: { select: { id: true, referenceNo: true, name: true } } },
    });

    return successResponse(requests);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    if (!body.title) {
      throw new ValidationError("Request title is required");
    }

    const request = await DocumentService.createDocumentRequest(
      body.title,
      body.requestedFromId || undefined,
      session.userId,
      body.dueDate ? new Date(body.dueDate) : undefined
    );

    return successResponse(request, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
