import { currentSeason, resolvePersistedSeason } from "@/lib/seasons";
import { readSnapshotManifest, resolvePersistedVariant } from "@/lib/card-snapshots";
import { buildRecapData } from "@/lib/recap";
import DeskView from "@/components/desk/DeskView";

// Experimental alternate presentation: the current season's cards laid out
// neatly in labelled rows on one zoomable, pannable table, with an overview
// in the corner. A preview to react to — not linked from the main nav,
// reachable only at /desk.
export default async function DeskPage({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const params = await searchParams;
  const year = Number(params.season) || (await resolvePersistedSeason()) || currentSeason();
  const [variant, recap] = await Promise.all([
    resolvePersistedVariant(),
    year === currentSeason() ? buildRecapData(year) : Promise.resolve(null),
  ]);
  const manifest = readSnapshotManifest(year);
  // Keyed on the year so a season change remounts the table and re-measures
  // every sheet for that season's images.
  return <DeskView key={year} year={year} sizes={manifest?.sizes ?? null} recap={recap} initialVariant={variant} />;
}
