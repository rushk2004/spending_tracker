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
    <div className="space-y-4">
      <Card className="overflow-hidden border-emerald-900/30 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950/20">
        <CardHeader>
          <CardDescription>Together · {periodLabel}</CardDescription>
          <CardTitle className="text-3xl font-bold tracking-tight text-white">
            {formatCurrency(totalBalance)}
          </CardTitle>
          <p className="text-sm text-slate-400">Total balance across all accounts</p>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Spent</p>
              <p className="mt-1 text-xl font-semibold text-rose-300">{formatCurrency(totalSpend)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Income</p>
              <p className="mt-1 text-xl font-semibold text-emerald-300">{formatCurrency(totalIncome)}</p>
            </div>
            <div className="rounded-xl border border-slate-800 bg-slate-950/60 p-4">
              <p className="text-xs uppercase tracking-wide text-slate-500">Cashflow</p>
              <p className={`mt-1 text-xl font-semibold ${netCashflow >= 0 ? "text-emerald-300" : "text-rose-300"}`}>
                {formatCurrency(netCashflow)}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Each bank</CardTitle>
            <CardDescription>Balance now · spending in {periodLabel}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {accounts.length === 0 ? (
              <p className="text-sm text-slate-500">No accounts yet — connect a bank or add one manually.</p>
            ) : (
              accounts.map((a) => (
                <Link
                  key={a.id}
                  href={`/accounts/${a.id}`}
                  className="flex items-center justify-between rounded-xl border border-slate-800 bg-slate-950/50 p-4 transition hover:border-emerald-800/60 hover:bg-slate-900/80"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-100">{a.nickname}</p>
                      <Badge variant={a.type === "credit" ? "credit" : "secondary"}>{a.type}</Badge>
                    </div>
                    <p className="text-xs text-slate-500">
                      {a.last4 ? `····${a.last4}` : a.currency} · {a.spendSharePct.toFixed(0)}% of spend
                    </p>
                  </div>
                  <div className="text-right">
                    <p className="text-lg font-semibold text-emerald-300">{formatCurrency(a.balance)}</p>
                    <p className="text-xs text-rose-300/90">Spent {formatCurrency(a.periodSpend)}</p>
                    <p className="text-xs text-slate-500">In {formatCurrency(a.periodIncome)}</p>
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
