import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { db } from "@/lib/db";
import { successResponse, errorResponse } from "@/lib/response";
import { AuthError } from "@/lib/errors";

export async function GET() {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const templates = await db.emailTemplate.findMany({
      orderBy: { eventType: "asc" },
    });

    return successResponse(templates);
  } catch (err) {
    return errorResponse(err);
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await AuthService.getSessionFromCookies();
    if (!session) throw new AuthError();

    const body = await req.json();
    const { eventType, name, subject, body: templateBody, isEnabled } = body;

    const template = await db.emailTemplate.upsert({
      where: { eventType },
      update: { name, subject, body: templateBody, isEnabled },
      create: { eventType, name, subject, body: templateBody, isEnabled },
    });

    return successResponse(template);
  } catch (err) {
    return errorResponse(err);
  }
}
