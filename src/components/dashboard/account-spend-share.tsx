"use client";

import { formatCurrency } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  spend: number;
  pct: number;
  color: string;
};

const COLORS = ["#3dba8c", "#38bdf8", "#a78bfa", "#fb7185", "#fbbf24", "#2dd4bf", "#f472b6"];

export function AccountSpendShare({ rows }: { rows: Omit<Row, "color">[] }) {
  const colored = rows.map((r, i) => ({ ...r, color: COLORS[i % COLORS.length] }));
  const total = colored.reduce((s, r) => s + r.spend, 0);

  if (!total) {
    return <p className="text-sm text-zinc-500">No spending in this period yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex h-2.5 overflow-hidden rounded-full bg-zinc-800/80">
        {colored.map((r) => (
          <div
            key={r.id}
            title={`${r.name}: ${r.pct.toFixed(0)}%`}
            style={{ width: `${r.pct}%`, backgroundColor: r.color }}
            className="h-full first:rounded-l-full last:rounded-r-full"
          />
        ))}
      </div>
      <ul className="space-y-2.5">
        {colored.map((r) => (
          <li key={r.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
              <span className="text-zinc-300">{r.name}</span>
            </div>
            <div className="text-right tabular-nums">
              <span className="font-medium text-zinc-100">{formatCurrency(r.spend)}</span>
              <span className="ml-2 text-xs text-zinc-500">{r.pct.toFixed(0)}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
