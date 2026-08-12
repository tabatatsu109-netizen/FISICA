import Link from "next/link";
import { getSession } from "@/lib/session";
import { getRecordedMonths } from "@/lib/data";

export default async function KarteListPage() {
  const session = (await getSession())!;
  const months = await getRecordedMonths(session.userId);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-black">成長カルテ</h2>
        <p className="text-sm text-ink-3 mt-1">月ごとのレポートを見る</p>
      </div>
      <div className="flex flex-col gap-3">
        {months.length === 0 && <p className="card p-5 text-sm text-ink-3">まだ記録がありません。日々の記録をつけるとカルテが作成されます。</p>}
        {months.map((month) => {
          const [y, m] = month.split("-");
          return (
            <Link key={month} href={`/player/karte/${month}`} className="card p-5 flex items-center justify-between hover:border-accent/40 transition-colors">
              <div>
                <p className="text-xs text-accent font-bold tracking-widest">MONTHLY REPORT</p>
                <p className="text-xl font-black tabular mt-0.5">
                  {y}年{Number(m)}月
                </p>
              </div>
              <span className="text-ink-3">→</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
