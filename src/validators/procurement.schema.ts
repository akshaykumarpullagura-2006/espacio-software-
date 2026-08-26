import { z } from "zod";

export const MATERIAL_REQUEST_STATUSES = [
  "DRAFT",
  "SUBMITTED",
  "UNDER_REVIEW",
  "APPROVED",
  "PARTIALLY_ORDERED",
  "ORDERED",
  "PARTIALLY_FULFILLED",
  "FULFILLED",
  "REJECTED",
  "CANCELLED",
] as const;

export const PURCHASE_ORDER_STATUSES = [
  "DRAFT",
  "PENDING_APPROVAL",
  "APPROVED",
  "SENT",
  "ACKNOWLEDGED",
  "PARTIALLY_RECEIVED",
  "RECEIVED",
  "PARTIALLY_CANCELLED",
  "CANCELLED",
  "CLOSED",
] as const;

export const GOODS_RECEIPT_STATUSES = [
  "RECEIVED",
  "INSPECTED",
  "ACCEPTED",
  "PARTIALLY_ACCEPTED",
  "REJECTED",
  "CANCELLED",
] as const;

export const createMaterialRequestItemSchema = z.object({
  materialName: z.string().min(2, "Material name is required"),
  description: z.string().optional().or(z.literal("")),
  requestedQuantity: z.number().positive("Requested quantity must be positive"),
  unitKey: z.string().default("NOS"),
  estimatedRate: z.number().min(0).optional(),
  notes: z.string().optional().or(z.literal("")),
});

export const createMaterialRequestSchema = z.object({
  projectId: z.string().optional().or(z.literal("")),
  requiredDate: z.string().min(1, "Required date is required"),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  purposeKey: z.string().default("PROJECT_EXECUTION"),
  notes: z.string().optional().or(z.literal("")),
  items: z.array(createMaterialRequestItemSchema).min(1, "At least one material item is required"),
});

export const createPurchaseOrderItemSchema = z.object({
  materialName: z.string().min(2, "Material name is required"),
  description: z.string().optional().or(z.literal("")),
  quantity: z.number().positive("Quantity must be positive"),
  unitKey: z.string().default("NOS"),
  rate: z.number().min(0, "Rate cannot be negative"),
  discount: z.number().min(0).default(0),
  taxRate: z.number().min(0).default(0),
  expectedDeliveryDate: z.string().optional().or(z.literal("")),
});

export const createPurchaseOrderSchema = z.object({
  vendorId: z.string().min(1, "Vendor selection is required"),
  projectId: z.string().optional().or(z.literal("")),
  materialRequestId: z.string().optional().or(z.literal("")),
  poDate: z.string().optional(),
  expectedDeliveryDate: z.string().optional().or(z.literal("")),
  paymentTermsKey: z.string().default("DAYS_30"),
  currency: z.string().default("INR"),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  shippingCharges: z.number().min(0).default(0),
  notes: z.string().optional().or(z.literal("")),
  items: z.array(createPurchaseOrderItemSchema).min(1, "At least one PO item is required"),
});

export const createGoodsReceiptItemSchema = z.object({
  purchaseOrderItemId: z.string().min(1, "PO item selection is required"),
  receivedQuantity: z.number().min(0, "Received quantity cannot be negative"),
  acceptedQuantity: z.number().min(0, "Accepted quantity cannot be negative"),
  rejectedQuantity: z.number().min(0).default(0),
  damagedQuantity: z.number().min(0).default(0),
  shortQuantity: z.number().min(0).default(0),
  rejectionReason: z.string().optional().or(z.literal("")),
});

export const createGoodsReceiptSchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase Order selection is required"),
  destinationWarehouseId: z.string().optional().or(z.literal("")),
  deliveryReference: z.string().optional().or(z.literal("")),
  receivedDate: z.string().or(z.date()).optional(),
  notes: z.string().optional().or(z.literal("")),
  items: z.array(createGoodsReceiptItemSchema).min(1, "At least one received item is required"),
});

export const revisePurchaseOrderSchema = z.object({
  revisionReason: z.string().min(3, "Reason for PO revision is required"),
  items: z.array(createPurchaseOrderItemSchema).min(1, "At least one item is required in revised PO"),
  expectedDeliveryDate: z.string().optional().or(z.literal("")),
  paymentTermsKey: z.string().optional(),
  discount: z.number().min(0).default(0),
  tax: z.number().min(0).default(0),
  shippingCharges: z.number().min(0).default(0),
  notes: z.string().optional().or(z.literal("")),
});

export const threeWayMatchItemSchema = z.object({
  purchaseOrderItemId: z.string().min(1, "Purchase order item is required"),
  invoicedQuantity: z.number().positive("Invoiced quantity must be greater than 0"),
  invoicedRate: z.number().positive("Invoiced rate must be greater than 0"),
  notes: z.string().optional(),
});

export const threeWayMatchSchema = z.object({
  purchaseOrderId: z.string().min(1, "Purchase Order selection is required"),
  goodsReceiptId: z.string().optional().or(z.literal("")),
  vendorInvoiceNo: z.string().min(1, "Vendor Invoice number is required"),
  vendorInvoiceDate: z.string().or(z.date()).optional(),
  invoicedTotal: z.number().positive("Invoiced total must be positive"),
  items: z.array(threeWayMatchItemSchema).min(1, "At least one item is required for 3-way match"),
  createPayableOnSuccess: z.boolean().default(true),
  notes: z.string().optional().or(z.literal("")),
});

export type CreateMaterialRequestInput = z.infer<typeof createMaterialRequestSchema>;
export type CreatePurchaseOrderInput = z.infer<typeof createPurchaseOrderSchema>;
export type RevisePurchaseOrderInput = z.infer<typeof revisePurchaseOrderSchema>;
export type CreateGoodsReceiptInput = z.infer<typeof createGoodsReceiptSchema>;
export type ThreeWayMatchInput = z.infer<typeof threeWayMatchSchema>;
export type ThreeWayMatchItemInput = z.infer<typeof threeWayMatchItemSchema>;

