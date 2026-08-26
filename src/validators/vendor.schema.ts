import { z } from "zod";

export const VENDOR_STATUSES = [
  "ACTIVE",
  "INACTIVE",
  "BLOCKED",
  "ON_HOLD",
  "ARCHIVED",
] as const;

export const createVendorSchema = z.object({
  name: z.string().min(2, "Vendor name must be at least 2 characters"),
  legalName: z.string().optional().or(z.literal("")),
  categoryKey: z.string().min(1, "Vendor category is required"),
  contactPerson: z.string().optional().or(z.literal("")),
  phone: z.string().min(7, "Valid contact phone number is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  website: z.string().optional().or(z.literal("")),
  address: z.string().optional().or(z.literal("")),
  city: z.string().optional().or(z.literal("")),
  state: z.string().optional().or(z.literal("")),
  postalCode: z.string().optional().or(z.literal("")),
  gstin: z.string().optional().or(z.literal("")),
  pan: z.string().optional().or(z.literal("")),
  paymentTermsKey: z.string().default("DAYS_30").optional(),
  creditLimit: z.number().min(0, "Credit limit cannot be negative").default(0).optional(),
  notes: z.string().optional().or(z.literal("")),
  bankName: z.string().optional().or(z.literal("")),
  bankAccountNo: z.string().optional().or(z.literal("")),
  bankIfsc: z.string().optional().or(z.literal("")),
});

export const addVendorContactSchema = z.object({
  vendorId: z.string().min(1, "Vendor selection is required"),
  name: z.string().min(2, "Contact name is required"),
  designation: z.string().optional().or(z.literal("")),
  phone: z.string().min(7, "Valid phone number is required"),
  alternatePhone: z.string().optional().or(z.literal("")),
  email: z.string().email("Invalid email").optional().or(z.literal("")),
  isPrimary: z.boolean().default(false),
  notes: z.string().optional().or(z.literal("")),
});

export const logVendorRatingSchema = z.object({
  vendorId: z.string().min(1, "Vendor selection is required"),
  qualityRating: z.number().min(1.0).max(5.0, "Rating must be between 1.0 and 5.0"),
  deliveryRating: z.number().min(1.0).max(5.0).optional(),
  purchaseOrderRef: z.string().optional().or(z.literal("")),
  notes: z.string().optional().or(z.literal("")),
});

export const detectDuplicateVendorSchema = z.object({
  name: z.string().optional().or(z.literal("")),
  phone: z.string().optional().or(z.literal("")),
  email: z.string().optional().or(z.literal("")),
  gstin: z.string().optional().or(z.literal("")),
});

export const updateVendorBankSchema = z.object({
  bankName: z.string().min(2, "Bank name is required"),
  bankAccountNo: z.string().min(6, "Valid bank account number is required"),
  bankIfsc: z.string().min(4, "Valid IFSC code is required"),
  changeReason: z.string().min(3, "Reason for bank details modification is required"),
});

export const deactivateVendorSchema = z.object({
  reason: z.string().min(3, "Reason for deactivating vendor is required"),
});

export const blockVendorSchema = z.object({
  reason: z.string().min(3, "Reason for blocking vendor is required"),
});

export const vendorFilterSchema = z.object({
  categoryKey: z.string().optional(),
  status: z.string().optional(),
  city: z.string().optional(),
  paymentTermsKey: z.string().optional(),
  search: z.string().optional(),
  page: z.coerce.number().int().positive().default(1),
  limit: z.coerce.number().int().positive().max(100).default(20),
});

export type CreateVendorInput = z.infer<typeof createVendorSchema>;
export type UpdateVendorInput = Partial<CreateVendorInput>;
export type AddVendorContactInput = z.infer<typeof addVendorContactSchema>;
export type LogVendorRatingInput = z.infer<typeof logVendorRatingSchema>;
export type BlockVendorInput = z.infer<typeof blockVendorSchema>;
export type DetectDuplicateVendorInput = z.infer<typeof detectDuplicateVendorSchema>;
export type UpdateVendorBankInput = z.infer<typeof updateVendorBankSchema>;
export type DeactivateVendorInput = z.infer<typeof deactivateVendorSchema>;
export type VendorFilterInput = z.infer<typeof vendorFilterSchema>;

