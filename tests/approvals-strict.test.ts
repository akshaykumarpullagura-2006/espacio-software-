import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { db } from "@/lib/db";
import { ExpenseService } from "@/modules/expenses/expense.service";
import { PaymentService } from "@/modules/payments/payment.service";
import { ApprovalsService } from "@/modules/approvals/approvals.service";
import { hashPassword } from "@/lib/auth";

describe("Strict Financial Approvals Workflow Tests (USER vs ADMIN)", () => {
  const timestamp = Date.now();
  let adminUser: any;
  let normalUser: any;
  let testProject: any;
  let testClient: any;

  beforeAll(async () => {
    // 1. Create Admin & User
    adminUser = await db.user.create({
      data: {
        email: `approvals_admin_${timestamp}@espacio.com`,
        fullName: "Approvals Admin",
        passwordHash: await hashPassword("Password123!"),
        accessLevel: "ADMIN",
        status: "ACTIVE",
      },
    });

    normalUser = await db.user.create({
      data: {
        email: `approvals_user_${timestamp}@espacio.com`,
        fullName: "Approvals User",
        passwordHash: await hashPassword("Password123!"),
        accessLevel: "USER",
        status: "ACTIVE",
      },
    });

    // 2. Create Test Client & Project
    testClient = await db.client.create({
      data: {
        referenceNo: `CLI-TEST-${timestamp}`,
        fullName: "Approvals Test Client",
        phone: "9876543210",
        email: `client_${timestamp}@test.com`,
      },
    });

    testProject = await db.project.create({
      data: {
        referenceNo: `PRJ-TEST-${timestamp}`,
        title: "Approvals Test Interior Project",
        client: { connect: { id: testClient.id } },
        stage: "INITIATION",
        propertyTypeKey: "3BHK",
        contractValue: 500000,
      },
    });
  });

  afterAll(async () => {
    // Cleanup
    if (testProject?.id) {
      await db.expense.deleteMany({ where: { projectId: testProject.id } }).catch(() => {});
      await db.clientPayment.deleteMany({ where: { projectId: testProject.id } }).catch(() => {});
      await db.activityLog.deleteMany({ where: { entityId: testProject.id } }).catch(() => {});
      await db.project.delete({ where: { id: testProject.id } }).catch(() => {});
    }
    if (testClient?.id) {
      await db.client.delete({ where: { id: testClient.id } }).catch(() => {});
    }
    if (adminUser?.id) {
      await db.auditLog.deleteMany({ where: { userId: adminUser.id } }).catch(() => {});
      await db.notification.deleteMany({ where: { userId: adminUser.id } }).catch(() => {});
      await db.user.delete({ where: { id: adminUser.id } }).catch(() => {});
    }
    if (normalUser?.id) {
      await db.auditLog.deleteMany({ where: { userId: normalUser.id } }).catch(() => {});
      await db.notification.deleteMany({ where: { userId: normalUser.id } }).catch(() => {});
      await db.user.delete({ where: { id: normalUser.id } }).catch(() => {});
    }
  });

  describe("Expense Approval Lifecycle", () => {
    let createdExpense: any;

    it("normal USER submitting an expense creates it with status SUBMITTED (pending Admin review)", async () => {
      createdExpense = await ExpenseService.recordExpense(
        {
          expenseType: "PROJECT",
          categoryKey: "MATERIALS",
          projectId: testProject.id,
          amount: 25000,
          description: "Granite slabs purchase for kitchen counter",
          paymentMethod: "BANK_TRANSFER",
        },
        normalUser.id
      );

      expect(createdExpense).toBeDefined();
      expect(createdExpense.status).toBe("SUBMITTED");
      expect(createdExpense.createdById).toBe(normalUser.id);
    });

    it("normal USER cannot approve their own or any expense (throws ForbiddenError)", async () => {
      await expect(
        ExpenseService.approveExpense(createdExpense.id, undefined, normalUser.id)
      ).rejects.toThrow(/requires ADMIN access level/i);
    });

    it("ADMIN can approve the expense, generating status APPROVED, audit log, and notification", async () => {
      const approved = await ExpenseService.approveExpense(
        createdExpense.id,
        { notes: "Verified vendor tax invoice" },
        adminUser.id
      );

      expect(approved.status).toBe("APPROVED");
      expect(approved.approvedById).toBe(adminUser.id);

      // Verify audit log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: createdExpense.id,
          action: "ADMIN_APPROVED_EXPENSE",
        },
      });
      expect(audit).toBeDefined();

      // Verify notification sent to user
      const notification = await db.notification.findFirst({
        where: {
          userId: normalUser.id,
          type: "EXPENSE_APPROVED",
        },
      });
      expect(notification).toBeDefined();
    });
  });

  describe("Payment Confirmation Lifecycle", () => {
    let createdPayment: any;

    it("normal USER recording a client payment sets status to RECORDED (pending Admin confirmation)", async () => {
      createdPayment = await PaymentService.recordPayment(
        {
          projectId: testProject.id,
          clientId: testClient.id,
          amount: 50000,
          paymentMethod: "NEFT",
          notes: "Initial project kickoff advance payment",
        },
        normalUser.id
      );

      expect(createdPayment).toBeDefined();
      expect(createdPayment.status).toBe("RECORDED");
      expect(createdPayment.receivedById).toBe(normalUser.id);
    });

    it("normal USER cannot confirm/verify the payment (throws ForbiddenError)", async () => {
      await expect(
        PaymentService.verifyPayment(createdPayment.id, undefined, normalUser.id)
      ).rejects.toThrow(/requires ADMIN access level/i);
    });

    it("ADMIN can confirm/verify the payment, setting status to VERIFIED with audit and notification", async () => {
      const verified = await PaymentService.verifyPayment(
        createdPayment.id,
        { notes: "Bank credit confirmed on statement" },
        adminUser.id
      );

      expect(verified.status).toBe("VERIFIED");
      expect(verified.verifiedById).toBe(adminUser.id);

      // Verify audit log
      const audit = await db.auditLog.findFirst({
        where: {
          entityId: createdPayment.id,
          action: "ADMIN_ACCEPTED_PAYMENT",
        },
      });
      expect(audit).toBeDefined();

      // Verify notification sent to user
      const notification = await db.notification.findFirst({
        where: {
          userId: normalUser.id,
          type: "PAYMENT_CONFIRMED",
        },
      });
      expect(notification).toBeDefined();
    });
  });

  describe("Pending Approvals Aggregation Service", () => {
    it("returns active pending items accurately", async () => {
      // Create one pending expense
      const pendingExp = await ExpenseService.recordExpense(
        {
          expenseType: "PROJECT",
          categoryKey: "LABOR",
          projectId: testProject.id,
          amount: 15000,
          description: "Carpenter advance payment",
          paymentMethod: "PETTY_CASH",
        },
        normalUser.id
      );

      // Create one pending payment
      const pendingPay = await PaymentService.recordPayment(
        {
          projectId: testProject.id,
          clientId: testClient.id,
          amount: 30000,
          paymentMethod: "UPI",
          notes: "Tile material stage payment",
        },
        normalUser.id
      );

      const approvals = await ApprovalsService.getPendingApprovals();
      expect(approvals.expenses.some((e) => e.id === pendingExp.id)).toBe(true);
      expect(approvals.payments.some((p) => p.id === pendingPay.id)).toBe(true);
      expect(approvals.stats.pendingExpensesCount).toBeGreaterThanOrEqual(1);
      expect(approvals.stats.pendingPaymentsCount).toBeGreaterThanOrEqual(1);

      // Cleanup pending test items
      await db.expense.delete({ where: { id: pendingExp.id } });
      await db.clientPayment.delete({ where: { id: pendingPay.id } });
    });
  });
});
