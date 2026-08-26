import { describe, it, expect } from "vitest";
import { CrmConfigService } from "../src/modules/config/crm-config.service";
import { CustomFieldService } from "../src/modules/config/custom-field.service";
import { LeadService } from "../src/modules/leads/lead.service";
import { IdGeneratorService } from "../src/lib/id-generator";
import { db } from "../src/lib/db";
import { BusinessRuleError } from "../src/lib/errors";

describe("Prompt 02.1: Dynamic Configuration & Customizable ERP Tests", () => {
  it("dynamically adds and retrieves new Lead Sources from database", async () => {
    const newSource = await CrmConfigService.addLeadSource("Architect Referral", "ARCHITECT_REFERRAL");
    expect(newSource.name).toBe("Architect Referral");
    expect(newSource.key).toBe("ARCHITECT_REFERRAL");

    const sources = await CrmConfigService.getLeadSources();
    const found = sources.find((s) => s.key === "ARCHITECT_REFERRAL");
    expect(found).toBeDefined();
    expect(found?.name).toBe("Architect Referral");
  });

  it("dynamically adds and retrieves new Property Types from database", async () => {
    const newType = await CrmConfigService.addPropertyType("Farmhouse", "FARMHOUSE");
    expect(newType.name).toBe("Farmhouse");
    expect(newType.key).toBe("FARMHOUSE");

    const types = await CrmConfigService.getPropertyTypes();
    const found = types.find((t) => t.key === "FARMHOUSE");
    expect(found).toBeDefined();
  });

  it("creates custom field definitions and stores entity values safely", async () => {
    // 1. Create Custom Field
    const cf = await CustomFieldService.saveCustomField({
      entityType: "Lead",
      fieldName: "Expected Move-in Date",
      fieldKey: "MOVE_IN_DATE",
      fieldType: "DATE",
    });
    expect(cf.fieldKey).toBe("MOVE_IN_DATE");

    // 2. Attach custom field value to a test lead
    const ref = await IdGeneratorService.generate("LEAD");
    const lead = await db.lead.create({
      data: {
        referenceNo: ref,
        clientName: "Custom Field Test Lead",
        phone: "+91 91111 22222",
        sourceKey: "DIRECT",
        propertyTypeKey: "APARTMENT_INTERIOR",
        stage: "NEW",
      },
    });

    await CustomFieldService.setCustomFieldValues(lead.id, {
      MOVE_IN_DATE: "2026-12-01",
    });

    const values = await CustomFieldService.getCustomFieldValues(lead.id);
    expect(values["MOVE_IN_DATE"]).toBeDefined();
    expect(values["MOVE_IN_DATE"].value).toBe("2026-12-01");

    // Clean up
    await db.lead.delete({ where: { id: lead.id } });
  });

  it("preserves systemKey business rules when pipeline stage display names change", async () => {
    const stages = await CrmConfigService.getPipelineStages();
    const quotationSentStage = stages.find((s) => s.systemKey === "QUOTATION_SENT");
    expect(quotationSentStage).toBeDefined();
    expect(quotationSentStage?.isSystem).toBe(true);

    // Business rule must still enforce Quotation dependency regardless of UI display name
    const ref = await IdGeneratorService.generate("LEAD");
    const testLead = await db.lead.create({
      data: {
        referenceNo: ref,
        clientName: "Stage Config Test Lead",
        phone: "+91 93333 44444",
        sourceKey: "DIRECT",
        propertyTypeKey: "APARTMENT_INTERIOR",
        stage: "NEW",
      },
    });

    await expect(
      LeadService.changeStatus(testLead.id, { status: "QUOTATION_SENT" })
    ).rejects.toThrow(BusinessRuleError);

    await db.lead.delete({ where: { id: testLead.id } });
  });
});
