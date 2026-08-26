import { db } from "../src/lib/db";

async function main() {
  console.log("Starting Lead Management Module database migration...");

  try {
    const statements = [
      // 1. Alter Lead table columns
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "priority" TEXT NOT NULL DEFAULT 'MEDIUM';`,
      `ALTER TABLE "Lead" ADD COLUMN IF NOT EXISTS "tags" TEXT;`,

      // 2. Alter LeadFollowUp table columns
      `ALTER TABLE "LeadFollowUp" ADD COLUMN IF NOT EXISTS "type" TEXT NOT NULL DEFAULT 'CALL';`,
      `ALTER TABLE "LeadFollowUp" ADD COLUMN IF NOT EXISTS "outcomeNotes" TEXT;`,
      `ALTER TABLE "LeadFollowUp" ADD COLUMN IF NOT EXISTS "assignedToId" TEXT REFERENCES "User"("id") ON DELETE SET NULL;`,
      `ALTER TABLE "LeadFollowUp" ADD COLUMN IF NOT EXISTS "taskId" TEXT;`,
      `ALTER TABLE "LeadFollowUp" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,

      // 3. Alter LeadStageHistory table columns
      `ALTER TABLE "LeadStageHistory" ADD COLUMN IF NOT EXISTS "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP;`,

      // 4. Create LeadSiteVisit table
      `CREATE TABLE IF NOT EXISTS "LeadSiteVisit" (
        "id" TEXT PRIMARY KEY,
        "leadId" TEXT NOT NULL REFERENCES "Lead"("id") ON DELETE CASCADE,
        "visitDate" TIMESTAMP(3) NOT NULL,
        "location" TEXT,
        "assignedToId" TEXT REFERENCES "User"("id") ON DELETE SET NULL,
        "notes" TEXT,
        "outcomeNotes" TEXT,
        "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
        "completedAt" TIMESTAMP(3),
        "taskId" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );`,

      // 5. Create indices
      `CREATE INDEX IF NOT EXISTS "Lead_priority_idx" ON "Lead"("priority");`,
      `CREATE INDEX IF NOT EXISTS "Lead_sourceKey_idx" ON "Lead"("sourceKey");`,
      `CREATE INDEX IF NOT EXISTS "Lead_createdAt_idx" ON "Lead"("createdAt");`,
      `CREATE INDEX IF NOT EXISTS "LeadFollowUp_status_idx" ON "LeadFollowUp"("status");`,
      `CREATE INDEX IF NOT EXISTS "LeadFollowUp_assignedToId_idx" ON "LeadFollowUp"("assignedToId");`,
      `CREATE INDEX IF NOT EXISTS "LeadSiteVisit_leadId_idx" ON "LeadSiteVisit"("leadId");`,
      `CREATE INDEX IF NOT EXISTS "LeadSiteVisit_visitDate_idx" ON "LeadSiteVisit"("visitDate");`,
      `CREATE INDEX IF NOT EXISTS "LeadSiteVisit_status_idx" ON "LeadSiteVisit"("status");`,
      `CREATE INDEX IF NOT EXISTS "LeadSiteVisit_assignedToId_idx" ON "LeadSiteVisit"("assignedToId");`,
    ];

    for (const sql of statements) {
      await db.$executeRawUnsafe(sql);
    }

    console.log("\n✅ Lead Management database migration successfully executed!");
  } catch (error) {
    console.error("❌ Migration error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
