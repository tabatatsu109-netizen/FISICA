"use server";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { requireCoachTeam } from "@/lib/guard";
import {
  BULK_MAX_ROWS,
  buildLoginId,
  generatePassword,
  isValidPassword,
  isValidPersonalId,
  personalLoginId,
  PASSWORD_MIN,
} from "@/lib/team";
import type { Position, Sex } from "@/lib/benchmark";

export type PlayerActionState = { error?: string; message?: string };

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

type ValidatedPlayer = {
  loginId: string;
  password: string;
  name: string;
  birthDate: Date;
  sex: Sex;
  position: Position;
  grade: number;
  jerseyNumber: number | null;
};

/** 入力の検証のみ行う(DB照会・保存はしない)。一括登録で使い回す */
function validatePlayer(
  input: NewPlayerInput,
  teamCode: string
): { ok: true; value: ValidatedPlayer } | { ok: false; error: string } {
  const name = input.name.trim();
  const personalId = input.loginId.trim();
  const password = input.password.trim();
  const position = normalizePosition(input.position);
  const grade = Number(input.grade);
  const birthDate = input.birthDate.trim();

  if (!name) return { ok: false, error: "氏名が空です" };
  if (!personalId) return { ok: false, error: "ログインIDが空です" };
  if (!isValidPersonalId(personalId)) return { ok: false, error: "ログインIDは半角英数字・-・_のみ使えます" };
  if (!isValidPassword(password)) return { ok: false, error: `パスワードは${PASSWORD_MIN}文字以上にしてください` };
  if (!position) return { ok: false, error: `ポジションが不正です(GK/DF/MF/FWのいずれか): ${input.position}` };
  if (!Number.isInteger(grade) || grade < 1 || grade > 3) return { ok: false, error: "学年は1〜3の数字で入力してください" };
  if (!/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return { ok: false, error: "生年月日はYYYY-MM-DD形式で入力してください" };

  const parsedDate = new Date(birthDate);
  if (Number.isNaN(parsedDate.getTime())) return { ok: false, error: `生年月日が不正です: ${birthDate}` };

  const jerseyNumber = input.jerseyNumber.trim() ? Number(input.jerseyNumber) : null;
  if (jerseyNumber != null && !Number.isInteger(jerseyNumber)) {
    return { ok: false, error: "背番号は数字で入力してください" };
  }

  return {
    ok: true,
    value: {
      loginId: buildLoginId(teamCode, personalId),
      password,
      name,
      birthDate: parsedDate,
      sex: normalizeSex(input.sex),
      position,
      grade,
      jerseyNumber,
    },
  };
}

async function insertPlayers(players: ValidatedPlayer[], teamId: string): Promise<void> {
  // bcrypt は1件80ms前後かかるので並列化する(直列だと100件で10秒近くなる)
  const hashes = await Promise.all(players.map((p) => bcrypt.hash(p.password, 10)));

  // createMany はネストした profile を作れないので1件ずつ create する。
  // ただしトランザクションにまとめることで往復を1回に抑える。
  await prisma.$transaction(
    players.map((p, i) =>
      prisma.user.create({
        data: {
          loginId: p.loginId,
          passwordHash: hashes[i],
          name: p.name,
          role: "PLAYER",
          teamId,
          profile: {
            create: {
              birthDate: p.birthDate,
              sex: p.sex,
              position: p.position,
              grade: p.grade,
              jerseyNumber: p.jerseyNumber,
            },
          },
        },
      })
    )
  );
}

/** 監督が選手を1名だけ追加する */
export async function createPlayer(_prev: PlayerActionState, formData: FormData): Promise<PlayerActionState> {
  const { teamId } = await requireCoachTeam();
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { code: true } });
  if (!team) return { error: "チームが見つかりません" };

  const validated = validatePlayer(
    {
      name: String(formData.get("name") ?? ""),
      loginId: String(formData.get("loginId") ?? ""),
      password: String(formData.get("password") ?? ""),
      position: String(formData.get("position") ?? ""),
      grade: String(formData.get("grade") ?? ""),
      jerseyNumber: String(formData.get("jerseyNumber") ?? ""),
      birthDate: String(formData.get("birthDate") ?? ""),
      sex: String(formData.get("sex") ?? "MALE"),
    },
    team.code
  );
  if (!validated.ok) return { error: validated.error };

  const existing = await prisma.user.findUnique({ where: { loginId: validated.value.loginId } });
  if (existing) return { error: `ログインID "${personalLoginId(validated.value.loginId, team.code)}" は既に使われています` };

  await insertPlayers([validated.value], teamId);

  revalidatePath("/coach");
  revalidatePath("/coach/players");
  return { message: `${validated.value.name} さんを追加しました(ログインID: ${validated.value.loginId})` };
}

