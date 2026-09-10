import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { syncBankConnection } from "@/lib/bank-sync";

/**
 * TrueLayer can notify when new data is available.
 * Configure this URL in the TrueLayer console (production).
 * Body shapes vary — we treat connection/user hints best-effort and sync active links.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  // Best-effort: sync all active TrueLayer connections if webhook fires
  const connections = await prisma.bankConnection.findMany({
    where: { provider: "truelayer", status: "active" },
  });
  for (const c of connections) {
    try {
      await syncBankConnection(c.id, c.userId);
    } catch {
      // ignore per-connection errors in webhook
    }
  }
  return NextResponse.json({ ok: true, received: Boolean(body), synced: connections.length });
}
