import { db } from "@/lib/db";
import { ValidationError, ForbiddenError, NotFoundError } from "@/lib/errors";
import { AuditService } from "../audit/audit.service";

export interface FinancialSettingsData {
  currency: string;
  currencySymbol: string;
  decimalPrecision: number;
  financialYearStartMonth: number; // 4 = April
  financialYearEndMonth: number; // 3 = March
  defaultPaymentTermsDays: number;
  allowedPaymentMethods: string[];
}

export interface TaxSettingsData {
  gstin: string;
  businessState: string;
  businessStateCode: string;
  taxRegistrationType: "REGULAR" | "COMPOSITION";
  applicableGstRates: number[]; // [0, 5, 12, 18, 28]
  defaultGstRate: number;
  reverseChargeApplicable: boolean;
  eInvoicingEnabled: boolean;
  eWayBillEnabled: boolean;
}

export interface InvoiceSettingsData {
  prefix: string;
  numberFormat: string;
  defaultDueDays: number;
  defaultNotes: string;
  defaultFooter: string;
  templateName: string;
  showBankDetailsOnPdf: boolean;
  allowOverBilling: boolean;
}

export interface QuotationSettingsData {
  prefix: string;
  numberFormat: string;
  defaultValidityDays: number;
  defaultTermsAndConditions: string;
  defaultFooter: string;
  templateName: string;
}

export interface PurchaseOrderSettingsData {
  prefix: string;
  numberFormat: string;
  defaultTermsAndConditions: string;
  defaultFooter: string;
  templateName: string;
}

export interface DocumentSettingsData {
  storageProvider: "LOCAL_DISK" | "GOOGLE_DRIVE" | "OFFSITE_S3";
  allowedFileTypes: string[];
  maxFileSizeMb: number;
  defaultVisibility: "INTERNAL" | "PUBLIC" | "RESTRICTED";
  autoVersionOnUpload: boolean;
  archiveRetentionDays: number;
}

export interface SecuritySettingsData {
  sessionTimeoutMinutes: number;
  passwordMinLength: number;
  passwordRequireSpecialChar: boolean;
  passwordRequireNumber: boolean;
  maxFailedLoginAttempts: number;
  lockoutDurationMinutes: number;
  mfaRequiredForAdmins: boolean;
}

export interface UserModuleVisibilityMap {
  userId: string;
  visibleModules: string[]; // ["leads", "projects", "clients", "quotations", "finance", "procurement", "inventory", "employees", "tasks", "documents", "reports", "settings"]
}

export class SettingsService {
  /**
   * Get a single setting by key
   */
  public static async get(key: string, defaultValue = ""): Promise<string> {
    const setting = await db.setting.findUnique({ where: { key } });
    return setting?.value ?? defaultValue;
  }

  /**
   * Get all settings ordered by category
   */
  public static async getAll() {
    return db.setting.findMany({ orderBy: { category: "asc" } });
  }

  /**
   * Get all settings in a specific category
   */
  public static async getByCategory(category: string) {
    return db.setting.findMany({ where: { category }, orderBy: { key: "asc" } });
  }

  /**
   * Set or update a single setting with audit log
   */
  public static async set(key: string, value: string, category = "GENERAL", description?: string, userId?: string) {
    const existing = await db.setting.findUnique({ where: { key } });

    const setting = await db.setting.upsert({
      where: { key },
      update: { value, category, description },
      create: { key, value, category, description },
    });

    if (!existing || existing.value !== value) {
      await AuditService.logEvent({
        userId,
        action: "SETTINGS_UPDATED",
        entityType: "Setting",
        entityId: key,
        oldValues: existing ? { key, value: existing.value, category: existing.category } : null,
        newValues: { key, value, category },
      });
    }

    return setting;
  }

