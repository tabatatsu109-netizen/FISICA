// 筋トレ記録の種目マスタと算出ロジック(食事の meals.ts と同じ構成)

export type ExerciseType = "WEIGHT" | "BODYWEIGHT" | "TIME";

/**
 * 種目マスタ。
 * type: WEIGHT=重量×回数 / BODYWEIGHT=回数(加重は任意) / TIME=秒数
 * core: 成長の主指標としてグラフ・サマリーの先頭に出す種目
 */
export const EXERCISES = [
  { key: "squat", label: "スクワット", type: "WEIGHT", part: "下半身", core: true },
  { key: "bench", label: "ベンチプレス", type: "WEIGHT", part: "上半身プッシュ", core: true },
  { key: "deadlift", label: "デッドリフト", type: "WEIGHT", part: "下半身", core: true },
  { key: "chinup", label: "懸垂(チンニング)", type: "BODYWEIGHT", part: "上半身プル", core: true },
  { key: "hipthrust", label: "ヒップスラスト", type: "WEIGHT", part: "下半身", core: false },
  { key: "lunge", label: "ランジ", type: "WEIGHT", part: "下半身", core: false },
  { key: "legcurl", label: "レッグカール", type: "WEIGHT", part: "下半身", core: false },
  { key: "calfraise", label: "カーフレイズ", type: "BODYWEIGHT", part: "下半身", core: false },
  { key: "nordic", label: "ノルディックハムストリング", type: "BODYWEIGHT", part: "下半身", core: false },
  { key: "shoulderpress", label: "ショルダープレス", type: "WEIGHT", part: "上半身プッシュ", core: false },
  { key: "pushup", label: "腕立て伏せ", type: "BODYWEIGHT", part: "上半身プッシュ", core: false },
  { key: "latpulldown", label: "ラットプルダウン", type: "WEIGHT", part: "上半身プル", core: false },
  { key: "row", label: "ベントオーバーロウ", type: "WEIGHT", part: "上半身プル", core: false },
  { key: "plank", label: "プランク", type: "TIME", part: "体幹", core: false },
  { key: "sideplank", label: "サイドプランク", type: "TIME", part: "体幹", core: false },
  { key: "abroller", label: "アブローラー", type: "BODYWEIGHT", part: "体幹", core: false },
] as const;

export type Exercise = (typeof EXERCISES)[number];
export type ExerciseKey = Exercise["key"];

export const EXERCISE_KEYS: readonly ExerciseKey[] = EXERCISES.map((e) => e.key);
export const CORE_EXERCISES: readonly Exercise[] = EXERCISES.filter((e) => e.core);
export const DEFAULT_EXERCISE: ExerciseKey = "squat";

/** 1日に保存できる筋トレ行の上限 */
export const MAX_WORKOUT_ROWS = 20;

/**
 * 推定1RMの対象にする最大回数。
 * 13回以上のセットは推定式の誤差が大きいので1RM換算せず、総挙上量にだけ計上する。
 */
export const MAX_1RM_REPS = 12;

export function exerciseByKey(key: string): Exercise | null {
  return EXERCISES.find((e) => e.key === key) ?? null;
}

export function exerciseLabel(key: string): string {
  return exerciseByKey(key)?.label ?? key;
}

export type WorkoutLike = {
  exercise: string;
  weightKg: number | null;
  reps: number | null;
  seconds: number | null;
  sets: number;
  rpe: number | null;
};

/**
 * 推定1RM (Epley式): 1RM = 重量 × (1 + 回数 / 30)
 * 例: 100kg × 5回 → 116.7kg
 * 実測の最大挙上は入力させず、13回以上のセットも対象外にする(安全側の運用)。
 */
export function estimate1RM(weightKg: number | null, reps: number | null): number | null {
  if (weightKg == null || reps == null) return null;
  if (weightKg <= 0 || reps < 1 || reps > MAX_1RM_REPS) return null;
  return Math.round(weightKg * (1 + reps / 30) * 10) / 10;
}

/** 体重比(推定1RM ÷ 体重)。ランキングはこの値だけを使う。 */
export function bodyweightRatio(oneRm: number | null, bodyWeightKg: number | null): number | null {
  if (oneRm == null || bodyWeightKg == null || bodyWeightKg <= 0) return null;
  return Math.round((oneRm / bodyWeightKg) * 100) / 100;
}

/** 総挙上量(kg)。重量が入らない自重・時間種目は 0。 */
export function entryVolumeKg(e: WorkoutLike): number {
  if (e.weightKg == null || e.reps == null) return 0;
  return e.weightKg * e.reps * e.sets;
}

/** 種目タイプごとの「成長を追う指標」 */
export type MetricKind = "ONE_RM" | "REPS" | "SECONDS";

export function metricKind(type: ExerciseType): MetricKind {
  if (type === "WEIGHT") return "ONE_RM";
  if (type === "BODYWEIGHT") return "REPS";
  return "SECONDS";
}

export const METRIC_LABEL: Record<MetricKind, string> = {
  ONE_RM: "推定1RM",
  REPS: "最高回数",
  SECONDS: "最長時間",
};

export const METRIC_UNIT: Record<MetricKind, string> = {
  ONE_RM: "kg",
  REPS: "回",
  SECONDS: "秒",
};

/** 1件の記録からその種目の指標値を取り出す(取れない場合は null) */
export function entryMetric(e: WorkoutLike): number | null {
  const ex = exerciseByKey(e.exercise);
  if (!ex) return null;
  switch (metricKind(ex.type)) {
    case "ONE_RM":
      return estimate1RM(e.weightKg, e.reps);
    case "REPS":
      return e.reps;
    case "SECONDS":
      return e.seconds;
  }
}

/** 一覧・カルテ共通の表示文字列 */
export function formatEntry(e: WorkoutLike): string {
  const ex = exerciseByKey(e.exercise);
  const sets = `${e.sets}セット`;
  if (ex && ex.type === "TIME") {
    const sec = e.seconds ?? 0;
    const time = sec >= 60 && sec % 60 === 0 ? `${sec / 60}分` : `${sec}秒`;
    return `${time} × ${sets}`;
  }
  const load = e.weightKg != null && e.weightKg > 0 ? `${e.weightKg}kg` : "自重";
  return `${load} × ${e.reps ?? 0}回 × ${sets}`;
}

export function formatSeconds(sec: number): string {
  if (sec >= 60 && sec % 60 === 0) return `${sec / 60}分`;
  if (sec >= 60) return `${Math.floor(sec / 60)}分${sec % 60}秒`;
  return `${sec}秒`;
}

export function formatMetric(kind: MetricKind, value: number): string {
  if (kind === "SECONDS") return formatSeconds(value);
  if (kind === "ONE_RM") return `${value.toFixed(1)}${METRIC_UNIT.ONE_RM}`;
  return `${value}${METRIC_UNIT[kind]}`;
}
