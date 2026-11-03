"use client";

import { useEffect, useLayoutEffect, useRef, useState, type CSSProperties, type ReactNode } from "react";
import "@/components/gridwalk/gridwalk.css";
import "./desk.css";
import { createLiveGrid } from "@/components/gridwalk/liveGrid";
import RecapCard from "@/components/RecapCard";
import AboutCard from "@/components/AboutCard";
import ThemeToggle from "@/components/ThemeToggle";
import AccentToggle from "@/components/AccentToggle";
import SeasonSelector from "@/components/SeasonSelector";
import { Island, Pill, IconPill, Divider, Logo, CardHeader, CardToggle } from "@/components/ui";
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
  navLabel?: string; // the jump tab's label, when shorter than the title
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
const ENTER_STAGGER = 90; // ms between one sheet's arrival and the next
const ENTER_DUR = 600; // ms a sheet takes to arrive (matches desk.css)

// The season's cards, grouped by what they're about. Each group is one row
// of the table, in this fixed order.
const GROUPS: Group[] = [
  {
    id: "latest",
    label: "Latest race",
    sheets: [{ id: "recap", title: "Latest Race", navLabel: "Latest Race", subtitle: "The most recent race, in your own time zone.", kind: "live" }],
  },
  {
    id: "championship",
    label: "Championship",
    sheets: [
      {
        id: "results",
        navLabel: "Points Finishes",
        title: "Drivers Results",
        subtitle: "Points scored by each driver per Grand Prix.",
        kind: "snapshot",
        snapshotName: "results-drivers",
      },
      {
        id: "evolution",
        navLabel: "Points Evolution",
        title: "Driver Points Evolution",
        subtitle: "Cumulative points scored by each driver across the season.",
        kind: "snapshot",
        snapshotName: "evolution",
      },
      {
        id: "podiumsD",
        navLabel: "Driver Podiums",
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
        navLabel: "Position Frequency",
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

// Past seasons have no Latest Race card (as on the main site), so their
// table starts at the Championship row.
function groupsFor(hasRecap: boolean): Group[] {
  return hasRecap ? GROUPS : GROUPS.filter((g) => g.id !== "latest");
}

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

function clampNum(v: number, lo: number, hi: number) {
  return Math.max(lo, Math.min(hi, v));
}

export default function DeskView({ year, sizes, recap, initialVariant }: DeskViewProps) {
  // Remounted by the page (keyed on the year) whenever the season changes,
  // so these are fixed for the component's lifetime.
  const groups = groupsFor(recap !== null);
  const allSheets = groups.flatMap((g) => g.sheets);
  const wrapRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const tableRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const zoomLevelRef = useRef<HTMLSpanElement>(null);
  const mmBoxRef = useRef<HTMLDivElement>(null);
  const mmViewportRef = useRef<HTMLDivElement>(null);
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
  // The jump tabs: one per card but About (which has its own pill). The
  // accent marker slides to the open tab; the tab row itself never moves.
  const tabs = allSheets.filter((d) => d.id !== "about");
  const [activeTab, setActiveTab] = useState(tabs[0]?.id ?? "");
  const activeTabRef = useRef(activeTab);
  const tabRefs = useRef<Record<string, HTMLButtonElement | null>>({});
  const [marker, setMarker] = useState<{ left: number; width: number } | null>(null);
  useLayoutEffect(() => {
    function place() {
      const el = tabRefs.current[activeTab];
      setMarker(el ? { left: el.offsetLeft, width: el.offsetWidth } : null);
    }
    place();
    window.addEventListener("resize", place);
    return () => window.removeEventListener("resize", place);
  }, [activeTab]);
  // The two toggled cards, as on the main site: both views stay mounted
  // and crossfade, so the sheet keeps one measured size.
  const [resultsView, setResultsView] = useState<"drivers" | "teams">("drivers");
  const [freqView, setFreqView] = useState<"finish" | "quali">("finish");

  // Measured sheet sizes drive the sheet elements' width/height (React);
  // positions are imperative (refs + style.transform), set by layout().
  const [geom, setGeom] = useState<Record<string, Geom>>({});
  const geomRef = useRef<Record<string, Geom>>({});
  const poses = useRef<Record<string, Pose>>({});
  const bounds = useRef({ w: 0, h: 0 });
  const [laidOut, setLaidOut] = useState(false);

  // The overview in the corner: the table in miniature — every sheet as a
  // labelled shape under its row label, plus the viewport. Built by
  // layout(). On narrow screens it sits folded small; a tap opens it full
  // size and it folds away again shortly after the last touch.
  type MmTile = { id: string; title: string; x: number; y: number; w: number; h: number };
  type MmLabel = { id: string; label: string; x: number; y: number };
  const [mm, setMm] = useState<{ w: number; h: number; tiles: MmTile[]; labels: MmLabel[] }>({
    w: 1,
    h: 1,
    tiles: [],
    labels: [],
  });
  const [mmCompact, setMmCompact] = useState(false);
  const [mmOpen, setMmOpen] = useState(false);
  const MM_W = mmCompact ? 300 : 360;

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
    allSheets.forEach((def) => {
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
    // once per mount: the sheet set is fixed for the component's lifetime
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
    // The open tab follows whichever card is nearest the middle of the view.
    const wrap0 = wrapRef.current;
    if (wrap0) {
      const cx = (wrap0.clientWidth / 2 - tx) / k;
      const cy = (wrap0.clientHeight / 2 - ty) / k;
      let best = activeTabRef.current;
      let bd = Infinity;
      for (const t of tabs) {
        const p = poses.current[t.id];
        const g = geomRef.current[t.id];
        if (!p || !g) continue;
        const d = Math.hypot(p.x + g.w / 2 - cx, p.y + g.h / 2 - cy);
        if (d < bd) {
          bd = d;
          best = t.id;
        }
      }
      if (best !== activeTabRef.current) {
        activeTabRef.current = best;
        setActiveTab(best);
      }
    }
    const vp = mmViewportRef.current;
    const wrap = wrapRef.current;
    const box = mmBoxRef.current;
    if (vp && wrap && box && bounds.current.w) {
      const s = box.offsetWidth / bounds.current.w; // offsetWidth ignores the fold transform
      vp.style.left = `${(-tx / k) * s}px`;
      vp.style.top = `${(-ty / k) * s}px`;
      vp.style.width = `${(wrap.clientWidth / k) * s}px`;
      vp.style.height = `${(wrap.clientHeight / k) * s}px`;
    }
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

  // Lays every row out left-aligned under its label.
  function layout() {
    let y = PAD + LABEL_H;
    let maxW = 0;
    const labels: MmLabel[] = [];
    groups.forEach((group) => {
      const label = labelRefs.current[group.id];
      if (label) {
        label.style.left = `${PAD}px`;
        label.style.top = `${y - LABEL_H}px`;
      }
      labels.push({ id: group.id, label: group.label, x: PAD, y: y - LABEL_H });
      let x = PAD;
      group.sheets.forEach(({ id }) => {
        const g = geomRef.current[id] ?? { w: SHEET_H, h: SHEET_H };
        poses.current[id] = { x, y };
        applyPose(id);
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
    setMm({
      w: bounds.current.w,
      h: bounds.current.h,
      tiles: allSheets.flatMap((d) => {
        const p = poses.current[d.id];
        const g = geomRef.current[d.id];
        return p && g ? [{ id: d.id, title: d.title, x: p.x, y: p.y, w: g.w, h: g.h }] : [];
      }),
      labels,
    });
  }

  function settleAll(settled: boolean) {
    allSheets.forEach((d) => sheetRefs.current[d.id]?.classList.toggle("settled", settled));
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
  function openingView(): Cam {
    const wrap = wrapRef.current;
    const vw = wrap?.clientWidth ?? 1200;
    const { w } = bounds.current;
    const k = clampNum(Math.min((vw - 32) / w, 1), K_MIN, K_MAX);
    return { k, tx: vw / 2 - (w / 2) * k, ty: 16 };
  }

  function zoomAt(px: number, py: number, factor: number) {
    const v = cam.current;
    const k = clampNum(v.k * factor, K_MIN, K_MAX);
    const f = k / v.k;
    cam.current = { k, tx: px - (px - v.tx) * f, ty: py - (py - v.ty) * f };
    applyCam();
  }

  function fitAllByUser() {
    userMoved.current = true;
    fitAll(true);
  }

  function userMovedByClick() {
    userMoved.current = true;
  }

  // Glide to a sheet, filling the height of the view (the jump tabs and
  // the About pill).
  function goToSheet(id: string) {
    const wrap = wrapRef.current;
    const p = poses.current[id];
    const g = geomRef.current[id];
    if (!wrap || !p || !g) return;
    setHintGone(true);
    userMoved.current = true;
    const vw = wrap.clientWidth;
    const vh = wrap.clientHeight;
    const k = clampNum(Math.min((vh - 120) / g.h, (vw - 32) / g.w, 1), K_MIN, K_MAX);
    animateTo({ k, tx: vw / 2 - (p.x + g.w / 2) * k, ty: vh / 2 - (p.y + g.h / 2) * k }, 700);
  }

  function zoomCentre(factor: number) {
    const wrap = wrapRef.current;
    if (!wrap) return;
    userMoved.current = true;
    target.current = null;
    zoomAt(wrap.clientWidth / 2, wrap.clientHeight / 2, factor);
  }

  // Set by any user input, so the opening glide never fights a visitor
  // who has already started moving the table.
  const userMoved = useRef(false);

  // Initial placement once the sheets have been measured, then the
  // start-up: the camera sits on the whole table while the sheets arrive
  // one by one (CSS, see .dk-world.entered), and once the last has landed
  // the camera glides in to the opening view.
  useEffect(() => {
    if (!laidOut) return;
    layout();
    const world = worldRef.current;
    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    if (reduced) {
      cam.current = openingView();
      applyCam();
      requestAnimationFrame(() => settleAll(true));
      return;
    }
    fitAll(false);
    world?.classList.add("entered");
    const arrival = allSheets.length * ENTER_STAGGER + ENTER_DUR;
    const timer = window.setTimeout(() => {
      if (!userMoved.current) animateTo(openingView(), 1100);
    }, arrival + 150);
    requestAnimationFrame(() => settleAll(true));
    return () => window.clearTimeout(timer);
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ---------- pointer handling: pan the table, zoom, the overview ----------
  useEffect(() => {
    const wrap = wrapRef.current;
    if (!wrap) return;

    // Dragging anywhere on the table (sheets included) pans; two fingers
    // pinch-zoom. Repaints are batched to one per frame.
    let panning = false;
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
    // table) must keep working as controls, not start a pan.
    function onSheetControl(e: Event) {
      return (
        e.target instanceof Element &&
        !!e.target.closest(".recap-table, .recap-picker-strip, button, a, input, select")
      );
    }

    // ----- the overview -----
    // Narrow screens: folded small until tapped; folds away again a moment
    // after the last touch, or as soon as the table itself is dragged.
    const mq = window.matchMedia("(max-width: 640px)");
    let compact = mq.matches;
    let open = false;
    let closeTimer = 0;
    setMmCompact(compact);
    function setOpen(v: boolean) {
      open = v;
      setMmOpen(v);
    }
    function foldLater() {
      window.clearTimeout(closeTimer);
      closeTimer = window.setTimeout(() => setOpen(false), 2200);
    }
    function onMqChange() {
      compact = mq.matches;
      setMmCompact(compact);
      window.clearTimeout(closeTimer);
      setOpen(false);
    }

    // Press or drag on the overview to bring that part of the table into
    // view. Mapped through the box's on-screen size, so the folded
    // (scaled-down) box on phones maps the same way.
    function onMinimapPoint(clientX: number, clientY: number) {
      const box = mmBoxRef.current;
      if (!box) return;
      userMoved.current = true;
      const rect = box.getBoundingClientRect();
      if (!rect.width || !rect.height) return;
      const { w, h } = bounds.current;
      const k = cam.current.k;
      target.current = null;
      cam.current = {
        k,
        tx: wrap!.clientWidth / 2 - ((clientX - rect.left) / rect.width) * w * k,
        ty: wrap!.clientHeight / 2 - ((clientY - rect.top) / rect.height) * h * k,
      };
      applyCam();
      setHintGone(true);
    }
    let mmDragging = false;
    function onMmDown(e: PointerEvent) {
      window.clearTimeout(closeTimer);
      if (compact && !open) {
        // first tap only opens it
        setOpen(true);
        foldLater();
        return;
      }
      mmDragging = true;
      mmBoxRef.current?.setPointerCapture(e.pointerId);
      onMinimapPoint(e.clientX, e.clientY);
    }
    function onMmMove(e: PointerEvent) {
      if (mmDragging) onMinimapPoint(e.clientX, e.clientY);
    }
    function onMmUp() {
      mmDragging = false;
      if (compact && open) foldLater();
    }

    function onPointerDown(e: PointerEvent) {
      if (e.target instanceof Element && e.target.closest(".dk-topbar, .dk-ctl, .dk-minimap")) return;
      if (e.button !== 0 && e.pointerType === "mouse") return;
      userMoved.current = true;
      if (compact && open) {
        window.clearTimeout(closeTimer);
        setOpen(false);
      }
      const rect = wrap!.getBoundingClientRect();
      pointers.set(e.pointerId, { x: e.clientX - rect.left, y: e.clientY - rect.top });
      if (pointers.size === 2) {
        panning = false;
        wrap!.classList.remove("panning");
        pinch = pinchState();
        return;
      }
      if (pointers.size > 2) return;
      if (onSheetControl(e)) return;
      target.current = null;
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
      if (panning) {
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
      if (panning) {
        panning = false;
        wrap!.classList.remove("panning");
        if (moved) setHintGone(true);
      }
    }

    // Wheel zooms about the cursor; a trackpad pinch arrives as ctrl+wheel.
    // Scrollable regions inside the Latest Race card keep their own scroll.
    function onWheel(e: WheelEvent) {
      if (e.target instanceof Element && e.target.closest(".recap-table, .recap-picker-strip, .dk-topbar, .dk-ctl, .dk-minimap")) return;
      e.preventDefault();
      userMoved.current = true;
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
    mq.addEventListener("change", onMqChange);
    const mmBox = mmBoxRef.current;
    mmBox?.addEventListener("pointerdown", onMmDown);
    mmBox?.addEventListener("pointermove", onMmMove);
    mmBox?.addEventListener("pointerup", onMmUp);
    mmBox?.addEventListener("pointercancel", onMmUp);
    return () => {
      window.clearTimeout(closeTimer);
      mq.removeEventListener("change", onMqChange);
      mmBox?.removeEventListener("pointerdown", onMmDown);
      mmBox?.removeEventListener("pointermove", onMmMove);
      mmBox?.removeEventListener("pointerup", onMmUp);
      mmBox?.removeEventListener("pointercancel", onMmUp);
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

  function renderViews(views: { name: SnapshotName; active: boolean }[]) {
    return (
      <div className="ui-card-views">
        {views.map((v) => (
          <div key={v.name} className={"ui-card-view" + (v.active ? " active" : "")} aria-hidden={!v.active}>
            {renderSnapshot(v.name)}
          </div>
        ))}
      </div>
    );
  }

  // Title, subtitle, header control and body for a sheet; the two toggled
  // cards derive theirs from their current view.
  function sheetChrome(def: SheetDef): { title: string; subtitle: string; actions?: ReactNode; body: ReactNode } {
    if (def.id === "recap") return { title: def.title, subtitle: def.subtitle, body: <RecapCard data={recap} /> };
    if (def.id === "about") return { title: def.title, subtitle: def.subtitle, body: <AboutCard /> };
    if (def.id === "results") {
      const drivers = resultsView === "drivers";
      return {
        title: drivers ? "Drivers Results" : "Team Results",
        subtitle: drivers ? "Points scored by each driver per Grand Prix." : "Points scored by each team per Grand Prix.",
        actions: (
          <CardToggle
            name="results"
            label={drivers ? "Teams" : "Drivers"}
            onToggle={() => setResultsView((v) => (v === "drivers" ? "teams" : "drivers"))}
          />
        ),
        body: renderViews([
          { name: "results-drivers", active: drivers },
          { name: "results-teams", active: !drivers },
        ]),
      };
    }
    if (def.id === "freq") {
      const finish = freqView === "finish";
      return {
        title: finish ? "Finish Frequency" : "Qualifying Frequency",
        subtitle: finish
          ? "How often each driver has finished in each position."
          : "How often each driver has qualified in each grid position.",
        actions: (
          <CardToggle
            name="freq"
            label={finish ? "Qualifying" : "Race"}
            onToggle={() => setFreqView((v) => (v === "finish" ? "quali" : "finish"))}
          />
        ),
        body: renderViews([
          { name: "freq-finish", active: finish },
          { name: "freq-quali", active: !finish },
        ]),
      };
    }
    return { title: def.title, subtitle: def.subtitle, body: renderSnapshot(def.snapshotName!) };
  }

  return (
    <div className="dk-wrap" ref={wrapRef}>
      <h1 className="sr-only">Grid Walk</h1>
      <canvas className="gw-grid" ref={gridCanvasRef} aria-hidden="true" />

      <div className={"dk-world" + (laidOut ? "" : " pending")} ref={worldRef}>
        <div className="dk-table" ref={tableRef} aria-hidden="true" />
        {groups.map((g) => (
          <div
            key={g.id}
            className="dk-group-label"
            style={{ "--enter-i": allSheets.indexOf(g.sheets[0]) } as CSSProperties}
            ref={(el) => {
              labelRefs.current[g.id] = el;
            }}
          >
            {g.label}
          </div>
        ))}
        {allSheets.map((def) => {
          const g = geom[def.id];
          const chrome = sheetChrome(def);
          return (
            <div
              key={def.id}
              ref={(el) => {
                sheetRefs.current[def.id] = el;
              }}
              className="dk-sheet"
              style={{ ...(g ? { width: g.w, height: g.h } : {}), "--enter-i": allSheets.indexOf(def) } as CSSProperties}
              aria-label={`${chrome.title}: ${chrome.subtitle}`}
            >
              <div
                className="gw-card ui-card"
                ref={(el) => {
                  cardRefs.current[def.id] = el;
                }}
              >
                <div className="gw-card-inner">
                  <CardHeader title={chrome.title} subtitle={chrome.subtitle} actions={chrome.actions} />
                  <div className="gw-frame">
                    <div className="gw-fit">{chrome.body}</div>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      <div className="dk-topbar">
        {/* The logo is its own island, and takes you back to the top of the table. */}
        <Logo
          label="Grid Walk: back to the top of the table"
          onClick={() => {
            setHintGone(true);
            userMovedByClick();
            animateTo(openingView(), 700);
          }}
        />
        <Island className="dk-navpill">
          <nav className="dk-tabs" aria-label="Jump to">
            {marker ? <span className="dk-tab-marker" style={{ left: marker.left, width: marker.width }} aria-hidden="true" /> : null}
            {tabs.map((t) => (
              <Pill
                key={t.id}
                className={"dk-tab" + (t.id === activeTab ? " on" : "")}
                aria-current={t.id === activeTab ? "true" : undefined}
                ref={(el: HTMLButtonElement | null) => {
                  tabRefs.current[t.id] = el;
                }}
                onClick={() => {
                  activeTabRef.current = t.id;
                  setActiveTab(t.id);
                  goToSheet(t.id);
                }}
              >
                {t.navLabel ?? t.title}
              </Pill>
            ))}
          </nav>
          <Divider className="dk-navpill-divider" />
          <Pill accent className="dk-about-link" onClick={() => goToSheet("about")}>
            About
          </Pill>
          <ThemeToggle />
          <AccentToggle />
          <SeasonSelector initialSeason={year} />
        </Island>
      </div>

      <div className={"dk-hint" + (hintGone ? " gone" : "")} aria-hidden="true">
        Drag the table to pan · scroll to zoom
      </div>

      <div
        className={"dk-minimap" + (mmCompact ? " compact" : "") + (mmOpen ? " open" : "")}
        aria-hidden="true"
      >
        <div className="dk-minimap-label">Overview</div>
        <div className="dk-mm-box" ref={mmBoxRef} style={{ width: MM_W, height: (mm.h / mm.w) * MM_W }}>
          {mm.labels.map((l) => {
            const s = MM_W / mm.w;
            return (
              <div key={`mml-${l.id}`} className="dk-mm-label" style={{ left: l.x * s, top: l.y * s }}>
                {l.label}
              </div>
            );
          })}
          {mm.tiles.map((t) => {
            const s = MM_W / mm.w;
            return (
              <div
                key={`mm-${t.id}`}
                className={"dk-mm-tile" + (t.w * s < 70 ? " narrow" : "")}
                style={{ left: t.x * s, top: t.y * s, width: Math.max(2, t.w * s), height: Math.max(2, t.h * s) }}
              >
                <span>{t.title}</span>
              </div>
            );
          })}
          <div className="dk-mm-viewport" ref={mmViewportRef} />
        </div>
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
            fitAllByUser();
          }}
        >
          Fit all
        </Pill>
      </div>
    </div>
  );
}
