"use client";

import { useLayoutEffect, useMemo, useRef, useState } from "react";
import type { PointsGridColumn } from "@/lib/points-grid";
import { useTooltip, useDragPan, Tooltip } from "./PointsHeatmap";

export interface EvolutionSeriesInput {
  id: string;
  label: string;
  code: string;
  color: string;
  pointsByRound: (number | null)[];
}

const PAD_LEFT = 20;
const PAD_TOP = 14;
const PAD_BOTTOM = 14;
const FLAG_ROW_HEIGHT = 24;
const AREA_OPACITY = 0.14;

// The plot's width stretches to fill whatever space is actually available
// next to the bubble column (see useAvailableWidth below) rather than
// using a fixed per-round pixel width — that fixed width is what left a
// big empty gap between the plotted lines and the points column on a wide
// screen. Below this floor (many rounds on a narrow phone), spacing stays
// at the floor and the plot scrolls horizontally instead of cramming.
const MIN_ROUND_WIDTH = 22;
const FALLBACK_ROUND_WIDTH = 36;

// The end-of-line totals column, outside the horizontal scroller so it
// keeps showing the latest standings even when the plot itself is
// scrolled back to an earlier round. Every series gets a row — the chart
// grows tall enough to fit all of them (see chartHeight below) rather
// than cropping the field to whatever a fixed height could show.
const BUBBLE_COL_WIDTH = 104;
const BUBBLE_WIDTH = 92;
const BUBBLE_HEIGHT = 22;
const BUBBLE_FILL_OPACITY = 0.16;
const BUBBLE_ROW_SPACING = 26;
const MIN_CHART_HEIGHT = 160;

function computeAxisMax(maxValue: number): number {
  // Headroom only — there's no numeric y-axis to round a "nice number" to.
  return Math.max(1, maxValue) * 1.08;
}

// Measures the row's own rendered width so the plot can be sized to fill
// it exactly, instead of a fixed pixel-per-round width that leaves a gap
// on a wide screen or overflows a narrow one.
function useAvailableWidth<T extends HTMLElement>() {
  const ref = useRef<T>(null);
  const [width, setWidth] = useState<number | null>(null);

  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const update = () => setWidth(el.clientWidth);
    update();
    const observer = new ResizeObserver(update);
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return { ref, width };
}

// A smooth curve through the given points (Catmull-Rom converted to
// cubic Bezier segments) instead of straight point-to-point lines.
function smoothPath(points: { x: number; y: number }[]): string {
  if (points.length === 0) return "";
  if (points.length === 1) return `M ${points[0].x} ${points[0].y}`;
  let d = `M ${points[0].x} ${points[0].y}`;
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[i - 1] ?? points[i];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[i + 2] ?? p2;
    const cp1x = p1.x + (p2.x - p0.x) / 6;
    const cp1y = p1.y + (p2.y - p0.y) / 6;
    const cp2x = p2.x - (p3.x - p1.x) / 6;
    const cp2y = p2.y - (p3.y - p1.y) / 6;
    d += ` C ${cp1x} ${cp1y} ${cp2x} ${cp2y} ${p2.x} ${p2.y}`;
  }
  return d;
}

