import Link from "next/link";
import { isAdmin, getCurrentUser } from "@/lib/auth/index";
import { prisma } from "@/lib/prisma";
import { HeroScene } from "@/components/hero-scene";

export default async function HomePage() {
  const user = await getCurrentUser();
  const admin = isAdmin(user);
  const primaryHref = user ? (admin ? "/admin" : "/user") : "/login";

  const [total, inStock, checkedOut, pending] = await Promise.all([
    prisma.motor.count(),
    prisma.motor.count({ where: { status: "in_stock" } }),
    prisma.motor.count({ where: { status: "checked_out" } }),
    prisma.motor.count({ where: { status: "draft" } }),
  ]);

  return (
    <HeroScene
      primaryHref={primaryHref}
      userLabel={user ? "进入工作台" : "立即使用"}
      stats={{ total, inStock, checkedOut, pending }}
    />
  );
}
