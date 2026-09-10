import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-emerald-500/15 text-emerald-300",
        secondary: "border-transparent bg-slate-700 text-slate-200",
        outline: "border-slate-600 text-slate-300",
        income: "border-transparent bg-emerald-500/15 text-emerald-300",
        expense: "border-transparent bg-rose-500/15 text-rose-300",
        transfer: "border-transparent bg-sky-500/15 text-sky-300",
        credit: "border-transparent bg-violet-500/15 text-violet-300",
      },
    },
    defaultVariants: { variant: "default" },
  }
);

export function Badge({
  className,
  variant,
  ...props
}: React.HTMLAttributes<HTMLDivElement> & VariantProps<typeof badgeVariants>) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}
