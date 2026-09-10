import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { revokeBankConnection } from "@/lib/bank-sync";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const connectionId = body.connectionId as string | undefined;

  if (connectionId) {
    await revokeBankConnection(connectionId, session.userId);
    return NextResponse.json({ ok: true, removed: 1 });
  }

  const connections = await prisma.bankConnection.findMany({
    where: { userId: session.userId },
  });

  for (const c of connections) {
    await revokeBankConnection(c.id, session.userId);
  }

  return NextResponse.json({ ok: true, removed: connections.length });
}
