import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import crypto from "crypto";
import { env } from "@/config/env";
import { AuthError } from "./errors";

const secretKey = new TextEncoder().encode(env.JWT_SECRET);
export const AUTH_COOKIE_NAME = "espacio_session";

export type AccessLevel = "SUPER_ADMIN" | "ADMIN" | "USER";

export interface SessionPayload {
  userId: string;
  email: string;
  fullName: string;
  accessLevel: AccessLevel;
  roles: string[];
  permissions?: string[];
}

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Resilient password verifier supporting:
 * 1. Standard Bcrypt hashes ($2a$, $2b$, $2y$)
 * 2. Plain-text passwords (when updated directly by admin in Supabase Table Editor)
 * 3. Legacy SHA-256 hashes
 */
export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  if (!password || !hash) return false;

  // 1. Check if it's a valid bcrypt hash
  if (hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$")) {
    try {
      const match = await bcrypt.compare(password, hash);
      if (match) return true;
    } catch {
      // Fall through to other checks
    }
  }

  // 2. Direct match check (supports direct manual password entry in Supabase DB Table Editor)
  if (password === hash) {
    return true;
  }

  // 3. SHA-256 hex match check
  try {
    const sha256 = crypto.createHash("sha256").update(password).digest("hex");
    if (sha256 === hash) {
      return true;
    }
  } catch {
    // Ignore error
  }

  return false;
}

/**
 * Checks if the stored hash is not a standard bcrypt hash and should be upgraded.
 */
export function isLegacyOrPlainHash(hash: string): boolean {
  if (!hash) return true;
  return !(hash.startsWith("$2a$") || hash.startsWith("$2b$") || hash.startsWith("$2y$"));
}

export async function createSessionToken(payload: SessionPayload): Promise<string> {
  const token = await new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(`${env.SESSION_MAX_AGE_SECONDS}s`)
    .sign(secretKey);

  return token;
}

export async function verifySessionToken(token: string): Promise<SessionPayload> {
  try {
    const verified = await jwtVerify(token, secretKey);
    const payload = verified.payload as unknown as SessionPayload;
    // Normalize accessLevel
    if (!payload.accessLevel) {
      if (payload.roles?.includes("SUPER_ADMIN")) {
        payload.accessLevel = "SUPER_ADMIN";
      } else if (payload.roles?.includes("ADMIN")) {
        payload.accessLevel = "ADMIN";
      } else {
        payload.accessLevel = "USER";
      }
    }
    return payload;
  } catch {
    throw new AuthError("Invalid or expired session token");
  }
}

export async function getCurrentUser(_req?: unknown): Promise<{ id: string; email: string; fullName: string; accessLevel: AccessLevel; roles: string[] } | null> {
  const { AuthService } = await import("@/modules/auth/auth.service");
  const session = await AuthService.getSessionFromCookies();
  if (!session) return null;
  const accessLevel: AccessLevel = session.accessLevel || (session.roles?.includes("SUPER_ADMIN") ? "SUPER_ADMIN" : session.roles?.includes("ADMIN") ? "ADMIN" : "USER");
  return {
    id: session.userId,
    email: session.email,
    fullName: session.fullName,
    accessLevel,
    roles: session.roles,
  };
}
