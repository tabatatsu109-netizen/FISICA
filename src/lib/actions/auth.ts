"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSessionCookie, clearSessionCookie } from "@/lib/session";
import { buildLoginId, type Role } from "@/lib/team";
import {
  clearLoginFailures,
  loginLockedUntil,
  minutesUntil,
  recordLoginFailure,
} from "@/lib/login-attempt";

export type LoginState = { error?: string };

/**
 * 存在しないログインIDのときに比較する捨てハッシュ。
 *
 * 短絡評価で bcrypt を飛ばすと「ID なし=数ms / ID あり=80ms前後」と
 * 応答時間が桁違いになり、有効なIDを機械的に列挙できてしまう。
 * ランダムな文字列のハッシュなので、これに一致することはない。
 */
const DUMMY_HASH = "$2b$10$5yUJEYedCCBzdptPk2h0/OZTUvQTMjbpDp58MDVthUWNDBPJ0SIWm";

const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: "/admin",
  COACH: "/coach",
  PLAYER: "/player",
};

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // チームコードは運営者(ADMIN)のみ空欄。選手・監督は必須。
  const teamCode = String(formData.get("teamCode") ?? "").trim();
  const personalId = String(formData.get("loginId") ?? "").trim();
  // 登録時に trim しているので、照合側も揃える(末尾の空白で入れなくなるのを防ぐ)
  const password = String(formData.get("password") ?? "").trim();
  if (!personalId || !password) return { error: "IDとパスワードを入力してください" };

  const loginId = buildLoginId(teamCode, personalId);

  const lockedUntil = await loginLockedUntil(loginId);
  if (lockedUntil) {
    return {
      error: `ログインの失敗が続いたため、一時的にロックしています。約${minutesUntil(lockedUntil)}分後にもう一度お試しください。`,
    };
  }

  const user = await prisma.user.findUnique({ where: { loginId } });
  // ユーザーが居なくても必ず bcrypt を通し、応答時間を揃える
  const ok = await bcrypt.compare(password, user?.passwordHash ?? DUMMY_HASH);
  if (!user || !ok) {
    await recordLoginFailure(loginId);
    // どれが違うかは伝えない(存在するIDの推測を防ぐ)
    return { error: "チームコード・ID・パスワードのいずれかが違います" };
  }

  await clearLoginFailures(loginId);
  const role = user.role as Role;
  await setSessionCookie(user);
  redirect(HOME_BY_ROLE[role] ?? "/player");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}
