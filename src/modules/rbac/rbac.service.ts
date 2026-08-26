import { db } from "@/lib/db";
import { ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditService } from "../audit/audit.service";

/**
 * Standard operational base permissions for normal ERP Users.
 * Note: Privileged financial approvals, direct user administration, audit viewing, and root system management are strictly excluded.
 */
export const STANDARD_USER_PERMISSIONS: string[] = [
  "leads:read",
  "leads:write",
  "leads:assign",
  "leads:convert",
  "leads:manage_followups",
  "clients:read",
  "clients:write",
  "clients:manage_notes",
  "projects:read",
  "projects:write",
  "projects:change_stage",
  "projects:stage_change",
  "projects:change_order",
  "projects:quality_check",
  "projects:handover",
  "projects:warranty",
  "projects:manage_tasks",
  "tasks:read",
  "tasks:write",
  "tasks:complete",
  "calendar:read",
  "calendar:write",
  "notifications:read",
  "notifications:manage_preferences",
  "quotations:read",
  "quotations:write",
  "payments:read",
  "payments:write",
  "expenses:read",
  "expenses:write",
  "expenses:submit",
  "petty_cash:read",
  "petty_cash:write",
  "petty_cash:record_expense",
  "petty_cash:settle",
  "vendors:read",
  "vendors:write",
  "vendors:rate",
  "material_requests:read",
  "material_requests:write",
  "purchase_orders:read",
  "purchase_orders:write",
  "goods_receipts:read",
  "goods_receipts:write",
  "procurement:read",
  "procurement:write",
  "procurement:create_request",
  "procurement:create_po",
  "inventory:read",
  "inventory:write",
  "inventory:issue",
  "inventory:receive",
  "inventory:return",
  "inventory:transfers",
  "inventory:adjust",
  "inventory:reserve",

  "finance:view",
  "finance:read",
  "finance:receivables",
  "finance:payables",
  "finance:payments",
  "finance:invoices",
  "invoices:read",
  "invoices:create",
  "financial_accounts:read",
  "ledger:read",
  "documents:read",
  "documents:write",
  "documents:upload",
  "documents:download",
  "documents:share",
  "search:read",
  "reports:view",
  "reports:read",
  "reports:sales",
  "reports:projects",
  "reports:inventory",
  "reports:tasks",
  "analytics:view",
  "analytics:sales",
  "analytics:projects",
  "analytics:inventory",
  "analytics:tasks",
];

/**
 * Operational permissions granted to ADMIN users (excluding Super-Admin exclusive operations).
 */
export const OPERATIONAL_ADMIN_PERMISSIONS: string[] = [
  ...STANDARD_USER_PERMISSIONS,
  "leads:delete",
  "leads:export",
  "clients:delete",
  "clients:archive",
  "clients:export",
  "clients:view_financials",
  "clients:view_payments",
  "clients:view_invoices",
  "projects:assign",
  "projects:manage_team",
  "projects:manage_schedule",
  "projects:manage_materials",
  "projects:manage_quality",
  "projects:manage_handover",
  "projects:view_financials",
  "projects:archive",
  "projects:delete",
  "projects:export",
  "quotations:approve",
  "payments:verify",
  "payments:cancel",
  "payments:reverse",
  "payments:receipt",
  "payments:allocate",
  "expenses:approve",
  "expenses:reject",
  "expenses:cancel",
  "expenses:reclassify",
  "expenses:reverse",
  "petty_cash:approve",
  "petty_cash:approve_settlement",
  "petty_cash:view_all",
  "petty_cash:reconcile",
  "vendors:deactivate",
  "vendors:block",
  "vendors:view_financials",
  "vendors:bank_details:view",
  "vendors:bank_details:edit",
  "vendor_payments:read",
  "vendor_payments:write",
  "vendor_payments:reverse",
  "financial_accounts:write",
  "financial_accounts:transfer",
  "finance:manage",
  "finance:period_lock",
  "material_requests:approve",
  "material_requests:reject",
  "purchase_orders:approve",
  "purchase_orders:send",
  "purchase_orders:cancel",
  "purchase_orders:revise",
  "procurement:approve_request",
  "procurement:approve_po",
  "procurement:revise_po",
  "procurement:manage_vendors",
  "procurement:three_way_match",
  "procurement:export",
  "inventory:counts",
  "inventory:admin",
  "inventory:create_material",
  "inventory:edit_material",
  "inventory:view_cost",
  "inventory:export",
  "inventory:manage_warehouse",
  "inventory:damage",
  "finance:cash_flow",
  "finance:profit",
  "finance:export",
  "employees:read",
  "employees:write",
  "employees:manage_salary",
  "employees:view_salary",
  "tasks:assign",
  "tasks:reassign",
  "tasks:delete",
  "tasks:export",
  "tasks:manage_templates",
  "calendar:delete",
  "notifications:admin",
  "documents:archive",
  "documents:delete",
  "documents:manage",
  "documents:view_restricted",
  "invoices:edit",
  "invoices:approve",
  "invoices:issue",
  "invoices:void",
  "invoices:export",
  "invoices:manage_tax",
  "gst:reports",
  "reports:export",
  "reports:finance",
  "reports:hr",
  "reports:procurement",
  "reports:tax",
  "reports:company_wide",
  "analytics:executive",
  "analytics:finance",
  "analytics:hr",
  "analytics:procurement",
  "analytics:tax",
  "config:manage",
  "settings:view",
  "settings:company",
  "settings:branding",
  "settings:finance",
  "settings:tax",
  "settings:invoices",
  "settings:quotations",
  "settings:projects",
  "settings:procurement",
  "settings:inventory",
  "settings:employees",
  "settings:tasks",
  "settings:notifications",
  "settings:documents",
  "settings:numbering",
  "settings:approvals",
  "settings:users",
  "settings:security",
  "settings:integrations",
  "settings:audit",
  "settings:system",
];




