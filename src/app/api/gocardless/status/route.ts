import { NextResponse } from "next/server";
import { requireUser } from "@/lib/session";
import { prisma } from "@/lib/prisma";
import { getGoCardlessStatus } from "@/lib/gocardless";

export async function GET() {
  const session = await requireUser();
  if (!session?.userId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const connections = await prisma.bankConnection.findMany({
    where: { userId: session.userId },
    include: { accounts: true },
    orderBy: { updatedAt: "desc" },
  });

  return NextResponse.json({
    ...getGoCardlessStatus(),
    connections: connections.map((c) => ({
      id: c.id,
      provider: c.provider,
      institutionName: c.institutionName,
      lastSyncedAt: c.lastSyncedAt,
      accountCount: c.accounts.length,
      status: c.status,
    })),
  });
}
