import { NextRequest } from "next/server";
import { AuthService } from "@/modules/auth/auth.service";
import { loginSchema } from "@/validators/auth.schema";
import { successResponse, errorResponse } from "@/lib/response";
import { ValidationError } from "@/lib/errors";
import { AUTH_COOKIE_NAME } from "@/lib/auth";
import { env } from "@/config/env";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const parsed = loginSchema.safeParse(body);

    if (!parsed.success) {
      throw new ValidationError("Invalid login payload", parsed.error.format());
    }

    const ipAddress = req.headers.get("x-forwarded-for") || "127.0.0.1";
    const userAgent = req.headers.get("user-agent") || undefined;

    const result = await AuthService.login({
      email: parsed.data.email,
      password: parsed.data.password,
      ipAddress,
      userAgent,
    });

    const response = successResponse(result.user, { message: "Login successful" });

    // Attach HTTP-Only Session Cookie
    response.cookies.set({
      name: AUTH_COOKIE_NAME,
      value: result.token,
      httpOnly: true,
      secure: env.NODE_ENV === "production",
      sameSite: "lax",
      path: "/",
      maxAge: env.SESSION_MAX_AGE_SECONDS,
    });

    return response;
  } catch (err) {
    return errorResponse(err);
  }
}
