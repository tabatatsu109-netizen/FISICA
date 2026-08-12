// 印刷用の軽量SVGスパークライン(サーバーコンポーネント)
export function PrintSparkline({
  data,
  width = 220,
  height = 56,
  color = "#3987e5",
}: {
  data: Array<{ date: string; value: number | null }>;
  width?: number;
  height?: number;
  color?: string;
}) {
  const points = data
    .map((d, i) => ({ i, value: d.value }))
    .filter((p): p is { i: number; value: number } => p.value != null);
  if (points.length < 2) {
    return (
      <svg width={width} height={height}>
        <text x={width / 2} y={height / 2} textAnchor="middle" fill="#898781" fontSize="10">
          データ不足
        </text>
      </svg>
    );
  }
  const values = points.map((p) => p.value);
  const min = Math.min(...values);
  const max = Math.max(...values);
  const pad = Math.max((max - min) * 0.15, 0.1);
  const lo = min - pad;
  const hi = max + pad;
  const px = (i: number) => (i / (data.length - 1)) * (width - 8) + 4;
  const py = (v: number) => height - 6 - ((v - lo) / (hi - lo)) * (height - 12);
  const path = points.map((p, idx) => `${idx === 0 ? "M" : "L"}${px(p.i).toFixed(1)},${py(p.value).toFixed(1)}`).join(" ");
  const last = points[points.length - 1];

  return (
    <svg width={width} height={height}>
      <path d={path} fill="none" stroke={color} strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" />
      <circle cx={px(last.i)} cy={py(last.value)} r={3} fill={color} />
    </svg>
  );
}
