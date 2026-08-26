import { z } from "zod";

export const EXPENSE_TYPES = ["PROJECT", "BUSINESS"] as const;
export const EXPENSE_STATUSES = ["DRAFT", "SUBMITTED", "APPROVED", "REJECTED", "PAID", "CANCELLED"] as const;

export const recordExpenseSchema = z
  .object({
    expenseType: z.enum(EXPENSE_TYPES).default("PROJECT"),
    categoryKey: z.string().min(1, "Expense category is required"),
    projectId: z.string().optional().or(z.literal("")),
    vendorName: z.string().optional().or(z.literal("")),
    vendorId: z.string().optional().or(z.literal("")),
    employeeId: z.string().optional().or(z.literal("")),
    financialAccountId: z.string().optional().or(z.literal("")),
    description: z.string().min(3, "Description must be at least 3 characters"),
    amount: z.number().positive("Expense amount must be greater than 0"),
    paymentMethod: z.string().min(1, "Payment method is required"),
    expenseDate: z.string().or(z.date()).optional(),
    referenceNoExternal: z.string().optional().or(z.literal("")),
    notes: z.string().optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.expenseType === "PROJECT" && (!data.projectId || data.projectId.trim() === "")) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["projectId"],
        message: "Project selection is required for Project Expenses",
      });
    }
  });

export const approveExpenseSchema = z.object({
  notes: z.string().optional().or(z.literal("")),
});

export const rejectExpenseSchema = z.object({
  rejectionReason: z.string().min(5, "Rejection reason must be at least 5 characters"),
});

export const cancelExpenseSchema = z.object({
  cancellationReason: z.string().min(5, "Cancellation reason must be at least 5 characters"),
});

export const reclassifyExpenseSchema = z.object({
  categoryKey: z.string().optional(),
  expenseType: z.enum(EXPENSE_TYPES).optional(),
  projectId: z.string().optional().or(z.literal("")),
  reclassificationReason: z.string().min(5, "Reclassification reason must be at least 5 characters"),
});

export type RecordExpenseInput = z.infer<typeof recordExpenseSchema>;
export type ApproveExpenseInput = z.infer<typeof approveExpenseSchema>;
export type RejectExpenseInput = z.infer<typeof rejectExpenseSchema>;
export type CancelExpenseInput = z.infer<typeof cancelExpenseSchema>;
export type ReclassifyExpenseInput = z.infer<typeof reclassifyExpenseSchema>;
