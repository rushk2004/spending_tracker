import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/session";
import { formatCurrency, formatDate } from "@/lib/utils";
import { getPeriodRange, parsePeriod } from "@/lib/period";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Suspense } from "react";
import { PeriodSelector } from "@/components/dashboard/period-selector";

export default async function AccountDetailPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams?: { period?: string };
}) {
  const session = await requireUser();
  if (!session?.userId) redirect("/login");

  const account = await prisma.account.findFirst({
    where: { id: params.id, userId: session.userId },
    include: { bankConnection: true },
  });
  if (!account) notFound();

  const periodKey = parsePeriod(searchParams?.period);
  const period = getPeriodRange(periodKey);

  const txs = await prisma.transaction.findMany({
    where: {
      userId: session.userId,
      accountId: account.id,
      date: { gte: period.start, lte: period.end },
    },
    include: { category: true },
    orderBy: { date: "desc" },
  });

  const spend = txs.filter((t) => t.type === "expense").reduce((s, t) => s + t.amount, 0);
  const income = txs.filter((t) => t.type === "income").reduce((s, t) => s + t.amount, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Link href="/accounts" className="mb-2 inline-flex items-center gap-1 text-xs text-slate-500 hover:text-slate-300">
            <ArrowLeft className="h-3 w-3" /> All accounts
          </Link>
          <h1 className="text-2xl font-bold text-white">{account.nickname}</h1>
          <p className="text-sm capitalize text-slate-400">
            {account.type}
            {account.last4 ? ` ····${account.last4}` : ""}
            {account.bankConnection ? ` · via ${account.bankConnection.institutionName || account.bankConnection.provider}` : " · manual"}
          </p>
        </div>
        <Suspense fallback={null}>
          <PeriodSelector value={periodKey} />
        </Suspense>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Current balance</CardDescription>
            <CardTitle className="text-2xl text-emerald-300">{formatCurrency(account.balance)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Spent · {period.shortLabel}</CardDescription>
            <CardTitle className="text-2xl text-rose-300">{formatCurrency(spend)}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Income · {period.shortLabel}</CardDescription>
            <CardTitle className="text-2xl text-emerald-300">{formatCurrency(income)}</CardTitle>
          </CardHeader>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Activity</CardTitle>
          <CardDescription>{txs.length} transactions in {period.label}</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          {txs.length === 0 ? (
            <p className="text-sm text-slate-500">No transactions in this period.</p>
          ) : (
            txs.map((t) => (
              <div key={t.id} className="flex items-center justify-between border-b border-slate-800/60 pb-3 last:border-0">
                <div>
                  <p className="text-sm font-medium">{t.merchant || t.description || t.type}</p>
                  <p className="text-xs text-slate-500">
                    {formatDate(t.date)}
                    {t.category ? ` · ${t.category.name}` : ""}
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={t.type === "income" ? "income" : t.type === "expense" ? "expense" : "transfer"}>
                    {t.type}
                  </Badge>
                  <span className={`text-sm font-semibold ${t.type === "income" ? "text-emerald-400" : "text-rose-400"}`}>
                    {formatCurrency(t.amount)}
                  </span>
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
