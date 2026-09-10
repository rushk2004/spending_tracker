"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { createCategory, deleteCategory } from "@/app/actions/categories";

type Category = {
  id: string;
  name: string;
  icon: string | null;
  color: string | null;
  isDefault: boolean;
  _count: { transactions: number };
};

export function CategoriesManager({ categories }: { categories: Category[] }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("✨");
  const [color, setColor] = useState("#34d399");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await createCategory({ name, icon, color });
    setLoading(false);
    if (res.error) {
      setError(res.error);
      return;
    }
    setOpen(false);
    setName("");
    router.refresh();
  }

  async function onDelete(id: string) {
    if (!confirm("Delete this category?")) return;
    await deleteCategory(id);
    router.refresh();
  }

  return (
    <div className="space-y-4">
      <div className="flex justify-end">
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4" />
              Add category
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>New category</DialogTitle>
            </DialogHeader>
            <form onSubmit={onSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label>Name</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} required />
              </div>
              <div className="space-y-2">
                <Label>Icon (emoji)</Label>
                <Input value={icon} onChange={(e) => setIcon(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label>Color</Label>
                <Input type="color" value={color} onChange={(e) => setColor(e.target.value)} />
              </div>
              {error && <p className="text-sm text-rose-400">{error}</p>}
              <Button type="submit" disabled={loading} className="w-full">
                {loading ? "Saving…" : "Save"}
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {categories.map((c) => (
          <Card key={c.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div className="flex items-center gap-3">
                <div
                  className="flex h-10 w-10 items-center justify-center rounded-xl text-lg"
                  style={{ backgroundColor: `${c.color || "#94a3b8"}22` }}
                >
                  {c.icon || "📦"}
                </div>
                <div>
                  <p className="font-medium">{c.name}</p>
                  <p className="text-xs text-slate-500">
                    {c._count.transactions} tx · {c.isDefault ? "default" : "custom"}
                  </p>
                </div>
              </div>
              {!c.isDefault && (
                <Button size="icon" variant="ghost" onClick={() => onDelete(c.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}