  public static async getBusinessPreferences() {
    const tax = await this.getTaxSettings();
    const inv = await this.getInvoiceSettings();
    const q = await this.getQuotationSettings();
    const fin = await this.getFinancialSettings();

    return {
      currency: `${fin.currency} (${fin.currencySymbol})`,
      dateFormat: "DD/MM/YYYY",
      timezone: "Asia/Kolkata (IST)",
      paymentTerms: `${fin.defaultPaymentTermsDays} Days`,
      quotationPrefix: q.prefix,
      invoicePrefix: inv.prefix,
      gstRate: tax.defaultGstRate,
    };
  }

  public static async updateBusinessPreferences(input: any, userId?: string) {
    if (input.currency) await this.set("business.currency", input.currency, "BUSINESS", "Default Currency", userId);
    if (input.paymentTerms) await this.set("business.paymentTerms", input.paymentTerms, "BUSINESS", "Default Payment Terms", userId);
    if (input.quotationPrefix) await this.updateQuotationSettings({ prefix: input.quotationPrefix }, userId);
    if (input.invoicePrefix) await this.updateInvoiceSettings({ prefix: input.invoicePrefix }, userId);
    if (input.gstRate !== undefined) await this.updateTaxSettings({ defaultGstRate: input.gstRate }, userId);
    return this.getBusinessPreferences();
  }

  public static async getProjectStageSettings() {
    const defaultStages = [
      { order: 1, name: "Confirmation Fee Paid", durationDays: 3, paymentMilestone: true, ownerRole: "SALES" },
      { order: 2, name: "Designing", durationDays: 7, paymentMilestone: false, ownerRole: "DESIGN" },
      { order: 3, name: "Designing Completed", durationDays: 2, paymentMilestone: false, ownerRole: "DESIGN" },
      { order: 4, name: "Material Selection", durationDays: 5, paymentMilestone: true, ownerRole: "PROJECT_MANAGER" },
      { order: 5, name: "Raw Material Ordered", durationDays: 4, paymentMilestone: false, ownerRole: "PROCUREMENT" },
      { order: 6, name: "Wood Work", durationDays: 14, paymentMilestone: false, ownerRole: "PROJECT_MANAGER" },
      { order: 7, name: "Wood Work Completed", durationDays: 2, paymentMilestone: false, ownerRole: "PROJECT_MANAGER" },
      { order: 8, name: "Laminates Ordered", durationDays: 3, paymentMilestone: false, ownerRole: "PROCUREMENT" },
      { order: 9, name: "Laminate Pasting", durationDays: 7, paymentMilestone: false, ownerRole: "PROJECT_MANAGER" },
      { order: 10, name: "Fitting Work Completed", durationDays: 5, paymentMilestone: false, ownerRole: "PROJECT_MANAGER" },
      { order: 11, name: "Quality Checks", durationDays: 2, paymentMilestone: false, ownerRole: "QUALITY" },
      { order: 12, name: "Handover", durationDays: 2, paymentMilestone: true, ownerRole: "PROJECT_MANAGER", completionReq: "Warranty Information Required" },
      { order: 13, name: "Project Completed", durationDays: 0, paymentMilestone: false, ownerRole: "LEADERSHIP" },
    ];

    const raw = await this.get("project.stages_config", "");
    if (!raw) return defaultStages;
    try {
      return JSON.parse(raw);
    } catch {
      return defaultStages;
    }
  }

  public static async updateProjectStageSettings(stages: any[], userId?: string) {
    const jsonStr = JSON.stringify(stages);
    await this.set("project.stages_config", jsonStr, "PROJECT", "Project Stage Workflow Configuration", userId);
    return stages;
  }

  // =========================================================================
  // 1. FINANCIAL SETTINGS
  // =========================================================================

  public static async getFinancialSettings(): Promise<FinancialSettingsData> {
    const raw = await this.get("finance.settings", "");
    const defaults: FinancialSettingsData = {
      currency: "INR",
      currencySymbol: "₹",
      decimalPrecision: 2,
      financialYearStartMonth: 4, // April
      financialYearEndMonth: 3, // March
      defaultPaymentTermsDays: 15,
      allowedPaymentMethods: ["BANK_TRANSFER", "UPI", "CASH", "CHEQUE", "CARD"],
    };

    if (raw) {
      try {
        return { ...defaults, ...JSON.parse(raw) };
      } catch {
        // fallback
      }
    }
    return defaults;
  }

