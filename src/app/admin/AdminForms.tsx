"use client";

import { useActionState } from "react";
import { createTeam, createCoach, resetCoachPassword, type AdminActionState } from "@/lib/actions/admin";

const inputClass =
  "bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent";

export type AdminTeam = {
  id: string;
  code: string;
  name: string;
  playerCount: number;
  coaches: Array<{ id: string; name: string; loginId: string }>;
};

function Result({ state }: { state: AdminActionState }) {
  if (state.error) return <p className="text-critical text-sm whitespace-pre-wrap">{state.error}</p>;
  if (state.message)
    return (
      <p className="text-good text-sm whitespace-pre-wrap bg-surface-2 rounded-lg px-3 py-2.5 font-mono">
        {state.message}
      </p>
    );
  return null;
}

export function AdminForms({ teams }: { teams: AdminTeam[] }) {
  const [teamState, teamAction, teamPending] = useActionState<AdminActionState, FormData>(createTeam, {});
  const [coachState, coachAction, coachPending] = useActionState<AdminActionState, FormData>(createCoach, {});
  const [resetState, resetAction, resetPending] = useActionState<AdminActionState, FormData>(resetCoachPassword, {});

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <h2 className="text-2xl font-black">チーム管理</h2>
        <p className="text-sm text-ink-3 mt-1">チームを作り、監督アカウントを発行します。</p>
      </div>

      {/* チーム一覧 */}
      <section className="card p-5">
        <h3 className="font-bold text-sm mb-3">チーム一覧({teams.length})</h3>
        {teams.length === 0 ? (
          <p className="text-sm text-ink-3">まだチームがありません。下のフォームから追加してください。</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {teams.map((t) => (
              <li key={t.id} className="border border-white/10 rounded-xl p-3.5">
                <div className="flex items-baseline justify-between gap-3 flex-wrap">
                  <span className="font-bold">{t.name}</span>
                  <span className="text-xs text-ink-3 tabular">
                    コード <span className="text-accent font-mono">{t.code}</span> / 選手 {t.playerCount}名
                  </span>
                </div>
                {t.coaches.length === 0 ? (
                  <p className="text-xs text-warn mt-2">監督アカウントが未発行です</p>
                ) : (
                  <ul className="mt-2 flex flex-col gap-1.5">
                    {t.coaches.map((c) => (
                      <li key={c.id} className="flex items-center justify-between gap-3 text-xs">
                        <span className="text-ink-2">
                          {c.name} <span className="text-ink-3 font-mono ml-1">{c.loginId}</span>
                        </span>
                        <form action={resetAction}>
                          <input type="hidden" name="userId" value={c.id} />
                          <button
                            disabled={resetPending}
                            className="text-ink-3 border border-white/10 rounded-full px-2.5 py-1 hover:border-accent/50 disabled:opacity-50"
                          >
                            パスワード再発行
                          </button>
                        </form>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3">
          <Result state={resetState} />
        </div>
      </section>

      {/* チームを追加 */}
      <section className="card p-5">
        <h3 className="font-bold text-sm mb-4">チームを追加</h3>
        <form action={teamAction} className="flex flex-col gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-2">チーム名</span>
            <input name="name" required className={inputClass} placeholder="例: 青陵高校サッカー部" />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-2">チームコード</span>
            <input name="code" required autoCapitalize="none" className={inputClass} placeholder="例: seiryo" />
            <span className="text-[11px] text-ink-3">
              選手がログイン時に入力します。半角英数字で短いものを。後から変更できません。
            </span>
          </label>
          <Result state={teamState} />
          <button
            type="submit"
            disabled={teamPending}
            className="mt-1 bg-accent text-[#0d0d0d] font-bold rounded-lg py-2.5 disabled:opacity-50"
          >
            {teamPending ? "作成中..." : "チームを作成する"}
          </button>
        </form>
      </section>

      {/* 監督アカウントを発行 */}
      <section className="card p-5">
        <h3 className="font-bold text-sm mb-4">監督アカウントを発行</h3>
        {teams.length === 0 ? (
          <p className="text-sm text-ink-3">先にチームを作成してください。</p>
        ) : (
          <form action={coachAction} className="flex flex-col gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-2">チーム</span>
              <select name="teamId" required className={inputClass} defaultValue="">
                <option value="" disabled>
                  選択してください
                </option>
                {teams.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}({t.code})
                  </option>
                ))}
              </select>
            </label>
            <div className="grid grid-cols-2 gap-3">
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-2">氏名</span>
                <input name="name" required className={inputClass} placeholder="例: 山田 剛" />
              </label>
              <label className="flex flex-col gap-1">
                <span className="text-xs text-ink-2">ログインID</span>
                <input name="loginId" required autoCapitalize="none" className={inputClass} placeholder="例: coach" />
              </label>
            </div>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-2">初期パスワード(空欄なら自動生成)</span>
              <input name="password" className={inputClass} placeholder="自動生成する場合は空欄" />
            </label>
            <Result state={coachState} />
            <button
              type="submit"
              disabled={coachPending}
              className="mt-1 bg-accent text-[#0d0d0d] font-bold rounded-lg py-2.5 disabled:opacity-50"
            >
              {coachPending ? "発行中..." : "監督アカウントを発行する"}
            </button>
          </form>
        )}
      </section>
    </div>
  );
}
