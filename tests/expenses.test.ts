import { describe, it, expect, beforeAll } from "vitest";
import { recordExpenseSchema } from "../src/validators/expense.schema";
import { IdGeneratorService } from "../src/lib/id-generator";
import { ProjectCostService } from "../src/modules/expenses/project-cost.service";
import { ExpenseService } from "../src/modules/expenses/expense.service";
import { db } from "../src/lib/db";
import { BusinessRuleError } from "../src/lib/errors";

describe("Expense Management & Project Cost Control Module Tests", () => {
  beforeAll(async () => {
    // Reset settings for test isolation
    await db.setting.upsert({
      where: { key: "ALLOW_SELF_APPROVAL" },
      update: { value: "false" },
      create: { key: "ALLOW_SELF_APPROVAL", value: "false", category: "FINANCE" },
    });
    await db.setting.upsert({
      where: { key: "AUTO_APPROVE_EXPENSES_BELOW" },
      update: { value: "50000" },
      create: { key: "AUTO_APPROVE_EXPENSES_BELOW", value: "50000", category: "FINANCE" },
    });
  });

  it("generates correct EXP-YYYY-XXXX reference format", async () => {
    const year = new Date().getFullYear();
    const ref = await IdGeneratorService.generate("EXP");
    expect(ref).toMatch(new RegExp(`^EXP-${year}-\\d{4}$`));
  });

  it("strictly requires projectId for PROJECT expenses and rejects negative amounts", () => {
    const validProjectExpense = recordExpenseSchema.safeParse({
      expenseType: "PROJECT",
      categoryKey: "MATERIAL",
      projectId: "test-proj-id",
      description: "Plywood purchase",
      amount: 150000,
      paymentMethod: "BANK_TRANSFER",
    });
    expect(validProjectExpense.success).toBe(true);

    const missingProjectId = recordExpenseSchema.safeParse({
      expenseType: "PROJECT",
      categoryKey: "MATERIAL",
      description: "Plywood purchase",
      amount: 150000,
      paymentMethod: "BANK_TRANSFER",
    });
    expect(missingProjectId.success).toBe(false);

    const negativeAmount = recordExpenseSchema.safeParse({
      expenseType: "BUSINESS",
      categoryKey: "RENT",
      description: "Office rent",
      amount: -5000,
      paymentMethod: "BANK_TRANSFER",
    });
    expect(negativeAmount.success).toBe(false);
  });

  it("verifies critical financial separation: business overhead expenses do not affect project cost sheets", async () => {
    const project = await db.project.findFirst({ where: { referenceNo: { startsWith: "PROJ" } } });

    if (project) {
      const initialCostSheet = await ProjectCostService.calculateProjectCost(project.id);

      // Record business overhead expense
      await ExpenseService.recordExpense({
        expenseType: "BUSINESS",
        categoryKey: "OFFICE_RENT",
        description: "Head office monthly rent",
        amount: 85000,
        paymentMethod: "BANK_TRANSFER",
      });

      const newCostSheet = await ProjectCostService.calculateProjectCost(project.id);
      expect(newCostSheet.totalCost).toBe(initialCostSheet.totalCost);
    }
  });

  it("records project expenses and verifies authoritative ProjectCostService outputs by category", async () => {
    const project = await db.project.findFirst({ where: { referenceNo: { startsWith: "PROJ" } } });

    if (project) {
      const initialCostSheet = await ProjectCostService.calculateProjectCost(project.id);
      const materialAmount = 40000; // Under auto-approval threshold 50,000

      const expense = await ExpenseService.recordExpense({
        expenseType: "PROJECT",
        categoryKey: "MATERIAL",
        projectId: project.id,
        description: "Test Veneer Panelling Purchase",
        amount: materialAmount,
        paymentMethod: "BANK_TRANSFER",
      });

      expect(expense.referenceNo).toMatch(/^EXP-\d{4}-\d{4}$/);
      expect(expense.status).toBe("APPROVED");

      const updatedCostSheet = await ProjectCostService.calculateProjectCost(project.id);
      expect(updatedCostSheet.totalCost).toBe(initialCostSheet.totalCost + materialAmount);
      expect(updatedCostSheet.categoryBreakdown.material).toBe(initialCostSheet.categoryBreakdown.material + materialAmount);
    }
  });

  it("enforces self-approval protection policy", async () => {
    const project = await db.project.findFirst({ where: { referenceNo: { startsWith: "PROJ" } } });
    const user = await db.user.findFirst();

    if (project && user) {
      // Record expense above threshold requiring manual approval
      const expense = await ExpenseService.recordExpense(
        {
          expenseType: "PROJECT",
          categoryKey: "SUBCONTRACTOR",
          projectId: project.id,
          description: "High value subcontracting test",
          amount: 250000, // Above auto-approval threshold
          paymentMethod: "BANK_TRANSFER",
        },
        user.id // Created by user
      );

      expect(expense.status).toBe("SUBMITTED");
      if (expense.status === "SUBMITTED") {
        // Attempt self-approval by same user
        await expect(ExpenseService.approveExpense(expense.id, undefined, user.id)).rejects.toThrow(BusinessRuleError);
      }
    }
  });

  it("executes controlled cancellation and category reclassification", async () => {
    const project = await db.project.findFirst({ where: { referenceNo: { startsWith: "PROJ" } } });

    if (project) {
      // 1. Record Expense
      const expense = await ExpenseService.recordExpense({
        expenseType: "PROJECT",
        categoryKey: "SITE_EXPENSE",
        projectId: project.id,
        description: "Initial mistyped site expense",
        amount: 12000,
        paymentMethod: "PETTY_CASH",
      });

      // 2. Reclassify
      const reclassified = await ExpenseService.reclassifyExpense(expense.id, {
        categoryKey: "MISCELLANEOUS",
        reclassificationReason: "Reclassifying to Misc",
      });
      expect(reclassified.categoryKey).toBe("MISCELLANEOUS");

      // 3. Cancel
      const cancelled = await ExpenseService.cancelExpense(expense.id, { cancellationReason: "Duplicate entry" });
      expect(cancelled.status).toBe("CANCELLED");

      const costSheet = await ProjectCostService.calculateProjectCost(project.id);
      expect(costSheet).toBeDefined();
    }
  });
});
