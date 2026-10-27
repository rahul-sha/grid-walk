import { getSeasonSchedule, getRaceResults, getQualifyingResults, type Race, type RaceSession } from "./ergast";
import { teamColor } from "./team-colors";
import { teamDisplayName } from "./team-names";
import { overrideConstructorId } from "./driver-team-overrides";
import { raceFlagIso } from "./circuits";

export interface RecapRow {
  pos: number;
  code: string;
  name: string;
  constructorId: string;
  team: string;
  color: string;
  // Race rows: the gap/time/status text (blank for P1 — Rahul doesn't want
  // the winner's total race time shown). Qualifying rows: the lap time.
  detail: string;
}

export interface RecapSession {
  name: string;
  iso: string;
}

export interface LastRaceRecap {
  round: number;
  name: string;
  flagIso: string | null;
  dateLabel: string;
  podium: RecapRow[];
  pole: string | null;
  fastest: string | null;
  classification: RecapRow[];
  qualifying: RecapRow[];
}

export interface NextRaceSchedule {
  round: number;
  name: string;
  flagIso: string | null;
  circuitName: string;
  locality: string;
  country: string;
  dateLabel: string;
  sessions: RecapSession[];
}

// A lightweight entry per race of the season, for the race-picker strip —
// cheap because it comes straight off the schedule fetch Grid Walk already
// makes, with no per-race results/qualifying fetch. `sessions` lets the
// card show timing for a race nobody has clicked into yet, and `raceStart`
// lets the client decide "already run" vs "yet to be held" without a
// second round-trip.
export interface RaceSummary {
  round: number;
  name: string;
  flagIso: string | null;
  dateLabel: string;
  raceStart: number;
  sessions: RecapSession[];
}

export interface RecapData {
  season: number;
  lastRace: LastRaceRecap | null;
  nextRace: NextRaceSchedule | null;
  raceList: RaceSummary[];
}

const DATE_LABEL_FORMAT = new Intl.DateTimeFormat("en-GB", { day: "numeric", month: "short" });

function sessionIso(date: string, time?: string): string | null {
  if (!time) return null;
  return `${date}T${time}`;
}

function buildSessions(race: Race): RecapSession[] {
  const candidates: { name: string; session?: RaceSession }[] = [
    { name: "Practice 1", session: race.FirstPractice },
    { name: "Practice 2", session: race.SecondPractice },
    { name: "Sprint Qualifying", session: race.SprintQualifying },
    { name: "Practice 3", session: race.ThirdPractice },
    { name: "Sprint", session: race.Sprint },
    { name: "Qualifying", session: race.Qualifying },
    { name: "Race", session: { date: race.date, time: race.time } },
  ];
  const sessions: RecapSession[] = [];
  for (const { name, session } of candidates) {
    if (!session) continue;
    const iso = sessionIso(session.date, session.time);
    if (iso) sessions.push({ name, iso });
  }
  return sessions.sort((a, b) => (a.iso < b.iso ? -1 : 1));
}

function raceRow(result: {
  position: string;
  positionText: string;
  status: string;
  Time?: { time: string };
  Driver: { code?: string; givenName: string; familyName: string; driverId: string };
  Constructor: { constructorId: string; name: string };
}, season: number): RecapRow {
  const constructorId = overrideConstructorId(season, result.Driver.driverId, result.Constructor.constructorId);
  // `position` is always the numeric classification rank, even for a
  // retiree (classified by laps completed) — `positionText` is "R"/"W"/etc
  // for those, and sorting by it instead put every non-finisher at pos 0.
  const pos = Number(result.position) || 0;
  // P1's total race time isn't shown (Rahul's call on the mock-up); every
  // other finisher gets their gap, and a non-finisher gets their status.
  const detail = pos === 1 ? "" : result.Time?.time ?? result.status;
  return {
    pos,
    code: result.Driver.code ?? result.Driver.familyName.slice(0, 3).toUpperCase(),
    name: `${result.Driver.givenName} ${result.Driver.familyName}`,
    constructorId,
    team: teamDisplayName(constructorId, result.Constructor.name),
    color: teamColor(constructorId),
    detail,
  };
}

function qualifyingRow(result: {
  position: string;
  Q1?: string;
  Q2?: string;
  Q3?: string;
  Driver: { code?: string; givenName: string; familyName: string; driverId: string };
  Constructor: { constructorId: string; name: string };
}, season: number): RecapRow {
  const constructorId = overrideConstructorId(season, result.Driver.driverId, result.Constructor.constructorId);
  return {
    pos: Number(result.position) || 0,
    code: result.Driver.code ?? result.Driver.familyName.slice(0, 3).toUpperCase(),
    name: `${result.Driver.givenName} ${result.Driver.familyName}`,
    constructorId,
    team: teamDisplayName(constructorId, result.Constructor.name),
    color: teamColor(constructorId),
    detail: result.Q3 ?? result.Q2 ?? result.Q1 ?? "—",
  };
}

