"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import "@/components/gridwalk/gridwalk.css";
import "./canvas.css";
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

export interface SeasonBundle {
  year: number;
  sizes: Record<string, { w: number; h: number }> | null;
  recap: RecapData | null;
}

interface CanvasViewProps {
  seasons: SeasonBundle[]; // oldest first, current season last
  currentSeason: number;
  initialVariant: { accent: Accent; theme: Theme | null };
}

// Structural definition of a tile: everything known before layout. x/y/w
// are filled in afterwards by computeLayout(), once every card's actual
// rendered width can be measured (see that function for why).
type TileDef = {
  id: string;
  year: number;
  title: string;
  subtitle: string;
  kind: "snapshot" | "live";
  snapshotName?: SnapshotName;
  targetH: number;
  cluster: number; // index into `seasons`, left to right
  row: number; // 0 or 1 within a full-season cluster; always 0 for compact
  compact?: boolean;
};

type Tile = TileDef & { x: number; y: number; w: number; h: number };
type ClusterLabel = { year: number; label: string; x: number; w: number };

const FULL_H = 230;
const COMPACT_H = 128;
const GAP = 18;
const ROW_GAP = 22;
const CLUSTER_GAP = 90;
const MIN_K = 0.18;
const MAX_K_PAN = 3.2;
const MAX_Z = 2.6;
const EASE_MS_IN = 420;
const EASE_MS_OUT = 380;

function easeOutCubic(p: number) {
  return 1 - Math.pow(1 - p, 3);
}

