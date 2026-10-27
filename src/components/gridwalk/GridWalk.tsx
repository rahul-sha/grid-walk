"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import "./gridwalk.css";
import { createLiveGrid } from "./liveGrid";
import SeasonSelector from "@/components/SeasonSelector";
import ThemeToggle from "@/components/ThemeToggle";
import AccentToggle from "@/components/AccentToggle";
import DisclaimerButton from "./DisclaimerButton";
import { Island, Pill, IconPill, Divider, TabStrip, Logo, CardHeader, CardToggle } from "@/components/ui";
import type { PointsGrid } from "@/lib/points-grid";
import type { ConstructorPointsGrid } from "@/lib/constructor-points-grid";
import type { FinishPositionSummary } from "@/lib/finish-positions";
import type { QualifyingPositionSummary } from "@/lib/qualifying-positions";
import PointsHeatmap from "@/components/PointsHeatmap";
import ConstructorPointsHeatmap from "@/components/ConstructorPointsHeatmap";
import DriverPointsEvolutionChart from "@/components/DriverPointsEvolutionChart";
import ConstructorPointsEvolutionChart from "@/components/ConstructorPointsEvolutionChart";
import FinishPositionsGrid from "@/components/FinishPositionsGrid";
import QualifyingPositionsGrid from "@/components/QualifyingPositionsGrid";
import PodiumBars from "@/components/PodiumBars";
import RecapCard from "@/components/RecapCard";
import type { RecapData } from "@/lib/recap";
import {
  ACCENTS,
  THEMES,
  SNAPSHOT_NAMES,
  isAccent,
  isTheme,
  snapshotPath,
  type Accent,
  type SnapshotName,
  type Theme,
} from "@/lib/variant-constants";

// The season's data grids, only ever present in capture mode (see
// page.tsx): visitors get pre-rendered images and never receive these.
export interface GridWalkData {
  pointsGrid: PointsGrid;
  constructorGrid: ConstructorPointsGrid;
  finishSummary: FinishPositionSummary;
  qualifyingSummary: QualifyingPositionSummary;
}

export interface GridWalkProps {
  season: number;
  live: GridWalkData | null;
  // Natural CSS-pixel size of each snapshot image, from the season's
  // manifest; null when the season has never been captured.
  sizes: Record<string, { w: number; h: number }> | null;
  // The visitor's persisted theme/palette, read from cookies on the
  // server. Theme null = nothing chosen yet, follow the device.
  initialVariant: { accent: Accent; theme: Theme | null };
  // The recap + up-next card's data, built fresh on every request (see
  // "grid-walk-recap-schedule-card" memory) — null for any season but the
  // current one, since there's no "latest race" or "up next" otherwise.
  recap: RecapData | null;
}

type SectionDef = {
  id: string;
  title: string;
  subtitle: string;
  // The jump tabs/pills need a label that covers a card stacking two
  // halves (e.g. a driver and a team graphic) — falls back to title.
  navLabel?: string;
  // Extra control(s) shown beside the title/subtitle (e.g. a toggle
  // between two graphics sharing the card) — pointer-events are re-enabled
  // for these since .gw-card-inner otherwise disables them.
  headerActions?: () => React.ReactNode;
  // The snapshot image(s) standing in for this card's content. A toggled
  // card lists one per view, all kept mounted and crossfaded, so swapping
  // never waits on a load or collapses the card's height.
  snapshots: { name: SnapshotName; active: boolean }[];
  // Live rendering, capture mode only.
  render: (data: GridWalkData) => React.ReactNode;
  // A card that stacks two titled graphics (e.g. a driver and a team
  // chart) bakes ITS OWN title into the captured content, alongside the
  // second graphic's subsection title, instead of using the card's usual
  // external header. Both titles then go through the same content-fit
  // scale as one unit, so they always render at the same size — the
  // external header scales independently and would otherwise drift out of
  // sync with a title baked further down inside the snapshot.
  bakedTitle?: boolean;
};

type View = { k: number; tx: number; ty: number };
type SlotGeom = { s: number; c: number };

const GAP = 40;
const EASE = 0.16;
const MIN_K = 0.6;
const MAX_K = 5;
const DRAG_THRESHOLD = 6;

