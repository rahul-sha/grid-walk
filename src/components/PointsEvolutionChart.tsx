import type { PointsGridColumn } from "@/lib/points-grid";

export type EvolutionMode = "place" | "points";

export interface EvolutionSeriesInput {
  id: string;
  code: string;
  color: string;
  // Series sharing a group are team-mates: the second one in standings
  // order is drawn dashed, since both carry the same team colour.
  group?: string;
  // null means the driver did not take part in that round.
  pointsByRound: (number | null)[];
}

// The card is baked to a picture, so nothing here can rely on hover: every
// name, place and total is drawn. Sizes are fixed so the picture's natural
// size is the same for every palette and theme.
const WIDTH = 1120;
const HEAD_H = 62; // flags, abbreviations and sprint bars
const PAD_BOTTOM = 10;
const ROW_H = 30;
const MAX_ROW_H = 64;
const PILL_W = 116;
const PILL_H = 20;

// Smooth step between two places: flat at each race, eased in between.
function stepPath(points: [number, number][]): string {
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const mid = (x0 + x1) / 2;
    d += ` C${mid} ${y0} ${mid} ${y1} ${x1} ${y1}`;
  }
  return d;
}

// A smooth curve through the points that never overshoots them (monotone
// cubic, Fritsch-Carlson): a running total must not appear to dip after a
// weekend without points.
function curvePath(points: [number, number][]): string {
  const n = points.length;
  const slope: number[] = [];
  for (let i = 0; i < n - 1; i++) slope.push((points[i + 1][1] - points[i][1]) / (points[i + 1][0] - points[i][0]));
  const m: number[] = points.map((_, i) => {
    if (i === 0) return slope[0];
    if (i === n - 1) return slope[n - 2];
    return slope[i - 1] * slope[i] <= 0 ? 0 : (slope[i - 1] + slope[i]) / 2;
  });
  for (let i = 0; i < n - 1; i++) {
    if (slope[i] === 0) {
      m[i] = 0;
      m[i + 1] = 0;
      continue;
    }
    const a = m[i] / slope[i];
    const b = m[i + 1] / slope[i];
    const s = a * a + b * b;
    if (s > 9) {
      const t = 3 / Math.sqrt(s);
      m[i] = t * a * slope[i];
      m[i + 1] = t * b * slope[i];
    }
  }
  let d = `M${points[0][0]} ${points[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const [xa, ya] = points[i];
    const [xb, yb] = points[i + 1];
    const h = (xb - xa) / 3;
    d += ` C${(xa + h).toFixed(1)} ${(ya + m[i] * h).toFixed(1)} ${(xb - h).toFixed(1)} ${(yb - m[i + 1] * h).toFixed(1)} ${xb} ${yb}`;
  }
  return d;
}

function niceStep(max: number): number {
  if (max > 450) return 100;
  if (max > 200) return 50;
  if (max > 80) return 25;
  if (max > 30) return 10;
  return 5;
}

const round1 = (n: number) => Math.round(n * 10) / 10;

export default function PointsEvolutionChart({
  columns: allColumns,
  series: rawSeries,
  mode,
  plotHeight,
}: {
  columns: PointsGridColumn[];
  series: EvolutionSeriesInput[];
  mode: EvolutionMode;
  // The height the rows should fill, so a card's Drivers and Teams views
  // come out the same size; rows grow (up to a cap) to fill it.
  plotHeight?: number;
}) {
  const n = rawSeries.length;
  // A race that is on the calendar but has no results yet (the data job
  // has not run since) would only repeat the previous standings: leave it
  // off until its results arrive.
  let rounds = allColumns.length;
  while (rounds > 0 && rawSeries.every((s) => s.pointsByRound[rounds - 1] == null)) rounds--;
  const columns = allColumns.slice(0, rounds);
  if (n === 0 || rounds === 0) return <div className="evo-chart" style={{ width: WIDTH }} />;

  const seenGroup = new Set<string>();
  const series = rawSeries.map((s, idx) => {
    let total = 0;
    const cumulative = s.pointsByRound.slice(0, rounds).map((p) => (total += p ?? 0));
    const firstRaced = s.pointsByRound.findIndex((p) => p !== null);
    const first = firstRaced < 0 || firstRaced >= rounds ? rounds - 1 : firstRaced;
    const second = s.group !== undefined && seenGroup.has(s.group);
    if (s.group !== undefined) seenGroup.add(s.group);
    return { ...s, idx, cumulative, total, first, second };
  });

  const rowH = Math.min(MAX_ROW_H, Math.max(ROW_H, (plotHeight ?? 0) / n));
  const height = HEAD_H + n * rowH + PAD_BOTTOM;
  const rowY = (k: number) => HEAD_H + k * rowH + rowH / 2;

  const isPlace = mode === "place";
  const x0 = isPlace ? 150 : 64;
  const x1 = isPlace ? 945 : 925;
  const x = (i: number) => (rounds === 1 ? (x0 + x1) / 2 : round1(x0 + (i * (x1 - x0)) / (rounds - 1)));
  const pillX = x1 + (isPlace ? 42 : 46);

  // Place after each round: by points, ties in final standings order;
  // anyone yet to race sits below everyone who has.
  const place: number[][] = series.map(() => []);
  if (isPlace) {
    for (let i = 0; i < rounds; i++) {
      const order = series
        .map((s) => s.idx)
        .sort((a, b) => {
          const sa = series[a].first <= i;
          const sb = series[b].first <= i;
          if (sa !== sb) return sa ? -1 : 1;
          return series[b].cumulative[i] - series[a].cumulative[i] || a - b;
        });
      order.forEach((id, p) => (place[id][i] = p));
    }
  }

  // Points scale.
  const max = Math.max(1, ...series.map((s) => s.total));
  const step = niceStep(max);
  const top = Math.ceil(max / step) * step;
  const yBase = height - 22;
  const yTop = HEAD_H + rowH / 2;
  const yValue = (v: number) => round1(yBase - (v / top) * (yBase - yTop));
  const ticks: number[] = [];
  for (let v = 0; v <= top; v += step) ticks.push(v);

  const gridTop = HEAD_H - 6;
  const gridBottom = isPlace ? height - PAD_BOTTOM : yBase;

  // Lower places first, so the leaders' lines sit on top.
  const drawOrder = [...series].reverse();

  return (
    <div className="evo-chart" style={{ position: "relative", width: WIDTH, height }}>
      <svg width={WIDTH} height={height} role="img" aria-label={isPlace ? "Championship place after each race" : "Running points total after each race"}>
        {/* Bands: one per place, or one per step of the points scale. */}
        {isPlace
          ? series.map((_, p) =>
              p % 2 === 0 ? (
                <rect key={p} x={8} y={HEAD_H + p * rowH} width={WIDTH - 16} height={rowH} rx={6} fill="var(--surface-1)" />
              ) : null
            )
          : ticks.slice(0, -1).map((v, b) =>
              b % 2 === 0 ? (
                <rect
                  key={v}
                  x={x0 - 14}
                  y={yValue(v + step)}
                  width={x1 - x0 + 28}
                  height={yValue(v) - yValue(v + step)}
                  rx={6}
                  fill="var(--surface-1)"
                />
              ) : null
            )}

        {/* Subtle grid: a line down from every race, and across at every
            step of the points scale, so a dot can be traced to its race
            and its value. */}
        {columns.map((col, i) => (
          <line key={col.round} x1={x(i)} x2={x(i)} y1={gridTop} y2={gridBottom} stroke="var(--gridline)" strokeWidth={1} />
        ))}
        {!isPlace &&
          ticks.map((v) => (
            <line key={v} x1={x0 - 14} x2={x1 + 14} y1={yValue(v)} y2={yValue(v)} stroke="var(--gridline)" strokeWidth={1} />
          ))}

        {/* Race abbreviations and sprint bars; the flags are HTML, below. */}
        {columns.map((col, i) => (
          <g key={col.round}>
            <text x={x(i)} y={35} textAnchor="middle" fontSize={10.5} fontWeight={700} fill="var(--text-secondary)">
              {col.abbreviation}
            </text>
            {col.hasSprint && <rect x={x(i) - 11} y={40} width={22} height={2.5} rx={1.25} fill="var(--accent)" />}
          </g>
        ))}

        {/* Scale labels down the left: places, or points. */}
        {isPlace
          ? series.map((_, p) => (
              <text key={p} x={34} y={rowY(p)} dy="0.34em" textAnchor="end" fontSize={11.5} fill="var(--text-muted)">
                {p + 1}
              </text>
            ))
          : ticks.map((v) => (
              <text key={v} x={x0 - 22} y={yValue(v)} dy="0.34em" textAnchor="end" fontSize={11.5} fill="var(--text-muted)">
                {v}
              </text>
            ))}

        {drawOrder.map((s) => {
          const points: [number, number][] = [];
          for (let i = s.first; i < rounds; i++) points.push([x(i), isPlace ? rowY(place[s.idx][i]) : yValue(s.cumulative[i])]);
          const d = points.length > 1 ? (isPlace ? stepPath(points) : curvePath(points)) : null;
          const [startX, startY] = points[0];
          const [endX, endY] = points[points.length - 1];
          const endRow = isPlace ? place[s.idx][rounds - 1] : s.idx;
          const pillY = rowY(endRow);
          return (
            <g key={s.id}>
              {/* Points view: the name pills are evenly spaced by rank, so a
                  thin line in the team colour joins each line's end to its pill. */}
              {!isPlace && (
                <path
                  d={`M${endX + 6} ${endY} C${endX + 28} ${endY} ${pillX - 24} ${pillY} ${pillX - 2} ${pillY}`}
                  fill="none"
                  stroke={s.color}
                  strokeWidth={1.25}
                  strokeOpacity={0.7}
                />
              )}
              {d && (
                <>
                  {/* A halo in the card colour keeps crossing lines apart. */}
                  <path d={d} fill="none" stroke="var(--surface-2)" strokeWidth={6} strokeLinecap="round" />
                  <path
                    d={d}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={2.75}
                    strokeLinecap="round"
                    strokeDasharray={s.second ? "7 5" : undefined}
                  />
                </>
              )}
              {points.map(([px, py], j) => (
                <circle
                  key={j}
                  cx={px}
                  cy={py}
                  r={j === points.length - 1 ? 4.5 : 3}
                  fill={s.color}
                  stroke="var(--surface-2)"
                  strokeWidth={1.25}
                />
              ))}

              {/* Place view: a name where each line starts. */}
              {isPlace &&
                (s.first === 0 ? (
                  <>
                    <rect x={x0 - 88} y={startY - PILL_H / 2} width={66} height={PILL_H} rx={PILL_H / 2} fill={s.color} fillOpacity={0.18} />
                    <circle cx={x0 - 76} cy={startY} r={3.5} fill={s.color} />
                    <text x={x0 - 66} y={startY} dy="0.34em" fontSize={11.5} fontWeight={700} fill="var(--text-primary)">
                      {s.code}
                    </text>
                  </>
                ) : (
                  <text
                    x={startX - 9}
                    y={startY}
                    dy="0.34em"
                    textAnchor="end"
                    fontSize={10.5}
                    fontWeight={700}
                    fill="var(--text-secondary)"
                    stroke="var(--surface-2)"
                    strokeWidth={3}
                    paintOrder="stroke"
                  >
                    {s.code}
                  </text>
                ))}

              {/* The name pill at the right: code and season total. */}
              <rect x={pillX} y={pillY - PILL_H / 2} width={PILL_W} height={PILL_H} rx={PILL_H / 2} fill={s.color} fillOpacity={0.18} />
              <circle cx={pillX + 12} cy={pillY} r={3.5} fill={s.color} />
              <text x={pillX + 22} y={pillY} dy="0.34em" fontSize={11.5} fontWeight={700} fill="var(--text-primary)">
                {s.code}
              </text>
              <text x={pillX + 108} y={pillY} dy="0.34em" textAnchor="end" fontSize={11.5} fontWeight={700} fill="var(--text-primary)">
                {s.total}
              </text>
              {isPlace ? (
                <text x={pillX - 8} y={pillY} dy="0.34em" textAnchor="end" fontSize={11.5} fill="var(--text-muted)">
                  {endRow + 1}
                </text>
              ) : (
                <text x={pillX + 142} y={pillY} dy="0.34em" textAnchor="end" fontSize={11.5} fill="var(--text-muted)">
                  {endRow + 1}
                </text>
              )}
            </g>
          );
        })}
      </svg>

      {columns.map((col, i) =>
        col.flagIso ? (
          <span
            key={col.round}
            className={`fi fi-${col.flagIso} round-flag`}
            style={{ position: "absolute", left: x(i) - 11, top: 6, width: 22, height: 15 }}
          />
        ) : null
      )}
    </div>
  );
}