export default function CanvasView({ seasons, currentSeason, initialVariant }: CanvasViewProps) {
  const viewportRef = useRef<HTMLDivElement>(null);
  const worldRef = useRef<HTMLDivElement>(null);
  const gridCanvasRef = useRef<HTMLCanvasElement>(null);
  const mmBoxRef = useRef<HTMLDivElement>(null);
  const mmViewportRef = useRef<HTMLDivElement>(null);
  const zoomLevelRef = useRef<HTMLSpanElement>(null);
  const tileRefs = useRef<Record<string, HTMLDivElement | null>>({});

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

  // ---------- structural tile definitions (no geometry yet) ----------
  // Widths depend on each card's actual rendered aspect ratio (a snapshot
  // image's natural size, or a live card's own content, e.g. RecapCard),
  // which can only be measured after mount — see computeLayout() below,
  // which mirrors GridWalk's own two-pass fitContent()/layout().
  const tileDefs = useMemo(() => {
    const defs: TileDef[] = [];
    seasons.forEach((season, cluster) => {
      const isCurrent = season.year === currentSeason;
      if (isCurrent) {
        defs.push(
          {
            id: `${season.year}-recap`,
            year: season.year,
            title: "Latest Race",
            subtitle: "The most recent race, in your own time zone.",
            kind: "live",
            targetH: FULL_H,
            cluster,
            row: 0,
          },
          {
            id: `${season.year}-results`,
            year: season.year,
            title: "Drivers Results",
            subtitle: "Points scored by each driver per Grand Prix.",
            kind: "snapshot",
            snapshotName: "results-drivers",
            targetH: FULL_H,
            cluster,
            row: 0,
          },
          {
            id: `${season.year}-evolution`,
            year: season.year,
            title: "Driver Points Evolution",
            subtitle: "Cumulative points scored by each driver across the season.",
            kind: "snapshot",
            snapshotName: "evolution",
            targetH: FULL_H,
            cluster,
            row: 0,
          },
          {
            id: `${season.year}-positions`,
            year: season.year,
            title: "Positions",
            subtitle: "Where each driver finished in every Grand Prix.",
            kind: "snapshot",
            snapshotName: "positions",
            targetH: FULL_H,
            cluster,
            row: 0,
          },
          {
            id: `${season.year}-freq`,
            year: season.year,
            title: "Finish Frequency",
            subtitle: "How often each driver has finished in each position.",
            kind: "snapshot",
            snapshotName: "freq-finish",
            targetH: FULL_H,
            cluster,
            row: 1,
          },
          {
            id: `${season.year}-podiumsD`,
            year: season.year,
            title: "Driver Podiums",
            subtitle: "1st/2nd/3rd place finishes per driver.",
            kind: "snapshot",
            snapshotName: "podiumsD",
            targetH: FULL_H,
            cluster,
            row: 1,
          },
          {
            id: `${season.year}-about`,
            year: season.year,
            title: "About this site",
            subtitle: "Who built it, how, and what it runs on.",
            kind: "live",
            targetH: FULL_H,
            cluster,
            row: 1,
          },
        );
      } else {
        const names: { name: SnapshotName; title: string }[] = [
          { name: "results-drivers", title: "Drivers Results" },
          { name: "podiumsD", title: "Driver Podiums" },
        ];
        names.forEach(({ name, title }, i) => {
          defs.push({
            id: `${season.year}-${name}`,
            year: season.year,
            title,
            subtitle: `${season.year} season`,
            kind: "snapshot",
            snapshotName: name,
            targetH: COMPACT_H,
            cluster,
            row: i,
            compact: true,
          });
        });
      }
    });
    return defs;
  }, [seasons, currentSeason]);

  const [geomMap, setGeomMap] = useState<Record<string, { x: number; y: number; w: number; h: number }>>({});
  const [clusterLabels, setClusterLabels] = useState<ClusterLabel[]>([]);
  const [worldW, setWorldW] = useState(2000);
  const [worldH, setWorldH] = useState(800);
  const [laidOut, setLaidOut] = useState(false);
  const cardElRefs = useRef<Record<string, HTMLDivElement | null>>({});

  // Every tile renders from the very first paint (so computeLayout below
  // has real DOM nodes to measure); a tile with no geom yet sits at a
  // placeholder position, hidden by the "pending" class on .cv-world until
  // computeLayout has run.
  const tiles: Tile[] = useMemo(
    () =>
      tileDefs.map((def) => {
        const g = geomMap[def.id];
        return g ? { ...def, ...g } : { ...def, x: 0, y: 0, w: def.targetH * 1.3, h: def.targetH };
      }),
    [tileDefs, geomMap],
  );

  // Fits each card's content (a snapshot image, or a live card's own
  // natural content) to its frame, then scales the whole card down to the
  // canvas's target display height — the same two-pass measure-then-scale
  // technique GridWalk's own fitContent()/layout() uses for its carousel,
  // adapted here for free placement instead of one strip. Runs once, after
  // the first commit (every tile already exists in the DOM at a
  // placeholder size by then), since a card's natural aspect ratio doesn't
  // depend on theme/palette — only its image src does.
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

    const measured: Record<string, { w: number; h: number }> = {};
    tileDefs.forEach((def) => {
      const card = cardElRefs.current[def.id];
      if (!card) return;
      card.style.transform = "";
      fitContent(card);
      const nw = card.offsetWidth;
      const nh = card.offsetHeight || 900;
      const s = def.targetH / nh;
      card.style.transform = `scale(${s})`;
      measured[def.id] = { w: nw * s, h: def.targetH };
    });

    const byCluster = new Map<number, TileDef[]>();
    tileDefs.forEach((def) => {
      if (!byCluster.has(def.cluster)) byCluster.set(def.cluster, []);
      byCluster.get(def.cluster)!.push(def);
    });

    const newGeom: Record<string, { x: number; y: number; w: number; h: number }> = {};
    const labels: ClusterLabel[] = [];
    let cursorX = 40;
    const topY = 110;

    seasons.forEach((season, clusterIdx) => {
      const defs = byCluster.get(clusterIdx) ?? [];
      const fallback = (d: TileDef) => measured[d.id] ?? { w: d.targetH * 1.3, h: d.targetH };
      if (season.year === currentSeason) {
        const row0 = defs.filter((d) => d.row === 0);
        const row1 = defs.filter((d) => d.row === 1);
        let rx = cursorX;
        row0.forEach((d) => {
          const m = fallback(d);
          newGeom[d.id] = { x: rx, y: topY, w: m.w, h: FULL_H };
          rx += m.w + GAP;
        });
        const row0Width = rx - cursorX - GAP;
        let rx2 = cursorX;
        row1.forEach((d) => {
          const m = fallback(d);
          newGeom[d.id] = { x: rx2, y: topY + FULL_H + ROW_GAP, w: m.w, h: FULL_H };
          rx2 += m.w + GAP;
        });
        const row1Width = rx2 - cursorX - GAP;
        const clusterWidth = Math.max(row0Width, row1Width);
        labels.push({ year: season.year, label: `${season.year} · current season`, x: cursorX, w: clusterWidth });
        cursorX += clusterWidth + CLUSTER_GAP;
      } else {
        let cy = topY;
        let maxW = 0;
        defs.forEach((d) => {
          const m = fallback(d);
          newGeom[d.id] = { x: cursorX, y: cy, w: m.w, h: COMPACT_H };
          maxW = Math.max(maxW, m.w);
          cy += COMPACT_H + GAP;
        });
        labels.push({ year: season.year, label: `${season.year}`, x: cursorX, w: maxW });
        cursorX += maxW + CLUSTER_GAP;
      }
    });

    const values = Object.values(newGeom);
    const maxRight = values.length ? Math.max(...values.map((g) => g.x + g.w)) : 800;
    const maxBottom = values.length ? Math.max(...values.map((g) => g.y + g.h)) : 600;

    setGeomMap(newGeom);
    setClusterLabels(labels);
    setWorldW(maxRight + 60);
    setWorldH(maxBottom + 60);
    setLaidOut(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tileDefs]);

  // ---------- camera ----------
  const cam = useRef({ k: 1, tx: 0, ty: 0 });
  const animStart = useRef({ k: 1, tx: 0, ty: 0 });
  const target = useRef<{ k: number; tx: number; ty: number; dur: number; t0: number | null } | null>(null);
  const homeView = useRef<{ k: number; tx: number; ty: number } | null>(null);
  const zoomedId = useRef<string | null>(null);
  const mmScaleRef = useRef(1);
  const [hintGone, setHintGone] = useState(false);
  const movedRef = useRef(false);

  function applyTransform() {
    const world = worldRef.current;
    if (!world) return;
    const { k, tx, ty } = cam.current;
    world.style.transform = `translate(${tx.toFixed(1)}px, ${ty.toFixed(1)}px) scale(${k.toFixed(4)})`;
    updateMinimapViewport();
    if (zoomLevelRef.current) {
      zoomLevelRef.current.textContent = Math.abs(k - 1) < 0.03 ? "Fit" : `${Math.round(k * 100)}%`;
    }
  }

  function updateMinimapViewport() {
    const mm = mmViewportRef.current;
    const vp = viewportRef.current;
    if (!mm || !vp) return;
    const { k, tx, ty } = cam.current;
    const scale = mmScaleRef.current;
    mm.style.left = `${(-tx / k) * scale}px`;
    mm.style.top = `${(-ty / k) * scale}px`;
    mm.style.width = `${(vp.clientWidth / k) * scale}px`;
    mm.style.height = `${(vp.clientHeight / k) * scale}px`;
  }

  function clearZoomState() {
    homeView.current = null;
    if (zoomedId.current) tileRefs.current[zoomedId.current]?.classList.remove("is-zoomed");
    zoomedId.current = null;
    viewportRef.current?.classList.remove("zoomed");
  }

  // t0 is stamped by the rAF tick on the frame it first sees this target,
  // not here — this can be called from a click handler mid-render-cycle,
  // and performance.now() is an impure call React's purity rule disallows
  // outside an effect/event-callback-only code path.
  function animateTo(tx: number, ty: number, k: number, dur: number) {
    target.current = { tx, ty, k, dur, t0: null };
  }

  function fitAll(animated: boolean) {
    const vp = viewportRef.current;
    if (!vp) return;
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const k = Math.max(MIN_K, Math.min(vw / (worldW + 120), vh / (worldH + 120), 1));
    const tx = vw / 2 - (worldW / 2) * k;
    const ty = vh / 2 - (worldH / 2) * k;
    if (animated) animateTo(tx, ty, k, 380);
    else {
      cam.current = { k, tx, ty };
      applyTransform();
    }
  }

  function zoomToTile(id: string) {
    const el = tileRefs.current[id];
    const vp = viewportRef.current;
    const tile = tiles.find((t) => t.id === id);
    if (!el || !vp || !tile) return;
    if (!homeView.current) homeView.current = { ...cam.current };
    zoomedId.current = id;
    el.classList.add("is-zoomed");
    vp.classList.add("zoomed");
    setHintGone(true);
    const vw = vp.clientWidth;
    const vh = vp.clientHeight;
    const k = Math.min((vw * 0.86) / tile.w, (vh * 0.86) / tile.h, MAX_Z);
    const tx = vw / 2 - (tile.x + tile.w / 2) * k;
    const ty = vh / 2 - (tile.y + tile.h / 2) * k;
    animateTo(tx, ty, k, EASE_MS_IN);
  }

  function zoomOut() {
    const h = homeView.current;
    if (!h) return;
    clearZoomState();
    animateTo(h.tx, h.ty, h.k, EASE_MS_OUT);
  }

  function zoomBy(factor: number) {
    const vp = viewportRef.current;
    if (!vp || zoomedId.current) return;
    target.current = null;
    const v = cam.current;
    const k = Math.max(MIN_K, Math.min(MAX_K_PAN, v.k * factor));
    const f = k / v.k;
    const px = vp.clientWidth / 2;
    const py = vp.clientHeight / 2;
    cam.current = { k, tx: px - (px - v.tx) * f, ty: py - (py - v.ty) * f };
    applyTransform();
  }

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
        applyTransform();
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

  // ---------- pan / wheel-zoom / click-to-zoom / minimap ----------
  useEffect(() => {
    const vp = viewportRef.current;
    const mm = mmBoxRef.current;
    if (!vp) return;

    let dragging = false;
    let lastX = 0;
    let lastY = 0;

    function onPointerDown(e: PointerEvent) {
      if (e.target instanceof Element && e.target.closest(".cv-topbar, .cv-minimap, .cv-zoomctl")) return;
      const onTile = e.target instanceof Element && e.target.closest(".cv-tile");
      if (!onTile && zoomedId.current) {
        zoomOut();
        return;
      }
      dragging = true;
      movedRef.current = false;
      target.current = null;
      lastX = e.clientX;
      lastY = e.clientY;
      vp!.classList.add("dragging");
      // No setPointerCapture: it would retarget the click to vp, so a
      // tile's own onClick would never fire (see GridWalk.tsx's own note).
    }
    function onPointerMove(e: PointerEvent) {
      if (!dragging) return;
      const dx = e.clientX - lastX;
      const dy = e.clientY - lastY;
      if (Math.abs(dx) > 3 || Math.abs(dy) > 3) movedRef.current = true;
      if (!movedRef.current) return;
      lastX = e.clientX;
      lastY = e.clientY;
      cam.current = { ...cam.current, tx: cam.current.tx + dx, ty: cam.current.ty + dy };
      applyTransform();
    }
    function onPointerUp() {
      dragging = false;
      vp!.classList.remove("dragging");
    }
    function onWheel(e: WheelEvent) {
      if (zoomedId.current) return;
      e.preventDefault();
      target.current = null;
      const factor = Math.pow(1.0015, -e.deltaY);
      const v = cam.current;
      const k = Math.max(MIN_K, Math.min(MAX_K_PAN, v.k * factor));
      const f = k / v.k;
      const rect = vp!.getBoundingClientRect();
      const px = e.clientX - rect.left;
      const py = e.clientY - rect.top;
      cam.current = { k, tx: px - (px - v.tx) * f, ty: py - (py - v.ty) * f };
      applyTransform();
    }
    function onKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape" && zoomedId.current) zoomOut();
    }

    vp.addEventListener("pointerdown", onPointerDown);
    window.addEventListener("pointermove", onPointerMove);
    window.addEventListener("pointerup", onPointerUp);
    window.addEventListener("pointercancel", onPointerUp);
    vp.addEventListener("wheel", onWheel, { passive: false });
    window.addEventListener("keydown", onKeyDown);

    function onResize() {
      applyTransform();
    }
    window.addEventListener("resize", onResize);

    function onMinimapPoint(clientX: number, clientY: number) {
      const rect = mm!.getBoundingClientRect();
      const mx = clientX - rect.left;
      const my = clientY - rect.top;
      clearZoomState();
      const scale = mmScaleRef.current;
      const vp2 = viewportRef.current!;
      const k = cam.current.k;
      const tx = vp2.clientWidth / 2 - (mx / scale) * k;
      const ty = vp2.clientHeight / 2 - (my / scale) * k;
      target.current = null;
      cam.current = { k, tx, ty };
      applyTransform();
    }
    let mmDragging = false;
    function onMmDown(e: PointerEvent) {
      mmDragging = true;
      onMinimapPoint(e.clientX, e.clientY);
    }
    function onMmMove(e: PointerEvent) {
      if (!mmDragging) return;
      onMinimapPoint(e.clientX, e.clientY);
    }
    function onMmUp() {
      mmDragging = false;
    }
    mm?.addEventListener("pointerdown", onMmDown);
    window.addEventListener("pointermove", onMmMove);
    window.addEventListener("pointerup", onMmUp);

    return () => {
      vp.removeEventListener("pointerdown", onPointerDown);
      window.removeEventListener("pointermove", onPointerMove);
      window.removeEventListener("pointerup", onPointerUp);
      window.removeEventListener("pointercancel", onPointerUp);
      vp.removeEventListener("wheel", onWheel);
      window.removeEventListener("keydown", onKeyDown);
      window.removeEventListener("resize", onResize);
      mm?.removeEventListener("pointerdown", onMmDown);
      window.removeEventListener("pointermove", onMmMove);
      window.removeEventListener("pointerup", onMmUp);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tiles, worldW, worldH]);

  const MM_W = 220;
  // A plain render-time value for the JSX below (pure); mmScaleRef is the
  // same number kept in sync for the imperative code (handlers/rAF loop),
  // which must not read it from a hook dependency mid-render.
  const mmScale = MM_W / worldW;

  // initial fit once mounted + whenever the world size changes (season data settles)
  useEffect(() => {
    mmScaleRef.current = mmScale;
    fitAll(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [worldW, worldH]);

  function renderSnapshot(year: number, name: SnapshotName, size: { w: number; h: number } | undefined) {
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

  const currentBundle = seasons.find((s) => s.year === currentSeason);

  function renderTileBody(tile: Tile) {
    if (tile.id.endsWith("-recap")) return <RecapCard data={currentBundle?.recap ?? null} />;
    if (tile.id.endsWith("-about")) return <AboutCard />;
    const bundle = seasons.find((s) => s.year === tile.year);
    return renderSnapshot(tile.year, tile.snapshotName!, bundle?.sizes?.[tile.snapshotName!]);
  }

  return (
    <div className="cv-wrap" ref={viewportRef}>
      <h1 className="sr-only">Grid Walk canvas — experimental layout</h1>
      <canvas className="gw-grid" ref={gridCanvasRef} aria-hidden="true" />

      <div className={"cv-world" + (laidOut ? "" : " pending")} ref={worldRef}>
        {clusterLabels.map((c) => (
          <div key={c.year} className="cv-cluster-label" style={{ left: c.x, top: 60, width: c.w }}>
            <div className="cv-timeline-tick" />
            <span>{c.label}</span>
          </div>
        ))}
        {tiles.map((tile) => (
          <div
            key={tile.id}
            ref={(el) => {
              tileRefs.current[tile.id] = el;
            }}
            className={"cv-tile" + (tile.compact ? " compact" : "")}
            style={{ left: tile.x, top: tile.y, width: tile.w, height: tile.h }}
            role="button"
            tabIndex={0}
            aria-label={`${tile.title}: ${tile.subtitle}`}
            onClick={(e) => {
              e.stopPropagation();
              if (movedRef.current) return;
              if (zoomedId.current === tile.id) zoomOut();
              else zoomToTile(tile.id);
            }}
            onKeyDown={(e) => {
              if (e.key === "Enter" || e.key === " ") {
                e.preventDefault();
                if (zoomedId.current === tile.id) zoomOut();
                else zoomToTile(tile.id);
              }
            }}
          >
            <div
              className="gw-card ui-card"
              ref={(el) => {
                cardElRefs.current[tile.id] = el;
              }}
            >
              <div className="gw-card-inner">
                <CardHeader title={tile.title} subtitle={tile.subtitle} />
                <div className="gw-frame">
                  <div className="gw-fit">{renderTileBody(tile)}</div>
                </div>
              </div>
            </div>
            {!tile.compact && <span className="cv-zoom-note">click to zoom</span>}
          </div>
        ))}
      </div>

      <div className="cv-topbar">
        <Logo href="/" label="Back to Grid Walk" />
        <Island className="cv-navpill">
          <span className="cv-experimental-tag">Experimental canvas layout</span>
          <ThemeToggle />
          <AccentToggle />
        </Island>
      </div>

      <div className={"cv-hint" + (hintGone ? " gone" : "")} aria-hidden="true">
        Drag to pan, scroll to zoom. Click a card to zoom in — click the background to come back.
      </div>

      <div className="cv-minimap" ref={mmBoxRef}>
        <div className="cv-minimap-label">Overview</div>
        {tiles.map((tile) => (
          <div
            key={`mm-${tile.id}`}
            className="cv-mm-tile"
            style={{
              left: tile.x * mmScale,
              top: tile.y * mmScale,
              width: Math.max(2, tile.w * mmScale),
              height: Math.max(2, tile.h * mmScale),
            }}
          />
        ))}
        <div className="cv-mm-viewport" ref={mmViewportRef} />
      </div>

      <div className="cv-zoomctl">
        <IconPill aria-label="Zoom out" onClick={() => zoomBy(0.8)}>
          −
        </IconPill>
        <span className="cv-zoom-level" ref={zoomLevelRef}>
          Fit
        </span>
        <IconPill aria-label="Zoom in" onClick={() => zoomBy(1.25)}>
          +
        </IconPill>
        <Pill
          accent
          onClick={() => {
            clearZoomState();
            fitAll(true);
          }}
        >
          Fit all
        </Pill>
      </div>
    </div>
  );
}
