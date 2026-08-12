"use client";

import { useState } from "react";
import { saveRecord } from "@/lib/actions/record";
import { MEAL_KEYS, MEAL_LABELS, MEAL_TAGS, type Meals } from "@/lib/meals";

type Defaults = {
  date: string;
  weightKg: number | null;
  heightCm: number | null;
  sleepHours: number | null;
  sleepQuality: number | null;
  condition: number | null;
  fatigue: number | null;
  soreness: number | null;
  rpe: number | null;
  meals: Meals;
  note: string;
};

const SCALE_EMOJI = ["😫", "😕", "😐", "🙂", "😄"];

function ScaleInput({
  name,
  label,
  defaultValue,
  lowLabel,
  highLabel,
}: {
  name: string;
  label: string;
  defaultValue: number | null;
  lowLabel: string;
  highLabel: string;
}) {
  const [value, setValue] = useState<number | null>(defaultValue);
  return (
    <div>
      <p className="text-sm font-medium mb-2">{label}</p>
      <input type="hidden" name={name} value={value ?? ""} />
      <div className="grid grid-cols-5 gap-2">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            className={`rounded-xl py-2.5 text-xl border transition-colors ${
              value === n ? "bg-accent/20 border-accent" : "bg-surface-2 border-white/10"
            }`}
            aria-label={`${label} ${n}`}
          >
            {SCALE_EMOJI[n - 1]}
          </button>
        ))}
      </div>
      <div className="flex justify-between text-[10px] text-ink-3 mt-1">
        <span>{lowLabel}</span>
        <span>{highLabel}</span>
      </div>
    </div>
  );
}

export function RecordForm({ defaults }: { defaults: Defaults }) {
  const [sleepHours, setSleepHours] = useState(defaults.sleepHours ?? 7);
  const [rpe, setRpe] = useState(defaults.rpe ?? 5);

  return (
    <form action={saveRecord} className="flex flex-col gap-4">
      <input type="hidden" name="date" value={defaults.date} />

      <section className="card p-4 flex flex-col gap-3">
        <h3 className="font-bold text-sm">身体</h3>
        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-2">体重 (kg)</span>
            <input
              name="weightKg"
              type="number"
              step="0.1"
              inputMode="decimal"
              defaultValue={defaults.weightKg ?? ""}
              className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 tabular outline-none focus:border-accent"
              placeholder="60.5"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span className="text-xs text-ink-2">身長 (cm)</span>
            <input
              name="heightCm"
              type="number"
              step="0.1"
              inputMode="decimal"
              defaultValue={defaults.heightCm ?? ""}
              className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 tabular outline-none focus:border-accent"
              placeholder="170.0"
            />
          </label>
        </div>
      </section>

      <section className="card p-4 flex flex-col gap-4">
        <h3 className="font-bold text-sm">睡眠</h3>
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-medium">睡眠時間</span>
            <span className="text-xl font-black tabular text-accent">{sleepHours.toFixed(1)}h</span>
          </div>
          <input
            type="range"
            name="sleepHours"
            min={3}
            max={12}
            step={0.5}
            value={sleepHours}
            onChange={(e) => setSleepHours(Number(e.target.value))}
            className="w-full"
          />
        </div>
        <ScaleInput name="sleepQuality" label="睡眠の質" defaultValue={defaults.sleepQuality} lowLabel="眠れなかった" highLabel="ぐっすり" />
      </section>

      <section className="card p-4 flex flex-col gap-4">
        <h3 className="font-bold text-sm">コンディション</h3>
        <ScaleInput name="condition" label="体の調子" defaultValue={defaults.condition} lowLabel="悪い" highLabel="絶好調" />
        <ScaleInput name="fatigue" label="疲労感" defaultValue={defaults.fatigue} lowLabel="なし" highLabel="強い" />
        <ScaleInput name="soreness" label="筋肉痛・違和感" defaultValue={defaults.soreness} lowLabel="なし" highLabel="強い" />
        <div>
          <div className="flex justify-between items-baseline mb-2">
            <span className="text-sm font-medium">練習のきつさ (RPE)</span>
            <span className="text-xl font-black tabular text-accent">{rpe}</span>
          </div>
          <input type="range" name="rpe" min={1} max={10} step={1} value={rpe} onChange={(e) => setRpe(Number(e.target.value))} className="w-full" />
          <div className="flex justify-between text-[10px] text-ink-3 mt-1">
            <span>楽</span>
            <span>限界</span>
          </div>
        </div>
      </section>

      <section className="card p-4 flex flex-col gap-4">
        <h3 className="font-bold text-sm">食事</h3>
        {MEAL_KEYS.map((key) => (
          <MealInput key={key} mealKey={key} defaults={defaults.meals[key]} />
        ))}
      </section>

      <section className="card p-4">
        <label className="flex flex-col gap-1">
          <span className="text-sm font-medium">メモ(任意)</span>
          <textarea
            name="note"
            rows={2}
            defaultValue={defaults.note}
            className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2.5 text-sm outline-none focus:border-accent resize-none"
            placeholder="今日の練習・体調で気づいたこと"
          />
        </label>
      </section>

      <button type="submit" className="bg-accent text-[#0d0d0d] font-bold rounded-xl py-3.5 text-base">
        保存する
      </button>
    </form>
  );
}

function MealInput({ mealKey, defaults }: { mealKey: (typeof MEAL_KEYS)[number]; defaults: { ate: boolean; tags: string[] } }) {
  const [ate, setAte] = useState(defaults.ate);
  const isSnack = mealKey === "snack";
  return (
    <div>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium">{MEAL_LABELS[mealKey]}</span>
        <label className="flex items-center gap-2 text-xs text-ink-2">
          <input
            type="checkbox"
            name={`meal_${mealKey}_ate`}
            checked={ate}
            onChange={(e) => setAte(e.target.checked)}
            className="w-4 h-4 accent-[#a3e635]"
          />
          食べた
        </label>
      </div>
      {ate && !isSnack && (
        <div className="flex flex-wrap gap-2">
          {MEAL_TAGS.map((tag) => (
            <label key={tag} className="cursor-pointer">
              <input type="checkbox" name={`meal_${mealKey}_tags`} value={tag} defaultChecked={defaults.tags.includes(tag)} className="peer sr-only" />
              <span className="inline-block rounded-full border border-white/10 bg-surface-2 px-3 py-1.5 text-xs peer-checked:bg-accent/20 peer-checked:border-accent peer-checked:text-accent">
                {tag}
              </span>
            </label>
          ))}
        </div>
      )}
    </div>
  );
}
