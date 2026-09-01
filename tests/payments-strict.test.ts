import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { PaymentService } from "../src/modules/payments/payment.service";
import { FinancialCalculationService } from "../src/modules/payments/financial-calculation.service";
import { ReceivableService } from "../src/modules/finance/receivable.service";
import { RbacService } from "../src/modules/rbac/rbac.service";
import { ValidationError, BusinessRuleError, ForbiddenError } from "../src/lib/errors";

describe("ESPACIO ERP — Client Payment Management Strict Production Test Suite", () => {
  let adminUser: any;
  let regularUser: any;
  let testClient: any;
  let testProject: any;
  let milestone1: any;
  let milestone2: any;
  let testAccount: any;

  beforeAll(async () => {
    // 1. Setup Admin & Regular Users
    adminUser = await db.user.findFirst({ where: { accessLevel: "ADMIN", status: "ACTIVE" } });
    if (!adminUser) {
      adminUser = await db.user.create({
        data: {
          email: `admin_pay_${Date.now()}@espacio.in`,
          passwordHash: "dummyhash",
          fullName: "Payment Admin",
          accessLevel: "ADMIN",
          status: "ACTIVE",
        },
      });
    }

    regularUser = await db.user.create({
      data: {
        email: `user_pay_${Date.now()}_${Math.floor(Math.random() * 1000)}@espacio.in`,
        passwordHash: "dummyhash",
        fullName: "Payment Regular User",
        accessLevel: "USER",
        status: "ACTIVE",
      },
    });
    await db.userRole.deleteMany({ where: { userId: regularUser.id } });
    RbacService.invalidateUserCache(regularUser.id);

    // 2. Setup Client
    testClient = await db.client.create({
      data: {
        referenceNo: `CLI-PAY-${Date.now()}`,
        fullName: "Vikram Malhotra",
        email: `vikram_${Date.now()}_${Math.floor(Math.random() * 1000)}@example.com`,
        phone: `+91 98${Math.floor(10000000 + Math.random() * 90000000)}`,
        status: "ACTIVE",
      },
    });

    // 3. Setup Project with Milestones
    testProject = await db.project.create({
      data: {
        referenceNo: `PRJ-PAY-${Date.now().toString().slice(-4)}`,
        title: "Malhotra Villa Interior Execution",
        clientId: testClient.id,
        contractValue: 1000000,
        revisedBudget: 1000000,
        stage: "WOOD_WORK",
        status: "ACTIVE",
      },
    });

    milestone1 = await db.paymentMilestone.create({
      data: {
        projectId: testProject.id,
        title: "Mobilization Advance (20%)",
        milestonePct: 20,
        amount: 200000,
        paidAmount: 0,
        status: "PENDING",
      },
    });

    milestone2 = await db.paymentMilestone.create({
      data: {
        projectId: testProject.id,
        title: "Wood Work Completion (40%)",
        milestonePct: 40,
        amount: 400000,
        paidAmount: 0,
        status: "PENDING",
      },
    });

    // 4. Setup Financial Account
    testAccount = await db.financialAccount.create({
      data: {
        accountCode: `ACC-PAY-${Date.now().toString().slice(-4)}`,
        name: "HDFC Commercial Bank",
        type: "BANK",
        currentBalance: 500000,
        status: "ACTIVE",
      },
    });
  });

  it("TEST 1: Records valid client payment and generates PAY-YYYY-XXXX and FinancialLedger INFLOW", async () => {
    const payment = await PaymentService.recordPayment(
      {
        projectId: testProject.id,
        clientId: testClient.id,
        milestoneId: milestone1.id,
        financialAccountId: testAccount.id,
        amount: 100000,
        paymentMethod: "BANK_TRANSFER",
        externalReference: `UTR-${Date.now()}-01`,
        notes: "Partial mobilization advance",
      },
      regularUser.id
    );

    expect(payment).toBeDefined();
    expect(payment.referenceNo).toMatch(/^PAY-\d{4}-\d+/);
    expect(payment.amount).toBe(100000);
    expect(payment.status).toBe("RECORDED"); // Regular user recording requires Admin confirmation

    // Verify Financial Ledger INFLOW was created
    const ledger = await db.financialLedger.findFirst({
      where: { sourceId: payment.id, sourceType: "CLIENT_PAYMENT" },
    });
    expect(ledger).toBeDefined();
    expect(ledger?.direction).toBe("INFLOW");
    expect(ledger?.amount).toBe(100000);

    // Verify milestone was updated to PARTIALLY_PAID
    const updatedMilestone = await db.paymentMilestone.findUnique({ where: { id: milestone1.id } });
    expect(updatedMilestone?.paidAmount).toBe(100000);
    expect(updatedMilestone?.status).toBe("PARTIALLY_PAID");
  });

  it("TEST 2: Admin confirms payment (ADMIN_ACCEPTED_PAYMENT) and transitions status to VERIFIED", async () => {
    const recordedPayment = await db.clientPayment.findFirst({
      where: { projectId: testProject.id, status: "RECORDED" },
    });
    expect(recordedPayment).toBeDefined();

    const verified = await PaymentService.verifyPayment(
      recordedPayment!.id,
      { notes: "Bank clearance confirmed" },
      adminUser.id
    );

    expect(verified.status).toBe("VERIFIED");
    expect(verified.verifiedById).toBe(adminUser.id);
    expect(verified.verifiedAt).toBeDefined();

    // Verify project financials reflect verified collection
    const financials = await FinancialCalculationService.calculateProjectFinancials(testProject.id);
    expect(financials.totalVerifiedPaid).toBe(100000);
    expect(financials.remainingBalance).toBe(900000);
  });

  it("TEST 3: Rejects duplicate external transaction reference", async () => {
    const duplicateRef = `DUP-REF-${Date.now()}`;

    // First payment with this ref
    await PaymentService.recordPayment(
      {
        projectId: testProject.id,
        clientId: testClient.id,
        amount: 20000,
        paymentMethod: "UPI",
        externalReference: duplicateRef,
      },
      adminUser.id
    );

    // Duplicate attempt
    await expect(
      PaymentService.recordPayment(
        {
          projectId: testProject.id,
          clientId: testClient.id,
          amount: 30000,
          paymentMethod: "UPI",
          externalReference: duplicateRef,
        },
        adminUser.id
      )
    ).rejects.toThrow(BusinessRuleError);
  });

  it("TEST 4: Overpayment protection rejects amounts exceeding remaining project balance", async () => {
    const financials = await FinancialCalculationService.calculateProjectFinancials(testProject.id);
    const excessiveAmount = financials.remainingBalance + 500000;

    await expect(
      PaymentService.recordPayment(
        {
          projectId: testProject.id,
          clientId: testClient.id,
          amount: excessiveAmount,
          paymentMethod: "BANK_TRANSFER",
        },
        adminUser.id
      )
    ).rejects.toThrow(ValidationError);
  });

  it("TEST 5: Second partial payment completing milestone transitions status to PAID", async () => {
    // Pay remaining ₹100,000 of milestone 1 (total ₹200,000)
    const payment = await PaymentService.recordPayment(
      {
        projectId: testProject.id,
        clientId: testClient.id,
        milestoneId: milestone1.id,
        amount: 100000,
        paymentMethod: "BANK_TRANSFER",
      },
      adminUser.id // Admin auto-verifies
    );

    expect(payment.status).toBe("VERIFIED");

    const m1 = await db.paymentMilestone.findUnique({ where: { id: milestone1.id } });
    expect(m1?.paidAmount).toBe(200000);
    expect(m1?.status).toBe("PAID");
  });

  it("TEST 6: Reverses payment atomically, restoring milestone balance and logging OUTFLOW ledger", async () => {
    // 1. Record payment against milestone 2
    const payment = await PaymentService.recordPayment(
      {
        projectId: testProject.id,
        clientId: testClient.id,
        milestoneId: milestone2.id,
        financialAccountId: testAccount.id,
        amount: 150000,
        paymentMethod: "CHEQUE",
        externalReference: `CHQ-${Date.now()}`,
      },
      adminUser.id
    );

    let m2 = await db.paymentMilestone.findUnique({ where: { id: milestone2.id } });
    expect(m2?.paidAmount).toBe(150000);
    expect(m2?.status).toBe("PARTIALLY_PAID");

    const preBalance = (await db.financialAccount.findUnique({ where: { id: testAccount.id } }))?.currentBalance || 0;

    // 2. Reverse payment
    const reversed = await PaymentService.reversePayment(
      payment.id,
      { reversalReason: "Cheque returned unpaid by bank" },
      adminUser.id
    );

    expect(reversed.status).toBe("REVERSED");
    expect(reversed.reversedReason).toBe("Cheque returned unpaid by bank");

    // 3. Verify milestone balance was restored
    m2 = await db.paymentMilestone.findUnique({ where: { id: milestone2.id } });
    expect(m2?.paidAmount).toBe(0);
    expect(m2?.status).toBe("PENDING");

    // 4. Verify Financial Account balance debited
    const postAccount = await db.financialAccount.findUnique({ where: { id: testAccount.id } });
    expect(postAccount?.currentBalance).toBe(preBalance - 150000);

    // 5. Verify inverse OUTFLOW ledger entry
    const reverseLedger = await db.financialLedger.findFirst({
      where: { sourceId: payment.id, direction: "OUTFLOW", status: "REVERSED" },
    });
    expect(reverseLedger).toBeDefined();
    expect(reverseLedger?.amount).toBe(150000);
  });

  it("TEST 7: Generates dynamic Project Payment Timeline with chronological milestones and receipts", async () => {
    const timeline = await PaymentService.getPaymentTimeline(testProject.id);

    expect(timeline).toBeDefined();
    expect(timeline.project.id).toBe(testProject.id);
    expect(timeline.financials).toBeDefined();
    expect(Array.isArray(timeline.events)).toBe(true);
    expect(timeline.events.length).toBeGreaterThan(0);

    // Verify milestone scheduled and payment events exist
    const milestoneEvents = timeline.events.filter((e) => e.type === "MILESTONE_SCHEDULED");
    const paymentEvents = timeline.events.filter((e) => e.type === "PAYMENT_RECORDED");
    expect(milestoneEvents.length).toBeGreaterThan(0);
    expect(paymentEvents.length).toBeGreaterThan(0);
  });

  it("TEST 8: Generates formal printable Payment Receipt with authoritative financial summary", async () => {
    const payment = await db.clientPayment.findFirst({
      where: { projectId: testProject.id, status: "VERIFIED" },
    });
    expect(payment).toBeDefined();

    const receipt = await PaymentService.getPaymentReceipt(payment!.id);

    expect(receipt).toBeDefined();
    expect(receipt.receiptNo).toBe(`REC-${payment!.referenceNo}`);
    expect(receipt.payment.amount).toBe(payment!.amount);
    expect(receipt.client.fullName).toBe("Vikram Malhotra");
    expect(receipt.project.title).toBe("Malhotra Villa Interior Execution");
    expect(receipt.financialSummary.totalContractValue).toBe(1000000);
    expect(receipt.company.name).toBeDefined();
    expect(receipt.company.gstin).toBeDefined();
  });

  it("TEST 9: Computes high-level Payments KPI Summary", async () => {
    const summary = await PaymentService.getPaymentsSummary();

    expect(summary).toBeDefined();
    expect(summary.totalProjectValue).toBeGreaterThan(0);
    expect(summary.totalVerifiedPaid).toBeGreaterThan(0);
    expect(summary.totalOutstandingReceivables).toBeGreaterThanOrEqual(0);
    expect(summary.totalPaymentsCount).toBeGreaterThan(0);
  });

  it("TEST 10: Calculates client-level aggregate receivables across projects", async () => {
    const clientReceivables = await FinancialCalculationService.calculateClientReceivables();

    expect(Array.isArray(clientReceivables)).toBe(true);
    const clientRecord = (clientReceivables as any[]).find((c) => c.clientId === testClient.id);
    expect(clientRecord).toBeDefined();
    expect(clientRecord.clientName).toBe("Vikram Malhotra");
    expect(clientRecord.activeProjectsCount).toBe(1);
    expect(clientRecord.totalContractValue).toBe(1000000);
    expect(clientRecord.totalVerifiedPaid).toBeGreaterThan(0);
    expect(clientRecord.totalPendingBalance).toBe(
      clientRecord.totalContractValue - clientRecord.totalVerifiedPaid
    );
  });
});
