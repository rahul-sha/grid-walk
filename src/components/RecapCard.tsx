"use client";

import { useEffect, useMemo, useState } from "react";
import type { LastRaceRecap, RecapData, RecapRow, RecapSession, RaceSummary } from "@/lib/recap";
import { getRaceRecap } from "@/app/actions/recap";

// Grid Walk's first card: a recap of a race this season, and (the
// genuinely live part — see "grid-walk-recap-schedule-card" memory) that
// race's own session schedule converted to the visitor's own time zone.
// Every other card is a pre-rendered image (see "grid-walk-snapshots-only");
// this one stays live deliberately. The race-picker strip (see
// "grid-walk-race-picker" memory) lets a visitor browse any race of the
// season: only the latest race's full recap ships with the page, and every
// other one is fetched lazily when picked, never all 23 up front.
export default function RecapCard({ data }: { data: RecapData | null }) {
  const [view, setView] = useState<"race" | "qualifying">("race");
  const [activeRound, setActiveRound] = useState<number | null>(data?.lastRace?.round ?? null);
  const [cache, setCache] = useState<Record<number, LastRaceRecap | null>>(() =>
    data?.lastRace ? { [data.lastRace.round]: data.lastRace } : {},
  );
  const [loadingRound, setLoadingRound] = useState<number | null>(null);
  const [failedRound, setFailedRound] = useState<number | null>(null);
  // Read once on mount rather than via Date.now() during render — the
  // server already picked "completed vs. upcoming" when it built raceList,
  // and this only needs to agree with that closely enough to light up the
  // right chips, not to the millisecond.
  const [now] = useState(() => Date.now());

  if (!data) {
    return (
      <div className="recap-placeholder">
        <p className="recap-empty">This card only covers the current season — switch to it to see the latest race and what&rsquo;s next.</p>
      </div>
    );
  }

  const { season, raceList } = data;
  const activeMeta = raceList.find((r) => r.round === activeRound) ?? null;
  const notYetHeld = activeMeta ? activeMeta.raceStart > now : false;

  function selectRound(round: number) {
    if (round === activeRound) return;
    setActiveRound(round);
    setFailedRound(null);
    const meta = raceList.find((r) => r.round === round);
    if (!meta || meta.raceStart > now || cache[round] !== undefined) return;
    setLoadingRound(round);
    getRaceRecap(season, round)
      .then((recap) => {
        setCache((prev) => ({ ...prev, [round]: recap }));
      })
      .catch(() => {
        setFailedRound(round);
      })
      .finally(() => {
        setLoadingRound((prev) => (prev === round ? null : prev));
      });
  }

  const activeRecap = activeRound !== null ? cache[activeRound] : undefined;
  const isLoading = activeRound !== null && loadingRound === activeRound;
  const didFail = activeRound !== null && failedRound === activeRound;

  return (
    <>
      {raceList.length > 0 ? (
        <RacePicker raceList={raceList} activeRound={activeRound} latestRound={data.lastRace?.round ?? null} now={now} onSelect={selectRound} />
      ) : null}

      {/* Fixed height so switching race keeps the card's natural size
          constant — GridWalk's layout() only re-measures on season/view
          changes (see "grid-walk-race-picker" memory), not on this card's
          own state, so a size change here would leave the card mis-scaled. */}
      <div className="recap-content">
        {notYetHeld && activeMeta ? (
          <NotYetHeld meta={activeMeta} />
        ) : isLoading ? (
          <RecapSkeleton />
        ) : didFail ? (
          <p className="recap-empty">Couldn&rsquo;t load this race&rsquo;s results. Try picking it again.</p>
        ) : activeRecap ? (
          <>
            <RecapBanner race={activeRecap} />
            <div className="recap-toggle-row">
              <button
                type="button"
                className={"recap-toggle" + (view === "race" ? " active" : "")}
                onClick={(e) => {
                  e.stopPropagation();
                  setView("race");
                }}
              >
                Race
              </button>
              <button
                type="button"
                className={"recap-toggle" + (view === "qualifying" ? " active" : "")}
                onClick={(e) => {
                  e.stopPropagation();
                  setView("qualifying");
                }}
              >
                Qualifying
              </button>
            </div>
            <RecapTable rows={view === "race" ? activeRecap.classification : activeRecap.qualifying} />
          </>
        ) : (
          <p className="recap-empty">No results for this race yet.</p>
        )}
      </div>

      <div className="card-divider" />
      {activeMeta ? <SessionTimes meta={activeMeta} /> : <p className="recap-empty">No races scheduled this season.</p>}
    </>
  );
}

