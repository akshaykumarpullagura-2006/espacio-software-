import { NextResponse } from "next/server";
import { successResponse } from "@/lib/response";
import { AUTH_COOKIE_NAME } from "@/lib/auth";

export async function POST() {
  const response = successResponse({ loggedOut: true }, { message: "Logged out successfully" });
  response.cookies.set({
    name: AUTH_COOKIE_NAME,
    value: "",
    httpOnly: true,
    path: "/",
    maxAge: 0,
  });
  return response;
}
