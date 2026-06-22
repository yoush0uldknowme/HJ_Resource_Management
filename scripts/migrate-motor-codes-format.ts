/**
 * 迁移脚本：统一电机编号和 SN 码格式
 * - motorCode 格式：{MODEL}-{SEQUENCE}，如 GM6020-0001
 * - snCode 统一设为与 motorCode 相同
 *
 * 用法：npx tsx scripts/migrate-motor-codes-format.ts
 */
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const motors = await prisma.motor.findMany();
  console.log(`共 ${motors.length} 台电机需要检查\n`);

  let updated = 0;
  let skipped = 0;

  for (const motor of motors) {
    let newCode = motor.motorCode;
    let needsUpdate = false;

    // 1. 如果 motorCode 是旧格式（不含横线），尝试转换
    if (!motor.motorCode.includes("-")) {
      const normalizedModel = motor.model.trim().toUpperCase().replace(/\s+/g, "");
      const seqMatch = motor.motorCode.match(/(\d{4})$/);
      if (seqMatch) {
        newCode = `${normalizedModel}-${seqMatch[1]}`;
        needsUpdate = true;
      }
    }

    // 2. 如果 snCode 不等于 motorCode，统一设为相同
    if (motor.snCode !== newCode) {
      needsUpdate = true;
    }

    if (!needsUpdate) {
      console.log(`  ✓ ${motor.motorCode} 格式正确，snCode 一致，跳过`);
      skipped++;
      continue;
    }

    // 检查新编号是否已被其他电机占用
    if (newCode !== motor.motorCode) {
      const existing = await prisma.motor.findUnique({ where: { motorCode: newCode } });
      if (existing && existing.id !== motor.id) {
        console.log(`  ⚠ ${motor.motorCode} → ${newCode} 冲突（已被 ID ${existing.id} 占用），仅更新 snCode`);
        // 编号冲突时只更新 snCode 与当前 motorCode 一致
        await prisma.motor.update({
          where: { id: motor.id },
          data: { snCode: motor.motorCode }
        });
        updated++;
        continue;
      }
    }

    console.log(`  ${motor.motorCode} → ${newCode} (snCode: ${motor.snCode ?? "null"} → ${newCode})`);
    await prisma.motor.update({
      where: { id: motor.id },
      data: {
        motorCode: newCode,
        snCode: newCode
      }
    });
    updated++;
  }

  console.log(`\n完成：更新 ${updated} 台，跳过 ${skipped} 台`);
}

main()
  .catch((e) => {
    console.error("迁移失败:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
