import { db } from "@/lib/db";
import { BusinessRuleError, NotFoundError, ValidationError } from "@/lib/errors";
import { IdGeneratorService } from "@/lib/id-generator";
import { FinancialCalculationService } from "./financial-calculation.service";
import { SettingsService } from "../settings/settings.service";
import { AuditService } from "../audit/audit.service";
import { ActivityService } from "../activity/activity.service";
import { RbacService } from "../rbac/rbac.service";
import { NotificationService } from "../notifications/notification.service";
import { PeriodLockService } from "../finance/period-lock.service";
import { FinanceCalculationService } from "../finance/finance-calculation.service";
import {
  RecordPaymentInput,
  VerifyPaymentInput,
  ReversePaymentInput,
} from "@/validators/payment.schema";

export interface PaymentFilterParams {
  projectId?: string;
  clientId?: string;
  paymentMethod?: string;
  status?: string;
  financialAccountId?: string;
  startDate?: Date;
  endDate?: Date;
  search?: string;
  page?: number;
  limit?: number;
}

export class PaymentService {
  /**
   * ATOMIC CLIENT PAYMENT RECORDING
   * Creates ClientPayment + Updates Milestone/Receivable + Credits FinancialAccount + Logs FinancialLedger INFLOW
   */
  public static async recordPayment(input: RecordPaymentInput, userId?: string) {
    const project = await db.project.findUnique({
      where: { id: input.projectId },
      include: { client: true },
    });
    if (!project) throw new NotFoundError("Project record not found");

    if (input.clientId && project.clientId && project.clientId !== input.clientId) {
      throw new ValidationError("Client ID does not match the assigned project client");
    }

    const clientId = input.clientId || project.clientId || undefined;
    const amount = FinanceCalculationService.roundMoney(input.amount);
    if (amount <= 0) throw new ValidationError("Payment amount must be greater than 0");

    const paymentDate = input.paymentDate ? new Date(input.paymentDate) : new Date();

    // 1. PERIOD LOCK CHECK
    await PeriodLockService.checkPeriodOpen(paymentDate);

    // 2. DUPLICATE PAYMENT / REFERENCE PROTECTION
    const externalRef = input.externalReference ? input.externalReference.trim() : null;
    if (externalRef && externalRef.length > 0) {
      const existingRefPayment = await db.clientPayment.findFirst({
        where: {
          referenceNoExt: externalRef,
          status: { not: "REVERSED" },
        },
      });
      if (existingRefPayment) {
        throw new BusinessRuleError(
          `Payment with external reference "${externalRef}" is already recorded (${existingRefPayment.referenceNo}). Duplicate payment rejected.`
        );
      }
    }

    // 3. OVERPAYMENT VALIDATION
    const financials = await FinancialCalculationService.calculateProjectFinancials(input.projectId);
    const allowOverpaymentSetting = await SettingsService.get("ALLOW_OVERPAYMENT", "false");
    const allowOverpayment = allowOverpaymentSetting === "true";

    if (!allowOverpayment && amount > financials.remainingBalance + 0.01) {
      throw new ValidationError(
        `Payment amount (₹${amount.toLocaleString()}) exceeds the remaining project balance (₹${financials.remainingBalance.toLocaleString()})`
      );
    }

    // 4. VERIFY FINANCIAL ACCOUNT IF SPECIFIED
    let financialAccount: any = null;
    if (input.financialAccountId) {
      financialAccount = await db.financialAccount.findUnique({
        where: { id: input.financialAccountId },
      });
      if (!financialAccount) throw new NotFoundError("Selected financial account not found");
    }

    // 5. DETERMINE INITIAL STATUS (Admin auto-verification vs recorded)
    const isUserAdmin = userId ? await RbacService.isUserAdmin(userId) : false;
    let autoVerify = false;
    if (isUserAdmin) {
      const autoVerifySetting = await SettingsService.get("AUTO_VERIFY_PAYMENTS", "false");
      autoVerify = autoVerifySetting === "true" || isUserAdmin;
    }

    const initialStatus = autoVerify ? "VERIFIED" : "RECORDED";
    const referenceNo = await IdGeneratorService.generate("PAY");
    const ledgerNo = await IdGeneratorService.generate("LED");

    // 6. ATOMIC TRANSACTION: Payment + Milestone + Receivable + Account + Ledger
    const result = await db.$transaction(async (tx) => {
      // Step A: Create ClientPayment record
      const payment = await tx.clientPayment.create({
        data: {
          referenceNo,
          projectId: input.projectId,
          clientId: clientId || null,
          milestoneId: input.milestoneId || null,
          receivableId: input.receivableId || null,
          gstInvoiceId: input.gstInvoiceId || null,
          financialAccountId: financialAccount ? financialAccount.id : null,
          amount,
          paymentDate,
          paymentMethod: input.paymentMethod,
          status: initialStatus,
          referenceNoExt: externalRef,
          notes: input.notes ? input.notes.trim() : null,
          receivedById: userId ?? null,
          verifiedById: autoVerify ? userId ?? null : null,
          verifiedAt: autoVerify ? new Date() : null,
        },
        include: {
          project: { select: { id: true, referenceNo: true, title: true } },
          client: { select: { id: true, referenceNo: true, fullName: true, email: true, phone: true } },
          milestone: { select: { id: true, title: true, amount: true, paidAmount: true } },
          financialAccount: { select: { id: true, accountCode: true, name: true } },
        },
      });

      // Step B: Update Milestone paidAmount and status if linked
      if (payment.milestoneId && payment.milestone) {
        const newPaid = FinanceCalculationService.roundMoney(payment.milestone.paidAmount + amount);
        const newStatus = newPaid >= payment.milestone.amount ? "PAID" : newPaid > 0 ? "PARTIALLY_PAID" : "PENDING";
        await tx.paymentMilestone.update({
          where: { id: payment.milestoneId },
          data: {
            paidAmount: newPaid,
            status: newStatus,
          },
        });
      }

      // Step C: Update ClientReceivable paidAmount and status if linked
      if (input.receivableId) {
        const rec = await tx.clientReceivable.findUnique({ where: { id: input.receivableId } });
        if (rec) {
          const newPaid = FinanceCalculationService.roundMoney(rec.paidAmount + amount);
          const newOutstanding = FinanceCalculationService.roundMoney(Math.max(0, rec.amount - newPaid));
          const newStatus = newOutstanding <= 0 ? "PAID" : "PARTIALLY_PAID";
          await tx.clientReceivable.update({
            where: { id: rec.id },
            data: {
              paidAmount: newPaid,
              outstandingAmount: newOutstanding,
              status: newStatus,
            },
          });
        }
      }

      // Step D: Update FinancialAccount balance (INFLOW credit) if linked
      if (financialAccount) {
        const newBalance = FinanceCalculationService.roundMoney(financialAccount.currentBalance + amount);
        await tx.financialAccount.update({
          where: { id: financialAccount.id },
          data: { currentBalance: newBalance },
        });
      }

      // Step E: Create FinancialLedger Entry (INFLOW)
      const ledgerEntry = await tx.financialLedger.create({
        data: {
          entryNo: ledgerNo,
          transactionDate: paymentDate,
          direction: "INFLOW",
          sourceType: "CLIENT_PAYMENT",
          sourceId: payment.id,
          financialAccountId: financialAccount ? financialAccount.id : null,
          clientId: clientId || null,
          projectId: input.projectId,
          categoryKey: "REVENUE",
          amount,
          paymentMethod: input.paymentMethod,
          referenceNoExt: externalRef,
          status: "RECORDED",
          notes: `Client payment ${payment.referenceNo} for ${payment.project.title}`,
          createdById: userId ?? null,
        },
      });

      return { payment, ledgerEntry };
    });

    // 7. AUDIT & ACTIVITY LOGGING
    await AuditService.logEvent({
      userId,
      action: "PAYMENT_CREATED",
      entityType: "ClientPayment",
      entityId: result.payment.id,
      newValues: {
        referenceNo: result.payment.referenceNo,
        amount: result.payment.amount,
        status: result.payment.status,
        financialAccount: financialAccount?.name,
      },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: input.projectId,
      type: "PAYMENT",
      title: `Client Payment ${result.payment.referenceNo} Recorded`,
      description: `Received ₹${amount.toLocaleString()} via ${input.paymentMethod} (Ref: ${externalRef || "N/A"}). Status: ${result.payment.status}.`,
    });

    // 8. NOTIFICATION TO ADMINS IF PENDING CONFIRMATION
    if (initialStatus === "RECORDED") {
      await NotificationService.notifyAdmins({
        type: "PAYMENT_PENDING_CONFIRMATION",
        category: "FINANCE",
        priority: "HIGH",
        title: "New Client Payment Awaiting Confirmation",
        message: `Payment ${result.payment.referenceNo} for ₹${amount.toLocaleString()} was recorded and is pending Admin confirmation.`,
        entityType: "ClientPayment",
        entityId: result.payment.id,
        actionUrl: `/finance/payments`,
        actorId: userId,
      });
    }

    return result.payment;
  }

