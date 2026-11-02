import { currentSeason } from "@/lib/seasons";
import { readSnapshotManifest, resolvePersistedVariant } from "@/lib/card-snapshots";
import { buildRecapData } from "@/lib/recap";
import DeskView from "@/components/desk/DeskView";

// Experimental alternate presentation: the current season's cards left
// lying on a desk like loose sheets of paper. Any sheet can be pushed
// around, the desk zooms and pans, and "Clean table" lays them all out in
// view. A preview to react to — not linked from the main nav, reachable
// only at /desk.
export default async function DeskPage() {
  const year = currentSeason();
  const [variant, recap] = await Promise.all([resolvePersistedVariant(), buildRecapData(year)]);
  const manifest = readSnapshotManifest(year);
  return <DeskView year={year} sizes={manifest?.sizes ?? null} recap={recap} initialVariant={variant} />;
}
