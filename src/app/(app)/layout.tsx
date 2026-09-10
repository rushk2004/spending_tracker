import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { Sidebar } from "@/components/layout/sidebar";
import { MobileNav } from "@/components/layout/mobile-nav";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const session = await getSession();
  if (!session.isLoggedIn || !session.userId) {
    redirect("/login");
  }

  return (
    <div className="flex min-h-screen bg-[#070b14] text-slate-100">
      <div className="hidden md:block md:fixed md:inset-y-0 md:left-0 md:z-30">
        <Sidebar userName={session.name || session.email} />
      </div>
      <main className="flex-1 md:pl-64">
        <div className="mx-auto max-w-6xl px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">{children}</div>
      </main>
      <MobileNav />
    </div>
  );
}
