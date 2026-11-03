import {
  getSeasonSchedule,
  getDriverStandings,
  getRaceResults,
  getSprintResults,
  type RaceResult,
} from "./ergast";
import { raceAbbreviation, raceFlagIso } from "./circuits";
import { teamColor } from "./team-colors";
import { teamDisplayName } from "./team-names";
import { overrideConstructorId } from "./driver-team-overrides";

export interface PointsGridColumn {
  round: number;
  abbreviation: string;
  raceName: string;
  flagIso: string | null;
  date: string;
  hasSprint: boolean;
}

export interface PointsCell {
  points: number;
  racePoints: number;
  sprintPoints: number | null;
  position: string | null;
  classifiedPosition: number | null;
  sprintPosition: string | null;
  status: string | null;
  // Starting grid slot; 0 means a pit-lane start.
  grid: number | null;
  pole: boolean;
  fastestLap: boolean;
}

export interface PointsGridRow {
  driverId: string;
  position: string;
  code: string;
  name: string;
  constructorId: string;
  constructorName: string;
  color: string;
  seasonPoints: number;
  seasonWins: number;
  pointsByRound: (PointsCell | null)[];
}

export interface PointsGrid {
  season: number;
  columns: PointsGridColumn[];
  rows: PointsGridRow[];
  maxRoundPoints: number;
  maxSeasonPoints: number;
  maxClassifiedPosition: number;
}

export async function buildPointsGrid(season: number): Promise<PointsGrid> {
  const [schedule, standings] = await Promise.all([
    getSeasonSchedule(season),
    getDriverStandings(season),
  ]);

  const now = Date.now();
  const completed = schedule.filter((race) => new Date(race.date).getTime() <= now);
  const races = completed.length > 0 ? completed : schedule;

  // Fetched in small batches rather than all at once: a full season is
  // ~24 rounds, and firing every round's request in parallel is exactly the
  // burst that trips Jolpica's rate limit on seasons with no local snapshot.
  const BATCH_SIZE = 4;
  const perRound: { race: typeof races[number]; results: RaceResult[]; sprintResults: RaceResult[] }[] = [];
  for (let i = 0; i < races.length; i += BATCH_SIZE) {
    const batch = races.slice(i, i + BATCH_SIZE);
    const batchResults = await Promise.all(
      batch.map(async (race) => {
        const round = Number(race.round);
        const [results, sprintResults] = await Promise.all([
          getRaceResults(season, round),
          race.Sprint ? getSprintResults(season, round) : Promise.resolve([]),
        ]);
        return { race, results, sprintResults };
      })
    );
    perRound.push(...batchResults);
  }

  const columns: PointsGridColumn[] = perRound.map(({ race }) => ({
    round: Number(race.round),
    abbreviation: raceAbbreviation(race),
    raceName: race.raceName,
    flagIso: raceFlagIso(race),
    date: race.date,
    hasSprint: Boolean(race.Sprint),
  }));

  const rows: PointsGridRow[] = standings.map((standing) => {
    const pointsByRound = perRound.map(({ race, results, sprintResults }) => {
      const raceResult = results.find((r) => r.Driver.driverId === standing.Driver.driverId);
      const sprintResult = sprintResults.find(
        (r) => r.Driver.driverId === standing.Driver.driverId
      );
      if (!raceResult && !sprintResult) return null;
      const racePts = raceResult ? Number(raceResult.points) : 0;
      const sprintPts = sprintResult ? Number(sprintResult.points) : 0;
      return {
        points: racePts + sprintPts,
        racePoints: racePts,
        sprintPoints: race.Sprint ? sprintPts : null,
        position: raceResult ? raceResult.positionText : null,
        classifiedPosition: raceResult ? Number(raceResult.position) : null,
        sprintPosition: race.Sprint && sprintResult ? sprintResult.positionText : null,
        status: raceResult ? raceResult.status : null,
        grid: raceResult ? Number(raceResult.grid) : null,
        pole: raceResult?.grid === "1",
        fastestLap: raceResult?.FastestLap?.rank === "1",
      };
    });

    const constructor = standing.Constructors[standing.Constructors.length - 1];
    const constructorId = overrideConstructorId(
      season,
      standing.Driver.driverId,
      constructor?.constructorId ?? "unknown"
    );

    return {
      driverId: standing.Driver.driverId,
      position: standing.position,
      code: standing.Driver.code ?? standing.Driver.familyName.slice(0, 3).toUpperCase(),
      name: `${standing.Driver.givenName} ${standing.Driver.familyName}`,
      constructorId,
      constructorName: constructor ? teamDisplayName(constructorId, constructor.name) : "Unknown",
      color: teamColor(constructorId),
      seasonPoints: Number(standing.points),
      seasonWins: Number(standing.wins),
      pointsByRound,
    };
  });

  const maxRoundPoints = Math.max(
    1,
    ...rows.flatMap((r) => r.pointsByRound.filter((p): p is PointsCell => p !== null).map((p) => p.points))
  );
  const maxSeasonPoints = Math.max(1, ...rows.map((r) => r.seasonPoints));
  // Floor this on each round's actual entry list (its real grid size), not
  // just the highest classified position seen so far — the same fix as
  // finish-positions.ts's maxPosition, for the same reason: the back of the
  // field can still be mid-season without ever having finished in its own
  // worst position yet.
  const observedMaxPosition = Math.max(
    1,
    ...rows.flatMap((r) =>
      r.pointsByRound
        .filter((p): p is PointsCell => p !== null && p.classifiedPosition !== null)
        .map((p) => p.classifiedPosition as number)
    )
  );
  const fieldSize = Math.max(0, ...perRound.map(({ results }) => results.length));
  const maxClassifiedPosition = Math.max(observedMaxPosition, fieldSize);

  return { season, columns, rows, maxRoundPoints, maxSeasonPoints, maxClassifiedPosition };
}
