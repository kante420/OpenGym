/** Gráfica de línea en SVG puro (sin dependencias). Pensada para progreso de peso/1RM. */
export function LineChart({ data, unit = 'kg', height = 180, label }: {
  data: { x: string; y: number }[]; unit?: string; height?: number; label: string;
}) {
  if (data.length === 0) return null;
  const W = 600, H = height, P = { l: 40, r: 14, t: 14, b: 26 };
  const ys = data.map((d) => d.y);
  let min = Math.min(...ys), max = Math.max(...ys);
  if (min === max) { min -= 1; max += 1; }
  const pad = (max - min) * 0.15; min -= pad; max += pad;
  const sx = (i: number) => P.l + (data.length === 1 ? (W - P.l - P.r) / 2 : (i / (data.length - 1)) * (W - P.l - P.r));
  const sy = (v: number) => P.t + (1 - (v - min) / (max - min)) * (H - P.t - P.b);
  const line = data.map((d, i) => `${i ? 'L' : 'M'}${sx(i).toFixed(1)},${sy(d.y).toFixed(1)}`).join(' ');
  const area = `${line} L${sx(data.length - 1).toFixed(1)},${H - P.b} L${sx(0).toFixed(1)},${H - P.b} Z`;
  const ticks = [min + pad, (min + max) / 2, max - pad];
  const id = `g-${label.replace(/\W/g, '')}`;

  return (
    <svg viewBox={`0 0 ${W} ${H}`} role="img" aria-label={`${label}: de ${data[0].y} a ${data.at(-1)!.y} ${unit}`} className="w-full">
      <defs>
        <linearGradient id={id} x1="0" x2="0" y1="0" y2="1">
          <stop offset="0" stopColor="var(--color-gold)" stopOpacity=".35" />
          <stop offset="1" stopColor="var(--color-gold)" stopOpacity="0" />
        </linearGradient>
      </defs>
      {ticks.map((t, i) => (
        <g key={i}>
          <line x1={P.l} x2={W - P.r} y1={sy(t)} y2={sy(t)} stroke="var(--color-line)" strokeDasharray="3 5" />
          <text x={P.l - 8} y={sy(t) + 4} textAnchor="end" fontSize="11" fill="var(--color-faint)">{Math.round(t * 10) / 10}</text>
        </g>
      ))}
      <path d={area} fill={`url(#${id})`} />
      <path d={line} fill="none" stroke="var(--color-gold)" strokeWidth="2.5" strokeLinejoin="round" strokeLinecap="round" />
      {data.map((d, i) => (
        <circle key={i} cx={sx(i)} cy={sy(d.y)} r={i === data.length - 1 ? 5 : 3.5} fill={i === data.length - 1 ? 'var(--color-gold-hi)' : 'var(--color-canvas)'} stroke="var(--color-gold)" strokeWidth="2">
          <title>{`${d.x}: ${d.y} ${unit}`}</title>
        </circle>
      ))}
      <text x={P.l} y={H - 6} fontSize="11" fill="var(--color-faint)">{data[0].x}</text>
      {data.length > 1 && <text x={W - P.r} y={H - 6} textAnchor="end" fontSize="11" fill="var(--color-faint)">{data.at(-1)!.x}</text>}
    </svg>
  );
}