  /**
   * GENERATE FORMAL PAYMENT RECEIPT
   */
  public static async getPaymentReceipt(paymentId: string) {
    const payment = await db.clientPayment.findUnique({
      where: { id: paymentId },
      include: {
        project: {
          select: {
            id: true,
            referenceNo: true,
            title: true,
            propertyTypeKey: true,
            city: true,
            state: true,
            contractValue: true,
            revisedBudget: true,
          },
        },


        client: {
          select: {
            id: true,
            referenceNo: true,
            fullName: true,
            email: true,
            phone: true,
            companyName: true,
            gstin: true,
            billingAddress: true,
          },
        },
        milestone: { select: { id: true, title: true, milestonePct: true, amount: true } },
        financialAccount: { select: { id: true, accountCode: true, name: true, type: true } },
      },
    });

    if (!payment) throw new NotFoundError("Payment record not found");

    const financials = await FinancialCalculationService.calculateProjectFinancials(payment.projectId);

    return {
      receiptNo: `REC-${payment.referenceNo}`,
      receiptDate: payment.paymentDate,
      payment: {
        id: payment.id,
        referenceNo: payment.referenceNo,
        amount: payment.amount,
        paymentDate: payment.paymentDate,
        paymentMethod: payment.paymentMethod,
        externalReference: payment.referenceNoExt,
        status: payment.status,
        notes: payment.notes,
      },
      client: payment.client || { fullName: "Client Record Unlinked" },
      project: payment.project,
      milestone: payment.milestone,
      financialSummary: {
        totalContractValue: financials.contractBudget,
        totalPaidToDate: financials.totalVerifiedPaid,
        remainingOutstandingBalance: financials.remainingBalance,
      },

      company: {
        name: "ESPACIO INTERIORS PRIVATE LIMITED",
        tagline: "Turnkey Architecture & Interior Execution",
        address: "Plot 14, Financial District, Gachibowli, Hyderabad, Telangana 500032",
        gstin: "36AAACE1234F1Z5",
        phone: "+91 40 2345 6789",
        email: "accounts@espacio.in",
        website: "https://espacio.in",
      },
    };
  }

