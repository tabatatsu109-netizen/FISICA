import { cookies } from "next/headers";
import { createHmac, timingSafeEqual } from "crypto";
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

export type Session = {
  userId: string;
  role: Role;
};

function sign(payload: string): string {
  return createHmac("sha256", SECRET).update(payload).digest("base64url");
}

export function encodeSession(session: Session): string {
  const exp = Math.floor(Date.now() / 1000) + MAX_AGE_SEC;
  const payload = `${session.userId}.${session.role}.${exp}`;
  return `${payload}.${sign(payload)}`;
}

export function decodeSession(token: string | undefined): Session | null {
  if (!token) return null;
  const parts = token.split(".");
  if (parts.length !== 4) return null;
  const [userId, role, expStr, sig] = parts;
  const payload = `${userId}.${role}.${expStr}`;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  if (Number(expStr) < Math.floor(Date.now() / 1000)) return null;
  if (role !== "ADMIN" && role !== "COACH" && role !== "PLAYER") return null;
  return { userId, role };
}

export async function getSession(): Promise<Session | null> {
  const store = await cookies();
  return decodeSession(store.get(COOKIE_NAME)?.value);
}

export async function setSessionCookie(session: Session) {
  const store = await cookies();
  store.set(COOKIE_NAME, encodeSession(session), {
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
