"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const accountSchema = z.object({
  nickname: z.string().min(1).max(80),
  type: z.enum(["checking", "savings", "credit"]),
  last4: z.string().max(4).optional().nullable(),
  balance: z.coerce.number(),
});

export async function createAccount(data: z.infer<typeof accountSchema>) {
  const session = await requireUser();
  if (!session?.userId) return { error: "Unauthorized" };
  const parsed = accountSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid account data" };

  await prisma.account.create({
    data: {
      userId: session.userId,
      nickname: parsed.data.nickname,
      type: parsed.data.type,
      last4: parsed.data.last4 || null,
      balance: parsed.data.balance,
    },
  });
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function updateAccount(id: string, data: z.infer<typeof accountSchema>) {
  const session = await requireUser();
  if (!session?.userId) return { error: "Unauthorized" };
  const parsed = accountSchema.safeParse(data);
  if (!parsed.success) return { error: "Invalid account data" };

  const existing = await prisma.account.findFirst({ where: { id, userId: session.userId } });
  if (!existing) return { error: "Account not found" };

  await prisma.account.update({
    where: { id },
    data: {
      nickname: parsed.data.nickname,
      type: parsed.data.type,
      last4: parsed.data.last4 || null,
      balance: parsed.data.balance,
    },
  });
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  return { ok: true };
}

export async function deleteAccount(id: string) {
  const session = await requireUser();
  if (!session?.userId) return { error: "Unauthorized" };
  const existing = await prisma.account.findFirst({ where: { id, userId: session.userId } });
  if (!existing) return { error: "Account not found" };
  await prisma.account.delete({ where: { id } });
  revalidatePath("/accounts");
  revalidatePath("/dashboard");
  revalidatePath("/transactions");
  return { ok: true };
}
