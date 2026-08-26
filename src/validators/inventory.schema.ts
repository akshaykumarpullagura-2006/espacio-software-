import { z } from "zod";

export const createMaterialSchema = z.object({
  name: z.string().min(2, "Material name must be at least 2 characters"),
  sku: z.string().optional(),
  categoryKey: z.string().min(1, "Category is required"),
  subcategoryKey: z.string().optional(),
  brandKey: z.string().optional(),
  description: z.string().optional(),
  modelVariant: z.string().optional(),
  baseUnitKey: z.string().default("NOS"),
  purchaseUnitKey: z.string().optional(),
  saleUnitKey: z.string().optional(),
  minStock: z.number().min(0).default(0),
  reorderLevel: z.number().min(0).default(0),
  maxStock: z.number().min(0).optional(),
  purchaseCost: z.number().min(0).default(0),
  standardCost: z.number().min(0).default(0),
  sellingPrice: z.number().min(0).optional(),
  trackInventory: z.boolean().default(true),
  trackBatch: z.boolean().default(false),
  trackSerial: z.boolean().default(false),
  materialType: z.enum(["STOCK", "CONSUMABLE", "SERVICE", "NON_STOCK"]).default("STOCK"),
  defaultVendorId: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateMaterialInput = z.infer<typeof createMaterialSchema>;

export const createWarehouseSchema = z.object({
  name: z.string().min(2, "Warehouse name must be at least 2 characters"),
  type: z.enum(["MAIN_GODOWN", "OFFICE_STORE", "PROJECT_SITE_STORE", "TRANSIT_STORE"]).default("MAIN_GODOWN"),
  address: z.string().optional(),
  city: z.string().optional(),
  managerUserId: z.string().optional(),
  projectId: z.string().optional(),
  notes: z.string().optional(),
});

export type CreateWarehouseInput = z.infer<typeof createWarehouseSchema>;

export const issueStockSchema = z.object({
  materialId: z.string().min(1, "Material selection is required"),
  warehouseId: z.string().min(1, "Source warehouse is required"),
  projectId: z.string().min(1, "Target project is required"),
  quantity: z.number().positive("Quantity must be positive"),
  unitKey: z.string().default("NOS"),
  purpose: z.string().min(2, "Purpose or site location is required"),
  notes: z.string().optional(),
});

export type IssueStockInput = z.infer<typeof issueStockSchema>;

export const consumeStockSchema = z.object({
  materialId: z.string().min(1, "Material selection is required"),
  projectId: z.string().min(1, "Project selection is required"),
  quantity: z.number().positive("Quantity consumed must be positive"),
  unitKey: z.string().default("NOS"),
  notes: z.string().optional(),
});

export type ConsumeStockInput = z.infer<typeof consumeStockSchema>;

export const returnStockSchema = z.object({
  materialId: z.string().min(1, "Material selection is required"),
  projectId: z.string().min(1, "Source project is required"),
  warehouseId: z.string().min(1, "Destination warehouse is required"),
  quantity: z.number().positive("Returned quantity must be positive"),
  unitKey: z.string().default("NOS"),
  reason: z.string().min(2, "Return reason is required"),
  notes: z.string().optional(),
});

export type ReturnStockInput = z.infer<typeof returnStockSchema>;

export const adjustStockSchema = z.object({
  materialId: z.string().min(1, "Material is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  adjustmentType: z.enum(["IN", "OUT"]),
  quantity: z.number().positive("Quantity must be positive"),
  unitKey: z.string().default("NOS"),
  reason: z.string().min(3, "Reason for stock adjustment is required"),
  notes: z.string().optional(),
});

export type AdjustStockInput = z.infer<typeof adjustStockSchema>;

export const createStockTransferSchema = z.object({
  fromWarehouseId: z.string().min(1, "Source warehouse is required"),
  toWarehouseId: z.string().min(1, "Destination warehouse is required"),
  projectId: z.string().optional(),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      materialId: z.string().min(1, "Material is required"),
      requestedQuantity: z.number().positive("Quantity must be positive"),
      unitKey: z.string().default("NOS"),
    })
  ).min(1, "At least one transfer item is required"),
});

export type CreateStockTransferInput = z.infer<typeof createStockTransferSchema>;

export const createStockReservationSchema = z.object({
  materialId: z.string().min(1, "Material is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  projectId: z.string().optional(),
  reservedQuantity: z.number().positive("Reserved quantity must be positive"),
  reason: z.string().optional(),
});

export type CreateStockReservationInput = z.infer<typeof createStockReservationSchema>;

export const createStockCountSchema = z.object({
  warehouseId: z.string().min(1, "Warehouse is required"),
  notes: z.string().optional(),
  items: z.array(
    z.object({
      materialId: z.string().min(1, "Material is required"),
      countedQuantity: z.number().min(0, "Counted quantity cannot be negative"),
      notes: z.string().optional(),
    })
  ).min(1, "At least one item count is required"),
});

export type CreateStockCountInput = z.infer<typeof createStockCountSchema>;

export const recordDamageSchema = z.object({
  materialId: z.string().min(1, "Material is required"),
  warehouseId: z.string().min(1, "Warehouse is required"),
  movementType: z.enum(["DAMAGE", "SCRAP"]).default("DAMAGE"),
  quantity: z.number().positive("Quantity must be positive"),
  unitKey: z.string().optional(),
  reason: z.string().min(5, "A reason for damage/scrap is required (min 5 chars)"),
  notes: z.string().optional(),
  batchNo: z.string().optional(),
});

export type RecordDamageInput = z.infer<typeof recordDamageSchema>;

export const releaseReservationSchema = z.object({
  resolution: z.enum(["FULFILLED", "CANCELLED"]),
});

export type ReleaseReservationInput = z.infer<typeof releaseReservationSchema>;

export const updateMaterialSchema = createMaterialSchema.partial();

export type UpdateMaterialInput = z.infer<typeof updateMaterialSchema>;
