import { currentSeason } from "@/lib/seasons";
import { readSnapshotManifest, resolvePersistedVariant } from "@/lib/card-snapshots";
import { buildRecapData } from "@/lib/recap";
import CanvasView, { type SeasonBundle } from "@/components/canvas/CanvasView";

// Experimental alternate presentation: every season's cards laid out as one
// pannable/zoomable canvas with a minimap, instead of Grid Walk's one-card
// carousel. A preview for Rahul to react to — see "grid-walk-infinite-canvas-mockup"
// memory for the approved mock-up this is built from. Not linked from the
// main nav; reachable only at /canvas.
export default async function CanvasPage() {
  const latest = currentSeason();
  const years = [latest - 2, latest - 1, latest];

  const [variant, ...rest] = await Promise.all([
    resolvePersistedVariant(),
    ...years.map(async (year) => {
      const manifest = readSnapshotManifest(year);
      const recap = year === latest ? await buildRecapData(year) : null;
      return { year, sizes: manifest?.sizes ?? null, recap } satisfies SeasonBundle;
    }),
  ]);

  return <CanvasView seasons={rest} currentSeason={latest} initialVariant={variant} />;
}
