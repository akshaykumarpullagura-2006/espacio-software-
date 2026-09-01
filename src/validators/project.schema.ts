import { z } from "zod";

export const PROJECT_STAGES = [
  "CONFIRMATION_FEE_PAID",
  "DESIGNING",
  "DESIGN_COMPLETED",
  "MATERIAL_SELECTION",
  "RAW_MATERIAL_ORDERED",
  "WOOD_WORK",
  "WOOD_WORK_COMPLETED",
  "LAMINATE_ORDERED",
  "LAMINATE_PASTING",
  "FITTING_WORK_COMPLETED",
  "QUALITY_CHECK",
  "PROJECT_HANDOVER",
  "PROJECT_COMPLETED",
] as const;

export const ALL_PROJECT_STAGES = [
  ...PROJECT_STAGES,
  "WARRANTY",
] as const;

export const PROJECT_STATUSES = [
  "PLANNING",
  "ACTIVE",
  "ON_HOLD",
  "COMPLETED",
  "CANCELLED",
  "WARRANTY",
] as const;

export const PROJECT_PRIORITIES = ["LOW", "MEDIUM", "HIGH", "URGENT"] as const;

export const PROJECT_MEMBER_ROLES = [
  "PROJECT_MANAGER",
  "DESIGNER",
  "SITE_ENGINEER",
  "QUALITY_INSPECTOR",
  "PRODUCTION_HEAD",
  "COORDINATOR",
  "ACCOUNTANT",
] as const;

export const DELAY_REASONS = [
  "CLIENT_DECISION",
  "MATERIAL_DELAY",
  "VENDOR_DELAY",
  "DESIGN_REVISION",
  "LABOUR",
  "SITE_ISSUE",
  "APPROVAL_DELAY",
  "OTHER",
] as const;

export const QUALITY_STATUSES = [
  "PENDING",
  "IN_PROGRESS",
  "PASSED",
  "FAILED",
  "RECHECK_REQUIRED",
] as const;

export const HANDOVER_STATUSES = ["PENDING", "SCHEDULED", "COMPLETED"] as const;

export const WARRANTY_STATUSES = [
  "PENDING",
  "ACTIVE",
  "EXPIRED",
  "CANCELLED",
] as const;

