import { scoreBand, BAND_COLORS } from "@/lib/score";

type Props = {
  score: number | null;
  size?: number;
  label?: string;
  sublabel?: string;
};

/** WHOOP風の円形スコアゲージ(0-100) */
export function ScoreGauge({ score, size = 140, label, sublabel }: Props) {
  const stroke = size * 0.075;
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const value = score ?? 0;
  const color = score == null ? "var(--grid)" : BAND_COLORS[scoreBand(score)];

  return (
    <div className="flex flex-col items-center gap-1">
      <div className="relative" style={{ width: size, height: size }}>
        <svg width={size} height={size} className="-rotate-90">
          <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="var(--grid)" strokeWidth={stroke} />
          <circle
            cx={size / 2}
            cy={size / 2}
            r={r}
            fill="none"
            stroke={color}
            strokeWidth={stroke}
            strokeLinecap="round"
            strokeDasharray={c}
            strokeDashoffset={c * (1 - value / 100)}
            style={{ transition: "stroke-dashoffset 0.8s ease" }}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="font-black tabular" style={{ fontSize: size * 0.27, color: score == null ? "var(--ink-3)" : "var(--ink)" }}>
            {score == null ? "–" : value}
          </span>
          {sublabel && <span className="text-ink-3" style={{ fontSize: size * 0.08 }}>{sublabel}</span>}
        </div>
      </div>
      {label && <span className="text-xs text-ink-2 font-medium">{label}</span>}
    </div>
  );
}
