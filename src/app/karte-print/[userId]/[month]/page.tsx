import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import { prisma } from "@/lib/db";
import { getMonthSummary, getPlayer } from "@/lib/data";
import { readinessScore } from "@/lib/score";
import { ScoreGauge } from "@/components/ScoreGauge";
import { PrintSparkline } from "@/components/PrintSparkline";
import { PrintButton } from "@/components/PrintButton";
import { Avatar } from "@/components/Avatar";

const POSITION_LABELS: Record<string, string> = {
  GK: "ゴールキーパー",
  DF: "ディフェンダー",
  MF: "ミッドフィルダー",
  FW: "フォワード",
};

export default async function KartePrintPage({ params }: PageProps<"/karte-print/[userId]/[month]">) {
  const session = await getSession();
  if (!session) redirect("/login");
  const { userId, month } = await params;
  if (!/^\d{4}-\d{2}$/.test(month)) notFound();
  // 本人または監督のみ閲覧可
  if (session.role !== "COACH" && session.userId !== userId) notFound();

  const [player, summary] = await Promise.all([getPlayer(userId), getMonthSummary(userId, month)]);
  if (!player || player.role !== "PLAYER") notFound();
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

  const bmiDiff = summary.currentBmi != null && summary.targetBmiValue != null ? summary.currentBmi - summary.targetBmiValue : null;
  const bmiRatio =
    summary.currentBmi != null && summary.targetBmiValue != null
      ? Math.min(100, (summary.currentBmi / summary.targetBmiValue) * 100)
      : 0;
  const today = new Date();
  const issued = `${today.getFullYear()}/${String(today.getMonth() + 1).padStart(2, "0")}/${String(today.getDate()).padStart(2, "0")}`;
  const backHref = session.role === "COACH" ? `/coach/player/${userId}?month=${month}` : `/player/karte/${month}`;

  const delta = (v: number | null, unit: string) => {
    if (v == null) return <span style={{ color: "var(--ink-3)" }}>–</span>;
    const color = v > 0 ? "var(--good)" : v < 0 ? "var(--critical)" : "var(--ink-2)";
    return (
      <span style={{ color }} className="font-bold tabular">
        {v > 0 ? "+" : ""}
        {v.toFixed(1)}
        {unit}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-[#252525] print:bg-bg">
      <style>{`
        @page { size: A4 portrait; margin: 0; }
        * { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
        @media print {
          .no-print { display: none !important; }
          .sheet { margin: 0 !important; box-shadow: none !important; }
          body { background: var(--bg) !important; }
        }
      `}</style>

      {/* 画面表示時のみのツールバー */}
      <div className="no-print sticky top-0 z-10 bg-[#252525]/95 backdrop-blur border-b border-white/10">
        <div className="max-w-[210mm] mx-auto flex items-center justify-between px-4 py-3">
          <Link href={backHref} className="text-sm text-ink-2">
            ← カルテに戻る
          </Link>
          <PrintButton />
        </div>
      </div>

      {/* A4シート */}
      <div
        className="sheet mx-auto my-6 bg-bg text-ink shadow-2xl flex flex-col"
        style={{ width: "210mm", height: "296mm", padding: "11mm 12mm" }}
      >
        {/* ヘッダー */}
        <div className="flex items-start justify-between">
          <div>
            <p className="text-2xl font-black tracking-tight leading-none">
              FISICA<span className="text-accent">.</span>
            </p>
            <p className="text-[10px] tracking-[0.35em] text-accent font-bold mt-1.5">MONTHLY GROWTH REPORT</p>
          </div>
          <p className="text-4xl font-black tabular leading-none">
            {y}.{String(m).padStart(2, "0")}
          </p>
        </div>

        {/* 選手情報 */}
        <div className="flex items-center gap-5 mt-5 pb-5 border-b border-white/10">
          <Avatar photoData={profile?.photoData} name={player.name} size="27mm" rounded="14px" />
          <div className="flex-1">
            <p className="text-3xl font-black">{player.name}</p>
            <p className="text-sm text-ink-2 mt-1">
              {profile ? `${POSITION_LABELS[profile.position] ?? profile.position} / ${summary.category ?? ""} / 高校${profile.grade}年` : ""}
              {profile?.jerseyNumber != null ? ` / 背番号 ${profile.jerseyNumber}` : ""}
            </p>
          </div>
          <div className="text-right">
            <p className="text-[10px] text-ink-3">記録日数</p>
            <p className="text-3xl font-black tabular leading-tight">
              {summary.recordCount}
              <span className="text-sm text-ink-3 font-medium">/{summary.daysInMonth}</span>
            </p>
          </div>
        </div>

        {/* 月間スコア */}
        <div className="flex justify-around mt-5">
          <ScoreGauge score={summary.avgReadiness != null ? Math.round(summary.avgReadiness) : null} size={104} label="コンディション" />
          <ScoreGauge score={summary.avgSleepScore != null ? Math.round(summary.avgSleepScore) : null} size={104} label="睡眠" />
          <ScoreGauge score={summary.avgNutrition != null ? Math.round(summary.avgNutrition) : null} size={104} label="栄養" />
        </div>

        {/* フィジカル成長 */}
        <div className="mt-5">
          <p className="text-xs font-bold tracking-widest text-ink-3">PHYSICAL GROWTH</p>
          <div className="grid grid-cols-2 gap-4 mt-2">
            {[
              { label: "身長", value: summary.heightEnd, unit: "cm", d: summary.heightDelta, series: heightSeries, color: "#199e70" },
              { label: "体重", value: summary.weightEnd, unit: "kg", d: summary.weightDelta, series: weightSeries, color: "#3987e5" },
            ].map((item) => (
              <div key={item.label} className="card p-4" style={{ borderRadius: 12 }}>
                <div className="flex items-baseline justify-between">
                  <span className="text-xs text-ink-3">{item.label}</span>
                  <span className="text-[11px]">月間 {delta(item.d, item.unit)}</span>
                </div>
                <p className="text-3xl font-black tabular mt-1">
                  {item.value != null ? item.value.toFixed(1) : "–"}
                  <span className="text-xs text-ink-3 font-medium ml-1">{item.unit}</span>
                </p>
                <div className="mt-2">
                  <PrintSparkline data={item.series} width={300} height={52} color={item.color} />
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* 同世代比較 */}
        <div className="mt-5 card p-4" style={{ borderRadius: 12, borderColor: "rgba(163,230,53,0.25)" }}>
          <div className="flex items-center justify-between">
            <p className="text-xs font-bold tracking-widest text-ink-3">
              VS TOP LEVEL <span className="font-medium normal-case tracking-normal">同世代トップレベル比較({summary.category} {profile?.position === "GK" ? "GK" : "フィールド"})</span>
            </p>
          </div>
          {summary.currentBmi != null && summary.targetBmiValue != null ? (
            <div className="flex items-center gap-6 mt-2">
              <div>
                <p className="text-[10px] text-ink-3">現在BMI</p>
                <p className="text-2xl font-black tabular">{summary.currentBmi.toFixed(1)}</p>
              </div>
              <div className="flex-1">
                <div className="relative h-2.5 rounded-full bg-surface-2 overflow-hidden">
                  <div
                    className="absolute inset-y-0 left-0 rounded-full"
                    style={{
                      width: `${bmiRatio}%`,
                      background: bmiDiff != null && Math.abs(bmiDiff) <= 0.5 ? "var(--good)" : "var(--series-1)",
                    }}
                  />
                </div>
                <p className="text-[11px] text-ink-2 mt-1.5">
                  {bmiDiff != null && bmiDiff < -0.2 && summary.targetWeightKg != null && summary.weightEnd != null
                    ? `目標体重 ${summary.targetWeightKg.toFixed(1)}kg まであと ${(summary.targetWeightKg - summary.weightEnd).toFixed(1)}kg`
                    : bmiDiff != null && bmiDiff > 0.5
                      ? "目標BMIを上回っています(体組成の確認を)"
                      : "トップレベルの体格基準に到達しています"}
                </p>
              </div>
              <div className="text-right">
                <p className="text-[10px] text-ink-3">目標BMI</p>
                <p className="text-2xl font-black tabular text-accent">{summary.targetBmiValue.toFixed(1)}</p>
              </div>
            </div>
          ) : (
            <p className="text-xs text-ink-3 mt-2">身長・体重のデータが不足しています</p>
          )}
        </div>

        {/* コンディション推移 + 平均 */}
        <div className="mt-5 grid grid-cols-3 gap-4">
          <div className="col-span-2 card p-4" style={{ borderRadius: 12 }}>
            <p className="text-xs font-bold tracking-widest text-ink-3">CONDITION TREND</p>
            <div className="mt-2">
              <PrintSparkline data={readinessSeries} width={420} height={64} color="#3987e5" />
            </div>
          </div>
          <div className="flex flex-col gap-3">
            <div className="card px-4 py-3 flex-1" style={{ borderRadius: 12 }}>
              <p className="text-[10px] text-ink-3">平均睡眠</p>
              <p className="text-xl font-black tabular">{summary.avgSleep != null ? `${summary.avgSleep.toFixed(1)}h` : "–"}</p>
            </div>
            <div className="card px-4 py-3 flex-1" style={{ borderRadius: 12 }}>
              <p className="text-[10px] text-ink-3">平均コンディション</p>
              <p className="text-xl font-black tabular">
                {summary.avgReadiness != null ? Math.round(summary.avgReadiness) : "–"}
                <span className="text-xs text-ink-3 font-medium">/100</span>
              </p>
            </div>
          </div>
        </div>

        {/* アドバイス */}
        <div className="mt-5 card p-4 flex-1" style={{ borderRadius: 12 }}>
          <p className="text-xs font-bold tracking-widest text-accent">COACHING NOTES 今月のアドバイス</p>
          <ul className="mt-2 flex flex-col gap-1.5">
            {summary.advice.slice(0, 4).map((a, i) => (
              <li key={i} className="text-[12px] text-ink-2 leading-relaxed pl-4 relative">
                <span className="absolute left-0 text-accent">•</span>
                {a}
              </li>
            ))}
          </ul>
        </div>

        {/* フッター */}
        <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-[9px] text-ink-3">
          <span>発行日 {issued} / FISICA 選手成長管理システム</span>
          <span>BMI目標値: 各年代代表チーム平均に基づくサッカー選手向け基準値</span>
        </div>
      </div>
    </div>
  );
}
