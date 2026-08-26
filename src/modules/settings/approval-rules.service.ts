import { db } from "@/lib/db";
import { ValidationError, ForbiddenError } from "@/lib/errors";
import { SettingsService } from "./settings.service";
import { AuditService } from "../audit/audit.service";
import { RbacService } from "../rbac/rbac.service";

export interface ApprovalRuleThreshold {
  module: "EXPENSE" | "PURCHASE_REQUEST" | "PURCHASE_ORDER" | "INVOICE";
  maxAdminAmount: number; // Values <= maxAdminAmount can be approved by ADMIN. Values > require SUPER_ADMIN.
  requireDualApproval: boolean;
  preventSelfApproval: boolean;
}

export interface ApprovalSettingsData {
  expense: ApprovalRuleThreshold;
  purchaseRequest: ApprovalRuleThreshold;
  purchaseOrder: ApprovalRuleThreshold;
  invoice: ApprovalRuleThreshold;
}

export class ApprovalRulesService {
  /**
   * Get all centralized approval thresholds and rules
   */
  public static async getApprovalSettings(): Promise<ApprovalSettingsData> {
    const raw = await SettingsService.get("approvals.rules", "");

    const defaultSettings: ApprovalSettingsData = {
      expense: {
        module: "EXPENSE",
        maxAdminAmount: 10000, // <= 10,000 INR -> Admin; > 10,000 INR -> Super Admin
        requireDualApproval: false,
        preventSelfApproval: true,
      },
      purchaseRequest: {
        module: "PURCHASE_REQUEST",
        maxAdminAmount: 25000,
        requireDualApproval: false,
        preventSelfApproval: true,
      },
      purchaseOrder: {
        module: "PURCHASE_ORDER",
        maxAdminAmount: 50000,
        requireDualApproval: false,
        preventSelfApproval: true,
      },
      invoice: {
        module: "INVOICE",
        maxAdminAmount: 500000,
        requireDualApproval: false,
        preventSelfApproval: false,
      },
    };

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return {
          expense: { ...defaultSettings.expense, ...parsed.expense },
          purchaseRequest: { ...defaultSettings.purchaseRequest, ...parsed.purchaseRequest },
          purchaseOrder: { ...defaultSettings.purchaseOrder, ...parsed.purchaseOrder },
          invoice: { ...defaultSettings.invoice, ...parsed.invoice },
        };
      } catch {
        // fallback
      }
    }

    return defaultSettings;
  }

  /**
   * Update approval thresholds and rules
   */
  public static async updateApprovalSettings(input: Partial<ApprovalSettingsData>, actorId?: string): Promise<ApprovalSettingsData> {
    const existing = await this.getApprovalSettings();

    const updated: ApprovalSettingsData = {
      expense: { ...existing.expense, ...(input.expense || {}) },
      purchaseRequest: { ...existing.purchaseRequest, ...(input.purchaseRequest || {}) },
      purchaseOrder: { ...existing.purchaseOrder, ...(input.purchaseOrder || {}) },
      invoice: { ...existing.invoice, ...(input.invoice || {}) },
    };

    // Validation
    for (const key of Object.keys(updated) as Array<keyof ApprovalSettingsData>) {
      if (updated[key].maxAdminAmount < 0) {
        throw new ValidationError(`Threshold amount for ${key} cannot be negative`);
      }
    }

    await SettingsService.set(
      "approvals.rules",
      JSON.stringify(updated),
      "APPROVALS",
      "Financial Approval Thresholds and Segregation of Duties Rules",
      actorId
    );

    await AuditService.logEvent({
      userId: actorId,
      action: "APPROVAL_RULES_UPDATED",
      entityType: "ApprovalRules",
      entityId: "approvals.rules",
      newValues: updated as any,
    });

    return updated;
  }

  /**
   * Check if a specific user is authorized to approve an entity based on amount and segregation of duties
   */
  public static async canApprove(params: {
    module: "EXPENSE" | "PURCHASE_REQUEST" | "PURCHASE_ORDER" | "INVOICE";
    amount: number;
    creatorId?: string | null;
    approverId: string;
  }): Promise<{ allowed: boolean; reason?: string }> {
    const isSuperAdmin = await RbacService.isUserSuperAdmin(params.approverId);
    if (isSuperAdmin) {
      return { allowed: true };
    }

    const settings = await this.getApprovalSettings();
    let rule: ApprovalRuleThreshold;
    switch (params.module) {
      case "EXPENSE":
        rule = settings.expense;
        break;
      case "PURCHASE_REQUEST":
        rule = settings.purchaseRequest;
        break;
      case "PURCHASE_ORDER":
        rule = settings.purchaseOrder;
        break;
      case "INVOICE":
        rule = settings.invoice;
        break;
    }

    // Check Segregation of duties / self-approval
    if (rule.preventSelfApproval && params.creatorId && params.creatorId === params.approverId) {
      return {
        allowed: false,
        reason: "Segregation of duties rule: Creator cannot approve their own financial record.",
      };
    }

    // Check threshold amount
    if (params.amount > rule.maxAdminAmount) {
      return {
        allowed: false,
        reason: `Amount (₹${params.amount.toLocaleString("en-IN")}) exceeds Admin threshold limit (₹${rule.maxAdminAmount.toLocaleString("en-IN")}). Requires Super Admin approval.`,
      };
    }

    return { allowed: true };
  }
}
