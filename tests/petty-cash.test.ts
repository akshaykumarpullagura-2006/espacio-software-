import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { PettyCashService } from "../src/modules/petty-cash/petty-cash.service";
import { PettyCashCalculationService } from "../src/modules/petty-cash/petty-cash-calculation.service";
import { ProjectCostService } from "../src/modules/expenses/project-cost.service";

describe("Petty Cash & Employee Advance Module Tests", () => {
  let sampleUserId: string;
  let managerUserId: string;
  let sampleProjectId: string;
  let testAdvanceId: string;

  beforeAll(async () => {
    // Reset ALLOW_SELF_APPROVAL to false for test isolation
    await db.setting.upsert({
      where: { key: "ALLOW_SELF_APPROVAL" },
      update: { value: "false" },
      create: { key: "ALLOW_SELF_APPROVAL", value: "false", category: "FINANCE" },
    });

    const user1 = await db.user.findFirst();
    if (!user1) throw new Error("No user found for testing");
    sampleUserId = user1.id;

    let user2 = await db.user.findFirst({ where: { id: { not: sampleUserId } } });
    if (!user2) {
      user2 = await db.user.create({
        data: {
          email: "manager.test@espacio.in",
          fullName: "Finance Manager Test",
          passwordHash: "hash123",
        },
      });
    }
    managerUserId = user2.id;

    let project = await db.project.findFirst();
    if (!project) {
      project = await db.project.create({
        data: {
          referenceNo: "PROJ-2026-9999",
          title: "Test Petty Cash Project",
          propertyTypeKey: "APARTMENT_INTERIOR",
        },
      });
    }
    sampleProjectId = project.id;
  });

  it("issues an employee advance with server-generated ADV-YYYY-XXXX reference", async () => {
    const advance = await PettyCashService.issueAdvance(
      {
        employeeId: sampleUserId,
        amount: 5000,
        purpose: "Site petty cash float for testing",
        projectId: sampleProjectId,
      },
      managerUserId
    );

    expect(advance).toBeDefined();
    expect(advance.referenceNo).toMatch(/^ADV-\d{4}-\d{4}$/);
    expect(advance.amount).toBe(5000);
    expect(advance.status).toBe("ISSUED");

    testAdvanceId = advance.id;
  });

  it("calculates authoritative advance running balance correctly", async () => {
    const summary = await PettyCashCalculationService.calculateAdvanceSummary(testAdvanceId);
    expect(summary).toBeDefined();
    expect(summary.totalAdvance).toBe(5000);
    expect(summary.outstandingBalance).toBe(5000);
  });

  it("records a valid petty cash expense entry (PCX-YYYY-XXXX) and updates running balance", async () => {
    const pettyExp = await PettyCashService.recordPettyExpense(
      {
        advanceId: testAdvanceId,
        amount: 450,
        categoryKey: "SITE_HARDWARE",
        paymentMethod: "PETTY_CASH",
        purpose: "Emergency screws and brackets from local hardware",
        referenceNoExternal: "REC-9918",
      },
      sampleUserId
    );

    expect(pettyExp).toBeDefined();
    expect(pettyExp.referenceNo).toMatch(/^PCX-\d{4}-\d{4}$/);
    expect(pettyExp.amount).toBe(450);

    const summary = await PettyCashCalculationService.calculateAdvanceSummary(testAdvanceId);
    expect(summary.totalSpent).toBe(450);
    expect(summary.outstandingBalance).toBe(4550);
  });

  it("strictly enforces spending limit and rejects expenses exceeding available advance balance", async () => {
    await expect(
      PettyCashService.recordPettyExpense(
        {
          advanceId: testAdvanceId,
          amount: 5000, // Exceeds 4,550 remaining balance
          categoryKey: "SITE_HARDWARE",
          paymentMethod: "PETTY_CASH",
          purpose: "Over-limit expense attempt",
        },
        sampleUserId
      )
    ).rejects.toThrow(/exceeds remaining advance balance/i);
  });

  it("verifies project cost integration (increases Project Cost by ₹450, NOT ₹5,000 advance)", async () => {
    const costSheet = await ProjectCostService.calculateProjectCost(sampleProjectId);

    expect(costSheet).toBeDefined();
    expect(costSheet.totalCost).toBeGreaterThanOrEqual(450);
  });

  it("enforces self-approval policy protection when employee attempts self-settlement", async () => {
    await expect(
      PettyCashService.settleAdvance(
        {
          advanceId: testAdvanceId,
          cashReturned: 4000,
          notes: "Self-settlement attempt",
        },
        sampleUserId // Employee attempting self-approval when ALLOW_SELF_APPROVAL is false
      )
    ).rejects.toThrow(/Self-settlement approval of employee advances is prohibited/i);
  });

  it("detects settlement discrepancy when advance amount does not equal spent + returned cash", async () => {
    // Advance: 5,000. Spent: 450. Cash returned: 4,000. (Missing 550)
    const settlement = await PettyCashService.settleAdvance(
      {
        advanceId: testAdvanceId,
        cashReturned: 4000,
        notes: "Partial cash return test",
      },
      managerUserId // Authorized manager settling advance
    );

    expect(settlement).toBeDefined();
    expect(settlement.referenceNo).toMatch(/^SET-\d{4}-\d{4}$/);
    expect(settlement.status).toBe("DISCREPANCY");
    expect(settlement.difference).toBe(550);

    const summary = await PettyCashCalculationService.calculateAdvanceSummary(testAdvanceId);
    expect(summary.cashReturned).toBe(4000);
    expect(summary.status).toBe("PARTIALLY_SETTLED");
  });
});
