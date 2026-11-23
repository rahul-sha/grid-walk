import { currentSeason, parseSeason, resolvePersistedSeason } from "@/lib/seasons";
import { readSnapshotManifest, resolvePersistedVariant } from "@/lib/card-snapshots";
import { buildRecapData } from "@/lib/recap";
import { getSiteStats } from "@/lib/site-stats";
import { cookies } from "next/headers";
import DeskView from "@/components/desk/DeskView";
import CarouselView from "@/components/gridwalk/CarouselView";
import { VIEW_COOKIE, normaliseView } from "@/lib/variant-constants";

// Grid Walk's home page, in one of two views, chosen with the view switch
// in the bottom island and kept in a cookie: the carousel (the default),
// or the table, where the cards lie in labelled rows on one zoomable,
// pannable table with an overview in the corner.
export default async function Home({ searchParams }: { searchParams: Promise<{ season?: string }> }) {
  const params = await searchParams;
  const view = normaliseView((await cookies()).get(VIEW_COOKIE)?.value);
  if (view === "carousel") return <CarouselView params={{ season: params.season }} />;
  const year = parseSeason(params.season) ?? (await resolvePersistedSeason()) ?? currentSeason();
  const [variant, recap] = await Promise.all([
    resolvePersistedVariant(),
    // The Latest Race card always shows the current season, whichever
    // season is on the table.
    buildRecapData(currentSeason()),
  ]);
  const manifest = readSnapshotManifest(year);
  // Keyed on the year so a season change remounts the table and re-measures
  // every sheet for that season's images.
  return <DeskView key={year} year={year} sizes={manifest?.sizes ?? null} snapshotVersion={manifest?.capturedAt ?? null} recap={recap} stats={getSiteStats()} initialVariant={variant} />;
}
