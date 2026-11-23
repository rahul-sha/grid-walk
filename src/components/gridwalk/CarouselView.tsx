import { buildPointsGrid } from "@/lib/points-grid";
import { buildConstructorPointsGrid } from "@/lib/constructor-points-grid";
import { buildFinishPositionSummary } from "@/lib/finish-positions";
import { buildQualifyingPositionSummary } from "@/lib/qualifying-positions";
import { currentSeason, parseSeason, resolvePersistedSeason } from "@/lib/seasons";
import { readSnapshotManifest, resolvePersistedVariant } from "@/lib/card-snapshots";
import { buildRecapData } from "@/lib/recap";
import { getSiteStats } from "@/lib/site-stats";
import GridWalk, { type GridWalkData } from "./GridWalk";

// The carousel: the season's cards in one horizontal strip. It is the home
// page's default view (the table is the other), and also lives at
// /carousel, where the snapshot capture script photographs its cards.
export default async function CarouselView({ params }: { params: { season?: string; noSnapshot?: string } }) {
  const season = parseSeason(params.season) ?? (await resolvePersistedSeason()) ?? currentSeason();

  // Visitors only ever get the pre-rendered card images, so the season's
  // data grids are neither built nor sent to the browser. The one
  // exception is capture mode (?noSnapshot=1), used by
  // scripts/capture-card-snapshots.mjs to render the cards live so it can
  // photograph them — the only place live rendering still happens. The
  // capture script runs its own local server, never Vercel, so on Vercel
  // (VERCEL=1) the flag is ignored and visitors cannot force live rendering.
  const captureMode = params.noSnapshot === "1" && process.env.VERCEL !== "1";
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
    // The Latest Race drop-down always shows the current season.
    buildRecapData(currentSeason()),
  ]);

  return (
    <GridWalk
      season={season}
      live={live}
      sizes={manifest?.sizes ?? null}
      snapshotVersion={manifest?.capturedAt ?? null}
      initialVariant={variant}
      recap={recap}
      stats={getSiteStats()}
    />
  );
}
