import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { CategoriesManager } from "@/components/categories/categories-manager";

export default async function CategoriesPage() {
  const session = await requireUser();
  if (!session?.userId) redirect("/login");

  const categories = await prisma.category.findMany({
    where: { userId: session.userId },
    include: { _count: { select: { transactions: true } } },
    orderBy: { name: "asc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Categories</h1>
        <p className="text-sm text-slate-400">Organize spending with defaults and custom labels</p>
      </div>
      <CategoriesManager categories={categories} />
    </div>
  );
}
