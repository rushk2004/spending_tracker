import { redirect } from "next/navigation";
import { requireUser } from "@/lib/session";
import { getGoCardlessStatus } from "@/lib/gocardless";
import { getOAuthAvailability } from "@/lib/oauth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { DemoButton } from "@/components/dashboard/demo-button";
import { ConnectBankCard } from "@/components/banks/connect-bank";
import { prisma } from "@/lib/prisma";

const ERROR_COPY: Record<string, string> = {
  not_configured:
    "GoCardless credentials are missing. Set GOCARDLESS_SECRET_ID and GOCARDLESS_SECRET_KEY from https://bankaccountdata.gocardless.com/",
  invalid_state: "Bank connect session expired. Please try Connect bank again.",
  connect_failed: "Could not finish connecting your bank.",
  access_denied: "You cancelled bank authorisation.",
};

export default async function SettingsPage({
  searchParams,
}: {
  searchParams?: { bank_error?: string; bank_detail?: string };
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

  const gc = getGoCardlessStatus();
  const oauth = getOAuthAvailability();
  const errKey = searchParams?.bank_error;
  const errDetail = searchParams?.bank_detail;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold text-zinc-50">Settings</h1>
        <p className="text-sm text-zinc-400">Profile, bank sync, and integrations</p>
      </div>

      {errKey && (
        <Card className="border-rose-500/30 bg-rose-500/5">
          <CardContent className="space-y-1 pt-5 text-sm text-rose-200">
            <p className="font-medium">{ERROR_COPY[errKey] || `Bank connect error: ${errKey}`}</p>
            {errDetail && <p className="text-rose-200/70">{errDetail}</p>}
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Profile</CardTitle>
          <CardDescription>Signed-in account</CardDescription>
        </CardHeader>
        <CardContent className="space-y-1 text-sm">
          <p>
            <span className="text-zinc-500">Name:</span> {session.name || "—"}
          </p>
          <p>
            <span className="text-zinc-500">Email:</span> {session.email}
          </p>
        </CardContent>
      </Card>

      <ConnectBankCard
        configured={gc.configured}
        redirectUri={gc.redirectUri}
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
          <CardTitle className="text-base">Developer extras</CardTitle>
          <CardDescription>
            Optional sample data for exploring the UI without a bank link. Not used in the primary
            Connect bank flow.
          </CardDescription>
        </CardHeader>
        <CardContent>
          {accountCount === 0 ? (
            <DemoButton />
          ) : (
            <p className="text-sm text-zinc-400">
              You already have {accountCount} account(s). Clear accounts first if you want to load
              sample data.
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Environment</CardTitle>
        </CardHeader>
        <CardContent className="space-y-1 text-sm text-zinc-400">
          <p>
            GoCardless Bank Account Data:{" "}
            {gc.configured ? "configured" : "not configured — set SECRET_ID / SECRET_KEY"}
          </p>
          <p>
            Portal:{" "}
            <a className="text-brand hover:underline" href={gc.portalUrl} target="_blank" rel="noreferrer">
              {gc.portalUrl}
            </a>
          </p>
          <p>Google OAuth: {oauth.google ? "on" : "off"}</p>
          <p>X (Twitter) OAuth: {oauth.twitter ? "on" : "off"}</p>
          <p>
            Redirect URI: <code className="text-zinc-300">{gc.redirectUri}</code>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
