// コンディション統合スコアなどの算出ロジック
import { parseMeals, nutritionScore } from "./meals";

export type RecordLike = {
  sleepHours: number | null;
  sleepQuality: number | null;
  condition: number | null;
  fatigue: number | null;
  soreness: number | null;
  mealsJson: string | null;
};

/**
 * 睡眠スコア 0-100。高校生アスリートの推奨 8〜10時間を満点帯とする。
 * 時間 70点 + 主観的な質 30点。
 */
export function sleepScore(hours: number | null, quality: number | null): number | null {
  if (hours == null) return null;
  let hourScore: number;
  if (hours >= 8) hourScore = 70;
  else if (hours <= 4) hourScore = 0;
  else hourScore = ((hours - 4) / 4) * 70;
  const qualityScore = quality != null ? ((quality - 1) / 4) * 30 : 15;
  return Math.round(hourScore + qualityScore);
}

/**
 * コンディション統合スコア 0-100(WHOOPのRecoveryスコアに相当)。
 * 睡眠 40% + 主観コンディション 25% + 疲労(逆) 20% + 筋肉痛(逆) 15%。
 * 入力がない項目は配分から除外して正規化する。
 */
export function readinessScore(r: RecordLike): number | null {
  const parts: Array<{ weight: number; value: number }> = [];
  const sleep = sleepScore(r.sleepHours, r.sleepQuality);
  if (sleep != null) parts.push({ weight: 0.4, value: sleep });
  if (r.condition != null) parts.push({ weight: 0.25, value: ((r.condition - 1) / 4) * 100 });
  if (r.fatigue != null) parts.push({ weight: 0.2, value: ((5 - r.fatigue) / 4) * 100 });
  if (r.soreness != null) parts.push({ weight: 0.15, value: ((5 - r.soreness) / 4) * 100 });
  if (parts.length === 0) return null;
  const totalWeight = parts.reduce((s, p) => s + p.weight, 0);
  const score = parts.reduce((s, p) => s + p.weight * p.value, 0) / totalWeight;
  return Math.round(score);
}

export function dailyNutritionScore(mealsJson: string | null): number | null {
  if (!mealsJson) return null;
  return nutritionScore(parseMeals(mealsJson));
}

/** スコア帯: good(67+) / warning(34-66) / critical(<34) */
export function scoreBand(score: number): "good" | "warning" | "critical" {
  if (score >= 67) return "good";
  if (score >= 34) return "warning";
  return "critical";
}

export const BAND_COLORS: Record<"good" | "warning" | "critical", string> = {
  good: "#0ca30c",
  warning: "#fab219",
  critical: "#d03b3b",
};
