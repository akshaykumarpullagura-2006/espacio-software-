import { z } from "zod";

export const LEAD_STAGES = [
  "NEW",
  "NOT_CONTACTED",
  "CONTACTED",
  "FOLLOW_UP_SCHEDULED",
  "SITE_VISIT_SCHEDULED",
  "SITE_VISIT_COMPLETED",
  "QUOTATION_IN_PROGRESS",
  "QUOTATION_SENT",
  "NEGOTIATION",
  "WON",
  "PROJECT_CREATED",
  "LOST",
] as const;

export const LEAD_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const LOSS_REASONS = [
  "BUDGET",
  "COMPETITOR",
  "NOT_INTERESTED",
  "TIMING",
  "UNREACHABLE",
  "PROJECT_CANCELLED",
  "NOT_SUITABLE",
  "OTHER",
] as const;

export const FOLLOW_UP_TYPES = [
  "CALL",
  "WHATSAPP",
  "EMAIL",
  "MEETING",
  "SITE_VISIT",
  "OTHER",
] as const;

export const FOLLOW_UP_STATUSES = [
  "PENDING",
  "COMPLETED",
  "MISSED",
  "CANCELLED",
] as const;

export const SITE_VISIT_STATUSES = [
  "SCHEDULED",
  "COMPLETED",
  "CANCELLED",
  "MISSED",
] as const;

export const createLeadSchema = z.object({
  clientName: z.string().min(2, "Customer name must be at least 2 characters"),
  phone: z.string().min(10, "Phone number must be at least 10 digits"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")).nullable(),
  alternatePhone: z.string().optional().or(z.literal("")).nullable(),
  propertyType: z.string().optional().or(z.literal("")),
  propertyTypeKey: z.string().optional().or(z.literal("")),
  propertyLocation: z.string().optional().or(z.literal("")).nullable(),
  location: z.string().optional().or(z.literal("")).nullable(),
  propertySize: z.string().optional().or(z.literal("")).nullable(),
  budget: z.number().nonnegative("Budget cannot be negative").optional().nullable(),
  estimatedBudget: z.number().nonnegative().optional().nullable(),
  requirement: z.string().optional().or(z.literal("")).nullable(),
  source: z.string().default("WEBSITE"),
  sourceKey: z.string().optional(),
  priority: z.enum(LEAD_PRIORITIES).default("MEDIUM").optional(),
  assignedToId: z.string().optional().or(z.literal("")).nullable(),
  tags: z.string().optional().or(z.literal("")).nullable(),
  notes: z.string().optional().or(z.literal("")).nullable(),
  clientId: z.string().uuid().optional().nullable(),
  customFields: z.record(z.unknown()).optional(),
});

export const updateLeadSchema = createLeadSchema.partial();

export const changeStatusSchema = z.object({
  status: z.string().min(1, "Status key is required"),
  lossReason: z.string().optional().nullable(),
  reopenReason: z.string().optional().nullable(),
  quotationId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const scheduleFollowUpSchema = z.object({
  scheduledAt: z.string().or(z.date()).optional(),
  followUpDate: z.string().or(z.date()).optional(),
  type: z.enum(FOLLOW_UP_TYPES).default("CALL"),
  notes: z.string().min(1, "Follow-up notes are required"),
  assignedToId: z.string().optional().nullable(),
  reminderMinutesBefore: z.number().int().nonnegative().optional(),
});

export const completeFollowUpSchema = z.object({
  outcomeNotes: z.string().min(1, "Outcome notes are required"),
  nextFollowUpDate: z.string().or(z.date()).optional().nullable(),
  nextFollowUpType: z.enum(FOLLOW_UP_TYPES).optional().nullable(),
  nextFollowUpNotes: z.string().optional().nullable(),
});

export const scheduleSiteVisitSchema = z.object({
  visitDate: z.string().or(z.date()),
  location: z.string().optional().nullable(),
  assignedToId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const completeSiteVisitSchema = z.object({
  outcomeNotes: z.string().min(1, "Outcome notes are required"),
});

export const linkClientSchema = z.object({
  clientId: z.string().uuid("Valid client ID is required"),
});

export type CreateLeadInput = z.infer<typeof createLeadSchema>;
export type UpdateLeadInput = z.infer<typeof updateLeadSchema>;
export type ChangeStatusInput = z.infer<typeof changeStatusSchema>;
export type ScheduleFollowUpInput = z.infer<typeof scheduleFollowUpSchema>;
export type CompleteFollowUpInput = z.infer<typeof completeFollowUpSchema>;
export type ScheduleSiteVisitInput = z.infer<typeof scheduleSiteVisitSchema>;
export type CompleteSiteVisitInput = z.infer<typeof completeSiteVisitSchema>;
export type LinkClientInput = z.infer<typeof linkClientSchema>;
