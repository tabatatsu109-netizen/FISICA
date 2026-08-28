import { prisma } from "./db";
import { readinessScore, sleepScore, dailyNutritionScore } from "./score";
import { bmi, targetBmi, targetWeight, categoryLabel, compareToJleague, type Position, type Sex } from "./benchmark";
import type { DailyRecord, PlayerProfile, User, WorkoutEntry } from "@prisma/client";
import {
  DEFAULT_EXERCISE,
  EXERCISES,
  bodyweightRatio,
  entryMetric,
  entryVolumeKg,
  exerciseByKey,
  metricKind,
  type Exercise,
  type MetricKind,
  type WorkoutLike,
} from "./workout";

export type PlayerWithProfile = User & { profile: PlayerProfile | null };

export function todayStr(d = new Date()): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

/** 直近days日分の日付文字列(古い順) */
export function lastDates(days: number, from = new Date()): string[] {
  const out: string[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(from);
    d.setDate(d.getDate() - i);
    out.push(todayStr(d));
  }
  return out;
}

export async function getPlayer(userId: string): Promise<PlayerWithProfile | null> {
  return prisma.user.findUnique({ where: { id: userId }, include: { profile: true } });
}

export async function getRecentRecords(userId: string, days: number): Promise<DailyRecord[]> {
  const since = lastDates(days)[0];
  return prisma.dailyRecord.findMany({
    where: { userId, date: { gte: since } },
    orderBy: { date: "asc" },
  });
}

export type DailySeries = {
  dates: string[];
  weight: Array<{ date: string; value: number | null }>;
  sleep: Array<{ date: string; value: number | null }>;
  readiness: Array<{ date: string; value: number | null }>;
  nutrition: Array<{ date: string; value: number | null }>;
};

export function buildSeries(records: DailyRecord[], days: number): DailySeries {
  const dates = lastDates(days);
  const byDate = new Map(records.map((r) => [r.date, r]));
  const pick = (fn: (r: DailyRecord) => number | null) =>
    dates.map((date) => {
      const r = byDate.get(date);
      return { date, value: r ? fn(r) : null };
    });
  return {
    dates,
    weight: pick((r) => r.weightKg),
    sleep: pick((r) => r.sleepHours),
    readiness: pick((r) => readinessScore(r)),
    nutrition: pick((r) => dailyNutritionScore(r.mealsJson)),
  };
}

/** 連続入力日数(今日または昨日から遡る) */
export function streak(records: DailyRecord[]): number {
  const dateSet = new Set(records.map((r) => r.date));
  let count = 0;
  const cursor = new Date();
  if (!dateSet.has(todayStr(cursor))) cursor.setDate(cursor.getDate() - 1);
  while (dateSet.has(todayStr(cursor))) {
    count++;
    cursor.setDate(cursor.getDate() - 1);
  }
  return count;
}

function avg(values: number[]): number | null {
  if (values.length === 0) return null;
  return values.reduce((s, v) => s + v, 0) / values.length;
}

function latest<T>(records: DailyRecord[], fn: (r: DailyRecord) => T | null): T | null {
  for (let i = records.length - 1; i >= 0; i--) {
    const v = fn(records[i]);
    if (v != null) return v;
  }
  return null;
}

export type MonthSummary = {
  month: string; // "YYYY-MM"
  recordCount: number;
  daysInMonth: number;
  heightStart: number | null;
  heightEnd: number | null;
  heightDelta: number | null;
  weightStart: number | null;
  weightEnd: number | null;
  weightDelta: number | null;
  avgSleep: number | null;
  avgSleepScore: number | null;
  avgNutrition: number | null;
  avgReadiness: number | null;
  currentBmi: number | null;
  targetBmiValue: number | null;
  targetWeightKg: number | null;
  category: string | null;
  advice: string[];
};

