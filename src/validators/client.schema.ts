import { z } from "zod";

export const CLIENT_TYPES = ["INDIVIDUAL", "BUSINESS", "COMMERCIAL", "RESIDENTIAL"] as const;
export const CLIENT_STATUSES = ["ACTIVE", "INACTIVE", "PROSPECT", "CUSTOMER"] as const;
export const CONTACT_METHODS = ["PHONE", "WHATSAPP", "EMAIL"] as const;

export const createClientSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters"),
  phone: z
    .string()
    .min(7, "Phone number must be at least 7 digits")
    .regex(/^[0-9+\s\-()]{7,20}$/, "Invalid phone format"),
  email: z.string().email("Invalid email format").optional().or(z.literal("")).nullable(),
  companyName: z.string().optional().or(z.literal("")).nullable(),
  clientType: z.enum(CLIENT_TYPES).default("INDIVIDUAL"),
  status: z.enum(CLIENT_STATUSES).default("ACTIVE"),
  alternatePhone: z.string().optional().or(z.literal("")).nullable(),
  address: z.string().optional().or(z.literal("")).nullable(),
  city: z.string().optional().or(z.literal("")).nullable(),
  state: z.string().optional().or(z.literal("")).nullable(),
  postalCode: z.string().optional().or(z.literal("")).nullable(),
  country: z.string().default("India"),
  gstin: z
    .string()
    .regex(/^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/, "Invalid 15-digit GSTIN format")
    .optional()
    .or(z.literal(""))
    .nullable(),
  pan: z
    .string()
    .regex(/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/, "Invalid 10-character PAN format")
    .optional()
    .or(z.literal(""))
    .nullable(),
  billingAddress: z.string().optional().or(z.literal("")).nullable(),
  shippingAddress: z.string().optional().or(z.literal("")).nullable(),
  preferredContactMethod: z.enum(CONTACT_METHODS).default("PHONE"),
  tags: z.string().optional().or(z.literal("")).nullable(),
  notes: z.string().optional().or(z.literal("")).nullable(),
  leadId: z.string().optional().or(z.literal("")).nullable(),
});

export const updateClientSchema = createClientSchema.partial();

export const checkDuplicateClientSchema = z.object({
  phone: z.string().optional(),
  email: z.string().optional(),
  gstin: z.string().optional(),
  companyName: z.string().optional(),
  fullName: z.string().optional(),
  excludeId: z.string().optional(),
});

export const clientFilterSchema = z.object({
  search: z.string().optional(),
  status: z.enum([...CLIENT_STATUSES, "ALL"]).optional(),
  clientType: z.enum([...CLIENT_TYPES, "ALL"]).optional(),
  city: z.string().optional(),
  hasActiveProject: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  hasOutstanding: z
    .enum(["true", "false"])
    .transform((v) => v === "true")
    .optional(),
  createdFrom: z.string().optional(),
  createdTo: z.string().optional(),
  sortBy: z.enum(["fullName", "referenceNo", "createdAt", "projectCount", "totalValue", "totalOutstanding"]).optional(),
  sortOrder: z.enum(["asc", "desc"]).default("desc"),
  page: z.coerce.number().min(1).default(1),
  limit: z.coerce.number().min(1).max(100).default(20),
});

export const addClientNoteSchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().min(1, "Note content is required"),
});

export type CreateClientInput = z.input<typeof createClientSchema>;
export type UpdateClientInput = z.input<typeof updateClientSchema>;
export type ClientFilterInput = z.infer<typeof clientFilterSchema>;
export type CheckDuplicateClientInput = z.input<typeof checkDuplicateClientSchema>;
export type AddClientNoteInput = z.input<typeof addClientNoteSchema>;
