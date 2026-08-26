import { db } from "@/lib/db";

export class InventoryConfigService {
  public static async getCategories() {
    return db.materialCategoryConfig.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
      include: { subcategories: { where: { isActive: true }, orderBy: { displayOrder: "asc" } } },
    });
  }

  public static async getSubcategories(categoryKey?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (categoryKey) {
      const cat = await db.materialCategoryConfig.findUnique({ where: { key: categoryKey } });
      if (cat) where.categoryId = cat.id;
    }
    return db.materialSubcategoryConfig.findMany({
      where,
      orderBy: { displayOrder: "asc" },
    });
  }

  public static async getBrands() {
    return db.brandConfig.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  public static async getUnits() {
    return db.unitConfig.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }

  public static async getUnitConversions() {
    return db.unitConversionConfig.findMany({
      include: { material: { select: { materialCode: true, name: true } } },
    });
  }
}
