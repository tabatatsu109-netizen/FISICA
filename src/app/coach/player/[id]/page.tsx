import Link from "next/link";
import { notFound } from "next/navigation";
import { getPlayer, getRecentRecords, buildSeries, getRecordedMonths } from "@/lib/data";
import { WeightChart, SleepChart, ReadinessChart } from "@/components/charts";
import { KarteView } from "@/components/KarteView";
import { Avatar } from "@/components/Avatar";
import { PhotoUpload } from "@/components/PhotoUpload";

export default async function CoachPlayerPage({ params, searchParams }: PageProps<"/coach/player/[id]">) {
  const { id } = await params;
  const { month } = await searchParams;
  const player = await getPlayer(id);
  if (!player || player.role !== "PLAYER") notFound();

  const months = await getRecordedMonths(id);
  const selectedMonth = typeof month === "string" && /^\d{4}-\d{2}$/.test(month) ? month : null;

  if (selectedMonth) {
    return (
      <div className="flex flex-col gap-4 max-w-lg mx-auto w-full">
        <Link href={`/coach/player/${id}`} className="text-sm text-ink-3">
          ← {player.name} の詳細に戻る
        </Link>
        <KarteView userId={id} month={selectedMonth} />
      </div>
    );
  }

  const records = await getRecentRecords(id, 28);
  const series = buildSeries(records, 28);

  return (
    <div className="flex flex-col gap-4">
      <Link href="/coach" className="text-sm text-ink-3">
        ← ダッシュボード
      </Link>
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex items-center gap-4">
          <div className="flex flex-col items-center gap-2">
            <Avatar photoData={player.profile?.photoData} name={player.name} size={64} rounded="12px" />
            <PhotoUpload userId={id} hasPhoto={!!player.profile?.photoData} />
          </div>
          <div>
            <h2 className="text-2xl font-black">{player.name}</h2>
            <p className="text-sm text-ink-3 mt-1">
              {player.profile?.position} / 高校{player.profile?.grade}年
              {player.profile?.jerseyNumber != null ? ` / #${player.profile.jerseyNumber}` : ""}
            </p>
          </div>
        </div>
        <div className="flex gap-2 flex-wrap">
          {months.slice(0, 4).map((m) => (
            <Link key={m} href={`/coach/player/${id}?month=${m}`} className="text-xs border border-white/10 rounded-full px-3 py-1.5 text-ink-2 hover:border-accent/50">
              {m.replace("-", "/")} カルテ
            </Link>
          ))}
        </div>
      </div>

      <section className="card p-4">
        <h3 className="font-bold text-sm mb-2">体重の推移(28日)</h3>
        <WeightChart data={series.weight} />
      </section>
      <section className="card p-4">
        <h3 className="font-bold text-sm mb-2">睡眠時間(28日)</h3>
        <SleepChart data={series.sleep} />
      </section>
      <section className="card p-4">
        <h3 className="font-bold text-sm mb-2">コンディションスコア(28日)</h3>
        <ReadinessChart data={series.readiness} />
      </section>
    </div>
  );
}
