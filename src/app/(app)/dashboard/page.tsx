import { Suspense } from "react";
import { redirect } from "next/navigation";
import { eachDayOfInterval, format, subDays } from "date-fns";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getPeriodRange, parsePeriod } from "@/lib/period";
import { getTrueLayerStatus } from "@/lib/truelayer";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { CashflowChart } from "@/components/dashboard/cashflow-chart";
import { PeriodSelector } from "@/components/dashboard/period-selector";
import { MoneyOverview } from "@/components/dashboard/money-overview";
import { ConnectBankCard } from "@/components/banks/connect-bank";

function mapConnections(
  connections: {
    id: string;
    provider: string;
    institutionName: string | null;
    lastSyncedAt: Date | null;
    accounts: unknown[];
    status: string;
  }[]
) {
  return connections.map((c) => ({
    id: c.id,
    provider: c.provider,
    institutionName: c.institutionName,
    lastSyncedAt: c.lastSyncedAt?.toISOString() || null,
    accountCount: c.accounts.length,
    status: c.status,
  }));
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams?: { period?: string; connected?: string };
}) {
  const session = await requireUser();
  if (!session?.userId) redirect("/login");
  const userId = session.userId;

  const periodKey = parsePeriod(searchParams?.period);
  const period = getPeriodRange(periodKey);

  const [accounts, recent, periodTx, connections] = await Promise.all([
    prisma.account.findMany({ where: { userId }, orderBy: { nickname: "asc" } }),
    prisma.transaction.findMany({
      where: { userId },
      include: { account: true, category: true },
      orderBy: { date: "desc" },
      take: 8,
    }),
    prisma.transaction.findMany({
      where: { userId, date: { gte: period.start, lte: period.end } },
      include: { category: true, account: true },
    }),
    prisma.bankConnection.findMany({
      where: { userId },
      include: { accounts: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const totalSpend = periodTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const totalIncome = periodTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);

  const cashBalance = accounts.filter((a) => a.type !== "credit").reduce((s, a) => s + a.balance, 0);
  const creditDebt = accounts.filter((a) => a.type === "credit").reduce((s, a) => s + a.balance, 0);
  const totalBalance = cashBalance - creditDebt;

  const accountRows = accounts.map((a) => {
    const spend = periodTx
      .filter((t) => t.accountId === a.id && t.type === "expense")
      .reduce((s, t) => s + t.amount, 0);
    const income = periodTx
      .filter((t) => t.accountId === a.id && t.type === "income")
      .reduce((s, t) => s + t.amount, 0);
    return {
      id: a.id,
      nickname: a.nickname,
      type: a.type,
      last4: a.last4,
      balance: a.balance,
      currency: a.currency,
      periodSpend: spend,
      periodIncome: income,
      spendSharePct: totalSpend > 0 ? (spend / totalSpend) * 100 : 0,
    };
  });

  const byCat = new Map<string, { name: string; value: number; color: string }>();
  for (const t of periodTx.filter((t) => t.type === "expense")) {
    const name = t.category?.name || "Other";
    const color = t.category?.color || "#94a3b8";
    const cur = byCat.get(name) || { name, value: 0, color };
    cur.value += t.amount;
    byCat.set(name, cur);
  }
  const chartData = Array.from(byCat.values()).sort((a, b) => b.value - a.value);

  const days = eachDayOfInterval({
    start: period.start < subDays(period.end, 31) ? subDays(period.end, 13) : period.start,
    end: period.end > new Date() ? new Date() : period.end,
  }).slice(-14);

  const cashflow = days.map((d) => {
    const key = format(d, "yyyy-MM-dd");
    const dayTx = periodTx.filter((t) => format(t.date, "yyyy-MM-dd") === key);
    return {
      label: format(d, "MMM d"),
      income: dayTx.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0),
      spend: dayTx.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0),
    };
  });

  const tl = getTrueLayerStatus();
  const empty = accounts.length === 0;
  const connProps = mapConnections(connections);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-50">Money</h1>
          <p className="text-sm text-zinc-400">
            Together totals and per-account breakdown · {period.label}
          </p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector value={periodKey} />
        </Suspense>
      </div>

      {searchParams?.connected === "1" && (
        <div className="rounded-xl border border-brand/30 bg-brand-muted px-4 py-3 text-sm text-emerald-100">
          Bank connected successfully. Accounts and recent transactions are syncing.
        </div>
      )}

      {empty ? (
        <div className="space-y-4">
          <Card className="border-dashed border-line">
            <CardHeader>
              <CardTitle>Connect your bank</CardTitle>
              <CardDescription>
                SpendWise uses TrueLayer Open Banking to securely link UK and EU banks — Revolut,
                Monzo, Starling, and high-street providers. No mock banks here: once TrueLayer live
                credentials are set on the server, you authorise in your real bank app.
              </CardDescription>
            </CardHeader>
            <CardContent className="text-sm text-zinc-400">
              Prefer not to link a bank yet? Add accounts manually or import a CSV from the
              Transactions page. Sample data can be loaded from Settings if you just want to explore
              the UI.
            </CardContent>
          </Card>
          <ConnectBankCard
            configured={tl.configured}
            env={tl.env}
            redirectUri={tl.redirectUri}
            connections={connProps}
          />
        </div>
      ) : (
        <>
          <MoneyOverview
            periodLabel={period.shortLabel}
            totalBalance={totalBalance}
            totalSpend={totalSpend}
            totalIncome={totalIncome}
            netCashflow={totalIncome - totalSpend}
            accounts={accountRows}
          />

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Cashflow</CardTitle>
                <CardDescription>Income vs spend (recent days)</CardDescription>
              </CardHeader>
              <CardContent>
                <CashflowChart data={cashflow} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Categories</CardTitle>
                <CardDescription>Spending in {period.shortLabel}</CardDescription>
              </CardHeader>
              <CardContent>
                <CategoryChart data={chartData} />
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 lg:grid-cols-3">
            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle className="text-base">Recent activity</CardTitle>
              </CardHeader>
              <CardContent className="space-y-1">
                {recent.map((t) => (
                  <div
                    key={t.id}
                    className="flex items-center justify-between rounded-xl px-2 py-3 transition hover:bg-surface-raised/50"
                  >
                    <div>
                      <p className="text-sm font-medium text-zinc-100">
                        {t.merchant || t.description || t.type}
                      </p>
                      <p className="text-xs text-zinc-500">
                        {formatDate(t.date)} · {t.account.nickname}
                        {t.category ? ` · ${t.category.name}` : ""}
                      </p>
                    </div>
                    <span
                      className={`text-sm font-semibold tabular-nums ${
                        t.type === "income"
                          ? "text-emerald-400"
                          : t.type === "expense"
                            ? "text-rose-400"
                            : "text-sky-400"
                      }`}
                    >
                      {t.type === "income" ? "+" : t.type === "expense" ? "−" : ""}
                      {formatCurrency(t.amount, t.account.currency)}
                    </span>
                  </div>
                ))}
              </CardContent>
            </Card>
            <ConnectBankCard
              configured={tl.configured}
              env={tl.env}
              redirectUri={tl.redirectUri}
              connections={connProps}
            />
          </div>
        </>
      )}
    </div>
  );
}
