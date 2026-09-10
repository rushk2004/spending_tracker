"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const txSchema = z.object({
  accountId: z.string().min(1),
  categoryId: z.string().optional().nullable(),
  type: z.enum(["income", "expense", "transfer"]),
  amount: z.coerce.number().positive(),
  date: z.string().min(1),
  description: z.string().optional().nullable(),
  merchant: z.string().optional().nullable(),
  transferAccountId: z.string().optional().nullable(),
});

async function adjustBalance(accountId: string, delta: number) {
  await prisma.account.update({
    where: { id: accountId },
    data: { balance: { increment: delta } },
  });
}

function balanceDelta(type: string, amount: number, accountType?: string) {
  if (type === "income") return amount;
  if (type === "expense") {
    // Credit cards: expense increases balance owed
    if (accountType === "credit") return amount;
    return -amount;
  }
  // transfer outbound
  return accountType === "credit" ? amount : -amount;
}

export async function createTransaction(data: z.infer<typeof txSchema>) {
  const session = await requireUser();
  if (!session?.userId) return { error: "Unauthorized" };
  const parsed = txSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid transaction data" };

  const account = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId: session.userId },
  });
  if (!account) return { error: "Account not found" };

  if (parsed.data.type === "transfer" && parsed.data.transferAccountId) {
    const dest = await prisma.account.findFirst({
      where: { id: parsed.data.transferAccountId, userId: session.userId },
    });
    if (!dest) return { error: "Destination account not found" };
  }

  const tx = await prisma.transaction.create({
    data: {
      userId: session.userId,
      accountId: parsed.data.accountId,
      categoryId: parsed.data.categoryId || null,
      type: parsed.data.type,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      description: parsed.data.description || null,
      merchant: parsed.data.merchant || null,
      transferAccountId: parsed.data.transferAccountId || null,
    },
  });

  await adjustBalance(account.id, balanceDelta(parsed.data.type, parsed.data.amount, account.type));

  if (parsed.data.type === "transfer" && parsed.data.transferAccountId) {
    const dest = await prisma.account.findUnique({ where: { id: parsed.data.transferAccountId } });
    if (dest) {
      const destDelta = dest.type === "credit" ? -parsed.data.amount : parsed.data.amount;
      await adjustBalance(dest.id, destDelta);
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  return { ok: true, id: tx.id };
}

export async function updateTransaction(id: string, data: z.infer<typeof txSchema>) {
  const session = await requireUser();
  if (!session?.userId) return { error: "Unauthorized" };
  const parsed = txSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid transaction data" };

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.userId },
    include: { account: true },
  });
  if (!existing) return { error: "Not found" };

  // Reverse old balance effects
  await adjustBalance(
    existing.accountId,
    -balanceDelta(existing.type, existing.amount, existing.account.type)
  );
  if (existing.type === "transfer" && existing.transferAccountId) {
    const oldDest = await prisma.account.findUnique({ where: { id: existing.transferAccountId } });
    if (oldDest) {
      const destDelta = oldDest.type === "credit" ? -existing.amount : existing.amount;
      await adjustBalance(oldDest.id, -destDelta);
    }
  }

  const newAccount = await prisma.account.findFirst({
    where: { id: parsed.data.accountId, userId: session.userId },
  });
  if (!newAccount) return { error: "Account not found" };

  await prisma.transaction.update({
    where: { id },
    data: {
      accountId: parsed.data.accountId,
      categoryId: parsed.data.categoryId || null,
      type: parsed.data.type,
      amount: parsed.data.amount,
      date: new Date(parsed.data.date),
      description: parsed.data.description || null,
      merchant: parsed.data.merchant || null,
      transferAccountId: parsed.data.transferAccountId || null,
    },
  });

  await adjustBalance(newAccount.id, balanceDelta(parsed.data.type, parsed.data.amount, newAccount.type));
  if (parsed.data.type === "transfer" && parsed.data.transferAccountId) {
    const dest = await prisma.account.findUnique({ where: { id: parsed.data.transferAccountId } });
    if (dest) {
      const destDelta = dest.type === "credit" ? -parsed.data.amount : parsed.data.amount;
      await adjustBalance(dest.id, destDelta);
    }
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  return { ok: true };
}

export async function deleteTransaction(id: string) {
  const session = await requireUser();
  if (!session?.userId) return { error: "Unauthorized" };

  const existing = await prisma.transaction.findFirst({
    where: { id, userId: session.userId },
    include: { account: true },
  });
  if (!existing) return { error: "Not found" };

  await adjustBalance(
    existing.accountId,
    -balanceDelta(existing.type, existing.amount, existing.account.type)
  );
  if (existing.type === "transfer" && existing.transferAccountId) {
    const dest = await prisma.account.findUnique({ where: { id: existing.transferAccountId } });
    if (dest) {
      const destDelta = dest.type === "credit" ? -existing.amount : existing.amount;
      await adjustBalance(dest.id, -destDelta);
    }
  }

  await prisma.transaction.delete({ where: { id } });
  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  return { ok: true };
}

export async function importTransactionsCsv(csvText: string, defaultAccountId: string) {
  const session = await requireUser();
  if (!session?.userId) return { error: "Unauthorized" };

  const account = await prisma.account.findFirst({
    where: { id: defaultAccountId, userId: session.userId },
  });
  if (!account) return { error: "Account not found" };

  const categories = await prisma.category.findMany({ where: { userId: session.userId } });
  const catByName = new Map(categories.map((c) => [c.name.toLowerCase(), c.id]));

  const lines = csvText.trim().split(/\r?\n/);
  if (lines.length < 2) return { error: "CSV must have a header and at least one row" };

  const header = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/^"|"$/g, ""));
  const idx = (name: string) => header.indexOf(name);

  const required = ["date", "amount", "type"];
  for (const r of required) {
    if (idx(r) === -1) return { error: `Missing required column: ${r}` };
  }

  let imported = 0;
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const cols = parseCsvLine(line);
    const date = cols[idx("date")];
    const amount = Math.abs(parseFloat(cols[idx("amount")]));
    let type = (cols[idx("type")] || "expense").toLowerCase();
    if (!["income", "expense", "transfer"].includes(type)) type = "expense";
    const description = idx("description") >= 0 ? cols[idx("description")] : null;
    const merchant = idx("merchant") >= 0 ? cols[idx("merchant")] : null;
    const categoryName = idx("category") >= 0 ? cols[idx("category")] : null;
    const accountCol = idx("account") >= 0 ? cols[idx("account")] : null;

    let accountId = defaultAccountId;
    if (accountCol) {
      const found = await prisma.account.findFirst({
        where: { userId: session.userId, nickname: { equals: accountCol } },
      });
      if (found) accountId = found.id;
    }

    const categoryId = categoryName ? catByName.get(categoryName.toLowerCase()) || null : null;
    if (!date || !amount || Number.isNaN(amount)) continue;

    const acct = await prisma.account.findUnique({ where: { id: accountId } });
    await prisma.transaction.create({
      data: {
        userId: session.userId,
        accountId,
        categoryId,
        type,
        amount,
        date: new Date(date),
        description,
        merchant,
      },
    });
    if (acct) {
      await adjustBalance(accountId, balanceDelta(type, amount, acct.type));
    }
    imported++;
  }

  revalidatePath("/transactions");
  revalidatePath("/dashboard");
  revalidatePath("/accounts");
  return { ok: true, imported };
}

function parseCsvLine(line: string): string[] {
  const result: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
    } else if (ch === "," && !inQuotes) {
      result.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  result.push(current.trim());
  return result;
}
