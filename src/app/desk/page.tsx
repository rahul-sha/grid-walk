import { currentSeason } from "@/lib/seasons";
import { readSnapshotManifest, resolvePersistedVariant } from "@/lib/card-snapshots";
import { buildRecapData } from "@/lib/recap";
import DeskView from "@/components/desk/DeskView";

// Experimental alternate presentation: the current season's cards laid out
// neatly in labelled rows on one zoomable, pannable table, with an overview
// in the corner. A preview to react to — not linked from the main nav,
// reachable only at /desk.
export default async function DeskPage() {
  const year = currentSeason();
  const [variant, recap] = await Promise.all([resolvePersistedVariant(), buildRecapData(year)]);
  const manifest = readSnapshotManifest(year);
  return <DeskView year={year} sizes={manifest?.sizes ?? null} recap={recap} initialVariant={variant} />;
}
