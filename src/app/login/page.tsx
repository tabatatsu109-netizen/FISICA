"use client";

import { useActionState } from "react";
import { login, type LoginState } from "@/lib/actions/auth";

export default function LoginPage() {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-10">
          <h1 className="text-5xl font-black tracking-tight">
            FISICA<span className="text-accent">.</span>
          </h1>
          <p className="text-ink-3 mt-2 text-sm">選手コンディション管理</p>
        </div>
        <form action={action} className="card p-6 flex flex-col gap-4">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink-2 font-medium">ログインID</span>
            <input
              name="loginId"
              autoComplete="username"
              className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-base outline-none focus:border-accent"
              placeholder="例: sato"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-ink-2 font-medium">パスワード</span>
            <input
              name="password"
              type="password"
              autoComplete="current-password"
              className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-base outline-none focus:border-accent"
            />
          </label>
          {state.error && <p className="text-critical text-sm">{state.error}</p>}
          <button
            type="submit"
            disabled={pending}
            className="mt-2 bg-accent text-[#0d0d0d] font-bold rounded-lg py-3 disabled:opacity-50"
          >
            {pending ? "ログイン中..." : "ログイン"}
          </button>
        </form>
        <p className="text-ink-3 text-xs text-center mt-6">
          デモ: 選手 sato / 監督 coach(パスワード demo1234)
        </p>
      </div>
    </main>
  );
}
