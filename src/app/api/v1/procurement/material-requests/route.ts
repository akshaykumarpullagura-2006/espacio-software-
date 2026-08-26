import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { MaterialRequestService } from "@/modules/procurement/material-request.service";
import { createMaterialRequestSchema } from "@/validators/procurement.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "material_requests:read", "GET_MATERIAL_REQUESTS");

    const { searchParams } = new URL(req.url);
    const projectId = searchParams.get("projectId") || undefined;
    const requesterId = searchParams.get("requesterId") || undefined;
    const status = searchParams.get("status") || undefined;
    const priority = searchParams.get("priority") || undefined;
    const purposeKey = searchParams.get("purposeKey") || undefined;
    const search = searchParams.get("search") || undefined;
    const page = searchParams.get("page") ? parseInt(searchParams.get("page")!, 10) : 1;
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!, 10) : 20;

    const result = await MaterialRequestService.getMaterialRequests({
      projectId,
      requesterId,
      status,
      priority,
      purposeKey,
      search,
      page,
      limit,
    });

    return successResponse(result.materialRequests, result.pagination);
  } catch (error) {
    return errorResponse(error);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "material_requests:write", "CREATE_MATERIAL_REQUEST");

    const body = await req.json();
    const parsed = createMaterialRequestSchema.safeParse(body);
    if (!parsed.success) {
      throw new ValidationError("Invalid material request payload", parsed.error.format());
    }

    const mr = await MaterialRequestService.createMaterialRequest(parsed.data, session.userId);

    return successResponse(mr, undefined, 201);
  } catch (error) {
    return errorResponse(error);
  }
}
