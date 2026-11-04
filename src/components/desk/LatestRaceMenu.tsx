"use client";

import { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";
import RecapCard from "@/components/RecapCard";
import { CardHeader, Pill } from "@/components/ui";
import type { RecapData } from "@/lib/recap";
import { fitContent } from "./fitCard";

// Remembers the last race whose result the visitor has opened, so the pill
// can show a dot when a newer one is in.
const SEEN_KEY = "gw-latest-race-seen";
const GAP = 8; // between the pill's island and the card, as with the season menu
const EDGE = 16; // the page gutter
const TOP_CLEAR = 16 + 48 + GAP; // below the top bar (phones)

type Box = { w: number; h: number; innerH: number };

// The Latest Race card, kept off the table: a pill that opens the real card
// in a panel. On desktop the pill sits in the top bar and the card hangs
// below it, sized to the screen's height. On phones the pill sits in the
// bottom island and the card opens upwards, as wide as the top bar, and
// scrolls inside itself. It always shows the current season, whichever
// season is on the table.
export default function LatestRaceMenu({ data, placement }: { data: RecapData; placement: "top" | "bottom" }) {
  const [open, setOpen] = useState(false);
  const [unseen, setUnseen] = useState(false);
  const [box, setBox] = useState<Box | null>(null);
  const rootRef = useRef<HTMLSpanElement>(null);
  const cardRef = useRef<HTMLDivElement>(null);
  const panelRef = useRef<HTMLDivElement>(null);

  const round = data.latestRound ?? data.lastRace?.round ?? null;
  const race = data.raceList.find((r) => r.round === round) ?? null;
  const seenKey = data.lastRace ? `${data.season}-${data.lastRace.round}` : "";

  useEffect(() => {
    function read() {
      try {
        setUnseen(!!seenKey && window.localStorage.getItem(SEEN_KEY) !== seenKey);
      } catch {
        // storage blocked: no dot
      }
    }
    read();
  }, [seenKey]);

  // Same two-pass fit as the sheets on the table, then one scale for the
  // panel. Desktop shows the card at its full size (shrinking it to the
  // screen's height made the text too small to read) and scrolls inside
  // the panel when the screen is shorter than the card. Phones scale it to
  // the top bar's width and scroll the same way.
  const measure = useCallback(() => {
    const card = cardRef.current;
    const root = rootRef.current;
    if (!card || !root) return;
    card.style.transform = "";
    fitContent(card);
    const nw = card.offsetWidth;
    const nh = card.offsetHeight || 900;
    if (!nw) return;
    const r = root.getBoundingClientRect();
    let s: number;
    let avail: number;
    if (placement === "top") {
      s = 1;
      // the pill is inset 6px in its island; the card starts 8px below that
      avail = window.innerHeight - (r.bottom + 6 + GAP) - EDGE;
    } else {
      s = (window.innerWidth - 2 * EDGE) / nw;
      const islandTop = root.closest(".dk-ctl")?.getBoundingClientRect().top ?? r.top;
      avail = islandTop - GAP - TOP_CLEAR;
    }
    const h = Math.min(nh * s, avail);
    card.style.transform = `scale(${s})`;
    setBox({ w: nw * s, h, innerH: nh * s });
  }, [placement]);

  useLayoutEffect(() => {
    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [measure]);

  useEffect(() => {
    if (!open) return;
    function onDown(e: PointerEvent) {
      if (e.target instanceof Node && rootRef.current?.contains(e.target)) return;
      setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("pointerdown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("pointerdown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  if (!race) return null;

  function toggle() {
    setOpen((v) => !v);
    if (!open) {
      measure();
      // The card's race strip scrolls itself to the latest race on mount,
      // which can scroll this panel too; always open at the top.
      if (panelRef.current) panelRef.current.scrollTop = 0;
      setUnseen(false);
      try {
        if (seenKey) window.localStorage.setItem(SEEN_KEY, seenKey);
      } catch {
        // storage blocked: the dot just comes back next visit
      }
    }
  }

  const shortName = race.name.replace(/\s+GP$/, "");
  return (
    <span className={"dk-lr " + placement + (open ? " open" : "")} ref={rootRef}>
      <Pill
        active={open}
        className={"dk-lr-pill" + (unseen ? " unseen" : "")}
        aria-haspopup="dialog"
        aria-expanded={open}
        aria-label={`Latest race: Round ${race.round}, ${race.name}${unseen ? " (new result)" : ""}`}
        onClick={toggle}
      >
        {race.flagIso ? <span className={`fi fi-${race.flagIso} dk-lr-flag`} aria-hidden="true" /> : null}
        <span>{placement === "top" ? shortName : `Rd ${race.round}`}</span>
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" aria-hidden="true" className="dk-lr-chevron">
          <path d="M2.5 4.5L6 8L9.5 4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </Pill>
      <div
        className="dk-lr-panel"
        ref={panelRef}
        role="dialog"
        aria-label="Latest race"
        aria-hidden={!open}
        inert={!open}
        style={box ? { width: box.w, height: box.h } : undefined}
      >
        <div className="dk-lr-scale" style={box ? { width: box.w, height: box.innerH } : undefined}>
          <div className="gw-card ui-card" ref={cardRef}>
            <div className="gw-card-inner">
              <CardHeader title="Latest Race" subtitle="The most recent race, in your own time zone." />
              <div className="gw-frame">
                <div className="gw-fit">
                  <RecapCard data={data} />
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </span>
  );
}
