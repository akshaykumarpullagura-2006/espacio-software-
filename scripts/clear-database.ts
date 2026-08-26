import { db } from "../src/lib/db";

async function main() {
  console.log("🧹 Starting Clean Database Wipe (0 Transactions / 0 Demo Data)...");

  // Get all tables in public schema
  const tablesResult: Array<{ table_name: string }> = await db.$queryRawUnsafe(`
    SELECT table_name 
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE'
      AND table_name NOT IN ('_prisma_migrations');
  `);

  const allTables = tablesResult.map((r) => r.table_name);
  console.log(`Found ${allTables.length} total tables in database.`);

  // System and master tables that SHOULD NOT be wiped completely:
  // User, Role, Permission, RolePermission, UserRole
  // But we want to wipe all transactional & operational data:
  const preservedTables = new Set([
    "User",
    "Role",
    "Permission",
    "RolePermission",
    "UserRole",
    "UserPermissionOverride",
    "CompanySetting",
    "SystemSetting",
    "Setting",
    "_prisma_migrations",
  ]);

  const tablesToTruncate = allTables.filter((t) => !preservedTables.has(t));

  console.log("\nTables to clear (0 data):", tablesToTruncate);

  // Disable FK checks and truncate
  for (const table of tablesToTruncate) {
    try {
      await db.$executeRawUnsafe(`TRUNCATE TABLE "${table}" CASCADE;`);
      console.log(`  ✅ Cleared: ${table}`);
    } catch (err: any) {
      console.warn(`  ⚠️ Could not truncate ${table}: ${err.message}`);
    }
  }

  // Also reset account balances to 0 in FinancialAccount if any exists
  try {
    const accTableExists = allTables.includes("FinancialAccount");
    if (accTableExists) {
      await db.$executeRawUnsafe(`TRUNCATE TABLE "FinancialAccount" CASCADE;`);
      console.log("  ✅ Cleared: FinancialAccount");
    }
  } catch (err: any) {
    console.warn("  ⚠️ FinancialAccount reset warning:", err.message);
  }

  // Also clean activity & audit logs
  try {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "AuditLog" CASCADE;`);
    console.log("  ✅ Cleared: AuditLog");
  } catch (e: any) {
    // Ignore
  }

  try {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "ActivityLog" CASCADE;`);
    console.log("  ✅ Cleared: ActivityLog");
  } catch (e: any) {
    // Ignore
  }

  try {
    await db.$executeRawUnsafe(`TRUNCATE TABLE "Notification" CASCADE;`);
    console.log("  ✅ Cleared: Notification");
  } catch (e: any) {
    // Ignore
  }

  console.log("\n✨ Database successfully wiped clean to 0 data fresh state!");
}

main()
  .catch((err) => {
    console.error("❌ Clear database error:", err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
