"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, RefreshCw, Unplug, Building2, AlertCircle, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatRelativeTime } from "@/lib/utils";

type Connection = {
  id: string;
  provider: string;
  institutionName: string | null;
  lastSyncedAt: string | null;
  accountCount: number;
  status: string;
};

export function ConnectBankCard({
  configured,
  env,
  connections,
  redirectUri,
}: {
  configured: boolean;
  env: string;
  connections: Connection[];
  redirectUri?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  async function connectLive() {
    setLoading(true);
    setMessage(null);

    if (!configured) {
      setMessage({
        type: "err",
        text: "TrueLayer credentials are not configured on this server. Add TRUELAYER_CLIENT_ID and TRUELAYER_CLIENT_SECRET with TRUELAYER_ENV=live.",
      });
      setLoading(false);
      return;
    }

    const res = await fetch("/api/truelayer/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "live" }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setMessage({
      type: "err",
      text: data.message || data.error || "Could not start TrueLayer Open Banking",
    });
    setLoading(false);
  }

  async function syncAll() {
    setSyncing(true);
    setMessage(null);
    const res = await fetch("/api/truelayer/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json();
    setSyncing(false);
    if (res.ok) {
      setMessage({
        type: "ok",
        text: `Synced ${data.connections ?? 1} connection${(data.connections ?? 1) === 1 ? "" : "s"} · ${data.transactions ?? 0} transactions`,
      });
      router.refresh();
    } else {
      setMessage({ type: "err", text: data.error || "Sync failed" });
    }
  }

  async function disconnect(id?: string) {
    if (!confirm("Disconnect bank? Linked accounts stay but stop auto-syncing.")) return;
    setLoading(true);
    await fetch("/api/truelayer/disconnect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ connectionId: id }),
    });
    setLoading(false);
    router.refresh();
  }

  const lastSynced = connections
    .map((c) => c.lastSyncedAt)
    .filter(Boolean)
    .sort()
    .reverse()[0];

  return (
    <Card className="border-brand/20 bg-gradient-to-br from-brand-muted/40 via-surface to-surface">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4 text-brand" />
          Connect bank
        </CardTitle>
        <CardDescription>
          Secure Open Banking via TrueLayer. Authorise in your bank app — balances and transactions
          sync into SpendWise. Manual accounts and CSV remain available as a fallback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!configured && connections.length === 0 && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-100/90">
            <div className="mb-1 flex items-center gap-2 font-medium text-amber-200">
              <AlertCircle className="h-4 w-4" />
              TrueLayer credentials required
            </div>
            <p className="text-amber-100/70">
              To connect real UK/EU banks (Revolut, Monzo, Starling, and more), set{" "}
              <code className="rounded bg-black/30 px-1 text-xs">TRUELAYER_CLIENT_ID</code>,{" "}
              <code className="rounded bg-black/30 px-1 text-xs">TRUELAYER_CLIENT_SECRET</code>, and{" "}
              <code className="rounded bg-black/30 px-1 text-xs">TRUELAYER_ENV=live</code> on the
              server. Register redirect URI{" "}
              <code className="break-all rounded bg-black/30 px-1 text-xs">
                {redirectUri || "/api/truelayer/callback"}
              </code>{" "}
              in the TrueLayer Console.
            </p>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          <Button onClick={connectLive} disabled={loading || syncing}>
            {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Building2 className="h-4 w-4" />}
            {configured ? "Connect your bank" : "Connect your bank"}
          </Button>
          {connections.length > 0 && (
            <Button variant="outline" onClick={syncAll} disabled={loading || syncing}>
              {syncing ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="h-4 w-4" />
              )}
              {syncing ? "Syncing…" : "Sync now"}
            </Button>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span>
            Mode: <span className="text-zinc-300">{env}</span>
            {configured ? " · credentials ready" : " · credentials missing"}
          </span>
          {lastSynced && (
            <span className="text-zinc-400">
              Last synced {formatRelativeTime(lastSynced)}
            </span>
          )}
        </div>

        {connections.length > 0 && (
          <ul className="space-y-2">
            {connections.map((c) => (
              <li
                key={c.id}
                className="flex items-center justify-between rounded-xl border border-line-soft bg-surface-muted/70 px-3 py-2.5 text-sm"
              >
                <div>
                  <p className="font-medium text-zinc-100">{c.institutionName || "Bank"}</p>
                  <p className="text-xs text-zinc-500">
                    {c.provider === "truelayer" ? "TrueLayer" : c.provider} · {c.accountCount}{" "}
                    account{c.accountCount === 1 ? "" : "s"}
                    {c.lastSyncedAt ? ` · ${formatRelativeTime(c.lastSyncedAt)}` : " · never synced"}
                  </p>
                </div>
                <Button size="sm" variant="ghost" onClick={() => disconnect(c.id)} disabled={loading || syncing}>
                  <Unplug className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        )}

        {message && (
          <p
            className={`flex items-start gap-2 text-xs ${
              message.type === "ok" ? "text-brand" : "text-rose-300"
            }`}
          >
            {message.type === "ok" ? (
              <CheckCircle2 className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            ) : (
              <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            )}
            {message.text}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
