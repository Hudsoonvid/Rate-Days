import { useState, type PointerEvent } from "react";
import { TIERS } from "../lib/ratings";

/**
 * Small SVG charts in one visual system: thin columns with 4px rounded caps
 * grown from a single baseline, 2px lines, ringed markers, hairline grid, and
 * text in text colours (never the data colour). Every chart answers taps/hover.
 */

const SURFACE = "#1c1c1e";
const GRID = "#2c2c30";
const INK = "#e5e5ea";
const MUTED = "#8e8e93";

export interface Column {
  label: string;
  sub?: string;
  value: number;
  color: string;
  /** Text shown on the cap; omit to hide the cap label. */
  display?: string;
  title: string;
}

export function ColumnChart({ columns, max, height = 150 }: { columns: Column[]; max: number; height?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const width = 320;
  const top = 18;
  const bottom = columns.some((c) => c.sub) ? 34 : 20;
  const plot = height - top - bottom;
  const band = width / columns.length;
  const barW = Math.min(24, band - 4);
  const r = Math.min(4, barW / 2);
  const y0 = top + plot;

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={columns.map((c) => c.title).join(", ")}>
        <line x1={0} x2={width} y1={y0 + 0.5} y2={y0 + 0.5} stroke={GRID} strokeWidth={1} />
        {columns.map((c, i) => {
          const h = max ? Math.max(c.value > 0 ? 2 : 0, (c.value / max) * plot) : 0;
          const x = i * band + (band - barW) / 2;
          const y = y0 - h;
          const rr = Math.min(r, h);
          const path = h
            ? `M${x},${y0} V${y + rr} Q${x},${y} ${x + rr},${y} H${x + barW - rr} Q${x + barW},${y} ${x + barW},${y + rr} V${y0} Z`
            : "";
          const dim = active !== null && active !== i;
          return (
            <g key={c.label + i} onPointerEnter={() => setActive(i)} onPointerLeave={() => setActive(null)} onClick={() => setActive(active === i ? null : i)}>
              <title>{c.title}</title>
              <rect x={i * band} y={0} width={band} height={height} fill="transparent" />
              {path && <path d={path} fill={c.color} opacity={dim ? 0.35 : 1} />}
              {c.display && (
                <text x={x + barW / 2} y={y - 5} textAnchor="middle" fontSize={11} fontWeight={700} fill={INK}>
                  {c.display}
                </text>
              )}
              <text x={x + barW / 2} y={y0 + 14} textAnchor="middle" fontSize={11} fill={MUTED}>
                {c.label}
              </text>
              {c.sub && (
                <text x={x + barW / 2} y={y0 + 28} textAnchor="middle" fontSize={10} fill="#5f5f66">
                  {c.sub}
                </text>
              )}
            </g>
          );
        })}
      </svg>
      <div className="tiny muted center" style={{ minHeight: 16 }}>
        {active !== null ? columns[active].title : " "}
      </div>
    </div>
  );
}

export interface LineSeries {
  name: string;
  values: (number | null)[];
  /** Solid colour, or "tier" to shade the line by rating level. */
  color: string;
}