// Create Project Schema
export const createProjectSchema = z.object({
  title: z.string().min(3, "Project title must be at least 3 characters"),
  clientId: z.string().min(1, "Client ID is required"),
  leadId: z.string().optional().nullable(),
  approvedQuotationId: z.string().optional().nullable(),
  totalBudget: z.number().nonnegative("Total budget cannot be negative").default(0),
  contractValue: z.number().nonnegative("Contract value cannot be negative").optional(),
  propertyTypeKey: z.string().default("APARTMENT_INTERIOR"),
  propertyType: z.string().optional(),
  description: z.string().optional().nullable(),
  siteAddress: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().default("Hyderabad"),
  state: z.string().default("Telangana"),
  postalCode: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  googleMapsUrl: z.string().optional().nullable(),
  whatsAppGroupUrl: z.string().optional().nullable(),
  status: z.enum(PROJECT_STATUSES).default("ACTIVE"),
  priority: z.enum(PROJECT_PRIORITIES).default("MEDIUM"),
  stage: z.string().default("CONFIRMATION_FEE_PAID"),
  startDate: z.string().or(z.date()).optional().nullable(),
  targetCompletionDate: z.string().or(z.date()).optional().nullable(),
  targetDate: z.string().or(z.date()).optional().nullable(),
  projectManagerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Update Project Schema
export const updateProjectSchema = z.object({
  title: z.string().min(3).optional(),
  description: z.string().optional().nullable(),
  propertyTypeKey: z.string().optional(),
  status: z.enum(PROJECT_STATUSES).optional(),
  priority: z.enum(PROJECT_PRIORITIES).optional(),
  siteAddress: z.string().optional().nullable(),
  address: z.string().optional().nullable(),
  city: z.string().optional(),
  state: z.string().optional(),
  postalCode: z.string().optional().nullable(),
  latitude: z.number().optional().nullable(),
  longitude: z.number().optional().nullable(),
  googleMapsUrl: z.string().optional().nullable(),
  whatsAppGroupUrl: z.string().optional().nullable(),
  contractValue: z.number().nonnegative().optional(),
  startDate: z.string().or(z.date()).optional().nullable(),
  targetCompletionDate: z.string().or(z.date()).optional().nullable(),
  targetDate: z.string().or(z.date()).optional().nullable(),
  actualCompletionDate: z.string().or(z.date()).optional().nullable(),
  projectManagerId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  delayReason: z.string().optional().nullable(),
});

// Change Project Stage Schema
export const changeProjectStageSchema = z.object({
  stage: z.string().min(1, "Stage key is required"),
  delayReason: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  metadata: z.record(z.any()).optional(),
});

// Add Project Member Schema
export const addProjectMemberSchema = z.object({
  userId: z.string().min(1, "User ID is required"),
  role: z.enum(PROJECT_MEMBER_ROLES).default("SITE_ENGINEER"),
});

// Project Filter Schema
export const projectFilterSchema = z.object({
  search: z.string().optional(),
  stage: z.string().optional(),
  status: z.string().optional(),
  priority: z.string().optional(),
  projectManagerId: z.string().optional(),
  assignedUserId: z.string().optional(),
  clientId: z.string().optional(),
  delayHealth: z.string().optional(),
  overdue: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
  isArchived: z
    .enum(["true", "false"])
    .optional()
    .transform((val) => (val === "true" ? true : val === "false" ? false : undefined)),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
  sortBy: z.enum(["createdAt", "updatedAt", "referenceNo", "title", "contractValue", "targetCompletionDate", "stage", "status"]).default("createdAt"),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
});

// Change Order Schemas
export const createChangeOrderSchema = z.object({
  title: z.string().min(3, "Change order title is required").default("Scope Change Order"),
  description: z.string().min(5, "Change order description must be detailed"),
  additionalCost: z.number().nonnegative("Additional cost cannot be negative").default(0),
  amount: z.number().nonnegative().optional(),
  scopeImpact: z.string().optional().nullable(),
  timelineImpactDays: z.number().int().nonnegative().default(0),
  reason: z.string().optional().nullable(),
});

// Quality Check Schemas
export const qualityCheckItemSchema = z.object({
  id: z.string().optional(),
  category: z.string().default("GENERAL"),
  item: z.string().min(1, "Checklist item name is required"),
  passed: z.boolean().default(true),
  remarks: z.string().optional().nullable(),
});

export const createQualityCheckSchema = z.object({
  status: z.enum(["PASSED", "FAILED", "RECHECK_REQUIRED"]).default("PASSED"),
  passed: z.boolean().optional(),
  score: z.number().min(0).max(100).optional(),
  checklist: z.array(qualityCheckItemSchema).optional(),
  issues: z.string().optional().nullable(),
  issuesFound: z.string().optional().nullable(),
  correctiveAction: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

// Handover Schema
export const handoverProjectSchema = z.object({
  handoverDate: z.string().or(z.date()).optional(),
  notes: z.string().optional().nullable(),
  clientConfirmed: z.boolean().default(true),
  handoverSignoffBy: z.string().optional().nullable(),
  durationMonths: z.number().positive().default(12),
  warrantyDurationMonths: z.number().positive().default(12),
});

// Warranty Issue Schemas
export const createWarrantyIssueSchema = z.object({
  title: z.string().min(3, "Title is required").default("Warranty Complaint"),
  description: z.string().min(5, "Description is required"),
  priority: z.enum(PROJECT_PRIORITIES).default("MEDIUM"),
  assignedToId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const resolveWarrantyIssueSchema = z.object({
  resolutionNotes: z.string().min(3, "Resolution note is required"),
});

// Project Note Schema
export const addProjectNoteSchema = z.object({
  note: z.string().min(1, "Note content cannot be empty"),
});

// Export inferred/input types
export type CreateProjectInput = z.input<typeof createProjectSchema>;
export type UpdateProjectInput = z.input<typeof updateProjectSchema>;
export type ChangeProjectStageInput = z.input<typeof changeProjectStageSchema>;
export type AddProjectMemberInput = z.input<typeof addProjectMemberSchema>;
export type ProjectFilterInput = z.infer<typeof projectFilterSchema>;
export type CreateChangeOrderInput = z.input<typeof createChangeOrderSchema>;
export type CreateQualityCheckInput = z.input<typeof createQualityCheckSchema>;
export type HandoverProjectInput = z.input<typeof handoverProjectSchema>;
export type CreateWarrantyIssueInput = z.input<typeof createWarrantyIssueSchema>;
export type ResolveWarrantyIssueInput = z.input<typeof resolveWarrantyIssueSchema>;
export type AddProjectNoteInput = z.input<typeof addProjectNoteSchema>;
