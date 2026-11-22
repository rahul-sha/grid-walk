"use server";

import { fetchRaceRecap, type LastRaceRecap } from "@/lib/recap";
import { parseSeason } from "@/lib/season-constants";

// Called from the race-picker strip in RecapCard (a client component) when
// a race it doesn't already have cached is selected — see
// "grid-walk-race-picker" memory for why this is a lazy per-race fetch
// rather than building all 23 rounds on every page load.
// A server action can be called with any arguments, not only the ones the
// card sends, so both are checked before they reach a file or the live API.
export async function getRaceRecap(season: unknown, round: unknown): Promise<LastRaceRecap | null> {
  const year = parseSeason(season);
  if (year === null || typeof round !== "number" || !Number.isInteger(round) || round < 1 || round > 30) return null;
  return fetchRaceRecap(year, round);
}