// Grid Walk: the eight season graphics on one horizontal strip. One flat
// camera — translate(tx, ty) scale(k) on .gw-strip — handles browsing
// (tx), zoom (k, around the pointer) and panning while zoomed (tx, ty).
// At k=1 the strip always settles with one card centred; each card is
// fitted to the space between the top bar and the jump bar, never
// enlarged past its natural size. See "grid-walk-carousel-mockup" memory.
export default function GridWalk({ season, live, sizes, initialVariant, recap }: GridWalkProps) {
  const router = useRouter();
  const wrapRef = useRef<HTMLDivElement>(null);
  const stripRef = useRef<HTMLDivElement>(null);
  const gridRef = useRef<HTMLCanvasElement>(null);
  const zoomLevelRef = useRef<HTMLSpanElement>(null);
  const slotRefs = useRef<(HTMLDivElement | null)[]>([]);
  const cardRefs = useRef<(HTMLDivElement | null)[]>([]);

  const geom = useRef<SlotGeom[]>([]);
  const metrics = useRef({ W: 0, TOP: 0, availH: 0 });
  const view = useRef<View>({ k: 1, tx: 0, ty: 0 });
  const target = useRef<View | null>(null);
  const focusRef = useRef(0);
  const moved = useRef(false);

  const [focus, setFocus] = useState(0);
  const [hintGone, setHintGone] = useState(false);
  const [freqView, setFreqView] = useState<"finish" | "quali">("finish");
  const [resultsView, setResultsView] = useState<"drivers" | "teams">("drivers");

  // Pre-rendered card snapshots: a card's own content (tables/charts/bars)
  // is the single biggest cost to the GPU on every drag frame, far more
  // than the live grid ever was (see "grid-walk-blur-gpu-cost" memory —
  // confirmed from a real device trace). So visitors never get live
  // content at all: every card, every season, is an image captured by
  // scripts/capture-card-snapshots.mjs (weekly for the current season,
  // once for the finished ones). The server already knows the visitor's
  // theme and palette from cookies, so the first paint is the right
  // image; the attributes on <html> are then watched so a toggle swaps
  // the images straight away. With no theme cookie yet (first ever
  // visit), a <picture> media query lets the browser follow the device.
  const [variant, setVariant] = useState<{ accent: Accent; theme: Theme | null }>(initialVariant);
  useEffect(() => {
    function read() {
      const root = document.documentElement;
      const accent = root.getAttribute("data-accent");
      const theme = root.getAttribute("data-theme");
      setVariant({ accent: isAccent(accent) ? accent : "monokai", theme: isTheme(theme) ? theme : null });
    }
    read();
    const observer = new MutationObserver(read);
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ["data-theme", "data-accent"] });
    return () => observer.disconnect();
  }, []);
  // Capture mode: page.tsx only supplies the live data grids when the
  // page is loaded with ?noSnapshot=1 by the capture script — without
  // this the script would photograph the very images it is regenerating.
  const forceLive = live !== null;

  // Once the cards are up, warm the browser's cache with this season's
  // images for the other seven theme/palette combinations, so toggling
  // either is instant. Other seasons load when picked and stay cached.
  useEffect(() => {
    if (forceLive || !sizes) return;
    const idle = window.requestIdleCallback ?? ((cb: () => void) => window.setTimeout(cb, 1500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const handle = idle(() => {
      for (const accent of ACCENTS) {
        for (const theme of THEMES) {
          for (const name of SNAPSHOT_NAMES) {
            if (!sizes[name]) continue;
            const img = new Image();
            img.src = snapshotPath(season, accent, theme, name);
          }
        }
      }
    });
    return () => cancel(handle);
  }, [season, sizes, forceLive]);

  // An image that fails to load (a combination not captured yet) shows a
  // quiet placeholder at the card's size rather than a broken image.
  const [failedSnapshots, setFailedSnapshots] = useState<Set<string>>(new Set());
  const FALLBACK_SIZE = { w: 900, h: 700 };

  function renderSnapshot(name: SnapshotName) {
    const size = sizes?.[name] ?? FALLBACK_SIZE;
    if (!sizes?.[name]) {
      return (
        <div className="gw-snap-missing" style={{ width: size.w, height: size.h }}>
          <span>{season} images are not ready yet</span>
        </div>
      );
    }
    const light = snapshotPath(season, variant.accent, "light", name);
    const dark = snapshotPath(season, variant.accent, "dark", name);
    const chosen = variant.theme ? snapshotPath(season, variant.accent, variant.theme, name) : light;
    if (failedSnapshots.has(chosen)) {
      return (
        <div className="gw-snap-missing" style={{ width: size.w, height: size.h }}>
          <span>Image unavailable</span>
        </div>
      );
    }
    // Explicit CSS size as well as the attributes: with only the
    // attributes (and the reset's img { height: auto }) the browser keeps
    // the PREVIOUS image's aspect ratio until the new one has loaded, so a
    // season switch measured the card at the wrong height and cropped it.
    const img = (
      <img
        src={chosen}
        alt=""
        width={size.w}
        height={size.h}
        style={{ width: size.w, height: size.h }}
        draggable={false}
        onError={() => setFailedSnapshots((prev) => new Set(prev).add(chosen))}
      />
    );
    if (variant.theme) return img;
    return (
      <picture key={`${variant.accent}-auto`}>
        <source media="(prefers-color-scheme: dark)" srcSet={dark} />
        {img}
      </picture>
    );
  }

  function renderCardBody(section: SectionDef) {
    // The recap card is never a snapshot image — see its own file for why
    // (the schedule half has to convert to each visitor's own time zone).
    if (section.id === "recap") return <RecapCard data={recap} />;
    if (live) return section.render(live);
    if (section.snapshots.length === 1) return renderSnapshot(section.snapshots[0].name);
    return (
      <div className="ui-card-views">
        {section.snapshots.map((s) => (
          <div key={s.name} className={"ui-card-view" + (s.active ? " active" : "")} aria-hidden={!s.active}>
            {renderSnapshot(s.name)}
          </div>
        ))}
      </div>
    );
  }

  // Latest Race only has anything to show for the current season (see
  // "grid-walk-recap-schedule-card" memory) — rather than a placeholder
  // card, it's left out of the strip entirely for any other season. This
  // changes section count/order on a season switch, which is fine: that
  // prop change already re-triggers layout()'s re-measure below, unlike
  // the card's own internal clicks, which don't.
  const sections: SectionDef[] = [
    ...(recap
      ? [
          {
            id: "recap",
            title: "Latest Race",
            subtitle: recap.lastRace
              ? `Round ${recap.lastRace.round} · ${recap.lastRace.name}, ${recap.season}`
              : "The most recent race, and the next one in your own time zone.",
            navLabel: "Latest Race",
            snapshots: [],
            render: () => <RecapCard data={recap} />,
          } satisfies SectionDef,
        ]
      : []),
    {
      id: "results",
      title: resultsView === "drivers" ? "Drivers Results" : "Team Results",
      subtitle:
        resultsView === "drivers"
          ? "Points scored by each driver per Grand Prix."
          : "Points scored by each team per Grand Prix.",
      navLabel: "Points Finishes",
      headerActions: () => (
        <CardToggle
          name="results"
          label={resultsView === "drivers" ? "Teams" : "Drivers"}
          onToggle={() => setResultsView((v) => (v === "drivers" ? "teams" : "drivers"))}
        />
      ),
      snapshots: [
        { name: "results-drivers", active: resultsView === "drivers" },
        { name: "results-teams", active: resultsView === "teams" },
      ],
      render: ({ pointsGrid, constructorGrid }) => (
        <div className="ui-card-views">
          <div className={"ui-card-view" + (resultsView === "drivers" ? " active" : "")} aria-hidden={resultsView !== "drivers"}>
            <PointsHeatmap grid={pointsGrid} />
          </div>
          <div className={"ui-card-view" + (resultsView === "teams" ? " active" : "")} aria-hidden={resultsView !== "teams"}>
            <ConstructorPointsHeatmap grid={constructorGrid} />
          </div>
        </div>
      ),
    },
    {
      id: "evolution",
      title: "Driver Points Evolution",
      subtitle: "Cumulative points scored by each driver across the season.",
      navLabel: "Points Evolution",
      bakedTitle: true,
      snapshots: [{ name: "evolution", active: true }],
      render: ({ pointsGrid, constructorGrid }) => (
        <>
          <CardHeader title="Driver Points Evolution" subtitle="Cumulative points scored by each driver across the season." />
          <DriverPointsEvolutionChart grid={pointsGrid} />
          <CardHeader subsection title="Constructor Points Evolution" subtitle="Cumulative points scored by each team across the season." />
          <ConstructorPointsEvolutionChart grid={constructorGrid} />
        </>
      ),
    },
    {
      id: "positions",
      title: "Positions",
      subtitle: "Where each driver finished in every Grand Prix.",
      snapshots: [{ name: "positions", active: true }],
      render: ({ pointsGrid }) => <PointsHeatmap grid={pointsGrid} mode="position" />,
    },
    {
      id: "freq",
      title: freqView === "finish" ? "Finish Frequency" : "Qualifying Frequency",
      subtitle:
        freqView === "finish"
          ? "How often each driver has finished in each position."
          : "How often each driver has qualified in each grid position.",
      navLabel: "Position Frequency",
      headerActions: () => (
        <CardToggle
          name="freq"
          label={freqView === "finish" ? "Qualifying" : "Race"}
          onToggle={() => setFreqView((v) => (v === "finish" ? "quali" : "finish"))}
        />
      ),
      snapshots: [
        { name: "freq-finish", active: freqView === "finish" },
        { name: "freq-quali", active: freqView === "quali" },
      ],
      render: ({ finishSummary, qualifyingSummary }) => (
        // Both tables stay mounted and overlap in the same grid cell, so
        // the container is always as tall as the taller one and swapping
        // only ever crossfades — it never collapses to find its new
        // height the way a single remounted view briefly did.
        <div className="ui-card-views">
          <div className={"ui-card-view" + (freqView === "finish" ? " active" : "")} aria-hidden={freqView !== "finish"}>
            <FinishPositionsGrid summary={finishSummary} />
          </div>
          <div className={"ui-card-view" + (freqView === "quali" ? " active" : "")} aria-hidden={freqView !== "quali"}>
            <QualifyingPositionsGrid summary={qualifyingSummary} />
          </div>
        </div>
      ),
    },
    {
      id: "podiumsD",
      title: "Driver Podiums",
      subtitle: "1st/2nd/3rd place finishes per driver.",
      snapshots: [{ name: "podiumsD", active: true }],
      render: ({ finishSummary }) => (
        <>
          <PodiumBars
            drivers={finishSummary.driverPodiums.map((d) => ({
              label: d.code,
              team: d.constructorName,
              color: d.color,
              podiums: d.podiums,
            }))}
            teams={[]}
          />
          <CardHeader subsection title="Constructor Podiums" subtitle="1st/2nd/3rd place finishes per team." />
          <PodiumBars
            drivers={[]}
            teams={finishSummary.teamPodiums.map((t) => ({
              label: t.constructorName,
              color: t.color,
              podiums: t.podiums,
            }))}
          />
        </>
      ),
    },
  ];
  const count = sections.length;

  function txFor(i: number, k: number) {
    return metrics.current.W / 2 - k * geom.current[i].c;
  }

  function nearestTo(stripX: number) {
    let best = 0;
    let bestDist = Infinity;
    geom.current.forEach((g, i) => {
      const d = Math.abs(g.c - stripX);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    });
    return best;
  }

  // Measures each card's natural size and writes every slot's position and
  // fitted scale straight to the DOM (no state: it's re-run on resize and
  // after every render, and React never sets these styles itself).
  // Every card is the same height (see .gw-card); its content keeps its
  // own proportions and is scaled so it exactly fills the frame's height
  // below the header, and the card takes whatever width that gives it.
  function fitContent(card: HTMLElement) {
    const fit = card.querySelector<HTMLElement>(".gw-fit");
    const frame = fit?.parentElement;
    if (!fit || !frame) return;
    // Always measure from a clean slate: switching season re-renders this
    // same card with a different-sized image, and a frame width or scale
    // left over from the previous season would otherwise constrain the
    // new measurement and crop the larger image.
    fit.style.transform = "";
    frame.style.width = "";
    if (forceLive) return;
    const fh = frame.clientHeight;
    const cw = fit.offsetWidth;
    const ch = fit.offsetHeight;
    if (!cw || !ch || !fh) return;
    const fs = fh / ch;
    fit.style.transform = `scale(${fs})`;
    frame.style.width = `${cw * fs}px`;
  }

  function layout() {
    const W = window.innerWidth;
    const H = window.innerHeight;
    const phone = W <= 640;
    const TOP = phone ? 84 : 96;
    const BOTTOM = phone ? 92 : 76;
    const availH = Math.max(160, H - TOP - BOTTOM);
    const availW = W - (phone ? 48 : 180);
    metrics.current = { W, TOP, availH };
    let x = 0;
    geom.current = sections.map((_, i) => {
      const card = cardRefs.current[i];
      const slot = slotRefs.current[i];
      if (!card || !slot) return { s: 1, c: x };
      fitContent(card);
      const nw = card.offsetWidth;
      const nh = card.offsetHeight;
      const s = Math.min(1, availH / nh, availW / nw);
      const w = nw * s;
      const h = nh * s;
      card.style.transform = `scale(${s})`;
      slot.style.left = `${x}px`;
      slot.style.top = `${(availH - h) / 2}px`;
      slot.style.width = `${w}px`;
      slot.style.height = `${h}px`;
      const g = { s, c: x + w / 2 };
      x += w + GAP;
      return g;
    });
  }

  function apply() {
    const strip = stripRef.current;
    if (!strip) return;
    const { k, tx, ty } = view.current;
    strip.style.transform = `translate(${tx.toFixed(1)}px, ${(metrics.current.TOP + ty).toFixed(1)}px) scale(${k.toFixed(4)})`;
    const f = nearestTo((metrics.current.W / 2 - tx) / k);
    if (f !== focusRef.current) {
      focusRef.current = f;
      setFocus(f);
    }
    wrapRef.current?.classList.toggle("zoomed", k > 1.02);
    if (zoomLevelRef.current) {
      zoomLevelRef.current.textContent =
        Math.abs(k - 1) < 0.02 ? "Fit" : `${Math.round(k * (geom.current[f]?.s ?? 1) * 100)}%`;
    }
  }

  function goTo(i: number, resetZoom = true) {
    const idx = Math.max(0, Math.min(count - 1, i));
    const k = resetZoom ? 1 : view.current.k;
    target.current = { k, tx: txFor(idx, k), ty: resetZoom ? 0 : view.current.ty };
  }

  // Zooms by `factor` keeping the screen point (px, py) fixed — the
  // standard map/canvas zoom.
  function zoomAt(px: number, py: number, factor: number) {
    target.current = null;
    const v = view.current;
    const k = Math.max(MIN_K, Math.min(MAX_K, v.k * factor));
    const f = k / v.k;
    const ly = py - metrics.current.TOP;
    view.current = { k, tx: px - (px - v.tx) * f, ty: ly - (ly - v.ty) * f };
    apply();
  }

  function zoomCentre(factor: number) {
    const { W, TOP, availH } = metrics.current;
    zoomAt(W / 2, TOP + availH / 2, factor);
  }

  // Both tab strips (desktop top bar, phone bottom bar) show the same tabs
  // and open the same card.
  const navLabels = sections.map((section) => section.navLabel ?? section.title);
  function jump(i: number) {
    goTo(i);
    dismissHint();
  }

  function dismissHint() {
    setHintGone(true);
  }

  // Clicking a side card brings it to the centre; clicking the centred
  // card toggles between "fit" and its full natural size (at least 1.8x),
  // zooming around the click point.
  function onCardClick(i: number, e: React.MouseEvent) {
    if (moved.current) return;
    dismissHint();
    if (i !== focusRef.current || view.current.k > 1.02) {
      goTo(i);
      return;
    }
    const v = view.current;
    const k = Math.min(MAX_K, Math.max(1.8, 1 / geom.current[i].s));
    const f = k / v.k;
    const ly = e.clientY - metrics.current.TOP;
    target.current = { k, tx: e.clientX - (e.clientX - v.tx) * f, ty: ly - (ly - v.ty) * f };
  }

  // Re-measure only when something can actually change a card's natural
  // size: the initial mount, a season switch (new data grids), or the
  // finish/qualifying toggle. Without a dependency array this used to
  // re-run after every commit, including every focus change while
  // dragging — forcing a synchronous reflow of every card (now some of
  // them stack two full tables) on each one. At fit zoom, keep the
  // focused card centred.
  useLayoutEffect(() => {
    // Capture mode (noSnapshot=1) renders cards at their natural size, so
    // the snapshot script records the content itself, not the framed card.
    wrapRef.current?.classList.toggle("gw-capture", forceLive);
    layout();
    if (Math.abs(view.current.k - 1) < 0.02 && !target.current) {
      view.current = { k: 1, tx: txFor(focusRef.current, 1), ty: 0 };
    }
    apply();
    stripRef.current?.classList.remove("pending");
    stripRef.current?.classList.add("entered");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [season, freqView, resultsView, forceLive, sizes, failedSnapshots]);

  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { d: number; mx: number; my: number } | null = null;
    let dragging = false;
    let downX = 0;
    let lastX = 0;
    let lastY = 0;
    let vx = 0;
    let vy = 0;
    let startFocus = 0;
    let coast: { vx: number; vy: number } | null = null;
    let settleTimer = 0;

    // After a wheel swipe or zoom ends near fit, glide onto the nearest card.
    function scheduleSettle() {
      window.clearTimeout(settleTimer);
      settleTimer = window.setTimeout(() => {
        if (dragging || pointers.size) return;
        if (view.current.k < 1.06) goTo(focusRef.current);
      }, 160);
    }

    function pinchState() {
      const [a, b] = [...pointers.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }

    // The bars, arrows and their controls sit inside the wrap, but presses,
    // drags and wheel scrolls on them must never move or zoom the cards.
    // The recap card's classification table and race-picker strip scroll
    // themselves too — without this a touch or drag on either always panned
    // the carousel first, so they only actually scrolled if you landed
    // exactly on their scrollbar.
    function onChrome(e: Event) {
      return (
        e.target instanceof Element &&
        !!e.target.closest(".gw-topbar, .gw-jumpbar, .gw-arrow, .recap-table, .recap-picker-strip")
      );
    }

    function onPointerDown(e: PointerEvent) {
      if (onChrome(e)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pointers.size === 2) {
        dragging = false;
        moved.current = true;
        wrap!.classList.remove("dragging");
        pinch = pinchState();
        return;
      }
      if (pointers.size > 2) return;
      dragging = true;
      moved.current = false;
      target.current = null;
      coast = null;
      vx = vy = 0;
      downX = lastX = e.clientX;
      lastY = e.clientY;
      startFocus = focusRef.current;
      wrap!.classList.add("dragging");
      // No setPointerCapture: it would retarget the click to wrap, so a
      // card's own onClick would never fire.
    }

    function onPointerMove(e: PointerEvent) {
      if (!pointers.has(e.pointerId)) return;
      pointers.set(e.pointerId, { x: e.clientX, y: e.clientY });
      if (pinch && pointers.size === 2) {
        const next = pinchState();
        view.current.tx += next.mx - pinch.mx;
        view.current.ty += next.my - pinch.my;
        if (pinch.d > 0) zoomAt(next.mx, next.my, next.d / pinch.d);
        pinch = next;
        return;
      }
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      lastX = e.clientX;
      lastY = e.clientY;
      if (Math.abs(e.clientX - downX) > DRAG_THRESHOLD) {
        moved.current = true;
        setHintGone(true);
      }
      const zoomed = view.current.k > 1.02;
      view.current.tx += dx;
      if (zoomed) view.current.ty += dy;
      vx = dx;
      vy = zoomed ? dy : 0;
      apply();
    }

    function onPointerUp(e: PointerEvent) {
      // Presses that started on the bars or arrows were never tracked.
      if (!pointers.delete(e.pointerId)) return;
      if (pointers.size < 2) pinch = null;
      if (pointers.size > 0) return;
      if (!dragging) {
        scheduleSettle();
        return;
      }
      dragging = false;
      wrap!.classList.remove("dragging");
      if (!moved.current) return;
      if (view.current.k <= 1.06) {
        // Flick-aware snap, but one swipe moves one card at most.
        let best = nearestTo((metrics.current.W / 2 - (view.current.tx + vx * 10)) / view.current.k);
        if (best === startFocus && Math.abs(vx) > 6) best += vx < 0 ? 1 : -1;
        goTo(Math.max(startFocus - 1, Math.min(startFocus + 1, best)));
      } else {
        coast = { vx, vy };
      }
    }

    // Vertical wheel zooms (the ask was "zoom via scroll"); a sideways
    // trackpad swipe or shift+wheel browses the strip instead. Trackpad
    // pinch arrives as ctrl+wheel with small deltas, hence its higher rate.
    function onWheel(e: WheelEvent) {
      if (onChrome(e)) {
        // The season menu, the recap card's classification table and its
        // race-picker strip are the things on/over the carousel that scroll
        // themselves; the browser must keep that wheel rather than have it
        // zoom the card.
        if (e.target instanceof Element && e.target.closest(".ui-menu, .recap-table, .recap-picker-strip")) return;
        e.preventDefault();
        return;
      }
      e.preventDefault();
      setHintGone(true);
      const unit = e.deltaMode === 1 ? 16 : e.deltaMode === 2 ? window.innerHeight : 1;
      let dx = e.deltaX * unit;
      let dy = e.deltaY * unit;
      if (e.shiftKey && !dx) {
        dx = dy;
        dy = 0;
      }
      if (!e.ctrlKey && Math.abs(dx) > Math.abs(dy)) {
        target.current = null;
        view.current.tx -= dx;
        apply();
      } else {
        zoomAt(e.clientX, e.clientY, Math.exp(-dy * (e.ctrlKey ? 0.01 : 0.0012)));
      }
      scheduleSettle();
    }

    // Safari's trackpad pinch sends gesture events instead of ctrl+wheel.
    let lastGestureScale = 1;
    type GestureLike = Event & { scale: number; clientX: number; clientY: number };
    function onGestureStart(e: Event) {
      if (onChrome(e)) return;
      e.preventDefault();
      lastGestureScale = 1;
    }
    function onGestureChange(e: Event) {
      if (onChrome(e)) return;
      e.preventDefault();
      const g = e as GestureLike;
      zoomAt(g.clientX, g.clientY, g.scale / lastGestureScale);
      lastGestureScale = g.scale;
    }
    function onGestureEnd(e: Event) {
      e.preventDefault();
      scheduleSettle();
    }

    function onKeyDown(e: KeyboardEvent) {
      const el = e.target as HTMLElement | null;
      if (el && (el.tagName === "INPUT" || el.tagName === "SELECT" || el.tagName === "TEXTAREA" || el.isContentEditable)) return;
      if (e.key === "ArrowRight") goTo(focusRef.current + 1);
      else if (e.key === "ArrowLeft") goTo(focusRef.current - 1);
      else if (e.key === "+" || e.key === "=") zoomCentre(1.25);
      else if (e.key === "-") zoomCentre(0.8);
      else if (e.key === "0" || e.key === "Escape") goTo(focusRef.current);
      else return;
      setHintGone(true);
    }

    function onResize() {
      layout();
      target.current = null;
      view.current = { k: 1, tx: txFor(focusRef.current, 1), ty: 0 };
      apply();
    }

    wrap.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    wrap.addEventListener("wheel", onWheel, { passive: false });
    wrap.addEventListener("gesturestart", onGestureStart);
    wrap.addEventListener("gesturechange", onGestureChange);
    wrap.addEventListener("gestureend", onGestureEnd);
    window.addEventListener("keydown", onKeyDown);
    window.addEventListener("resize", onResize);

    const grid = gridRef.current ? createLiveGrid(gridRef.current) : null;

    let raf = 0;
    function tick(now: number) {
      grid?.draw(now, view.current);
      const t = target.current;
      if (t) {
        const v = view.current;
        const next = {
          k: v.k + (t.k - v.k) * EASE,
          tx: v.tx + (t.tx - v.tx) * EASE,
          ty: v.ty + (t.ty - v.ty) * EASE,
        };
        if (Math.abs(t.k - next.k) < 0.002 && Math.abs(t.tx - next.tx) < 0.5 && Math.abs(t.ty - next.ty) < 0.5) {
          view.current = { ...t };
          target.current = null;
        } else {
          view.current = next;
        }
        apply();
      } else if (coast && !dragging) {
        view.current.tx += coast.vx;
        view.current.ty += coast.vy;
        coast.vx *= 0.92;
        coast.vy *= 0.92;
        if (Math.abs(coast.vx) < 0.2 && Math.abs(coast.vy) < 0.2) coast = null;
        apply();
      }
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);

    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      wrap.removeEventListener("wheel", onWheel);
      wrap.removeEventListener("gesturestart", onGestureStart);
      wrap.removeEventListener("gesturechange", onGestureChange);
      wrap.removeEventListener("gestureend", onGestureEnd);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      window.clearTimeout(settleTimer);
      cancelAnimationFrame(raf);
      grid?.destroy();
    };
    // Runs once: everything it reads that changes over time is a ref.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="gw-wrap" ref={wrapRef}>
      <h1 className="sr-only">Grid Walk — Formula 1 results explorer</h1>
      <div className="gw-pulse-a" />
      <div className="gw-pulse-b" />
      <canvas className="gw-grid" ref={gridRef} aria-hidden="true" />

      {/* "pending" is removed by the layout effect once every card has been
          measured and placed; React never rewrites this constant className. */}
      <div className="gw-strip pending" ref={stripRef}>
        {sections.map((section, i) => (
          <div
            key={section.id}
            ref={(el) => {
              slotRefs.current[i] = el;
            }}
            className={"gw-slot" + (i === focus ? " focus" : "")}
          >
            <div
              ref={(el) => {
                cardRefs.current[i] = el;
              }}
              className="gw-card ui-card"
              style={{ "--enter-i": i } as React.CSSProperties}
              role="button"
              tabIndex={0}
              aria-label={`${section.title}: ${section.subtitle}`}
              onClick={(e) => onCardClick(i, e)}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ") {
                  e.preventDefault();
                  goTo(i);
                }
              }}
            >
              <div className="gw-card-inner">
                {!section.bakedTitle && (
                  <CardHeader title={section.title} subtitle={section.subtitle} actions={section.headerActions?.()} />
                )}
                <div className="gw-frame">
                  <div className="gw-fit gw-snap-target" data-section={section.id}>
                    {renderCardBody(section)}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="gw-topbar">
        {/* The logo is its own island, and takes you back to the first card. */}
        <Logo
          className="gw-brand"
          label="Grid Walk: back to the first card"
          onClick={() => {
            goTo(0);
            dismissHint();
          }}
        />
        {/* On desktop this is one nav bar island: the jump tabs, then About
            and the toggles. On phones it dissolves (display: contents), the
            tabs are hidden, and the controls sit on their own as before. */}
        <Island className="gw-navpill">
          <nav className="gw-toptabs" aria-label="Jump to">
            <TabStrip className="gw-toptabs-track" items={navLabels} active={focus} onSelect={jump} />
          </nav>
          <Divider className="gw-navpill-divider" />
          <div className="gw-topbar-right">
            <Pill accent className="gw-about-link" onClick={() => router.push("/about")}>
              About
            </Pill>
            <ThemeToggle />
            <AccentToggle />
            <SeasonSelector initialSeason={season} />
          </div>
        </Island>
        <DisclaimerButton className="gw-disclaimer-anchor--top" />
      </div>

      <div className={"gw-hint" + (hintGone ? " gone" : "")} aria-hidden="true">
        <span className="gw-hint-wide">
          {season} season · drag or use ← → to browse · scroll or pinch to zoom · click a card for full size
        </span>
        <span className="gw-hint-narrow">Swipe to browse · pinch to zoom · tap for full size</span>
      </div>

      <button
        type="button"
        className="gw-arrow prev"
        aria-label="Previous card"
        disabled={focus === 0}
        onClick={() => {
          goTo(focus - 1);
          dismissHint();
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 18l-6-6 6-6" />
        </svg>
      </button>
      <button
        type="button"
        className="gw-arrow next"
        aria-label="Next card"
        disabled={focus === count - 1}
        onClick={() => {
          goTo(focus + 1);
          dismissHint();
        }}
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
          <path d="M9 18l6-6-6-6" />
        </svg>
      </button>

      <div className="gw-jumpbar">
        <DisclaimerButton className="gw-disclaimer-anchor--bottom" />
        <Island className="gw-jumpbar-island">
          <TabStrip className="gw-jumpbar-pills" items={navLabels} active={focus} onSelect={jump} />
          <Divider className="gw-jumpbar-divider" />
          <div className="gw-zoomctl">
            <IconPill className="gw-zoom-icon" aria-label="Zoom out" onClick={() => zoomCentre(0.8)}>
              −
            </IconPill>
            <span className="gw-zoom-level" ref={zoomLevelRef}>
              Fit
            </span>
            <IconPill className="gw-zoom-icon" aria-label="Zoom in" onClick={() => zoomCentre(1.25)}>
              +
            </IconPill>
            <Pill accent onClick={() => goTo(focusRef.current)}>
              Fit
            </Pill>
          </div>
        </Island>
      </div>
    </div>
  );
}