/**
 * CSVから選手を一括登録する。
 * 見出し行(1行目)は読み飛ばす。列の並びは固定:
 * 氏名,ログインID,初期パスワード,ポジション,学年,背番号,生年月日,性別
 */
export async function bulkCreatePlayers(_prev: PlayerActionState, formData: FormData): Promise<PlayerActionState> {
  const { teamId } = await requireCoachTeam();
  const team = await prisma.team.findUnique({ where: { id: teamId }, select: { code: true } });
  if (!team) return { error: "チームが見つかりません" };

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
  if (rows.length > BULK_MAX_ROWS) {
    return { error: `一度に登録できるのは${BULK_MAX_ROWS}名までです(${rows.length}行ありました)。分割してください。` };
  }

  const errors: string[] = [];
  const valid: ValidatedPlayer[] = [];
  const seenInFile = new Set<string>();

  for (let i = 0; i < rows.length; i++) {
    const cols = rows[i].split(",").map((c) => c.trim());
    const [name, loginId, password, position, grade, jerseyNumber, birthDate, sex] = cols;
    const result = validatePlayer(
      {
        name: name ?? "",
        loginId: loginId ?? "",
        password: password ?? "",
        position: position ?? "",
        grade: grade ?? "",
        jerseyNumber: jerseyNumber ?? "",
        birthDate: birthDate ?? "",
        sex: sex ?? "MALE",
      },
      team.code
    );
    if (!result.ok) {
      errors.push(`${i + 2}行目: ${result.error}`);
      continue;
    }
    // CSV内での重複はDB照会の前に弾く
    if (seenInFile.has(result.value.loginId)) {
      errors.push(`${i + 2}行目: ログインID "${loginId}" がファイル内で重複しています`);
      continue;
    }
    seenInFile.add(result.value.loginId);
    valid.push(result.value);
  }

  // 既存IDの照合を1クエリにまとめる(1件ずつ findUnique すると行数分の往復になる)
  const taken = new Set(
    (
      await prisma.user.findMany({
        where: { loginId: { in: valid.map((v) => v.loginId) } },
        select: { loginId: true },
      })
    ).map((u) => u.loginId)
  );

  const toCreate = valid.filter((v) => {
    if (!taken.has(v.loginId)) return true;
    errors.push(`ログインID "${personalLoginId(v.loginId, team.code)}" は既に使われています`);
    return false;
  });

  if (toCreate.length === 0) {
    return { error: "1件も登録できませんでした。\n" + errors.join("\n") };
  }

  await insertPlayers(toCreate, teamId);

  revalidatePath("/coach");
  revalidatePath("/coach/players");

  return {
    message:
      `${toCreate.length}名を登録しました` +
      (errors.length > 0 ? `(${errors.length}件失敗)\n` + errors.join("\n") : ""),
  };
}

/** 監督が自チームの選手のパスワードを再発行する */
export async function resetPlayerPassword(_prev: PlayerActionState, formData: FormData): Promise<PlayerActionState> {
  const { teamId } = await requireCoachTeam();
  const userId = String(formData.get("userId") ?? "");

  const player = await prisma.user.findFirst({
    where: { id: userId, teamId, role: "PLAYER" },
    select: { id: true, name: true, loginId: true },
  });
  if (!player) return { error: "選手が見つかりません" };

  const password = generatePassword();
  await prisma.user.update({
    where: { id: player.id },
    data: {
      passwordHash: await bcrypt.hash(password, 10),
      // 古いパスワードで入られた端末を締め出す。増やすと発行済みCookieが無効になる
      sessionVersion: { increment: 1 },
    },
  });

  revalidatePath("/coach");
  return {
    message:
      `${player.name} さんの新しいパスワード: ${password}\n` +
      `(この画面を離れると二度と表示されません。今までログインしていた端末はログアウトされます)`,
  };
}

/** 監督が自チームの選手を削除する。記録も一緒に消える */
export async function deletePlayer(_prev: PlayerActionState, formData: FormData): Promise<PlayerActionState> {
  const { teamId } = await requireCoachTeam();
  const userId = String(formData.get("userId") ?? "");

  const player = await prisma.user.findFirst({
    where: { id: userId, teamId, role: "PLAYER" },
    select: { id: true, name: true },
  });
  if (!player) return { error: "選手が見つかりません" };

  await prisma.user.delete({ where: { id: player.id } });

  revalidatePath("/coach");
  revalidatePath("/coach/players");
  return { message: `${player.name} さんとその記録をすべて削除しました` };
}
