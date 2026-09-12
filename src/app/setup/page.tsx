import { notFound } from "next/navigation";
import { connection } from "next/server";
import { prisma } from "@/lib/db";
import { SetupForm } from "./SetupForm";

/**
 * 初回セットアップ。運営者アカウントがまだ無いときだけ表示する。
 * 1人でも作られたら以降は404になる。
 */
export default async function SetupPage() {
  // Cookie等のリクエスト時APIを使わないためビルド時に静的生成されてしまい、
  // 「ADMIN が0人か」の判定が焼き込まれる。リクエストごとに評価させる。
  await connection();

  if (!process.env.ADMIN_SETUP_TOKEN) notFound();

  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) notFound();

  return (
    <main className="flex-1 flex items-center justify-center p-6">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <h1 className="text-4xl font-black tracking-tight">
            FISICA<span className="text-accent">.</span>
          </h1>
          <p className="text-ink-3 mt-2 text-sm">初回セットアップ</p>
        </div>
        <p className="text-xs text-ink-3 leading-relaxed mb-4">
          運営者アカウントを1つ作成します。この画面は運営者が作られると表示されなくなります。
        </p>
        <SetupForm />
      </div>
    </main>
  );
}