interface CachedUserPerms {
  permissions: string[];
  accessLevel: "SUPER_ADMIN" | "ADMIN" | "USER";
  roles: string[];
  user?: any;
  expiresAt: number;
}

const userPermsCache = new Map<string, CachedUserPerms>();
const CACHE_TTL_MS = 60_000; // 60 seconds

export function computeUserPermissions(user: {
  accessLevel?: string;
  userRoles?: Array<{ role: { name: string; rolePermissions?: Array<{ permission: { code: string } }> } }>;
  permissionOverrides?: Array<{ effect: string; permission: { code: string } }>;
}): { permissions: string[]; accessLevel: "SUPER_ADMIN" | "ADMIN" | "USER"; roles: string[] } {
  const roles = (user.userRoles || []).map((ur) => ur.role.name);
  let accessLevel: "SUPER_ADMIN" | "ADMIN" | "USER" = "USER";
  if (user.accessLevel === "SUPER_ADMIN" || roles.includes("SUPER_ADMIN")) {
    accessLevel = "SUPER_ADMIN";
  } else if (user.accessLevel === "ADMIN" || roles.includes("ADMIN")) {
    accessLevel = "ADMIN";
  }

  // SUPER_ADMIN has unrestricted universal access
  if (accessLevel === "SUPER_ADMIN") {
    return {
      permissions: ["*"],
      accessLevel,
      roles: ["SUPER_ADMIN", ...roles.filter((r) => r !== "SUPER_ADMIN")],
    };
  }

  const permissions = new Set<string>();

  if (accessLevel === "ADMIN") {
    for (const p of OPERATIONAL_ADMIN_PERMISSIONS) {
      permissions.add(p);
    }
  } else {
    for (const p of STANDARD_USER_PERMISSIONS) {
      permissions.add(p);
    }
  }

  // Add role-assigned permissions from custom roles (e.g. SALES, DESIGN, FINANCE)
  for (const ur of user.userRoles || []) {
    for (const rp of ur.role.rolePermissions || []) {
      if (accessLevel === "USER") {
        if (
          !rp.permission.code.includes("system:admin") &&
          !rp.permission.code.includes("audit:read") &&
          !rp.permission.code.includes("employees:manage_permissions")
        ) {
          permissions.add(rp.permission.code);
        }
      } else {
        permissions.add(rp.permission.code);
      }
    }
  }

  // Apply Direct User Permission Overrides (ALLOW adds, DENY removes)
  for (const override of user.permissionOverrides || []) {
    if (override.effect === "ALLOW") {
      permissions.add(override.permission.code);
    } else if (override.effect === "DENY") {
      permissions.delete(override.permission.code);
    }
  }

  const effectiveRoles = [accessLevel, ...roles.filter((r) => r !== accessLevel)];
  return {
    permissions: Array.from(permissions),
    accessLevel,
    roles: effectiveRoles,
  };
}

