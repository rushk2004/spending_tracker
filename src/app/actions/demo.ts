"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { subDays } from "date-fns";

export async function loadDemoData() {
  const session = await requireUser();
  if (!session?.userId) return { error: "Unauthorized" };

  const userId = session.userId;
  const existingAccounts = await prisma.account.count({ where: { userId } });
  if (existingAccounts > 0) {
    return { error: "Demo data is only available when you have no accounts yet." };
  }

  const checking = await prisma.account.create({
    data: { userId, nickname: "Everyday Checking", type: "checking", last4: "4281", balance: 3240.55 },
  });
  const savings = await prisma.account.create({
    data: { userId, nickname: "Emergency Savings", type: "savings", last4: "9910", balance: 12500 },
  });
  const credit = await prisma.account.create({
    data: { userId, nickname: "Travel Rewards", type: "credit", last4: "7742", balance: 612.3 },
  });

  const cats = await prisma.category.findMany({ where: { userId } });
  const byName = (n: string) => cats.find((c) => c.name === n)?.id || null;

  const demoTx = [
    { accountId: checking.id, type: "income", amount: 4200, daysAgo: 28, categoryId: byName("Salary"), merchant: "Acme Corp", description: "Biweekly paycheck" },
    { accountId: checking.id, type: "expense", amount: 86.42, daysAgo: 2, categoryId: byName("Groceries"), merchant: "Whole Foods", description: "Weekly groceries" },
    { accountId: checking.id, type: "expense", amount: 42.1, daysAgo: 3, categoryId: byName("Dining"), merchant: "Sushi Place", description: "Dinner out" },
    { accountId: credit.id, type: "expense", amount: 129.99, daysAgo: 5, categoryId: byName("Shopping"), merchant: "Amazon", description: "Headphones" },
    { accountId: checking.id, type: "expense", amount: 65, daysAgo: 6, categoryId: byName("Transport"), merchant: "Shell", description: "Gas fill-up" },
    { accountId: checking.id, type: "expense", amount: 1450, daysAgo: 10, categoryId: byName("Housing"), merchant: "Landlord", description: "Rent" },
    { accountId: checking.id, type: "expense", amount: 120.5, daysAgo: 12, categoryId: byName("Utilities"), merchant: "City Power", description: "Electric bill" },
    { accountId: credit.id, type: "expense", amount: 18.99, daysAgo: 14, categoryId: byName("Entertainment"), merchant: "Netflix", description: "Subscription" },
    { accountId: checking.id, type: "expense", amount: 54.2, daysAgo: 16, categoryId: byName("Health"), merchant: "Pharmacy", description: "Prescriptions" },
    { accountId: checking.id, type: "transfer", amount: 500, daysAgo: 20, categoryId: byName("Transfer"), merchant: null, description: "Move to savings", transferAccountId: savings.id },
    { accountId: checking.id, type: "income", amount: 350, daysAgo: 22, categoryId: byName("Freelance"), merchant: "Client X", description: "Design project" },
    { accountId: credit.id, type: "expense", amount: 210, daysAgo: 25, categoryId: byName("Travel"), merchant: "United Airlines", description: "Flight deposit" },
  ];

  // Recalculate balances from zero based on transactions for consistency
  await prisma.account.update({ where: { id: checking.id }, data: { balance: 0 } });
  await prisma.account.update({ where: { id: savings.id }, data: { balance: 10000 } });
  await prisma.account.update({ where: { id: credit.id }, data: { balance: 0 } });

  for (const t of demoTx) {
    await prisma.transaction.create({
      data: {
        userId,
        accountId: t.accountId,
        categoryId: t.categoryId,
        type: t.type,
        amount: t.amount,
        date: subDays(new Date(), t.daysAgo),
        merchant: t.merchant,
        description: t.description,
        transferAccountId: "transferAccountId" in t ? t.transferAccountId : null,
      },
    });

    const acct = await prisma.account.findUnique({ where: { id: t.accountId } });
    if (!acct) continue;
    let delta = 0;
    if (t.type === "income") delta = t.amount;
    else if (t.type === "expense") delta = acct.type === "credit" ? t.amount : -t.amount;
    else delta = acct.type === "credit" ? t.amount : -t.amount;
    await prisma.account.update({ where: { id: t.accountId }, data: { balance: { increment: delta } } });

    if (t.type === "transfer" && "transferAccountId" in t && t.transferAccountId) {
      const dest = await prisma.account.findUnique({ where: { id: t.transferAccountId } });
      if (dest) {
        const destDelta = dest.type === "credit" ? -t.amount : t.amount;
        await prisma.account.update({ where: { id: dest.id }, data: { balance: { increment: destDelta } } });
      }
    }
  }

  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  revalidatePath("/transactions");
  return { ok: true };
}
