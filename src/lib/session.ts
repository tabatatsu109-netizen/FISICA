import { cookies } from "next/headers";
import { cache } from "react";
import { createHmac, timingSafeEqual } from "crypto";
import { prisma } from "./db";
import type { Role } from "./team";

const COOKIE_NAME = "fisica_session";

/**
 * セッションCookieの署名鍵。
 *
 * 未設定のときに固定値へフォールバックすると、その固定値を知っている者が
 * 任意の userId・role で有効なCookieを自作できてしまう(= 管理者へのなりすまし)。
 * リポジトリを読める人=鍵を知っている人になるため、本番では必ず起動を失敗させる。
 */
function resolveSecret(): string {
  const secret = process.env.SESSION_SECRET;
  if (secret && secret.length >= 16) return secret;

  if (process.env.NODE_ENV === "production") {
    throw new Error(
      "SESSION_SECRET が未設定か短すぎます(16文字以上必要)。" +
        "本番では固定値にフォールバックせず起動を中止します。",
    );
  }
  if (secret) {
    throw new Error("SESSION_SECRET は16文字以上にしてください");
  }
  // ローカル開発のみ。この値で署名したCookieは本番では通用しない。
  console.warn("[fisica] SESSION_SECRET が未設定です。開発用の鍵で起動します。");
  return "fisica-local-development-only-not-a-secret";
}

const SECRET = resolveSecret();

/** セッションの有効期間。部室の共用端末での利用を想定して短めにする。 */
const MAX_AGE_SEC = 60 * 60 * 24 * 7; // 7 days

/**
 * 画面・Server Action が受け取るセッション。
 * role と teamId は Cookie ではなくDBの値なので、Cookieを書き換えても権限は変わらない。
 */
export type Session = {
  userId: string;
  role: Role;
  teamId: string | null;
};

/** Cookieに署名して入れる中身 */
type SignedPayload = {
  userId: string;
  version: number;
};

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

function encode(payload: SignedPayload): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const body = `${payload.userId}.${payload.version}.${exp}`;
  return `${body}.${sign(body)}`;
}

function decode(token: string | undefined): SignedPayload | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, versionStr, expStr, sig] = parts;
  const body = `${userId}.${versionStr}.${expStr}`;
  const expected = sign(body);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(expStr) < Math.floor(Date.now() / 1000)) return null;
  const version = Number(versionStr);
  if (!Number.isInteger(version)) return null;
  return { userId, version };
}

/**
 * 現在のセッション。1リクエスト内では cache() により一度しかDBを引かない。
 *
 * 役割(role)と所属チーム(teamId)はCookieに入れずDBから引く。Cookieに入れると、
 * 降格・チーム異動・アカウント削除が次のログインまで反映されないうえ、
 * 署名鍵が漏れた場合に自己申告の role がそのまま通ってしまう。
 */
export const getSession = cache(async (): Promise<Session | null> => {
  const store = await cookies();
  const payload = decode(store.get(COOKIE_NAME)?.value);
  if (!payload) return null;

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    select: { id: true, role: true, teamId: true, sessionVersion: true },
  });
  // 削除済みのユーザー、またはパスワード再発行などで無効化された古いCookie
  if (!user || user.sessionVersion !== payload.version) return null;
  if (user.role !== "ADMIN" && user.role !== "COACH" && user.role !== "PLAYER") return null;

  return { userId: user.id, role: user.role, teamId: user.teamId };
});

export async function setSessionCookie(user: { id: string; sessionVersion: number }) {
  const store = await cookies();
  store.set(COOKIE_NAME, encode({ userId: user.id, version: user.sessionVersion }), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: MAX_AGE_SEC,
    path: "/",
  });
}

export async function clearSessionCookie() {
  const store = await cookies();
  store.delete(COOKIE_NAME);
}
