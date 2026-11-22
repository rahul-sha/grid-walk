import { availableSeasons } from "./season-constants";
import { loadSeasonSnapshot } from "./season-snapshot";

// The About card's live numbers, worked out from the season files on the
// server, so they move on their own as each race weekend's data lands.
export interface SiteStats {
  firstSeason: number;
  lastSeason: number;
  seasons: number;
  races: number;
  drivers: number;
}

export function getSiteStats(): SiteStats {
  const years = availableSeasons();
  let races = 0;
  const drivers = new Set<string>();
  for (const year of years) {
    const snapshot = loadSeasonSnapshot(year);
    if (!snapshot) continue;
    for (const results of Object.values(snapshot.results)) {
      if (!results.length) continue;
      races += 1;
      for (const r of results) drivers.add(r.Driver.driverId);
    }
  }
  return {
    firstSeason: Math.min(...years),
    lastSeason: Math.max(...years),
    seasons: years.length,
    races,
    drivers: drivers.size,
  };
}