export async function getMonthSummary(userId: string, month: string): Promise<MonthSummary> {
  const player = await getPlayer(userId);
  const profile = player?.profile ?? null;
  const [y, m] = month.split("-").map(Number);
  const daysInMonth = new Date(y, m, 0).getDate();

  const records = await prisma.dailyRecord.findMany({
    where: { userId, date: { gte: `${month}-01`, lte: `${month}-${String(daysInMonth).padStart(2, "0")}` } },
    orderBy: { date: "asc" },
  });

  const heights = records.filter((r) => r.heightCm != null);
  const weights = records.filter((r) => r.weightKg != null);
  const heightStart = heights[0]?.heightCm ?? null;
  const heightEnd = heights[heights.length - 1]?.heightCm ?? null;
  const weightStart = weights[0]?.weightKg ?? null;
  const weightEnd = weights[weights.length - 1]?.weightKg ?? null;

  const sleepVals = records.map((r) => r.sleepHours).filter((v): v is number => v != null);
  const sleepScores = records.map((r) => sleepScore(r.sleepHours, r.sleepQuality)).filter((v): v is number => v != null);
  const nutritionVals = records.map((r) => dailyNutritionScore(r.mealsJson)).filter((v): v is number => v != null);
  const readinessVals = records.map((r) => readinessScore(r)).filter((v): v is number => v != null);

  const avgSleep = avg(sleepVals);
  const avgNutrition = avg(nutritionVals);
  const avgReadiness = avg(readinessVals);

  let currentBmi: number | null = null;
  let targetBmiValue: number | null = null;
  let targetWeightKg: number | null = null;
  let category: string | null = null;
  if (profile && heightEnd != null && weightEnd != null) {
    currentBmi = bmi(weightEnd, heightEnd);
    targetBmiValue = targetBmi(profile.birthDate, profile.position as Position, profile.sex as Sex);
    targetWeightKg = targetWeight(heightEnd, targetBmiValue);
    category = categoryLabel(profile.birthDate);
  }

  // ルールベースの改善アドバイス
  const advice: string[] = [];
  const inputRate = records.length / daysInMonth;
  if (inputRate < 0.6) advice.push(`記録日数が${records.length}日と少なめです。まずは毎日の入力を習慣にしましょう。`);
  if (avgSleep != null && avgSleep < 7)
    advice.push(`平均睡眠が${avgSleep.toFixed(1)}時間。成長期のアスリートは8時間以上が目標です。就寝時刻を30分早めることから始めましょう。`);
  else if (avgSleep != null && avgSleep < 8)
    advice.push(`平均睡眠${avgSleep.toFixed(1)}時間。あと少しで目標の8時間です。`);
  if (avgNutrition != null && avgNutrition < 60)
    advice.push("食事の栄養バランスに改善の余地があります。特に副菜・乳製品・果物を意識して揃えましょう。");
  if (currentBmi != null && targetBmiValue != null && targetWeightKg != null && weightEnd != null) {
    const diff = targetWeightKg - weightEnd;
    if (diff > 1)
      advice.push(
        `${category}${profile?.position === "GK" ? "GK" : "フィールド"}の目標BMI ${targetBmiValue.toFixed(1)} まで約${diff.toFixed(1)}kg。補食と主菜でエネルギー・タンパク質を増やしましょう。`
      );
    else if (diff < -1) advice.push(`目標BMIを${Math.abs(diff).toFixed(1)}kg上回っています。体脂肪とのバランスを確認しましょう。`);
    else advice.push(`体格は${category}の目標BMI ${targetBmiValue.toFixed(1)} にほぼ到達しています。この調子で維持しましょう。`);
  }
  if (weightStart != null && weightEnd != null && heightStart != null && heightEnd != null && heightEnd - heightStart > 0.5 && weightEnd - weightStart < 0)
    advice.push("身長が伸びている一方で体重が減っています。急成長期はエネルギー不足になりやすいので食事量を増やしましょう。");
  if (advice.length === 0) advice.push("大きな課題は見つかりませんでした。良い状態をキープできています。");

  return {
    month,
    recordCount: records.length,
    daysInMonth,
    heightStart,
    heightEnd,
    heightDelta: heightStart != null && heightEnd != null ? heightEnd - heightStart : null,
    weightStart,
    weightEnd,
    weightDelta: weightStart != null && weightEnd != null ? weightEnd - weightStart : null,
    avgSleep,
    avgSleepScore: avg(sleepScores),
    avgNutrition,
    avgReadiness,
    currentBmi,
    targetBmiValue,
    targetWeightKg,
    category,
    advice,
  };
}

/** 記録が存在する月の一覧("YYYY-MM"降順) */
export async function getRecordedMonths(userId: string): Promise<string[]> {
  const records = await prisma.dailyRecord.findMany({
    where: { userId },
    select: { date: true },
    orderBy: { date: "desc" },
  });
  const months = new Set(records.map((r) => r.date.slice(0, 7)));
  return [...months];
}

export type CoachPlayerRow = {
  user: PlayerWithProfile;
  latestReadiness: number | null;
  avgSleep7: number | null;
  latestWeight: number | null;
  latestHeight: number | null;
  weightDelta7: number | null;
  inputRate14: number;
  streakDays: number;
  weightGrowth30: number | null;
  heightGrowth30: number | null;
  j1Percentile: number | null;
  alerts: string[];
};

