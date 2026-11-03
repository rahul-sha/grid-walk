"use client";

import { useEffect, useRef } from "react";
import type { PointsCell, PointsGrid } from "@/lib/points-grid";
import { RoundHeader, Tooltip, useDragPan, useTooltip } from "./PointsHeatmap";

const CELL = "w-9 h-8 min-w-9 sm:w-11 sm:h-9 sm:min-w-11 text-center text-[11px] sm:text-xs font-medium tabular-nums";

// Places gained from the grid to the flag; null when there is nothing to
// compare (no finishing place, or a pit-lane start with no grid slot).
function gained(cell: PointsCell | null): number | null {
  if (!cell || cell.position === null || !/^\d+$/.test(cell.position)) return null;
  if (!cell.grid) return null;
  return cell.grid - Number(cell.position);
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid];
}

// A hidden "+" in front of zero keeps its digits in line with the signed
// values above and below it.
function Signed({ value, digits }: { value: number; digits: number }) {
  const text = Math.abs(value).toFixed(digits);
  if (value > 0) return <>+{text}</>;
  if (value < 0) return <>&minus;{text}</>;
  return (
    <>
      <span className="invisible">+</span>
      {text}
    </>
  );
}

function GainedCell({
  cell,
  driverName,
  constructorName,
  onEnter,
  onLeave,
}: {
  cell: PointsCell | null;
  driverName: string;
  constructorName: string;
  onEnter: (e: React.MouseEvent<HTMLElement>, content: React.ReactNode) => void;
  onLeave: () => void;
}) {
  if (cell === null || cell.position === null) return <td className="w-9 h-8 min-w-9 sm:w-11 sm:h-9 sm:min-w-11" />;
  const value = gained(cell);
  const content = (
    <>
      <div className="heatmap-tooltip-title">
        {driverName} ({constructorName})
      </div>
      <div className="heatmap-tooltip-row">
        <span>Grid</span>
        <b>{cell.grid ? `P${cell.grid}` : "Pit lane"}</b>
      </div>
      <div className="heatmap-tooltip-row">
        <span>Finish</span>
        <b>{value !== null ? `P${cell.position}` : cell.status ?? cell.position ?? "—"}</b>
      </div>
    </>
  );
  const hover = { onMouseEnter: (e: React.MouseEvent<HTMLElement>) => onEnter(e, content), onMouseLeave: onLeave };

  if (value === null) {
    return (
      <td className={"heat-cell " + CELL} style={{ background: "var(--dnf-bg)", color: "var(--text-muted)" }} {...hover}>
        {/^\d+$/.test(cell.position) ? "PL" : cell.position}
      </td>
    );
  }
  let style: React.CSSProperties;
  if (value > 0) {
    // Every three places gained is one step darker on the heat ramp.
    const bucket = Math.min(6, 1 + Math.floor(value / 3));
    style = { background: `var(--heat-${bucket})`, color: bucket >= 4 ? "var(--heat-fg-hi)" : "var(--heat-fg-lo)" };
  } else if (value < 0) {
    // Places lost stay neutral (no red/green), deepening with the loss.
    const pct = Math.min(80, 22 + Math.abs(value) * 5);
    style = { background: `color-mix(in srgb, var(--text-muted) ${pct}%, var(--surface-2))`, color: "var(--text-primary)" };
  } else {
    style = { color: "var(--text-muted)" };
  }
  return (
    <td className={"heat-cell " + CELL} style={style} {...hover}>
      <Signed value={value} digits={0} />
    </td>
  );
}

export default function PositionsGainedGrid({ grid }: { grid: PointsGrid }) {
  const { tooltip, show, hide } = useTooltip();
  const scrollerRef = useRef<HTMLDivElement>(null);
  const dragPan = useDragPan(scrollerRef);

  useEffect(() => {
    const el = scrollerRef.current;
    if (!el) return;
    el.scrollLeft = el.scrollWidth - el.clientWidth;
  }, [grid]);

  return (
    <div className="table-card">
      <div className="overflow-x-auto" ref={scrollerRef} {...dragPan}>
        <table className="border-collapse">
          <thead>
            <tr>
              <th className="sticky left-0 z-10 min-w-[84px] sm:min-w-[180px] px-2 sm:px-3 py-2 text-left text-xs font-semibold" />
              {grid.columns.map((col) => (
                <RoundHeader
                  key={col.round}
                  round={col.round}
                  abbreviation={col.abbreviation}
                  raceName={col.raceName}
                  flagIso={col.flagIso}
                  date={col.date}
                  hasSprint={col.hasSprint}
                  onEnter={show}
                  onLeave={hide}
                />
              ))}
              <th className="sticky right-0 z-10 min-w-[112px] sm:min-w-[132px] px-2 sm:px-3 py-2 align-bottom text-xs font-semibold" style={{ color: "var(--text-primary)" }}>
                <div className="flex justify-center gap-3">
                  <span className="w-10 text-right">Avg</span>
                  <span className="w-12 text-right">Median</span>
                </div>
              </th>
            </tr>
          </thead>
          <tbody>
            {grid.rows.map((row) => {
              const values = row.pointsByRound.map(gained).filter((v): v is number => v !== null);
              const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : null;
              const med = median(values);
              return (
                <tr key={row.driverId}>
                  <td className="sticky left-0 z-10 px-2 sm:px-3 py-1.5 text-xs">
                    <div className="driver-cell">
                      <span className="driver-cell-position tabular-nums" style={{ color: "var(--text-muted)" }}>
                        {row.position}
                      </span>
                      <span className="inline-block h-2.5 w-2.5 shrink-0 rounded-sm" style={{ background: row.color }} />
                      <span className="font-semibold" style={{ color: "var(--text-primary)" }}>
                        {row.code}
                      </span>
                      <span className="driver-cell-team hidden truncate sm:inline" style={{ color: "var(--text-secondary)" }}>
                        {row.constructorName}
                      </span>
                    </div>
                  </td>
                  {row.pointsByRound.map((cell, idx) => (
                    <GainedCell
                      key={grid.columns[idx].round}
                      cell={cell}
                      driverName={row.name}
                      constructorName={row.constructorName}
                      onEnter={show}
                      onLeave={hide}
                    />
                  ))}
                  <td className="sticky right-0 z-10 px-2 sm:px-3 py-1.5">
                    <div className="flex justify-center gap-3 text-xs font-semibold tabular-nums">
                      <span className="w-10 text-right" style={{ color: "var(--text-primary)" }}>
                        {avg !== null ? <Signed value={avg} digits={1} /> : "—"}
                      </span>
                      <span className="w-12 text-right" style={{ color: "var(--text-secondary)" }}>
                        {med !== null ? <Signed value={med} digits={1} /> : "—"}
                      </span>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="legend">
        <span className="legend-chip">
          <span className="legend-swatch" style={{ background: "var(--heat-4)" }} />
          Places gained, darker is more
        </span>
        <span className="legend-chip">
          <span
            className="legend-swatch"
            style={{ background: "color-mix(in srgb, var(--text-muted) 50%, var(--surface-2))" }}
          />
          Places lost
        </span>
        <span className="legend-chip">R / W / D: did not finish · PL: pit-lane start · neither counted</span>
        <span className="legend-chip">Underlined races include a sprint</span>
      </div>
      <Tooltip tooltip={tooltip} />
    </div>
  );
}
