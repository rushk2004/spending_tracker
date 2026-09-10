"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { createAccount, updateAccount, deleteAccount } from "@/app/actions/accounts";
import { formatCurrency } from "@/lib/utils";
import { ACCOUNT_TYPES } from "@/lib/categories";

type Account = {
  id: string;
  nickname: string;
  type: string;
  last4: string | null;
  balance: number;
};

export function AccountsManager({ accounts }: { accounts: Account[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Account | null>(null);
  const [nickname, setNickname] = useState("");
  const [type, setType] = useState("checking");
  const [last4, setLast4] = useState("");
  const [balance, setBalance] = useState("0");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  function openCreate() {
    setEditing(null);
    setNickname("");
    setType("checking");
    setLast4("");
    setBalance("0");
    setError("");
    setOpen(true);
  }

  function openEdit(a: Account) {
    setEditing(a);
    setNickname(a.nickname);
    setType(a.type);
    setLast4(a.last4 || "");
    setBalance(String(a.balance));
    setError("");
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const payload = {
      nickname,
      type: type as "checking" | "savings" | "credit",
      last4: last4 || null,
      balance: parseFloat(balance) || 0,
    };
    const res = editing
      ? await updateAccount(editing.id, payload)
      : await createAccount(payload);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this account and its transactions?")) return;
    await deleteAccount(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate}>
              <Plus className="h-4 w-4" />
              Add account
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>{editing ? "Edit account" : "New account"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Nickname</Label>
                <Input value={nickname} onChange={(e) => setNickname(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {ACCOUNT_TYPES.map((t) => (
                      <SelectItem key={t.value} value={t.value}>
                        {t.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Last 4 (optional)</Label>
                <Input value={last4} onChange={(e) => setLast4(e.target.value.slice(0, 4))} maxLength={4} />
              </div>
              <div className="space-y-2">
                <Label>Current balance</Label>
                <Input type="number" step="0.01" value={balance} onChange={(e) => setBalance(e.target.value)} required />
              </div>
              {error && <p className="text-sm text-rose-400">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving…" : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      {accounts.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-slate-400">
            <p className="mb-2 font-medium text-slate-200">No accounts yet</p>
            <p className="text-sm">Add a checking, savings, or credit card account to start tracking.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {accounts.map((a) => (
            <Card key={a.id}>
              <CardHeader className="flex flex-row items-start justify-between space-y-0">
                <div>
                  <CardTitle className="text-base">{a.nickname}</CardTitle>
                  <p className="mt-1 text-xs capitalize text-slate-500">
                    {a.type}
                    {a.last4 ? ` ····${a.last4}` : ""}
                  </p>
                </div>
                <Badge variant={a.type === "credit" ? "credit" : "secondary"}>{a.type}</Badge>
              </CardHeader>
              <CardContent>
                <p className={`text-2xl font-bold ${a.type === "credit" ? "text-violet-300" : "text-emerald-300"}`}>
                  {formatCurrency(a.balance)}
                </p>
                <div className="mt-4 flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => openEdit(a)}>
                    <Pencil className="h-3 w-3" />
                    Edit
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => onDelete(a.id)}>
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
