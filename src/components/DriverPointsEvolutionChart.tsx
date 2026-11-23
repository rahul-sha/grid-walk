import type { PointsGrid } from "@/lib/points-grid";
import PointsEvolutionChart, { type EvolutionMode } from "./PointsEvolutionChart";

export default function DriverPointsEvolutionChart({
  grid,
  mode,
  plotHeight,
}: {
  grid: PointsGrid;
  mode: EvolutionMode;
  plotHeight?: number;
}) {
  const series = grid.rows.map((row) => ({
    id: row.driverId,
    code: row.code,
    color: row.color,
    group: row.constructorId,
    pointsByRound: row.pointsByRound.map((cell) => (cell ? cell.points : null)),
  }));

  return <PointsEvolutionChart columns={grid.columns} series={series} mode={mode} plotHeight={plotHeight} />;
}
