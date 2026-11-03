"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import "@/components/gridwalk/gridwalk.css";
import "./desk.css";
import { createLiveGrid } from "@/components/gridwalk/liveGrid";
import RecapCard from "@/components/RecapCard";
import AboutCard from "@/components/AboutCard";
import ThemeToggle from "@/components/ThemeToggle";
import AccentToggle from "@/components/AccentToggle";
import { Island, Pill, IconPill, Logo, CardHeader } from "@/components/ui";
import type { RecapData } from "@/lib/recap";
import {
  isAccent,
  isTheme,
  snapshotPath,
  type Accent,
  type SnapshotName,
  type Theme,
} from "@/lib/variant-constants";

interface DeskViewProps {
  year: number;
  sizes: Record<string, { w: number; h: number }> | null;
  recap: RecapData | null;
  initialVariant: { accent: Accent; theme: Theme | null };
}

type SheetDef = {
  id: string;
  title: string;
  subtitle: string;
  kind: "snapshot" | "live";
  snapshotName?: SnapshotName;
};

type Group = { id: string; label: string; sheets: SheetDef[] };
type Geom = { w: number; h: number };
type Pose = { x: number; y: number };
type Cam = { k: number; tx: number; ty: number };

// Every sheet is scaled to this height; its width follows the card's own
// aspect ratio, measured after mount (see the layout effect).
const SHEET_H = 430;
const GAP = 36; // between sheets in a row
const ROW_GAP = 64; // between rows
const LABEL_H = 30; // room above each row for its label
const PAD = 72; // table padding around the content
const K_MIN = 0.25;
const K_MAX = 2.5;
const DRAG_THRESHOLD = 4;

// The season's cards, grouped by what they're about. Each group is one row
// of the table; a sheet can be dragged to reorder within its row.
const GROUPS: Group[] = [
  {
    id: "latest",
    label: "Latest race",
    sheets: [{ id: "recap", title: "Latest Race", subtitle: "The most recent race, in your own time zone.", kind: "live" }],
  },
  {
    id: "championship",
    label: "Championship",
    sheets: [
      {
        id: "results",
        title: "Drivers Results",
        subtitle: "Points scored by each driver per Grand Prix.",
        kind: "snapshot",
        snapshotName: "results-drivers",
      },
      {
        id: "evolution",
        title: "Driver Points Evolution",
        subtitle: "Cumulative points scored by each driver across the season.",
        kind: "snapshot",
        snapshotName: "evolution",
      },
      {
        id: "podiumsD",
        title: "Driver Podiums",
        subtitle: "1st/2nd/3rd place finishes per driver.",
        kind: "snapshot",
        snapshotName: "podiumsD",
      },
    ],
  },
  {
    id: "races",
    label: "Race by race",
    sheets: [
      {
        id: "positions",
        title: "Positions",
        subtitle: "Where each driver finished in every Grand Prix.",
        kind: "snapshot",
        snapshotName: "positions",
      },
      {
        id: "gained",
        title: "Positions Gained",
        subtitle: "Places gained or lost from the grid to the flag in every Grand Prix.",
        kind: "snapshot",
        snapshotName: "gained",
      },
      {
        id: "freq",
        title: "Finish Frequency",
        subtitle: "How often each driver has finished in each position.",
        kind: "snapshot",
        snapshotName: "freq-finish",
      },
    ],
  },
  {
    id: "about",
    label: "About",
    sheets: [{ id: "about", title: "About this site", subtitle: "Who built it, how, and what it runs on.", kind: "live" }],
  },
];

const ALL_SHEETS: SheetDef[] = GROUPS.flatMap((g) => g.sheets);

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

