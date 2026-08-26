import { db } from "../src/lib/db";

async function main() {
  console.log("🛠️ Applying UserPermissionOverride table and RBAC updates via direct Prisma connection...");

  await db.$executeRawUnsafe(`
    CREATE TABLE IF NOT EXISTS "public"."UserPermissionOverride" (
      "id" TEXT NOT NULL,
      "userId" TEXT NOT NULL,
      "permissionId" TEXT NOT NULL,
      "effect" TEXT NOT NULL DEFAULT 'ALLOW',
      "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
      CONSTRAINT "UserPermissionOverride_pkey" PRIMARY KEY ("id")
    );
  `);

  await db.$executeRawUnsafe(`
    CREATE UNIQUE INDEX IF NOT EXISTS "UserPermissionOverride_userId_permissionId_key" 
    ON "public"."UserPermissionOverride"("userId", "permissionId");
  `);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "UserPermissionOverride_userId_idx" 
    ON "public"."UserPermissionOverride"("userId");
  `);

  await db.$executeRawUnsafe(`
    CREATE INDEX IF NOT EXISTS "UserPermissionOverride_permissionId_idx" 
    ON "public"."UserPermissionOverride"("permissionId");
  `);

  console.log("✅ UserPermissionOverride table and indexes verified.");

  // Check if foreign keys exist
  try {
    await db.$executeRawUnsafe(`
      DO $$
      BEGIN
        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UserPermissionOverride_userId_fkey'
        ) THEN
          ALTER TABLE "public"."UserPermissionOverride"
          ADD CONSTRAINT "UserPermissionOverride_userId_fkey"
          FOREIGN KEY ("userId") REFERENCES "public"."User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;

        IF NOT EXISTS (
          SELECT 1 FROM pg_constraint WHERE conname = 'UserPermissionOverride_permissionId_fkey'
        ) THEN
          ALTER TABLE "public"."UserPermissionOverride"
          ADD CONSTRAINT "UserPermissionOverride_permissionId_fkey"
          FOREIGN KEY ("permissionId") REFERENCES "public"."Permission"("id") ON DELETE CASCADE ON UPDATE CASCADE;
        END IF;
      END $$;
    `);
    console.log("✅ Foreign key constraints applied.");
  } catch (err) {
    console.log("Note on FK constraints:", err);
  }

  // Promote primary administrator to SUPER_ADMIN if needed
  const adminUsers = await db.user.findMany({
    where: {
      OR: [
        { email: { contains: "admin" } },
        { accessLevel: "ADMIN" },
      ],
    },
  });

  console.log(`Found ${adminUsers.length} admin accounts in DB.`);
  if (adminUsers.length > 0) {
    // Ensure the first/primary admin has accessLevel = "SUPER_ADMIN"
    const superAdmin = adminUsers[0];
    await db.user.update({
      where: { id: superAdmin.id },
      data: { accessLevel: "SUPER_ADMIN" },
    });
    console.log(`👑 Promoted ${superAdmin.email} (${superAdmin.fullName}) to SUPER_ADMIN.`);
  }

  console.log("🚀 RBAC migration finished successfully.");
}

main()
  .catch((e) => {
    console.error("Migration error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
