import { z } from "zod";

export const documentTypeSchema = z.enum([
  "CONTRACT",
  "AGREEMENT",
  "QUOTATION",
  "INVOICE",
  "RECEIPT",
  "DRAWING",
  "DESIGN",
  "SPECIFICATION",
  "REPORT",
  "QUALITY_REPORT",
  "HANDOVER",
  "WARRANTY",
  "GST",
  "PURCHASE_ORDER",
  "GOODS_RECEIPT",
  "KYC",
  "IMAGE",
  "OTHER",
]);

export const documentCategorySchema = z.enum([
  "COMPANY",
  "PROJECT",
  "FINANCE",
  "PROCUREMENT",
  "CRM",
  "CLIENT",
  "EMPLOYEE",
  "VENDOR",
  "INVENTORY",
  "TASKS",
  "GENERAL",
]);

export const documentVisibilitySchema = z.enum([
  "INTERNAL",
  "RESTRICTED",
  "CLIENT_VISIBLE",
]);

export const documentStatusSchema = z.enum([
  "ACTIVE",
  "ARCHIVED",
  "TRASHED",
]);

export const createDocumentSchema = z.object({
  name: z.string().min(2, "Document name must be at least 2 characters").max(255),
  description: z.string().optional().nullable(),
  type: documentTypeSchema.default("OTHER"),
  category: documentCategorySchema.default("GENERAL"),
  visibility: documentVisibilitySchema.default("INTERNAL"),
  projectId: z.string().uuid().optional().nullable(),
  clientId: z.string().uuid().optional().nullable(),
  leadId: z.string().uuid().optional().nullable(),
  sourceType: z.string().optional().nullable(),
  sourceId: z.string().optional().nullable(),
  actionUrl: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().default([]),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;

export const updateDocumentSchema = z.object({
  name: z.string().min(2).max(255).optional(),
  description: z.string().optional().nullable(),
  type: documentTypeSchema.optional(),
  category: documentCategorySchema.optional(),
  visibility: documentVisibilitySchema.optional(),
  status: documentStatusSchema.optional(),
  tags: z.array(z.string()).optional(),
  isFavorite: z.boolean().optional(),
});

export type UpdateDocumentInput = z.infer<typeof updateDocumentSchema>;

export const documentFilterSchema = z.object({
  tab: z.enum(["ALL", "RECENT", "FAVORITES", "TRASH", "ARCHIVED"]).optional().default("ALL"),
  category: z.string().optional(),
  type: z.string().optional(),
  visibility: z.string().optional(),
  status: z.string().optional(),
  search: z.string().optional(),
  projectId: z.string().optional(),
  clientId: z.string().optional(),
  leadId: z.string().optional(),
  entityType: z.string().optional(),
  entityId: z.string().optional(),
  page: z.number().int().positive().optional().default(1),
  limit: z.number().int().positive().max(100).optional().default(20),
});

export type DocumentFilterInput = z.infer<typeof documentFilterSchema>;

export const linkDocumentSchema = z.object({
  documentId: z.string().uuid(),
  entityType: z.string().min(2).max(50),
  entityId: z.string().uuid(),
});

export type LinkDocumentInput = z.infer<typeof linkDocumentSchema>;

export const createDocumentRequestSchema = z.object({
  title: z.string().min(2, "Request title is required"),
  requestedFromId: z.string().uuid().optional().nullable(),
  dueDate: z.string().or(z.date()).optional().nullable(),
});

export type CreateDocumentRequestInput = z.infer<typeof createDocumentRequestSchema>;
