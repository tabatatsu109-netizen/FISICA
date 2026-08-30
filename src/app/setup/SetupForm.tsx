"use client";

import { useActionState } from "react";
import { createFirstAdmin, type SetupState } from "@/lib/actions/admin";

const inputClass =
  "bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-base outline-none focus:border-accent";

export function SetupForm() {
  const [state, action, pending] = useActionState<SetupState, FormData>(createFirstAdmin, {});

  return (
    <form action={action} className="card p-6 flex flex-col gap-4">
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-2 font-medium">セットアップトークン</span>
        <input name="token" type="password" required className={inputClass} />
        <span className="text-[11px] text-ink-3">環境変数 ADMIN_SETUP_TOKEN に設定した値</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-2 font-medium">氏名</span>
        <input name="name" required className={inputClass} placeholder="例: 田端 達也" />
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-2 font-medium">ログインID</span>
        <input name="loginId" required autoCapitalize="none" className={inputClass} placeholder="例: admin" />
        <span className="text-[11px] text-ink-3">運営者はチームコード欄を空欄にしてログインします</span>
      </label>
      <label className="flex flex-col gap-1.5">
        <span className="text-xs text-ink-2 font-medium">パスワード</span>
        <input name="password" type="password" required className={inputClass} placeholder="8文字以上" />
      </label>
      {state.error && <p className="text-critical text-sm whitespace-pre-wrap">{state.error}</p>}
      <button
        type="submit"
        disabled={pending}
        className="mt-2 bg-accent text-[#0d0d0d] font-bold rounded-lg py-3 disabled:opacity-50"
      >
        {pending ? "作成中..." : "運営者アカウントを作成"}
      </button>
    </form>
  );
}
