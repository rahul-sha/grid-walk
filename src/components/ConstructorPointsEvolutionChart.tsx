import type { ConstructorPointsGrid } from "@/lib/constructor-points-grid";
import PointsEvolutionChart, { type EvolutionMode } from "./PointsEvolutionChart";

// Constructors have no short code in the data (unlike drivers, which carry
// one from the API). These mirror the three-letter codes used in official
// F1 standings graphics.
const CONSTRUCTOR_CODES: Record<string, string> = {
  red_bull: "RBR",
  mclaren: "MCL",
  ferrari: "FER",
  mercedes: "MER",
  aston_martin: "AMR",
  alpine: "ALP",
  williams: "WIL",
  rb: "RB",
  alphatauri: "AT",
  toro_rosso: "STR",
  haas: "HAA",
  sauber: "SAU",
  kick_sauber: "SAU",
  alfa: "ARR",
  renault: "RNL",
  force_india: "FI",
  racing_point: "RPT",
  lotus_f1: "LOT",
};

function constructorCode(constructorId: string): string {
  return CONSTRUCTOR_CODES[constructorId] ?? constructorId.slice(0, 3).toUpperCase();
}

export default function ConstructorPointsEvolutionChart({
  grid,
  mode,
  plotHeight,
}: {
  grid: ConstructorPointsGrid;
  mode: EvolutionMode;
  plotHeight?: number;
}) {
  const series = grid.rows.map((row) => ({
    id: row.constructorId,
    code: constructorCode(row.constructorId),
    color: row.color,
    pointsByRound: row.pointsByRound.map((cell) => (cell ? cell.points : null)),
  }));

  return <PointsEvolutionChart columns={grid.columns} series={series} mode={mode} plotHeight={plotHeight} />;
}