  public static async updateFinancialSettings(input: Partial<FinancialSettingsData>, actorId?: string): Promise<FinancialSettingsData> {
    const existing = await this.getFinancialSettings();

    // Protection rule: Single-currency in V1. Prevent casual currency change.
    if (input.currency && input.currency !== "INR") {
      throw new ValidationError("ESPACIO ERP V1 supports Indian Rupee (INR / ₹) as the primary operating currency.");
    }

    if (input.decimalPrecision !== undefined && (input.decimalPrecision < 0 || input.decimalPrecision > 4)) {
      throw new ValidationError("Decimal precision must be between 0 and 4.");
    }

    const updated: FinancialSettingsData = {
      ...existing,
      ...input,
    };

    await this.set("finance.settings", JSON.stringify(updated), "FINANCE", "Company Financial and Currency Settings", actorId);
    return updated;
  }

  // =========================================================================
  // 2. TAX / GST SETTINGS
  // =========================================================================

  public static async getTaxSettings(): Promise<TaxSettingsData> {
    const raw = await this.get("tax.settings", "");
    const defaults: TaxSettingsData = {
      gstin: "29ABCDE1234F1ZH",
      businessState: "Karnataka",
      businessStateCode: "29",
      taxRegistrationType: "REGULAR",
      applicableGstRates: [0, 5, 12, 18, 28],
      defaultGstRate: 18,
      reverseChargeApplicable: false,
      eInvoicingEnabled: false,
      eWayBillEnabled: false,
    };

    if (raw) {
      try {
        return { ...defaults, ...JSON.parse(raw) };
      } catch {
        // fallback
      }
    }
    return defaults;
  }

  public static async updateTaxSettings(input: Partial<TaxSettingsData>, actorId?: string): Promise<TaxSettingsData> {
    const existing = await this.getTaxSettings();

    if (input.gstin !== undefined && input.gstin.trim() !== "") {
      const cleanGstin = input.gstin.trim().toUpperCase();
      if (cleanGstin.length !== 15) {
        throw new ValidationError("Invalid GSTIN format (must be 15 alphanumeric characters).");
      }
      input.gstin = cleanGstin;
    }

    if (input.defaultGstRate !== undefined && input.defaultGstRate < 0) {
      throw new ValidationError("Default GST rate cannot be negative.");
    }

    const updated: TaxSettingsData = {
      ...existing,
      ...input,
    };

    await this.set("tax.settings", JSON.stringify(updated), "TAX", "Central Tax and GST Rules Configuration", actorId);
    return updated;
  }

  // =========================================================================
  // 3. INVOICE SETTINGS
  // =========================================================================

  public static async getInvoiceSettings(): Promise<InvoiceSettingsData> {
    const raw = await this.get("invoice.settings", "");
    const defaults: InvoiceSettingsData = {
      prefix: "INV",
      numberFormat: "{PREFIX}-{YEAR}-{SEQ}",
      defaultDueDays: 15,
      defaultNotes: "Thank you for your business. Please remit payment via Bank Transfer or UPI.",
      defaultFooter: "ESPACIO Interior Solutions Pvt Ltd • 100 Feet Rd, Indiranagar, Bengaluru • contact@espacio.com",
      templateName: "STANDARD_COMMERCIAL",
      showBankDetailsOnPdf: true,
      allowOverBilling: false,
    };

    if (raw) {
      try {
        return { ...defaults, ...JSON.parse(raw) };
      } catch {
        // fallback
      }
    }
    return defaults;
  }

