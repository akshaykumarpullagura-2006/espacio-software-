import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const passwordHash = await bcrypt.hash("Password123!", 10);

  let superAdminRole = await prisma.role.findUnique({ where: { name: "SUPER_ADMIN" } });
  if (!superAdminRole) {
    superAdminRole = await prisma.role.create({
      data: {
        name: "SUPER_ADMIN",
        description: "Highest authority with unrestricted universal control",
        isSystem: true,
      },
    });
  }

  const superAdminUsers = [
    { email: "superadmin@espacio.com", fullName: "ESPACIO Super Administrator" },
    { email: "admin@espacio.com", fullName: "System Admin" },
    { email: "espacio@gmail.com", fullName: "Espacio ERP Admin" },
  ];

  for (const u of superAdminUsers) {
    const user = await prisma.user.upsert({
      where: { email: u.email },
      update: {
        accessLevel: "SUPER_ADMIN",
        passwordHash,
        status: "ACTIVE",
        fullName: u.fullName,
      },
      create: {
        email: u.email,
        accessLevel: "SUPER_ADMIN",
        passwordHash,
        status: "ACTIVE",
        fullName: u.fullName,
      },
    });

    const userRole = await prisma.userRole.findFirst({
      where: { userId: user.id, roleId: superAdminRole.id },
    });

    if (!userRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: superAdminRole.id,
        },
      });
    }

    console.log(`✅ Super Admin configured: ${u.email}`);
  }
}

main()
  .catch(console.error)
  .finally(async () => {
    await prisma.$disconnect();
  });
