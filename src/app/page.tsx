import { buildPointsGrid } from "@/lib/points-grid";
import { buildConstructorPointsGrid } from "@/lib/constructor-points-grid";
import { buildFinishPositionSummary } from "@/lib/finish-positions";
import { buildQualifyingPositionSummary } from "@/lib/qualifying-positions";
import { currentSeason, resolvePersistedSeason } from "@/lib/seasons";
import { readSnapshotManifest, resolvePersistedVariant } from "@/lib/card-snapshots";
import { buildRecapData } from "@/lib/recap";
import GridWalk, { type GridWalkData } from "@/components/gridwalk/GridWalk";

export default async function Home({
  searchParams,
}: {
  searchParams: Promise<{ season?: string; noSnapshot?: string }>;
}) {
  const params = await searchParams;
  const season = Number(params.season) || (await resolvePersistedSeason()) || currentSeason();

  // Visitors only ever get the pre-rendered card images, so the season's
  // data grids are neither built nor sent to the browser. The one
  // exception is capture mode (?noSnapshot=1), used by
  // scripts/capture-card-snapshots.mjs to render the cards live so it can
  // photograph them — the only place live rendering still happens.
  const captureMode = params.noSnapshot === "1";
  let live: GridWalkData | null = null;
  if (captureMode) {
    const [pointsGrid, constructorGrid, finishSummary, qualifyingSummary] = await Promise.all([
      buildPointsGrid(season),
      buildConstructorPointsGrid(season),
      buildFinishPositionSummary(season),
      buildQualifyingPositionSummary(season),
    ]);
    live = { pointsGrid, constructorGrid, finishSummary, qualifyingSummary };
  }

  const [manifest, variant, recap] = await Promise.all([
    readSnapshotManifest(season),
    resolvePersistedVariant(),
    season === currentSeason() ? buildRecapData(season) : Promise.resolve(null),
  ]);

  return (
    <GridWalk
      season={season}
      live={live}
      sizes={manifest?.sizes ?? null}
      initialVariant={variant}
      recap={recap}
    />
  );
}
