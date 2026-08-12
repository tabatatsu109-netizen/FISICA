import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/session";
import { getPlayer } from "@/lib/data";
import { logout } from "@/lib/actions/auth";

export default async function PlayerLayout({ children }: LayoutProps<"/player">) {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "PLAYER") redirect("/coach");
  const player = await getPlayer(session.userId);

  return (
    <div className="flex-1 flex flex-col max-w-lg w-full mx-auto pb-24">
      <header className="flex items-center justify-between px-5 pt-5 pb-3">
        <Link href="/player" className="text-xl font-black tracking-tight">
          FISICA<span className="text-accent">.</span>
        </Link>
        <div className="flex items-center gap-3">
          <span className="text-sm text-ink-2">{player?.name}</span>
          <form action={logout}>
            <button className="text-xs text-ink-3 border border-white/10 rounded-full px-3 py-1.5">ログアウト</button>
          </form>
        </div>
      </header>
      <main className="flex-1 px-4">{children}</main>
      <nav className="fixed bottom-0 inset-x-0 bg-surface-1/95 backdrop-blur border-t border-white/10">
        <div className="max-w-lg mx-auto grid grid-cols-3 text-center text-xs">
          <Link href="/player" className="py-3.5 text-ink-2 hover:text-ink">
            <span className="block text-lg leading-none mb-1">🏠</span>ホーム
          </Link>
          <Link href="/player/record" className="py-3.5 text-ink-2 hover:text-ink">
            <span className="block text-lg leading-none mb-1">✏️</span>今日の記録
          </Link>
          <Link href="/player/karte" className="py-3.5 text-ink-2 hover:text-ink">
            <span className="block text-lg leading-none mb-1">📋</span>カルテ
          </Link>
        </div>
      </nav>
    </div>
  );
}
