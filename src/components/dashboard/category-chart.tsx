"use client";

import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip, Legend } from "recharts";

type Slice = { name: string; value: number; color: string };

export function CategoryChart({ data }: { data: Slice[] }) {
  if (!data.length) {
    return (
      <div className="flex h-64 items-center justify-center text-sm text-zinc-500">
        No spending this period yet
      </div>
    );
  }

  return (
    <div className="h-64 w-full">
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={data}
            dataKey="value"
            nameKey="name"
            cx="50%"
            cy="50%"
            innerRadius={58}
            outerRadius={88}
            paddingAngle={3}
          >
            {data.map((entry, i) => (
              <Cell key={i} fill={entry.color} stroke="transparent" />
            ))}
          </Pie>
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
        </PieChart>
      </ResponsiveContainer>
    </div>
  );
}
