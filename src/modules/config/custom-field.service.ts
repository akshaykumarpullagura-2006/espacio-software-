import { db } from "@/lib/db";
import { NotFoundError } from "@/lib/errors";

export interface CustomFieldDefinitionInput {
  entityType: string;
  fieldName: string;
  fieldKey: string;
  fieldType: "TEXT" | "LONG_TEXT" | "NUMBER" | "CURRENCY" | "DATE" | "BOOLEAN" | "DROPDOWN";
  options?: string[];
  isRequired?: boolean;
}

export class CustomFieldService {
  public static async getCustomFields(entityType: string) {
    return db.customFieldDefinition.findMany({
      where: { entityType },
      orderBy: { displayOrder: "asc" },
    });
  }

  public static async saveCustomField(input: CustomFieldDefinitionInput) {
    const fieldKey = input.fieldKey.trim().toUpperCase().replace(/[^A-Z0-9]/g, "_");
    const count = await db.customFieldDefinition.count({ where: { entityType: input.entityType } });

    return db.customFieldDefinition.upsert({
      where: { entityType_fieldKey: { entityType: input.entityType, fieldKey } },
      update: {
        label: input.fieldName,
        fieldType: input.fieldType,
        options: input.options ? JSON.stringify(input.options) : null,
        isRequired: input.isRequired ?? false,
      },
      create: {
        entityType: input.entityType,
        label: input.fieldName,
        fieldKey,
        fieldType: input.fieldType,
        options: input.options ? JSON.stringify(input.options) : null,
        isRequired: input.isRequired ?? false,
        displayOrder: count + 1,
      },
    });
  }

  public static async setCustomFieldValues(entityId: string, values: Record<string, unknown>) {
    const entries = Object.entries(values);
    for (const [fieldKey, val] of entries) {
      const fieldDef = await db.customFieldDefinition.findFirst({ where: { fieldKey } });
      if (fieldDef) {
        await db.customFieldValue.upsert({
          where: {
            definitionId_entityId: {
              definitionId: fieldDef.id,
              entityId,
            },
          },
          update: { value: val !== undefined && val !== null ? String(val) : "" },
          create: {
            definitionId: fieldDef.id,
            entityId,
            value: val !== undefined && val !== null ? String(val) : "",
          },
        });
      }
    }
  }

  public static async getCustomFieldValues(entityId: string) {
    const records = await db.customFieldValue.findMany({
      where: { entityId },
      include: { definition: true },
    });

    const result: Record<string, { fieldName: string; fieldType: string; value: string | null }> = {};
    for (const r of records) {
      result[r.definition.fieldKey] = {
        fieldName: r.definition.label,
        fieldType: r.definition.fieldType,
        value: r.value,
      };
    }

    return result;
  }
}
