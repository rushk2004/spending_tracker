"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { z } from "zod";

const schema = z.object({
  name: z.string().min(1).max(60),
  icon: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
});

export async function createCategory(data: z.infer<typeof schema>) {
  const session = await requireUser();
  if (!session?.userId) return { error: "Unauthorized" };
  const parsed = schema.safeParse(data);
  if (!parsed.success) return { error: "Invalid category" };

  try {
    await prisma.category.create({
      data: {
        userId: session.userId,
        name: parsed.data.name,
        icon: parsed.data.icon || "📦",
        color: parsed.data.color || "#94a3b8",
        isDefault: false,
      },
    });
  } catch {
    return { error: "Category already exists" };
  }
  revalidatePath("/categories");
  revalidatePath("/transactions");
  return { ok: true };
}

export async function deleteCategory(id: string) {
  const session = await requireUser();
  if (!session?.userId) return { error: "Unauthorized" };
  const existing = await prisma.category.findFirst({ where: { id, userId: session.userId } });
  if (!existing) return { error: "Not found" };
  await prisma.category.delete({ where: { id } });
  revalidatePath("/categories");
  revalidatePath("/transactions");
  return { ok: true };
}
