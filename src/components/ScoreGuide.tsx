import { BAND_COLORS } from "@/lib/score";

/** スコア算出ロジックの説明カード(折りたたみ式) */
export function ScoreGuide() {
  return (
    <details className="card overflow-hidden group">
      <summary className="p-4 cursor-pointer select-none flex items-center justify-between text-sm font-bold list-none [&::-webkit-details-marker]:hidden">
        <span>
          <span className="text-accent mr-1.5">?</span> スコアの算出方法
        </span>
        <span className="text-ink-3 text-xs group-open:rotate-180 transition-transform">▼</span>
      </summary>
      <div className="px-4 pb-5 flex flex-col gap-5 text-sm">
        {/* コンディションスコア */}
        <div>
          <h4 className="font-bold mb-1">コンディションスコア(0〜100)</h4>
          <p className="text-xs text-ink-3 mb-2">その日の入力4項目の重み付き平均。未入力の項目は除外して残りで正規化。</p>
          <table className="w-full text-xs">
            <thead>
              <tr className="text-left text-ink-3 border-b border-white/10">
                <th className="py-1.5 font-medium">要素</th>
                <th className="py-1.5 font-medium text-right w-16">重み</th>
                <th className="py-1.5 font-medium pl-4">計算</th>
              </tr>
            </thead>
            <tbody className="text-ink-2">
              <tr className="border-b border-white/5">
                <td className="py-1.5">睡眠スコア</td>
                <td className="py-1.5 text-right tabular font-bold">40%</td>
                <td className="py-1.5 pl-4">時間70点(8h以上で満点)+ 質30点</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-1.5">体の調子(1〜5)</td>
                <td className="py-1.5 text-right tabular font-bold">25%</td>
                <td className="py-1.5 pl-4">5段階を0〜100点に換算</td>
              </tr>
              <tr className="border-b border-white/5">
                <td className="py-1.5">疲労感(1〜5)</td>
                <td className="py-1.5 text-right tabular font-bold">20%</td>
                <td className="py-1.5 pl-4">逆転(強いほど低得点)</td>
              </tr>
              <tr>
                <td className="py-1.5">筋肉痛・違和感(1〜5)</td>
                <td className="py-1.5 text-right tabular font-bold">15%</td>
                <td className="py-1.5 pl-4">逆転(強いほど低得点)</td>
              </tr>
            </tbody>
          </table>
        </div>

        {/* 栄養スコア */}
        <div>
          <h4 className="font-bold mb-1">栄養スコア(0〜100)</h4>
          <p className="text-xs text-ink-2 leading-relaxed">
            朝・昼・夕 × 5カテゴリ(主食/主菜/副菜/乳製品/果物)= 15枠のチェック数で90点分、補食ありで+10点。
          </p>
        </div>

        {/* スコア帯 */}
        <div>
          <h4 className="font-bold mb-2">スコア帯の色</h4>
          <div className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-ink-2">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: BAND_COLORS.good }} />
              67〜100 良好
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: BAND_COLORS.warning }} />
              34〜66 まずまず
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full" style={{ background: BAND_COLORS.critical }} />
              0〜33 要休養
            </span>
          </div>
        </div>

        <p className="text-[11px] text-ink-3 leading-relaxed">
          ※ 睡眠の満点基準(8時間)は高校生アスリートの推奨睡眠時間(8〜10時間)に基づく暫定値です。月次カルテの月間スコアは各日スコアの平均です。
        </p>
      </div>
    </details>
  );
}
