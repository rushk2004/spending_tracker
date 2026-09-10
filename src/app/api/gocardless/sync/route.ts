import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { syncBankConnection } from "@/lib/bank-sync";

export async function POST(req: Request) {
  const session = await requireUser();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const connectionId = body.connectionId as string | undefined;

  try {
    if (connectionId) {
      const result = await syncBankConnection(connectionId, session.userId);
      return NextResponse.json({ ok: true, connections: 1, ...result });
    }

    const connections = await prisma.bankConnection.findMany({
      where: { userId: session.userId, status: "active", provider: "gocardless" },
      orderBy: { updatedAt: "desc" },
    });

    if (!connections.length) {
      return NextResponse.json({ error: "No bank connection to sync" }, { status: 404 });
    }

    let transactions = 0;
    let accounts = 0;
    const errors: string[] = [];

    for (const conn of connections) {
      try {
        const result = await syncBankConnection(conn.id, session.userId);
        transactions += result.transactions ?? 0;
        accounts += result.accounts ?? 0;
      } catch (e) {
        errors.push(e instanceof Error ? e.message : "Sync failed");
      }
    }

    if (errors.length && errors.length === connections.length) {
      return NextResponse.json({ error: errors[0] }, { status: 500 });
    }

    return NextResponse.json({
      ok: true,
      connections: connections.length,
      transactions,
      accounts,
      warnings: errors.length ? errors : undefined,
    });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Sync failed" },
      { status: 500 }
    );
  }
}