function RacePicker({
  raceList,
  activeRound,
  latestRound,
  now,
  onSelect,
}: {
  raceList: RaceSummary[];
  activeRound: number | null;
  latestRound: number | null;
  now: number;
  onSelect: (round: number) => void;
}) {
  return (
    <div className="recap-picker">
      <div className="recap-picker-label">
        <span>Jump to a race</span>
        {activeRound !== null && latestRound !== null && activeRound !== latestRound ? (
          <button
            type="button"
            className="recap-jump-latest"
            onClick={(e) => {
              e.stopPropagation();
              onSelect(latestRound);
            }}
          >
            Back to latest
          </button>
        ) : null}
      </div>
      <div className="recap-picker-strip">
        {raceList.map((race) => (
          <button
            key={race.round}
            type="button"
            className={"recap-chip-pick" + (race.round === activeRound ? " active" : "") + (race.raceStart > now ? " future" : "")}
            title={`${race.name} (Round ${race.round})`}
            onClick={(e) => {
              e.stopPropagation();
              onSelect(race.round);
            }}
          >
            {race.flagIso ? <span className={`fi fi-${race.flagIso}`} aria-hidden="true" /> : <span className="recap-chip-pick-noflag" aria-hidden="true" />}
            <span className="recap-chip-pick-rd">Rd {race.round}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

function NotYetHeld({ meta }: { meta: RaceSummary }) {
  return (
    <div className="recap-not-held">
      <span className="recap-not-held-icon" aria-hidden="true" />
      <span className="recap-not-held-msg">Race yet to be held</span>
      <span className="recap-not-held-sub">
        {meta.name} runs {meta.dateLabel} — results land here once the chequered flag drops.
      </span>
    </div>
  );
}

function RecapSkeleton() {
  return (
    <div className="recap-skeleton">
      <div className="recap-skeleton-note">Fetching this race&rsquo;s results&hellip;</div>
    </div>
  );
}

function RecapBanner({ race }: { race: LastRaceRecap }) {
  return (
    <div className="recap-banner" style={{ "--recap-color": race.podium[0]?.color ?? "#888" } as React.CSSProperties}>
      <div className="recap-banner-head">
        {race.flagIso ? <span className={`fi fi-${race.flagIso} recap-flag`} aria-hidden="true" /> : null}
        <span className="recap-race-name">{race.name}</span>
        <span className="recap-race-date">{race.dateLabel}</span>
      </div>
      <div className="recap-podium">
        {(["p2", "p1", "p3"] as const).map((cls) => {
          const row = race.podium[cls === "p1" ? 0 : cls === "p2" ? 1 : 2];
          if (!row) return <div key={cls} className={`recap-chip ${cls} empty`} />;
          return (
            <div key={cls} className={`recap-chip ${cls}`}>
              <span className="recap-chip-pos">P{row.pos}</span>
              <span className="recap-chip-code">{row.code}</span>
              <span className="recap-chip-team">{row.team}</span>
              <span className="recap-chip-gap" style={row.detail ? undefined : { visibility: "hidden" }}>
                {row.detail || "—"}
              </span>
              <span className="recap-chip-swatch" style={{ background: row.color }} />
            </div>
          );
        })}
      </div>
      <div className="recap-badges">
        {race.pole ? <span className="recap-badge">Pole · {race.pole}</span> : null}
        {race.fastest ? <span className="recap-badge">Fastest lap · {race.fastest}</span> : null}
      </div>
    </div>
  );
}

function RecapTable({ rows }: { rows: RecapRow[] }) {
  return (
    <div className="recap-table">
      {rows.map((row) => (
        <div className="recap-row" key={row.pos}>
          <span className="recap-row-pos">{row.pos}</span>
          <span className="recap-row-dot" style={{ background: row.color }} />
          <span className="recap-row-code">{row.code}</span>
          <span className="recap-row-team">{row.team}</span>
          <span className="recap-row-detail">{row.detail}</span>
        </div>
      ))}
    </div>
  );
}

// The selected race's own session schedule, always in the visitor's own
// time zone — replaces the earlier fixed "Up Next" block (which only ever
// showed the next real race) now that any race can be selected.
function SessionTimes({ meta }: { meta: RaceSummary }) {
  const [visitorTz, setVisitorTz] = useState("UTC");
  useEffect(() => {
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisitorTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      setVisitorTz("UTC");
    }
  }, []);

  const timeFmt = useMemo(() => new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: visitorTz }), [visitorTz]);
  const dayFmt = useMemo(
    () => new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: visitorTz }),
    [visitorTz],
  );

  return (
    <div className="sched">
      <div className="sched-head">
        <h3>Session Times</h3>
        <span className="sched-tz-note">Your time</span>
      </div>
      <div className="sched-body">
        <div className="sched-track">
          {meta.flagIso ? <span className={`fi fi-${meta.flagIso} sched-flag`} aria-hidden="true" /> : null}
          <span className="sched-circuit">{meta.name}</span>
          <span className="sched-rd">
            Round {meta.round} · {meta.dateLabel}
          </span>
        </div>
        <div className="sched-rows">
          {meta.sessions.map((session: RecapSession) => {
            const date = new Date(session.iso);
            return (
              <div className="sched-row" key={session.name}>
                <span className="sess-name">{session.name}</span>
                <span className="sess-time">{timeFmt.format(date)}</span>
                <span className="sess-day">{dayFmt.format(date)}</span>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
