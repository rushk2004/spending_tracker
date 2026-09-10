import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { TransactionsManager } from "@/components/transactions/transactions-manager";

export default async function TransactionsPage() {
  const session = await requireUser();
  if (!session?.userId) redirect("/login");

  const [transactions, accounts, categories] = await Promise.all([
    prisma.transaction.findMany({
      where: { userId: session.userId },
      include: { account: true, category: true },
      orderBy: { date: "desc" },
    }),
    prisma.account.findMany({ where: { userId: session.userId }, orderBy: { nickname: "asc" } }),
    prisma.category.findMany({ where: { userId: session.userId }, orderBy: { name: "asc" } }),
  ]);

  const serialized = transactions.map((t) => ({
    ...t,
    date: t.date.toISOString(),
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Transactions</h1>
        <p className="text-sm text-slate-400">Track income, expenses, and transfers</p>
      </div>
      <TransactionsManager
        transactions={serialized}
        accounts={accounts}
        categories={categories}
      />
    </div>
  );
}
