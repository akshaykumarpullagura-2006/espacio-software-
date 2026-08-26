import { db } from "@/lib/db";
import { ValidationError, ForbiddenError } from "@/lib/errors";
import { AuditService } from "../audit/audit.service";
import { SettingsService } from "./settings.service";

export interface CompanyProfileData {
  companyName: string;
  legalName: string;
  displayName: string;
  tagline: string;
  phone: string;
  whatsApp?: string;
  email: string;
  website: string;
  addressLine: string;
  city: string;
  state: string;
  country: string;
  postalCode: string;
  gstin: string;
  pan: string;
  logoUrl?: string;
  openingTime: string;
  closingTime: string;
  workingDays: string[];
}

export interface BrandingConfigData {
  primaryColor: string;
  secondaryColor: string;
  accentColor: string;
  backgroundColor: string;
  logoUrl: string;
  faviconUrl?: string;
  themeName: string;
}

export class CompanyService {
  /**
   * Get the unified Company Profile
   */
  public static async getCompanyProfile(): Promise<CompanyProfileData> {
    const raw = await SettingsService.get("company.profile", "");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Fallback to default below
      }
    }

    const defaultProfile: CompanyProfileData = {
      companyName: "ESPACIO INTERIORS",
      legalName: "ESPACIO INTERIOR SOLUTIONS PVT LTD",
      displayName: "ESPACIO ERP",
      tagline: "Turnkey Interior Solutions & Architecture",
      phone: "+91 98765 43210",
      whatsApp: "+91 98765 43210",
      email: "contact@espacio.com",
      website: "https://espacio.com",
      addressLine: "100 Feet Road, Indiranagar",
      city: "Bengaluru",
      state: "Karnataka",
      country: "India",
      postalCode: "560038",
      gstin: "29ABCDE1234F1ZH",
      pan: "ABCDE1234F",
      logoUrl: "/brand/espacio-logo.svg",
      openingTime: "09:00",
      closingTime: "19:00",
      workingDays: ["MON", "TUE", "WED", "THU", "FRI", "SAT"],
    };

    return defaultProfile;
  }

  /**
   * Update the unified Company Profile
   */
  public static async updateCompanyProfile(input: Partial<CompanyProfileData>, actorId?: string): Promise<CompanyProfileData> {
    const existing = await this.getCompanyProfile();

    if (input.email !== undefined && !input.email.includes("@")) {
      throw new ValidationError("Invalid email address format");
    }

    if (input.gstin !== undefined && input.gstin.trim() !== "") {
      const gstinClean = input.gstin.trim().toUpperCase();
      if (gstinClean.length !== 15) {
        throw new ValidationError("Invalid GSTIN format (must be 15 alphanumeric characters)");
      }
      input.gstin = gstinClean;
    }

    if (input.pan !== undefined && input.pan.trim() !== "") {
      const panClean = input.pan.trim().toUpperCase();
      if (panClean.length !== 10) {
        throw new ValidationError("Invalid PAN format (must be 10 characters)");
      }
      input.pan = panClean;
    }

    const updated: CompanyProfileData = {
      ...existing,
      ...input,
      workingDays: input.workingDays || existing.workingDays,
    };

    await SettingsService.set(
      "company.profile",
      JSON.stringify(updated),
      "COMPANY",
      "Unified Company Profile & Legal Details",
      actorId
    );

    // Also sync standard individual keys for backward compatibility
    if (updated.companyName) await SettingsService.set("company.name", updated.companyName, "COMPANY", undefined, actorId);
    if (updated.gstin) await SettingsService.set("company.gstin", updated.gstin, "COMPANY", undefined, actorId);
    if (updated.logoUrl) await SettingsService.set("company.logoUrl", updated.logoUrl, "COMPANY", undefined, actorId);

    await AuditService.logEvent({
      userId: actorId,
      action: "COMPANY_SETTINGS_UPDATED",
      entityType: "CompanyProfile",
      entityId: "company.profile",
      oldValues: { companyName: existing.companyName, gstin: existing.gstin, email: existing.email },
      newValues: { companyName: updated.companyName, gstin: updated.gstin, email: updated.email },
    });

    return updated;
  }

  /**
   * Get Branding Configuration
   */
  public static async getBrandingConfig(): Promise<BrandingConfigData> {
    const raw = await SettingsService.get("branding.config", "");
    if (raw) {
      try {
        return JSON.parse(raw);
      } catch {
        // Fallback to default
      }
    }

    return {
      primaryColor: "#10B981", // ESPACIO Emerald Green
      secondaryColor: "#0F172A", // Dark Slate
      accentColor: "#3B82F6", // Blue
      backgroundColor: "#F8FAFC", // Light Gray Surface
      logoUrl: "/brand/espacio-logo.svg",
      faviconUrl: "/favicon.ico",
      themeName: "ESPACIO Neutral Default",
    };
  }

  /**
   * Update Branding Configuration (with safe color validation)
   */
  public static async updateBrandingConfig(input: Partial<BrandingConfigData>, actorId?: string): Promise<BrandingConfigData> {
    const existing = await this.getBrandingConfig();

    const hexColorRegex = /^#([0-9A-F]{3}){1,2}$/i;
    if (input.primaryColor && !hexColorRegex.test(input.primaryColor)) {
      throw new ValidationError("Invalid primary color format. Must be a valid hex code (e.g. #10B981)");
    }
    if (input.secondaryColor && !hexColorRegex.test(input.secondaryColor)) {
      throw new ValidationError("Invalid secondary color format. Must be a valid hex code (e.g. #0F172A)");
    }
    if (input.accentColor && !hexColorRegex.test(input.accentColor)) {
      throw new ValidationError("Invalid accent color format. Must be a valid hex code (e.g. #3B82F6)");
    }

    const updated: BrandingConfigData = {
      ...existing,
      ...input,
    };

    await SettingsService.set(
      "branding.config",
      JSON.stringify(updated),
      "BRANDING",
      "Company Branding and Design System Token Configuration",
      actorId
    );

    // Sync logo to company profile if updated
    if (input.logoUrl) {
      await this.updateCompanyProfile({ logoUrl: input.logoUrl }, actorId);
    }

    await AuditService.logEvent({
      userId: actorId,
      action: "BRANDING_SETTINGS_UPDATED",
      entityType: "BrandingConfig",
      entityId: "branding.config",
      oldValues: { primaryColor: existing.primaryColor, logoUrl: existing.logoUrl },
      newValues: { primaryColor: updated.primaryColor, logoUrl: updated.logoUrl },
    });

    return updated;
  }
}
