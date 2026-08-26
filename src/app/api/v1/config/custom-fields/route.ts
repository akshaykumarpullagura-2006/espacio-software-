import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { CustomFieldService } from "@/modules/config/custom-field.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    await RbacService.authorize(session.userId, "config:manage", "CREATE_CUSTOM_FIELD");

    const body = await req.json();
    if (!body.fieldName || !body.fieldKey || !body.fieldType) {
      throw new ValidationError("fieldName, fieldKey, and fieldType are required");
    }

    const created = await CustomFieldService.saveCustomField({
      entityType: body.entityType || "Lead",
      fieldName: body.fieldName,
      fieldKey: body.fieldKey,
      fieldType: body.fieldType,
      options: body.options,
      isRequired: body.isRequired,
    });

    return successResponse(created, undefined, 201);
  } catch (err) {
    return errorResponse(err);
  }
}
