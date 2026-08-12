import Link from "next/link";
import { getCoachOverview } from "@/lib/data";
import { scoreBand, BAND_COLORS } from "@/lib/score";
import { ScoreGuide } from "@/components/ScoreGuide";

function ReadinessBadge({ score }: { score: number | null }) {
  if (score == null) return <span className="text-ink-3 text-sm">–</span>;
  const band = scoreBand(score);
  const icon = band === "good" ? "●" : band === "warning" ? "▲" : "■";
  return (
    <span className="inline-flex items-center gap-1.5 font-bold tabular" style={{ color: BAND_COLORS[band] }}>
      <span className="text-[10px]">{icon}</span>
      {score}
    </span>
  );
}

export default async function CoachDashboard() {
  const rows = await getCoachOverview();

  const alertRows = rows.filter((r) => r.alerts.length > 0);
  const avgReadiness =
    rows.filter((r) => r.latestReadiness != null).length > 0
      ? Math.round(
          rows.reduce((s, r) => s + (r.latestReadiness ?? 0), 0) / rows.filter((r) => r.latestReadiness != null).length
        )
      : null;
  const avgInputRate = rows.length > 0 ? rows.reduce((s, r) => s + r.inputRate14, 0) / rows.length : 0;

  const growthRanking = [...rows]
    .filter((r) => r.weightGrowth30 != null)
    .sort((a, b) => (b.weightGrowth30 ?? 0) - (a.weightGrowth30 ?? 0))
    .slice(0, 5);
  const streakRanking = [...rows].sort((a, b) => b.streakDays - a.streakDays).slice(0, 5);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-2xl font-black">チームダッシュボード</h2>
        <p className="text-sm text-ink-3 mt-1">全{rows.length}名のコンディションを俯瞰</p>
      </div>

      {/* サマリーカード */}
      <section className="grid grid-cols-3 gap-3">
        <div className="card p-4">
          <p className="text-xs text-ink-3">チーム平均スコア</p>
          <p className="text-3xl font-black tabular mt-1">{avgReadiness ?? "–"}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-3">直近14日の入力率</p>
          <p className="text-3xl font-black tabular mt-1">
            {Math.round(avgInputRate * 100)}
            <span className="text-sm text-ink-3 font-medium">%</span>
          </p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-ink-3">要注意選手</p>
          <p className="text-3xl font-black tabular mt-1" style={{ color: alertRows.length > 0 ? "var(--warning)" : undefined }}>
            {alertRows.length}
            <span className="text-sm text-ink-3 font-medium">名</span>
          </p>
        </div>
      </section>

      {/* アラート */}
      {alertRows.length > 0 && (
        <section className="card p-4 border-warn/40">
          <h3 className="font-bold text-sm mb-3">
            <span className="text-warn">▲</span> 要注意
          </h3>
          <div className="flex flex-col gap-2">
            {alertRows.map((r) => (
              <Link key={r.user.id} href={`/coach/player/${r.user.id}`} className="flex items-center justify-between bg-surface-2 rounded-lg px-3 py-2.5 hover:bg-surface-2/70">
                <span className="font-medium text-sm">{r.user.name}</span>
                <span className="flex gap-1.5 flex-wrap justify-end">
                  {r.alerts.map((a) => (
                    <span key={a} className="text-[11px] text-warn border border-warn/40 rounded-full px-2 py-0.5">
                      {a}
                    </span>
                  ))}
                </span>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* 選手一覧 */}
      <section className="card p-4 overflow-x-auto">
        <h3 className="font-bold text-sm mb-3">選手一覧</h3>
        <table className="w-full text-sm min-w-[560px]">
          <thead>
            <tr className="text-left text-xs text-ink-3 border-b border-white/10">
              <th className="pb-2 font-medium">選手</th>
              <th className="pb-2 font-medium text-right">スコア</th>
              <th className="pb-2 font-medium text-right">睡眠(7日)</th>
              <th className="pb-2 font-medium text-right">体重</th>
              <th className="pb-2 font-medium text-right">7日変化</th>
              <th className="pb-2 font-medium text-right">入力率</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.user.id} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                <td className="py-2.5">
                  <Link href={`/coach/player/${r.user.id}`} className="flex items-center gap-2">
                    <span className="w-7 h-7 rounded-full bg-surface-2 flex items-center justify-center text-[11px] tabular text-ink-2">
                      {r.user.profile?.jerseyNumber ?? "–"}
                    </span>
                    <span className="font-medium">{r.user.name}</span>
                    <span className="text-[11px] text-ink-3">{r.user.profile?.position}</span>
                  </Link>
                </td>
                <td className="py-2.5 text-right">
                  <ReadinessBadge score={r.latestReadiness} />
                </td>
                <td className="py-2.5 text-right tabular">{r.avgSleep7 != null ? `${r.avgSleep7.toFixed(1)}h` : "–"}</td>
                <td className="py-2.5 text-right tabular">{r.latestWeight != null ? `${r.latestWeight.toFixed(1)}kg` : "–"}</td>
                <td className="py-2.5 text-right tabular">
                  {r.weightDelta7 != null ? (
                    <span className={r.weightDelta7 <= -1.5 ? "text-critical" : "text-ink-2"}>
                      {r.weightDelta7 > 0 ? "+" : ""}
                      {r.weightDelta7.toFixed(1)}kg
                    </span>
                  ) : (
                    "–"
                  )}
                </td>
                <td className="py-2.5 text-right tabular">{Math.round(r.inputRate14 * 100)}%</td>
              </tr>
            ))}
          </tbody>
        </table>
      </section>

      {/* ランキング */}
      <section className="grid md:grid-cols-2 gap-4">
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-3">📈 体重増加ランキング(30日)</h3>
          <ol className="flex flex-col gap-2">
            {growthRanking.map((r, i) => (
              <li key={r.user.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold tabular ${i === 0 ? "bg-accent text-[#0d0d0d]" : "bg-surface-2 text-ink-2"}`}>
                    {i + 1}
                  </span>
                  {r.user.name}
                </span>
                <span className="tabular font-bold text-good">+{(r.weightGrowth30 ?? 0).toFixed(1)}kg</span>
              </li>
            ))}
          </ol>
        </div>
        <div className="card p-4">
          <h3 className="font-bold text-sm mb-3">🔥 連続記録ランキング</h3>
          <ol className="flex flex-col gap-2">
            {streakRanking.map((r, i) => (
              <li key={r.user.id} className="flex items-center justify-between text-sm">
                <span className="flex items-center gap-2.5">
                  <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold tabular ${i === 0 ? "bg-accent text-[#0d0d0d]" : "bg-surface-2 text-ink-2"}`}>
                    {i + 1}
                  </span>
                  {r.user.name}
                </span>
                <span className="tabular font-bold">{r.streakDays}日</span>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <ScoreGuide />
    </div>
  );
}
