import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { CompanyService } from "../src/modules/settings/company.service";
import { UserManagementService } from "../src/modules/settings/user-management.service";
import { SettingsService } from "../src/modules/settings/settings.service";
import { BackupService } from "../src/modules/settings/backup.service";

describe("Module 17: Settings, Administration & System Control", () => {
  let adminUserId: string;
  let testCreatedUserId: string;

  beforeAll(async () => {
    // Find or create test admin user with SUPER_ADMIN access level
    let admin = await db.user.findFirst({ where: { accessLevel: "SUPER_ADMIN", status: "ACTIVE" } });
    if (!admin) {
      admin = await db.user.create({
        data: {
          email: `admin_settings_${Date.now()}@espacio.com`,
          passwordHash: "hash123",
          fullName: "Settings Super Admin",
          accessLevel: "SUPER_ADMIN",
        },
      });
    }
    adminUserId = admin.id;
  });

  it("1. Should retrieve and update Company Profile with validated GSTIN and contact details", async () => {
    const company = await CompanyService.getCompanyProfile();
    expect(company).toBeDefined();
    expect(company.companyName).toBeTruthy();

    const updated = await CompanyService.updateCompanyProfile(
      {
        companyName: "ESPACIO INTERIOR SOLUTIONS",
        legalName: "ESPACIO INTERIOR SOLUTIONS PRIVATE LIMITED",
        gstin: "29ABCDE1234F1ZH",
        email: "support@espacio.com",
        phone: "+91 98765 43210",
      },
      adminUserId
    );

    expect(updated.companyName).toBe("ESPACIO INTERIOR SOLUTIONS");
    expect(updated.email).toBe("support@espacio.com");
  });

  it("2. Should create a new user account with assigned role", async () => {
    const email = `testuser_${Date.now()}@espacio.com`;
    const newUser = await UserManagementService.createUser(
      {
        email,
        fullName: "Aahil Khan",
        phone: "+91 99887 76655",
        roleName: "SALES",
      },
      adminUserId
    );

    expect(newUser).toBeDefined();
    expect(newUser.email).toBe(email);
    expect(newUser.status).toBe("ACTIVE");
    testCreatedUserId = newUser.id;
  });

  it("3. Should update user role and soft-deactivate user preserving historical attribution", async () => {
    const updated = await UserManagementService.updateUser(
      testCreatedUserId,
      { roleName: "PROJECT", fullName: "Aahil Khan (Project Lead)" },
      adminUserId
    );
    expect(updated.fullName).toBe("Aahil Khan (Project Lead)");

    const deactivated = await UserManagementService.deactivateUser(testCreatedUserId, adminUserId);
    expect(deactivated.status).toBe("DEACTIVATED");

    // Verify user record still exists in DB so historical leads/expenses retain attribution
    const fetched = await db.user.findUnique({ where: { id: testCreatedUserId } });
    expect(fetched).not.toBeNull();
    expect(fetched?.status).toBe("DEACTIVATED");
  });

  it("4. Should get and update Business Preferences", async () => {
    const prefs = await SettingsService.getBusinessPreferences();
    expect(prefs).toBeDefined();
    expect(prefs.currency).toBeDefined();

    const updated = await SettingsService.updateBusinessPreferences(
      {
        currency: "INR (₹)",
        dateFormat: "DD/MM/YYYY",
        paymentTerms: "15 Days",
        quotationPrefix: "Q",
        invoicePrefix: "INV",
        gstRate: 18,
      },
      adminUserId
    );

    expect(updated.quotationPrefix).toBe("Q");
    expect(updated.gstRate).toBe(18);
  });

  it("5. Should get and update official Project Stage workflow configuration", async () => {
    const stages = await SettingsService.getProjectStageSettings();
    expect(stages).toBeDefined();
    expect(stages.length).toBeGreaterThanOrEqual(13);

    // Update handover stage duration
    const modifiedStages = stages.map((s: any) =>
      s.name === "Handover" ? { ...s, durationDays: 3 } : s
    );

    const saved = await SettingsService.updateProjectStageSettings(modifiedStages, adminUserId);
    expect(saved.find((s: any) => s.name === "Handover").durationDays).toBe(3);
  });

  it("6. Should execute automated off-site backup producing BAK-YYYY-XXXX and updating status/history", async () => {
    const backupLog = await BackupService.runBackup(adminUserId);
    expect(backupLog).toBeDefined();
    expect(backupLog.backupNo).toMatch(/^BAK-\d{4}-\d{4}$/);
    expect(backupLog.status).toBe("SUCCESS");

    const status = await BackupService.getBackupStatus();
    expect(status.offsiteStatus).toBe("HEALTHY");
    expect(status.totalCount).toBeGreaterThan(0);

    const history = await BackupService.getBackupHistory();
    expect(history.length).toBeGreaterThan(0);

    const testResult = await BackupService.testBackup(adminUserId);
    expect(testResult.success).toBe(true);
  });
});