export async function getCoachOverview(): Promise<CoachPlayerRow[]> {
  const players = await prisma.user.findMany({
    where: { role: "PLAYER" },
    include: { profile: true },
    orderBy: { name: "asc" },
  });

  const rows: CoachPlayerRow[] = [];
  for (const player of players) {
    const records = await getRecentRecords(player.id, 30);
    const last7 = records.filter((r) => r.date >= lastDates(7)[0]);
    const last14dates = lastDates(14)[0];
    const last14 = records.filter((r) => r.date >= last14dates);

    const latestReadiness = latest(records, (r) => readinessScore(r));
    const avgSleep7 = avg(last7.map((r) => r.sleepHours).filter((v): v is number => v != null));
    const latestWeight = latest(records, (r) => r.weightKg);
    const latestHeight = latest(records, (r) => r.heightCm);

    const weights7 = last7.filter((r) => r.weightKg != null);
    const weightDelta7 =
      weights7.length >= 2 ? (weights7[weights7.length - 1].weightKg as number) - (weights7[0].weightKg as number) : null;

    const weightsAll = records.filter((r) => r.weightKg != null);
    const weightGrowth30 =
      weightsAll.length >= 2 ? (weightsAll[weightsAll.length - 1].weightKg as number) - (weightsAll[0].weightKg as number) : null;
    const heightsAll = records.filter((r) => r.heightCm != null);
    const heightGrowth30 =
      heightsAll.length >= 2 ? (heightsAll[heightsAll.length - 1].heightCm as number) - (heightsAll[0].heightCm as number) : null;

    const alerts: string[] = [];
    if (latestReadiness != null && latestReadiness < 34) alerts.push("コンディション低下");
    if (avgSleep7 != null && avgSleep7 < 6.5) alerts.push("睡眠不足");
    if (weightDelta7 != null && weightDelta7 <= -1.5) alerts.push("体重急減");
    const inputRate14 = last14.length / 14;
    if (inputRate14 < 0.5) alerts.push("入力率低下");

    let j1Percentile: number | null = null;
    if (latestHeight != null && latestWeight != null && player.profile) {
      j1Percentile = compareToJleague(latestHeight, latestWeight, player.profile.position as Position).percentile;
    }

    rows.push({
      user: player,
      latestReadiness,
      avgSleep7,
      latestWeight,
      latestHeight,
      weightDelta7,
      inputRate14,
      streakDays: streak(records),
      weightGrowth30,
      heightGrowth30,
      j1Percentile,
      alerts,
    });
  }
  return rows;
}

/* ── 筋トレ ───────────────────────────────────────────── */

export type Point = { date: string; value: number | null };

export async function getWorkoutEntries(userId: string, days: number): Promise<WorkoutEntry[]> {
  const since = lastDates(days)[0];
  return prisma.workoutEntry.findMany({
    where: { userId, date: { gte: since } },
    orderBy: [{ date: "asc" }, { order: "asc" }],
  });
}

/** 日付 → 体重。記録のない日は直近の値で埋める(前方補完 → 先頭は後方補完) */
function weightByDate(records: DailyRecord[], dates: string[]): Map<string, number | null> {
  const known = new Map<string, number>();
  for (const r of records) if (r.weightKg != null) known.set(r.date, r.weightKg);
  const out = new Map<string, number | null>();
  let carried: number | null = null;
  for (const date of dates) {
    const w = known.get(date);
    if (w != null) carried = w;
    out.set(date, carried);
  }
  if (carried != null) {
    let firstKnown: number | null = null;
    for (const date of dates) {
      const v = out.get(date) ?? null;
      if (v != null) {
        firstKnown = v;
        break;
      }
    }
    for (const date of dates) {
      if (out.get(date) == null) out.set(date, firstKnown);
      else break;
    }
  }
  return out;
}

/** 1日ぶんの記録から、その種目のベスト指標値を取る */
function bestMetricOf(entries: WorkoutLike[]): number | null {
  let best: number | null = null;
  for (const e of entries) {
    const v = entryMetric(e);
    if (v != null && (best == null || v > best)) best = v;
  }
  return best;
}

export type ExerciseBest = {
  key: string;
  label: string;
  kind: MetricKind;
  best: number;
  prevBest: number | null;
  delta: number | null;
  ratio: number | null;
};

export type StrengthView = {
  days: number;
  exercise: Exercise;
  kind: MetricKind;
  metricSeries: Point[];
  ratioSeries: Point[] | null;
  setsSeries: Point[];
  loggedExercises: string[];
  sessionDays: number;
  totalSets: number;
  totalVolumeKg: number;
  avgRpe: number | null;
  latestWeightKg: number | null;
  bests: ExerciseBest[];
  loadWarning: string | null;
};

/**
 * 筋トレ画面のデータ一式。
 * 前期間との比較のため直近 days*2 日ぶんを1回で取り、JS側で当期/前期に切る。
 */
