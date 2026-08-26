import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("Creating/Updating Espacio admin accounts in Supabase database...\n");

  const passwordHash = await bcrypt.hash("Password123!", 10);
  const adminRole = await prisma.role.findFirst({ where: { name: "ADMIN" } });

  if (!adminRole) {
    console.error("ADMIN role not found in database!");
    return;
  }

  const emailsToCreate = [
    { email: "espacio@gmail.com", fullName: "Espacio ERP Admin" },
    { email: "espaciosoftware111@gmail.com", fullName: "Espacio Software" },
  ];

  for (const item of emailsToCreate) {
    const user = await prisma.user.upsert({
      where: { email: item.email },
      update: {
        passwordHash,
        status: "ACTIVE",
        fullName: item.fullName,
      },
      create: {
        email: item.email,
        passwordHash,
        fullName: item.fullName,
        status: "ACTIVE",
      },
    });

    // Ensure UserRole exists
    const existingUserRole = await prisma.userRole.findFirst({
      where: { userId: user.id, roleId: adminRole.id },
    });

    if (!existingUserRole) {
      await prisma.userRole.create({
        data: {
          userId: user.id,
          roleId: adminRole.id,
        },
      });
    }

    console.log(`✅ User ready in Supabase: ${item.email} (Role: ADMIN)`);
  }

  console.log("\n🎉 All requested user credentials are now active in Supabase!");
}

main()
  .catch((e) => {
    console.error("Error creating users:", e);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
