"use server";

import { fetchRaceRecap, type LastRaceRecap } from "@/lib/recap";

// Called from the race-picker strip in RecapCard (a client component) when
// a race it doesn't already have cached is selected — see
// "grid-walk-race-picker" memory for why this is a lazy per-race fetch
// rather than building all 23 rounds on every page load.
export async function getRaceRecap(season: number, round: number): Promise<LastRaceRecap | null> {
  return fetchRaceRecap(season, round);
}
