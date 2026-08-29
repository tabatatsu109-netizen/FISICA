"use client";

import { useState } from "react";
import { saveRecord } from "@/lib/actions/record";
import { MEAL_KEYS, MEAL_LABELS, MEAL_TAGS, type Meals } from "@/lib/meals";
import {
  DEFAULT_EXERCISE,
  EXERCISES,
  MAX_WORKOUT_ROWS,
  estimate1RM,
  exerciseByKey,
  type ExerciseKey,
} from "@/lib/workout";

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
  workouts: WorkoutRow[];
};

export type WorkoutRow = {
  exercise: ExerciseKey;
  weightKg: string;
  reps: string;
  seconds: string;
  sets: string;
  rpe: number;
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
  const [workoutOn, setWorkoutOn] = useState(defaults.workouts.length > 0);
  const [workouts, setWorkouts] = useState<WorkoutRow[]>(defaults.workouts);

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

      <section className="card p-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">筋トレ記録</h3>
          <button
            type="button"
            role="switch"
            aria-checked={workoutOn}
            aria-label="筋トレ記録"
            onClick={() => setWorkoutOn((v) => !v)}
            className={`relative w-12 h-7 rounded-full transition-colors ${workoutOn ? "bg-accent" : "bg-surface-2 border border-white/10"}`}
          >
            <span
              className={`absolute top-1 w-5 h-5 rounded-full transition-transform ${
                workoutOn ? "translate-x-6 bg-[#0d0d0d]" : "translate-x-1 bg-ink-3"
              }`}
            />
          </button>
        </div>
        {workoutOn && (
          <div className="flex flex-col gap-3">
            {workouts.length === 0 && (
              <p className="text-xs text-ink-3">「+ 種目を追加」から今日やった種目を入れましょう。</p>
            )}
            {workouts.map((row, i) => (
              <WorkoutInput
                key={i}
                row={row}
                onChange={(next) => setWorkouts((rows) => rows.map((r, j) => (j === i ? next : r)))}
                onRemove={() => setWorkouts((rows) => rows.filter((_, j) => j !== i))}
              />
            ))}
            {workouts.length < MAX_WORKOUT_ROWS && (
              <button
                type="button"
                onClick={() => setWorkouts((rows) => [...rows, emptyWorkoutRow()])}
                className="rounded-xl border border-dashed border-white/20 py-2.5 text-sm text-ink-2"
              >
                + 種目を追加
              </button>
            )}
          </div>
        )}
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

const RICE_PRESETS = [150, 200, 250, 300];

function MealInput({
  mealKey,
  defaults,
}: {
  mealKey: (typeof MEAL_KEYS)[number];
  defaults: { ate: boolean; tags: string[]; menu: string; riceGrams: number | null };
}) {
  const [ate, setAte] = useState(defaults.ate);
  const [rice, setRice] = useState<number | "">(defaults.riceGrams ?? "");
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
      {ate && (
        <div className="flex flex-col gap-2.5">
          <input
            type="text"
            name={`meal_${mealKey}_menu`}
            defaultValue={defaults.menu}
            placeholder={isSnack ? "例: おにぎり、プロテイン" : "メニュー(例: カレーライス、サラダ、牛乳)"}
            className="bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
          />
          {!isSnack && (
            <>
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
              <div className="flex items-center gap-2 flex-wrap">
                <span className="text-xs text-ink-3">ご飯の量</span>
                {RICE_PRESETS.map((g) => (
                  <button
                    key={g}
                    type="button"
                    onClick={() => setRice(rice === g ? "" : g)}
                    className={`rounded-full border px-3 py-1.5 text-xs tabular ${
                      rice === g ? "bg-accent/20 border-accent text-accent" : "bg-surface-2 border-white/10 text-ink-2"
                    }`}
                  >
                    {g}g
                  </button>
                ))}
                <input
                  type="number"
                  name={`meal_${mealKey}_rice`}
                  value={rice}
                  min={0}
                  max={1000}
                  step={10}
                  inputMode="numeric"
                  onChange={(e) => setRice(e.target.value === "" ? "" : Number(e.target.value))}
                  placeholder="g"
                  className="w-20 bg-surface-2 border border-white/10 rounded-lg px-2.5 py-1.5 text-xs tabular outline-none focus:border-accent"
                />
              </div>
            </>
          )}
        </div>
      )}
    </div>
  );
}

