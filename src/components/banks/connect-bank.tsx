"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Landmark,
  RefreshCw,
  Unplug,
  Building2,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Search,
  ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { formatRelativeTime } from "@/lib/utils";

type Connection = {
  id: string;
  provider: string;
  institutionName: string | null;
  lastSyncedAt: string | null;
  accountCount: number;
  status: string;
};

type Institution = {
  id: string;
  name: string;
  logo: string | null;
  bic: string | null;
  countries: string[];
};

const PORTAL = "https://bankaccountdata.gocardless.com/";

function providerLabel(provider: string) {
  if (provider === "gocardless") return "GoCardless";
  if (provider === "truelayer") return "TrueLayer";
  return provider;
}

export function ConnectBankCard({
  configured,
  connections,
  redirectUri,
}: {
  configured: boolean;
  connections: Connection[];
  redirectUri?: string;
  /** @deprecated kept for call-site compatibility */
  env?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [picking, setPicking] = useState(false);
  const [institutions, setInstitutions] = useState<Institution[]>([]);
  const [loadingInstitutions, setLoadingInstitutions] = useState(false);
  const [query, setQuery] = useState("");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  useEffect(() => {
    if (!picking || !configured) return;
    let cancelled = false;
    (async () => {
      setLoadingInstitutions(true);
      setMessage(null);
      try {
        const res = await fetch("/api/gocardless/institutions?country=gb&eu=1");
        const data = await res.json();
        if (cancelled) return;
        if (!res.ok) {
          setMessage({ type: "err", text: data.message || data.error || "Could not load banks" });
          setInstitutions([]);
        } else {
          setInstitutions(data.institutions || []);
        }
      } catch {
        if (!cancelled) setMessage({ type: "err", text: "Could not load banks" });
      } finally {
        if (!cancelled) setLoadingInstitutions(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [picking, configured]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return institutions;
    return institutions.filter(
      (i) =>
        i.name.toLowerCase().includes(q) ||
        i.id.toLowerCase().includes(q) ||
        (i.bic || "").toLowerCase().includes(q)
    );
  }, [institutions, query]);

  async function connectInstitution(inst: Institution) {
    setLoading(true);
    setMessage(null);
    const res = await fetch("/api/gocardless/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ institutionId: inst.id, institutionName: inst.name }),
    });
    const data = await res.json();
    if (data.url) {
      window.location.href = data.url;
      return;
    }
    setMessage({
      type: "err",
      text: data.message || data.error || "Could not start GoCardless bank link",
    });
    setLoading(false);
  }

  async function syncAll() {
    setSyncing(true);
    setMessage(null);
    const res = await fetch("/api/gocardless/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: "{}",
    });
    const data = await res.json();
    setSyncing(false);
    if (res.ok) {
      setMessage({
        type: "ok",
        text: `Synced ${data.connections ?? 1} connection${(data.connections ?? 1) === 1 ? "" : "s"} · ${data.transactions ?? 0} new transactions`,
      });
      router.refresh();
    } else {
      setMessage({ type: "err", text: data.error || "Sync failed" });
    }
  }

  async function disconnect(id?: string) {
    if (!confirm("Disconnect bank? Linked accounts stay but stop auto-syncing.")) return;
    setLoading(true);
    await fetch("/api/gocardless/disconnect", {
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
          Secure Open Banking via GoCardless Bank Account Data. Pick your bank, authorise in the
          bank app, and balances plus transactions sync into SpendWise. Manual accounts and CSV
          remain available as a fallback.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {!configured && connections.length === 0 && (
          <div className="rounded-xl border border-amber-500/25 bg-amber-500/5 p-4 text-sm text-amber-100/90">
            <div className="mb-1 flex items-center gap-2 font-medium text-amber-200">
              <AlertCircle className="h-4 w-4" />
              GoCardless secrets required
            </div>
            <p className="mb-3 text-amber-100/70">
              Create free Bank Account Data user secrets, then set{" "}
              <code className="rounded bg-black/30 px-1 text-xs">GOCARDLESS_SECRET_ID</code> and{" "}
              <code className="rounded bg-black/30 px-1 text-xs">GOCARDLESS_SECRET_KEY</code> on the
              server. Use redirect URI{" "}
              <code className="break-all rounded bg-black/30 px-1 text-xs">
                {redirectUri || "/api/gocardless/callback"}
              </code>
              .
            </p>
            <a
              href={PORTAL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              Open GoCardless Bank Account Data portal
              <ExternalLink className="h-3.5 w-3.5" />
            </a>
          </div>
        )}

        <div className="flex flex-wrap gap-2">
          {configured && (
            <Button
              onClick={() => {
                setPicking((v) => !v);
                setMessage(null);
              }}
              disabled={loading || syncing}
            >
              {loading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Building2 className="h-4 w-4" />
              )}
              {picking ? "Hide bank list" : "Connect your bank"}
            </Button>
          )}
          {!configured && (
            <Button asChild variant="outline">
              <a href={PORTAL} target="_blank" rel="noreferrer">
                <ExternalLink className="h-4 w-4" />
                Get secrets
              </a>
            </Button>
          )}
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

        {picking && configured && (
          <div className="space-y-3 rounded-xl border border-line-soft bg-surface-muted/50 p-3">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
              <Input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search UK banks — Revolut, Monzo, Starling…"
                className="pl-9"
                autoFocus
              />
            </div>
            {loadingInstitutions ? (
              <div className="flex items-center gap-2 px-1 py-6 text-sm text-zinc-400">
                <Loader2 className="h-4 w-4 animate-spin text-brand" />
                Loading institutions…
              </div>
            ) : (
              <ul className="max-h-64 space-y-1 overflow-y-auto pr-1">
                {filtered.length === 0 && (
                  <li className="px-2 py-4 text-center text-sm text-zinc-500">No banks match</li>
                )}
                {filtered.map((inst) => (
                  <li key={inst.id}>
                    <button
                      type="button"
                      disabled={loading}
                      onClick={() => connectInstitution(inst)}
                      className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-brand-muted/40 disabled:opacity-50"
                    >
                      {inst.logo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={inst.logo}
                          alt=""
                          className="h-8 w-8 rounded-md bg-white object-contain p-0.5"
                        />
                      ) : (
                        <div className="flex h-8 w-8 items-center justify-center rounded-md bg-surface-raised text-zinc-400">
                          <Building2 className="h-4 w-4" />
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-zinc-100">{inst.name}</p>
                        <p className="truncate text-[11px] text-zinc-500">{inst.id}</p>
                      </div>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        )}

        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-zinc-500">
          <span>
            GoCardless Bank Account Data
            {configured ? " · credentials ready" : " · credentials missing"}
          </span>
          {lastSynced && (
            <span className="text-zinc-400">Last synced {formatRelativeTime(lastSynced)}</span>
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
                    {providerLabel(c.provider)} · {c.accountCount} account
                    {c.accountCount === 1 ? "" : "s"}
                    {c.lastSyncedAt ? ` · ${formatRelativeTime(c.lastSyncedAt)}` : " · never synced"}
                  </p>
                </div>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => disconnect(c.id)}
                  disabled={loading || syncing}
                >
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
