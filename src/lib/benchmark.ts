// 世代別・ポジション別のBMI目標値。
// 出典: サッカー選手向けBMI計算ツール(各年代の代表チーム平均値ベース)。
// 一般の肥満指数とは意味合いが異なる「サッカー選手としての目標値」。

export type Position = "GK" | "DF" | "MF" | "FW";
export type Sex = "MALE" | "FEMALE";

// U13..U20 のインデックス 0..7
const FIELD_MALE = [19.5, 20.5, 21.0, 22.0, 22.0, 22.5, 23.0, 23.5];
const FIELD_FEMALE = [19.0, 20.0, 21.0, 22.0, 22.0, 22.5, 23.0, 23.5];
const GK_MALE = [20.5, 21.5, 21.5, 22.5, 23.0, 23.5, 23.5, 24.0];
const GK_FEMALE = [20.5, 21.5, 21.5, 22.5, 23.0, 23.5, 23.5, 24.0];

/** その年の12/31時点の年齢からカテゴリを算出(U13〜U20にクランプ) */
export function ageCategory(birthDate: Date, today = new Date()): number {
  const age = today.getFullYear() - birthDate.getFullYear();
  return Math.min(Math.max(age, 13), 20);
}

export function targetBmi(birthDate: Date, position: Position, sex: Sex = "MALE", today = new Date()): number {
  const idx = ageCategory(birthDate, today) - 13;
  const table =
    position === "GK" ? (sex === "FEMALE" ? GK_FEMALE : GK_MALE) : sex === "FEMALE" ? FIELD_FEMALE : FIELD_MALE;
  return table[idx];
}

export function bmi(weightKg: number, heightCm: number): number {
  const h = heightCm / 100;
  return weightKg / (h * h);
}

/** 目標BMIに対応する目標体重(kg) */
export function targetWeight(heightCm: number, target: number): number {
  const h = heightCm / 100;
  return target * h * h;
}

export function categoryLabel(birthDate: Date, today = new Date()): string {
  return `U${ageCategory(birthDate, today)}`;
}
