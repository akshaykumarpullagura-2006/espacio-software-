import { z } from "zod";

export const calendarFilterSchema = z.object({
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()),
  category: z.enum(["ALL", "TASKS", "PROJECTS", "FINANCE", "PROCUREMENT", "CRM", "REMINDERS", "MEETINGS", "SITE_VISITS"]).optional().default("ALL"),
  search: z.string().optional(),
  userId: z.string().optional(),
});

export type CalendarFilterInput = z.infer<typeof calendarFilterSchema>;

export const createCalendarEventSchema = z.object({
  title: z.string().min(2, "Event title is required"),
  description: z.string().optional().nullable(),
  startDate: z.string().or(z.date()),
  endDate: z.string().or(z.date()).optional().nullable(),
  type: z.enum(["MEETING", "SITE_VISIT", "CALL", "DESIGN_REVIEW", "QUALITY_CHECK", "HANDOVER", "OTHER"]).default("MEETING"),
  location: z.string().optional().nullable(),
  projectId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  attendeeUserIds: z.array(z.string().uuid()).optional().default([]),
  notes: z.string().optional().nullable(),
});

export type CreateCalendarEventInput = z.infer<typeof createCalendarEventSchema>;