export default function PointsEvolutionChart({
  columns,
  series: rawSeries,
}: {
  columns: PointsGridColumn[];
  series: EvolutionSeriesInput[];
}) {
  const { tooltip, show, hide } = useTooltip();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragPan = useDragPan(scrollerRef);
  const { ref: rowRef, width: rowWidth } = useAvailableWidth<HTMLDivElement>();

  const series = useMemo(
    () =>
      rawSeries.map((s) => {
        let total = 0;
        const cumulative = s.pointsByRound.map((points) => {
          total += points ?? 0;
          return total;
        });
        return { ...s, cumulative };
      }),
    [rawSeries]
  );

  const maxCumulative = Math.max(1, ...series.map((s) => s.cumulative[s.cumulative.length - 1] ?? 0));
  const axisMax = computeAxisMax(maxCumulative);

  // Tall enough for every series to get its own, clearly separate bubble
  // row — the whole field, not just whoever fits a fixed height.
  const chartHeight = Math.max(
    MIN_CHART_HEIGHT,
    PAD_TOP + PAD_BOTTOM + BUBBLE_HEIGHT + Math.max(0, series.length - 1) * BUBBLE_ROW_SPACING
  );
  const plotHeight = chartHeight - PAD_TOP - PAD_BOTTOM;

  const roundCount = Math.max(1, columns.length - 1);
  const availableForPlot = rowWidth != null ? Math.max(0, rowWidth - BUBBLE_COL_WIDTH) : null;
  const idealRoundWidth = availableForPlot != null ? (availableForPlot - PAD_LEFT) / roundCount : FALLBACK_ROUND_WIDTH;
  const roundWidth = Math.max(MIN_ROUND_WIDTH, idealRoundWidth);
  const plotWidth = roundCount * roundWidth + PAD_LEFT;

  const x = (roundIndex: number) => PAD_LEFT / 2 + roundIndex * roundWidth;
  const y = (value: number) => PAD_TOP + plotHeight - (value / axisMax) * plotHeight;

  // Draw the strongest season so far on top, so a tight leading battle
  // doesn't get visually buried under the midfield lines beneath it.
  const drawOrder = [...series].sort(
    (a, b) => (a.cumulative[a.cumulative.length - 1] ?? 0) - (b.cumulative[b.cumulative.length - 1] ?? 0)
  );

  // End-of-line totals, one evenly-spaced row per series ranked by value —
  // every driver/team gets a bubble, with a dotted leader line back to
  // where its line actually ends whenever rank order and value spacing
  // don't line up exactly (common once the field is bunched together).
  const bubbleTopY = PAD_TOP + BUBBLE_HEIGHT / 2;
  const bubbles = useMemo(() => {
    const byValueDesc = [...series].sort(
      (a, b) => (b.cumulative[b.cumulative.length - 1] ?? 0) - (a.cumulative[a.cumulative.length - 1] ?? 0)
    );
    return byValueDesc.map((s, idx) => {
      const value = s.cumulative[s.cumulative.length - 1] ?? 0;
      return {
        id: s.id,
        code: s.code,
        color: s.color,
        value,
        lineY: y(value),
        bubbleY: bubbleTopY + idx * BUBBLE_ROW_SPACING,
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps -- y() is a pure function of axisMax/chartHeight, already deps
  }, [series, axisMax, chartHeight, bubbleTopY]);

  // One hover listener over the whole plot instead of an invisible hit
  // circle on every point (every driver/constructor × every round) — that
  // used to add hundreds of extra SVG shapes to this chart alone, which
  // got expensive to repaint as Grid Walk scales the card in and out.
  // Finds the nearest round from the pointer's x, then whichever series'
  // point is closest to its y, same result as the old per-point targets.
  function handlePlotHover(e: React.MouseEvent<SVGRectElement>) {
    const svg = e.currentTarget.ownerSVGElement;
    const rect = svg?.getBoundingClientRect();
    if (!rect || rect.width === 0 || rect.height === 0) return;
    const scaleX = plotWidth / rect.width;
    const scaleY = chartHeight / rect.height;
    const mx = (e.clientX - rect.left) * scaleX;
    const my = (e.clientY - rect.top) * scaleY;
    const roundIndex = Math.max(0, Math.min(roundCount, Math.round((mx - PAD_LEFT / 2) / roundWidth)));

    let bestSeries: EvolutionSeriesInput | null = null;
    let bestValue = 0;
    let bestDist = Infinity;
    for (const s of series) {
      const value = s.cumulative[roundIndex];
      if (value == null) continue;
      const dist = Math.abs(y(value) - my);
      if (dist < bestDist) {
        bestDist = dist;
        bestSeries = s;
        bestValue = value;
      }
    }
    if (!bestSeries || bestDist > 24) {
      hide();
      return;
    }
    const col = columns[roundIndex];
    show(
      e,
      <>
        <div className="heatmap-tooltip-title">{bestSeries.label}</div>
        <div className="heatmap-tooltip-row">
          <span>Round {col.round}</span>
          <b>{col.abbreviation}</b>
        </div>
        <div className="heatmap-tooltip-row">
          <span>Cumulative points</span>
          <b>{bestValue}</b>
        </div>
      </>
    );
  }

  return (
    <div className="table-card">
      <div className="flex" ref={rowRef}>
        <div className="overflow-x-auto min-w-0" ref={scrollerRef} {...dragPan}>
          <svg width={plotWidth} height={chartHeight}>
            <line
              x1={0}
              x2={plotWidth}
              y1={y(0)}
              y2={y(0)}
              stroke="var(--baseline)"
              strokeWidth={1}
              strokeDasharray="2 3"
            />

            {drawOrder.map((s) => {
              const points = s.cumulative.map((value, i) => ({ x: x(i), y: y(value) }));
              const lineD = smoothPath(points);
              const baseline = y(0);
              const lastPointX = x(s.cumulative.length - 1);
              const areaD = `${lineD} L ${lastPointX} ${baseline} L ${x(0)} ${baseline} Z`;
              return (
                <g key={s.id}>
                  {/* Material 3 tonal fill — a soft wash of the line's own
                      colour under it, the same "tonal container" idea used
                      for surfaces elsewhere in the app, not just a bare
                      stroke on a blank plot. */}
                  <path d={areaD} fill={s.color} fillOpacity={AREA_OPACITY} stroke="none" />
                  <path
                    d={lineD}
                    fill="none"
                    stroke={s.color}
                    strokeWidth={3}
                    strokeLinejoin="round"
                    strokeLinecap="round"
                  />
                </g>
              );
            })}

            {drawOrder.map((s) =>
              s.cumulative.map((value, i) => (
                <circle
                  key={`${s.id}-${i}-dot`}
                  cx={x(i)}
                  cy={y(value)}
                  r={i === s.cumulative.length - 1 ? 4.5 : 2.5}
                  fill={s.color}
                />
              ))
            )}

            <rect
              x={0}
              y={0}
              width={plotWidth}
              height={chartHeight}
              fill="transparent"
              onMouseMove={handlePlotHover}
              onMouseLeave={hide}
            />
          </svg>

          <div style={{ position: "relative", width: plotWidth, height: FLAG_ROW_HEIGHT }}>
            {columns.map((col, idx) =>
              col.flagIso ? (
                <span
                  key={col.round}
                  className={`fi fi-${col.flagIso} round-flag`}
                  style={{ position: "absolute", left: x(idx) - 11, top: 2 }}
                  onMouseEnter={(e) =>
                    show(
                      e,
                      <div className="heatmap-tooltip-title">
                        Round {col.round} &middot; {col.raceName}
                      </div>
                    )
                  }
                  onMouseLeave={hide}
                />
              ) : null
            )}
          </div>
        </div>

        <svg width={BUBBLE_COL_WIDTH} height={chartHeight} className="shrink-0" style={{ overflow: "visible" }}>
          {bubbles.map((b) => {
            return (
              <g key={b.id}>
                {/* Every bubble gets a leader line back to its own colour, not
                    just the ones whose rank order nudges them off their line's
                    actual value — a line that happens to land exactly on its
                    row's y still reads as "connected to this bubble" rather
                    than stopping dead at the plot's edge. Drawn in the
                    series' own colour (was a flat muted grey) so a bunched
                    field of close values stays traceable to the right name
                    instead of blurring into one grey smudge. */}
                <line
                  x1={-8}
                  y1={b.lineY}
                  x2={10}
                  y2={b.bubbleY}
                  stroke={b.color}
                  strokeWidth={1.25}
                  strokeOpacity={0.6}
                  strokeDasharray="1.5 2.5"
                />
                <rect
                  x={10}
                  y={b.bubbleY - BUBBLE_HEIGHT / 2}
                  width={BUBBLE_WIDTH}
                  height={BUBBLE_HEIGHT}
                  rx={BUBBLE_HEIGHT / 2}
                  fill={b.color}
                  fillOpacity={BUBBLE_FILL_OPACITY}
                />
                <circle cx={22} cy={b.bubbleY} r={3.5} fill={b.color} />
                <text
                  x={31}
                  y={b.bubbleY}
                  dy="0.32em"
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--text-secondary)"
                >
                  {b.code}
                </text>
                <text
                  x={92}
                  y={b.bubbleY}
                  dy="0.32em"
                  textAnchor="end"
                  fontSize={11}
                  fontWeight={700}
                  fill="var(--text-primary)"
                >
                  {b.value}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
      <Tooltip tooltip={tooltip} />
    </div>
  );
}
