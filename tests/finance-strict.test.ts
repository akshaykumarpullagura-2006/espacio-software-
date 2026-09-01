import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { PaymentService } from "../src/modules/payments/payment.service";
import { ExpenseService } from "../src/modules/expenses/expense.service";
import { PettyCashService } from "../src/modules/petty-cash/petty-cash.service";
import { FinancialAccountService } from "../src/modules/finance/financial-account.service";
import { ReceivableService } from "../src/modules/finance/receivable.service";
import { PayableService } from "../src/modules/finance/payable.service";
import { VendorPaymentService } from "../src/modules/finance/vendor-payment.service";
import { PeriodLockService } from "../src/modules/finance/period-lock.service";
import { ProjectCostService } from "../src/modules/expenses/project-cost.service";
import { FinanceOverviewService } from "../src/modules/finance/finance-overview.service";
import { EmployeeService } from "../src/modules/employees/employee.service";
import { RbacService } from "../src/modules/rbac/rbac.service";

describe("ESPACIO ERP — Master Development Prompt 09: Strict Financial Controls Suite", () => {
  let adminUser: any;
  let regularUser: any;
  let testClient: any;
  let testProject: any;
  let testMilestone: any;
  let testAccount: any;
  let pettyCashAccount: any;
  let testVendor: any;
  let testEmployee: any;

  beforeAll(async () => {
    // 1. Setup Admin & Regular Users
    adminUser = await db.user.findFirst({ where: { accessLevel: "ADMIN", status: "ACTIVE" } });
    if (!adminUser) {
      adminUser = await db.user.create({
        data: {
          email: "fin.admin@espacio.in",
          passwordHash: "dummyhash",
          fullName: "Finance Admin User",
          accessLevel: "ADMIN",
          status: "ACTIVE",
        },
      });
    }

    regularUser = await db.user.findFirst({ where: { email: "site.engineer.test@espacio.in" } });
    if (!regularUser) {
      regularUser = await db.user.create({
        data: {
          email: "site.engineer.test@espacio.in",
          passwordHash: "dummyhash",
          fullName: "Site Engineer User",
          accessLevel: "USER",
          status: "ACTIVE",
        },
      });
    } else {
      await db.user.update({
        where: { id: regularUser.id },
        data: { accessLevel: "USER", status: "ACTIVE" },
      });
      await db.userRole.deleteMany({ where: { userId: regularUser.id } });
      RbacService.invalidateUserCache(regularUser.id);
    }

    // 2. Setup Client
    testClient = await db.client.findFirst();
    if (!testClient) {
      testClient = await db.client.create({
        data: {
          referenceNo: "CLI-2026-9901",
          fullName: "Ananya Roy",
          email: "ananya.roy@example.com",
          phone: "+91 99000 11223",
          status: "ACTIVE",
          clientType: "INDIVIDUAL",
        },
      });
    }

    // 3. Setup Project with Milestones
    testProject = await db.project.findFirst({ where: { clientId: testClient.id } });
    if (!testProject) {
      testProject = await db.project.create({
        data: {
          referenceNo: "PRJ-2026-9901",
          title: "Roy Penthouse Luxury Interior",
          clientId: testClient.id,
          contractValue: 1000000,
          revisedBudget: 1000000,
          stage: "EXECUTION",
          status: "IN_PROGRESS",
        },
      });
    }

    testMilestone = await db.paymentMilestone.findFirst({ where: { projectId: testProject.id } });
    if (!testMilestone) {
      testMilestone = await db.paymentMilestone.create({
        data: {
          projectId: testProject.id,
          title: "Mobilization Advance (20%)",
          milestonePct: 20,
          amount: 500000,
          paidAmount: 0,
          status: "PENDING",
        },
      });
    } else {
      testMilestone = await db.paymentMilestone.update({
        where: { id: testMilestone.id },
        data: {
          amount: 500000,
          paidAmount: 0,
          status: "PENDING",
        },
      });
    }


    // 4. Setup Financial Accounts (Bank & Petty Cash)
    testAccount = await db.financialAccount.findFirst({ where: { accountCode: "ACC-TEST-BANK" } });
    if (!testAccount) {
      testAccount = await db.financialAccount.create({
        data: {
          accountCode: "ACC-TEST-BANK",
          name: "HDFC Primary Current A/C",
          type: "BANK",
          openingBalance: 1000000,
          currentBalance: 1000000,
          bankName: "HDFC Bank",
          accountNo: "50200012345678",
          ifscCode: "HDFC0001234",
          status: "ACTIVE",
        },
      });
    }

    pettyCashAccount = await db.financialAccount.findFirst({ where: { accountCode: "ACC-TEST-CASH" } });
    if (!pettyCashAccount) {
      pettyCashAccount = await db.financialAccount.create({
        data: {
          accountCode: "ACC-TEST-CASH",
          name: "Site Office Cash Locker",
          type: "CASH",
          openingBalance: 50000,
          currentBalance: 50000,
          status: "ACTIVE",
        },
      });
    }

    // 5. Setup Vendor
    testVendor = await db.vendor.findFirst();
    if (!testVendor) {
      testVendor = await db.vendor.create({
        data: {
          referenceNo: "VEN-2026-9901",
          name: "Premier Ply & Veneers",
          phone: "+91 98888 11111",
          categoryKey: "PLYWOOD",
          status: "ACTIVE",
        },
      });
    }

    // 6. Setup Employee
    testEmployee = await db.employee.findFirst({ where: { status: "ACTIVE" } });
    if (!testEmployee) {
      testEmployee = await db.employee.create({
        data: {
          employeeNo: "EMP-2026-9901",
          fullName: "Rahul Varma",
          email: "rahul.varma@espacio.in",
          phone: "+91 97777 22222",
          department: "SITE_OPERATIONS",
          designation: "Site Supervisor",
          status: "ACTIVE",
          joiningDate: new Date("2025-01-01"),
        },
      });
    } else {
      await db.employee.update({
        where: { id: testEmployee.id },
        data: { status: "ACTIVE" },
      });
    }
  });


  // ==========================================
  // SECTION 1: CLIENT PAYMENTS & RECEIVABLES
  // ==========================================

  it("1. Record Client Payment with atomic Milestone, Account, and Ledger integration", async () => {
    const initialAccountBalance = (await db.financialAccount.findUnique({ where: { id: testAccount.id } }))?.currentBalance || 0;
    const initialMilestonePaid = (await db.paymentMilestone.findUnique({ where: { id: testMilestone.id } }))?.paidAmount || 0;

    const payment = await PaymentService.recordPayment({
      projectId: testProject.id,
      clientId: testClient.id,
      milestoneId: testMilestone.id,
      financialAccountId: testAccount.id,
      amount: 100000,
      paymentMethod: "BANK_TRANSFER",
      externalReference: `UTR-TEST-${Date.now()}`,
      notes: "First installment payment",
    }, adminUser.id);

    expect(payment.referenceNo).toMatch(/^PAY-\d{4}-\d{4}$/);
    expect(payment.amount).toBe(100000);
    expect(payment.status).toBe("VERIFIED");

    // Verify Milestone progression
    const updatedMilestone = await db.paymentMilestone.findUnique({ where: { id: testMilestone.id } });
    expect(updatedMilestone?.paidAmount).toBe(initialMilestonePaid + 100000);
    expect(updatedMilestone?.status).toBe("PARTIALLY_PAID");

    // Verify Financial Account Balance Credit
    const updatedAccount = await db.financialAccount.findUnique({ where: { id: testAccount.id } });
    expect(updatedAccount?.currentBalance).toBe(initialAccountBalance + 100000);

    // Verify Financial Ledger Entry
    const ledgerEntry = await db.financialLedger.findFirst({
      where: { sourceId: payment.id, sourceType: "CLIENT_PAYMENT" },
    });
    expect(ledgerEntry).toBeDefined();
    expect(ledgerEntry?.direction).toBe("INFLOW");
    expect(ledgerEntry?.amount).toBe(100000);
    expect(ledgerEntry?.status).toBe("RECORDED");
  });

  it("2. Generate Formatted Payment Receipt with financial snapshot", async () => {
    const payment = await db.clientPayment.findFirst({ where: { projectId: testProject.id, status: "VERIFIED" } });
    expect(payment).toBeDefined();

    const receipt = await PaymentService.getPaymentReceipt(payment!.id);
    expect(receipt.receiptNo).toBe(`REC-${payment!.referenceNo}`);
    expect(receipt.company.name).toBe("ESPACIO INTERIORS PRIVATE LIMITED");
    expect(receipt.payment.amount).toBe(payment!.amount);
    expect(receipt.financialSummary.totalContractValue).toBeGreaterThan(0);
  });

  it("3. Reject duplicate electronic reference number reuse", async () => {
    const duplicateRef = `UTR-UNIQUE-${Date.now()}`;

    // First payment succeeds
    await PaymentService.recordPayment({
      projectId: testProject.id,
      amount: 10000,
      paymentMethod: "UPI",
      externalReference: duplicateRef,
    }, adminUser.id);

    // Second payment with same external reference must throw BusinessRuleError
    await expect(
      PaymentService.recordPayment({
        projectId: testProject.id,
        amount: 10000,
        paymentMethod: "UPI",
        externalReference: duplicateRef,
      }, adminUser.id)
    ).rejects.toThrow(/already recorded/i);
  });

  it("4. Atomic Client Payment Reversal with balance restoration and ledger reversal", async () => {
    // Record a payment to reverse
    const payment = await PaymentService.recordPayment({
      projectId: testProject.id,
      financialAccountId: testAccount.id,
      milestoneId: testMilestone.id,
      amount: 50000,
      paymentMethod: "CHEQUE",
      notes: "Payment to be reversed",
    }, adminUser.id);

    const balanceBeforeReversal = (await db.financialAccount.findUnique({ where: { id: testAccount.id } }))?.currentBalance || 0;
    const milestonePaidBeforeReversal = (await db.paymentMilestone.findUnique({ where: { id: testMilestone.id } }))?.paidAmount || 0;

    // Reverse the payment
    const reversed = await PaymentService.reversePayment(payment.id, {
      reversalReason: "Cheque bounced due to signature mismatch",
    }, adminUser.id);

    expect(reversed.status).toBe("REVERSED");
    expect(reversed.reversedReason).toBe("Cheque bounced due to signature mismatch");

    // Verify account balance debited back
    const balanceAfterReversal = (await db.financialAccount.findUnique({ where: { id: testAccount.id } }))?.currentBalance || 0;
    expect(balanceAfterReversal).toBe(balanceBeforeReversal - 50000);

    // Verify milestone paid amount decremented
    const milestoneAfterReversal = (await db.paymentMilestone.findUnique({ where: { id: testMilestone.id } }))?.paidAmount || 0;
    expect(milestoneAfterReversal).toBe(milestonePaidBeforeReversal - 50000);

    // Verify inverse ledger entry created
    const inverseLedger = await db.financialLedger.findFirst({
      where: { sourceId: payment.id, status: "REVERSED", direction: "OUTFLOW" },
    });
    expect(inverseLedger).toBeDefined();
    expect(inverseLedger?.amount).toBe(50000);
  });

  // ==========================================
  // SECTION 2: EXPENSES & APPROVAL CONTROLS
  // ==========================================

  it("5. Non-admin expense submission creates SUBMITTED status pending approval", async () => {
    const expense = await ExpenseService.recordExpense({
      expenseType: "PROJECT",
      projectId: testProject.id,
      categoryKey: "MATERIAL",
      amount: 45000,
      paymentMethod: "CASH",
      description: "Gypsum board screws and channels batch",
    }, regularUser.id);

    expect(expense.referenceNo).toMatch(/^EXP-\d{4}-\d{4}$/);
    expect(expense.status).toBe("SUBMITTED");
    expect(expense.approvedById).toBeNull();
  });

  it("6. Self-approval prevention blocks regular users from approving their own expenses", async () => {
    const expense = await ExpenseService.recordExpense({
      expenseType: "PROJECT",
      projectId: testProject.id,
      categoryKey: "TRANSPORT",
      amount: 2500,
      paymentMethod: "CASH",
      description: "Emergency tempo transport for glass panels",
    }, regularUser.id);

    // Regular user attempting self-approval must be blocked
    await expect(
      ExpenseService.approveExpense(expense.id, { notes: "Self approved" }, regularUser.id)
    ).rejects.toThrow();
  });

  it("7. Admin approval debits Financial Account and logs Financial Ledger OUTFLOW", async () => {
    const expense = await ExpenseService.recordExpense({
      expenseType: "PROJECT",
      projectId: testProject.id,
      financialAccountId: testAccount.id,
      categoryKey: "SUBCONTRACTOR",
      amount: 30000,
      paymentMethod: "BANK_TRANSFER",
      description: "False ceiling installation contractor advance",
    }, regularUser.id);

    const balanceBefore = (await db.financialAccount.findUnique({ where: { id: testAccount.id } }))?.currentBalance || 0;

    // Admin approves expense
    const approved = await ExpenseService.approveExpense(expense.id, { notes: "Verified against site progress" }, adminUser.id);
    expect(approved.status).toBe("APPROVED");
    expect(approved.approvedById).toBe(adminUser.id);

    // Verify account debited
    const balanceAfter = (await db.financialAccount.findUnique({ where: { id: testAccount.id } }))?.currentBalance || 0;
    expect(balanceAfter).toBe(balanceBefore - 30000);

    // Verify ledger entry
    const ledger = await db.financialLedger.findFirst({
      where: { sourceId: expense.id, sourceType: "EXPENSE", direction: "OUTFLOW" },
    });
    expect(ledger).toBeDefined();
    expect(ledger?.amount).toBe(30000);
  });

  it("8. Expense reclassification preserves historical audit trace", async () => {
    const expense = await ExpenseService.recordExpense({
      expenseType: "BUSINESS",
      categoryKey: "OFFICE_EXPENSE",
      amount: 15000,
      paymentMethod: "UPI",
      description: "Plywood sample displays",
    }, adminUser.id);

    const reclassified = await ExpenseService.reclassifyExpense(expense.id, {
      expenseType: "PROJECT",
      projectId: testProject.id,
      categoryKey: "MATERIAL",
      reclassificationReason: "Samples were procured exclusively for Roy Penthouse project",
    }, adminUser.id);

    expect(reclassified.expenseType).toBe("PROJECT");
    expect(reclassified.categoryKey).toBe("MATERIAL");
    expect(reclassified.projectId).toBe(testProject.id);

    // Reclassification log must be stored
    const log = JSON.parse(reclassified.reclassificationLog || "[]");
    expect(log.length).toBeGreaterThan(0);
    expect(log[0].reason).toContain("Roy Penthouse");
  });

  it("9. Expense cancellation restores Account Balance and logs inverse Ledger entry", async () => {
    const expense = await ExpenseService.recordExpense({
      expenseType: "PROJECT",
      projectId: testProject.id,
      financialAccountId: testAccount.id,
      categoryKey: "EQUIPMENT",
      amount: 12000,
      paymentMethod: "BANK_TRANSFER",
      description: "Core cutter machine rental",
    }, adminUser.id); // Auto-approved because admin and < 50k

    const balanceBeforeCancel = (await db.financialAccount.findUnique({ where: { id: testAccount.id } }))?.currentBalance || 0;

    const cancelled = await ExpenseService.cancelExpense(expense.id, {
      cancellationReason: "Vendor could not supply machine on agreed schedule",
    }, adminUser.id);

    expect(cancelled.status).toBe("CANCELLED");

    // Verify account balance credited back
    const balanceAfterCancel = (await db.financialAccount.findUnique({ where: { id: testAccount.id } }))?.currentBalance || 0;
    expect(balanceAfterCancel).toBe(balanceBeforeCancel + 12000);

    // Verify reversal ledger entry
    const reversalLedger = await db.financialLedger.findFirst({
      where: { sourceId: expense.id, status: "REVERSED", direction: "INFLOW" },
    });
    expect(reversalLedger).toBeDefined();
    expect(reversalLedger?.amount).toBe(12000);
  });

  // ==========================================
  // SECTION 3: SALARY → EXPENSE INTEGRATION
  // ==========================================

  it("10. Employee Salary Credit creates exactly ONE canonical Expense and Ledger OUTFLOW", async () => {
    // Setup salary structure
    await EmployeeService.configureSalary(
      testEmployee.id,
      {
        baseSalary: 76000,
        effectiveFrom: new Date("2025-01-01"),
        paymentMethod: "BANK_TRANSFER",
      },
      adminUser.id
    );



    const month = 8;
    const year = 2026;

    await db.employeeSalaryPayment.deleteMany({
      where: { employeeId: testEmployee.id, periodMonth: month, periodYear: year },
    });

    // Credit Salary
    const salaryPayment = await EmployeeService.creditSalary(
      testEmployee.id,
      {
        amount: 76000,
        periodMonth: month,
        periodYear: year,
        paymentMethod: "BANK_TRANSFER",
        referenceNoExt: `SAL-UTR-${Date.now()}`,
        notes: "August 2026 Salary Credit",
      } as any,
      adminUser.id
    );

    expect(salaryPayment.referenceNo).toMatch(/^SAL-\d{4}-\d{4}$/);
    expect(salaryPayment.amount).toBe(76000);
    expect(salaryPayment.expenseId).toBeDefined();

    // Verify exactly ONE linked canonical Expense
    const linkedExpense = await db.expense.findUnique({ where: { id: salaryPayment.expenseId! } });
    expect(linkedExpense).toBeDefined();
    expect(linkedExpense?.categoryKey).toBe("SALARY");
    expect(linkedExpense?.expenseType).toBe("BUSINESS");
    expect(linkedExpense?.amount).toBe(76000);
    expect(linkedExpense?.status).toBe("PAID");

    // Verify duplicate salary credit for same employee and period is rejected
    await expect(
      EmployeeService.creditSalary(
        testEmployee.id,
        {
          amount: 76000,
          periodMonth: month,
          periodYear: year,
          paymentMethod: "BANK_TRANSFER",
        } as any,
        adminUser.id
      )
    ).rejects.toThrow(/already been credited|already processed|duplicate/i);
  });



  // ==========================================
  // SECTION 4: PETTY CASH & ADVANCES
  // ==========================================

  it("11. Issue Petty Cash Advance debits cash account and logs PETTY_CASH_ADVANCE ledger entry", async () => {
    const balanceBefore = (await db.financialAccount.findUnique({ where: { id: pettyCashAccount.id } }))?.currentBalance || 0;

    const advance = await PettyCashService.issueAdvance({
      employeeId: regularUser.id,
      projectId: testProject.id,
      financialAccountId: pettyCashAccount.id,
      amount: 10000,
      purpose: "Site daily consumables and helper tea/lunch",
    }, adminUser.id);

    expect(advance.referenceNo).toMatch(/^ADV-\d{4}-\d{4}$/);
    expect(advance.status).toBe("ISSUED");

    // Verify cash account debited
    const balanceAfter = (await db.financialAccount.findUnique({ where: { id: pettyCashAccount.id } }))?.currentBalance || 0;
    expect(balanceAfter).toBe(balanceBefore - 10000);

    // Verify ledger entry
    const ledger = await db.financialLedger.findFirst({
      where: { sourceId: advance.id, sourceType: "PETTY_CASH_ADVANCE" },
    });
    expect(ledger).toBeDefined();
    expect(ledger?.amount).toBe(10000);
  });

  it("12. Record Petty Cash Expense and Settle Advance with cash return", async () => {
    // 1. Issue advance of ₹5,000
    const advance = await PettyCashService.issueAdvance({
      employeeId: regularUser.id,
      projectId: testProject.id,
      financialAccountId: pettyCashAccount.id,
      amount: 5000,
      purpose: "Hardware samples & courier",
    }, adminUser.id);

    // 2. Record petty spend of ₹3,800
    const pettyExpense = await PettyCashService.recordPettyExpense({
      advanceId: advance.id,
      amount: 3800,
      categoryKey: "SMALL_HARDWARE",
      purpose: "Brass screws and adhesive samples",
      paymentMethod: "PETTY_CASH",
    }, regularUser.id);

    expect(pettyExpense.referenceNo).toMatch(/^PCX-\d{4}-\d{4}$/);

    const cashBalanceBeforeSettlement = (await db.financialAccount.findUnique({ where: { id: pettyCashAccount.id } }))?.currentBalance || 0;

    // 3. Settle advance: Spent ₹3,800 + Returned ₹1,200 = Exact ₹5,000 (0 discrepancy)
    const settlement = await PettyCashService.settleAdvance({
      advanceId: advance.id,
      financialAccountId: pettyCashAccount.id,
      cashReturned: 1200,
      notes: "Settled with exact receipts and cash return",
    }, adminUser.id);

    expect(settlement.status).toBe("SETTLED");
    expect(settlement.difference).toBe(0);

    // Verify cash account credited with returned ₹1,200
    const cashBalanceAfterSettlement = (await db.financialAccount.findUnique({ where: { id: pettyCashAccount.id } }))?.currentBalance || 0;
    expect(cashBalanceAfterSettlement).toBe(cashBalanceBeforeSettlement + 1200);

    // Verify ledger entry for returned cash
    const returnLedger = await db.financialLedger.findFirst({
      where: { sourceId: settlement.id, sourceType: "PETTY_CASH_RETURN" },
    });
    expect(returnLedger).toBeDefined();
    expect(returnLedger?.amount).toBe(1200);
  });

  // ==========================================
  // SECTION 5: FUND TRANSFERS & CONTROLS
  // ==========================================

  it("13. Account-to-Account Fund Transfer moves liquid balances without affecting profit/loss", async () => {
    const bankBalanceBefore = (await db.financialAccount.findUnique({ where: { id: testAccount.id } }))?.currentBalance || 0;
    const cashBalanceBefore = (await db.financialAccount.findUnique({ where: { id: pettyCashAccount.id } }))?.currentBalance || 0;

    // Transfer ₹25,000 from Bank to Cash Locker
    const transfer = await FinancialAccountService.transferFunds({
      fromAccountId: testAccount.id,
      toAccountId: pettyCashAccount.id,
      amount: 25000,
      notes: "Replenish Petty Cash Locker from Main Bank A/C",
    }, adminUser.id);

    expect(transfer.updatedFrom.currentBalance).toBe(bankBalanceBefore - 25000);
    expect(transfer.updatedTo.currentBalance).toBe(cashBalanceBefore + 25000);

    // Verify dual balanced ledger entries
    expect(transfer.outLedger.direction).toBe("OUTFLOW");
    expect(transfer.outLedger.sourceType).toBe("ACCOUNT_TRANSFER");
    expect(transfer.inLedger.direction).toBe("INFLOW");
    expect(transfer.inLedger.sourceType).toBe("ACCOUNT_TRANSFER");
  });

  it("14. Reject transfer if source account has insufficient balance", async () => {
    await expect(
      FinancialAccountService.transferFunds({
        fromAccountId: pettyCashAccount.id,
        toAccountId: testAccount.id,
        amount: 999999999, // Unreachable amount
        notes: "Overdraft transfer attempt",
      }, adminUser.id)
    ).rejects.toThrow(/insufficient balance/i);
  });

  // ==========================================
  // SECTION 6: PROJECT COST SHEETS & PROFITABILITY
  // ==========================================

  it("15. Project Cost Sheet accurately aggregates direct costs and gross margins with zero double counting", async () => {
    const costSheet = await ProjectCostService.calculateProjectCost(testProject.id);

    expect(costSheet.projectId).toBe(testProject.id);
    expect(costSheet.contractBudget).toBe(testProject.contractValue);
    expect(costSheet.totalCost).toBeGreaterThan(0);
    expect(costSheet.categoryBreakdown.material).toBeGreaterThanOrEqual(0);
    expect(costSheet.categoryBreakdown.labour).toBeGreaterThanOrEqual(0);
    expect(costSheet.estimatedMargin).toBe(costSheet.revisedBudget - costSheet.totalCost);
    expect(["UNDER_BUDGET", "ON_BUDGET", "OVER_BUDGET"]).toContain(costSheet.varianceStatus);
  });

  // ==========================================
  // SECTION 7: PERIOD LOCKS & SECURITY
  // ==========================================

  it("16. Closed Financial Period strictly blocks new transaction mutations", async () => {
    const lockYear = 2024;
    const lockMonth = 3;

    // Close March 2024 period
    await PeriodLockService.closePeriod({
      year: lockYear,
      month: lockMonth,
      notes: "FY2023-24 Q4 Closing Lock",
    }, adminUser.id);

    // Attempting to record a payment in locked period must fail
    await expect(
      PaymentService.recordPayment({
        projectId: testProject.id,
        amount: 50000,
        paymentDate: new Date(2024, 2, 15), // March 15, 2024
        paymentMethod: "BANK_TRANSFER",
      }, adminUser.id)
    ).rejects.toThrow(/closed|locked/i);

    // Reopen period
    const reopened = await PeriodLockService.reopenPeriod("2024-03", adminUser.id);
    expect(reopened.status).toBe("OPEN");
  });

});
