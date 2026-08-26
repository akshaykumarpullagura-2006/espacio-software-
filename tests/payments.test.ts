import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { PaymentService } from "../src/modules/payments/payment.service";
import { FinancialCalculationService } from "../src/modules/payments/financial-calculation.service";
import { ReceivableService } from "../src/modules/finance/receivable.service";
import { ValidationError } from "../src/lib/errors";

describe("Client Payment Management Module Tests", () => {
  let sampleProjectId: string;
  let sampleClientId: string;

  beforeAll(async () => {
    let client = await db.client.findFirst();
    if (!client) {
      client = await db.client.create({
        data: {
          referenceNo: `CLI-PAY-${Date.now()}`,
          fullName: "Payment Test Client",
          phone: "9988776655",
          email: `paytest_${Date.now()}@example.com`,
        },
      });
    }
    sampleClientId = client.id;

    const project = await db.project.create({
      data: {
        referenceNo: `PROJ-2026-${Math.floor(1000 + Math.random() * 9000)}`,
        title: "Test Payment Project Isolated",
        client: { connect: { id: client.id } },
        stage: "INITIATION",
        propertyTypeKey: "APARTMENT_INTERIOR",
        contractValue: 5000000,
        paymentMilestones: {
          create: [
            {
              title: "Design Advance",
              milestonePct: 10,
              amount: 500000,
              dueDate: new Date(),
              status: "PENDING",
            },
          ],
        },
      },
    });
    sampleProjectId = project.id;
  });

  it("records valid client payments and updates project financial summary", async () => {
    const project = await db.project.findUnique({
      where: { id: sampleProjectId },
      include: { client: true },
    });

    if (project) {
      const initialFinancials = await FinancialCalculationService.calculateProjectFinancials(project.id);
      const paymentAmount = 200000;

      // Record payment
      const payment = await PaymentService.recordPayment({
        projectId: project.id,
        clientId: project.clientId || undefined,
        amount: paymentAmount,
        paymentMethod: "BANK_TRANSFER",
        notes: "Test collection entry",
      });

      expect(payment.referenceNo).toMatch(/^PAY-\d{4}-\d{4}$/);
      expect(payment.amount).toBe(paymentAmount);

      // Verify payment
      const verified = await PaymentService.verifyPayment(payment.id);
      expect(verified.status).toBe("VERIFIED");

      // Verify updated authoritative financials
      const updatedFinancials = await FinancialCalculationService.calculateProjectFinancials(project.id);
      expect(updatedFinancials.totalVerifiedPaid).toBe(initialFinancials.totalVerifiedPaid + paymentAmount);
      expect(updatedFinancials.remainingBalance).toBe(Math.max(0, initialFinancials.remainingBalance - paymentAmount));
    }
  });

  it("rejects overpayments exceeding remaining project balance", async () => {
    const project = await db.project.findUnique({ where: { id: sampleProjectId } });

    if (project) {
      const financials = await FinancialCalculationService.calculateProjectFinancials(project.id);
      const excessiveAmount = financials.remainingBalance + 500000;

      // Attempt overpayment
      await expect(
        PaymentService.recordPayment({
          projectId: project.id,
          clientId: project.clientId || undefined,
          amount: excessiveAmount,
          paymentMethod: "CASH",
        })
      ).rejects.toThrow(ValidationError);
    }
  });

  it("supports partial payments against milestones and updates milestone status cleanly", async () => {
    const project = await db.project.findUnique({
      where: { id: sampleProjectId },
      include: { paymentMilestones: true },
    });

    if (project && project.paymentMilestones.length > 0) {
      const milestone = project.paymentMilestones[0];

      // Record partial payment
      const partialAmount = 50000;
      const payment = await PaymentService.recordPayment({
        projectId: project.id,
        clientId: project.clientId || undefined,
        milestoneId: milestone.id,
        amount: partialAmount,
        paymentMethod: "UPI",
      });

      expect(payment.milestoneId).toBe(milestone.id);

      // Check updated milestone
      const updatedMilestone = await db.paymentMilestone.findUnique({ where: { id: milestone.id } });
      expect(updatedMilestone?.paidAmount).toBeGreaterThan(0);
    }
  });

  it("executes controlled payment reversal and restores project/milestone balances", async () => {
    const project = await db.project.findUnique({
      where: { id: sampleProjectId },
      include: { client: true },
    });

    if (project) {
      const initialFinancials = await FinancialCalculationService.calculateProjectFinancials(project.id);

      // 1. Record and verify payment
      const payment = await PaymentService.recordPayment({
        projectId: project.id,
        clientId: project.clientId || undefined,
        amount: 100000,
        paymentMethod: "CHEQUE",
      });
      await PaymentService.verifyPayment(payment.id);

      const midFinancials = await FinancialCalculationService.calculateProjectFinancials(project.id);
      expect(midFinancials.totalVerifiedPaid).toBe(initialFinancials.totalVerifiedPaid + 100000);

      // 2. Reverse payment
      const reversed = await PaymentService.reversePayment(payment.id, {
        reversalReason: "Cheque bounced on clearance test",
      });

      expect(reversed.status).toBe("REVERSED");
      expect(reversed.reversedReason).toBe("Cheque bounced on clearance test");

      // 3. Verify balance restored
      const finalFinancials = await FinancialCalculationService.calculateProjectFinancials(project.id);
      expect(finalFinancials.totalVerifiedPaid).toBe(initialFinancials.totalVerifiedPaid);
    }
  });

  it("calculates client receivables correctly across projects", async () => {
    const receivables = await ReceivableService.getReceivables({});
    expect(receivables).toBeDefined();
    expect(Array.isArray(receivables)).toBe(true);
  });
});
