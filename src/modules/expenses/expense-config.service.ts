import { db } from "@/lib/db";

export class ExpenseConfigService {
  public static async getExpenseCategories(type?: string) {
    const where: Record<string, unknown> = { isActive: true };
    if (type) {
      where.OR = [{ type }, { type: "BOTH" }];
    }
    return db.expenseCategoryConfig.findMany({
      where,
      orderBy: { displayOrder: "asc" },
    });
  }
}
