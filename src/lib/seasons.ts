import { cookies } from "next/headers";
import { SEASON_COOKIE, currentSeason, availableSeasons, parseSeason } from "./season-constants";

export { currentSeason, availableSeasons, parseSeason };

// The season selector lives in the global nav bar, so a season picked on
// one page needs to carry over when navigating to another without a
// ?season= of its own (e.g. clicking "Positions" from Results). The nav
// bar sets this cookie on every pick; pages fall back to it when their own
// URL doesn't specify a season.
export async function resolvePersistedSeason(): Promise<number | null> {
  const store = await cookies();
  const raw = store.get(SEASON_COOKIE)?.value;
  const year = raw ? Number(raw) : NaN;
  return Number.isFinite(year) && availableSeasons().includes(year) ? year : null;
}