export async function getStrengthView(userId: string, days: number, exerciseKey: string): Promise<StrengthView> {
  const exercise = exerciseByKey(exerciseKey) ?? exerciseByKey(DEFAULT_EXERCISE)!;
  const kind = metricKind(exercise.type);
  const windowDates = lastDates(days * 2);
  const currentDates = windowDates.slice(days);
  const currentStart = currentDates[0];

  const [entries, records] = await Promise.all([
    getWorkoutEntries(userId, days * 2),
    getRecentRecords(userId, days * 2),
  ]);

  const current = entries.filter((e) => e.date >= currentStart);
  const previous = entries.filter((e) => e.date < currentStart);
  const weights = weightByDate(records, windowDates);

  // 選択種目の推移
  const byDate = new Map<string, WorkoutEntry[]>();
  for (const e of current) {
    if (e.exercise !== exercise.key) continue;
    const list = byDate.get(e.date) ?? [];
    list.push(e);
    byDate.set(e.date, list);
  }
  const metricSeries: Point[] = currentDates.map((date) => ({
    date,
    value: bestMetricOf(byDate.get(date) ?? []),
  }));
  const ratioSeries: Point[] | null =
    kind === "ONE_RM"
      ? metricSeries.map((p) => ({ date: p.date, value: bodyweightRatio(p.value, weights.get(p.date) ?? null) }))
      : null;

  // 日別セット数
  const setsByDate = new Map<string, number>();
  for (const e of current) setsByDate.set(e.date, (setsByDate.get(e.date) ?? 0) + e.sets);
  const setsSeries: Point[] = currentDates.map((date) => ({ date, value: setsByDate.get(date) ?? 0 }));

  // サマリー
  const sessionDays = new Set(current.map((e) => e.date)).size;
  const totalSets = current.reduce((s, e) => s + e.sets, 0);
  const totalVolumeKg = Math.round(current.reduce((s, e) => s + entryVolumeKg(e), 0));
  const rpes = current.map((e) => e.rpe).filter((v): v is number => v != null);
  const avgRpe = avg(rpes);
  const latestWeightKg = weights.get(currentDates[currentDates.length - 1]) ?? null;

  // 種目別ベスト(coreを先に、記録がある種目だけ)
  const loggedExercises = [...new Set(current.map((e) => e.exercise))];
  const bests: ExerciseBest[] = [];
  for (const ex of EXERCISES) {
    const now = bestMetricOf(current.filter((e) => e.exercise === ex.key));
    if (now == null) continue;
    const prevBest = bestMetricOf(previous.filter((e) => e.exercise === ex.key));
    const k = metricKind(ex.type);
    bests.push({
      key: ex.key,
      label: ex.label,
      kind: k,
      best: now,
      prevBest,
      delta: prevBest != null ? Math.round((now - prevBest) * 10) / 10 : null,
      ratio: k === "ONE_RM" ? bodyweightRatio(now, latestWeightKg) : null,
    });
  }
  bests.sort((a, b) => Number(exerciseByKey(b.key)?.core ?? false) - Number(exerciseByKey(a.key)?.core ?? false));

  // 直近7日と その前7日のセット数を比べて、増やしすぎを注意喚起する
  const last7Start = lastDates(7)[0];
  const prev7Start = lastDates(14)[0];
  const sets7 = entries.filter((e) => e.date >= last7Start).reduce((s, e) => s + e.sets, 0);
  const setsPrev7 = entries.filter((e) => e.date >= prev7Start && e.date < last7Start).reduce((s, e) => s + e.sets, 0);
  const loadWarning =
    sets7 >= 12 && setsPrev7 > 0 && sets7 >= setsPrev7 * 1.3
      ? `今週のセット数が前週比 +${Math.round((sets7 / setsPrev7 - 1) * 100)}%(${setsPrev7}→${sets7}セット)。増やしすぎに注意して、睡眠と食事で回復を優先しましょう。`
      : null;

  return {
    days,
    exercise,
    kind,
    metricSeries,
    ratioSeries,
    setsSeries,
    loggedExercises,
    sessionDays,
    totalSets,
    totalVolumeKg,
    avgRpe,
    latestWeightKg,
    bests,
    loadWarning,
  };
}

/** ホーム用の軽いサマリー(直近7日) */
export async function getWeeklyWorkoutSummary(userId: string): Promise<{ sessionDays: number; totalSets: number; totalVolumeKg: number }> {
  const entries = await getWorkoutEntries(userId, 7);
  return {
    sessionDays: new Set(entries.map((e) => e.date)).size,
    totalSets: entries.reduce((s, e) => s + e.sets, 0),
    totalVolumeKg: Math.round(entries.reduce((s, e) => s + entryVolumeKg(e), 0)),
  };
}
