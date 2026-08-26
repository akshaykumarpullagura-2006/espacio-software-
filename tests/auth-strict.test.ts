import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { AuthService } from "@/modules/auth/auth.service";
import { RbacService } from "@/modules/rbac/rbac.service";
import { createSessionToken, verifySessionToken, hashPassword } from "@/lib/auth";

describe("Auth & 2-Level Authorization Strict Tests (USER vs ADMIN)", () => {
  const timestamp = Date.now();
  let adminUser: any;
  let normalUser: any;

  beforeAll(async () => {
    // Create test Admin user
    adminUser = await db.user.create({
      data: {
        email: `test_admin_${timestamp}@espacio.com`,
        fullName: "Test Admin User",
        passwordHash: await hashPassword("Password123!"),
        accessLevel: "ADMIN",
        status: "ACTIVE",
      },
    });

    // Create test standard User
    normalUser = await db.user.create({
      data: {
        email: `test_user_${timestamp}@espacio.com`,
        fullName: "Test Normal User",
        passwordHash: await hashPassword("Password123!"),
        accessLevel: "USER",
        status: "ACTIVE",
      },
    });
  });

  afterAll(async () => {
    if (adminUser?.id) {
      await db.auditLog.deleteMany({ where: { userId: adminUser.id } }).catch(() => {});
      await db.notification.deleteMany({ where: { userId: adminUser.id } }).catch(() => {});
      await db.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
    if (normalUser?.id) {
      await db.auditLog.deleteMany({ where: { userId: normalUser.id } }).catch(() => {});
      await db.notification.deleteMany({ where: { userId: normalUser.id } }).catch(() => {});
      await db.user.delete({ where: { id: normalUser.id } }).catch(() => {});
    }
  });

  it("should create and verify session token with accessLevel", async () => {
    const payload = {
      userId: adminUser.id,
      email: adminUser.email,
      fullName: adminUser.fullName,
      accessLevel: "ADMIN" as const,
      roles: ["ADMIN"],
    };

    const token = await createSessionToken(payload);
    expect(token).toBeDefined();

    const decoded = await verifySessionToken(token);
    expect(decoded.userId).toBe(adminUser.id);
    expect(decoded.accessLevel).toBe("ADMIN");
  });

  it("should correctly identify admin status in RbacService", async () => {
    const isAdmin = await RbacService.isUserAdmin(adminUser.id);
    const isNormalAdmin = await RbacService.isUserAdmin(normalUser.id);

    expect(isAdmin).toBe(true);
    expect(isNormalAdmin).toBe(false);
  });

  it("should grant operational admin permissions to ADMIN", async () => {
    const permissions = await RbacService.getUserPermissions(adminUser.id);
    expect(permissions).toContain("leads:read");
    expect(permissions).toContain("expenses:approve");
    expect(permissions).toContain("payments:verify");

    const hasApprovePerm = await RbacService.hasPermission(adminUser.id, "expenses:approve");
    expect(hasApprovePerm).toBe(true);
  });

  it("should grant standard ERP permissions to USER and deny privileged approval permissions", async () => {
    const permissions = await RbacService.getUserPermissions(normalUser.id);
    expect(permissions).toContain("leads:read");
    expect(permissions).toContain("projects:read");
    expect(permissions).toContain("expenses:write");
    expect(permissions).toContain("payments:write");

    // Must NOT contain approval permissions
    expect(permissions).not.toContain("expenses:approve");
    expect(permissions).not.toContain("payments:verify");
    expect(permissions).not.toContain("settings:manage");
    expect(permissions).not.toContain("audit:read");

    const canApprove = await RbacService.hasPermission(normalUser.id, "expenses:approve");
    expect(canApprove).toBe(false);
  });

  it("requireAdmin should pass for ADMIN and throw ForbiddenError for USER", async () => {
    await expect(RbacService.requireAdmin(adminUser.id, "TEST_ADMIN_ACTION")).resolves.not.toThrow();

    await expect(RbacService.requireAdmin(normalUser.id, "TEST_ADMIN_ACTION")).rejects.toThrow(
      /requires ADMIN access level/i
    );
  });
});
