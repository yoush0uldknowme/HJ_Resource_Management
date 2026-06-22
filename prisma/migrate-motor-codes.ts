import { PrismaClient } from "@prisma/client";
import { buildMotorCode, motorModelPrefix } from "../src/lib/motor-code";

const prisma = new PrismaClient();

async function main() {
  const motors = await prisma.motor.findMany({
    orderBy: [{ model: "asc" }, { createdAt: "asc" }, { id: "asc" }]
  });
  const sequences = new Map<string, number>();
  const updates = motors.map((motor) => {
    const prefix = motorModelPrefix(motor.model);
    const sequence = (sequences.get(prefix) ?? 0) + 1;
    sequences.set(prefix, sequence);
    return { motor, nextCode: buildMotorCode(motor.model, sequence) };
  });

  for (const { motor } of updates) {
    await prisma.motor.update({
      where: { id: motor.id },
      data: { motorCode: `TEMP-${motor.id}-${Date.now()}` }
    });
  }
  for (const { motor, nextCode } of updates) {
    await prisma.motor.update({
      where: { id: motor.id },
      data: {
        motorCode: nextCode,
        snCode: !motor.snCode || motor.snCode === motor.motorCode ? nextCode : motor.snCode
      }
    });
  }
  console.log(`Migrated ${updates.length} motor codes.`);
}

main().finally(() => prisma.$disconnect());
