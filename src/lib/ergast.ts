// Client for the Jolpica F1 API (https://api.jolpi.ca/ergast/f1), a community-run
// successor to the retired Ergast API that keeps the same response schema.
import { cache } from "react";
import { loadSeasonSnapshot } from "./season-snapshot";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";

const ONE_HOUR = 60 * 60;
const ONE_YEAR = 60 * 60 * 24 * 365;

// A season that has already finished never changes, so its schedule,
// standings and results cache for a year instead of re-fetching hourly —
// that's most of the API traffic this app makes. Only the in-progress
// current season needs a short revalidate window.
function revalidateFor(season: number): number {
  return season < new Date().getFullYear() ? ONE_YEAR : ONE_HOUR;
}

// Jolpica rate-limits hard, and a full season's heatmap fans out into ~50
// concurrent requests — retry a 429 with backoff instead of failing the page.
async function ergastFetch<T>(path: string, revalidateSeconds = ONE_HOUR, attempt = 1): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, {
    next: { revalidate: revalidateSeconds },
  });
  if (res.status === 429 && attempt <= 3) {
    await new Promise((resolve) => setTimeout(resolve, attempt * 800));
    return ergastFetch<T>(path, revalidateSeconds, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`Ergast API request failed for ${path}: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export interface Driver {
  driverId: string;
  code?: string;
  permanentNumber?: string;
  givenName: string;
  familyName: string;
  nationality: string;
}

export interface Constructor {
  constructorId: string;
  name: string;
  nationality: string;
}

export interface Circuit {
  circuitId: string;
  circuitName: string;
  Location: { lat: string; long: string; locality: string; country: string };
}

export interface RaceSession {
  date: string;
  time?: string;
}

export interface Race {
  season: string;
  round: string;
  raceName: string;
  Circuit: Circuit;
  date: string;
  time?: string;
  FirstPractice?: RaceSession;
  SecondPractice?: RaceSession;
  ThirdPractice?: RaceSession;
  SprintQualifying?: RaceSession;
  Sprint?: RaceSession;
  Qualifying?: RaceSession;
}

export interface RaceResult {
  number: string;
  position: string;
  positionText: string;
  points: string;
  Driver: Driver;
  Constructor: Constructor;
  grid: string;
  laps: string;
  status: string;
  Time?: { millis?: string; time: string };
  FastestLap?: { rank: string; lap?: string; Time?: { time: string } };
}

export interface QualifyingResult {
  number: string;
  position: string;
  positionText?: string;
  Driver: Driver;
  Constructor: Constructor;
  Q1?: string;
  Q2?: string;
  Q3?: string;
}

export interface DriverStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Driver: Driver;
  Constructors: Constructor[];
}

export interface ConstructorStanding {
  position: string;
  positionText: string;
  points: string;
  wins: string;
  Constructor: Constructor;
}

interface MRDataEnvelope<T> {
  MRData: T;
}

// A snapshot, once it exists for a season, is the whole truth for that
// season — current season included. The weekly re-snapshot (see
// .github/workflows/snapshot-season.yml) keeps the current season close
// enough to live (race weekends are days apart at best), and reading a
// local file is instant, so there's no reason to pay for a live API round
// trip, or to be at the mercy of the community-run Jolpica API's uptime,
// once a snapshot is on disk. Live fetch is the fallback for whatever a
// snapshot doesn't have yet (a brand-new season with no snapshot at all,
// or this week's round before the next scheduled snapshot picks it up).
// Wrapped in React's cache() so that when a page's independent sections
// (e.g. /results' driver and constructor grids) each ask for the same
// season/round on the live-fetch path, they share one request instead of
// firing it twice — the snapshot path was already deduped via the Map in
// season-snapshot.ts, but live fetches weren't, which doubled real calls
// against Jolpica's rate limit for exactly the seasons most likely to hit it.
export const getSeasonSchedule = cache(async (season: number): Promise<Race[]> => {
  const snapshot = loadSeasonSnapshot(season);
  if (snapshot) return snapshot.schedule;

  type Resp = MRDataEnvelope<{ RaceTable: { Races: Race[] } }>;
  const data = await ergastFetch<Resp>(`/${season}.json?limit=100`, revalidateFor(season));
  return data.MRData.RaceTable.Races;
});

export const getDriverStandings = cache(async (season: number): Promise<DriverStanding[]> => {
  const snapshot = loadSeasonSnapshot(season);
  if (snapshot) return snapshot.driverStandings;

  type Resp = MRDataEnvelope<{
    StandingsTable: { StandingsLists: { DriverStandings: DriverStanding[] }[] };
  }>;
  const data = await ergastFetch<Resp>(
    `/${season}/driverStandings.json?limit=100`,
    revalidateFor(season)
  );
  return data.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];
});

export const getConstructorStandings = cache(
  async (season: number): Promise<ConstructorStanding[]> => {
    const snapshot = loadSeasonSnapshot(season);
    if (snapshot) return snapshot.constructorStandings;

    type Resp = MRDataEnvelope<{
      StandingsTable: { StandingsLists: { ConstructorStandings: ConstructorStanding[] }[] };
    }>;
    const data = await ergastFetch<Resp>(
      `/${season}/constructorStandings.json?limit=100`,
      revalidateFor(season)
    );
    return data.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];
  }
);

export const getRaceResults = cache(
  async (season: number, round: number): Promise<RaceResult[]> => {
    const snapshot = loadSeasonSnapshot(season);
    if (snapshot) return snapshot.results[round] ?? [];

    type Resp = MRDataEnvelope<{ RaceTable: { Races: { Results?: RaceResult[] }[] } }>;
    const data = await ergastFetch<Resp>(
      `/${season}/${round}/results.json?limit=100`,
      revalidateFor(season)
    );
    return data.MRData.RaceTable.Races[0]?.Results ?? [];
  }
);

export const getSprintResults = cache(
  async (season: number, round: number): Promise<RaceResult[]> => {
    const snapshot = loadSeasonSnapshot(season);
    if (snapshot) return snapshot.sprintResults[round] ?? [];

    type Resp = MRDataEnvelope<{ RaceTable: { Races: { SprintResults?: RaceResult[] }[] } }>;
    const data = await ergastFetch<Resp>(
      `/${season}/${round}/sprint.json?limit=100`,
      revalidateFor(season)
    );
    return data.MRData.RaceTable.Races[0]?.SprintResults ?? [];
  }
);

// A snapshot taken before qualifying data was tracked has no `qualifying`
// key at all (not an empty one) - fall through to a live fetch for that
// round rather than reading it as "this round has no qualifying data".
export const getQualifyingResults = cache(
  async (season: number, round: number): Promise<QualifyingResult[]> => {
    const snapshot = loadSeasonSnapshot(season);
    if (snapshot?.qualifying) return snapshot.qualifying[round] ?? [];

    type Resp = MRDataEnvelope<{ RaceTable: { Races: { QualifyingResults?: QualifyingResult[] }[] } }>;
    const data = await ergastFetch<Resp>(
      `/${season}/${round}/qualifying.json?limit=100`,
      revalidateFor(season)
    );
    return data.MRData.RaceTable.Races[0]?.QualifyingResults ?? [];
  }
);
