import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getTrueLayerStatus } from "@/lib/truelayer";
import { getOAuthAvailability } from "@/lib/oauth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoButton } from "@/components/dashboard/demo-button";
import { ConnectBankCard } from "@/components/banks/connect-bank";
import { prisma } from "@/lib/prisma";

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { bank_error?: string };
}) {
  const session = await requireUser();
  if (!session?.userId) redirect("/login");

  const [accountCount, connections] = await Promise.all([
    prisma.account.count({ where: { userId: session.userId } }),
    prisma.bankConnection.findMany({
      where: { userId: session.userId },
      include: { accounts: true },
      orderBy: { updatedAt: "desc" },
    }),
  ]);

  const tl = getTrueLayerStatus();
  const oauth = getOAuthAvailability();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Settings</h1>
        <p className="text-sm text-slate-400">Profile, bank sync, and integrations</p>
      </div>

      {searchParams?.bank_error && (
        <Card className="border-rose-900/50">
          <CardContent className="pt-5 text-sm text-rose-300">
            Bank connect error: {searchParams.bank_error}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Signed-in account (works from any device against your hosted DB)</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-slate-500">Name:</span> {session.name || "—"}
          </p>
          <p>
            <span className="text-slate-500">Email:</span> {session.email}
          </p>
        </CardContent>
      </Card>

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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Demo data</CardTitle>
          <CardDescription>Sample accounts when workspace is empty</CardDescription>
        </CardHeader>
        <CardContent>
          {accountCount === 0 ? (
            <DemoButton />
          ) : (
            <p className="text-sm text-slate-400">
              You already have {accountCount} account(s). Use Connect bank or delete accounts to reload demos.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-slate-400">
          <p>TrueLayer: {tl.configured ? `configured (${tl.env})` : `not configured — mock sandbox available (${tl.env})`}</p>
          <p>Google OAuth: {oauth.google ? "on" : "off"}</p>
          <p>X (Twitter) OAuth: {oauth.twitter ? "on" : "off"}</p>
          <p>
            Redirect URI: <code className="text-slate-300">{tl.redirectUri}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
