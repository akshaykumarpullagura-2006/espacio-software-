import { NextRequest } from "next/server";
import { db } from "@/lib/db";
import { AuthService } from "@/modules/auth/auth.service";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const recent = await db.recentSearch.findMany({
      where: { userId: session.userId },
      orderBy: { createdAt: "desc" },
      take: 10,
    });

    return successResponse(recent);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    const body = await req.json();
    const query = body.query?.trim();
    if (!query) return successResponse(null);

    // Delete existing duplicate if present
    await db.recentSearch.deleteMany({
      where: { userId: session.userId, query },
    });

    const created = await db.recentSearch.create({
      data: {
        userId: session.userId,
        query,
        entityType: body.entityType || null,
      },
    });

    return successResponse(created);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function DELETE() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError("Unauthorized");

    await db.recentSearch.deleteMany({
      where: { userId: session.userId },
    });

    return successResponse({ cleared: true });
  } catch (err) {
    return errorResponse(err);
  }
}