  public static async updateInvoiceSettings(input: Partial<InvoiceSettingsData>, actorId?: string): Promise<InvoiceSettingsData> {
    const existing = await this.getInvoiceSettings();

    if (input.prefix && !/^[A-Z0-9]{2,6}$/.test(input.prefix.toUpperCase())) {
      throw new ValidationError("Invoice prefix must be 2 to 6 alphanumeric characters.");
    }

    if (input.defaultDueDays !== undefined && input.defaultDueDays < 0) {
      throw new ValidationError("Default due days cannot be negative.");
    }

    const updated: InvoiceSettingsData = {
      ...existing,
      ...input,
      prefix: input.prefix ? input.prefix.toUpperCase() : existing.prefix,
    };

    await this.set("invoice.settings", JSON.stringify(updated), "INVOICE", "Invoice Numbering and Template Defaults", actorId);
    return updated;
  }

  // =========================================================================
  // 4. QUOTATION SETTINGS
  // =========================================================================

  public static async getQuotationSettings(): Promise<QuotationSettingsData> {
    const raw = await this.get("quotation.settings", "");
    const defaults: QuotationSettingsData = {
      prefix: "Q",
      numberFormat: "{PREFIX}-{YEAR}-{SEQ}",
      defaultValidityDays: 30,
      defaultTermsAndConditions: "1. 50% Advance on signing BOQ. 2. 40% before dispatch. 3. 10% on handover.",
      defaultFooter: "ESPACIO Turnkey Interiors • Validity 30 Days from date of issuance.",
      templateName: "DETAILED_BOQ",
    };

    if (raw) {
      try {
        return { ...defaults, ...JSON.parse(raw) };
      } catch {
        // fallback
      }
    }
    return defaults;
  }

  public static async updateQuotationSettings(input: Partial<QuotationSettingsData>, actorId?: string): Promise<QuotationSettingsData> {
    const existing = await this.getQuotationSettings();
    const updated: QuotationSettingsData = {
      ...existing,
      ...input,
      prefix: input.prefix ? input.prefix.toUpperCase() : existing.prefix,
    };

    await this.set("quotation.settings", JSON.stringify(updated), "QUOTATION", "Quotation Numbering & Validity Terms Defaults", actorId);
    return updated;
  }

  // =========================================================================
  // 5. PURCHASE ORDER SETTINGS
  // =========================================================================

  public static async getPurchaseOrderSettings(): Promise<PurchaseOrderSettingsData> {
    const raw = await this.get("procurement.po_settings", "");
    const defaults: PurchaseOrderSettingsData = {
      prefix: "PO",
      numberFormat: "{PREFIX}-{YEAR}-{SEQ}",
      defaultTermsAndConditions: "1. Materials must strictly match specified grades. 2. Delivery within 7 business days.",
      defaultFooter: "Authorized Signatory • ESPACIO Procurement Division",
      templateName: "STANDARD_PURCHASE_ORDER",
    };

    if (raw) {
      try {
        return { ...defaults, ...JSON.parse(raw) };
      } catch {
        // fallback
      }
    }
    return defaults;
  }

  public static async updatePurchaseOrderSettings(input: Partial<PurchaseOrderSettingsData>, actorId?: string): Promise<PurchaseOrderSettingsData> {
    const existing = await this.getPurchaseOrderSettings();
    const updated: PurchaseOrderSettingsData = {
      ...existing,
      ...input,
      prefix: input.prefix ? input.prefix.toUpperCase() : existing.prefix,
    };

    await this.set("procurement.po_settings", JSON.stringify(updated), "PROCUREMENT", "Purchase Order Terms and Format Defaults", actorId);
    return updated;
  }

  // =========================================================================
  // 6. DOCUMENT SETTINGS
  // =========================================================================

  public static async getDocumentSettings(): Promise<DocumentSettingsData> {
    const raw = await this.get("document.settings", "");
    const defaults: DocumentSettingsData = {
      storageProvider: "LOCAL_DISK",
      allowedFileTypes: [
        "application/pdf",
        "image/jpeg",
        "image/png",
        "image/webp",
        "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
        "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
        "application/acad",
        "application/x-dwg",
      ],
      maxFileSizeMb: 50,
      defaultVisibility: "INTERNAL",
      autoVersionOnUpload: true,
      archiveRetentionDays: 365,
    };

    if (raw) {
      try {
        return { ...defaults, ...JSON.parse(raw) };
      } catch {
        // fallback
      }
    }
    return defaults;
  }