function clampNum(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default function DeskView({ year, sizes, recap, initialVariant }: DeskViewProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomLevelRef = useRef<HTMLSpanElement>(null);
  const sheetRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const labelRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const [variant, setVariant] = useState(initialVariant);
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

  const [failedSnapshots, setFailedSnapshots] = useState<Set<string>>(new Set());
  const [hintGone, setHintGone] = useState(false);

  // Measured sheet sizes drive the sheet elements' width/height (React);
  // positions are imperative (refs + style.transform) since they change on
  // every pointer move while reordering.
  const [geom, setGeom] = useState<Record<string, Geom>>({});
  const geomRef = useRef<Record<string, Geom>>({});
  const poses = useRef<Record<string, Pose>>({});
  const order = useRef<string[][]>(GROUPS.map((g) => g.sheets.map((s) => s.id)));
  const bounds = useRef({ w: 0, h: 0 });
  const [laidOut, setLaidOut] = useState(false);

  // Fit each card's content to its frame, then scale the whole card to the
  // sheet height — GridWalk's own two-pass fitContent()/layout() technique,
  // so the sheets are the production cards at a smaller size.
  useLayoutEffect(() => {
    function fitContent(card: HTMLElement) {
      const fit = card.querySelector<HTMLElement>(".gw-fit");
      const frame = fit?.parentElement ?? null;
      if (!fit || !frame) return;
      fit.style.transform = "";
      frame.style.width = "";
      const fh = frame.clientHeight;
      const cw = fit.offsetWidth;
      const ch = fit.offsetHeight;
      if (!cw || !ch || !fh) return;
      const fs = fh / ch;
      fit.style.transform = `scale(${fs})`;
      frame.style.width = `${cw * fs}px`;
    }
    const measured: Record<string, Geom> = {};
    ALL_SHEETS.forEach((def) => {
      const card = cardRefs.current[def.id];
      if (!card) return;
      card.style.transform = "";
      fitContent(card);
      const nw = card.offsetWidth;
      const nh = card.offsetHeight || 900;
      const s = SHEET_H / nh;
      card.style.transform = `scale(${s})`;
      measured[def.id] = { w: nw * s, h: SHEET_H };
    });
    geomRef.current = measured;
    setGeom(measured);
    setLaidOut(true);
  }, []);

  // ---------- camera ----------
  const cam = useRef<Cam>({ k: 1, tx: 0, ty: 0 });
  const animStart = useRef<Cam>({ k: 1, tx: 0, ty: 0 });
  const target = useRef<(Cam & { dur: number; t0: number | null }) | null>(null);

  function applyCam() {
    const world = worldRef.current;
    if (!world) return;
    const { k, tx, ty } = cam.current;
    world.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k.toFixed(4)})`;
    if (zoomLevelRef.current) zoomLevelRef.current.textContent = `${Math.round(k * 100)}%`;
  }

  function animateTo(to: Cam, dur: number) {
    target.current = { ...to, dur, t0: null };
  }

  function applyPose(id: string) {
    const el = sheetRefs.current[id];
    const p = poses.current[id];
    if (!el || !p) return;
    el.style.transform = `translate(${p.x.toFixed(1)}px, ${p.y.toFixed(1)}px)`;
  }

  // Lays every row out left-aligned under its label, from the current
  // order. The sheet being dragged (if any) keeps following the pointer;
  // everything else slides to its slot.
  function layout(skipId: string | null) {
    let y = PAD + LABEL_H;
    let maxW = 0;
    order.current.forEach((row, r) => {
      const label = labelRefs.current[GROUPS[r].id];
      if (label) {
        label.style.left = `${PAD}px`;
        label.style.top = `${y - LABEL_H}px`;
      }
      let x = PAD;
      row.forEach((id, i) => {
        const g = geomRef.current[id] ?? { w: SHEET_H, h: SHEET_H };
        if (id !== skipId) {
          poses.current[id] = { x, y };
          const el = sheetRefs.current[id];
          if (el) el.style.zIndex = String(i + 1);
          applyPose(id);
        }
        x += g.w + GAP;
      });
      maxW = Math.max(maxW, x - GAP);
      y += SHEET_H + ROW_GAP + LABEL_H;
    });
    bounds.current = { w: maxW + PAD, h: y - ROW_GAP - LABEL_H + PAD };
    const t = tableRef.current;
    if (t) {
      t.style.width = `${bounds.current.w}px`;
      t.style.height = `${bounds.current.h}px`;
    }
  }

  function settleAll(settled: boolean) {
    ALL_SHEETS.forEach((d) => sheetRefs.current[d.id]?.classList.toggle("settled", settled));
  }

  // Zoom so the whole table fits, centred.
  function fitAll(animated: boolean) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const vw = wrap.clientWidth;
    const vh = wrap.clientHeight;
    const { w, h } = bounds.current;
    const k = clampNum(Math.min((vw - 32) / w, (vh - 32) / h, 1), K_MIN, K_MAX);
    const to = { k, tx: vw / 2 - (w / 2) * k, ty: vh / 2 - (h / 2) * k };
    if (animated) animateTo(to, 500);
    else {
      cam.current = to;
      applyCam();
    }
  }

  // Opening view: as wide as the table, starting at the top, so the first
  // rows are readable and the rest is a pan away.
  function fitWidth() {
    const wrap = wrapRef.current;
    if (!wrap) return;
    const vw = wrap.clientWidth;
    const { w } = bounds.current;
    const k = clampNum(Math.min((vw - 32) / w, 1), K_MIN, K_MAX);
    cam.current = { k, tx: vw / 2 - (w / 2) * k, ty: 16 };
    applyCam();
  }

  function zoomAt(px: number, py: number, factor: number) {
    const v = cam.current;
    const k = clampNum(v.k * factor, K_MIN, K_MAX);
    const f = k / v.k;
    cam.current = { k, tx: px - (px - v.tx) * f, ty: py - (py - v.ty) * f };
    applyCam();
  }

  function zoomCentre(factor: number) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    target.current = null;
    zoomAt(wrap.clientWidth / 2, wrap.clientHeight / 2, factor);
  }

  // Initial placement once the sheets have been measured.
  useEffect(() => {
    if (!laidOut) return;
    layout(null);
    fitWidth();
    requestAnimationFrame(() => settleAll(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [laidOut]);

  // ---------- raf loop: eases the camera + drives the live grid ----------
  useEffect(() => {
    const canvas = gridCanvasRef.current;
    const grid = canvas ? createLiveGrid(canvas) : null;
    let raf = 0;
    function tick(now: number) {
      const t = target.current;
      if (t) {
        if (t.t0 === null) {
          t.t0 = now;
          animStart.current = { ...cam.current };
        }
        const p = Math.min(1, (now - t.t0) / t.dur);
        const e = easeOutCubic(p);
        const s = animStart.current;
        cam.current = {
          k: s.k + (t.k - s.k) * e,
          tx: s.tx + (t.tx - s.tx) * e,
          ty: s.ty + (t.ty - s.ty) * e,
        };
        if (p >= 1) target.current = null;
        applyCam();
      }
      grid?.draw(now, cam.current);
      raf = requestAnimationFrame(tick);
    }
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf);
      grid?.destroy();
    };
  }, []);

  // ---------- pointer handling: reorder sheets, pan the table, zoom ----------
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    // A sheet under the pointer is dragged along its row; the others slide
    // aside to make room and it snaps into the gap when dropped. Empty table
    // pans. Repaints are batched to one per frame.
    let activeId: string | null = null;
    let activeRow = -1;
    let panning = false;
    let grabX = 0;
    let grabY = 0;
    let base: Pose = { x: 0, y: 0 };
    let moved = false;
    let panStart = { x: 0, y: 0, tx: 0, ty: 0 };
    let pending: (() => void) | null = null;
    let rafId = 0;
    const pointers = new Map<number, { x: number; y: number }>();
    let pinch: { d: number; mx: number; my: number } | null = null;

    function schedule(fn: () => void) {
      pending = fn;
      if (!rafId) {
        rafId = requestAnimationFrame(() => {
          rafId = 0;
          const f = pending;
          pending = null;
          f?.();
        });
      }
    }

    function pinchState() {
      const [a, b] = [...pointers.values()];
      return { d: Math.hypot(a.x - b.x, a.y - b.y), mx: (a.x + b.x) / 2, my: (a.y + b.y) / 2 };
    }

    // Controls inside a sheet (the Latest Race card's race picker and
    // table) must keep working as controls, not start a drag.
    function onSheetControl(e: Event) {
      return (
        e.target instanceof Element &&
        !!e.target.closest(".recap-table, .recap-picker-strip, button, a, input, select")
      );
    }

    // Where the dragged sheet would slot in, judged by its centre against
    // the other sheets' centres in the row.
    function reorderIfNeeded(id: string) {
      const row = order.current[activeRow];
      const p = poses.current[id];
      const g = geomRef.current[id];
      if (!row || !p || !g) return;
      const centre = p.x + g.w / 2;
      const others = row.filter((o) => o !== id);
      let index = 0;
      let x = PAD;
      for (const o of others) {
        const og = geomRef.current[o] ?? { w: SHEET_H, h: SHEET_H };
        if (centre > x + og.w / 2) index += 1;
        x += og.w + GAP;
      }
      const current = row.indexOf(id);
      if (index === current) return;
      others.splice(index, 0, id);
      order.current[activeRow] = others;
      layout(id);
    }

    function dropActive() {
      if (!activeId) return;
      const id = activeId;
      activeId = null;
      if (rafId) {
        cancelAnimationFrame(rafId);
        rafId = 0;
        pending?.();
        pending = null;
      }
      const el = sheetRefs.current[id];
      if (!el) return;
      el.classList.remove("lifted");
      el.classList.add("settled");
      layout(null);
      if (moved) setHintGone(true);
    }

    function onPointerDown(e: PointerEvent) {
      if (e.target instanceof Element && e.target.closest(".dk-topbar, .dk-ctl")) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      const rect = wrap!.getBoundingClientRect();
      pointers.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (pointers.size === 2) {
        dropActive();
        panning = false;
        wrap!.classList.remove("panning");
        pinch = pinchState();
        return;
      }
      if (pointers.size > 2) return;
      target.current = null;
      const sheetEl = e.target instanceof Element ? e.target.closest<HTMLElement>(".dk-sheet") : null;
      const id = sheetEl?.dataset.id ?? null;
      if (id && poses.current[id]) {
        if (onSheetControl(e)) return;
        activeId = id;
        activeRow = order.current.findIndex((row) => row.includes(id));
        moved = false;
        base = { ...poses.current[id] };
        grabX = e.clientX;
        grabY = e.clientY;
        sheetEl!.style.zIndex = "50";
        sheetEl!.classList.remove("settled");
        sheetEl!.classList.add("lifted");
        sheetEl!.setPointerCapture(e.pointerId);
        return;
      }
      panning = true;
      moved = false;
      panStart = { x: e.clientX, y: e.clientY, tx: cam.current.tx, ty: cam.current.ty };
      wrap!.classList.add("panning");
      wrap!.setPointerCapture(e.pointerId);
    }

    function onPointerMove(e: PointerEvent) {
      if (pointers.has(e.pointerId)) {
        const rect = wrap!.getBoundingClientRect();
        pointers.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      }
      if (pinch && pointers.size === 2) {
        const next = pinchState();
        cam.current.tx += next.mx - pinch.mx;
        cam.current.ty += next.my - pinch.my;
        if (pinch.d > 0) zoomAt(next.mx, next.my, next.d / pinch.d);
        else applyCam();
        pinch = next;
        return;
      }
      if (activeId) {
        const id = activeId;
        if (Math.hypot(e.clientX - grabX, e.clientY - grabY) > DRAG_THRESHOLD) moved = true;
        if (!moved) return;
        const k = cam.current.k;
        const nx = base.x + (e.clientX - grabX) / k;
        const ny = base.y + (e.clientY - grabY) / k;
        schedule(() => {
          const p = poses.current[id];
          if (!p) return;
          p.x = nx;
          p.y = ny;
          applyPose(id);
          reorderIfNeeded(id);
        });
      } else if (panning) {
        const dx = e.clientX - panStart.x;
        const dy = e.clientY - panStart.y;
        if (Math.hypot(dx, dy) > DRAG_THRESHOLD) moved = true;
        cam.current.tx = panStart.tx + dx;
        cam.current.ty = panStart.ty + dy;
        schedule(applyCam);
      }
    }

    function onPointerUp(e: PointerEvent) {
      pointers.delete(e.pointerId);
      if (pointers.size < 2) pinch = null;
      if (activeId) dropActive();
      if (panning) {
        panning = false;
        wrap!.classList.remove("panning");
        if (moved) setHintGone(true);
      }
    }

    // Wheel zooms about the cursor; a trackpad pinch arrives as ctrl+wheel.
    // Scrollable regions inside the Latest Race card keep their own scroll.
    function onWheel(e: WheelEvent) {
      if (e.target instanceof Element && e.target.closest(".recap-table, .recap-picker-strip, .dk-topbar, .dk-ctl")) return;
      e.preventDefault();
      target.current = null;
      const rect = wrap!.getBoundingClientRect();
      const factor = Math.exp(-e.deltaY * (e.ctrlKey ? 0.01 : 0.0016));
      zoomAt(e.clientX - rect.left, e.clientY - rect.top, factor);
      setHintGone(true);
    }

    function onResize() {
      applyCam();
    }

    wrap.addEventListener("pointerdown", onPointerDown);
    wrap.addEventListener("pointermove", onPointerMove);
    wrap.addEventListener("pointerup", onPointerUp);
    wrap.addEventListener("pointercancel", onPointerUp);
    wrap.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("resize", onResize);
    return () => {
      wrap.removeEventListener("pointerdown", onPointerDown);
      wrap.removeEventListener("pointermove", onPointerMove);
      wrap.removeEventListener("pointerup", onPointerUp);
      wrap.removeEventListener("pointercancel", onPointerUp);
      wrap.removeEventListener("wheel", onWheel);
      window.removeEventListener("resize", onResize);
      if (rafId) cancelAnimationFrame(rafId);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function renderSnapshot(name: SnapshotName) {
    const size = sizes?.[name];
    if (!size) {
      return (
        <div className="gw-snap-missing" style={{ width: 400, height: 300 }}>
          <span>{year} images are not ready yet</span>
        </div>
      );
    }
    const light = snapshotPath(year, variant.accent, "light", name);
    const dark = snapshotPath(year, variant.accent, "dark", name);
    const chosen = variant.theme ? snapshotPath(year, variant.accent, variant.theme, name) : light;
    if (failedSnapshots.has(chosen)) {
      return (
        <div className="gw-snap-missing" style={{ width: size.w, height: size.h }}>
          <span>Image unavailable</span>
        </div>
      );
    }
    const img = (
      // eslint-disable-next-line @next/next/no-img-element
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

  function renderBody(def: SheetDef) {
    if (def.id === "recap") return <RecapCard data={recap} />;
    if (def.id === "about") return <AboutCard />;
    return renderSnapshot(def.snapshotName!);
  }

  return (
    <div className="dk-wrap" ref={wrapRef}>
      <h1 className="sr-only">Grid Walk desk — experimental layout</h1>
      <canvas className="gw-grid" ref={gridCanvasRef} aria-hidden="true" />

      <div className={"dk-world" + (laidOut ? "" : " pending")} ref={worldRef}>
        <div className="dk-table" ref={tableRef} aria-hidden="true" />
        {GROUPS.map((g) => (
          <div
            key={g.id}
            className="dk-group-label"
            ref={(el) => {
              labelRefs.current[g.id] = el;
            }}
          >
            {g.label}
          </div>
        ))}
        {ALL_SHEETS.map((def) => {
          const g = geom[def.id];
          return (
            <div
              key={def.id}
              ref={(el) => {
                sheetRefs.current[def.id] = el;
              }}
              className="dk-sheet"
              data-id={def.id}
              style={g ? { width: g.w, height: g.h } : undefined}
              aria-label={`${def.title}: ${def.subtitle}`}
            >
              <div
                className="gw-card ui-card"
                ref={(el) => {
                  cardRefs.current[def.id] = el;
                }}
              >
                <div className="gw-card-inner">
                  <CardHeader title={def.title} subtitle={def.subtitle} />
                  <div className="gw-frame">
                    <div className="gw-fit">{renderBody(def)}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dk-topbar">
        <Logo href="/" label="Back to Grid Walk" />
        <Island className="dk-navpill">
          <span className="dk-experimental-tag">Experimental table layout</span>
          <ThemeToggle />
          <AccentToggle />
        </Island>
      </div>

      <div className={"dk-hint" + (hintGone ? " gone" : "")} aria-hidden="true">
        Drag the table to pan · scroll to zoom · drag a card to reorder its row
      </div>

      <div className="dk-ctl">
        <IconPill aria-label="Zoom out" onClick={() => zoomCentre(0.8)}>
          −
        </IconPill>
        <span className="dk-zoom-level" ref={zoomLevelRef}>
          100%
        </span>
        <IconPill aria-label="Zoom in" onClick={() => zoomCentre(1.25)}>
          +
        </IconPill>
        <Pill
          accent
          onClick={() => {
            setHintGone(true);
            fitAll(true);
          }}
        >
          Fit all
        </Pill>
      </div>
    </div>
  );
}
