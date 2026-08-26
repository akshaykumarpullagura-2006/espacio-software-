import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { AuthService } from "@/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError, ValidationError } from "@/lib/errors";

export async function GET(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const { searchParams } = new URL(req.url);
    const entityType = searchParams.get("entityType");

    const whereClause: any = {
      OR: [
        { userId: session.userId },
        { visibility: "COMPANY" },
        { visibility: "TEAM" },
      ],
    };

    if (entityType) {
      whereClause.entityType = entityType.toUpperCase();
    }

    const views = await db.savedView.findMany({
      where: whereClause,
      orderBy: { createdAt: "desc" },
    });

    return successResponse(views);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const body = await req.json();
    if (!body.name || !body.entityType || !body.filterRules) {
      throw new ValidationError("Missing required saved view parameters (name, entityType, filterRules)");
    }

    const savedView = await db.savedView.create({
      data: {
        userId: session.userId,
        entityType: body.entityType.toUpperCase(),
        name: body.name.trim(),
        description: body.description || null,
        filterRules: typeof body.filterRules === "string" ? body.filterRules : JSON.stringify(body.filterRules),
        sortRules: body.sortRules ? (typeof body.sortRules === "string" ? body.sortRules : JSON.stringify(body.sortRules)) : null,
        columnState: body.columnState ? (typeof body.columnState === "string" ? body.columnState : JSON.stringify(body.columnState)) : null,
        visibility: body.visibility || "PRIVATE",
        roleName: body.roleName || null,
        isDefault: Boolean(body.isDefault),
      },
    });

    return successResponse(savedView);
  } catch (err) {
    return errorResponse(err);
  }
}
