"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { getPlayer } from "@/lib/data";
import { getDetailedPositionData, J1_DETAILED_AVERAGE, type DetailedPosition, bmi, type Position } from "@/lib/benchmark";
import { getSession } from "@/lib/session";

export default function ReferencePage() {
  const [playerData, setPlayerData] = useState<{ name: string; position: Position } | null>(null);
  const [positionDetail, setPositionDetail] = useState<(typeof J1_DETAILED_AVERAGE)[DetailedPosition] | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadData = async () => {
      const session = await getSession();
      if (session) {
        const player = await getPlayer(session.userId);
        if (player?.profile) {
          setPlayerData({ name: player.name, position: player.profile.position as Position });
          const detail = getDetailedPositionData(player.profile.position as Position);
          setPositionDetail(detail);
        }
      }
      setLoading(false);
    };
    loadData();
  }, []);

  if (loading) return <p className="text-center text-ink-3 mt-8">読み込み中...</p>;
  if (!playerData || !positionDetail) return <p className="text-center text-ink-3 mt-8">データを読み込めませんでした</p>;

  return (
    <div className="flex flex-col gap-4">
      <div>
        <Link href="/player" className="text-sm text-ink-3">
          ← ホーム
        </Link>
        <h2 className="text-2xl font-black mt-1">参考データ</h2>
        <p className="text-sm text-ink-3 mt-1">Jリーグ選手の詳細ベンチマーク</p>
      </div>

      {/* ポジション別平均値 */}
      <section className="card p-4">
        <h3 className="font-bold text-sm mb-3">ポジション別 Jリーグ平均値</h3>
        <div className="space-y-3 text-sm">
          <div className="flex justify-between">
            <span className="text-ink-3">身長</span>
            <p className="font-mono text-accent">{positionDetail.height} cm</p>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-3">体重</span>
            <p className="font-mono text-accent">{positionDetail.weight} kg</p>
          </div>
          <div className="flex justify-between">
            <span className="text-ink-3">BMI（参考値）</span>
            <p className="font-mono text-accent">{bmi(positionDetail.weight, positionDetail.height).toFixed(1)}</p>
          </div>
        </div>
      </section>

      {/* パフォーマンス指標 */}
      <section className="card p-4">
        <h3 className="font-bold text-sm mb-3">パフォーマンス指標</h3>
        <div className="space-y-3 text-sm">
          {positionDetail.topSpeed != null ? (
            <div className="flex justify-between">
              <span className="text-ink-3">最高速度</span>
              <p className="font-mono text-accent">{positionDetail.topSpeed} km/h</p>
            </div>
          ) : (
            <div className="flex justify-between">
              <span className="text-ink-3">最高速度</span>
              <p className="text-ink-3">–</p>
            </div>
          )}
          {positionDetail.vo2max != null ? (
            <div className="flex justify-between">
              <span className="text-ink-3">VO₂max</span>
              <p className="font-mono text-accent">{positionDetail.vo2max} mL/kg/min</p>
            </div>
          ) : (
            <div className="flex justify-between">
              <span className="text-ink-3">VO₂max</span>
              <p className="text-ink-3">–</p>
            </div>
          )}
        </div>
      </section>

      {/* ポジション説明 */}
      <section className="card p-4 border-accent/20 bg-paper-alt">
        <h3 className="font-bold text-sm mb-2">ポジション特性</h3>
        <p className="text-sm text-ink-2 leading-relaxed">{positionDetail.description}</p>
      </section>

      {/* ポジション一覧 */}
      <section className="card p-4">
        <h3 className="font-bold text-sm mb-3">全ポジション比較</h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs min-w-[320px]">
            <thead>
              <tr className="text-left text-ink-3 border-b border-white/10">
                <th className="pb-2 font-medium">ポジション</th>
                <th className="pb-2 font-medium text-right">身長</th>
                <th className="pb-2 font-medium text-right">体重</th>
                <th className="pb-2 font-medium text-right">最高速度</th>
              </tr>
            </thead>
            <tbody>
              {(Object.entries(J1_DETAILED_AVERAGE) as [DetailedPosition, (typeof J1_DETAILED_AVERAGE)[DetailedPosition]][]).map(
                ([pos, data]) => (
                  <tr key={pos} className="border-b border-white/5 last:border-0 hover:bg-white/[0.03]">
                    <td className="py-2.5 font-medium">{pos}</td>
                    <td className="py-2.5 text-right tabular">{data.height} cm</td>
                    <td className="py-2.5 text-right tabular">{data.weight} kg</td>
                    <td className="py-2.5 text-right tabular">{data.topSpeed ?? "–"}</td>
                  </tr>
                )
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 参考リンク */}
      <section className="card p-4">
        <h3 className="font-bold text-sm mb-2">関連情報</h3>
        <ul className="text-sm space-y-1">
          <li>
            <a href="https://www.jleague.jp/stats/j1/player/2026/all/top_speed/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Jリーグ公式スタッツ（トップスピード）
            </a>
          </li>
          <li>
            <a href="https://www.jleague.jp/a-to-z/position/" target="_blank" rel="noopener noreferrer" className="text-accent hover:underline">
              Jリーグ ポジション解説
            </a>
          </li>
        </ul>
      </section>
    </div>
  );
}
