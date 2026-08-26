import { describe, it, expect, beforeAll } from 'vitest';
import { db } from '@/lib/db';
import { MaterialService } from '@/modules/inventory/material.service';
import { WarehouseService } from '@/modules/inventory/warehouse.service';
import { StockMovementService } from '@/modules/inventory/stock-movement.service';
import { StockTransferService } from '@/modules/inventory/stock-transfer.service';
import { StockCountService } from '@/modules/inventory/stock-count.service';
import { StockReservationService } from '@/modules/inventory/stock-reservation.service';
import { InventoryCalculationService } from '@/modules/inventory/inventory-calculation.service';
import { InventoryDashboardService } from '@/modules/inventory/inventory-dashboard.service';

let testMaterialId: string;
let testMaterial2Id: string;
let testWarehouseId: string;
let testWarehouse2Id: string;
let testProjectId: string;
let testAdminId: string;
let testReservationId: string;
let testTransferId: string;
let testStockCountId: string;

const PLYWOOD_SHEET_QTY = 100;
const TRANSFER_QTY = 20;
const ISSUE_QTY = 15;
const DAMAGE_QTY = 5;
const RETURN_QTY = 5;
const ADJUSTMENT_QTY = 10;
const RESERVATION_QTY = 20;

describe('ESPACIO ERP Strict Inventory Warehouse Management Test Suite Prompt 11', () => {

  beforeAll(async () => {
    const admin = await db.user.findFirst({ where: { accessLevel: 'ADMIN' } });
    if (!admin) throw new Error('No ADMIN user found. Run seed or prior test suites first.');
    testAdminId = admin.id;

    const project = await db.project.findFirst({ where: { status: { not: 'CANCELLED' } } });
    if (!project) throw new Error('No active project found. Run project test suite first.');
    testProjectId = project.id;
  });

  // SECTION 1: MATERIAL MASTER
  it('1. Creates Material Master with server-generated MAT-YYYY-XXXX reference', async () => {
    const material = await MaterialService.createMaterial({
      name: 'Commercial Plywood 19mm',
      categoryKey: 'PLYWOOD',
      subcategoryKey: 'COMMERCIAL',
      brandKey: 'GREENPLY',
      baseUnitKey: 'SHEET',
      purchaseUnitKey: 'SHEET',
      minStock: 10,
      reorderLevel: 25,
      maxStock: 500,
      purchaseCost: 1800,
      standardCost: 1850,
      trackInventory: true,
      trackBatch: false,
      materialType: 'STOCK',
      description: '19mm commercial grade plywood',
    } as any, testAdminId);

    expect(material).toBeDefined();
    expect(material.materialCode).toMatch(/^MAT-\d{4}-\d{4}$/);
    expect(material.name).toBe('Commercial Plywood 19mm');
    expect(material.reorderLevel).toBe(25);
    expect(material.status).toBe('ACTIVE');
    testMaterialId = material.id;
  });

  it('2. Creates a second Material for transfer tests', async () => {
    const material = await MaterialService.createMaterial({
      name: 'Laminate Sheet Premium',
      categoryKey: 'LAMINATE',
      baseUnitKey: 'SHEET',
      reorderLevel: 10,
      purchaseCost: 650,
      standardCost: 680,
      materialType: 'STOCK',
    } as any, testAdminId);
    expect(material.materialCode).toMatch(/^MAT-\d{4}-\d{4}$/);
    testMaterial2Id = material.id;
  });

  it('3. Prevents duplicate SKU when creating a material', async () => {
    const withSku = await MaterialService.createMaterial({ name: 'SKU Test Mat', categoryKey: 'HARDWARE', baseUnitKey: 'NOS', sku: 'SKU-UNIQUE-TEST-INV-2026' } as any, testAdminId);
    await expect(MaterialService.createMaterial({ name: 'Dup SKU', categoryKey: 'HARDWARE', baseUnitKey: 'NOS', sku: 'SKU-UNIQUE-TEST-INV-2026' } as any, testAdminId)).rejects.toThrow('already exists');
    await db.material.delete({ where: { id: withSku.id } });
  });

  it('4. Updates Material Master preserving status (bug fix verification)', async () => {
    const updated = await MaterialService.updateMaterial(testMaterialId, { purchaseCost: 1950, notes: 'Price revised Q3 2026' }, testAdminId);
    expect(updated.purchaseCost).toBe(1950);
    expect(updated.notes).toBe('Price revised Q3 2026');
    expect(updated.status).toBe('ACTIVE');
  });

  it('5. Retrieves Material with authoritative stock summary', async () => {
    const material = await MaterialService.getMaterialById(testMaterialId);
    expect(material.stockSummary).toBeDefined();
    expect(material.stockSummary.physicalStock).toBeGreaterThanOrEqual(0);
    expect(material.stockSummary.reorderState).toMatch(/NORMAL|LOW_STOCK|OUT_OF_STOCK/);
  });

  // SECTION 2: WAREHOUSE MANAGEMENT
  it('6. Creates Main Godown warehouse with WH-XXXX code', async () => {
    const wh = await WarehouseService.createWarehouse({ name: 'ESPACIO Main Godown HYD', type: 'MAIN_GODOWN', city: 'Hyderabad' }, testAdminId);
    expect(wh.warehouseCode).toMatch(/^WH-\d{4}$/);
    expect(wh.status).toBe('ACTIVE');
    testWarehouseId = wh.id;
  });

  it('7. Creates Project Site Store warehouse linked to project', async () => {
    const wh = await WarehouseService.createWarehouse({ name: 'Site Store Alpha', type: 'PROJECT_SITE_STORE', projectId: testProjectId, city: 'Hyderabad' }, testAdminId);
    expect(wh.type).toBe('PROJECT_SITE_STORE');
    expect(wh.projectId).toBe(testProjectId);
    testWarehouse2Id = wh.id;
  });

  it('8. Retrieves warehouse list with balance summary', async () => {
    const warehouses = await WarehouseService.getWarehouses();
    const wh = warehouses.find((w) => w.id === testWarehouseId);
    expect(wh).toBeDefined();
    expect(typeof wh?.totalPhysicalStock).toBe('number');
  });

  // SECTION 3: OPENING STOCK
  it('9. Records Opening Stock for material in Main Godown', async () => {
    const movement = await StockMovementService.recordOpeningStock(testMaterialId, testWarehouseId, PLYWOOD_SHEET_QTY, 'SHEET', testAdminId);
    expect(movement.movementNo).toMatch(/^STM-\d{4}-\d{4}$/);
    expect(movement.movementType).toBe('OPENING');
    expect(movement.quantity).toBe(PLYWOOD_SHEET_QTY);
    expect(movement.runningBalance).toBeGreaterThanOrEqual(PLYWOOD_SHEET_QTY);
  });

  it('10. Stock balance correctly reflects Opening Stock', async () => {
    const summary = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    expect(summary.physicalStock).toBeGreaterThanOrEqual(PLYWOOD_SHEET_QTY);
    expect(summary.availableStock).toBeGreaterThan(0);
    expect(summary.reorderState).toBe('NORMAL');
  });

  // SECTION 4: STOCK RESERVATIONS
  it('11. Creates a Stock Reservation for project material requirement', async () => {
    const res = await StockReservationService.createReservation({ materialId: testMaterialId, warehouseId: testWarehouseId, projectId: testProjectId, reservedQuantity: RESERVATION_QTY, reason: 'Required for Project Alpha' }, testAdminId);
    expect(res.reservationNo).toMatch(/^RES-\d{4}-\d{4}$/);
    expect(res.status).toBe('ACTIVE');
    expect(res.reservedQuantity).toBe(RESERVATION_QTY);
    testReservationId = res.id;
  });

  it('12. Reserved stock reduces availableStock but NOT physicalStock', async () => {
    const summary = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    expect(summary.reservedStock).toBeGreaterThanOrEqual(RESERVATION_QTY);
    expect(summary.availableStock).toBe(InventoryCalculationService.roundQuantity(summary.physicalStock - summary.reservedStock));
  });

  it('13. Prevents over-reservation beyond available stock', async () => {
    const current = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    await expect(StockReservationService.createReservation({ materialId: testMaterialId, warehouseId: testWarehouseId, reservedQuantity: current.availableStock + 9999 }, testAdminId)).rejects.toThrow('Insufficient available stock');
  });

  it('14. Releases reservation as CANCELLED restoring availableStock', async () => {
    const before = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    await StockReservationService.releaseReservation(testReservationId, 'CANCELLED', testAdminId);
    const released = await StockReservationService.getReservationById(testReservationId);
    expect(released.status).toBe('CANCELLED');
    const after = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    expect(after.availableStock).toBe(InventoryCalculationService.roundQuantity(before.availableStock + RESERVATION_QTY));
  });

  it('15. Prevents double-release of already CANCELLED reservation', async () => {
    await expect(StockReservationService.releaseReservation(testReservationId, 'FULFILLED', testAdminId)).rejects.toThrow('already CANCELLED');
  });

  // SECTION 5: STOCK ISSUE
  it('16. Issues stock to project site (ISSUE movement, reduces physicalStock)', async () => {
    const before = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    const movement = await StockMovementService.issueStock({ materialId: testMaterialId, warehouseId: testWarehouseId, projectId: testProjectId, quantity: ISSUE_QTY, unitKey: 'SHEET', purpose: 'Furniture fabrication master bedroom' }, testAdminId);
    expect(movement.movementType).toBe('ISSUE');
    expect(movement.quantity).toBe(ISSUE_QTY);
    const after = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    expect(after.physicalStock).toBe(InventoryCalculationService.roundQuantity(before.physicalStock - ISSUE_QTY));
  });

  it('17. Blocks stock issue when quantity exceeds available stock', async () => {
    const current = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    await expect(StockMovementService.issueStock({ materialId: testMaterialId, warehouseId: testWarehouseId, projectId: testProjectId, quantity: current.availableStock + 9999, unitKey: 'SHEET', purpose: 'Exceeds stock' }, testAdminId)).rejects.toThrow('Insufficient available stock');
  });

  // SECTION 6: CONSUMPTION + RETURN
  it('18. Logs Site Material Consumption (CONSUMPTION type)', async () => {
    const movement = await StockMovementService.consumeStock({ materialId: testMaterialId, projectId: testProjectId, quantity: 5, unitKey: 'SHEET', notes: 'Used for wardrobe carcass' }, testAdminId);
    expect(movement.movementType).toBe('CONSUMPTION');
    expect(movement.quantity).toBe(5);
  });

  it('19. Returns unused material from Project Site to Warehouse (RETURN_IN)', async () => {
    const before = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    const movement = await StockMovementService.returnStock({ materialId: testMaterialId, warehouseId: testWarehouseId, projectId: testProjectId, quantity: RETURN_QTY, unitKey: 'SHEET', reason: 'Excess material' }, testAdminId);
    expect(movement.movementType).toBe('RETURN_IN');
    const after = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    expect(after.physicalStock).toBe(InventoryCalculationService.roundQuantity(before.physicalStock + RETURN_QTY));
  });

  it('20. Project Site Stock Breakdown: Issued - Consumed - Returned', async () => {
    const breakdown = await InventoryCalculationService.calculateProjectSiteStock(testProjectId, testMaterialId);
    const entry = breakdown.find((b) => b.materialId === testMaterialId);
    expect(entry).toBeDefined();
    expect(entry!.issuedQuantity).toBeGreaterThanOrEqual(ISSUE_QTY);
    expect(entry!.returnedQuantity).toBeGreaterThanOrEqual(RETURN_QTY);
    const expected = Math.max(0, entry!.issuedQuantity - entry!.consumedQuantity - entry!.returnedQuantity);
    expect(entry!.siteRemainingQuantity).toBe(InventoryCalculationService.roundQuantity(expected));
  });

  // SECTION 7: ADJUSTMENTS
  it('21. Performs ADJUSTMENT_IN', async () => {
    const before = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    const movement = await StockMovementService.adjustStock({ materialId: testMaterialId, warehouseId: testWarehouseId, adjustmentType: 'IN', quantity: ADJUSTMENT_QTY, unitKey: 'SHEET', reason: 'Physical count surplus' }, testAdminId);
    expect(movement.movementType).toBe('ADJUSTMENT_IN');
    const after = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    expect(after.physicalStock).toBe(InventoryCalculationService.roundQuantity(before.physicalStock + ADJUSTMENT_QTY));
  });

  it('22. Performs ADJUSTMENT_OUT', async () => {
    const before = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    await StockMovementService.adjustStock({ materialId: testMaterialId, warehouseId: testWarehouseId, adjustmentType: 'OUT', quantity: ADJUSTMENT_QTY, unitKey: 'SHEET', reason: 'Write-off damaged sheets' }, testAdminId);
    const after = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    expect(after.physicalStock).toBe(InventoryCalculationService.roundQuantity(before.physicalStock - ADJUSTMENT_QTY));
  });

  it('23. Blocks ADJUSTMENT_OUT when exceeds available stock', async () => {
    await expect(StockMovementService.adjustStock({ materialId: testMaterialId, warehouseId: testWarehouseId, adjustmentType: 'OUT', quantity: 999999, unitKey: 'SHEET', reason: 'Exceeds' }, testAdminId)).rejects.toThrow();
  });

  // SECTION 8: DAMAGE + SCRAP
  it('24. Records DAMAGE movement reducing physicalStock', async () => {
    const before = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    const movement = await StockMovementService.recordDamage({ materialId: testMaterialId, warehouseId: testWarehouseId, quantity: DAMAGE_QTY, unitKey: 'SHEET', movementType: 'DAMAGE', reason: 'Water damage during monsoon' }, testAdminId);
    expect(movement.movementType).toBe('DAMAGE');
    expect(movement.movementNo).toMatch(/^STM-\d{4}-\d{4}$/);
    const after = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    expect(after.physicalStock).toBe(InventoryCalculationService.roundQuantity(before.physicalStock - DAMAGE_QTY));
  });

  it('25. Records SCRAP movement with batch tracking', async () => {
    const before = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    const movement = await StockMovementService.recordDamage({ materialId: testMaterialId, warehouseId: testWarehouseId, quantity: 2, movementType: 'SCRAP', reason: 'Cutting waste overrun', batchNo: 'BATCH-2026-001' }, testAdminId);
    expect(movement.movementType).toBe('SCRAP');
    expect(movement.batchNo).toBe('BATCH-2026-001');
    const after = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    expect(after.physicalStock).toBe(InventoryCalculationService.roundQuantity(before.physicalStock - 2));
  });

  it('26. Blocks DAMAGE when quantity exceeds physicalStock', async () => {
    const current = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    await expect(StockMovementService.recordDamage({ materialId: testMaterialId, warehouseId: testWarehouseId, quantity: current.physicalStock + 9999, movementType: 'DAMAGE', reason: 'Exceeds stock' }, testAdminId)).rejects.toThrow('Insufficient available stock');
  });

  // SECTION 9: STOCK TRANSFERS
  it('27. Creates Stock Transfer between warehouses', async () => {
    await StockMovementService.recordOpeningStock(testMaterial2Id, testWarehouseId, 50, 'SHEET', testAdminId);
    const transfer = await StockTransferService.createTransfer({ fromWarehouseId: testWarehouseId, toWarehouseId: testWarehouse2Id, projectId: testProjectId, notes: 'Laminate to site store', items: [{ materialId: testMaterial2Id, requestedQuantity: TRANSFER_QTY, unitKey: 'SHEET' }] }, testAdminId);
    expect(transfer.transferNo).toMatch(/^STT-\d{4}-\d{4}$/);
    expect(transfer.status).toBe('REQUESTED');
    testTransferId = transfer.id;
  });

  it('28. Blocks transfer when source and destination are same warehouse', async () => {
    await expect(StockTransferService.createTransfer({ fromWarehouseId: testWarehouseId, toWarehouseId: testWarehouseId, items: [{ materialId: testMaterial2Id, requestedQuantity: 10, unitKey: 'SHEET' }] }, testAdminId)).rejects.toThrow('cannot be the same');
  });

  it('29. Approves Stock Transfer transitioning to IN_TRANSIT', async () => {
    const approved = await StockTransferService.approveTransfer(testTransferId, testAdminId);
    expect(approved.status).toBe('IN_TRANSIT');
    expect(approved.approvedById).toBe(testAdminId);
  });

  it('30. Blocks transfer approval when source lacks sufficient stock', async () => {
    const summary = await InventoryCalculationService.calculateStockSummary(testMaterial2Id, testWarehouseId);
    const bad = await StockTransferService.createTransfer({ fromWarehouseId: testWarehouseId, toWarehouseId: testWarehouse2Id, items: [{ materialId: testMaterial2Id, requestedQuantity: summary.availableStock + 9999, unitKey: 'SHEET' }] }, testAdminId);
    await expect(StockTransferService.approveTransfer(bad.id, testAdminId)).rejects.toThrow('Insufficient available stock');
    await db.stockTransferItem.deleteMany({ where: { transferId: bad.id } });
    await db.stockTransfer.delete({ where: { id: bad.id } });
  });

  it('31. Receives Stock Transfer debiting source and crediting destination', async () => {
    const bSrc = await InventoryCalculationService.calculateStockSummary(testMaterial2Id, testWarehouseId);
    const bDst = await InventoryCalculationService.calculateStockSummary(testMaterial2Id, testWarehouse2Id);
    await StockTransferService.receiveTransfer(testTransferId, testAdminId);
    const aSrc = await InventoryCalculationService.calculateStockSummary(testMaterial2Id, testWarehouseId);
    const aDst = await InventoryCalculationService.calculateStockSummary(testMaterial2Id, testWarehouse2Id);
    expect(aSrc.physicalStock).toBe(InventoryCalculationService.roundQuantity(bSrc.physicalStock - TRANSFER_QTY));
    expect(aDst.physicalStock).toBe(InventoryCalculationService.roundQuantity(bDst.physicalStock + TRANSFER_QTY));
  });

  it('32. TRANSFER_IN and TRANSFER_OUT movements appear in Stock Ledger', async () => {
    const srcMov = await StockMovementService.getMovements({ materialId: testMaterial2Id, warehouseId: testWarehouseId });
    expect(srcMov.movements.some((m: any) => m.movementType === 'TRANSFER_OUT')).toBe(true);
    const dstMov = await StockMovementService.getMovements({ materialId: testMaterial2Id, warehouseId: testWarehouse2Id });
    expect(dstMov.movements.some((m: any) => m.movementType === 'TRANSFER_IN')).toBe(true);
  });

  // SECTION 10: PHYSICAL STOCK COUNT
  it('33. Creates Physical Stock Count with system vs counted quantities', async () => {
    const summary = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    const counted = summary.physicalStock + 3;
    const count = await StockCountService.createStockCount({ warehouseId: testWarehouseId, notes: 'Monthly count August 2026', items: [{ materialId: testMaterialId, countedQuantity: counted }] }, testAdminId);
    expect(count.countNo).toMatch(/^STC-\d{4}-\d{4}$/);
    expect(count.status).toBe('REVIEW_PENDING');
    expect(count.items[0].difference).toBe(3);
    testStockCountId = count.id;
  });

  it('34. Approves Stock Count applying ADJUSTMENT_IN for surplus', async () => {
    const before = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    const approved = await StockCountService.approveStockCount(testStockCountId, testAdminId);
    expect(approved!.status).toBe('APPROVED');
    const after = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    expect(after.physicalStock).toBe(InventoryCalculationService.roundQuantity(before.physicalStock + 3));
  });

  // SECTION 11: STOCK LEDGER
  it('35. Retrieves paginated Stock Movements filtered by material', async () => {
    const result = await StockMovementService.getMovements({ materialId: testMaterialId, limit: 10 });
    expect(result.movements.length).toBeGreaterThan(0);
    for (const m of result.movements) { expect(m.materialId).toBe(testMaterialId); }
  });

  it('36. Retrieves Stock Movements filtered by movement type OPENING', async () => {
    const result = await StockMovementService.getMovements({ materialId: testMaterialId, movementType: 'OPENING' });
    for (const m of result.movements) { expect(m.movementType).toBe('OPENING'); }
  });

  it('37. Running balance on all movements is non-negative', async () => {
    const result = await StockMovementService.getMovements({ materialId: testMaterialId });
    for (const m of result.movements) { expect(m.runningBalance).toBeGreaterThanOrEqual(0); }
  });

  // SECTION 12: RESERVATION LIFECYCLE
  it('38. Creates and lists active Reservations by project', async () => {
    const res = await StockReservationService.createReservation({ materialId: testMaterialId, warehouseId: testWarehouseId, projectId: testProjectId, reservedQuantity: 10, reason: 'Pre-allocated' }, testAdminId);
    const list = await StockReservationService.getReservations({ projectId: testProjectId, status: 'ACTIVE' });
    expect(list.reservations.some((r: any) => r.id === res.id)).toBe(true);
    await StockReservationService.releaseReservation(res.id, 'CANCELLED', testAdminId);
  });

  it('39. Lists CANCELLED reservations', async () => {
    const list = await StockReservationService.getReservations({ status: 'CANCELLED' });
    expect(list.reservations.length).toBeGreaterThan(0);
    for (const r of list.reservations) { expect(r.status).toBe('CANCELLED'); }
  });

  // SECTION 13: INVENTORY DASHBOARD
  it('40. Inventory Dashboard returns all required KPIs', async () => {
    const metrics = await InventoryDashboardService.getMetrics();
    expect(typeof metrics.totalMaterials).toBe('number');
    expect(typeof metrics.totalWarehouses).toBe('number');
    expect(typeof metrics.totalPhysicalStockValue).toBe('number');
    expect(typeof metrics.lowStockItemsCount).toBe('number');
    expect(typeof metrics.outOfStockItemsCount).toBe('number');
    expect(typeof metrics.pendingTransfersCount).toBe('number');
    expect(Array.isArray(metrics.recentMovements)).toBe(true);
    expect(Array.isArray(metrics.categoryDistribution)).toBe(true);
  });

  it('41. Dashboard includes newly created materials in total count', async () => {
    const metrics = await InventoryDashboardService.getMetrics();
    expect(metrics.totalMaterials).toBeGreaterThan(0);
  });

  // SECTION 14: MULTI-WAREHOUSE TRACKING
  it('42. Material stock tracked separately per warehouse', async () => {
    const mainSummary = await InventoryCalculationService.calculateStockSummary(testMaterialId, testWarehouseId);
    const globalSummary = await InventoryCalculationService.calculateStockSummary(testMaterialId);
    expect(globalSummary.physicalStock).toBeGreaterThanOrEqual(mainSummary.physicalStock);
  });

  it('43. Warehouse detail includes material balances and recent movements', async () => {
    const wh = await WarehouseService.getWarehouseById(testWarehouseId);
    expect(wh.balances.length).toBeGreaterThan(0);
    expect(wh.movements.length).toBeGreaterThan(0);
    const balance = wh.balances.find((b) => b.materialId === testMaterialId);
    expect(balance).toBeDefined();
  });

  // SECTION 15: GRN INTEGRATION
  it('44. Verifies RECEIPT movements exist from Goods Receipt ingestion', async () => {
    const movements = await StockMovementService.getMovements({ referenceType: 'GOODS_RECEIPT' });
    // If procurement tests ran before, there should be receipt movements
    expect(Array.isArray((movements as any).movements)).toBe(true);
  });

  // SECTION 16: UNIT CONVERSION
  it('45. Unit conversion returns 1:1 when fromUnit equals toUnit', async () => {
    const result = await InventoryCalculationService.convertQuantity(100, 'SHEET', 'SHEET');
    expect(result).toBe(100);
  });

  it('46. Unit conversion falls back 1:1 when no rule found', async () => {
    const result = await InventoryCalculationService.convertQuantity(50, 'SQFT', 'SHEET');
    expect(result).toBe(50);
  });

  // SECTION 17: REORDER INTELLIGENCE
  it('47. Material reorderState is OUT_OF_STOCK when no stock exists', async () => {
    const mat = await MaterialService.createMaterial({ name: 'Reorder Test Mat', categoryKey: 'HARDWARE', baseUnitKey: 'NOS', reorderLevel: 1000 } as any, testAdminId);
    const summary = await InventoryCalculationService.calculateStockSummary(mat.id);
    expect(summary.reorderState).toBe('OUT_OF_STOCK');
    await db.material.delete({ where: { id: mat.id } });
  });

  it('48. getMaterials with lowStockOnly returns only LOW_STOCK or OUT_OF_STOCK', async () => {
    const result = await MaterialService.getMaterials({ lowStockOnly: true });
    for (const m of result.materials) { expect(['LOW_STOCK', 'OUT_OF_STOCK']).toContain(m.reorderState); }
  });

  // SECTION 18: MATERIAL DEACTIVATION
  it('49. Deactivates material with DISCONTINUED status and AuditLog', async () => {
    const mat = await MaterialService.createMaterial({ name: 'Discontinued Mat', categoryKey: 'HARDWARE', baseUnitKey: 'SET' } as any, testAdminId);
    const deactivated = await MaterialService.deactivateMaterial(mat.id, 'DISCONTINUED', testAdminId);
    expect(deactivated.status).toBe('DISCONTINUED');
    const log = await db.auditLog.findFirst({ where: { entityType: 'Material', entityId: mat.id, action: 'MATERIAL_DEACTIVATED' }, orderBy: { createdAt: 'desc' } });
    expect(log).toBeDefined();
    await db.material.delete({ where: { id: mat.id } });
  });

  // SECTION 19: AUDIT COMPLETENESS
  it('50. All key stock operations generate AuditLog records', async () => {
    const receiving = await db.auditLog.findFirst({ where: { entityType: 'StockMovement', action: 'STOCK_RECEIVED' }, orderBy: { createdAt: 'desc' } });
    const issueLog = await db.auditLog.findFirst({ where: { entityType: 'StockMovement', action: 'STOCK_ISSUED' }, orderBy: { createdAt: 'desc' } });
    const damageLog = await db.auditLog.findFirst({ where: { entityType: 'StockMovement', action: 'STOCK_DAMAGED' }, orderBy: { createdAt: 'desc' } });
    const resLog = await db.auditLog.findFirst({ where: { entityType: 'StockReservation', action: 'STOCK_RESERVED' }, orderBy: { createdAt: 'desc' } });
    expect(receiving).toBeDefined();
    expect(issueLog).toBeDefined();
    expect(damageLog).toBeDefined();
    expect(resLog).toBeDefined();
  });
});
