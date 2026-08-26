import { db } from "@/lib/db";

export class PettyCashConfigService {
  public static async getPettyCashCategories() {
    return db.expenseCategoryConfig.findMany({
      where: { isActive: true },
      orderBy: { displayOrder: "asc" },
    });
  }
}