function raceStartMs(race: Race): number {
  return new Date(sessionIso(race.date, race.time ?? "00:00:00Z") ?? race.date).getTime();
}

// Builds one race's classification/qualifying/podium — the data behind both
// the initial "most recent race" recap and a race picked from the strip.
// Returns null only when there's genuinely no results data for the round
// yet (e.g. picked moments before results are published).
async function buildRaceRecap(season: number, race: Race): Promise<LastRaceRecap | null> {
  const round = Number(race.round);
  const [results, qualifying] = await Promise.all([
    getRaceResults(season, round),
    getQualifyingResults(season, round),
  ]);
  if (results.length === 0) return null;

  const classification = results.map((r) => raceRow(r, season)).sort((a, b) => a.pos - b.pos);
  const qualRows = qualifying.map((q) => qualifyingRow(q, season)).sort((a, b) => a.pos - b.pos);
  const poleRow = qualRows.find((q) => q.pos === 1);
  const fastestResult = results.find((r) => r.FastestLap?.rank === "1");
  return {
    round,
    name: race.raceName.replace(/\s+Grand Prix$/i, " GP"),
    flagIso: raceFlagIso(race),
    dateLabel: DATE_LABEL_FORMAT.format(new Date(`${race.date}T00:00:00Z`)),
    podium: classification.filter((r) => r.pos >= 1 && r.pos <= 3),
    pole: poleRow?.code ?? null,
    fastest: fastestResult?.Driver.code ?? null,
    classification,
    qualifying: qualRows,
  };
}

// Builds the live data for Grid Walk's recap + race-picker card: the most
// recently completed race's classification, the next race's session
// schedule (raw UTC ISO timestamps — the client converts to the visitor's
// own time zone), and a lightweight summary of every race in the season for
// the picker strip. Only meaningful for the current season; an older season
// or one with no races yet returns nulls/an empty list rather than guessing.
export async function buildRecapData(season: number): Promise<RecapData> {
  const schedule = await getSeasonSchedule(season);
  const now = Date.now();

  // A round only counts as "completed" once its race session has actually
  // started — a schedule entry's bare `date` is midnight local, which can
  // be hours before the real race time depending on time zone, so this
  // combines date+time exactly like the sessions below do.
  const withTime = schedule.map((race) => ({ race, raceStart: raceStartMs(race) }));
  const completed = withTime.filter((r) => r.raceStart <= now);
  const upcoming = withTime.filter((r) => r.raceStart > now);

  const lastRace = completed.length > 0 ? await buildRaceRecap(season, completed[completed.length - 1].race) : null;

  let nextRace: NextRaceSchedule | null = null;
  if (upcoming.length > 0) {
    const { race } = upcoming[0];
    nextRace = {
      round: Number(race.round),
      name: race.raceName.replace(/\s+Grand Prix$/i, " GP"),
      flagIso: raceFlagIso(race),
      circuitName: race.Circuit.circuitName,
      locality: race.Circuit.Location.locality,
      country: race.Circuit.Location.country,
      dateLabel: DATE_LABEL_FORMAT.format(new Date(`${race.date}T00:00:00Z`)),
      sessions: buildSessions(race),
    };
  }

  const raceList: RaceSummary[] = withTime.map(({ race, raceStart }) => ({
    round: Number(race.round),
    name: race.raceName.replace(/\s+Grand Prix$/i, " GP"),
    flagIso: raceFlagIso(race),
    dateLabel: DATE_LABEL_FORMAT.format(new Date(`${race.date}T00:00:00Z`)),
    raceStart,
    sessions: buildSessions(race),
  }));

  return { season, lastRace, nextRace, raceList };
}

// Lazily fetches one race's recap when picked from the strip — the only
// part of a non-latest race that isn't already in `raceList` (its schedule
// is), since results/qualifying are too heavy to build for all 23 rounds on
// every page load. Returns null for a season/round Grid Walk doesn't know,
// or one with no results yet (picked right before the race, say).
export async function fetchRaceRecap(season: number, round: number): Promise<LastRaceRecap | null> {
  const schedule = await getSeasonSchedule(season);
  const race = schedule.find((r) => Number(r.round) === round);
  if (!race) return null;
  return buildRaceRecap(season, race);
}
