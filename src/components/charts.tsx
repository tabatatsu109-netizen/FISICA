"use client";

import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  Cell,
} from "recharts";
import { BAND_COLORS, scoreBand } from "@/lib/score";

const INK_MUTED = "#898781";
const GRID = "#2c2c2a";
const BLUE = "#3987e5";
const AQUA = "#199e70";
const ORANGE = "#d95926";

const axisProps = {
  stroke: GRID,
  tick: { fill: INK_MUTED, fontSize: 11 },
  tickLine: false,
  axisLine: { stroke: "#383835" },
} as const;

const tooltipStyle = {
  contentStyle: {
    background: "#232322",
    border: "1px solid rgba(255,255,255,0.1)",
    borderRadius: 8,
    fontSize: 12,
    color: "#ffffff",
  },
  labelStyle: { color: "#c3c2b7" },
  cursor: { stroke: "#52514e", strokeWidth: 1 },
} as const;

export type Point = { date: string; value: number | null };

function shortDate(d: string) {
  const [, m, day] = d.split("-");
  return `${Number(m)}/${Number(day)}`;
}

const labelFormatter = (l: unknown) => shortDate(String(l));

export function WeightChart({ data, target }: { data: Point[]; target?: number | null }) {
  const values = data.filter((d) => d.value != null).map((d) => d.value as number);
  if (values.length === 0) return <EmptyChart />;
  const min = Math.min(...values, target ?? Infinity);
  const max = Math.max(...values, target ?? -Infinity);
  const pad = Math.max((max - min) * 0.2, 0.5);
  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
        <CartesianGrid stroke={GRID} strokeDasharray="0" vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={28} />
        <YAxis domain={[Math.floor((min - pad) * 10) / 10, Math.ceil((max + pad) * 10) / 10]} {...axisProps} width={44} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${v} kg`, "体重"]} labelFormatter={labelFormatter} />
        {target != null && (
          <ReferenceLine
            y={target}
            stroke={ORANGE}
            strokeDasharray="6 4"
            label={{ value: `目標 ${target.toFixed(1)}kg`, fill: ORANGE, fontSize: 11, position: "insideTopRight" }}
          />
        )}
        <Line type="monotone" dataKey="value" stroke={BLUE} strokeWidth={2} dot={false} connectNulls activeDot={{ r: 5 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

export function SleepChart({ data }: { data: Point[] }) {
  const hasData = data.some((d) => d.value != null);
  if (!hasData) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={28} />
        <YAxis domain={[0, 12]} ticks={[0, 4, 8, 12]} {...axisProps} width={44} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${v} 時間`, "睡眠"]} labelFormatter={labelFormatter} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
        <ReferenceLine y={8} stroke={INK_MUTED} strokeDasharray="6 4" label={{ value: "推奨 8h", fill: INK_MUTED, fontSize: 11, position: "insideTopRight" }} />
        <Bar dataKey="value" fill={AQUA} radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function ReadinessChart({ data }: { data: Point[] }) {
  const hasData = data.some((d) => d.value != null);
  if (!hasData) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <AreaChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
        <defs>
          <linearGradient id="readinessFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={BLUE} stopOpacity={0.3} />
            <stop offset="100%" stopColor={BLUE} stopOpacity={0} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={28} />
        <YAxis domain={[0, 100]} ticks={[0, 34, 67, 100]} {...axisProps} width={44} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${v}`, "スコア"]} labelFormatter={labelFormatter} />
        <Area type="monotone" dataKey="value" stroke={BLUE} strokeWidth={2} fill="url(#readinessFill)" connectNulls activeDot={{ r: 5 }} isAnimationActive={false} />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function NutritionBars({ data }: { data: Point[] }) {
  const hasData = data.some((d) => d.value != null);
  if (!hasData) return <EmptyChart />;
  return (
    <ResponsiveContainer width="100%" height={220}>
      <BarChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={28} />
        <YAxis domain={[0, 100]} ticks={[0, 50, 100]} {...axisProps} width={44} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${v} 点`, "栄養"]} labelFormatter={labelFormatter} cursor={{ fill: "rgba(255,255,255,0.05)" }} />
        <Bar dataKey="value" radius={[4, 4, 0, 0]} maxBarSize={14} isAnimationActive={false}>
          {data.map((d, i) => (
            <Cell key={i} fill={d.value == null ? GRID : BAND_COLORS[scoreBand(d.value)]} />
          ))}
        </Bar>
      </BarChart>
    </ResponsiveContainer>
  );
}

/** 月次カルテ: 身長と体重の小型チャート */
export function GrowthSparkline({ data, color, unit }: { data: Point[]; color?: string; unit: string }) {
  const values = data.filter((d) => d.value != null).map((d) => d.value as number);
  if (values.length === 0) return <EmptyChart height={140} />;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.25, 0.3);
  return (
    <ResponsiveContainer width="100%" height={140}>
      <LineChart data={data} margin={{ top: 8, right: 8, bottom: 0, left: -4 }}>
        <CartesianGrid stroke={GRID} vertical={false} />
        <XAxis dataKey="date" tickFormatter={shortDate} {...axisProps} minTickGap={40} />
        <YAxis domain={[min - pad, max + pad]} {...axisProps} width={48} tickFormatter={(v: number) => v.toFixed(1)} />
        <Tooltip {...tooltipStyle} formatter={(v) => [`${v} ${unit}`, ""]} labelFormatter={labelFormatter} />
        <Line type="monotone" dataKey="value" stroke={color ?? BLUE} strokeWidth={2} dot={false} connectNulls activeDot={{ r: 4 }} isAnimationActive={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}

function EmptyChart({ height = 220 }: { height?: number }) {
  return (
    <div className="flex items-center justify-center text-ink-3 text-sm" style={{ height }}>
      データがありません
    </div>
  );
}
