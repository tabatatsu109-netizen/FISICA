"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/db";
import { requireAdmin } from "@/lib/guard";
import { setSessionCookie } from "@/lib/session";
import {
  buildLoginId,
  generatePassword,
  isValidPassword,
  isValidPersonalId,
  isValidTeamCode,
  normalizeTeamCode,
  PASSWORD_MIN,
  personalLoginId,
} from "@/lib/team";

export type AdminActionState = { error?: string; message?: string };

/** チームを1つ作る */
export async function createTeam(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();

  const code = normalizeTeamCode(String(formData.get("code") ?? ""));
  const name = String(formData.get("name") ?? "").trim();

  if (!name) return { error: "チーム名を入力してください" };
  if (!isValidTeamCode(code)) {
    return { error: "チームコードは半角英数字・-・_のみ、20文字以内で入力してください" };
  }

  const existing = await prisma.team.findUnique({ where: { code } });
  if (existing) return { error: `チームコード "${code}" は既に使われています` };

  await prisma.team.create({ data: { code, name } });

  revalidatePath("/admin");
  return { message: `チーム「${name}」(コード: ${code})を作成しました` };
}

/** 指定チームの監督アカウントを発行する */
export async function createCoach(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();

  const teamId = String(formData.get("teamId") ?? "");
  const name = String(formData.get("name") ?? "").trim();
  const personalId = String(formData.get("loginId") ?? "").trim();
  const inputPassword = String(formData.get("password") ?? "").trim();

  if (!name) return { error: "氏名を入力してください" };
  if (!isValidPersonalId(personalId)) return { error: "ログインIDは半角英数字・-・_のみ使えます" };

  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { code: true, name: true } });
  if (!team) return { error: "チームを選んでください" };

  // 空欄なら自動生成する
  const password = inputPassword || generatePassword();
  if (!isValidPassword(password)) return { error: `パスワードは${PASSWORD_MIN}文字以上にしてください` };

  const loginId = buildLoginId(team.code, personalId);
  const existing = await prisma.user.findUnique({ where: { loginId } });
  if (existing) return { error: `ログインID "${personalId}" は既にこのチームで使われています` };

  await prisma.user.create({
    data: {
      loginId,
      passwordHash: await bcrypt.hash(password, 10),
      name,
      role: "COACH",
      teamId,
    },
  });

  revalidatePath("/admin");
  return {
    message:
      `監督アカウントを作成しました\n` +
      `チームコード: ${team.code}\nログインID: ${personalId}\nパスワード: ${password}\n` +
      `(パスワードはこの画面を離れると二度と表示されません)`,
  };
}

/** 監督のパスワードを再発行する */
export async function resetCoachPassword(_prev: AdminActionState, formData: FormData): Promise<AdminActionState> {
  await requireAdmin();

  const userId = String(formData.get("userId") ?? "");
  const coach = await prisma.user.findFirst({
    where: { id: userId, role: "COACH" },
    select: { id: true, name: true, loginId: true, team: { select: { code: true } } },
  });
  if (!coach) return { error: "監督が見つかりません" };

  const password = generatePassword();
  await prisma.user.update({
    where: { id: coach.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      // 古いパスワードで入られた端末を締め出す。増やすと発行済みCookieが無効になる
      sessionVersion: { increment: 1 },
    },
  });

  revalidatePath("/admin");
  return {
    message:
      `${coach.name} さんのパスワードを再発行しました\n` +
      `チームコード: ${coach.team?.code ?? "-"}\n` +
      `ログインID: ${personalLoginId(coach.loginId, coach.team?.code)}\n` +
      `パスワード: ${password}`,
  };
}

export type SetupState = { error?: string };

/**
 * 最初の運営者アカウントを作る。
 * ADMIN が1人でも存在する場合は動かない(ページ側でも404にしている)。
 * 環境変数 ADMIN_SETUP_TOKEN と一致するトークンを要求する。
 */
export async function createFirstAdmin(_prev: SetupState, formData: FormData): Promise<SetupState> {
  const expectedToken = process.env.ADMIN_SETUP_TOKEN;
  if (!expectedToken) return { error: "ADMIN_SETUP_TOKEN が設定されていません" };

  const adminCount = await prisma.user.count({ where: { role: "ADMIN" } });
  if (adminCount > 0) return { error: "既に運営者アカウントが存在します" };

  const token = String(formData.get("token") ?? "");
  if (token !== expectedToken) return { error: "セットアップトークンが違います" };

  const name = String(formData.get("name") ?? "").trim();
  const loginId = String(formData.get("loginId") ?? "").trim();
  const password = String(formData.get("password") ?? "").trim();

  if (!name) return { error: "氏名を入力してください" };
  if (!isValidPersonalId(loginId)) return { error: "ログインIDは半角英数字・-・_のみ使えます" };
  if (!isValidPassword(password)) return { error: `運営者のパスワードは${PASSWORD_MIN}文字以上にしてください` };

  const existing = await prisma.user.findUnique({ where: { loginId } });
  if (existing) return { error: `ログインID "${loginId}" は既に使われています` };

  const admin = await prisma.user.create({
    data: {
      loginId, // 運営者はチームに属さないのでプレフィックスなし
      passwordHash: await bcrypt.hash(password, 10),
      name,
      role: "ADMIN",
    },
  });

  await setSessionCookie(admin);
  redirect("/admin");
}
