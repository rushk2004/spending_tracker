"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Landmark, RefreshCw, Unplug, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

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
}: {
  configured: boolean;
  env: string;
  connections: Connection[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  async function connectLive() {
    setLoading(true);
    setMessage("");
    if (configured) {
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
      setMessage(data.message || data.error || "Could not start TrueLayer");
      setLoading(false);
      return;
    }
    setOpen(true);
    setLoading(false);
  }

  async function connectMock(institution: "revolut" | "monzo" | "starling") {
    setLoading(true);
    setMessage("");
    const res = await fetch("/api/truelayer/connect", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ mode: "mock", institution }),
    });
    const data = await res.json();
    setLoading(false);
    if (!res.ok) {
      setMessage(data.error || "Mock connect failed");
      return;
    }
    setOpen(false);
    setMessage(`Synced ${data.accounts} accounts · ${data.transactions} transactions`);
    router.refresh();
  }

  async function syncAll() {
    setLoading(true);
    const res = await fetch("/api/truelayer/sync", { method: "POST", body: "{}" });
    const data = await res.json();
    setLoading(false);
    setMessage(res.ok ? `Synced · ${data.transactions ?? 0} new transactions` : data.error);
    router.refresh();
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

  return (
    <>
      <Card className="border-emerald-900/40 bg-gradient-to-br from-emerald-950/30 to-slate-950/40">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Landmark className="h-4 w-4 text-emerald-400" />
            Connect bank
          </CardTitle>
          <CardDescription>
            Emma-style Open Banking via TrueLayer (UK/EU). Authorize in your bank app — balances and
            transactions sync automatically. Manual accounts & CSV remain available as fallback.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button onClick={connectLive} disabled={loading}>
              <Building2 className="h-4 w-4" />
              {configured ? "Connect with TrueLayer" : "Connect bank"}
            </Button>
            <Button variant="secondary" onClick={() => setOpen(true)} disabled={loading}>
              Try sandbox banks
            </Button>
            {connections.length > 0 && (
              <>
                <Button variant="outline" onClick={syncAll} disabled={loading}>
                  <RefreshCw className="h-4 w-4" />
                  Sync now
                </Button>
              </>
            )}
          </div>

          <p className="text-xs text-slate-500">
            Mode: <span className="text-slate-300">{env}</span>
            {configured ? " · credentials detected" : " · using local sandbox demo until credentials are set"}
          </p>

          {connections.length > 0 && (
            <ul className="space-y-2">
              {connections.map((c) => (
                <li
                  key={c.id}
                  className="flex items-center justify-between rounded-lg border border-slate-800 bg-slate-950/50 px-3 py-2 text-sm"
                >
                  <div>
                    <p className="font-medium">{c.institutionName || "Bank"}</p>
                    <p className="text-xs text-slate-500">
                      {c.provider} · {c.accountCount} accounts
                      {c.lastSyncedAt ? ` · synced ${new Date(c.lastSyncedAt).toLocaleString()}` : ""}
                    </p>
                  </div>
                  <Button size="sm" variant="ghost" onClick={() => disconnect(c.id)} disabled={loading}>
                    <Unplug className="h-3.5 w-3.5" />
                  </Button>
                </li>
              ))}
            </ul>
          )}

          {message && <p className="text-xs text-emerald-400">{message}</p>}
        </CardContent>
      </Card>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Choose a bank</DialogTitle>
            <DialogDescription>
              {configured
                ? "Sandbox demo institutions — or use Connect with TrueLayer for the full Open Banking authorize flow."
                : "Local sandbox simulation (no TrueLayer keys required). Add TRUELAYER_* env vars for live Open Banking."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-2">
            {(
              [
                ["revolut", "Revolut"],
                ["monzo", "Monzo"],
                ["starling", "Starling"],
              ] as const
            ).map(([id, label]) => (
              <Button
                key={id}
                variant="secondary"
                className="justify-start"
                disabled={loading}
                onClick={() => connectMock(id)}
              >
                <Building2 className="h-4 w-4" />
                {label}
              </Button>
            ))}
          </div>
          {configured && (
            <Button
              className="w-full"
              disabled={loading}
              onClick={() => {
                setOpen(false);
                connectLive();
              }}
            >
              Continue to TrueLayer authorize
            </Button>
          )}
        </DialogContent>
      </Dialog>
    </>
  );
}
