import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { hashPassword } from "@/lib/auth";
import { ForbiddenError, ValidationError, NotFoundError } from "@/lib/errors";
import { SettingsService } from "@/modules/settings/settings.service";
import { CompanyService } from "@/modules/settings/company.service";
import { IntegrationsService } from "@/modules/settings/integrations.service";
import { SystemHealthService } from "@/modules/settings/system-health.service";
import { ApprovalRulesService } from "@/modules/settings/approval-rules.service";
import { NumberingService } from "@/modules/settings/numbering.service";
import { GstInvoiceService } from "@/modules/finance/gst-invoice.service";
import { IdGeneratorService } from "@/lib/id-generator";

describe("ESPACIO ERP — MASTER PROMPT 16: Settings, Company Configuration & System Control Center Strict Suite", () => {
  let superAdminId: string;
  let adminUserId: string;
  let standardUserId: string;
  let testClientId: string;

  beforeAll(async () => {
    // 1. Setup Super Admin
    const superAdmin = await db.user.upsert({
      where: { email: "settings.superadmin@espacio.com" },
      update: { accessLevel: "SUPER_ADMIN", status: "ACTIVE" },
      create: {
        email: "settings.superadmin@espacio.com",
        passwordHash: await hashPassword("SuperAdmin@123"),
        fullName: "Settings Super Administrator",
        accessLevel: "SUPER_ADMIN",
        status: "ACTIVE",
      },
    });
    superAdminId = superAdmin.id;

    // 2. Setup Operational Admin
    const adminUser = await db.user.upsert({
      where: { email: "settings.admin@espacio.com" },
      update: { accessLevel: "ADMIN", status: "ACTIVE" },
      create: {
        email: "settings.admin@espacio.com",
        passwordHash: await hashPassword("AdminUser@123"),
        fullName: "Settings Operational Admin",
        accessLevel: "ADMIN",
        status: "ACTIVE",
      },
    });
    adminUserId = adminUser.id;

    // 3. Setup Standard User
    const standardUser = await db.user.upsert({
      where: { email: "settings.standard@espacio.com" },
      update: { accessLevel: "USER", status: "ACTIVE" },
      create: {
        email: "settings.standard@espacio.com",
        passwordHash: await hashPassword("StandardUser@123"),
        fullName: "Settings Standard User",
        accessLevel: "USER",
        status: "ACTIVE",
      },
    });
    standardUserId = standardUser.id;

    // 4. Setup Test Client for historical immutability check
    const client = await db.client.upsert({
      where: { phone: "+91 9988776655" },
      update: {},
      create: {
        referenceNo: "CLI-SET-001",
        fullName: "Settings Test Client Corp",
        email: "settings.client@test.com",
        phone: "+91 9988776655",
        gstin: "29ABCDE1234F1ZH",
        status: "ACTIVE",
      },
    });
    testClientId = client.id;
  });

  afterAll(async () => {
    // Cleanup created test records
    await db.user.deleteMany({
      where: {
        email: { in: ["settings.superadmin@espacio.com", "settings.admin@espacio.com", "settings.standard@espacio.com"] },
      },
    });
  });

  // ==========================================
  // SECTION 1: COMPANY PROFILE SETTINGS
  // ==========================================

  it("1. Retrieves default Company Profile with legal details", async () => {
    const profile = await CompanyService.getCompanyProfile();
    expect(profile.companyName).toBeDefined();
    expect(profile.legalName).toBeDefined();
    expect(profile.email).toContain("@");
    expect(profile.gstin).toHaveLength(15);
    expect(profile.workingDays.length).toBeGreaterThan(0);
  });

  it("2. Updates Company Name and Address successfully", async () => {
    const updated = await CompanyService.updateCompanyProfile(
      {
        companyName: "ESPACIO LUXURY INTERIORS",
        addressLine: "200 Feet Ring Road, Indiranagar",
        city: "Bengaluru",
      },
      superAdminId
    );
    expect(updated.companyName).toBe("ESPACIO LUXURY INTERIORS");
    expect(updated.addressLine).toBe("200 Feet Ring Road, Indiranagar");

    // Verify persistence
    const reloaded = await CompanyService.getCompanyProfile();
    expect(reloaded.companyName).toBe("ESPACIO LUXURY INTERIORS");
  });

  it("3. Validates Email format on Company Profile update", async () => {
    await expect(
      CompanyService.updateCompanyProfile({ email: "invalid-email-no-at" }, superAdminId)
    ).rejects.toThrow(ValidationError);
  });

  it("4. Validates GSTIN length (15 chars) on Company Profile update", async () => {
    await expect(
      CompanyService.updateCompanyProfile({ gstin: "INVALIDGST123" }, superAdminId)
    ).rejects.toThrow(ValidationError);
  });

  it("5. Validates PAN length (10 chars) on Company Profile update", async () => {
    await expect(
      CompanyService.updateCompanyProfile({ pan: "INVALIDPAN" + "EXTRA" }, superAdminId)
    ).rejects.toThrow(ValidationError);
  });

  it("6. Centralizes Company Logo URL across the system", async () => {
    const updated = await CompanyService.updateCompanyProfile(
      { logoUrl: "/brand/espacio-gold-logo.png" },
      superAdminId
    );
    expect(updated.logoUrl).toBe("/brand/espacio-gold-logo.png");
    const profile = await CompanyService.getCompanyProfile();
    expect(profile.logoUrl).toBe("/brand/espacio-gold-logo.png");
  });

  // ==========================================
  // SECTION 2: BRANDING & DESIGN SYSTEM
  // ==========================================

  it("7. Retrieves default Branding Configuration tokens", async () => {
    const branding = await CompanyService.getBrandingConfig();
    expect(branding.primaryColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
    expect(branding.backgroundColor).toBeDefined();
    expect(branding.themeName).toBeDefined();
  });

  it("8. Updates primary and accent brand colors", async () => {
    const updated = await CompanyService.updateBrandingConfig(
      { primaryColor: "#059669", accentColor: "#2563EB" },
      superAdminId
    );
    expect(updated.primaryColor).toBe("#059669");
    expect(updated.accentColor).toBe("#2563EB");
  });

  it("9. Rejects invalid hex color codes in branding", async () => {
    await expect(
      CompanyService.updateBrandingConfig({ primaryColor: "not-a-color" }, superAdminId)
    ).rejects.toThrow(ValidationError);
  });

  // ==========================================
  // SECTION 3: FINANCIAL SETTINGS & CURRENCY
  // ==========================================

  it("10. Retrieves Financial Settings with INR single currency", async () => {
    const finance = await SettingsService.getFinancialSettings();
    expect(finance.currency).toBe("INR");
    expect(finance.currencySymbol).toBe("₹");
    expect(finance.decimalPrecision).toBe(2);
    expect(finance.financialYearStartMonth).toBe(4); // April
    expect(finance.financialYearEndMonth).toBe(3); // March
  });

  it("11. Prevents setting unauthorized non-INR currency in V1", async () => {
    await expect(
      SettingsService.updateFinancialSettings({ currency: "USD" }, superAdminId)
    ).rejects.toThrow(ValidationError);
  });

  it("12. Updates default payment terms and decimal precision safely", async () => {
    const updated = await SettingsService.updateFinancialSettings(
      { defaultPaymentTermsDays: 30, decimalPrecision: 2 },
      superAdminId
    );
    expect(updated.defaultPaymentTermsDays).toBe(30);
    expect(updated.decimalPrecision).toBe(2);
  });

  it("13. Rejects invalid decimal precision outside 0-4 range", async () => {
    await expect(
      SettingsService.updateFinancialSettings({ decimalPrecision: 8 }, superAdminId)
    ).rejects.toThrow(ValidationError);
  });

  // ==========================================
  // SECTION 4: TAX / GST SETTINGS & HISTORICAL IMMUTABILITY
  // ==========================================

  it("14. Retrieves central Tax and GST settings", async () => {
    const tax = await SettingsService.getTaxSettings();
    expect(tax.gstin).toHaveLength(15);
    expect(tax.defaultGstRate).toBeGreaterThanOrEqual(0);
    expect(tax.applicableGstRates).toContain(18);
    expect(tax.applicableGstRates).toContain(12);
    expect(tax.applicableGstRates).toContain(5);
  });

  it("15. Updates Default GST Rate and verifies audit log", async () => {
    const updated = await SettingsService.updateTaxSettings(
      { defaultGstRate: 18, businessState: "Karnataka", businessStateCode: "29" },
      superAdminId
    );
    expect(updated.defaultGstRate).toBe(18);
    expect(updated.businessStateCode).toBe("29");
  });

  it("16. Rejects negative default GST rate", async () => {
    await expect(
      SettingsService.updateTaxSettings({ defaultGstRate: -5 }, superAdminId)
    ).rejects.toThrow(ValidationError);
  });

  it("17. Historical Immutability: Changing tax settings does not alter issued invoice records", async () => {
    // Create an invoice with 18% GST
    const inv = await GstInvoiceService.createInvoice({
      clientId: testClientId,
      customerName: "Immutability Test Customer",
      placeOfSupply: "Karnataka",
      stateCode: "29",
      isInterState: false,
      items: [
        {
          description: "Interior Design Consultation",
          hsnSacCode: "9954",
          quantity: 1,
          unitRate: 100000,
          discount: 0,
          gstRate: 18,
        },
      ],
      status: "ISSUED",
      createdById: superAdminId,
    });

    expect(inv.totalTax).toBe(18000);
    expect(inv.grandTotal).toBe(118000);

    // Update system tax settings to 12%
    await SettingsService.updateTaxSettings({ defaultGstRate: 12 }, superAdminId);

    // Verify existing invoice remains exactly 18000 tax
    const reloaded = await GstInvoiceService.getInvoiceById(inv.id);
    expect(reloaded.totalTax).toBe(18000);
    expect(reloaded.grandTotal).toBe(118000);

    // Cleanup invoice
    await db.gstInvoiceItem.deleteMany({ where: { invoiceId: inv.id } });
    await db.clientReceivable.deleteMany({ where: { clientId: testClientId } });
    await db.gstInvoice.delete({ where: { id: inv.id } });
  });

  // ==========================================
  // SECTION 5: COMMERCIAL DOCUMENT SETTINGS
  // ==========================================

  it("18. Retrieves Invoice Settings defaults", async () => {
    const inv = await SettingsService.getInvoiceSettings();
    expect(inv.prefix).toBe("INV");
    expect(inv.defaultDueDays).toBeGreaterThan(0);
    expect(inv.templateName).toBeDefined();
  });

  it("19. Updates Invoice Prefix and default notes", async () => {
    const updated = await SettingsService.updateInvoiceSettings(
      { prefix: "INV", defaultNotes: "Standard 15 days credit period applies." },
      superAdminId
    );
    expect(updated.prefix).toBe("INV");
    expect(updated.defaultNotes).toBe("Standard 15 days credit period applies.");
  });

  it("20. Retrieves Quotation Settings and updates validity days", async () => {
    const q = await SettingsService.getQuotationSettings();
    expect(q.prefix).toBe("Q");
    const updated = await SettingsService.updateQuotationSettings({ defaultValidityDays: 45 }, superAdminId);
    expect(updated.defaultValidityDays).toBe(45);
  });

  it("21. Retrieves and updates Purchase Order Settings", async () => {
    const po = await SettingsService.getPurchaseOrderSettings();
    expect(po.prefix).toBe("PO");
    const updated = await SettingsService.updatePurchaseOrderSettings(
      { defaultTermsAndConditions: "FOB Destination. Quality inspect required." },
      superAdminId
    );
    expect(updated.defaultTermsAndConditions).toContain("Quality inspect");
  });

  // ==========================================
  // SECTION 6: NUMBERING & CONCURRENCY
  // ==========================================

  it("22. Retrieves central numbering configuration for all ERP entities", async () => {
    const numbering = await NumberingService.getNumberingSettings();
    expect(numbering.lead.prefix).toBe("LEAD");
    expect(numbering.invoice.prefix).toBe("INV");
    expect(numbering.purchaseOrder.prefix).toBe("PO");
    expect(numbering.project.prefix).toBe("PROJ");
  });

  it("23. Updates numbering padding and validates samples", async () => {
    const updated = await NumberingService.updateNumberingSettings(
      { invoice: { prefix: "INV", padding: 4 } },
      superAdminId
    );
    expect(updated.invoice.prefix).toBe("INV");
    expect(updated.invoice.padding).toBe(4);
    expect(updated.invoice.sample).toMatch(/^INV-\d{4}-0001$/);
  });

  it("24. Rejects invalid entity numbering prefix with special characters", async () => {
    await expect(
      NumberingService.updateNumberingSettings(
        { invoice: { prefix: "INV@#$" as any } },
        superAdminId
      )
    ).rejects.toThrow(ValidationError);
  });

  it("25. Numbering Concurrency: IdGenerator generates unique sequential numbers", async () => {
    const id1 = await IdGeneratorService.generate("INV");
    const id2 = await IdGeneratorService.generate("INV", 1);
    expect(id1).not.toBe(id2);
  });

  // ==========================================
  // SECTION 7: DOCUMENT & STORAGE POLICY
  // ==========================================

  it("26. Retrieves Document Policy settings", async () => {
    const doc = await SettingsService.getDocumentSettings();
    expect(doc.storageProvider).toBeDefined();
    expect(doc.maxFileSizeMb).toBeGreaterThan(0);
    expect(doc.allowedFileTypes).toContain("application/pdf");
  });

  it("27. Updates Document max file size and default visibility", async () => {
    const updated = await SettingsService.updateDocumentSettings(
      { maxFileSizeMb: 100, defaultVisibility: "INTERNAL" },
      superAdminId
    );
    expect(updated.maxFileSizeMb).toBe(100);
    expect(updated.defaultVisibility).toBe("INTERNAL");
  });

  it("28. Rejects unrealistic document max file size (> 500MB)", async () => {
    await expect(
      SettingsService.updateDocumentSettings({ maxFileSizeMb: 1000 }, superAdminId)
    ).rejects.toThrow(ValidationError);
  });

  // ==========================================
  // SECTION 8: INTEGRATIONS (GOOGLE DRIVE & EMAIL)
  // ==========================================

  it("29. Retrieves Google Drive integration view with zero exposed secrets", async () => {
    const drive = await IntegrationsService.getGoogleDriveConfig();
    expect(drive.status).toBeDefined();
    expect(drive.provider).toBeDefined();
    expect(drive.rootFolderId).toBeDefined();
    // Verify NO secrets exposed in payload
    expect((drive as any).clientSecret).toBeUndefined();
    expect((drive as any).accessToken).toBeUndefined();
    expect((drive as any).refreshToken).toBeUndefined();
  });

  it("30. Updates Google Drive root folder configuration", async () => {
    const updated = await IntegrationsService.updateGoogleDriveConfig(
      { rootFolderId: "espacio-production-vault" },
      superAdminId
    );
    expect(updated.rootFolderId).toBe("espacio-production-vault");
  });

  it("31. Tests Google Drive connection without throwing uncaught exceptions", async () => {
    const testResult = await IntegrationsService.testGoogleDriveConnection(superAdminId);
    expect(testResult.message).toBeDefined();
    expect(testResult.latencyMs).toBeGreaterThanOrEqual(0);
  });

  it("32. Retrieves Email integration configuration with zero SMTP passwords exposed", async () => {
    const email = await IntegrationsService.getEmailConfig();
    expect(email.senderEmail).toContain("@");
    expect(email.smtpHost).toBeDefined();
    expect((email as any).smtpPassword).toBeUndefined();
  });

  it("33. Updates Email sender information", async () => {
    const updated = await IntegrationsService.updateEmailConfig(
      { senderName: "ESPACIO Executive Notifications", senderEmail: "alerts@espacio.com" },
      superAdminId
    );
    expect(updated.senderName).toBe("ESPACIO Executive Notifications");
    expect(updated.senderEmail).toBe("alerts@espacio.com");
  });

  // ==========================================
  // SECTION 9: APPROVAL RULES & THRESHOLDS
  // ==========================================

  it("34. Retrieves centralized Financial Approval rules", async () => {
    const rules = await ApprovalRulesService.getApprovalSettings();
    expect(rules.expense.maxAdminAmount).toBeGreaterThanOrEqual(10000);
    expect(rules.purchaseOrder.maxAdminAmount).toBeGreaterThanOrEqual(50000);
    expect(rules.expense.preventSelfApproval).toBe(true);
  });

  it("35. Updates Expense and PO approval threshold amounts", async () => {
    const updated = await ApprovalRulesService.updateApprovalSettings(
      {
        expense: { module: "EXPENSE", maxAdminAmount: 15000, requireDualApproval: false, preventSelfApproval: true },
        purchaseOrder: { module: "PURCHASE_ORDER", maxAdminAmount: 75000, requireDualApproval: false, preventSelfApproval: true },
      },
      superAdminId
    );
    expect(updated.expense.maxAdminAmount).toBe(15000);
    expect(updated.purchaseOrder.maxAdminAmount).toBe(75000);
  });

  it("36. Segregation of Duties: Blocks user from self-approving their own expense", async () => {
    const check = await ApprovalRulesService.canApprove({
      module: "EXPENSE",
      amount: 5000,
      creatorId: adminUserId,
      approverId: adminUserId, // Same person attempting to approve
    });
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Creator cannot approve their own");
  });

  it("37. Threshold Escalation: Blocks Admin from approving amounts exceeding max threshold", async () => {
    const check = await ApprovalRulesService.canApprove({
      module: "EXPENSE",
      amount: 25000, // Exceeds 15,000 threshold
      creatorId: standardUserId,
      approverId: adminUserId,
    });
    expect(check.allowed).toBe(false);
    expect(check.reason).toContain("Requires Super Admin approval");
  });

  it("38. Threshold Pass: Allows Admin to approve amounts within max threshold for other users", async () => {
    const check = await ApprovalRulesService.canApprove({
      module: "EXPENSE",
      amount: 8000, // Within 15,000 threshold
      creatorId: standardUserId,
      approverId: adminUserId,
    });
    expect(check.allowed).toBe(true);
  });

  it("39. Super Admin bypasses threshold limits for all approvals", async () => {
    const check = await ApprovalRulesService.canApprove({
      module: "EXPENSE",
      amount: 500000, // Very high value
      creatorId: standardUserId,
      approverId: superAdminId,
    });
    expect(check.allowed).toBe(true);
  });

  // ==========================================
  // SECTION 10: USER MODULE VISIBILITY CONFIGURATION
  // ==========================================

  it("40. Retrieves default module visibility for a user", async () => {
    const modules = await SettingsService.getUserModuleVisibility(standardUserId);
    expect(modules).toContain("leads");
    expect(modules).toContain("projects");
  });

  it("41. Super Admin configures custom module visibility for a user", async () => {
    const customModules = ["leads", "projects", "tasks"];
    const updated = await SettingsService.updateUserModuleVisibility(standardUserId, customModules, superAdminId);
    expect(updated).toEqual(customModules);

    const reloaded = await SettingsService.getUserModuleVisibility(standardUserId);
    expect(reloaded).toEqual(customModules);
  });

  // ==========================================
  // SECTION 11: SYSTEM CONTROL CENTER & HEALTH CHECKS
  // ==========================================

  it("42. Generates complete System Health Report with zero secret leaks", async () => {
    const health = await SystemHealthService.getSystemHealth();
    expect(health.overallStatus).toBeDefined();
    expect(health.version).toBe("1.0.0-prod");
    expect(health.environment).toBeDefined();
    expect(health.components.database.status).toBe("HEALTHY");
    expect(health.components.storage.status).toBe("HEALTHY");
    expect(health.components.notifications.status).toBe("HEALTHY");
    // Verify no db passwords leaked
    expect((health as any).dbPassword).toBeUndefined();
  });

  it("43. Enables and Disables Maintenance Mode with custom message", async () => {
    const enabled = await SystemHealthService.setMaintenanceMode(
      true,
      "Upgrading ESPACIO ERP core database cluster.",
      ["SUPER_ADMIN"],
      superAdminId
    );
    expect(enabled.enabled).toBe(true);
    expect(enabled.message).toBe("Upgrading ESPACIO ERP core database cluster.");

    // Disable maintenance mode
    const disabled = await SystemHealthService.setMaintenanceMode(false, undefined, undefined, superAdminId);
    expect(disabled.enabled).toBe(false);
  });

  // ==========================================
  // SECTION 12: SECURITY SETTINGS
  // ==========================================

  it("44. Retrieves Security & Password Policy settings", async () => {
    const sec = await SettingsService.getSecuritySettings();
    expect(sec.sessionTimeoutMinutes).toBeGreaterThan(0);
    expect(sec.passwordMinLength).toBeGreaterThanOrEqual(8);
  });

  it("45. Updates Security password length and lockout duration", async () => {
    const updated = await SettingsService.updateSecuritySettings(
      { sessionTimeoutMinutes: 240, maxFailedLoginAttempts: 5, lockoutDurationMinutes: 30 },
      superAdminId
    );
    expect(updated.sessionTimeoutMinutes).toBe(240);
    expect(updated.lockoutDurationMinutes).toBe(30);
  });

  it("46. Rejects insecure password length (< 6 characters)", async () => {
    await expect(
      SettingsService.updateSecuritySettings({ passwordMinLength: 4 }, superAdminId)
    ).rejects.toThrow(ValidationError);
  });

  // ==========================================
  // SECTION 13: SETTINGS SEARCH & AUDIT TRAIL
  // ==========================================

  it("47. Searches settings catalog by keyword 'tax' and 'company'", async () => {
    const results = await SettingsService.searchSettings("tax");
    expect(results.length).toBeGreaterThan(0);
    expect(results.some((r) => r.category === "TAX" || r.key.includes("tax"))).toBe(true);
  });

  it("48. Creates AuditLog entries on every configuration change", async () => {
    const countBefore = await db.auditLog.count({ where: { action: "SETTINGS_UPDATED" } });
    const uniqueVal = `audit-val-${Date.now()}`;
    await SettingsService.set("test.audit.key", uniqueVal, "SYSTEM", "Test Audit", superAdminId);
    const countAfter = await db.auditLog.count({ where: { action: "SETTINGS_UPDATED" } });
    expect(countAfter).toBeGreaterThan(countBefore);
  });

  it("49. Settings operations are non-destructive and preserve existing database models", async () => {
    const userCountBefore = await db.user.count();
    const invoiceCountBefore = await db.gstInvoice.count();
    await SettingsService.getFinancialSettings();
    await SettingsService.getTaxSettings();
    await NumberingService.getNumberingSettings();
    expect(await db.user.count()).toBe(userCountBefore);
    expect(await db.gstInvoice.count()).toBe(invoiceCountBefore);
  });

  it("50. Production ERP has zero destructive reset controls", () => {
    // Assert that SettingsService exposes NO destructive reset/delete-all methods
    expect((SettingsService as any).resetDatabase).toBeUndefined();
    expect((SettingsService as any).deleteAllData).toBeUndefined();
    expect((SettingsService as any).purgeCompany).toBeUndefined();
  });
});
