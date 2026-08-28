import Link from "next/link";
import { getSession } from "@/lib/session";
import { getStrengthView } from "@/lib/data";
import { StrengthChart, WorkoutVolumeBars } from "@/components/charts";
import {
  DEFAULT_EXERCISE,
  EXERCISES,
  MAX_1RM_REPS,
  METRIC_LABEL,
  METRIC_UNIT,
  formatMetric,
  type MetricKind,
} from "@/lib/workout";

const RANGES = [
  { key: "week", label: "週間", days: 7 },
  { key: "month", label: "月間", days: 30 },
  { key: "3m", label: "3ヶ月", days: 90 },
  { key: "year", label: "年間", days: 365 },
] as const;

function deltaText(kind: MetricKind, delta: number | null): string | null {
  if (delta == null || delta === 0) return null;
  const sign = delta > 0 ? "+" : "";
  if (kind === "ONE_RM") return `${sign}${delta.toFixed(1)}${METRIC_UNIT.ONE_RM}`;
  return `${sign}${delta}${METRIC_UNIT[kind]}`;
}

export default async function StrengthPage({ searchParams }: PageProps<"/player/strength">) {
  const session = (await getSession())!;
  const { range, ex } = await searchParams;

  const selectedRange = RANGES.find((r) => r.key === range) ?? RANGES[1];
  const exerciseKey = typeof ex === "string" ? ex : DEFAULT_EXERCISE;
  const view = await getStrengthView(session.userId, selectedRange.days, exerciseKey);

  // 種目の切り替えタブは「この期間に記録がある種目」+ 選択中の種目
  const tabKeys = [...new Set([...view.loggedExercises, view.exercise.key])];
  const tabs = EXERCISES.filter((e) => tabKeys.includes(e.key));
  const href = (next: { range?: string; ex?: string }) =>
    `/player/strength?range=${next.range ?? selectedRange.key}&ex=${next.ex ?? view.exercise.key}`;

  const latestMetric = [...view.metricSeries].reverse().find((p) => p.value != null)?.value ?? null;
  const latestRatio = view.ratioSeries ? ([...view.ratioSeries].reverse().find((p) => p.value != null)?.value ?? null) : null;
  const selectedBest = view.bests.find((b) => b.key === view.exercise.key) ?? null;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-black">筋トレの記録</h2>
        <p className="text-sm text-ink-3 mt-1">入力したセットから推定1RMと体重比を自動計算しています。</p>
      </div>

      <nav className="grid grid-cols-4 gap-1 bg-surface-2 rounded-xl p-1 text-center text-xs">
        {RANGES.map((r) => (
          <Link
            key={r.key}
            href={href({ range: r.key })}
            className={`rounded-lg py-2 ${r.key === selectedRange.key ? "bg-accent text-[#0d0d0d] font-bold" : "text-ink-2"}`}
          >
            {r.label}
          </Link>
        ))}
      </nav>

      {view.loadWarning && (
        <p className="card px-4 py-3 text-sm text-warn border-warn/40">⚠️ {view.loadWarning}</p>
      )}

      <section className="grid grid-cols-2 gap-3">
        <div className="card p-4">
          <p className="text-xs text-ink-3">実施日数</p>
          <p className="text-2xl font-black tabular mt-1">
            {view.sessionDays}
            <span className="text-sm font-medium text-ink-3 ml-1">日</span>
          </p>
          <p className="text-xs text-ink-3 mt-1 tabular">{view.totalSets} セット</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-3">総挙上量(推定)</p>
          <p className="text-2xl font-black tabular mt-1">
            {view.totalVolumeKg.toLocaleString("ja-JP")}
            <span className="text-sm font-medium text-ink-3 ml-1">kg</span>
          </p>
          <p className="text-xs text-ink-3 mt-1 tabular">
            平均RPE {view.avgRpe != null ? view.avgRpe.toFixed(1) : "–"}
          </p>
        </div>
      </section>

      {tabs.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map((e) => (
            <Link
              key={e.key}
              href={href({ ex: e.key })}
              className={`rounded-full border px-3 py-1.5 text-xs ${
                e.key === view.exercise.key
                  ? "bg-accent/20 border-accent text-accent"
                  : "bg-surface-2 border-white/10 text-ink-2"
              }`}
            >
              {e.label}
            </Link>
          ))}
        </div>
      )}

      <section className="card p-4">
        <div className="flex justify-between items-baseline mb-1">
          <h3 className="font-bold text-sm">
            {METRIC_LABEL[view.kind]}の推移({view.exercise.label})
          </h3>
          {selectedBest?.delta != null && deltaText(view.kind, selectedBest.delta) && (
            <span className="text-xs text-accent tabular">{deltaText(view.kind, selectedBest.delta)} (前期間比)</span>
          )}
        </div>
        <p className="text-3xl font-black tabular mb-2">
          {latestMetric != null ? formatMetric(view.kind, latestMetric) : "–"}
        </p>
        <StrengthChart
          data={view.metricSeries}
          unit={METRIC_UNIT[view.kind]}
          label={METRIC_LABEL[view.kind]}
          decimals={view.kind === "ONE_RM" ? 1 : 0}
        />
      </section>

      {view.ratioSeries && (
        <section className="card p-4">
          <h3 className="font-bold text-sm mb-1">体重比({view.exercise.label})</h3>
          <p className="text-3xl font-black tabular mb-2">
            {latestRatio != null ? latestRatio.toFixed(2) : "–"}
            <span className="text-sm font-medium text-ink-3 ml-1">倍</span>
          </p>
          <StrengthChart data={view.ratioSeries} unit="倍" label="体重比" decimals={2} />
        </section>
      )}

      <section className="card p-4">
        <h3 className="font-bold text-sm mb-2">筋トレ実施状況(直近{selectedRange.days}日)</h3>
        <WorkoutVolumeBars data={view.setsSeries} />
      </section>

      <section className="card p-4">
        <h3 className="font-bold text-sm mb-3">種目別のベスト</h3>
        {view.bests.length === 0 ? (
          <p className="text-sm text-ink-3">
            この期間の筋トレ記録がありません。
            <Link href="/player/record" className="text-accent ml-1">
              今日の記録
            </Link>
            から入力できます。
          </p>
        ) : (
          <ul className="flex flex-col gap-2.5">
            {view.bests.map((b) => (
              <li key={b.key} className="flex justify-between items-baseline text-sm">
                <span className="text-ink-2">{b.label}</span>
                <span className="text-right">
                  <span className="font-bold tabular">{formatMetric(b.kind, b.best)}</span>
                  {deltaText(b.kind, b.delta) && (
                    <span className="text-accent text-xs tabular ml-2">{deltaText(b.kind, b.delta)}</span>
                  )}
                  {b.ratio != null && <span className="block text-xs text-ink-3 tabular">体重比 {b.ratio.toFixed(2)}倍</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="text-xs text-ink-3 leading-relaxed">
        推定1RMは Epley式(重量 ×(1 + 回数 ÷ 30))で計算しています。{MAX_1RM_REPS}回を超えるセットは
        推定の誤差が大きくなるため1RMには使わず、総挙上量にだけ計上します。
        成長期のうちは最大重量に挑戦するより、フォームを保てる重さでセットを積むほうが安全に伸びます。
      </p>
    </div>
  );
}
