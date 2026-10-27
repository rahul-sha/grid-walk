"use client";

import { useEffect, useState } from "react";
import type { RecapData, RecapRow } from "@/lib/recap";

// Grid Walk's first card: a recap of the most recently completed race, and
// (the genuinely live part — see "grid-walk-recap-schedule-card" memory)
// the next race's session schedule converted to the visitor's own time
// zone. Every other card is a pre-rendered image (see
// "grid-walk-snapshots-only"); this one stays live deliberately, because a
// time-zone conversion can't be baked into a snapshot for every visitor.
export default function RecapCard({ data }: { data: RecapData | null }) {
  const [view, setView] = useState<"race" | "qualifying">("race");

  if (!data) {
    return (
      <div className="recap-placeholder">
        <p className="recap-empty">This card only covers the current season — switch to it to see the latest race and what&rsquo;s next.</p>
      </div>
    );
  }

  const { lastRace, nextRace } = data;

  return (
    <>
      {lastRace ? (
        <>
          <div className="recap-banner" style={{ "--recap-color": lastRace.podium[0]?.color ?? "#888" } as React.CSSProperties}>
            <div className="recap-banner-head">
              {lastRace.flagIso ? <span className={`fi fi-${lastRace.flagIso} recap-flag`} aria-hidden="true" /> : null}
              <span className="recap-race-name">{lastRace.name}</span>
              <span className="recap-race-date">{lastRace.dateLabel}</span>
            </div>
            <div className="recap-podium">
              {(["p2", "p1", "p3"] as const).map((cls) => {
                const row = lastRace.podium[cls === "p1" ? 0 : cls === "p2" ? 1 : 2];
                if (!row) return <div key={cls} className={`recap-chip ${cls} empty`} />;
                return (
                  <div key={cls} className={`recap-chip ${cls}`}>
                    <span className="recap-chip-pos">P{row.pos}</span>
                    <span className="recap-chip-code">{row.code}</span>
                    <span className="recap-chip-team">{row.team}</span>
                    {row.detail ? <span className="recap-chip-gap">{row.detail}</span> : null}
                    <span className="recap-chip-swatch" style={{ background: row.color }} />
                  </div>
                );
              })}
            </div>
            <div className="recap-badges">
              {lastRace.pole ? <span className="recap-badge">Pole · {lastRace.pole}</span> : null}
              {lastRace.fastest ? <span className="recap-badge">Fastest lap · {lastRace.fastest}</span> : null}
            </div>
          </div>

          <div className="recap-toggle-row">
            <button
              type="button"
              className={"recap-toggle" + (view === "race" ? " active" : "")}
              onClick={() => setView("race")}
            >
              Race
            </button>
            <button
              type="button"
              className={"recap-toggle" + (view === "qualifying" ? " active" : "")}
              onClick={() => setView("qualifying")}
            >
              Qualifying
            </button>
          </div>
          <RecapTable rows={view === "race" ? lastRace.classification : lastRace.qualifying} />
        </>
      ) : (
        <p className="recap-empty">No races completed yet this season.</p>
      )}

      <div className="card-divider" />
      {nextRace ? <UpNextSchedule race={nextRace} /> : <p className="recap-empty">No more races scheduled this season.</p>}
    </>
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

function UpNextSchedule({ race }: { race: NonNullable<RecapData["nextRace"]> }) {
  // "Race-local" vs "your time zone" — default to the visitor's own, per
  // Rahul's call on the mock-up. Resolved once on mount (server-rendered
  // markup has no visitor time zone to go on) and never changes afterwards.
  const [visitorTz, setVisitorTz] = useState("UTC");
  // The schedule's source times are UTC; there's no per-circuit local time
  // zone lookup in this codebase yet, so the toggle's other option is UTC
  // rather than a claimed "race local" time it can't actually show.
  const [tzMode, setTzMode] = useState<"visitor" | "utc">("visitor");
  useEffect(() => {
    // Resolving the visitor's time zone during render would run on the
    // server too (where there's no "visitor"), mismatching the client's
    // hydrated output — so this only ever runs once, after mount.
    try {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setVisitorTz(Intl.DateTimeFormat().resolvedOptions().timeZone);
    } catch {
      setVisitorTz("UTC");
    }
  }, []);

  const zone = tzMode === "visitor" ? visitorTz : "UTC";
  const timeFmt = new Intl.DateTimeFormat(undefined, { hour: "numeric", minute: "2-digit", timeZone: zone });
  const dayFmt = new Intl.DateTimeFormat(undefined, { weekday: "short", day: "numeric", month: "short", timeZone: zone });

  return (
    <div className="sched">
      <div className="sched-head">
        <h3>Up Next</h3>
        <button
          type="button"
          className="sched-tz-toggle"
          onClick={() => setTzMode((m) => (m === "visitor" ? "utc" : "visitor"))}
          title="Toggle between your own time zone and UTC"
        >
          {tzMode === "visitor" ? "Your time" : "UTC"}
        </button>
      </div>
      <div className="sched-body">
        <div className="sched-track">
          {race.flagIso ? <span className={`fi fi-${race.flagIso} sched-flag`} aria-hidden="true" /> : null}
          <span className="sched-circuit">{race.circuitName}</span>
          <span className="sched-rd">Round {race.round} · {race.dateLabel}</span>
        </div>
        <div className="sched-rows">
          {race.sessions.map((session) => {
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
