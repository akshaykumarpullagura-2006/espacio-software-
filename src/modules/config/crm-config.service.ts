import { db } from "@/lib/db";
import { CustomFieldService } from "./custom-field.service";

export class CrmConfigService {
  public static async getLeadSources() {
    return db.leadSourceConfig.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  public static async addLeadSource(name: string, key?: string) {
    const generatedKey = key || name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const count = await db.leadSourceConfig.count();

    return db.leadSourceConfig.upsert({
      where: { key: generatedKey },
      update: { name, isActive: true },
      create: {
        key: generatedKey,
        name,
        displayOrder: count + 1,
        isActive: true,
      },
    });
  }

  public static async getPropertyTypes() {
    return db.propertyTypeConfig.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  public static async addPropertyType(name: string, key?: string) {
    const generatedKey = key || name.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const count = await db.propertyTypeConfig.count();

    return db.propertyTypeConfig.upsert({
      where: { key: generatedKey },
      update: { name, isActive: true },
      create: {
        key: generatedKey,
        name,
        displayOrder: count + 1,
        isActive: true,
      },
    });
  }

  public static async getPipelineStages() {
    return [
      { key: "NEW", name: "New Lead", systemKey: "NEW", isSystem: true, displayOrder: 1, color: "slate" },
      { key: "NOT_CONTACTED", name: "Not Contacted", systemKey: "NOT_CONTACTED", isSystem: true, displayOrder: 2, color: "amber" },
      { key: "CONTACTED", name: "Contacted", systemKey: "CONTACTED", isSystem: true, displayOrder: 3, color: "blue" },
      { key: "FOLLOW_UP_SCHEDULED", name: "Follow-up Scheduled", systemKey: "FOLLOW_UP_SCHEDULED", isSystem: true, displayOrder: 4, color: "indigo" },
      { key: "SITE_VISIT_SCHEDULED", name: "Site Visit Scheduled", systemKey: "SITE_VISIT_SCHEDULED", isSystem: true, displayOrder: 5, color: "purple" },
      { key: "SITE_VISIT_COMPLETED", name: "Site Visit Completed", systemKey: "SITE_VISIT_COMPLETED", isSystem: true, displayOrder: 6, color: "cyan" },
      { key: "QUOTATION_IN_PROGRESS", name: "Quotation in Progress", systemKey: "QUOTATION_IN_PROGRESS", isSystem: true, displayOrder: 7, color: "teal" },
      { key: "QUOTATION_SENT", name: "Quotation Sent", systemKey: "QUOTATION_SENT", isSystem: true, displayOrder: 8, color: "emerald" },
      { key: "NEGOTIATION", name: "Negotiation", systemKey: "NEGOTIATION", isSystem: true, displayOrder: 9, color: "orange" },
      { key: "WON", name: "Won", systemKey: "WON", isSystem: true, displayOrder: 10, color: "green" },
      { key: "PROJECT_CREATED", name: "Project Created", systemKey: "PROJECT_CREATED", isSystem: true, displayOrder: 11, color: "emerald" },
      { key: "LOST", name: "Lost", systemKey: "LOST", isSystem: true, displayOrder: 12, color: "rose" },
    ];
  }

  public static async getActiveUsers() {
    return db.user.findMany({
      where: { status: "ACTIVE" },
      select: { id: true, fullName: true, email: true, phone: true },
      orderBy: { fullName: "asc" },
    });
  }

  public static async getCrmConfig() {
    const [leadSources, propertyTypes, pipelineStages, users, customFields] = await Promise.all([
      this.getLeadSources(),
      this.getPropertyTypes(),
      this.getPipelineStages(),
      this.getActiveUsers(),
      CustomFieldService.getCustomFields("Lead"),
    ]);

    return {
      leadSources,
      propertyTypes,
      pipelineStages,
      users,
      customFields,
    };
  }
}
