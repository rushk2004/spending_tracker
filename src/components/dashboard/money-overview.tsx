import Link from "next/link";
import { formatCurrency } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AccountSpendShare } from "@/components/dashboard/account-spend-share";

export type AccountPeriodRow = {
  id: string;
  nickname: string;
  type: string;
  last4: string | null;
  balance: number;
  currency: string;
  periodSpend: number;
  periodIncome: number;
  spendSharePct: number;
};

export function MoneyOverview({
  periodLabel,
  totalBalance,
  totalSpend,
  totalIncome,
  netCashflow,
  accounts,
}: {
  periodLabel: string;
  totalBalance: number;
  totalSpend: number;
  totalIncome: number;
  netCashflow: number;
  accounts: AccountPeriodRow[];
}) {
  return (
    <div className="space-y-5">
      <Card className="overflow-hidden border-brand/15 bg-gradient-to-br from-surface via-surface to-brand-muted/30">
        <CardHeader className="pb-3">
          <CardDescription className="text-zinc-400">Together · {periodLabel}</CardDescription>
          <CardTitle className="text-3xl font-semibold tracking-tight text-zinc-50 sm:text-4xl">
            {formatCurrency(totalBalance)}
          </CardTitle>
          <p className="text-sm text-zinc-400">Total balance across all accounts</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-2xl border border-line-soft bg-surface-muted/80 p-4 shadow-soft">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Spent</p>
              <p className="mt-1.5 text-xl font-semibold text-rose-300">{formatCurrency(totalSpend)}</p>
            </div>
            <div className="rounded-2xl border border-line-soft bg-surface-muted/80 p-4 shadow-soft">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Income</p>
              <p className="mt-1.5 text-xl font-semibold text-emerald-300">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="rounded-2xl border border-line-soft bg-surface-muted/80 p-4 shadow-soft">
              <p className="text-[11px] font-medium uppercase tracking-wider text-zinc-500">Cashflow</p>
              <p className={`mt-1.5 text-xl font-semibold ${netCashflow >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {netCashflow >= 0 ? "+" : ""}
                {formatCurrency(netCashflow)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Each account</CardTitle>
            <CardDescription>Balance now · activity in {periodLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-zinc-500">No accounts yet — connect a bank or add one manually.</p>
            ) : (
              accounts.map((a) => (
                <Link
                  key={a.id}
                  href={`/accounts/${a.id}`}
                  className="group block rounded-2xl border border-line-soft bg-surface-muted/50 p-4 transition hover:border-brand/35 hover:bg-surface-raised/60"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-medium text-zinc-100">{a.nickname}</p>
                        <Badge variant={a.type === "credit" ? "credit" : "secondary"}>{a.type}</Badge>
                      </div>
                      <p className="mt-1 text-xs text-zinc-500">
                        {a.last4 ? `····${a.last4}` : a.currency}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-lg font-semibold text-zinc-50">{formatCurrency(a.balance, a.currency)}</p>
                    </div>
                  </div>
                  <div className="mt-3 space-y-1.5">
                    <div className="flex justify-between text-xs text-zinc-400">
                      <span>Spend share</span>
                      <span>{a.spendSharePct.toFixed(0)}%</span>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
                      <div
                        className="h-full rounded-full bg-brand/80 transition-all"
                        style={{ width: `${Math.min(100, Math.max(2, a.spendSharePct))}%` }}
                      />
                    </div>
                    <div className="flex justify-between pt-1 text-xs">
                      <span className="text-rose-300/90">Spent {formatCurrency(a.periodSpend, a.currency)}</span>
                      <span className="text-emerald-300/90">In {formatCurrency(a.periodIncome, a.currency)}</span>
                    </div>
                  </div>
                </Link>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Spend by account</CardTitle>
            <CardDescription>% of period spending</CardDescription>
          </CardHeader>
          <CardContent>
            <AccountSpendShare
              rows={accounts
                .filter((a) => a.periodSpend > 0)
                .map((a) => ({
                  id: a.id,
                  name: a.nickname,
                  spend: a.periodSpend,
                  pct: a.spendSharePct,
                }))}
            />
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
