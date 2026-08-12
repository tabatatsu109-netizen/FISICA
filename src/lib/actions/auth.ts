"use server";

import { redirect } from "next/navigation";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";
import { setSessionCookie, clearSessionCookie } from "@/lib/session";

export type LoginState = { error?: string };

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "");
  if (!loginId || !password) return { error: "IDとパスワードを入力してください" };

  const user = await prisma.user.findUnique({ where: { loginId } });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return { error: "IDまたはパスワードが違います" };
  }

  await setSessionCookie({ userId: user.id, role: user.role as "COACH" | "PLAYER" });
  redirect(user.role === "COACH" ? "/coach" : "/player");
}

export async function logout() {
  await clearSessionCookie();
  redirect("/login");
}
