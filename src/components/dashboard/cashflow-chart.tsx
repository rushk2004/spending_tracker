"use client";

import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

type Point = { label: string; income: number; spend: number };

export function CashflowChart({ data }: { data: Point[] }) {
  if (!data.length) {
    return (
      <div className="flex h-56 items-center justify-center text-sm text-zinc-500">
        No cashflow data for this period
      </div>
    );
  }

  return (
    <div className="h-56 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <BarChart data={data} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#2a2e38" vertical={false} />
          <XAxis dataKey="label" tick={{ fill: "#a1a1aa", fontSize: 11 }} axisLine={false} tickLine={false} />
          <YAxis
            tick={{ fill: "#a1a1aa", fontSize: 11 }}
            axisLine={false}
            tickLine={false}
            tickFormatter={(v) => `£${v}`}
            width={48}
          />
          <Tooltip
            formatter={(value) =>
              typeof value === "number"
                ? value.toLocaleString("en-GB", { style: "currency", currency: "GBP" })
                : value
            }
            contentStyle={{
              background: "#1a1d24",
              border: "1px solid #2a2e38",
              borderRadius: 12,
              color: "#e4e4e7",
              boxShadow: "0 8px 24px rgba(0,0,0,0.35)",
            }}
          />
          <Legend />
          <Bar dataKey="income" name="Income" fill="#3dba8c" radius={[6, 6, 0, 0]} />
          <Bar dataKey="spend" name="Spend" fill="#f43f5e" radius={[6, 6, 0, 0]} />
        </BarChart>
      </ResponsiveContainer>
    </div>
  );
}