  public static async updateDocumentSettings(input: Partial<DocumentSettingsData>, actorId?: string): Promise<DocumentSettingsData> {
    const existing = await this.getDocumentSettings();

    if (input.maxFileSizeMb !== undefined && (input.maxFileSizeMb <= 0 || input.maxFileSizeMb > 500)) {
      throw new ValidationError("Maximum file size must be between 1 MB and 500 MB.");
    }

    const updated: DocumentSettingsData = {
      ...existing,
      ...input,
    };

    await this.set("document.settings", JSON.stringify(updated), "DOCUMENTS", "Central Document Repository & Storage Policy", actorId);
    return updated;
  }

  // =========================================================================
  // 7. SECURITY & ACCESS SETTINGS
  // =========================================================================

  public static async getSecuritySettings(): Promise<SecuritySettingsData> {
    const raw = await this.get("security.settings", "");
    const defaults: SecuritySettingsData = {
      sessionTimeoutMinutes: 480, // 8 hours
      passwordMinLength: 8,
      passwordRequireSpecialChar: true,
      passwordRequireNumber: true,
      maxFailedLoginAttempts: 5,
      lockoutDurationMinutes: 15,
      mfaRequiredForAdmins: false,
    };

    if (raw) {
      try {
        return { ...defaults, ...JSON.parse(raw) };
      } catch {
        // fallback
      }
    }
    return defaults;
  }

  public static async updateSecuritySettings(input: Partial<SecuritySettingsData>, actorId?: string): Promise<SecuritySettingsData> {
    const existing = await this.getSecuritySettings();

    if (input.passwordMinLength !== undefined && input.passwordMinLength < 6) {
      throw new ValidationError("Password minimum length cannot be less than 6 characters.");
    }
    if (input.maxFailedLoginAttempts !== undefined && input.maxFailedLoginAttempts < 3) {
      throw new ValidationError("Max failed login attempts must be at least 3.");
    }

    const updated: SecuritySettingsData = {
      ...existing,
      ...input,
    };

    await this.set("security.settings", JSON.stringify(updated), "SECURITY", "System Security, Session and Password Policy", actorId);
    return updated;
  }

  // =========================================================================
  // 8. USER MODULE VISIBILITY CONFIGURATION
  // =========================================================================

  public static async getUserModuleVisibility(userId: string): Promise<string[]> {
    const allModules = [
      "leads",
      "projects",
      "clients",
      "quotations",
      "finance",
      "procurement",
      "inventory",
      "employees",
      "tasks",
      "documents",
      "reports",
      "settings",
    ];

    const raw = await this.get(`user.visibility.${userId}`, "");
    if (!raw) return allModules;

    try {
      return JSON.parse(raw);
    } catch {
      return allModules;
    }
  }

  public static async updateUserModuleVisibility(userId: string, visibleModules: string[], actorId?: string): Promise<string[]> {
    const user = await db.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundError("User not found");
    }

    await this.set(
      `user.visibility.${userId}`,
      JSON.stringify(visibleModules),
      "USERS",
      `Module Visibility Filter for User ${user.email}`,
      actorId
    );

    await AuditService.logEvent({
      userId: actorId,
      action: "USER_MODULE_VISIBILITY_UPDATED",
      entityType: "User",
      entityId: userId,
      newValues: { visibleModules },
    });

    return visibleModules;
  }

  // =========================================================================
  // 9. SETTINGS CATALOG SEARCH
  // =========================================================================

  public static async searchSettings(query: string): Promise<Array<{ key: string; category: string; description: string; value: string }>> {
    const q = query.toLowerCase().trim();
    const all = await this.getAll();

    return all
      .filter((s) => s.key.toLowerCase().includes(q) || s.category.toLowerCase().includes(q) || (s.description && s.description.toLowerCase().includes(q)))
      .map((s) => ({
        key: s.key,
        category: s.category,
        description: s.description || "",
        value: s.value,
      }));
  }
}
