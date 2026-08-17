"use server";

import bcrypt from "bcryptjs";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import type { Position, Sex } from "@/lib/benchmark";

export type PlayerActionState = { error?: string; message?: string };

async function requireCoach() {
  const session = await getSession();
  if (!session) redirect("/login");
  if (session.role !== "COACH") redirect("/player");
}

const POSITIONS = ["GK", "DF", "MF", "FW"] as const;
const POSITION_ALIASES: Record<string, Position> = {
  ゴールキーパー: "GK",
  ディフェンダー: "DF",
  ミッドフィルダー: "MF",
  フォワード: "FW",
};

function normalizePosition(v: string): Position | null {
  const t = v.trim();
  const upper = t.toUpperCase();
  if ((POSITIONS as readonly string[]).includes(upper)) return upper as Position;
  return POSITION_ALIASES[t] ?? null;
}

function normalizeSex(v: string): Sex {
  const t = v.trim();
  return ["FEMALE", "F", "女", "女性"].includes(t.toUpperCase()) || t === "女" || t === "女性" ? "FEMALE" : "MALE";
}

type NewPlayerInput = {
  name: string;
  loginId: string;
  password: string;
  position: string;
  grade: string;
  jerseyNumber: string;
  birthDate: string;
  sex: string;
};

async function createOnePlayer(input: NewPlayerInput): Promise<{ ok: true } | { ok: false; error: string }> {
  const name = input.name.trim();
  const loginId = input.loginId.trim();
  const password = input.password.trim();
  const position = normalizePosition(input.position);
  const grade = Number(input.grade);
  const birthDate = input.birthDate.trim();

  if (!name) return { ok: false, error: "氏名が空です" };
  if (!loginId) return { ok: false, error: "ログインIDが空です" };
  if (!/^[a-zA-Z0-9_-]+$/.test(loginId)) return { ok: false, error: "ログインIDは半角英数字・-・_のみ使えます" };
  if (password.length < 4) return { ok: false, error: "パスワードは4文字以上にしてください" };
  if (!position) return { ok: false, error: `ポジションが不正です(GK/DF/MF/FWのいずれか): ${input.position}` };
  if (!Number.isInteger(grade) || grade < 1 || grade > 3) return { ok: false, error: "学年は1〜3の数字で入力してください" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return { ok: false, error: "生年月日はYYYY-MM-DD形式で入力してください" };

  const jerseyNumber = input.jerseyNumber.trim() ? Number(input.jerseyNumber) : null;
  if (jerseyNumber != null && !Number.isInteger(jerseyNumber)) {
    return { ok: false, error: "背番号は数字で入力してください" };
  }
  const sex = normalizeSex(input.sex);

  const existing = await prisma.user.findUnique({ where: { loginId } });
  if (existing) return { ok: false, error: `ログインID "${loginId}" は既に使われています` };

  const passwordHash = await bcrypt.hash(password, 10);

  await prisma.user.create({
    data: {
      loginId,
      passwordHash,
      name,
      role: "PLAYER",
      profile: {
        create: { birthDate: new Date(birthDate), sex, position, grade, jerseyNumber },
      },
    },
  });

  return { ok: true };
}

/** 監督が選手を1名だけ追加する */
export async function createPlayer(_prev: PlayerActionState, formData: FormData): Promise<PlayerActionState> {
  await requireCoach();

  const result = await createOnePlayer({
    name: String(formData.get("name") ?? ""),
    loginId: String(formData.get("loginId") ?? ""),
    password: String(formData.get("password") ?? ""),
    position: String(formData.get("position") ?? ""),
    grade: String(formData.get("grade") ?? ""),
    jerseyNumber: String(formData.get("jerseyNumber") ?? ""),
    birthDate: String(formData.get("birthDate") ?? ""),
    sex: String(formData.get("sex") ?? "MALE"),
  });

  if (!result.ok) return { error: result.error };
  revalidatePath("/coach");
  revalidatePath("/coach/players");
  return { message: `${String(formData.get("name"))} さんを追加しました` };
}

/**
 * CSVから選手を一括登録する。
 * 見出し行(1行目)は読み飛ばす。列の並びは固定:
 * 氏名,ログインID,初期パスワード,ポジション,学年,背番号,生年月日,性別
 */
export async function bulkCreatePlayers(_prev: PlayerActionState, formData: FormData): Promise<PlayerActionState> {
  await requireCoach();

  const file = formData.get("csvFile");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "CSVファイルを選んでください" };
  }

  const text = await file.text();
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);

  if (lines.length < 2) return { error: "データ行がありません(1行目は見出しにしてください)" };

  const rows = lines.slice(1);
  let created = 0;
  const errors: string[] = [];

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].split(",").map((c) => c.trim());
    const [name, loginId, password, position, grade, jerseyNumber, birthDate, sex] = cols;
    const result = await createOnePlayer({
      name: name ?? "",
      loginId: loginId ?? "",
      password: password ?? "",
      position: position ?? "",
      grade: grade ?? "",
      jerseyNumber: jerseyNumber ?? "",
      birthDate: birthDate ?? "",
      sex: sex ?? "MALE",
    });
    if (result.ok) created++;
    else errors.push(`${i + 2}行目: ${result.error}`);
  }

  if (created > 0) {
    revalidatePath("/coach");
    revalidatePath("/coach/players");
  }

  if (created === 0) {
    return { error: "1件も登録できませんでした。\n" + errors.join("\n") };
  }
  const message =
    `${created}名を登録しました` + (errors.length > 0 ? `(${errors.length}件失敗)\n` + errors.join("\n") : "");
  return { message };
}
