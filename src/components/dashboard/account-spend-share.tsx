"use client";

import { formatCurrency } from "@/lib/utils";

type Row = {
  id: string;
  name: string;
  spend: number;
  pct: number;
  color: string;
};

const COLORS = ["#34d399", "#38bdf8", "#a78bfa", "#fb7185", "#fbbf24", "#2dd4bf", "#f472b6"];

export function AccountSpendShare({ rows }: { rows: Omit<Row, "color">[] }) {
  const colored = rows.map((r, i) => ({ ...r, color: COLORS[i % COLORS.length] }));
  const total = colored.reduce((s, r) => s + r.spend, 0);

  if (!total) {
    return <p className="text-sm text-slate-500">No spending in this period yet.</p>;
  }

  return (
    <div className="space-y-4">
      <div className="flex h-3 overflow-hidden rounded-full bg-slate-800">
        {colored.map((r) => (
          <div
            key={r.id}
            title={`${r.name}: ${r.pct.toFixed(0)}%`}
            style={{ width: `${r.pct}%`, backgroundColor: r.color }}
            className="h-full"
          />
        ))}
      </div>
      <ul className="space-y-2">
        {colored.map((r) => (
          <li key={r.id} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: r.color }} />
              <span className="text-slate-300">{r.name}</span>
            </div>
            <div className="text-right">
              <span className="font-medium text-slate-100">{formatCurrency(r.spend)}</span>
              <span className="ml-2 text-xs text-slate-500">{r.pct.toFixed(0)}%</span>
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
