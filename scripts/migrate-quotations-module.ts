import { db } from "../src/lib/db";

async function main() {
  console.log("Starting Quotation Module database migration...");

  try {
    // 1. Ensure Quotation table exists and alter columns
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Quotation" (
        "id" TEXT PRIMARY KEY,
        "referenceNo" TEXT UNIQUE NOT NULL,
        "title" TEXT NOT NULL DEFAULT 'Interior Design & Execution Quotation',
        "leadId" TEXT REFERENCES "Lead"("id") ON DELETE SET NULL,
        "projectId" TEXT REFERENCES "Project"("id") ON DELETE SET NULL,
        "clientId" TEXT REFERENCES "Client"("id") ON DELETE SET NULL,
        "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
        "validityDate" TIMESTAMP(3),
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "revision" INTEGER NOT NULL DEFAULT 1,
        "parentQuotationId" TEXT REFERENCES "Quotation"("id") ON DELETE SET NULL,
        "subtotal" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "discountType" TEXT,
        "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "adjustmentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "adjustmentReason" TEXT,
        "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "approvedAt" TIMESTAMP(3),
        "approvedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
        "clientApprovedName" TEXT,
        "approvalNotes" TEXT,
        "sentAt" TIMESTAMP(3),
        "clientSnapshot" TEXT,
        "termsAndConditions" TEXT,
        "notes" TEXT,
        "internalNotes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ Quotation table verified/created");

    // Add columns if table already existed
    const quotationCols = [
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "title" TEXT NOT NULL DEFAULT 'Interior Design & Execution Quotation';`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "clientId" TEXT REFERENCES "Client"("id") ON DELETE SET NULL;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "createdById" TEXT REFERENCES "User"("id") ON DELETE SET NULL;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "validityDate" TIMESTAMP(3);`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "parentQuotationId" TEXT REFERENCES "Quotation"("id") ON DELETE SET NULL;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "discountType" TEXT;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "discountValue" DOUBLE PRECISION NOT NULL DEFAULT 0.0;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "adjustmentAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "adjustmentReason" TEXT;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "taxRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "taxAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "approvedAt" TIMESTAMP(3);`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "approvedById" TEXT REFERENCES "User"("id") ON DELETE SET NULL;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "clientApprovedName" TEXT;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "approvalNotes" TEXT;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "sentAt" TIMESTAMP(3);`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "clientSnapshot" TEXT;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "termsAndConditions" TEXT;`,
      `ALTER TABLE "Quotation" ADD COLUMN IF NOT EXISTS "internalNotes" TEXT;`,
    ];

    for (const sql of quotationCols) {
      await db.$executeRawUnsafe(sql);
    }
    console.log("✓ Quotation columns updated");

    // Indexes for Quotation
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Quotation_leadId_idx" ON "Quotation"("leadId");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Quotation_projectId_idx" ON "Quotation"("projectId");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Quotation_clientId_idx" ON "Quotation"("clientId");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Quotation_status_idx" ON "Quotation"("status");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Quotation_parentQuotationId_idx" ON "Quotation"("parentQuotationId");`);

    // 2. Ensure QuotationItem table exists and alter columns
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "QuotationItem" (
        "id" TEXT PRIMARY KEY,
        "quotationId" TEXT NOT NULL REFERENCES "Quotation"("id") ON DELETE CASCADE,
        "room" TEXT NOT NULL DEFAULT 'General',
        "category" TEXT NOT NULL,
        "itemType" TEXT NOT NULL DEFAULT 'CUSTOM',
        "materialId" TEXT,
        "itemDescription" TEXT NOT NULL,
        "specifications" TEXT,
        "length" DOUBLE PRECISION,
        "height" DOUBLE PRECISION,
        "quantity" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
        "unitKey" TEXT NOT NULL DEFAULT 'SQFT',
        "unitRate" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "internalCostRate" DOUBLE PRECISION,
        "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "totalAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0,
        "sortOrder" INTEGER NOT NULL DEFAULT 0,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ QuotationItem table verified/created");

    const itemCols = [
      `ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "room" TEXT NOT NULL DEFAULT 'General';`,
      `ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "itemType" TEXT NOT NULL DEFAULT 'CUSTOM';`,
      `ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "materialId" TEXT;`,
      `ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "specifications" TEXT;`,
      `ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "length" DOUBLE PRECISION;`,
      `ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "height" DOUBLE PRECISION;`,
      `ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "internalCostRate" DOUBLE PRECISION;`,
      `ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "discountAmount" DOUBLE PRECISION NOT NULL DEFAULT 0.0;`,
      `ALTER TABLE "QuotationItem" ADD COLUMN IF NOT EXISTS "sortOrder" INTEGER NOT NULL DEFAULT 0;`,
    ];

    for (const sql of itemCols) {
      await db.$executeRawUnsafe(sql);
    }
    console.log("✓ QuotationItem columns updated");

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "QuotationItem_quotationId_idx" ON "QuotationItem"("quotationId");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "QuotationItem_room_idx" ON "QuotationItem"("room");`);

    console.log("Quotation Module database migration completed successfully!");
  } catch (error) {
    console.error("Migration failed:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
