import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError, ValidationError } from "@/lib/errors";
import { AuditService } from "../audit/audit.service";
import { RbacService } from "../rbac/rbac.service";
import { hashPassword, AccessLevel } from "@/lib/auth";
import crypto from "crypto";

export interface CreateUserInput {
  email: string;
  fullName: string;
  phone?: string;
  password?: string;
  accessLevel?: AccessLevel; // SUPER_ADMIN, ADMIN, USER
  roleName?: string; // SUPER_ADMIN, ADMIN, LEADERSHIP, SALES, DESIGN, PROJECT, FINANCE, USER, EMPLOYEE
  status?: string; // ACTIVE, INVITED, SUSPENDED, DEACTIVATED
  permissionOverrides?: Array<{ code: string; effect: "ALLOW" | "DENY" }>;
}

export interface UpdateUserInput {
  fullName?: string;
  phone?: string;
  roleName?: string;
  accessLevel?: AccessLevel;
  status?: string;
  newPassword?: string;
}

export class UserManagementService {
  /**
   * List all user accounts with roles and override summary
   */
  public static async getUsers() {
    const users = await db.user.findMany({
      orderBy: { createdAt: "desc" },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        status: true,
        accessLevel: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: { role: { select: { id: true, name: true, description: true } } },
        },
        permissionOverrides: {
          select: { id: true, effect: true, permission: { select: { code: true } } },
        },
      },
    });

    return users.map((u) => {
      let normalizedAccessLevel: AccessLevel = "USER";
      if (u.accessLevel === "SUPER_ADMIN" || u.userRoles.some((r) => r.role.name === "SUPER_ADMIN")) {
        normalizedAccessLevel = "SUPER_ADMIN";
      } else if (u.accessLevel === "ADMIN" || u.userRoles.some((r) => r.role.name === "ADMIN")) {
        normalizedAccessLevel = "ADMIN";
      }

      return {
        ...u,
        accessLevel: normalizedAccessLevel,
        overridesCount: u.permissionOverrides.length,
      };
    });
  }

  /**
   * Get single user by ID with effective permissions and overrides
   */
  public static async getUserById(id: string) {
    const user = await db.user.findUnique({
      where: { id },
      select: {
        id: true,
        email: true,
        fullName: true,
        phone: true,
        avatarUrl: true,
        status: true,
        accessLevel: true,
        createdAt: true,
        updatedAt: true,
        userRoles: {
          include: { role: true },
        },
        permissionOverrides: {
          include: { permission: true },
        },
      },
    });

    if (!user) throw new NotFoundError("User not found");

    let normalizedAccessLevel: AccessLevel = "USER";
    if (user.accessLevel === "SUPER_ADMIN" || user.userRoles.some((r) => r.role.name === "SUPER_ADMIN")) {
      normalizedAccessLevel = "SUPER_ADMIN";
    } else if (user.accessLevel === "ADMIN" || user.userRoles.some((r) => r.role.name === "ADMIN")) {
      normalizedAccessLevel = "ADMIN";
    }

    const effectivePermissions = await RbacService.getUserPermissions(user.id);

    return {
      ...user,
      accessLevel: normalizedAccessLevel,
      effectivePermissions,
      overrides: user.permissionOverrides.map((po) => ({
        id: po.id,
        permissionId: po.permissionId,
        code: po.permission.code,
        module: po.permission.module,
        effect: po.effect,
      })),
    };
  }

  /**
   * Create a new employee/user account
   */
  public static async createUser(input: CreateUserInput, actorId?: string) {
    if (!input.email || !input.fullName) {
      throw new ValidationError("Email and Full Name are required");
    }

    const normalizedEmail = input.email.toLowerCase().trim();
    const existing = await db.user.findUnique({ where: { email: normalizedEmail } });
    if (existing) {
      throw new ValidationError("A user with this email address already exists");
    }

    const targetAccessLevel: AccessLevel = input.accessLevel || (input.roleName === "SUPER_ADMIN" ? "SUPER_ADMIN" : input.roleName === "ADMIN" ? "ADMIN" : "USER");

    // Privilege check: Creating a SUPER_ADMIN or ADMIN requires Super Admin authority
    if (targetAccessLevel === "SUPER_ADMIN" || targetAccessLevel === "ADMIN") {
      if (actorId) {
        await RbacService.requireSuperAdmin(actorId, `CREATE_${targetAccessLevel}_USER`);
      }
    }

    const rawPassword = input.password || `Espacio@${Math.floor(100000 + Math.random() * 900000)}`;
    const passwordHash = await hashPassword(rawPassword);

    const user = await db.$transaction(async (tx) => {
      // 1. Create User record
      const newUser = await tx.user.create({
        data: {
          email: normalizedEmail,
          fullName: input.fullName.trim(),
          phone: input.phone?.trim() || null,
          status: input.status || "ACTIVE",
          accessLevel: targetAccessLevel,
          passwordHash,
        },
      });

      // 2. Ensure Role exists and assign
      const assignedRoleName = input.roleName || targetAccessLevel;
      let role = await tx.role.findUnique({ where: { name: assignedRoleName } });
      if (!role) {
        role = await tx.role.create({
          data: {
            name: assignedRoleName,
            description: `Role for ${assignedRoleName}`,
          },
        });
      }

      await tx.userRole.create({
        data: { userId: newUser.id, roleId: role.id },
      });

      // 3. Save any explicit permission overrides
      if (input.permissionOverrides && input.permissionOverrides.length > 0) {
        for (const override of input.permissionOverrides) {
          const perm = await tx.permission.findUnique({ where: { code: override.code } });
          if (perm) {
            await tx.userPermissionOverride.create({
              data: {
                userId: newUser.id,
                permissionId: perm.id,
                effect: override.effect,
              },
            });
          }
        }
      }

      return newUser;
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "USER_CREATED",
      entityType: "User",
      entityId: user.id,
      newValues: {
        email: user.email,
        fullName: user.fullName,
        accessLevel: targetAccessLevel,
        roleName: input.roleName || targetAccessLevel,
        status: user.status,
      },
    });

    return this.getUserById(user.id);
  }

  /**
   * Update an existing user account
   */
  public static async updateUser(userId: string, input: UpdateUserInput, actorId?: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: { userRoles: { include: { role: true } } },
    });
    if (!user) throw new NotFoundError("User not found");

    const currentAccess = await RbacService.getUserAccessLevel(userId);

    // If target user is a SUPER_ADMIN, only another SUPER_ADMIN can modify them
    if (currentAccess === "SUPER_ADMIN" && actorId && actorId !== userId) {
      await RbacService.requireSuperAdmin(actorId, "MODIFY_SUPER_ADMIN_USER");
    }

    // If attempting to promote/change accessLevel to SUPER_ADMIN, require Super Admin authority
    if (input.accessLevel === "SUPER_ADMIN" && currentAccess !== "SUPER_ADMIN" && actorId) {
      await RbacService.requireSuperAdmin(actorId, "PROMOTE_TO_SUPER_ADMIN");
    }

    // Safety rule: Prevent deactivating the last active SUPER_ADMIN
    if (input.status === "DEACTIVATED" || input.status === "INACTIVE") {
      if (currentAccess === "SUPER_ADMIN") {
        const superAdminCount = await db.user.count({
          where: { accessLevel: "SUPER_ADMIN", status: "ACTIVE" },
        });
        if (superAdminCount <= 1) {
          throw new ForbiddenError("Safety Protection: Cannot deactivate the only remaining active Super Admin.");
        }
      }
    }

    let passwordHashUpdate: string | undefined;
    if (input.newPassword) {
      if (actorId) {
        await RbacService.requireSuperAdmin(actorId, "RESET_USER_PASSWORD");
      }
      passwordHashUpdate = await hashPassword(input.newPassword);
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: {
        fullName: input.fullName?.trim(),
        phone: input.phone?.trim(),
        status: input.status,
        accessLevel: input.accessLevel ?? user.accessLevel,
        ...(passwordHashUpdate ? { passwordHash: passwordHashUpdate } : {}),
      },
    });

    // Update role if requested
    if (input.roleName) {
      let role = await db.role.findUnique({ where: { name: input.roleName } });
      if (!role) {
        role = await db.role.create({
          data: {
            name: input.roleName,
            description: `Role for ${input.roleName}`,
          },
        });
      }

      await db.userRole.deleteMany({ where: { userId } });
      await db.userRole.create({
        data: { userId, roleId: role.id },
      });

      await AuditService.logEvent({
        userId: actorId,
        action: "USER_ROLE_CHANGED",
        entityType: "User",
        entityId: userId,
        newValues: { roleName: input.roleName, accessLevel: input.accessLevel ?? updated.accessLevel },
      });
    }

    await AuditService.logEvent({
      userId: actorId,
      action: "USER_UPDATED",
      entityType: "User",
      entityId: userId,
      newValues: {
        fullName: updated.fullName,
        status: updated.status,
        accessLevel: updated.accessLevel,
        passwordChanged: !!passwordHashUpdate,
      },
    });

    RbacService.invalidateUserCache(userId);

    return this.getUserById(userId);
  }

  /**
   * Deactivate user with Super Admin safety guard
   */
  public static async deactivateUser(userId: string, actorId?: string) {
    if (actorId) {
      await RbacService.requireSuperAdmin(actorId, "DEACTIVATE_USER");
    }

    const currentAccess = await RbacService.getUserAccessLevel(userId);

    // Prevent deactivating the last active SUPER_ADMIN
    if (currentAccess === "SUPER_ADMIN") {
      const superAdminCount = await db.user.count({
        where: { accessLevel: "SUPER_ADMIN", status: "ACTIVE" },
      });
      if (superAdminCount <= 1) {
        throw new ForbiddenError("Safety Protection: Cannot deactivate the only active Super Admin.");
      }
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { status: "DEACTIVATED" },
    });

    RbacService.invalidateUserCache(userId);

    await AuditService.logEvent({
      userId: actorId,
      action: "USER_DEACTIVATED",
      entityType: "User",
      entityId: userId,
      newValues: { status: "DEACTIVATED" },
    });

    return updated;
  }

  /**
   * Reactivate a deactivated user
   */
  public static async reactivateUser(userId: string, actorId?: string) {
    if (actorId) {
      await RbacService.requireSuperAdmin(actorId, "REACTIVATE_USER");
    }

    const updated = await db.user.update({
      where: { id: userId },
      data: { status: "ACTIVE" },
    });

    await AuditService.logEvent({
      userId: actorId,
      action: "USER_REACTIVATED",
      entityType: "User",
      entityId: userId,
      newValues: { status: "ACTIVE" },
    });

    return updated;
  }
}