export function emptyWorkoutRow(): WorkoutRow {
  return { exercise: DEFAULT_EXERCISE, weightKg: "", reps: "", seconds: "", sets: "3", rpe: 6 };
}

const EXERCISE_PARTS = [...new Set(EXERCISES.map((e) => e.part))];

function WorkoutInput({
  row,
  onChange,
  onRemove,
}: {
  row: WorkoutRow;
  onChange: (next: WorkoutRow) => void;
  onRemove: () => void;
}) {
  const exercise = exerciseByKey(row.exercise) ?? EXERCISES[0];
  const isTime = exercise.type === "TIME";
  const isBodyweight = exercise.type === "BODYWEIGHT";
  const oneRm = isTime ? null : estimate1RM(Number(row.weightKg) || null, Number(row.reps) || null);
  const inputClass =
    "bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm tabular outline-none focus:border-accent w-full";

  return (
    <div className="rounded-xl border border-white/10 bg-surface-2/40 p-3 flex flex-col gap-2.5">
      <div className="flex items-center gap-2">
        <select
          name="w_exercise"
          value={row.exercise}
          onChange={(e) => onChange({ ...row, exercise: e.target.value as ExerciseKey })}
          className="flex-1 bg-surface-2 border border-white/10 rounded-lg px-3 py-2 text-sm outline-none focus:border-accent"
        >
          {EXERCISE_PARTS.map((part) => (
            <optgroup key={part} label={part}>
              {EXERCISES.filter((e) => e.part === part).map((e) => (
                <option key={e.key} value={e.key}>
                  {e.label}
                </option>
              ))}
            </optgroup>
          ))}
        </select>
        <button type="button" onClick={onRemove} className="text-xs text-critical border border-critical/40 rounded-lg px-2.5 py-2">
          削除
        </button>
      </div>

      {/* 種目タイプに関係なく全フィールドを送る(サーバ側で行ごとの配列を揃えるため) */}
      <div className="grid grid-cols-3 gap-2">
        {isTime ? (
          <input type="hidden" name="w_weight" value="" />
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-3">{isBodyweight ? "加重 (kg)" : "重量 (kg)"}</span>
            <input
              name="w_weight"
              type="number"
              step="0.5"
              min={0}
              max={500}
              inputMode="decimal"
              value={row.weightKg}
              onChange={(e) => onChange({ ...row, weightKg: e.target.value })}
              placeholder={isBodyweight ? "自重" : "100"}
              className={inputClass}
            />
          </label>
        )}

        {isTime ? (
          <input type="hidden" name="w_reps" value="" />
        ) : (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-3">回数</span>
            <input
              name="w_reps"
              type="number"
              min={1}
              max={100}
              inputMode="numeric"
              value={row.reps}
              onChange={(e) => onChange({ ...row, reps: e.target.value })}
              placeholder="5"
              className={inputClass}
            />
          </label>
        )}

        {isTime ? (
          <label className="flex flex-col gap-1">
            <span className="text-[11px] text-ink-3">秒数</span>
            <input
              name="w_seconds"
              type="number"
              min={1}
              max={3600}
              inputMode="numeric"
              value={row.seconds}
              onChange={(e) => onChange({ ...row, seconds: e.target.value })}
              placeholder="60"
              className={inputClass}
            />
          </label>
        ) : (
          <input type="hidden" name="w_seconds" value="" />
        )}

        <label className="flex flex-col gap-1">
          <span className="text-[11px] text-ink-3">セット数</span>
          <input
            name="w_sets"
            type="number"
            min={1}
            max={20}
            inputMode="numeric"
            value={row.sets}
            onChange={(e) => onChange({ ...row, sets: e.target.value })}
            placeholder="3"
            className={inputClass}
          />
        </label>
      </div>

      <div>
        <div className="flex justify-between items-baseline mb-1">
          <span className="text-[11px] text-ink-3">RPE (きつさ)</span>
          <span className="text-sm font-black tabular text-accent">{row.rpe}</span>
        </div>
        <input
          type="range"
          name="w_rpe"
          min={1}
          max={10}
          step={1}
          value={row.rpe}
          onChange={(e) => onChange({ ...row, rpe: Number(e.target.value) })}
          className="w-full"
        />
      </div>

      {oneRm != null && (
        <p className="text-[11px] text-ink-3">
          推定1RM <span className="text-accent font-bold tabular">{oneRm.toFixed(1)}kg</span>
          <span className="ml-2">(実測せず、今のセットから自動計算しています)</span>
        </p>
      )}
    </div>
  );
}
