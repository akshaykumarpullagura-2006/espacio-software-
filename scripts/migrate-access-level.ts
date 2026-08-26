import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("Adding accessLevel column if not exists...");
  await prisma.$executeRawUnsafe(`
    ALTER TABLE "User" ADD COLUMN IF NOT EXISTS "accessLevel" TEXT NOT NULL DEFAULT 'USER';
  `);

  console.log("Updating admin users to accessLevel = 'ADMIN'...");
  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "accessLevel" = 'ADMIN'
    WHERE "email" IN ('shaikh@espacio.in', 'espacio@gmail.com', 'admin@espacio.com')
       OR id IN (
         SELECT ur."userId" FROM "UserRole" ur
         JOIN "Role" r ON ur."roleId" = r."id"
         WHERE r."name" = 'ADMIN'
       );
  `);

  console.log("Updating non-admin users to accessLevel = 'USER'...");
  await prisma.$executeRawUnsafe(`
    UPDATE "User"
    SET "accessLevel" = 'USER'
    WHERE "accessLevel" IS NULL OR "accessLevel" != 'ADMIN';
  `);

  const users = await prisma.$queryRaw<Array<{ email: string; accessLevel: string }>>`
    SELECT "email", "accessLevel" FROM "User";
  `;
  console.log("Current Users & Access Levels in Supabase:", users);
}

main().catch(console.error).finally(() => prisma.$disconnect());
