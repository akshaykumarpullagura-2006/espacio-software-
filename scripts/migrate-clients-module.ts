import { db } from "../src/lib/db";

async function main() {
  console.log("Migrating Client module schema changes...");

  // 1. Add clientId to Lead
  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (
        SELECT 1 FROM information_schema.columns 
        WHERE table_name = 'Lead' AND column_name = 'clientId'
      ) THEN
        ALTER TABLE "Lead" ADD COLUMN "clientId" TEXT;
        CREATE INDEX IF NOT EXISTS "Lead_clientId_idx" ON "Lead"("clientId");
      END IF;
    END $$;
  `);
  console.log("Verified Lead.clientId column.");

  // 2. Add columns to Client
  await db.$executeRawUnsafe(`
    DO $$
    BEGIN
      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'companyName') THEN
        ALTER TABLE "Client" ADD COLUMN "companyName" TEXT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'clientType') THEN
        ALTER TABLE "Client" ADD COLUMN "clientType" TEXT DEFAULT 'INDIVIDUAL';
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'status') THEN
        ALTER TABLE "Client" ADD COLUMN "status" TEXT DEFAULT 'ACTIVE';
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'postalCode') THEN
        ALTER TABLE "Client" ADD COLUMN "postalCode" TEXT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'country') THEN
        ALTER TABLE "Client" ADD COLUMN "country" TEXT DEFAULT 'India';
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'billingAddress') THEN
        ALTER TABLE "Client" ADD COLUMN "billingAddress" TEXT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'shippingAddress') THEN
        ALTER TABLE "Client" ADD COLUMN "shippingAddress" TEXT;
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'preferredContactMethod') THEN
        ALTER TABLE "Client" ADD COLUMN "preferredContactMethod" TEXT DEFAULT 'PHONE';
      END IF;

      IF NOT EXISTS (SELECT 1 FROM information_schema.columns WHERE table_name = 'Client' AND column_name = 'tags') THEN
        ALTER TABLE "Client" ADD COLUMN "tags" TEXT;
      END IF;
    END $$;
  `);
  console.log("Verified Client columns.");

  // 3. Create indices on Client individually
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Client_email_idx" ON "Client"("email");`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Client_clientType_idx" ON "Client"("clientType");`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Client_status_idx" ON "Client"("status");`);
  await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Client_createdAt_idx" ON "Client"("createdAt");`);
  console.log("Verified Client indices.");

  console.log("Client module migration completed successfully!");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
