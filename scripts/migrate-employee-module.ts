import { db } from "../src/lib/db";

async function main() {
  console.log("Starting Employee Module database migration...");

  try {
    // 1. Create Employee table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "Employee" (
        "id" TEXT PRIMARY KEY,
        "employeeNo" TEXT UNIQUE NOT NULL,
        "userId" TEXT UNIQUE REFERENCES "User"("id") ON DELETE SET NULL,
        "fullName" TEXT NOT NULL,
        "email" TEXT UNIQUE NOT NULL,
        "phone" TEXT,
        "avatarUrl" TEXT,
        "department" TEXT NOT NULL DEFAULT 'OPERATIONS',
        "designation" TEXT NOT NULL,
        "joiningDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "status" TEXT NOT NULL DEFAULT 'ACTIVE',
        "address" TEXT,
        "emergencyContact" TEXT,
        "emergencyPhone" TEXT,
        "bankName" TEXT,
        "bankAccountNo" TEXT,
        "bankIfsc" TEXT,
        "upiId" TEXT,
        "notes" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ Employee table verified/created");

    // Indexes for Employee
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Employee_employeeNo_idx" ON "Employee"("employeeNo");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Employee_status_idx" ON "Employee"("status");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Employee_department_idx" ON "Employee"("department");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Employee_email_idx" ON "Employee"("email");`);

    // 2. Create EmployeeSalaryStructure table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EmployeeSalaryStructure" (
        "id" TEXT PRIMARY KEY,
        "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE CASCADE,
        "baseSalary" DOUBLE PRECISION NOT NULL,
        "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "paymentMethod" TEXT NOT NULL DEFAULT 'UPI',
        "notes" TEXT,
        "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✓ EmployeeSalaryStructure table verified/created");

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmployeeSalaryStructure_employeeId_idx" ON "EmployeeSalaryStructure"("employeeId");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmployeeSalaryStructure_effectiveFrom_idx" ON "EmployeeSalaryStructure"("effectiveFrom");`);

    // 3. Add employeeId to Expense table
    await db.$executeRawUnsafe(`
      ALTER TABLE "Expense" 
      ADD COLUMN IF NOT EXISTS "employeeId" TEXT REFERENCES "Employee"("id") ON DELETE SET NULL;
    `);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "Expense_employeeId_idx" ON "Expense"("employeeId");`);
    console.log("✓ Expense table updated with employeeId");

    // 4. Create EmployeeSalaryPayment table
    await db.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "EmployeeSalaryPayment" (
        "id" TEXT PRIMARY KEY,
        "referenceNo" TEXT UNIQUE NOT NULL,
        "employeeId" TEXT NOT NULL REFERENCES "Employee"("id") ON DELETE RESTRICT,
        "periodMonth" INTEGER NOT NULL,
        "periodYear" INTEGER NOT NULL,
        "amount" DOUBLE PRECISION NOT NULL,
        "paymentDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "paymentMethod" TEXT NOT NULL DEFAULT 'UPI',
        "referenceNoExternal" TEXT,
        "status" TEXT NOT NULL DEFAULT 'PAID',
        "reversalReason" TEXT,
        "notes" TEXT,
        "expenseId" TEXT UNIQUE REFERENCES "Expense"("id") ON DELETE SET NULL,
        "createdById" TEXT,
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "EmployeeSalaryPayment_employee_period_unique" UNIQUE ("employeeId", "periodMonth", "periodYear")
      );
    `);
    console.log("✓ EmployeeSalaryPayment table verified/created");

    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmployeeSalaryPayment_employeeId_idx" ON "EmployeeSalaryPayment"("employeeId");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmployeeSalaryPayment_period_idx" ON "EmployeeSalaryPayment"("periodYear", "periodMonth");`);
    await db.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "EmployeeSalaryPayment_paymentDate_idx" ON "EmployeeSalaryPayment"("paymentDate");`);

    // 5. Sync existing Users into Employee table if not already existing
    const existingUsers = await db.user.findMany({
      include: { userRoles: { include: { role: true } } },
    });

    let empCount = 1;
    for (const u of existingUsers) {
      // Check if employee already exists for this email/user
      const existingEmp = await db.$queryRawUnsafe<any[]>(
        `SELECT id FROM "Employee" WHERE "userId" = $1 OR "email" = $2 LIMIT 1`,
        u.id,
        u.email
      );

      if (!existingEmp || existingEmp.length === 0) {
        const empNo = `EMP-${new Date().getFullYear()}-${String(empCount).padStart(4, "0")}`;
        const dept = u.accessLevel === "SUPER_ADMIN" ? "MANAGEMENT" : u.accessLevel === "ADMIN" ? "OPERATIONS" : "DESIGN";
        const designation = u.accessLevel === "SUPER_ADMIN" ? "Managing Director" : u.accessLevel === "ADMIN" ? "Operations Lead" : "Interior Designer";
        const empId = `emp-${u.id}`;

        await db.$executeRawUnsafe(
          `INSERT INTO "Employee" ("id", "employeeNo", "userId", "fullName", "email", "phone", "department", "designation", "status", "joiningDate", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          empId,
          empNo,
          u.id,
          u.fullName,
          u.email,
          u.phone || null,
          dept,
          designation,
          u.status
        );

        // Add initial salary structure (e.g. ₹20,000 for standard user, ₹50,000 for admin, ₹1,00,000 for super admin)
        const initialSalary = u.accessLevel === "SUPER_ADMIN" ? 100000 : u.accessLevel === "ADMIN" ? 50000 : 20000;
        const structId = `sal-struct-${u.id}`;

        await db.$executeRawUnsafe(
          `INSERT INTO "EmployeeSalaryStructure" ("id", "employeeId", "baseSalary", "paymentMethod", "isActive", "createdAt", "updatedAt")
           VALUES ($1, $2, $3, 'UPI', TRUE, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
          structId,
          empId,
          initialSalary
        );

        console.log(`✓ Created employee profile ${empNo} for user ${u.fullName} (${u.email}) with base salary ₹${initialSalary}`);
        empCount++;
      }
    }

    console.log("Migration completed successfully!");
  } catch (error) {
    console.error("Migration error:", error);
    process.exit(1);
  } finally {
    await db.$disconnect();
  }
}

main();
