import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";
import { AuditService } from "@/modules/audit/audit.service";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const user = await db.user.findUnique({
      where: { id: session.userId },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        status: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: { role: true },
        },
      },
    });

    return successResponse(user);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function PATCH(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();

    const updated = await db.user.update({
      where: { id: session.userId },
      data: {
        fullName: body.fullName,
        phone: body.phone,
        avatarUrl: body.avatarUrl,
      },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        status: true,
        updatedAt: true,
      },
    });

    await AuditService.logEvent({
      userId: session.userId,
      action: "PROFILE_UPDATED",
      entityType: "User",
      entityId: session.userId,
      newValues: { fullName: updated.fullName, phone: updated.phone },
    });

    return successResponse(updated);
  } catch (err) {
    return errorResponse(err);
  }
}
