import { z } from "zod";

export const createTaskSchema = z.object({
  title: z.string().min(2, "Task title must be at least 2 characters").max(200),
  description: z.string().optional().nullable(),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  type: z
    .enum([
      "GENERAL",
      "PROJECT",
      "FOLLOW_UP",
      "SITE_VISIT",
      "DESIGN",
      "PROCUREMENT",
      "PRODUCTION",
      "QUALITY_CHECK",
      "HANDOVER",
      "PAYMENT_FOLLOW_UP",
      "ADMIN",
      "APPROVAL",
      "FINANCE",
      "INVENTORY",
      "CLIENT",
      "INTERNAL",
    ])
    .default("GENERAL"),
  assigneeId: z.string().uuid("Invalid assignee ID").optional().nullable(),
  projectId: z.string().uuid("Invalid project ID").optional().nullable(),
  clientId: z.string().uuid("Invalid client ID").optional().nullable(),
  leadId: z.string().uuid("Invalid lead ID").optional().nullable(),
  sourceType: z.string().optional().nullable(),
  sourceId: z.string().optional().nullable(),
  actionUrl: z.string().optional().nullable(),
  startDate: z.string().or(z.date()).optional().nullable(),
  dueAt: z.string().or(z.date()).optional().nullable(),
  estimatedMinutes: z.number().int().nonnegative().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
  parentTaskId: z.string().uuid().optional().nullable(),
  checklists: z.array(z.string().min(1)).optional().default([]),
  blockingTaskIds: z.array(z.string().uuid()).optional().default([]),
});

export type CreateTaskInput = z.infer<typeof createTaskSchema>;

export const updateTaskSchema = createTaskSchema.partial();
export type UpdateTaskInput = z.infer<typeof updateTaskSchema>;

export const updateTaskStatusSchema = z.object({
  status: z.enum(["TODO", "IN_PROGRESS", "BLOCKED", "COMPLETED", "CANCELLED"]),
  notes: z.string().optional().nullable(),
});

export type UpdateTaskStatusInput = z.infer<typeof updateTaskStatusSchema>;

export const reassignTaskSchema = z.object({
  assigneeId: z.string().uuid("Valid assignee user ID is required"),
  reason: z.string().optional().nullable(),
});

export type ReassignTaskInput = z.infer<typeof reassignTaskSchema>;

export const blockTaskSchema = z.object({
  reason: z.string().min(3, "A reason for blocking the task is required"),
});

export type BlockTaskInput = z.infer<typeof blockTaskSchema>;

export const reopenTaskSchema = z.object({
  reason: z.string().min(3, "A reason for reopening the task is required"),
});

export type ReopenTaskInput = z.infer<typeof reopenTaskSchema>;

export const addChecklistItemSchema = z.object({
  title: z.string().min(1, "Checklist item title is required"),
});

export type AddChecklistItemInput = z.infer<typeof addChecklistItemSchema>;

export const taskFilterSchema = z.object({
  assigneeId: z.string().optional(),
  createdById: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  type: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  search: z.string().optional(),
  isOverdue: z.boolean().optional(),
  unassignedOnly: z.boolean().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

export type TaskFilterInput = z.infer<typeof taskFilterSchema>;
