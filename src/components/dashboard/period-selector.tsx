"use client";

import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { cn } from "@/lib/utils";
import type { PeriodKey } from "@/lib/period";

const options: { value: PeriodKey; label: string }[] = [
  { value: "this_month", label: "This month" },
  { value: "last_month", label: "Last month" },
  { value: "last_30", label: "Last 30 days" },
];

export function PeriodSelector({ value }: { value: PeriodKey }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  function select(next: PeriodKey) {
    const params = new URLSearchParams(searchParams.toString());
    if (next === "this_month") params.delete("period");
    else params.set("period", next);
    const q = params.toString();
    router.push(q ? `${pathname}?${q}` : pathname);
  }

  return (
    <div className="inline-flex rounded-xl border border-line-soft bg-surface-muted/70 p-1 shadow-soft">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => select(o.value)}
          className={cn(
            "rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
            value === o.value
              ? "bg-brand-muted text-brand"
              : "text-zinc-400 hover:text-zinc-200"
          )}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
