"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MEAL_KEYS, MEAL_TAGS, type Meals, type MealTag } from "@/lib/meals";
import { MAX_WORKOUT_ROWS, exerciseByKey } from "@/lib/workout";

function numOrNull(v: FormDataEntryValue | null, min: number, max: number): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, min), max);
}

function intOrNull(v: FormDataEntryValue | null, min: number, max: number): number | null {
  const n = numOrNull(v, min, max);
  return n == null ? null : Math.round(n);
}

type WorkoutRowInput = {
  exercise: string;
  order: number;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
  sets: number;
  rpe: number | null;
};

/**
 * 筋トレ行を FormData から取り出す。
 * 各行は種目に関係なく全フィールドを必ず送る作りなので、getAll() の配列は行ごとに揃う。
 */
function parseWorkoutRows(formData: FormData): WorkoutRowInput[] {
  const exercises = formData.getAll("w_exercise").map(String);
  const weights = formData.getAll("w_weight");
  const reps = formData.getAll("w_reps");
  const seconds = formData.getAll("w_seconds");
  const sets = formData.getAll("w_sets");
  const rpes = formData.getAll("w_rpe");

  const rows: WorkoutRowInput[] = [];
  for (let i = 0; i < exercises.length && rows.length < MAX_WORKOUT_ROWS; i++) {
    const exercise = exerciseByKey(exercises[i]);
    if (!exercise) continue; // 許可リストにない種目は捨てる
    const isTime = exercise.type === "TIME";
    const weightKg = isTime ? null : numOrNull(weights[i] ?? null, 0, 500);
    const repCount = isTime ? null : intOrNull(reps[i] ?? null, 1, 100);
    const sec = isTime ? intOrNull(seconds[i] ?? null, 1, 3600) : null;
    // 実質空の行(回数も秒数も入っていない)は保存しない
    if (isTime ? sec == null : repCount == null) continue;
    rows.push({
      exercise: exercise.key,
      order: rows.length,
      weightKg,
      reps: repCount,
      seconds: sec,
      sets: intOrNull(sets[i] ?? null, 1, 20) ?? 1,
      rpe: intOrNull(rpes[i] ?? null, 1, 10),
    });
  }
  return rows;
}

export async function saveRecord(formData: FormData) {
  const session = await getSession();
  if (!session || session.role !== "PLAYER") redirect("/login");

  const date = String(formData.get("date") ?? "");
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) throw new Error("invalid date");

  const meals: Meals = {
    breakfast: { ate: false, tags: [], menu: "", riceGrams: null },
    lunch: { ate: false, tags: [], menu: "", riceGrams: null },
    dinner: { ate: false, tags: [], menu: "", riceGrams: null },
    snack: { ate: false, tags: [], menu: "", riceGrams: null },
  };
  for (const key of MEAL_KEYS) {
    const ate = formData.get(`meal_${key}_ate`) === "on";
    const tags = formData
      .getAll(`meal_${key}_tags`)
      .map(String)
      .filter((t): t is MealTag => (MEAL_TAGS as readonly string[]).includes(t));
    const menu = String(formData.get(`meal_${key}_menu`) ?? "").slice(0, 200);
    const riceGrams = numOrNull(formData.get(`meal_${key}_rice`), 0, 1000);
    meals[key] = { ate: ate || tags.length > 0 || menu.length > 0, tags, menu, riceGrams };
  }

  const data = {
    weightKg: numOrNull(formData.get("weightKg"), 25, 150),
    heightCm: numOrNull(formData.get("heightCm"), 120, 220),
    sleepHours: numOrNull(formData.get("sleepHours"), 0, 16),
    sleepQuality: numOrNull(formData.get("sleepQuality"), 1, 5),
    condition: numOrNull(formData.get("condition"), 1, 5),
    fatigue: numOrNull(formData.get("fatigue"), 1, 5),
    soreness: numOrNull(formData.get("soreness"), 1, 5),
    rpe: numOrNull(formData.get("rpe"), 1, 10),
    mealsJson: JSON.stringify(meals),
    note: String(formData.get("note") ?? "").slice(0, 500) || null,
  };

  const record = await prisma.dailyRecord.upsert({
    where: { userId_date: { userId: session.userId, date } },
    create: { userId: session.userId, date, ...data },
    update: data,
  });

  // その日の筋トレはまるごと上書きする(日次レコードの upsert と同じ考え方)
  const workoutRows = parseWorkoutRows(formData);
  await prisma.$transaction([
    prisma.workoutEntry.deleteMany({ where: { recordId: record.id } }),
    ...(workoutRows.length > 0
      ? [
          prisma.workoutEntry.createMany({
            data: workoutRows.map((row) => ({ ...row, recordId: record.id, userId: session.userId, date })),
          }),
        ]
      : []),
  ]);

  revalidatePath("/player");
  revalidatePath("/player/strength");
  redirect("/player?saved=1");
}
