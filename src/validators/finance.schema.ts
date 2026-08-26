import { z } from "zod";

export const createFinancialAccountSchema = z.object({
  name: z.string().min(2, "Account name must be at least 2 characters"),
  type: z.enum(["CASH", "BANK", "UPI", "OTHER"]).default("BANK"),
  currency: z.string().default("INR"),
  openingBalance: z.number().default(0),
  bankName: z.string().optional(),
  accountNo: z.string().optional(),
  ifscCode: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateFinancialAccountInput = z.infer<typeof createFinancialAccountSchema>;

export const createReceivableSchema = z.object({
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  milestoneId: z.string().optional(),
  referenceNo: z.string().optional(),
  amount: z.number().positive("Receivable amount must be positive"),
  dueDate: z.string().transform((str) => new Date(str)).optional(),
  notes: z.string().optional(),
});

export type CreateReceivableInput = z.infer<typeof createReceivableSchema>;

export const createPayableSchema = z.object({
  vendorId: z.string().min(1, "Vendor selection is required"),
  projectId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  invoiceReference: z.string().optional(),
  amount: z.number().positive("Payable amount must be positive"),
  dueDate: z.string().transform((str) => new Date(str)).optional(),
  notes: z.string().optional(),
});

export type CreatePayableInput = z.infer<typeof createPayableSchema>;

export const recordVendorPaymentSchema = z.object({
  vendorId: z.string().min(1, "Vendor is required"),
  payableId: z.string().optional(),
  purchaseOrderId: z.string().optional(),
  projectId: z.string().optional(),
  financialAccountId: z.string().optional(),
  amount: z.number().positive("Payment amount must be positive"),
  paymentDate: z.string().transform((str) => new Date(str)).optional(),
  paymentMethod: z.enum(["BANK_TRANSFER", "UPI", "CHEQUE", "CASH", "CREDIT_CARD"]).default("BANK_TRANSFER"),
  referenceNoExt: z.string().optional(),
  notes: z.string().optional(),
});

export type RecordVendorPaymentInput = z.infer<typeof recordVendorPaymentSchema>;

export const createGstInvoiceSchema = z.object({
  clientId: z.string().optional(),
  projectId: z.string().optional(),
  quotationId: z.string().optional(),
  customerName: z.string().min(2, "Customer name is required"),
  customerGstin: z.string().optional(),
  customerAddress: z.string().optional(),
  stateCode: z.string().default("36"),
  placeOfSupply: z.string().default("Telangana"),
  isInterState: z.boolean().default(false),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      description: z.string().min(2, "Item description is required"),
      hsnSacCode: z.string().default("995476"),
      quantity: z.number().positive("Quantity must be positive"),
      unitKey: z.string().default("NOS"),
      unitRate: z.number().min(0, "Unit rate cannot be negative"),
      discount: z.number().default(0),
      gstRate: z.number().default(18.0),
    })
  ).min(1, "At least one invoice line item is required"),
});

export type CreateGstInvoiceInput = z.infer<typeof createGstInvoiceSchema>;

export const periodLockSchema = z.object({
  year: z.number().int().min(2020).max(2050),
  month: z.number().int().min(1).max(12),
  notes: z.string().optional(),
});

export type PeriodLockInput = z.infer<typeof periodLockSchema>;

export const createReconciliationSchema = z.object({
  financialAccountId: z.string().min(1, "Account selection is required"),
  periodKey: z.string().min(1, "Period key is required"),
  statementDate: z.string().transform((str) => new Date(str)).optional(),
  actualBalance: z.number(),
  notes: z.string().optional(),
});

export type CreateReconciliationInput = z.infer<typeof createReconciliationSchema>;

export const transferFundsSchema = z.object({
  fromAccountId: z.string().min(1, "Source account is required"),
  toAccountId: z.string().min(1, "Destination account is required"),
  amount: z.number().positive("Transfer amount must be greater than 0"),
  transferDate: z.string().or(z.date()).optional(),
  notes: z.string().optional(),
});

export type TransferFundsInput = z.infer<typeof transferFundsSchema>;

