import { PrismaClient } from "@prisma/client";
import { createHash } from "node:crypto";

const prisma = new PrismaClient();

function hashPassword(password: string): string {
  return createHash("sha256").update(password).digest("hex");
}

async function main() {
  await prisma.user.upsert({
    where: { username: "admin" },
    update: {
      passwordHash: hashPassword("admin123"),
      role: "admin",
      isActive: true
    },
    create: {
      username: "admin",
      passwordHash: hashPassword("admin123"),
      role: "admin"
    }
  });

  await prisma.user.upsert({
    where: { username: "viewer" },
    update: {
      passwordHash: hashPassword("viewer123"),
      role: "viewer",
      isActive: true
    },
    create: {
      username: "viewer",
      passwordHash: hashPassword("viewer123"),
      role: "viewer"
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