export class RbacService {
  /**
   * Invalidate cached user permissions
   */
  public static invalidateUserCache(userId?: string) {
    if (userId) {
      userPermsCache.delete(userId);
    } else {
      userPermsCache.clear();
    }
  }

  /**
   * Store user permissions into cache
   */
  public static setCachedUserPerms(
    userId: string,
    data: { permissions: string[]; accessLevel: "SUPER_ADMIN" | "ADMIN" | "USER"; roles: string[]; user?: any }
  ) {
    userPermsCache.set(userId, {
      ...data,
      expiresAt: Date.now() + CACHE_TTL_MS,
    });
  }

  public static getCachedUser(userId: string) {
    const cached = userPermsCache.get(userId);
    if (cached && cached.expiresAt > Date.now() && cached.user) {
      return cached.user;
    }
    return null;
  }

  /**
   * Check if a user is a SUPER_ADMIN
   */
  public static async isUserSuperAdmin(userId: string): Promise<boolean> {
    const cached = userPermsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.accessLevel === "SUPER_ADMIN";
    }

    const level = await this.getUserAccessLevel(userId);
    return level === "SUPER_ADMIN";
  }

  public static async isUserAdmin(userId: string): Promise<boolean> {
    const cached = userPermsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.accessLevel === "SUPER_ADMIN" || cached.accessLevel === "ADMIN";
    }

    const level = await this.getUserAccessLevel(userId);
    return level === "SUPER_ADMIN" || level === "ADMIN";
  }

  public static async isSuperAdmin(userId: string): Promise<boolean> {
    return this.isUserSuperAdmin(userId);
  }

  public static async isAdmin(userId: string): Promise<boolean> {
    return this.isUserAdmin(userId);
  }

  /**
   * Get the primary access level of a user ("SUPER_ADMIN" | "ADMIN" | "USER")
   */
  public static async getUserAccessLevel(userId: string): Promise<"SUPER_ADMIN" | "ADMIN" | "USER"> {
    const cached = userPermsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.accessLevel;
    }

    const user = await db.user.findUnique({
      where: { id: userId },
      select: {
        accessLevel: true,
        userRoles: {
          select: { role: { select: { name: true } } },
        },
      },
    });

    if (!user) return "USER";
    if (user.accessLevel === "SUPER_ADMIN" || user.userRoles.some((ur) => ur.role.name === "SUPER_ADMIN")) {
      return "SUPER_ADMIN";
    }
    if (user.accessLevel === "ADMIN" || user.userRoles.some((ur) => ur.role.name === "ADMIN")) {
      return "ADMIN";
    }
    return "USER";
  }

  /**
   * Enforce that the user MUST be a SUPER_ADMIN.
   * Throws ForbiddenError and records security audit log if unauthorized.
   */
  public static async requireSuperAdmin(userId: string, actionName: string = "PRIVILEGED_SUPER_ADMIN_ACTION"): Promise<void> {
    const isSuperAdmin = await this.isUserSuperAdmin(userId);
    if (!isSuperAdmin) {
      await AuditService.logEvent({
        userId,
        action: "SECURITY_UNAUTHORIZED_SUPER_ADMIN_ATTEMPT",
        entityType: "System",
        entityId: actionName,
        newValues: { attemptedAction: actionName, reason: "Action strictly requires SUPER_ADMIN authority" },
      });
      throw new ForbiddenError(`Privileged action [${actionName}] strictly requires SUPER_ADMIN access level.`);
    }
  }

  /**
   * Enforce that the user MUST be an ADMIN or SUPER_ADMIN.
   * Throws ForbiddenError and records security audit log if unauthorized.
   */
  public static async requireAdmin(userId: string, actionName: string = "PRIVILEGED_ADMIN_ACTION"): Promise<void> {
    const isAdmin = await this.isUserAdmin(userId);
    if (!isAdmin) {
      await AuditService.logEvent({
        userId,
        action: "SECURITY_UNAUTHORIZED_ADMIN_ATTEMPT",
        entityType: "System",
        entityId: actionName,
        newValues: { attemptedAction: actionName, reason: "Action requires ADMIN or SUPER_ADMIN access level" },
      });
      throw new ForbiddenError(`Privileged action [${actionName}] requires ADMIN access level.`);
    }
  }

  /**
   * Calculate effective active permissions for a user:
   * 1. SUPER_ADMIN gets wildcard ["*"]
   * 2. ADMIN gets comprehensive operational admin permissions + custom role permissions
   * 3. USER gets base standard permissions + role permissions
   * 4. Direct user permission overrides (ALLOW adds, DENY removes) are applied deterministically
   */
  public static async getUserPermissions(userId: string): Promise<string[]> {
    const cached = userPermsCache.get(userId);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.permissions;
    }

    const user = await db.user.findUnique({
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
    });

    if (!user || user.status !== "ACTIVE") return [];

    const computed = computeUserPermissions(user);
    this.setCachedUserPerms(userId, computed);

    return computed.permissions;
  }

  /**
   * Check if a user possesses a specific permission
   */
  public static async hasPermission(userId: string, requiredPermission: string): Promise<boolean> {
    const userPerms = await this.getUserPermissions(userId);
    if (userPerms.includes("*")) return true;
    return userPerms.includes(requiredPermission);
  }

  /**
   * Authorize a specific permission or throw ForbiddenError
   */
  public static async authorize(userId: string, requiredPermission: string, actionName?: string): Promise<void> {
    const isAllowed = await this.hasPermission(userId, requiredPermission);

    if (!isAllowed) {
      await AuditService.logEvent({
        userId,
        action: "SECURITY_UNAUTHORIZED_ACCESS_ATTEMPT",
        entityType: "Permission",
        entityId: requiredPermission,
        newValues: { attemptedAction: actionName ?? "UNSPECIFIED" },
      });

      throw new ForbiddenError(`Insufficient permissions. Required permission: [${requiredPermission}]`);
    }
  }

  /**
   * Check if a user has access to a specific top-level module
   */
  public static async hasModuleAccess(userId: string, moduleCode: string): Promise<boolean> {
    const userPerms = await this.getUserPermissions(userId);
    if (userPerms.includes("*")) return true;

    // Check if user possesses at least one permission belonging to this module or matching the prefix
    const prefix = moduleCode.toLowerCase() + ":";
    return userPerms.some((p) => p.startsWith(prefix) || p.includes(moduleCode.toLowerCase()));
  }

  /**
   * Retrieve all custom permission overrides for a user
   */
  public static async getUserPermissionOverrides(userId: string) {
    const user = await db.user.findUnique({
      where: { id: userId },
      include: {
        permissionOverrides: {
          include: { permission: true },
        },
      },
    });

    if (!user) throw new NotFoundError("User not found");

    return user.permissionOverrides.map((po) => ({
      id: po.id,
      permissionId: po.permissionId,
      code: po.permission.code,
      module: po.permission.module,
      description: po.permission.description,
      effect: po.effect as "ALLOW" | "DENY",
    }));
  }

  /**
   * Set custom permission overrides for a user (ALLOW or DENY).
   * Strictly enforces Super Admin authority.
   */
  public static async setUserPermissionOverrides(
    targetUserId: string,
    overrides: Array<{ code: string; effect: "ALLOW" | "DENY" }>,
    actorId?: string
  ): Promise<void> {
    if (actorId) {
      await this.requireSuperAdmin(actorId, "SET_USER_PERMISSION_OVERRIDES");
    }

    const targetUser = await db.user.findUnique({ where: { id: targetUserId } });
    if (!targetUser) throw new NotFoundError("Target user not found");

    // Atomically replace permission overrides in a transaction
    await db.$transaction(async (tx) => {
      // 1. Remove existing overrides
      await tx.userPermissionOverride.deleteMany({
        where: { userId: targetUserId },
      });

      // 2. Insert new overrides
      for (const item of overrides) {
        const perm = await tx.permission.findUnique({
          where: { code: item.code },
        });

        if (perm) {
          await tx.userPermissionOverride.create({
            data: {
              userId: targetUserId,
              permissionId: perm.id,
              effect: item.effect,
            },
          });
        }
      }
    });

    this.invalidateUserCache(targetUserId);

    await AuditService.logEvent({
      userId: actorId,
      action: "USER_PERMISSIONS_OVERRIDDEN",
      entityType: "User",
      entityId: targetUserId,
      newValues: {
        overridesCount: overrides.length,
        overrides: overrides.map((o) => `${o.code}:${o.effect}`),
      },
    });
  }
}
