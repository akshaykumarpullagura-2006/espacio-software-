import { describe, it, expect, beforeAll } from "vitest";
import { db } from "../src/lib/db";
import { IdGeneratorService } from "../src/lib/id-generator";
import { FinanceCalculationService } from "../src/modules/finance/finance-calculation.service";
import { FinancialAccountService } from "../src/modules/finance/financial-account.service";
import { ReceivableService } from "../src/modules/finance/receivable.service";
import { PayableService } from "../src/modules/finance/payable.service";
import { VendorPaymentService } from "../src/modules/finance/vendor-payment.service";
import { GstInvoiceService } from "../src/modules/finance/gst-invoice.service";
import { PeriodLockService } from "../src/modules/finance/period-lock.service";
import { FinanceOverviewService } from "../src/modules/finance/finance-overview.service";

describe("Finance & Financial Control Subsystem Tests", () => {
  let vendorId: string;
  let accountId: string;
  let payableId: string;

  beforeAll(async () => {
    // Setup test vendor & financial account
    let vendor = await db.vendor.findFirst({ where: { status: "ACTIVE" } });
    if (!vendor) {
      vendor = await db.vendor.create({
        data: {
          referenceNo: "VEN-2026-9999",
          name: "Test Supplies Ltd",
          phone: "+91 98989 88888",
          categoryKey: "HARDWARE",
        },
      });
    }
    vendorId = vendor.id;

    let account = await db.financialAccount.findFirst({ where: { accountCode: "ACC-0001" } });
    if (!account) {
      account = await db.financialAccount.create({
        data: {
          accountCode: "ACC-0001",
          name: "HDFC Operating Bank",
          type: "BANK",
          openingBalance: 500000,
          currentBalance: 500000,
        },
      });
    }
    accountId = account.id;
  });

  it("1. Reference ID Generation: VPAY, INV, REC, VPAYABLE, ACC", async () => {
    const vpayRef = await IdGeneratorService.generate("VPAY");
    const invRef = await IdGeneratorService.generate("INV");
    const recRef = await IdGeneratorService.generate("REC");
    const vpayableRef = await IdGeneratorService.generate("VPAYABLE");
    const accRef = await IdGeneratorService.generate("ACC");

    const year = new Date().getFullYear();
    expect(vpayRef).toMatch(new RegExp(`^VPAY-${year}-\\d{4}$`));
    expect(invRef).toMatch(new RegExp(`^INV-${year}-\\d{4}$`));
    expect(recRef).toMatch(new RegExp(`^REC-${year}-\\d{4}$`));
    expect(vpayableRef).toMatch(new RegExp(`^VPAYABLE-${year}-\\d{4}$`));
    expect(accRef).toMatch(/^ACC-\d{4}$/);
  });

  it("2. Safe Money & GST Tax Calculation (CGST/SGST vs IGST)", () => {
    // Intra-state (18% -> CGST 9% + SGST 9%)
    const intra = FinanceCalculationService.calculateGst(100000, 18, false);
    expect(intra.taxableAmount).toBe(100000);
    expect(intra.cgstAmount).toBe(9000);
    expect(intra.sgstAmount).toBe(9000);
    expect(intra.igstAmount).toBe(0);
    expect(intra.totalTax).toBe(18000);
    expect(intra.grandTotal).toBe(118000);

    // Inter-state (18% -> IGST 18%)
    const inter = FinanceCalculationService.calculateGst(100000, 18, true);
    expect(inter.taxableAmount).toBe(100000);
    expect(inter.cgstAmount).toBe(0);
    expect(inter.sgstAmount).toBe(0);
    expect(inter.igstAmount).toBe(18000);
    expect(inter.grandTotal).toBe(118000);
  });

  it("3. Client Receivable Creation", async () => {
    const rec = await ReceivableService.createReceivable({
      amount: 150000,
      dueDate: new Date(Date.now() + 10 * 86400000).toISOString(),
      notes: "Test receivable",
    });

    expect(rec.receivableNo).toContain("REC-");
    expect(rec.amount).toBe(150000);
    expect(rec.paidAmount).toBe(0);
    expect(rec.outstandingAmount).toBe(150000);
    expect(rec.status).toBe("OPEN");
  });

  it("4. Vendor Payable & Partial Vendor Payment Lifecycle (VPAY-YYYY-XXXX)", async () => {
    const payable = await PayableService.createPayable({
      vendorId,
      amount: 100000,
      notes: "Hardware batch supply bill",
    });

    expect(payable.payableNo).toContain("VPAYABLE-");
    expect(payable.outstandingAmount).toBe(100000);
    expect(payable.status).toBe("OPEN");
    payableId = payable.id;

    // Partial Vendor Payment: ₹40,000
    const payment = await VendorPaymentService.recordVendorPayment({
      vendorId,
      payableId: payable.id,
      financialAccountId: accountId,
      amount: 40000,
      paymentMethod: "BANK_TRANSFER",
      referenceNoExt: "UTR-TEST-001",
    });

    expect(payment.paymentNo).toContain("VPAY-");
    expect(payment.amount).toBe(40000);
    expect(payment.status).toBe("VERIFIED");

    // Verify Payable updated balance
    const updatedPayable = await db.vendorPayable.findUnique({ where: { id: payable.id } });
    expect(updatedPayable?.paidAmount).toBe(40000);
    expect(updatedPayable?.outstandingAmount).toBe(60000);
    expect(updatedPayable?.status).toBe("PARTIALLY_PAID");
  });

  it("5. Vendor Payment Reversal Workflow", async () => {
    // Create payment to reverse
    const payment = await VendorPaymentService.recordVendorPayment({
      vendorId,
      financialAccountId: accountId,
      amount: 20000,
      paymentMethod: "UPI",
    });

    const reversed = await VendorPaymentService.reverseVendorPayment(payment.id, "Duplicate transaction reversal");
    expect(reversed?.status).toBe("REVERSED");
    expect(reversed?.reversedReason).toBe("Duplicate transaction reversal");

    // Verify Financial Ledger inverse entry
    const ledger = await db.financialLedger.findFirst({
      where: { sourceId: payment.id, status: "REVERSED" },
    });
    expect(ledger).toBeDefined();
    expect(ledger?.direction).toBe("INFLOW");
  });

  it("6. GST Tax Invoice Generation (INV-YYYY-XXXX)", async () => {
    const invoice = await GstInvoiceService.createInvoice({
      customerName: "Sharma Residency",
      stateCode: "36",
      placeOfSupply: "Telangana",
      isInterState: false,
      items: [
        {
          description: "False Ceiling Execution",
          hsnSacCode: "995476",
          quantity: 2,
          unitKey: "NOS",
          unitRate: 50000,
          discount: 0,
          gstRate: 18,
        },
      ],
    });

    expect(invoice.invoiceNo).toContain("INV-");
    expect(invoice.taxableAmount).toBe(100000);
    expect(invoice.totalTax).toBe(18000);
    expect(invoice.grandTotal).toBe(118000);
    expect(invoice.status).toBe("ISSUED");
  });

  it("7. Financial Period Lock & Reopen", async () => {
    const year = new Date().getFullYear();
    const month = 1;

    const lock = await PeriodLockService.closePeriod({ year, month, notes: "January month-end closing" });
    expect(lock.periodKey).toBe(`${year}-01`);
    expect(lock.status).toBe("CLOSED");

    const reopened = await PeriodLockService.reopenPeriod(lock.periodKey);
    expect(reopened.status).toBe("OPEN");
  });

  it("8. Company Financial Overview Metrics Aggregation", async () => {
    const year = new Date().getFullYear();
    const month = new Date().getMonth() + 1;

    const overview = await FinanceOverviewService.getCompanyOverview(year, month);
    expect(overview).toBeDefined();
    expect(overview.totalRevenue).toBeGreaterThanOrEqual(0);
    expect(overview.grossProfit).toBeDefined();
    expect(overview.netProfit).toBeDefined();
    expect(overview.accountsBalance.length).toBeGreaterThan(0);
  });
});
