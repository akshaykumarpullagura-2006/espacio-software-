import { z } from "zod";

export const updateNotificationPreferenceSchema = z.object({
  category: z.enum(["CRM", "PROJECTS", "FINANCE", "PROCUREMENT", "INVENTORY", "TASKS", "SYSTEM", "REPORTS"]),
  channel: z.enum(["IN_APP", "EMAIL", "PUSH", "SMS", "WHATSAPP"]),
  isEnabled: z.boolean(),
});

export type UpdateNotificationPreferenceInput = z.infer<typeof updateNotificationPreferenceSchema>;

export const createReminderSchema = z.object({
  title: z.string().min(2, "Reminder title is required"),
  description: z.string().optional().nullable(),
  dueAt: z.string().or(z.date()),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]).default("NORMAL"),
  entityType: z.string().optional().nullable(),
  entityId: z.string().optional().nullable(),
  actionUrl: z.string().optional().nullable(),
});

export type CreateReminderInput = z.infer<typeof createReminderSchema>;
