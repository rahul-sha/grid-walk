import { currentSeason, resolvePersistedSeason } from "@/lib/seasons";
import { readSnapshotManifest, resolvePersistedVariant } from "@/lib/card-snapshots";
import { buildRecapData } from "@/lib/recap";
import DeskView from "@/components/desk/DeskView";

// Grid Walk's home page: the season's cards laid out neatly in labelled
// rows on one zoomable, pannable table, with an overview in the corner.
// The previous presentation, the horizontal carousel, is kept at /carousel.
export default async function Home({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const params = await searchParams;
  const year = Number(params.season) || (await resolvePersistedSeason()) || currentSeason();
  const [variant, recap] = await Promise.all([
    resolvePersistedVariant(),
    // The Latest Race card always shows the current season, whichever
    // season is on the table.
    buildRecapData(currentSeason()),
  ]);
  const manifest = readSnapshotManifest(year);
  // Keyed on the year so a season change remounts the table and re-measures
  // every sheet for that season's images.
  return <DeskView key={year} year={year} sizes={manifest?.sizes ?? null} recap={recap} initialVariant={variant} />;
}
