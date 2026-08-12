// 食事記録の構造とスコアリング

export const MEAL_KEYS = ["breakfast", "lunch", "dinner", "snack"] as const;
export type MealKey = (typeof MEAL_KEYS)[number];

export const MEAL_LABELS: Record<MealKey, string> = {
  breakfast: "朝食",
  lunch: "昼食",
  dinner: "夕食",
  snack: "補食",
};

export const MEAL_TAGS = ["主食", "主菜", "副菜", "乳製品", "果物"] as const;
export type MealTag = (typeof MEAL_TAGS)[number];

export type MealEntry = {
  ate: boolean;
  tags: MealTag[];
  menu: string; // 食べたメニューの自由記述(例: カレーライス、サラダ)
  riceGrams: number | null; // ご飯の量(g)。補食は使わない想定
};
export type Meals = Record<MealKey, MealEntry>;

function emptyEntry(): MealEntry {
  return { ate: false, tags: [], menu: "", riceGrams: null };
}

export function emptyMeals(): Meals {
  return {
    breakfast: emptyEntry(),
    lunch: emptyEntry(),
    dinner: emptyEntry(),
    snack: emptyEntry(),
  };
}

export function parseMeals(json: string | null | undefined): Meals {
  if (!json) return emptyMeals();
  try {
    const parsed = JSON.parse(json) as Partial<Record<MealKey, Partial<MealEntry>>>;
    const base = emptyMeals();
    for (const key of MEAL_KEYS) {
      const entry = parsed[key];
      if (entry && typeof entry.ate === "boolean") {
        base[key] = {
          ate: entry.ate,
          tags: Array.isArray(entry.tags) ? entry.tags.filter((t): t is MealTag => (MEAL_TAGS as readonly string[]).includes(t)) : [],
          menu: typeof entry.menu === "string" ? entry.menu.slice(0, 200) : "",
          riceGrams: typeof entry.riceGrams === "number" && Number.isFinite(entry.riceGrams) ? entry.riceGrams : null,
        };
      }
    }
    return base;
  } catch {
    return emptyMeals();
  }
}

/**
 * 栄養バランススコア 0-100。
 * 朝昼夕それぞれで5カテゴリ(主食/主菜/副菜/乳製品/果物)をどれだけ揃えたかが主軸(90点分)。
 * 補食を摂っていれば+10点。
 */
export function nutritionScore(meals: Meals): number {
  const mainMeals: MealKey[] = ["breakfast", "lunch", "dinner"];
  let covered = 0;
  for (const key of mainMeals) {
    const entry = meals[key];
    if (entry.ate) covered += entry.tags.length;
  }
  const mainScore = (covered / (3 * MEAL_TAGS.length)) * 90;
  const snackBonus = meals.snack.ate ? 10 : 0;
  return Math.round(Math.min(100, mainScore + snackBonus));
}
