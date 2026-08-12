"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/db";
import { getSession } from "@/lib/session";
import { MEAL_KEYS, MEAL_TAGS, type Meals, type MealTag } from "@/lib/meals";

function numOrNull(v: FormDataEntryValue | null, min: number, max: number): number | null {
  if (v == null || v === "") return null;
  const n = Number(v);
  if (!Number.isFinite(n)) return null;
  return Math.min(Math.max(n, min), max);
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

  await prisma.dailyRecord.upsert({
    where: { userId_date: { userId: session.userId, date } },
    create: { userId: session.userId, date, ...data },
    update: data,
  });

  revalidatePath("/player");
  redirect("/player?saved=1");
}
