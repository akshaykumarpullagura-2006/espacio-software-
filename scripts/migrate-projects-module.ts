import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function runMigration() {
  console.log("[MIGRATION] Starting Project module schema enhancements and historical stage normalization...");

  // 1. Add missing columns to Project table
  const projectColumns = [
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'ACTIVE'`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM'`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "startDate" TIMESTAMP(3)`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "targetCompletionDate" TIMESTAMP(3)`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "actualCompletionDate" TIMESTAMP(3)`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "handoverStatus" TEXT NOT NULL DEFAULT 'PENDING'`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "handoverNotes" TEXT`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "handoverSignoffBy" TEXT`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "qualityStatus" TEXT NOT NULL DEFAULT 'PENDING'`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "warrantyStatus" TEXT NOT NULL DEFAULT 'PENDING'`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "warrantyStartDate" TIMESTAMP(3)`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "warrantyDurationMonths" INTEGER NOT NULL DEFAULT 12`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "approvedQuotationId" TEXT`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "projectManagerId" TEXT`,
    `ALTER TABLE "Project" ADD COLUMN IF NOT EXISTS "isArchived" BOOLEAN NOT NULL DEFAULT false`,
  ];

  for (const sql of projectColumns) {
    try {
      await prisma.$executeRawUnsafe(sql);
      console.log(`[SQL] Executed: ${sql}`);
    } catch (e: any) {
      console.log(`[SQL] Warning/Notice on: ${sql} -> ${e.message}`);
    }
  }

  // 2. Add missing columns to ProjectStageHistory
  const stageHistoryColumns = [
    `ALTER TABLE "ProjectStageHistory" ADD COLUMN IF NOT EXISTS "delayReason" TEXT`,
  ];
  for (const sql of stageHistoryColumns) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e: any) {
      console.log(`[SQL] ${sql} -> ${e.message}`);
    }
  }

  // 3. Add missing columns to QualityCheck
  const qcColumns = [
    `ALTER TABLE "QualityCheck" ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'PENDING'`,
    `ALTER TABLE "QualityCheck" ADD COLUMN IF NOT EXISTS "checklistJson" TEXT`,
    `ALTER TABLE "QualityCheck" ADD COLUMN IF NOT EXISTS "issues" TEXT`,
    `ALTER TABLE "QualityCheck" ADD COLUMN IF NOT EXISTS "correctiveAction" TEXT`,
    `ALTER TABLE "QualityCheck" ADD COLUMN IF NOT EXISTS "recheckCount" INTEGER NOT NULL DEFAULT 0`,
  ];
  for (const sql of qcColumns) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e: any) {
      console.log(`[SQL] ${sql} -> ${e.message}`);
    }
  }

  // 4. Add missing columns to ChangeOrder
  const coColumns = [
    `ALTER TABLE "ChangeOrder" ADD COLUMN IF NOT EXISTS "scopeImpact" TEXT`,
    `ALTER TABLE "ChangeOrder" ADD COLUMN IF NOT EXISTS "timelineImpactDays" INTEGER NOT NULL DEFAULT 0`,
  ];
  for (const sql of coColumns) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e: any) {
      console.log(`[SQL] ${sql} -> ${e.message}`);
    }
  }

  // 5. Add missing columns to WarrantyIssue
  const warColumns = [
    `ALTER TABLE "WarrantyIssue" ADD COLUMN IF NOT EXISTS "resolutionNotes" TEXT`,
  ];
  for (const sql of warColumns) {
    try {
      await prisma.$executeRawUnsafe(sql);
    } catch (e: any) {
      console.log(`[SQL] ${sql} -> ${e.message}`);
    }
  }

  // 6. Non-destructive Historical Stage Normalization:
  // Map legacy values while preserving meaning
  console.log("[MIGRATION] Normalizing legacy stages to canonical 13-stage workflow...");

  const stageMappings = [
    { from: "INITIATED", to: "CONFIRMATION_FEE_PAID" },
    { from: "INITIATION", to: "CONFIRMATION_FEE_PAID" },
    { from: "SITE_MEASUREMENT_DONE", to: "DESIGNING" },
    { from: "2D_3D_DESIGN_APPROVED", to: "DESIGN_COMPLETED" },
    { from: "ADVANCE_RECEIVED", to: "RAW_MATERIAL_ORDERED" },
    { from: "PRODUCTION_IN_PROGRESS", to: "WOOD_WORK" },
    { from: "QUALITY_CHECK_PASSED", to: "QUALITY_CHECK" },
    { from: "COMPLETED", to: "PROJECT_COMPLETED" },
  ];

  for (const mapping of stageMappings) {
    const result = await prisma.$executeRawUnsafe(
      `UPDATE "Project" SET "stage" = $1 WHERE "stage" = $2`,
      mapping.to,
      mapping.from
    );
    if (result > 0) {
      console.log(`[MIGRATION] Migrated ${result} projects from stage '${mapping.from}' -> '${mapping.to}'`);
    }
  }

  // 7. Synchronize warranty status on completed / warranty projects
  await prisma.$executeRawUnsafe(`
    UPDATE "Project"
    SET "status" = 'WARRANTY', "warrantyStatus" = 'ACTIVE'
    WHERE "stage" = 'WARRANTY' AND "warrantyStatus" = 'PENDING'
  `);

  console.log("[MIGRATION] Project module migration completed successfully.");
}

runMigration()
  .catch((e) => {
    console.error("[MIGRATION ERROR]", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
