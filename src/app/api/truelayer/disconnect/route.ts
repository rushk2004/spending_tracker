import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const connectionId = body.connectionId as string | undefined;

  const connections = connectionId
    ? await prisma.bankConnection.findMany({
        where: { id: connectionId, userId: session.userId },
      })
    : await prisma.bankConnection.findMany({ where: { userId: session.userId } });

  for (const c of connections) {
    await prisma.account.updateMany({
      where: { bankConnectionId: c.id },
      data: { bankConnectionId: null },
    });
    await prisma.bankConnection.delete({ where: { id: c.id } });
  }

  return NextResponse.json({ ok: true, removed: connections.length });
}
