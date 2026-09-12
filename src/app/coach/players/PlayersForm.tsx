"use client";

import { useActionState } from "react";
import Link from "next/link";
import {
  createPlayer,
  bulkCreatePlayers,
  resetPlayerPassword,
  deletePlayer,
  type PlayerActionState,
} from "@/lib/actions/player";

const inputClass =
  "bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent";

function Result({ state }: { state: PlayerActionState }) {
  if (state.error) return <p className="text-critical text-sm whitespace-pre-wrap">{state.error}</p>;
  if (state.message) return <p className="text-good text-sm whitespace-pre-wrap">{state.message}</p>;
  return null;
}

export type RosterPlayer = { id: string; name: string; loginId: string };

export function PlayersForm({ teamCode, roster }: { teamCode: string; roster: RosterPlayer[] }) {
  const [singleState, singleAction, singlePending] = useActionState<PlayerActionState, FormData>(createPlayer, {});
  const [bulkState, bulkAction, bulkPending] = useActionState<PlayerActionState, FormData>(bulkCreatePlayers, {});
  const [resetState, resetAction, resetPending] = useActionState<PlayerActionState, FormData>(resetPlayerPassword, {});
  const [deleteState, deleteAction, deletePending] = useActionState<PlayerActionState, FormData>(deletePlayer, {});

  return (
    <div className="flex flex-col gap-4 max-w-2xl">
      <div>
        <Link href="/coach" className="text-sm text-ink-3">
          ← ダッシュボード
        </Link>
        <h2 className="text-2xl font-black mt-1">選手を追加</h2>
        <p className="text-sm text-ink-3 mt-1">
          新入部員をここから登録できます。選手には<strong className="text-ink-2">チームコード「{teamCode}」</strong>
          とログインID・初期パスワードを伝えてください。
        </p>
      </div>

      {/* 1名ずつ追加 */}
      <section className="card p-5">
        <h3 className="font-bold text-sm mb-4">1名ずつ追加</h3>
        <form action={singleAction} className="flex flex-col gap-3">
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-2">氏名</span>
              <input name="name" required className={inputClass} placeholder="例: 山田 太郎" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-2">ログインID</span>
              <input name="loginId" required className={inputClass} placeholder="例: yamada" />
            </label>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-2">初期パスワード</span>
              <input name="password" required className={inputClass} placeholder="4文字以上" />
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-2">生年月日</span>
              <input name="birthDate" type="date" required className={inputClass} />
            </label>
          </div>
          <div className="grid grid-cols-3 gap-3">
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-2">ポジション</span>
              <select name="position" required className={inputClass} defaultValue="MF">
                <option value="GK">GK</option>
                <option value="DF">DF</option>
                <option value="MF">MF</option>
                <option value="FW">FW</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-2">学年</span>
              <select name="grade" required className={inputClass} defaultValue="1">
                <option value="1">高校1年</option>
                <option value="2">高校2年</option>
                <option value="3">高校3年</option>
              </select>
            </label>
            <label className="flex flex-col gap-1">
              <span className="text-xs text-ink-2">背番号(任意)</span>
              <input name="jerseyNumber" type="number" className={inputClass} placeholder="例: 10" />
            </label>
          </div>
          <label className="flex flex-col gap-1 w-40">
            <span className="text-xs text-ink-2">性別</span>
            <select name="sex" className={inputClass} defaultValue="MALE">
              <option value="MALE">男子</option>
              <option value="FEMALE">女子</option>
            </select>
          </label>

          <Result state={singleState} />

          <button
            type="submit"
            disabled={singlePending}
            className="mt-1 bg-accent text-[#0d0d0d] font-bold rounded-lg py-2.5 disabled:opacity-50"
          >
            {singlePending ? "追加中..." : "この選手を追加する"}
          </button>
        </form>
      </section>

      {/* CSVで一括追加 */}
      <section className="card p-5">
        <h3 className="font-bold text-sm mb-2">CSVで一括追加</h3>
        <p className="text-xs text-ink-3 mb-3 leading-relaxed">
          新年度など、まとめて登録したいときに使います。1行目は見出しとして読み飛ばします。列の並びは次の通り固定です:
        </p>
        <p className="text-xs bg-surface-2 rounded-lg px-3 py-2 mb-3 font-mono overflow-x-auto whitespace-nowrap">
          氏名,ログインID,初期パスワード,ポジション,学年,背番号,生年月日,性別
        </p>
        <p className="text-xs text-ink-3 mb-4 leading-relaxed">
          例: <span className="font-mono">田中太郎,tanaka2,pass1234,MF,1,15,2011-04-05,男</span>
          <br />
          ポジションは GK/DF/MF/FW、性別は 男/女(空欄は男子扱い)、背番号は空欄可です。
          <br />
          ログインIDにチームコードを付ける必要はありません。自動で付きます。
          <br />
          一度に登録できるのは200名までです。100名で10秒ほどかかります。
          <br />
          <a href="/players-sample.csv" download className="text-accent underline">
            サンプルCSVをダウンロード
          </a>
        </p>
        <form action={bulkAction} className="flex flex-col gap-3">
          <input
            name="csvFile"
            type="file"
            accept=".csv,text/csv"
            required
            className="text-sm file:mr-3 file:rounded-lg file:border-0 file:bg-surface-2 file:px-3 file:py-2 file:text-sm file:text-ink-2"
          />
          <Result state={bulkState} />
          <button
            type="submit"
            disabled={bulkPending}
            className="bg-accent text-[#0d0d0d] font-bold rounded-lg py-2.5 disabled:opacity-50 w-fit px-6"
          >
            {bulkPending ? "登録中..." : "CSVを読み込んで登録する"}
          </button>
        </form>
      </section>

      {/* 在籍中の選手 */}
      <section className="card p-5">
        <h3 className="font-bold text-sm mb-1">在籍中の選手({roster.length}名)</h3>
        <p className="text-xs text-ink-3 mb-4">
          パスワードを忘れた選手はここから再発行できます。再発行後のパスワードは一度しか表示されません。
        </p>
        {roster.length === 0 ? (
          <p className="text-sm text-ink-3">まだ選手が登録されていません。</p>
        ) : (
          <ul className="flex flex-col gap-2">
            {roster.map((p) => (
              <li key={p.id} className="flex items-center justify-between gap-3 border-b border-white/5 pb-2">
                <span className="text-sm">
                  {p.name}
                  <span className="text-xs text-ink-3 font-mono ml-2">{p.loginId}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <form action={resetAction}>
                    <input type="hidden" name="userId" value={p.id} />
                    <button
                      disabled={resetPending}
                      className="text-xs text-ink-3 border border-white/10 rounded-full px-2.5 py-1 hover:border-accent/50 disabled:opacity-50"
                    >
                      パスワード再発行
                    </button>
                  </form>
                  <form
                    action={deleteAction}
                    onSubmit={(e) => {
                      if (!confirm(`${p.name} さんと、その記録をすべて削除します。元に戻せません。よろしいですか?`)) {
                        e.preventDefault();
                      }
                    }}
                  >
                    <input type="hidden" name="userId" value={p.id} />
                    <button
                      disabled={deletePending}
                      className="text-xs text-critical border border-critical/40 rounded-full px-2.5 py-1 disabled:opacity-50"
                    >
                      削除
                    </button>
                  </form>
                </span>
              </li>
            ))}
          </ul>
        )}
        <div className="mt-3 flex flex-col gap-2">
          <Result state={resetState} />
          <Result state={deleteState} />
        </div>
      </section>
    </div>
  );
}
