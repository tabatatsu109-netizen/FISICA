import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { logout } from "@/lib/actions/auth";
import { prisma } from "@/lib/db";

export default async function CoachLayout({ children }: LayoutProps<"/coach">) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "COACH") redirect("/player");
  const coach = await prisma.user.findUnique({ where: { id: session.userId } });

  return (
    <div className="flex-1 flex flex-col max-w-5xl w-full mx-auto pb-10">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/coach" className="text-xl font-black tracking-tight">
          FISICA<span className="text-accent">.</span>
          <span className="text-xs font-medium text-ink-3 ml-2">COACH</span>
        </Link>
        <div className="flex items-center gap-3">
          <Link href="/coach/players" className="text-xs text-ink-2 border border-white/10 rounded-full px-3 py-1.5 hover:border-accent/50">
            選手を追加
          </Link>
          <span className="text-sm text-ink-2">{coach?.name}</span>
          <form action={logout}>
            <button className="text-xs text-ink-3 border border-white/10 rounded-full px-3 py-1.5">ログアウト</button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-4">{children}</main>
    </div>
  );
}
