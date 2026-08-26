import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { RbacService } from "@/modules/rbac/rbac.service";
import { UserManagementService } from "@/modules/settings/user-management.service";
import { AuthService } from "@/modules/auth/auth.service";
import { ForbiddenError, AuthError } from "@/lib/errors";

describe("Prompt 03: 3-Tier RBAC & User Administration Production Tests", () => {
  let superAdminUser: any;
  let adminUser: any;
  let normalUser: any;
  let restrictedUser: any;

  beforeAll(async () => {
    // 1. Create or ensure SUPER_ADMIN
    superAdminUser = await db.user.upsert({
      where: { email: "test-superadmin-rbac@espacio.in" },
      update: { accessLevel: "SUPER_ADMIN", status: "ACTIVE" },
      create: {
        email: "test-superadmin-rbac@espacio.in",
        fullName: "Test Super Admin",
        passwordHash: "$2a$10$somethinghashedfortestpurposesonly123456",
        accessLevel: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });

    // 2. Create or ensure ADMIN
    adminUser = await db.user.upsert({
      where: { email: "test-admin-rbac@espacio.in" },
      update: { accessLevel: "ADMIN", status: "ACTIVE" },
      create: {
        email: "test-admin-rbac@espacio.in",
        fullName: "Test Operational Admin",
        passwordHash: "$2a$10$somethinghashedfortestpurposesonly123456",
        accessLevel: "ADMIN",
        status: "ACTIVE",
      },
    });

    // 3. Create or ensure normal USER
    normalUser = await db.user.upsert({
      where: { email: "test-user-normal@espacio.in" },
      update: { accessLevel: "USER", status: "ACTIVE" },
      create: {
        email: "test-user-normal@espacio.in",
        fullName: "Test Normal User",
        passwordHash: "$2a$10$somethinghashedfortestpurposesonly123456",
        accessLevel: "USER",
        status: "ACTIVE",
      },
    });

    // 4. Create custom restricted USER (e.g. Soheb with specific allowed/denied overrides)
    restrictedUser = await db.user.upsert({
      where: { email: "test-soheb-restricted@espacio.in" },
      update: { accessLevel: "USER", status: "ACTIVE" },
      create: {
        email: "test-soheb-restricted@espacio.in",
        fullName: "Soheb Site Specialist",
        passwordHash: "$2a$10$somethinghashedfortestpurposesonly123456",
        accessLevel: "USER",
        status: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    // Cleanup created test users
    await db.userPermissionOverride.deleteMany({
      where: {
        userId: {
          in: [superAdminUser?.id, adminUser?.id, normalUser?.id, restrictedUser?.id].filter(Boolean),
        },
      },
    });
    await db.user.deleteMany({
      where: {
        email: {
          in: [
            "test-superadmin-rbac@espacio.in",
            "test-admin-rbac@espacio.in",
            "test-user-normal@espacio.in",
            "test-soheb-restricted@espacio.in",
            "test-created-future-emp@espacio.in",
          ],
        },
      },
    });
  });

  // TEST 1: Super Admin universal access
  it("TEST 1: Super Admin has universal wildcard access ['*'] across all modules", async () => {
    const isSuper = await RbacService.isUserSuperAdmin(superAdminUser.id);
    expect(isSuper).toBe(true);

    const perms = await RbacService.getUserPermissions(superAdminUser.id);
    expect(perms).toContain("*");

    const canDoLeads = await RbacService.hasPermission(superAdminUser.id, "leads:read");
    const canDoFinancials = await RbacService.hasPermission(superAdminUser.id, "finance:period_lock");
    const canDoSystem = await RbacService.hasPermission(superAdminUser.id, "system:admin");

    expect(canDoLeads).toBe(true);
    expect(canDoFinancials).toBe(true);
    expect(canDoSystem).toBe(true);
  });

  // TEST 2: Admin operational access vs Super Admin restrictions
  it("TEST 2: Admin has operational authority but cannot execute Super Admin exclusive operations", async () => {
    const isSuper = await RbacService.isUserSuperAdmin(adminUser.id);
    expect(isSuper).toBe(false);

    const isAdmin = await RbacService.isUserAdmin(adminUser.id);
    expect(isAdmin).toBe(true);

    // Admin should have operational permissions
    const canViewLeads = await RbacService.hasPermission(adminUser.id, "leads:read");
    const canApproveExpenses = await RbacService.hasPermission(adminUser.id, "expenses:approve");
    expect(canViewLeads).toBe(true);
    expect(canApproveExpenses).toBe(true);

    // Admin cannot execute requireSuperAdmin
    await expect(RbacService.requireSuperAdmin(adminUser.id, "MANAGE_SYSTEM_BACKUP")).rejects.toThrow(ForbiddenError);
  });

  // TEST 3 & 4 & 5: Regular User permission checks & explicit denial
  it("TEST 3, 4 & 5: Regular user without explicit grant cannot access restricted module APIs", async () => {
    const isSuper = await RbacService.isUserSuperAdmin(normalUser.id);
    const isAdmin = await RbacService.isUserAdmin(normalUser.id);
    expect(isSuper).toBe(false);
    expect(isAdmin).toBe(false);

    // Normal user does NOT have financial period locks, system admin, or audit logs
    const canPeriodLock = await RbacService.hasPermission(normalUser.id, "finance:period_lock");
    const canAudit = await RbacService.hasPermission(normalUser.id, "audit:read");

    expect(canPeriodLock).toBe(false);
    expect(canAudit).toBe(false);

    // Calling authorize for forbidden action throws ForbiddenError
    await expect(RbacService.authorize(normalUser.id, "finance:period_lock")).rejects.toThrow(ForbiddenError);
  });

  // TEST 6, 7 & 8: Privilege escalation prevention
  it("TEST 6, 7 & 8: Prevents privilege escalation by normal users or admins", async () => {
    // Normal user cannot self-escalate or call requireAdmin
    await expect(RbacService.requireAdmin(normalUser.id, "ELEVATE_SELF")).rejects.toThrow(ForbiddenError);

    // Admin cannot create a Super Admin account without Super Admin authority
    await expect(
      UserManagementService.createUser(
        {
          email: "test-fake-superadmin@espacio.in",
          fullName: "Fake Super Admin",
          accessLevel: "SUPER_ADMIN",
        },
        adminUser.id // Admin attempting to create Super Admin
      )
    ).rejects.toThrow(ForbiddenError);
  });

  // TEST 9 & 10: Granular User Permission Overrides (ALLOW and DENY)
  it("TEST 9 & 10: Super Admin can configure explicit ALLOW and DENY overrides on a user", async () => {
    // 1. Set explicit overrides on restrictedUser (Soheb):
    // - Explicitly DENY expenses:read
    // - Explicitly DENY payments:read
    // - Explicitly ALLOW reports:read (even as a normal user)
    await RbacService.setUserPermissionOverrides(
      restrictedUser.id,
      [
        { code: "expenses:read", effect: "DENY" },
        { code: "payments:read", effect: "DENY" },
        { code: "reports:read", effect: "ALLOW" },
      ],
      superAdminUser.id
    );

    const effectivePerms = await RbacService.getUserPermissions(restrictedUser.id);

    // DENIED permissions must be absent
    expect(effectivePerms).not.toContain("expenses:read");
    expect(effectivePerms).not.toContain("payments:read");

    // ALLOWED override must be present
    expect(effectivePerms).toContain("reports:read");

    // Standard non-overridden permission (leads:read) must remain active
    expect(effectivePerms).toContain("leads:read");

    // Verify hasPermission returns accurate results
    expect(await RbacService.hasPermission(restrictedUser.id, "expenses:read")).toBe(false);
    expect(await RbacService.hasPermission(restrictedUser.id, "reports:read")).toBe(true);
    expect(await RbacService.hasPermission(restrictedUser.id, "leads:read")).toBe(true);
  });

  // TEST 11: Deactivated user is blocked from logging in
  it("TEST 11: Deactivated user cannot authenticate", async () => {
    // Create a temporary user and deactivate
    const tempUser = await UserManagementService.createUser(
      {
        email: "test-temp-deactivated@espacio.in",
        fullName: "Temp Deactivated",
        password: "Password123!",
        accessLevel: "USER",
      },
      superAdminUser.id
    );

    // Deactivate user
    await UserManagementService.deactivateUser(tempUser.id, superAdminUser.id);

    // Verify status in DB
    const dbUser = await db.user.findUnique({ where: { id: tempUser.id } });
    expect(dbUser?.status).toBe("DEACTIVATED");

    // Attempting login must throw AuthError
    await expect(
      AuthService.login({
        email: "test-temp-deactivated@espacio.in",
        password: "Password123!",
      })
    ).rejects.toThrow(AuthError);

    // Cleanup
    await db.userRole.deleteMany({ where: { userId: tempUser.id } });
    await db.user.delete({ where: { id: tempUser.id } });
  });

  // TEST 12: Future employee creation without code changes
  it("TEST 12: Super Admin can create future employee (#5, #6 ... #100) with custom role", async () => {
    const newEmployee = await UserManagementService.createUser(
      {
        email: "test-created-future-emp@espacio.in",
        fullName: "Employee #5 Future Designer",
        phone: "+91 9988776655",
        accessLevel: "USER",
        roleName: "DESIGN",
        permissionOverrides: [
          { code: "quotations:write", effect: "ALLOW" },
          { code: "expenses:read", effect: "DENY" },
        ],
      },
      superAdminUser.id
    );

    expect(newEmployee.id).toBeDefined();
    expect(newEmployee.email).toBe("test-created-future-emp@espacio.in");
    expect(newEmployee.overrides.length).toBe(2);

    const perms = await RbacService.getUserPermissions(newEmployee.id);
    expect(perms).toContain("quotations:write");
    expect(perms).not.toContain("expenses:read");
  });

  // TEST 13 & 14: Audit logging and zero secrets in logs
  it("TEST 13 & 14: Authorization and permission modifications create audit logs with zero plaintext passwords", async () => {
    const recentAuditLogs = await db.auditLog.findMany({
      where: {
        userId: superAdminUser.id,
        action: { in: ["USER_CREATED", "USER_PERMISSIONS_OVERRIDDEN"] },
      },
      orderBy: { createdAt: "desc" },
      take: 5,
    });

    expect(recentAuditLogs.length).toBeGreaterThan(0);

    for (const log of recentAuditLogs) {
      if (log.newValues) {
        expect(log.newValues).not.toContain("Password123!");
        expect(log.newValues).not.toContain("passwordHash");
      }
    }
  });

  // TEST 15: Safety check preventing deactivation of the last Super Admin
  it("TEST 15: Safety guard prevents deactivating the only active Super Admin", async () => {
    // Count active super admins
    const activeSuperAdmins = await db.user.findMany({
      where: { accessLevel: "SUPER_ADMIN", status: "ACTIVE" },
    });

    if (activeSuperAdmins.length === 1) {
      const loneSuperAdmin = activeSuperAdmins[0];
      await expect(
        UserManagementService.deactivateUser(loneSuperAdmin.id, loneSuperAdmin.id)
      ).rejects.toThrow(ForbiddenError);
    }
  });
});
