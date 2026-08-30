"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSessionCookie, clearSessionCookie } from "@/lib/session";
import { buildLoginId, type Role } from "@/lib/team";

export type LoginState = { error?: string };

const HOME_BY_ROLE: Record<Role, string> = {
  ADMIN: "/admin",
  COACH: "/coach",
  PLAYER: "/player",
};

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  // チームコードは運営者(ADMIN)のみ空欄。選手・監督は必須。
  const teamCode = String(formData.get("teamCode") ?? "").trim();
  const personalId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!personalId || !password) return { error: "IDとパスワードを入力してください" };

  const loginId = buildLoginId(teamCode, personalId);
  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    // どれが違うかは伝えない(存在するIDの推測を防ぐ)
    return { error: "チームコード・ID・パスワードのいずれかが違います" };
  }

  const role = user.role as Role;
  await setSessionCookie({ userId: user.id, role });
  redirect(HOME_BY_ROLE[role] ?? "/player");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}
