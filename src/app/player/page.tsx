import Link from "next/link";
import { getSession } from "@/lib/session";
import { getRecentRecords, buildSeries, streak, todayStr, getPlayer } from "@/lib/data";
import { readinessScore } from "@/lib/score";
import { ScoreGauge } from "@/components/ScoreGauge";
import { WeightChart, SleepChart, ReadinessChart, NutritionBars } from "@/components/charts";
import { Avatar } from "@/components/Avatar";
import { PhotoUpload } from "@/components/PhotoUpload";
import { bmi, targetBmi, targetWeight, type Position, type Sex } from "@/lib/benchmark";

export default async function PlayerHome({ searchParams }: PageProps<"/player">) {
  const session = (await getSession())!;
  const { saved } = await searchParams;
  const [player, records] = await Promise.all([getPlayer(session.userId), getRecentRecords(session.userId, 28)]);
  const series = buildSeries(records, 28);
  const today = todayStr();
  const todayRecord = records.find((r) => r.date === today) ?? null;
  const todayScore = todayRecord ? readinessScore(todayRecord) : null;
  const streakDays = streak(records);

  const latestWeight = [...records].reverse().find((r) => r.weightKg != null)?.weightKg ?? null;
  const latestHeight = [...records].reverse().find((r) => r.heightCm != null)?.heightCm ?? null;
  const profile = player?.profile;
  let target: number | null = null;
  if (profile && latestHeight != null) {
    target = targetWeight(latestHeight, targetBmi(profile.birthDate, profile.position as Position, profile.sex as Sex));
  }

  return (
    <div className="flex flex-col gap-4">
      {saved === "1" && (
        <p className="card px-4 py-3 text-sm text-good border-good/40">✓ 今日の記録を保存しました</p>
      )}

      <section className="card p-5 flex items-center gap-5">
        <ScoreGauge score={todayScore} size={128} sublabel="今日" />
        <div className="flex-1">
          <h2 className="font-bold text-lg">コンディション</h2>
          <p className="text-sm text-ink-2 mt-1">
            {todayRecord
              ? todayScore != null && todayScore >= 67
                ? "良好です。今日も全力でいこう。"
                : todayScore != null && todayScore >= 34
                  ? "まずまず。回復を意識しよう。"
                  : "低め。無理せず休養を優先。"
              : "今日はまだ記録がありません。"}
          </p>
          <p className="text-xs text-ink-3 mt-2">
            連続記録 <span className="text-accent font-bold tabular">{streakDays}</span> 日
          </p>
          <div className="flex items-center gap-3 mt-3">
            <Avatar photoData={profile?.photoData} name={player?.name ?? ""} size={40} />
            <PhotoUpload hasPhoto={!!profile?.photoData} />
          </div>
          {!todayRecord && (
            <Link href="/player/record" className="inline-block mt-3 bg-accent text-[#0d0d0d] text-sm font-bold rounded-full px-5 py-2">
              今日の記録をつける
            </Link>
          )}
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-ink-3">体重</p>
          <p className="text-2xl font-black tabular mt-1">
            {latestWeight != null ? latestWeight.toFixed(1) : "–"}
            <span className="text-sm font-medium text-ink-3 ml-1">kg</span>
          </p>
          {target != null && <p className="text-xs text-ink-3 mt-1">目標 {target.toFixed(1)} kg</p>}
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-3">身長 / BMI</p>
          <p className="text-2xl font-black tabular mt-1">
            {latestHeight != null ? latestHeight.toFixed(1) : "–"}
            <span className="text-sm font-medium text-ink-3 ml-1">cm</span>
          </p>
          <p className="text-xs text-ink-3 mt-1">
            BMI {latestWeight != null && latestHeight != null ? bmi(latestWeight, latestHeight).toFixed(1) : "–"}
          </p>
        </div>
      </section>

      <section className="card p-4">
        <h3 className="font-bold text-sm mb-2">体重の推移(28日)</h3>
        <WeightChart data={series.weight} target={target} />
      </section>

      <section className="card p-4">
        <h3 className="font-bold text-sm mb-2">睡眠時間(28日)</h3>
        <SleepChart data={series.sleep} />
      </section>

      <section className="card p-4">
        <h3 className="font-bold text-sm mb-2">コンディションスコア(28日)</h3>
        <ReadinessChart data={series.readiness} />
      </section>

      <section className="card p-4">
        <h3 className="font-bold text-sm mb-2">栄養バランス(28日)</h3>
        <NutritionBars data={series.nutrition} />
      </section>
    </div>
  );
}
