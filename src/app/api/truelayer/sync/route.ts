import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { syncBankConnection } from "@/lib/bank-sync";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  let connectionId = body.connectionId as string | undefined;

  if (!connectionId) {
    const latest = await prisma.bankConnection.findFirst({
      where: { userId: session.userId, status: "active" },
      orderBy: { updatedAt: "desc" },
    });
    connectionId = latest?.id;
  }

  if (!connectionId) {
    return NextResponse.json({ error: "No bank connection" }, { status: 404 });
  }

  try {
    const result = await syncBankConnection(connectionId, session.userId);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
