import { z } from "zod";

export const CreateEmployeeSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(100),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional().nullable(),
  department: z.enum([
    "OPERATIONS",
    "DESIGN",
    "FINANCE",
    "SALES",
    "SITE_EXECUTION",
    "MANAGEMENT",
    "HR",
    "PROCUREMENT",
  ]).default("OPERATIONS"),
  designation: z.string().min(2, "Designation is required").max(100),
  joiningDate: z.string().or(z.date()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).default("ACTIVE"),
  address: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNo: z.string().optional().nullable(),
  bankIfsc: z.string().optional().nullable(),
  upiId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
  // Optional initial user/account creation & role mapping
  createUserAccount: z.boolean().default(false),
  accessLevel: z.enum(["SUPER_ADMIN", "ADMIN", "USER"]).default("USER"),
  roleName: z.string().default("USER"),
  password: z.string().min(6).optional(),
  // Optional initial salary
  baseSalary: z.number().min(0, "Salary cannot be negative").default(0),
  paymentMethod: z.enum(["UPI", "BANK_TRANSFER", "CASH", "CHEQUE"]).default("UPI"),
});

export const UpdateEmployeeSchema = z.object({
  fullName: z.string().min(2).max(100).optional(),
  phone: z.string().optional().nullable(),
  department: z.string().optional(),
  designation: z.string().min(2).max(100).optional(),
  joiningDate: z.string().or(z.date()).optional(),
  status: z.enum(["ACTIVE", "INACTIVE"]).optional(),
  address: z.string().optional().nullable(),
  emergencyContact: z.string().optional().nullable(),
  emergencyPhone: z.string().optional().nullable(),
  bankName: z.string().optional().nullable(),
  bankAccountNo: z.string().optional().nullable(),
  bankIfsc: z.string().optional().nullable(),
  upiId: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const ConfigureSalarySchema = z.object({
  baseSalary: z.number().min(0, "Salary cannot be negative"),
  paymentMethod: z.enum(["UPI", "BANK_TRANSFER", "CASH", "CHEQUE"]).default("UPI"),
  effectiveFrom: z.string().or(z.date()).optional(),
  notes: z.string().optional().nullable(),
});

export const CreditSalarySchema = z.object({
  periodMonth: z.number().int().min(1).max(12),
  periodYear: z.number().int().min(2020).max(2050),
  amount: z.number().positive("Salary amount must be greater than zero"),
  paymentDate: z.string().or(z.date()).optional(),
  paymentMethod: z.enum(["UPI", "BANK_TRANSFER", "CASH", "CHEQUE"]).default("UPI"),
  referenceNoExternal: z.string().optional().nullable(),
  notes: z.string().optional().nullable(),
});

export const ReverseSalarySchema = z.object({
  reason: z.string().min(3, "Reversal reason is required"),
});

export type CreateEmployeeInput = z.infer<typeof CreateEmployeeSchema>;
export type UpdateEmployeeInput = z.infer<typeof UpdateEmployeeSchema>;
export type ConfigureSalaryInput = z.infer<typeof ConfigureSalarySchema>;
export type CreditSalaryInput = z.infer<typeof CreditSalarySchema>;
export type ReverseSalaryInput = z.infer<typeof ReverseSalarySchema>;
