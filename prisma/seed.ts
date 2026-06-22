import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash: adminHash,
      role: "admin",
      isActive: true
    },
    create: {
      username: "admin",
      passwordHash: adminHash,
      role: "admin"
    }
  });

  const operatorHash = await bcrypt.hash("operator123", 10);
  await prisma.user.upsert({
    where: { username: "operator" },
    update: {
      passwordHash: operatorHash,
      role: "operator",
      isActive: true
    },
    create: {
      username: "operator",
      passwordHash: operatorHash,
      role: "operator"
    }
  });
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
