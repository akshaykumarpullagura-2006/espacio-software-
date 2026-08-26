import { z } from "zod";

export const ADVANCE_STATUSES = [
  "DRAFT",
  "REQUESTED",
  "APPROVED",
  "ISSUED",
  "PARTIALLY_SETTLED",
  "SETTLED",
  "CANCELLED",
  "OVERDUE",
] as const;

export const SETTLEMENT_STATUSES = [
  "OPEN",
  "PARTIALLY_SETTLED",
  "SETTLED",
  "DISCREPANCY",
  "OVERDUE",
  "CANCELLED",
] as const;

export const issueAdvanceSchema = z.object({
  employeeId: z.string().min(1, "Employee selection is required"),
  amount: z.number().positive("Advance amount must be greater than 0"),
  financialAccountId: z.string().optional().or(z.literal("")),
  issuedDate: z.string().or(z.date()).optional(),
  dueDate: z.string().or(z.date()).optional(),
  purpose: z.string().min(3, "Purpose must be at least 3 characters"),
  projectId: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const recordPettyExpenseSchema = z.object({
  advanceId: z.string().min(1, "Advance selection is required"),
  amount: z.number().positive("Petty expense amount must be greater than 0"),
  expenseDate: z.string().or(z.date()).optional(),
  purpose: z.string().min(3, "Purpose must be at least 3 characters"),
  categoryKey: z.string().min(1, "Category is required"),
  paymentMethod: z.string().min(1, "Payment method is required"),
  projectId: z.string().optional().or(z.literal("")),
  referenceNoExternal: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const settleAdvanceSchema = z.object({
  advanceId: z.string().min(1, "Advance selection is required"),
  financialAccountId: z.string().optional().or(z.literal("")),
  cashReturned: z.number().min(0, "Cash returned cannot be negative").default(0),
  settlementDate: z.string().or(z.date()).optional(),
  notes: z.string().optional().or(z.literal("")),
});

export type IssueAdvanceInput = z.infer<typeof issueAdvanceSchema>;
export type RecordPettyExpenseInput = z.infer<typeof recordPettyExpenseSchema>;
export type SettleAdvanceInput = z.infer<typeof settleAdvanceSchema>;

