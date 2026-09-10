"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut } from "next-auth/react";
import {
  LayoutDashboard,
  Wallet,
  ArrowLeftRight,
  Tags,
  Settings,
  LogOut,
  PiggyBank,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

const nav = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/accounts", label: "Accounts", icon: Wallet },
  { href: "/transactions", label: "Transactions", icon: ArrowLeftRight },
  { href: "/categories", label: "Categories", icon: Tags },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar({ userName }: { userName?: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-full w-64 flex-col border-r border-line-soft bg-surface-muted/90 backdrop-blur">
      <div className="flex items-center gap-2.5 px-5 py-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand-muted text-brand">
          <PiggyBank className="h-5 w-5" />
        </div>
        <div>
          <p className="text-sm font-semibold text-zinc-50">SpendWise</p>
          <p className="text-xs text-zinc-500">Personal finance</p>
        </div>
      </div>

      <nav className="flex-1 space-y-1 px-3">
        {nav.map((item) => {
          const active = pathname.startsWith(item.href);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm transition-colors",
                active
                  ? "bg-brand-muted text-brand"
                  : "text-zinc-400 hover:bg-surface-raised hover:text-zinc-100"
              )}
            >
              <Icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-line-soft p-4">
        <p className="mb-2 truncate px-1 text-xs text-zinc-500">{userName || "Signed in"}</p>
        <Button
          variant="ghost"
          className="w-full justify-start gap-2 text-zinc-400"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="h-4 w-4" />
          Log out
        </Button>
      </div>
    </aside>
  );
}
