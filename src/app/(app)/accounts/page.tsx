import { Suspense } from "react";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { getPeriodRange, parsePeriod } from "@/lib/period";
import { getTrueLayerStatus } from "@/lib/truelayer";
import { AccountsManager } from "@/components/accounts/accounts-manager";
import { ConnectBankCard } from "@/components/banks/connect-bank";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { formatCurrency } from "@/lib/utils";

export default async function AccountsPage({
  searchParams,
}: {
  searchParams?: { period?: string; connected?: string };
}) {
  const session = await requireUser();
  if (!session?.userId) redirect("/login");

  const periodKey = parsePeriod(searchParams?.period);
  const period = getPeriodRange(periodKey);

  const [accounts, periodTx, connections] = await Promise.all([
    prisma.account.findMany({
      where: { userId: session.userId },
      orderBy: { nickname: "asc" },
      include: { bankConnection: true },
    }),
    prisma.transaction.findMany({
      where: {
        userId: session.userId,
        type: "expense",
        date: { gte: period.start, lte: period.end },
      },
    }),
    prisma.bankConnection.findMany({
      where: { userId: session.userId },
      include: { accounts: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const withSpend = accounts.map((a) => ({
    id: a.id,
    nickname: a.nickname,
    type: a.type,
    last4: a.last4,
    balance: a.balance,
    currency: a.currency,
    linked: Boolean(a.bankConnectionId),
    institutionName: a.bankConnection?.institutionName || null,
    periodSpend: periodTx.filter((t) => t.accountId === a.id).reduce((s, t) => s + t.amount, 0),
  }));

  const tl = getTrueLayerStatus();

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white">Accounts</h1>
          <p className="text-sm text-slate-400">
            Balance + spending ({period.shortLabel})
            {searchParams?.connected ? " · Bank connected" : ""}
          </p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector value={periodKey} />
        </Suspense>
      </div>

      <ConnectBankCard
        configured={tl.configured}
        env={tl.env}
        connections={connections.map((c) => ({
          id: c.id,
          provider: c.provider,
          institutionName: c.institutionName,
          lastSyncedAt: c.lastSyncedAt?.toISOString() || null,
          accountCount: c.accounts.length,
          status: c.status,
        }))}
      />

      {withSpend.length > 0 && (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {withSpend.map((a) => (
            <a
              key={a.id}
              href={`/accounts/${a.id}`}
              className="rounded-xl border border-slate-800 bg-slate-900/40 p-4 transition hover:border-emerald-800/50"
            >
              <div className="flex items-start justify-between">
                <div>
                  <p className="font-medium">{a.nickname}</p>
                  <p className="text-xs capitalize text-slate-500">
                    {a.type}
                    {a.last4 ? ` ····${a.last4}` : ""}
                    {a.linked ? ` · ${a.institutionName || "synced"}` : " · manual"}
                  </p>
                </div>
              </div>
              <p className="mt-3 text-xl font-semibold text-emerald-300">{formatCurrency(a.balance)}</p>
              <p className="text-xs text-rose-300">Spent {formatCurrency(a.periodSpend)} this period</p>
            </a>
          ))}
        </div>
      )}

      <AccountsManager accounts={accounts} />
    </div>
  );
}
