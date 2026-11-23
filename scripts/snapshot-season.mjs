#!/usr/bin/env node
// Fetches one season's full schedule, standings, and per-round race/sprint
// results from the Jolpica F1 API and writes them to data/seasons/<year>.json.
// Run once per completed season (npm run snapshot:season -- 2020) so the app
// can serve that season from the repo instead of the live API, which
// rate-limits hard under the ~50 concurrent requests a full season needs.
import { readFile, writeFile, mkdir } from "node:fs/promises";
import path from "node:path";

const BASE_URL = "https://api.jolpi.ca/ergast/f1";
const season = Number(process.argv[2]);

// Jolpica requires every caller to name itself and its version (requests
// without a custom user agent get 403 Forbidden), so it can block one bad
// release instead of the whole app. The format follows Jolpica's guide
// (https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md): app name
// and version, then other relevant software. That guide also sets the limits
// this script keeps to: at most 4 requests a second, 500 an hour, and
// `limit` no higher than 100. Keep this in step with src/lib/ergast.ts.
const { version } = JSON.parse(await readFile(new URL("../package.json", import.meta.url), "utf8"));
const USER_AGENT = `GridWalk/${version} node/${process.versions.node}`;

// A courtesy gap between requests to this free, unauthenticated community
// API — keeps a multi-season backfill (dozens of seasons, each with a
// couple dozen calls) from firing as a burst even though the retry/backoff
// below already keeps it from hammering the API on a 429.
const REQUEST_DELAY_MS = 500;
const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

if (!season || Number.isNaN(season)) {
  console.error("Usage: node scripts/snapshot-season.mjs <season>");
  process.exit(1);
}

// Jolpica's limit isn't just per-request — a sustained run (a multi-season
// backfill keeping requests flowing for 20+ minutes straight) gets rate
// limited more persistently than a one-off burst, so a fixed handful of
// short retries (observed: 5 retries capped at 7.5s each, ~22s total) isn't
// always enough to ride out. Backs off exponentially instead, capped at
// 20s/attempt, up to 8 attempts (~100s+ of total patience) before giving up
// on that one request.
const MAX_ATTEMPTS = 8;
async function getJson(pathSuffix, attempt = 1) {
  const res = await fetch(`${BASE_URL}${pathSuffix}`, {
    headers: { "User-Agent": USER_AGENT },
  });
  if (res.status === 429 && attempt <= MAX_ATTEMPTS) {
    const wait = Math.min(2 ** attempt * 1000, 20000);
    console.log(`Rate limited on ${pathSuffix}, retrying in ${wait}ms (attempt ${attempt}/${MAX_ATTEMPTS})...`);
    await sleep(wait);
    return getJson(pathSuffix, attempt + 1);
  }
  if (!res.ok) {
    throw new Error(`${pathSuffix} failed: ${res.status} ${res.statusText}`);
  }
  const json = await res.json();
  await sleep(REQUEST_DELAY_MS);
  return json;
}

async function main() {
  console.log(`Fetching ${season} schedule...`);
  const scheduleData = await getJson(`/${season}.json?limit=100`);
  const schedule = scheduleData.MRData.RaceTable.Races;

  console.log(`Fetching ${season} driver standings...`);
  const driverData = await getJson(`/${season}/driverStandings.json?limit=100`);
  const driverStandings = driverData.MRData.StandingsTable.StandingsLists[0]?.DriverStandings ?? [];

  console.log(`Fetching ${season} constructor standings...`);
  const constructorData = await getJson(`/${season}/constructorStandings.json?limit=100`);
  const constructorStandings =
    constructorData.MRData.StandingsTable.StandingsLists[0]?.ConstructorStandings ?? [];

  const results = {};
  const sprintResults = {};
  const qualifying = {};

  // Sequential, not parallel: Jolpica rate-limits aggressively enough that a
  // full season fetched round-by-round is far more reliable than firing all
  // rounds at once.
  for (const race of schedule) {
    const round = Number(race.round);
    console.log(`Fetching ${season} round ${round} results...`);
    const resultData = await getJson(`/${season}/${round}/results.json?limit=100`);
    results[round] = resultData.MRData.RaceTable.Races[0]?.Results ?? [];

    if (race.Sprint) {
      console.log(`Fetching ${season} round ${round} sprint results...`);
      const sprintData = await getJson(`/${season}/${round}/sprint.json?limit=100`);
      sprintResults[round] = sprintData.MRData.RaceTable.Races[0]?.SprintResults ?? [];
    }

    console.log(`Fetching ${season} round ${round} qualifying...`);
    const qualifyingData = await getJson(`/${season}/${round}/qualifying.json?limit=100`);
    qualifying[round] = qualifyingData.MRData.RaceTable.Races[0]?.QualifyingResults ?? [];
  }

  const snapshot = {
    season,
    schedule,
    driverStandings,
    constructorStandings,
    results,
    sprintResults,
    qualifying,
  };

  const outDir = path.join(process.cwd(), "data", "seasons");
  await mkdir(outDir, { recursive: true });
  const outPath = path.join(outDir, `${season}.json`);
  await writeFile(outPath, `${JSON.stringify(snapshot, null, 2)}\n`);
  console.log(`Wrote ${outPath}`);
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
