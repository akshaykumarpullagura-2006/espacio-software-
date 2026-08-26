import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { CompanyService } from "@/modules/settings/company.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ForbiddenError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized: Authentication required");

    const hasPermission = await RbacService.hasPermission(session.userId, "settings:company");
    const isSuperAdmin = await RbacService.isUserSuperAdmin(session.userId);
    if (!hasPermission && !isSuperAdmin) {
      throw new ForbiddenError("Forbidden: Insufficient permissions to view company settings");
    }

    const company = await CompanyService.getCompanyProfile();
    return successResponse(company);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PUT(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized: Authentication required");

    const hasPermission = await RbacService.hasPermission(session.userId, "settings:company");
    const isSuperAdmin = await RbacService.isUserSuperAdmin(session.userId);
    if (!hasPermission && !isSuperAdmin) {
      throw new ForbiddenError("Forbidden: Insufficient permissions to update company settings");
    }

    const body = await req.json();
    const updated = await CompanyService.updateCompanyProfile(body, session.userId);
    return successResponse(updated, { message: "Company profile updated successfully" });
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  return PUT(req);
}