  public static async verifyPayment(paymentId: string, input?: VerifyPaymentInput, userId?: string) {
    if (userId) {
      await RbacService.requireAdmin(userId, "ADMIN_ACCEPTED_PAYMENT");
    }

    const payment = await db.clientPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError("Payment record not found");

    if (payment.status === "VERIFIED") {
      throw new BusinessRuleError(`Payment ${payment.referenceNo} is already verified.`);
    }
    if (payment.status === "REVERSED" || payment.status === "CANCELLED") {
      throw new BusinessRuleError(`Cannot verify a ${payment.status.toLowerCase()} payment.`);
    }

    const updated = await db.clientPayment.update({
      where: { id: paymentId },
      data: {
        status: "VERIFIED",
        verifiedById: userId ?? null,
        verifiedAt: new Date(),
        notes: input?.notes ? `${payment.notes || ""}\nVerification Note: ${input.notes}`.trim() : payment.notes,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "ADMIN_ACCEPTED_PAYMENT",
      entityType: "ClientPayment",
      entityId: paymentId,
      newValues: { referenceNo: updated.referenceNo, verifiedAt: updated.verifiedAt, status: "VERIFIED" },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: payment.projectId,
      type: "PAYMENT",
      title: `Payment ${updated.referenceNo} Confirmed`,
      description: `Admin confirmed client receipt of ₹${payment.amount.toLocaleString()}.`,
    });

    if (payment.receivedById && payment.receivedById !== userId) {
      await NotificationService.create({
        userId: payment.receivedById,
        type: "PAYMENT_CONFIRMED",
        category: "FINANCE",
        priority: "NORMAL",
        title: "Payment Confirmed",
        message: `Client payment ${payment.referenceNo} (₹${payment.amount.toLocaleString()}) has been confirmed by Admin.`,
        entityType: "ClientPayment",
        entityId: payment.id,
        actionUrl: `/finance/payments`,
        actorId: userId,
      });
    }

    return updated;
  }

  public static async rejectPayment(paymentId: string, input?: { rejectionReason?: string }, userId?: string) {
    if (userId) {
      await RbacService.requireAdmin(userId, "ADMIN_REJECTED_PAYMENT");
    }

    const payment = await db.clientPayment.findUnique({ where: { id: paymentId } });
    if (!payment) throw new NotFoundError("Payment record not found");

    if (payment.status === "CANCELLED" || payment.status === "REVERSED") {
      throw new BusinessRuleError(`Payment ${payment.referenceNo} is already ${payment.status.toLowerCase()}.`);
    }

    const reason = input?.rejectionReason || "Rejected by Admin during payment confirmation review";

    const updated = await db.clientPayment.update({
      where: { id: paymentId },
      data: {
        status: "CANCELLED",
        notes: payment.notes ? `${payment.notes}\nRejection Reason: ${reason}` : `Rejection Reason: ${reason}`,
      },
    });

    await AuditService.logEvent({
      userId,
      action: "ADMIN_REJECTED_PAYMENT",
      entityType: "ClientPayment",
      entityId: paymentId,
      newValues: { referenceNo: updated.referenceNo, status: "CANCELLED", rejectionReason: reason },
    });

    if (payment.receivedById && payment.receivedById !== userId) {
      await NotificationService.create({
        userId: payment.receivedById,
        type: "PAYMENT_REJECTED",
        category: "FINANCE",
        priority: "HIGH",
        title: "Payment Rejected",
        message: `Client payment ${payment.referenceNo} (₹${payment.amount.toLocaleString()}) was rejected by Admin. Reason: ${reason}`,
        entityType: "ClientPayment",
        entityId: payment.id,
        actionUrl: `/finance/payments`,
        actorId: userId,
      });
    }

    return updated;
  }

  /**
   * ATOMIC PAYMENT REVERSAL
   * Marks Payment REVERSED + Reverts Milestone/Receivable balances + Debits FinancialAccount + Logs FinancialLedger OUTFLOW adjustment
   */
  public static async reversePayment(paymentId: string, input: ReversePaymentInput, userId?: string) {
    const payment = await db.clientPayment.findUnique({
      where: { id: paymentId },
      include: { milestone: true, receivable: true, financialAccount: true },
    });
    if (!payment) throw new NotFoundError("Payment record not found");

    if (payment.status === "REVERSED") {
      throw new BusinessRuleError(`Payment ${payment.referenceNo} has already been reversed.`);
    }

    const reversalReason = input.reversalReason || input.reason || "Payment Reversal";
    const reversalDate = new Date();

    // Check period lock
    await PeriodLockService.checkPeriodOpen(reversalDate);

    const ledgerNo = await IdGeneratorService.generate("LED");

    // Atomic reversal transaction
    const result = await db.$transaction(async (tx) => {
      // Step A: Mark payment as REVERSED
      const reversedPayment = await tx.clientPayment.update({
        where: { id: paymentId },
        data: {
          status: "REVERSED",
          reversedReason: reversalReason.trim(),
        },
      });

      // Step B: Restore linked milestone balance if applicable
      if (payment.milestoneId && payment.milestone) {
        const newPaidAmount = FinanceCalculationService.roundMoney(
          Math.max(0, payment.milestone.paidAmount - payment.amount)
        );
        let newStatus = "PENDING";
        if (newPaidAmount >= payment.milestone.amount) {
          newStatus = "PAID";
        } else if (newPaidAmount > 0) {
          newStatus = "PARTIALLY_PAID";
        }

        await tx.paymentMilestone.update({
          where: { id: payment.milestoneId },
          data: {
            paidAmount: newPaidAmount,
            status: newStatus,
          },
        });
      }

      // Step C: Restore linked receivable balance if applicable
      if (payment.receivableId && payment.receivable) {
        const newPaid = FinanceCalculationService.roundMoney(
          Math.max(0, payment.receivable.paidAmount - payment.amount)
        );
        const newOutstanding = FinanceCalculationService.roundMoney(payment.receivable.amount - newPaid);
        const newStatus = newPaid <= 0 ? "OPEN" : "PARTIALLY_PAID";

        await tx.clientReceivable.update({
          where: { id: payment.receivableId },
          data: {
            paidAmount: newPaid,
            outstandingAmount: newOutstanding,
            status: newStatus,
          },
        });
      }

      // Step D: Restore FinancialAccount balance (debit outflow) if linked
      if (payment.financialAccount) {
        const newBalance = FinanceCalculationService.roundMoney(
          payment.financialAccount.currentBalance - payment.amount
        );
        await tx.financialAccount.update({
          where: { id: payment.financialAccount.id },
          data: { currentBalance: newBalance },
        });
      }

      // Step E: Create inverse FinancialLedger Entry (OUTFLOW correction)
      await tx.financialLedger.create({
        data: {
          entryNo: ledgerNo,
          transactionDate: reversalDate,
          direction: "OUTFLOW",
          sourceType: "CLIENT_PAYMENT",
          sourceId: payment.id,
          financialAccountId: payment.financialAccountId || undefined,
          clientId: payment.clientId || undefined,
          projectId: payment.projectId,
          categoryKey: "REVENUE",
          amount: payment.amount,
          paymentMethod: payment.paymentMethod,
          referenceNoExt: payment.referenceNoExt || undefined,
          status: "REVERSED",
          notes: `Reversal of ${payment.referenceNo}: ${reversalReason.trim()}`,
          createdById: userId ?? null,
        },
      });

      return reversedPayment;
    });

    await AuditService.logEvent({
      userId,
      action: "PAYMENT_REVERSED",
      entityType: "ClientPayment",
      entityId: paymentId,
      newValues: { referenceNo: result.referenceNo, reversalReason },
    });

    await ActivityService.record({
      userId,
      entityType: "Project",
      entityId: payment.projectId,
      type: "PAYMENT",
      title: `Payment ${result.referenceNo} Reversed`,
      description: `Reversal reason: ${reversalReason}`,
    });

    return result;
  }

  public static async getPayments(params: PaymentFilterParams) {
    const page = params.page ?? 1;
    const limit = params.limit ?? 20;
    const skip = (page - 1) * limit;

    const where: Record<string, unknown> = {};

    if (params.projectId) where.projectId = params.projectId;
    if (params.clientId) where.clientId = params.clientId;
    if (params.paymentMethod) where.paymentMethod = params.paymentMethod;
    if (params.status) where.status = params.status;
    if (params.financialAccountId) where.financialAccountId = params.financialAccountId;

    if (params.startDate || params.endDate) {
      where.paymentDate = {
        ...(params.startDate ? { gte: params.startDate } : {}),
        ...(params.endDate ? { lte: params.endDate } : {}),
      };
    }

    if (params.search && params.search.trim().length > 0) {
      const q = params.search.trim();
      where.OR = [
        { referenceNo: { contains: q } },
        { referenceNoExt: { contains: q } },
        { client: { fullName: { contains: q } } },
        { project: { title: { contains: q } } },
        { project: { referenceNo: { contains: q } } },
      ];
    }

    const [total, payments] = await Promise.all([
      db.clientPayment.count({ where }),
      db.clientPayment.findMany({
        where,
        orderBy: { paymentDate: "desc" },
        skip,
        take: limit,
        include: {
          project: { select: { id: true, referenceNo: true, title: true } },
          client: { select: { id: true, referenceNo: true, fullName: true, phone: true } },
          milestone: { select: { id: true, title: true } },
          financialAccount: { select: { id: true, accountCode: true, name: true, type: true } },
        },
      }),
    ]);

    return {
      payments,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  public static async getPaymentById(id: string) {
    const payment = await db.clientPayment.findUnique({
      where: { id },
      include: {
        project: { select: { id: true, referenceNo: true, title: true, contractValue: true, revisedBudget: true } },
        client: true,
        milestone: true,
        financialAccount: true,
      },
    });

    if (!payment) throw new NotFoundError("Payment record not found");

    const financials = await FinancialCalculationService.calculateProjectFinancials(payment.projectId);

    return { payment, financials };
  }
}

