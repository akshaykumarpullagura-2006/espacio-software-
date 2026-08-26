import { z } from "zod";

export const PAYMENT_STATUSES = ["RECORDED", "PENDING_VERIFICATION", "VERIFIED", "REVERSED", "CANCELLED"] as const;

export const paymentAllocationItemSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  milestoneId: z.string().optional().or(z.literal("")),
  receivableId: z.string().optional().or(z.literal("")),
  amount: z.number().positive("Allocation amount must be greater than 0"),
  notes: z.string().optional().or(z.literal("")),
});

export const recordPaymentSchema = z.object({
  projectId: z.string().min(1, "Project ID is required"),
  clientId: z.string().optional().or(z.literal("")),
  milestoneId: z.string().optional().or(z.literal("")),
  receivableId: z.string().optional().or(z.literal("")),
  gstInvoiceId: z.string().optional().or(z.literal("")),
  financialAccountId: z.string().optional().or(z.literal("")),
  amount: z.number().positive("Payment amount must be greater than 0"),
  paymentDate: z.string().or(z.date()).optional(),
  paymentMethod: z.string().min(1, "Payment method is required"),
  externalReference: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
  allocations: z.array(paymentAllocationItemSchema).optional(),
});

export const verifyPaymentSchema = z.object({
  notes: z.string().optional().or(z.literal("")),
});

export const reversePaymentSchema = z.object({
  reversalReason: z.string().min(3, "Reversal reason must be at least 3 characters"),
  reason: z.string().optional(),
});

export type RecordPaymentInput = z.infer<typeof recordPaymentSchema>;
export type PaymentAllocationItem = z.infer<typeof paymentAllocationItemSchema>;
export type VerifyPaymentInput = z.infer<typeof verifyPaymentSchema>;
export type ReversePaymentInput = z.infer<typeof reversePaymentSchema>;

