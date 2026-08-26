import { db, withDbRetry } from "@/lib/db";
import {
  verifyPassword,
  hashPassword,
  isLegacyOrPlainHash,
  createSessionToken,
  verifySessionToken,
  AUTH_COOKIE_NAME,
  SessionPayload,
  AccessLevel,
} from "@/lib/auth";
import { AuthError, NotFoundError } from "@/lib/errors";
import { AuditService } from "../audit/audit.service";
import { RbacService, computeUserPermissions } from "../rbac/rbac.service";
import { cookies } from "next/headers";
import { supabase } from "@/lib/supabase";

export interface LoginParams {
  email: string;
  password: string;
  ipAddress?: string;
  userAgent?: string;
}

export class AuthService {
  public static async login(params: LoginParams) {
    const email = params.email.toLowerCase().trim();

    // 1. Authenticate against Supabase Auth service
    let isSupabaseAuthenticated = false;
    let sbUserMeta: any = null;

    try {
      const { data: sbData, error: sbError } = await supabase.auth.signInWithPassword({
        email,
        password: params.password,
      });

      if (!sbError && sbData?.user) {
        isSupabaseAuthenticated = true;
        sbUserMeta = {
          ...sbData.user.user_metadata,
          ...sbData.user.app_metadata,
        };
      }
    } catch {
      // Fall through to database check
    }

    // 2. Fetch User and Roles from Database with connection retry
    let user = await withDbRetry(() =>
      db.user.findUnique({
        where: { email },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
        },
      })
    );

    if (isSupabaseAuthenticated) {
      const inferredAccessLevel: "USER" | "ADMIN" =
        sbUserMeta?.accessLevel === "ADMIN" ||
        sbUserMeta?.role === "ADMIN" ||
        email.includes("admin") ||
        email.includes("espacio")
          ? "ADMIN"
          : "USER";

      const fullName =
        sbUserMeta?.full_name ||
        sbUserMeta?.name ||
        user?.fullName ||
        email.split("@")[0];

      const newHash = await hashPassword(params.password);

      if (!user) {
        // Create user in database
        let role = await db.role.findUnique({ where: { name: inferredAccessLevel } });
        if (!role) {
          role = await db.role.create({
            data: {
              name: inferredAccessLevel,
              description: inferredAccessLevel === "ADMIN" ? "System Administrator" : "Standard ERP User",
            },
          });
        }

        user = await withDbRetry(() =>
          db.user.create({
            data: {
              email,
              fullName,
              accessLevel: inferredAccessLevel,
              passwordHash: newHash,
              status: "ACTIVE",
              userRoles: {
                create: {
                  roleId: role.id,
                },
              },
            },
            include: {
              userRoles: {
                include: {
                  role: {
                    include: {
                      rolePermissions: {
                        include: {
                          permission: true,
                        },
                      },
                    },
                  },
                },
              },
            },
          })
        );
      } else if (user) {
        // User exists: sync password hash and status so DB is always up to date
        const userId = user.id;
        const needsAccessLevelSync = sbUserMeta?.accessLevel && user.accessLevel !== sbUserMeta.accessLevel;
        await withDbRetry(() =>
          db.user.update({
            where: { id: userId },
            data: {
              passwordHash: newHash,
              status: "ACTIVE",
              ...(needsAccessLevelSync ? { accessLevel: sbUserMeta.accessLevel } : {}),
            },
          })
        );
        user.passwordHash = newHash;
        if (needsAccessLevelSync) {
          user.accessLevel = sbUserMeta.accessLevel;
        }
      }
    } else {
      // 3. Fallback: Authenticate directly against Database User record
      if (!user) {
        throw new AuthError("Invalid credentials");
      }

      if (user.status !== "ACTIVE") {
        throw new AuthError("Account suspended or deactivated");
      }

      const isValid = await verifyPassword(params.password, user.passwordHash);
      if (!isValid) {
        throw new AuthError("Invalid credentials");
      }

      // If user had a legacy or plain-text password from direct Supabase Table Editor edit, automatically upgrade to secure bcrypt hash
      if (isLegacyOrPlainHash(user.passwordHash)) {
        try {
          const upgradedHash = await hashPassword(params.password);
          await db.user.update({
            where: { id: user.id },
            data: { passwordHash: upgradedHash },
          });
          user.passwordHash = upgradedHash;
        } catch {
          // Quiet handling
        }
      }
    }

    if (user.status !== "ACTIVE") {
      throw new AuthError("Account suspended or deactivated");
    }

    const roles = user.userRoles.map((ur) => ur.role.name);
    let accessLevel: AccessLevel = "USER";
    if (user.accessLevel === "SUPER_ADMIN" || roles.includes("SUPER_ADMIN")) {
      accessLevel = "SUPER_ADMIN";
    } else if (user.accessLevel === "ADMIN" || roles.includes("ADMIN")) {
      accessLevel = "ADMIN";
    }
    const effectiveRoles = [accessLevel, ...roles.filter((r) => r !== accessLevel)];

    const permissions = await RbacService.getUserPermissions(user.id);

    const payload: SessionPayload = {
      userId: user.id,
      email: user.email,
      fullName: user.fullName,
      accessLevel,
      roles: effectiveRoles,
      permissions,
    };

    const token = await createSessionToken(payload);

    // Audit log login event
    await AuditService.logEvent({
      userId: user.id,
      action: "USER_LOGIN",
      entityType: "User",
      entityId: user.id,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent,
    });

    return {
      token,
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        phone: user.phone,
        avatarUrl: user.avatarUrl,
        accessLevel,
        roles: effectiveRoles,
        permissions,
      },
    };
  }

  public static async getCurrentUser(userId: string) {
    const cachedUser = RbacService.getCachedUser(userId);
    if (cachedUser) {
      return cachedUser;
    }

    const user = await withDbRetry(() =>
      db.user.findUnique({
        where: { id: userId },
        include: {
          userRoles: {
            include: {
              role: {
                include: {
                  rolePermissions: {
                    include: {
                      permission: true,
                    },
                  },
                },
              },
            },
          },
          permissionOverrides: {
            include: {
              permission: true,
            },
          },
        },
      })
    );

    if (!user) {
      throw new NotFoundError("User not found");
    }

    const computed = computeUserPermissions(user);

    const result = {
      id: user.id,
      email: user.email,
      fullName: user.fullName,
      phone: user.phone,
      avatarUrl: user.avatarUrl,
      status: user.status,
      accessLevel: computed.accessLevel,
      roles: computed.roles,
      permissions: computed.permissions,
      createdAt: user.createdAt,
    };

    RbacService.setCachedUserPerms(userId, {
      permissions: computed.permissions,
      accessLevel: computed.accessLevel,
      roles: computed.roles,
      user: result,
    });

    return result;
  }

  public static async getSessionFromCookies(): Promise<SessionPayload | null> {
    try {
      const cookieStore = await cookies();
      const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
      if (!token) return null;
      return await verifySessionToken(token);
    } catch {
      return null;
    }
  }
}
