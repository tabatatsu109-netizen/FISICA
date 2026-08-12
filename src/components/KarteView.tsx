import Link from "next/link";
import { prisma } from "@/lib/db";
import { getMonthSummary, getPlayer } from "@/lib/data";
import { readinessScore, dailyNutritionScore } from "@/lib/score";
import { ScoreGauge } from "@/components/ScoreGauge";
import { GrowthSparkline, ReadinessChart } from "@/components/charts";
import { Avatar } from "@/components/Avatar";

const POSITION_LABELS: Record<string, string> = { GK: "ゴールキーパー", DF: "ディフェンダー", MF: "ミッドフィルダー", FW: "フォワード" };

function Delta({ value, unit, digits = 1 }: { value: number | null; unit: string; digits?: number }) {
  if (value == null) return <span className="text-ink-3">–</span>;
  const positive = value > 0;
  return (
    <span className={`tabular font-bold ${positive ? "text-good" : value < 0 ? "text-critical" : "text-ink-2"}`}>
      {positive ? "+" : ""}
      {value.toFixed(digits)}
      <span className="text-xs font-medium ml-0.5">{unit}</span>
    </span>
  );
}

export async function KarteView({ userId, month }: { userId: string; month: string }) {
  const [player, summary] = await Promise.all([getPlayer(userId), getMonthSummary(userId, month)]);
  if (!player) return null;
  const profile = player.profile;

  const [y, m] = month.split("-").map(Number);
  const lastDay = new Date(y, m, 0).getDate();
  const records = await prisma.dailyRecord.findMany({
    where: { userId, date: { gte: `${month}-01`, lte: `${month}-${String(lastDay).padStart(2, "0")}` } },
    orderBy: { date: "asc" },
  });
  const byDate = new Map(records.map((r) => [r.date, r]));
  const dates = Array.from({ length: lastDay }, (_, i) => `${month}-${String(i + 1).padStart(2, "0")}`);
  const heightSeries = dates.map((date) => ({ date, value: byDate.get(date)?.heightCm ?? null }));
  const weightSeries = dates.map((date) => ({ date, value: byDate.get(date)?.weightKg ?? null }));
  const readinessSeries = dates.map((date) => {
    const r = byDate.get(date);
    return { date, value: r ? readinessScore(r) : null };
  });
  const nutritionAvg = summary.avgNutrition;
  const sleepScoreAvg = summary.avgSleepScore;
  const readinessAvg = summary.avgReadiness;

  const bmiDiff =
    summary.currentBmi != null && summary.targetBmiValue != null ? summary.currentBmi - summary.targetBmiValue : null;

  return (
    <div className="flex flex-col gap-4">
      {/* ヘッダー */}
      <section className="card p-5 bg-gradient-to-br from-surface-1 to-[#16211a]">
        <div className="flex items-start justify-between">
          <div className="flex items-start gap-4">
            <Avatar photoData={profile?.photoData} name={player.name} size={64} rounded="12px" />
            <div>
              <p className="text-xs text-accent font-bold tracking-widest">MONTHLY REPORT</p>
              <h2 className="text-3xl font-black mt-1 tabular">
                {y}.{String(m).padStart(2, "0")}
              </h2>
              <p className="text-lg font-bold mt-2">{player.name}</p>
              <p className="text-xs text-ink-3 mt-0.5">
                {profile ? `${POSITION_LABELS[profile.position] ?? profile.position} / ${summary.category ?? ""} / 高校${profile.grade}年` : ""}
                {profile?.jerseyNumber != null ? ` / #${profile.jerseyNumber}` : ""}
              </p>
            </div>
          </div>
          <div className="text-right flex flex-col items-end gap-3">
            <div>
              <p className="text-xs text-ink-3">記録日数</p>
              <p className="text-2xl font-black tabular">
                {summary.recordCount}
                <span className="text-sm text-ink-3 font-medium">/{summary.daysInMonth}</span>
              </p>
            </div>
            <Link
              href={`/karte-print/${userId}/${month}`}
              className="text-xs font-bold bg-accent text-[#0d0d0d] rounded-full px-4 py-2"
            >
              PDF出力
            </Link>
          </div>
        </div>
      </section>

      {/* 月間スコア */}
      <section className="card p-5">
        <h3 className="font-bold text-sm mb-4">月間スコア</h3>
        <div className="flex justify-around">
          <ScoreGauge score={readinessAvg != null ? Math.round(readinessAvg) : null} size={110} label="コンディション" />
          <ScoreGauge score={sleepScoreAvg != null ? Math.round(sleepScoreAvg) : null} size={110} label="睡眠" />
          <ScoreGauge score={nutritionAvg != null ? Math.round(nutritionAvg) : null} size={110} label="栄養" />
        </div>
      </section>

      {/* 成長 */}
      <section className="card p-5">
        <h3 className="font-bold text-sm mb-3">フィジカル成長</h3>
        <div className="grid grid-cols-2 gap-4 mb-2">
          <div>
            <p className="text-xs text-ink-3">身長</p>
            <p className="text-xl font-black tabular mt-0.5">
              {summary.heightEnd != null ? summary.heightEnd.toFixed(1) : "–"}
              <span className="text-xs text-ink-3 font-medium ml-1">cm</span>
            </p>
            <p className="text-xs mt-0.5">
              月間 <Delta value={summary.heightDelta} unit="cm" />
            </p>
          </div>
          <div>
            <p className="text-xs text-ink-3">体重</p>
            <p className="text-xl font-black tabular mt-0.5">
              {summary.weightEnd != null ? summary.weightEnd.toFixed(1) : "–"}
              <span className="text-xs text-ink-3 font-medium ml-1">kg</span>
            </p>
            <p className="text-xs mt-0.5">
              月間 <Delta value={summary.weightDelta} unit="kg" />
            </p>
          </div>
        </div>
        <p className="text-xs text-ink-3 mb-1 mt-3">身長の推移</p>
        <GrowthSparkline data={heightSeries} unit="cm" color="#199e70" />
        <p className="text-xs text-ink-3 mb-1 mt-3">体重の推移</p>
        <GrowthSparkline data={weightSeries} unit="kg" />
      </section>

      {/* 同世代比較 */}
      <section className="card p-5">
        <h3 className="font-bold text-sm mb-1">同世代トップレベルとの比較</h3>
        <p className="text-[11px] text-ink-3 mb-4">各年代の代表チーム平均をもとにしたBMI目標値({summary.category} {profile?.position === "GK" ? "GK" : "フィールドプレーヤー"})</p>
        {summary.currentBmi != null && summary.targetBmiValue != null ? (
          <div>
            <div className="flex items-end justify-between mb-2">
              <div>
                <p className="text-xs text-ink-3">現在のBMI</p>
                <p className="text-3xl font-black tabular">{summary.currentBmi.toFixed(1)}</p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-3">目標BMI</p>
                <p className="text-3xl font-black tabular text-accent">{summary.targetBmiValue.toFixed(1)}</p>
              </div>
            </div>
            {/* 比較バー */}
            <div className="relative h-3 rounded-full bg-surface-2 overflow-hidden mt-2">
              <div
                className="absolute inset-y-0 left-0 rounded-full"
                style={{
                  width: `${Math.min(100, (summary.currentBmi / summary.targetBmiValue) * 100)}%`,
                  background: bmiDiff != null && Math.abs(bmiDiff) <= 0.5 ? "var(--good)" : "var(--series-1)",
                }}
              />
            </div>
            <p className="text-sm mt-3 text-ink-2">
              {bmiDiff != null && bmiDiff < -0.2 && summary.targetWeightKg != null && summary.weightEnd != null
                ? `目標体重 ${summary.targetWeightKg.toFixed(1)}kg まであと ${(summary.targetWeightKg - summary.weightEnd).toFixed(1)}kg`
                : bmiDiff != null && bmiDiff > 0.5
                  ? "目標BMIを上回っています"
                  : "トップレベルの体格基準に到達しています 🎉"}
            </p>
          </div>
        ) : (
          <p className="text-sm text-ink-3">身長・体重のデータが不足しています</p>
        )}
      </section>

      {/* コンディション推移 */}
      <section className="card p-5">
        <h3 className="font-bold text-sm mb-2">コンディションスコアの推移</h3>
        <ReadinessChart data={readinessSeries} />
        <div className="grid grid-cols-2 gap-3 mt-3 text-sm">
          <div className="bg-surface-2 rounded-lg px-3 py-2">
            <span className="text-xs text-ink-3 block">平均睡眠</span>
            <span className="font-bold tabular">{summary.avgSleep != null ? `${summary.avgSleep.toFixed(1)} 時間` : "–"}</span>
          </div>
          <div className="bg-surface-2 rounded-lg px-3 py-2">
            <span className="text-xs text-ink-3 block">平均コンディション</span>
            <span className="font-bold tabular">{readinessAvg != null ? `${Math.round(readinessAvg)} / 100` : "–"}</span>
          </div>
        </div>
      </section>

      {/* アドバイス */}
      <section className="card p-5 border-accent/30">
        <h3 className="font-bold text-sm mb-3">
          <span className="text-accent">✦</span> 今月のアドバイス
        </h3>
        <ul className="flex flex-col gap-2.5">
          {summary.advice.map((a, i) => (
            <li key={i} className="text-sm text-ink-2 leading-relaxed pl-4 relative">
              <span className="absolute left-0 text-accent">•</span>
              {a}
            </li>
          ))}
        </ul>
      </section>
    </div>
  );
}
