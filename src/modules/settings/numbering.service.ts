import { db } from "@/lib/db";
import { ValidationError } from "@/lib/errors";
import { SettingsService } from "./settings.service";
import { AuditService } from "../audit/audit.service";
import { IdGeneratorService, EntityPrefix } from "@/lib/id-generator";

export interface EntityNumberingConfig {
  prefix: string;
  format: string; // e.g. "{PREFIX}-{YEAR}-{SEQ}"
  padding: number; // e.g. 3 or 4 digits
  sample: string;
  description: string;
}

export interface NumberingSettingsMap {
  lead: EntityNumberingConfig;
  client: EntityNumberingConfig;
  quotation: EntityNumberingConfig;
  project: EntityNumberingConfig;
  task: EntityNumberingConfig;
  vendor: EntityNumberingConfig;
  purchaseRequest: EntityNumberingConfig;
  purchaseOrder: EntityNumberingConfig;
  goodsReceipt: EntityNumberingConfig;
  invoice: EntityNumberingConfig;
  payment: EntityNumberingConfig;
  expense: EntityNumberingConfig;
  document: EntityNumberingConfig;
  employee: EntityNumberingConfig;
  salary: EntityNumberingConfig;
}

export class NumberingService {
  /**
   * Get centralized numbering configuration for all ERP entities
   */
  public static async getNumberingSettings(): Promise<NumberingSettingsMap> {
    const raw = await SettingsService.get("numbering.config", "");
    const year = new Date().getFullYear();

    const defaults: NumberingSettingsMap = {
      lead: { prefix: "LEAD", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `LEAD-${year}-0001`, description: "Lead Reference Numbers" },
      client: { prefix: "CLI", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `CLI-${year}-0001`, description: "Client Account Numbers" },
      quotation: { prefix: "Q", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `Q-${year}-0001`, description: "Quotation Reference Numbers" },
      project: { prefix: "PROJ", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `PROJ-${year}-0001`, description: "Project Execution Codes" },
      task: { prefix: "TSK", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `TSK-${year}-0001`, description: "Operational Task Identifiers" },
      vendor: { prefix: "VEN", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `VEN-${year}-0001`, description: "Vendor Directory Codes" },
      purchaseRequest: { prefix: "MR", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `MR-${year}-0001`, description: "Material Requisition Numbers" },
      purchaseOrder: { prefix: "PO", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `PO-${year}-0001`, description: "Purchase Order Reference Numbers" },
      goodsReceipt: { prefix: "GRN", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `GRN-${year}-0001`, description: "Goods Receipt Note Numbers" },
      invoice: { prefix: "INV", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `INV-${year}-0001`, description: "Tax / GST Invoice Numbers" },
      payment: { prefix: "PAY", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `PAY-${year}-0001`, description: "Payment Receipt Numbers" },
      expense: { prefix: "EXP", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `EXP-${year}-0001`, description: "Expense Voucher Numbers" },
      document: { prefix: "DOC", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `DOC-${year}-0001`, description: "Document Reference IDs" },
      employee: { prefix: "EMP", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `EMP-${year}-0001`, description: "Employee ID Codes" },
      salary: { prefix: "SAL", format: "{PREFIX}-{YEAR}-{SEQ}", padding: 4, sample: `SAL-${year}-0001`, description: "Salary Disbursement Vouchers" },
    };

    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        return { ...defaults, ...parsed };
      } catch {
        // fallback
      }
    }

    return defaults;
  }

  /**
   * Update entity numbering configuration
   */
  public static async updateNumberingSettings(
    input: Partial<Record<keyof NumberingSettingsMap, { prefix?: string; padding?: number }>>,
    actorId?: string
  ): Promise<NumberingSettingsMap> {
    const existing = await this.getNumberingSettings();
    const year = new Date().getFullYear();
    const updated: NumberingSettingsMap = { ...existing };

    for (const key of Object.keys(input) as Array<keyof NumberingSettingsMap>) {
      const updateData = input[key];
      if (!updateData) continue;

      const current = existing[key];
      const prefix = (updateData.prefix || current.prefix).trim().toUpperCase();
      const padding = updateData.padding || current.padding;

      // Validation
      if (!/^[A-Z0-9]{1,6}$/.test(prefix)) {
        throw new ValidationError(`Invalid prefix "${prefix}" for ${key}. Must be 1-6 alphanumeric uppercase characters.`);
      }
      if (padding < 3 || padding > 6) {
        throw new ValidationError(`Padding for ${key} must be between 3 and 6 digits.`);
      }

      updated[key] = {
        ...current,
        prefix,
        padding,
        sample: `${prefix}-${year}-${"1".padStart(padding, "0")}`,
      };
    }

    await SettingsService.set(
      "numbering.config",
      JSON.stringify(updated),
      "NUMBERING",
      "Centralized Entity Sequence and Numbering Format Configuration",
      actorId
    );

    await AuditService.logEvent({
      userId: actorId,
      action: "NUMBERING_SETTINGS_UPDATED",
      entityType: "NumberingConfig",
      entityId: "numbering.config",
      newValues: updated as any,
    });

    return updated;
  }
}