export function LineChart({ labels, series, height = 190, min = 0, max = 10 }: { labels: string[]; series: LineSeries[]; height?: number; min?: number; max?: number }) {
  const [active, setActive] = useState<number | null>(null);
  const width = 320;
  const left = 22;
  const right = 10;
  const top = 12;
  const bottom = 22;
  const plotW = width - left - right;
  const plotH = height - top - bottom;
  const x = (i: number) => left + (labels.length === 1 ? plotW / 2 : (i / (labels.length - 1)) * plotW);
  const y = (v: number) => top + (1 - (v - min) / (max - min)) * plotH;
  const ticks = [min, (min + max) / 2, max];

  const onMove = (e: PointerEvent<SVGRectElement>) => {
    const box = (e.currentTarget.ownerSVGElement ?? e.currentTarget).getBoundingClientRect();
    const px = ((e.clientX - box.left) / box.width) * width;
    const i = Math.round(((px - left) / plotW) * (labels.length - 1));
    setActive(Math.max(0, Math.min(labels.length - 1, i)));
  };

  // Smooth path through consecutive known points; gaps break the line.
  const paths = (values: (number | null)[]) => {
    const segs: string[] = [];
    let seg: [number, number][] = [];
    const flush = () => {
      if (seg.length > 1) {
        let d = `M${seg[0][0]},${seg[0][1]}`;
        for (let i = 1; i < seg.length; i++) {
          const [x0, y0] = seg[i - 1];
          const [x1, y1] = seg[i];
          const cx = (x0 + x1) / 2;
          d += ` C${cx},${y0} ${cx},${y1} ${x1},${y1}`;
        }
        segs.push(d);
      }
      seg = [];
    };
    values.forEach((v, i) => (v === null ? flush() : seg.push([x(i), y(v)])));
    flush();
    return segs;
  };

  const tierStops = TIERS.slice().reverse();

  return (
    <div>
      <svg viewBox={`0 0 ${width} ${height}`} width="100%" role="img" aria-label={series.map((s) => s.name).join(" vs ")}>
        <defs>
          <linearGradient id="tier-gradient" gradientUnits="userSpaceOnUse" x1={0} x2={0} y1={y(min)} y2={y(max)}>
            {tierStops.map((t, i) => {
              const next = tierStops[i + 1];
              const from = (t.min - min) / (max - min);
              const to = next ? (next.min - min) / (max - min) : 1;
              return [
                <stop key={`${t.key}a`} offset={Math.max(0, from)} stopColor={t.color} />,
                <stop key={`${t.key}b`} offset={Math.min(1, to)} stopColor={t.color} />,
              ];
            })}
          </linearGradient>
        </defs>
        {ticks.map((t) => (
          <g key={t}>
            <line x1={left} x2={width - right} y1={y(t) + 0.5} y2={y(t) + 0.5} stroke={GRID} strokeWidth={1} />
            <text x={left - 6} y={y(t) + 4} textAnchor="end" fontSize={10} fill={MUTED}>
              {t}
            </text>
          </g>
        ))}
        {labels.map((l, i) => (
          <text key={l + i} x={x(i)} y={height - 6} textAnchor="middle" fontSize={10} fill={MUTED}>
            {l}
          </text>
        ))}
        {active !== null && <line x1={x(active)} x2={x(active)} y1={top} y2={top + plotH} stroke="#48484a" strokeWidth={1} />}
        {series.map((s) => {
          const stroke = s.color === "tier" ? "url(#tier-gradient)" : s.color;
          return (
            <g key={s.name}>
              {paths(s.values).map((d, i) => (
                <path key={i} d={d} fill="none" stroke={stroke} strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" />
              ))}
              {s.values.map((v, i) =>
                v === null ? null : (
                  <circle
                    key={i}
                    cx={x(i)}
                    cy={y(v)}
                    r={active === i ? 5 : 4}
                    fill={s.color === "tier" ? TIERS.find((t) => v >= t.min)?.color ?? TIERS[5].color : s.color}
                    stroke={SURFACE}
                    strokeWidth={2}
                  />
                ),
              )}
            </g>
          );
        })}
        <rect
          x={left}
          y={0}
          width={plotW}
          height={height}
          fill="transparent"
          onPointerMove={onMove}
          onPointerDown={onMove}
          onPointerLeave={() => setActive(null)}
          style={{ touchAction: "pan-y" }}
        />
      </svg>
      <div className="row small" style={{ justifyContent: "center", gap: 14, minHeight: 20, flexWrap: "wrap" }}>
        {active === null
          ? series.map((s) => (
              <span key={s.name} className="row" style={{ gap: 6 }}>
                <i style={{ width: 14, height: 3, borderRadius: 2, background: s.color === "tier" ? "linear-gradient(90deg,#a23be0,#e5483d,#f08a2e,#f2c230,#3fb950,#3767f2)" : s.color }} />
                <span className="muted">{s.name}</span>
              </span>
            ))
          : (
              <>
                <b>{labels[active]}</b>
                {series.map((s) => (
                  <span key={s.name} className="muted">
                    {s.name}: <span style={{ color: INK }}>{s.values[active] === null ? "—" : s.values[active]!.toFixed(1)}</span>
                  </span>
                ))}
              </>
            )}
      </div>
    </div>
  );
}
