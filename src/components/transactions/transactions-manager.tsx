"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Pencil, Trash2, Upload, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent } from "@/components/ui/card";
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
import {
  createTransaction,
  updateTransaction,
  deleteTransaction,
  importTransactionsCsv,
} from "@/app/actions/transactions";
import { formatCurrency, formatDate } from "@/lib/utils";

type Account = { id: string; nickname: string; type: string };
type Category = { id: string; name: string; icon: string | null; color: string | null };
type Tx = {
  id: string;
  accountId: string;
  categoryId: string | null;
  type: string;
  amount: number;
  date: string;
  description: string | null;
  merchant: string | null;
  transferAccountId: string | null;
  account: Account;
  category: Category | null;
};

export function TransactionsManager({
  transactions,
  accounts,
  categories,
}: {
  transactions: Tx[];
  accounts: Account[];
  categories: Category[];
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [importOpen, setImportOpen] = useState(false);
  const [editing, setEditing] = useState<Tx | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // filters
  const [q, setQ] = useState("");
  const [filterAccount, setFilterAccount] = useState("all");
  const [filterCategory, setFilterCategory] = useState("all");
  const [filterType, setFilterType] = useState("all");
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // form
  const [accountId, setAccountId] = useState(accounts[0]?.id || "");
  const [categoryId, setCategoryId] = useState("");
  const [type, setType] = useState("expense");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(new Date().toISOString().slice(0, 10));
  const [description, setDescription] = useState("");
  const [merchant, setMerchant] = useState("");
  const [transferAccountId, setTransferAccountId] = useState("");

  // import
  const [csvText, setCsvText] = useState("");
  const [importAccountId, setImportAccountId] = useState(accounts[0]?.id || "");
  const [importMsg, setImportMsg] = useState("");

  const filtered = useMemo(() => {
    return transactions.filter((t) => {
      if (filterAccount !== "all" && t.accountId !== filterAccount) return false;
      if (filterCategory !== "all" && t.categoryId !== filterCategory) return false;
      if (filterType !== "all" && t.type !== filterType) return false;
      if (dateFrom && new Date(t.date) < new Date(dateFrom)) return false;
      if (dateTo && new Date(t.date) > new Date(dateTo + "T23:59:59")) return false;
      if (q) {
        const hay = `${t.merchant || ""} ${t.description || ""} ${t.category?.name || ""}`.toLowerCase();
        if (!hay.includes(q.toLowerCase())) return false;
      }
      return true;
    });
  }, [transactions, filterAccount, filterCategory, filterType, dateFrom, dateTo, q]);

  function resetForm() {
    setAccountId(accounts[0]?.id || "");
    setCategoryId("");
    setType("expense");
    setAmount("");
    setDate(new Date().toISOString().slice(0, 10));
    setDescription("");
    setMerchant("");
    setTransferAccountId("");
    setError("");
  }

  function openCreate() {
    setEditing(null);
    resetForm();
    setOpen(true);
  }

  function openEdit(t: Tx) {
    setEditing(t);
    setAccountId(t.accountId);
    setCategoryId(t.categoryId || "");
    setType(t.type);
    setAmount(String(t.amount));
    setDate(t.date.slice(0, 10));
    setDescription(t.description || "");
    setMerchant(t.merchant || "");
    setTransferAccountId(t.transferAccountId || "");
    setError("");
    setOpen(true);
  }

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!accountId) {
      setError("Add an account first");
      return;
    }
    setLoading(true);
    const payload = {
      accountId,
      categoryId: categoryId || null,
      type: type as "income" | "expense" | "transfer",
      amount: parseFloat(amount),
      date,
      description: description || null,
      merchant: merchant || null,
      transferAccountId: type === "transfer" ? transferAccountId || null : null,
    };
    const res = editing
      ? await updateTransaction(editing.id, payload)
      : await createTransaction(payload);
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this transaction?")) return;
    await deleteTransaction(id);
    router.refresh();
  }

  async function onImport(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setImportMsg("");
    const res = await importTransactionsCsv(csvText, importAccountId);
    setLoading(false);
    if (res.error) {
      setImportMsg(res.error);
      return;
    }
    setImportMsg(`Imported ${res.imported} transactions`);
    setCsvText("");
    router.refresh();
  }

  const typeBadge = (t: string) =>
    t === "income" ? "income" : t === "expense" ? "expense" : "transfer";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2 justify-end">
        <Dialog open={importOpen} onOpenChange={setImportOpen}>
          <DialogTrigger asChild>
            <Button variant="secondary" disabled={!accounts.length}>
              <Upload className="h-4 w-4" />
              Import CSV
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-xl">
            <DialogHeader>
              <DialogTitle>Import transactions</DialogTitle>
            </DialogHeader>
            <form onSubmit={onImport} className="space-y-4">
              <div className="space-y-2">
                <Label>Default account</Label>
                <Select value={importAccountId} onValueChange={setImportAccountId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nickname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>CSV content</Label>
                <Textarea
                  rows={8}
                  value={csvText}
                  onChange={(e) => setCsvText(e.target.value)}
                  placeholder={`date,amount,type,category,merchant,description,account\n2026-01-15,42.50,expense,Dining,Cafe,Lunch,Everyday Checking`}
                  required
                />
              </div>
              {importMsg && <p className="text-sm text-slate-300">{importMsg}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Importing…" : "Import"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>

        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button onClick={openCreate} disabled={!accounts.length}>
              <Plus className="h-4 w-4" />
              Add transaction
            </Button>
          </DialogTrigger>
          <DialogContent className="max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>{editing ? "Edit transaction" : "New transaction"}</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-3">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="expense">Expense</SelectItem>
                    <SelectItem value="income">Income</SelectItem>
                    <SelectItem value="transfer">Transfer</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Account</Label>
                <Select value={accountId} onValueChange={setAccountId}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {accounts.map((a) => (
                      <SelectItem key={a.id} value={a.id}>
                        {a.nickname}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {type === "transfer" && (
                <div className="space-y-2">
                  <Label>To account</Label>
                  <Select value={transferAccountId} onValueChange={setTransferAccountId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Destination" />
                    </SelectTrigger>
                    <SelectContent>
                      {accounts
                        .filter((a) => a.id !== accountId)
                        .map((a) => (
                          <SelectItem key={a.id} value={a.id}>
                            {a.nickname}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              <div className="space-y-2">
                <Label>Amount</Label>
                <Input type="number" step="0.01" min="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Date</Label>
                <Input type="date" value={date} onChange={(e) => setDate(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId || "none"} onValueChange={(v) => setCategoryId(v === "none" ? "" : v)}>
                  <SelectTrigger>
                    <SelectValue placeholder="Optional" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">None</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.icon} {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Merchant</Label>
                <Input value={merchant} onChange={(e) => setMerchant(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Input value={description} onChange={(e) => setDescription(e.target.value)} />
              </div>
              {error && <p className="text-sm text-rose-400">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving…" : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="space-y-3 pt-5">
          <div className="relative">
            <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-500" />
            <Input className="pl-9" placeholder="Search merchant or description…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-2 lg:grid-cols-5">
            <Select value={filterAccount} onValueChange={setFilterAccount}>
              <SelectTrigger>
                <SelectValue placeholder="Account" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All accounts</SelectItem>
                {accounts.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.nickname}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterCategory} onValueChange={setFilterCategory}>
              <SelectTrigger>
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All categories</SelectItem>
                {categories.map((c) => (
                  <SelectItem key={c.id} value={c.id}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select value={filterType} onValueChange={setFilterType}>
              <SelectTrigger>
                <SelectValue placeholder="Type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All types</SelectItem>
                <SelectItem value="income">Income</SelectItem>
                <SelectItem value="expense">Expense</SelectItem>
                <SelectItem value="transfer">Transfer</SelectItem>
              </SelectContent>
            </Select>
            <Input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
            <Input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />
          </div>
        </CardContent>
      </Card>

      {!accounts.length ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-slate-400">
            Create an account before adding transactions.
          </CardContent>
        </Card>
      ) : filtered.length === 0 ? (
        <Card className="border-dashed">
          <CardContent className="py-12 text-center text-slate-400">
            <p className="mb-1 font-medium text-slate-200">No matching transactions</p>
            <p className="text-sm">Try adjusting filters or add your first transaction.</p>
          </CardContent>
        </Card>
      ) : (
        <div className="overflow-hidden rounded-xl border border-slate-800">
          <div className="hidden grid-cols-12 gap-2 bg-slate-900/80 px-4 py-2 text-xs font-medium uppercase tracking-wide text-slate-500 md:grid">
            <div className="col-span-2">Date</div>
            <div className="col-span-3">Details</div>
            <div className="col-span-2">Account</div>
            <div className="col-span-2">Category</div>
            <div className="col-span-1">Type</div>
            <div className="col-span-1 text-right">Amount</div>
            <div className="col-span-1" />
          </div>
          {filtered.map((t) => (
            <div
              key={t.id}
              className="grid grid-cols-1 gap-2 border-t border-slate-800/80 px-4 py-3 text-sm md:grid-cols-12 md:items-center"
            >
              <div className="md:col-span-2 text-slate-400">{formatDate(t.date)}</div>
              <div className="md:col-span-3">
                <p className="font-medium">{t.merchant || t.description || "—"}</p>
                {t.merchant && t.description && (
                  <p className="text-xs text-slate-500">{t.description}</p>
                )}
              </div>
              <div className="md:col-span-2 text-slate-400">{t.account.nickname}</div>
              <div className="md:col-span-2 text-slate-400">
                {t.category ? `${t.category.icon || ""} ${t.category.name}` : "—"}
              </div>
              <div className="md:col-span-1">
                <Badge variant={typeBadge(t.type) as "income" | "expense" | "transfer"}>{t.type}</Badge>
              </div>
              <div
                className={`md:col-span-1 md:text-right font-semibold ${
                  t.type === "income" ? "text-emerald-400" : t.type === "expense" ? "text-rose-400" : "text-sky-400"
                }`}
              >
                {formatCurrency(t.amount)}
              </div>
              <div className="flex gap-1 md:col-span-1 md:justify-end">
                <Button size="icon" variant="ghost" onClick={() => openEdit(t)}>
                  <Pencil className="h-3.5 w-3.5" />
                </Button>
                <Button size="icon" variant="ghost" onClick={() => onDelete(t.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
