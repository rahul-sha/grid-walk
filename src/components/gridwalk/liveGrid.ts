// The live grid behind Grid Walk's carousel: a canvas of hairlines drawn
// from the theme's own tokens. It bulges and lights up in the accent colour
// around the pointer (or a finger), sends a ring through the grid on each
// press, drifts with the camera as you browse, and carries the odd accent
// "telemetry" pulse along its lines so the page never sits completely still.

type RGB = [number, number, number];
export type Camera = { k: number; tx: number; ty: number };

const R = 180;
const BULGE = 12;
const WAVE_SPEED = 520;
const WAVE_LIFE = 1.3;

export function createLiveGrid(cv: HTMLCanvasElement) {
  const ctx = cv.getContext("2d")!;
  const root = document.documentElement;
  const reduce = window.matchMedia("(prefers-reduced-motion: reduce)");
  const darkQuery = window.matchMedia("(prefers-color-scheme: dark)");
  let dpr = 1;
  let fullDpr = 1;
  let GW = 0;
  let GH = 0;
  let SP = 40;
  const col: { line: RGB; accent: RGB } = { line: [128, 128, 128], accent: [128, 128, 128] };
  const ptr = { x: -9999, y: -9999, sx: -9999, sy: -9999, on: 0, want: 0 };
  let cam: Camera = { k: 1, tx: 0, ty: 0 };
  const lastCam: Camera = { k: 1, tx: 0, ty: 0 };
  const waves: { x: number; y: number; t: number }[] = [];
  const comets: { horiz: boolean; line: number; dir: number; p: number; len: number; v: number; tail: number }[] = [];
  let nextComet = 0;
  let last = 0;

  // Resolve any CSS colour (hex, rgb, oklch …) to RGB by painting it.
  const probe = document.createElement("canvas").getContext("2d", { willReadFrequently: true })!;
  probe.canvas.width = probe.canvas.height = 1;
  function rgb(v: string): RGB {
    probe.clearRect(0, 0, 1, 1);
    probe.fillStyle = "#888";
    probe.fillStyle = v.trim() || "#888";
    probe.fillRect(0, 0, 1, 1);
    const d = probe.getImageData(0, 0, 1, 1).data;
    return [d[0], d[1], d[2]];
  }
  const rgba = (c: RGB, a: number) => `rgba(${c[0]},${c[1]},${c[2]},${a.toFixed(3)})`;
  let themeDirty = false;
  function readTheme() {
    const cs = getComputedStyle(root);
    col.line = rgb(cs.getPropertyValue("--text-muted"));
    col.accent = rgb(cs.getPropertyValue("--accent"));
    themeDirty = true;
  }
  const observer = new MutationObserver(readTheme);
  observer.observe(root, { attributes: true, attributeFilter: ["data-theme", "data-accent"] });
  darkQuery.addEventListener("change", readTheme);

  function applyDpr(target: number) {
    dpr = target;
    cv.width = Math.round(GW * dpr);
    cv.height = Math.round(GH * dpr);
  }

  function size() {
    fullDpr = Math.min(2, window.devicePixelRatio || 1);
    GW = window.innerWidth;
    GH = window.innerHeight;
    SP = GW <= 640 ? 32 : 40;
    applyDpr(fullDpr);
  }

  // While the camera is actively moving (a drag or a pinch), the canvas
  // redraws its whole base layer every frame — on a retina screen that's
  // up to 4x the pixels of a standard one, re-rasterised to the GPU every
  // time. Panning is fast motion, where the eye can't resolve that detail
  // anyway, so we drop to 1x only for the moving stretch and snap back to
  // full sharpness a beat after it settles, rather than living with the
  // softer grid permanently.
  const LOWRES_SETTLE_MS = 180;
  let lastMoveAt = -Infinity;

  // Mouse hover and touch both count; touch fades out on lift.
  function onMove(e: PointerEvent) {
    ptr.x = e.clientX;
    ptr.y = e.clientY;
    ptr.want = 1;
    if (ptr.sx < -999) {
      ptr.sx = ptr.x;
      ptr.sy = ptr.y;
    }
  }
  function onDown(e: PointerEvent) {
    onMove(e);
    if (!reduce.matches) waves.push({ x: e.clientX, y: e.clientY, t: 0 });
  }
  function onUp(e: PointerEvent) {
    if (e.pointerType !== "mouse") ptr.want = 0;
  }
  function onLeave() {
    ptr.want = 0;
  }
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerdown", onDown);
  window.addEventListener("pointerup", onUp);
  root.addEventListener("pointerleave", onLeave);
  window.addEventListener("blur", onLeave);
  window.addEventListener("resize", size);

  // Displace a point: an outward lens round the pointer plus any rings.
  const P: [number, number] = [0, 0];
  function disp(x: number, y: number) {
    let dx = 0;
    let dy = 0;
    if (!reduce.matches) {
      if (ptr.on > 0.01) {
        const ux = x - ptr.sx;
        const uy = y - ptr.sy;
        const r = Math.hypot(ux, uy);
        if (r > 0.5 && r < R * 1.6) {
          const f = BULGE * ptr.on * Math.exp(-(r * r) / (R * R * 0.45)) * (r / R) * 2.2;
          dx += (ux / r) * f;
          dy += (uy / r) * f;
        }
      }
      for (const w of waves) {
        const wx = x - w.x;
        const wy = y - w.y;
        const wr = Math.hypot(wx, wy);
        const g = wr - w.t * WAVE_SPEED;
        if (wr > 0.5 && g > -60 && g < 60) {
          const a = 9 * (1 - w.t / WAVE_LIFE) * Math.exp(-(g * g) / 700);
          dx += (wx / wr) * a;
          dy += (wy / wr) * a;
        }
      }
    }
    P[0] = x + dx;
    P[1] = y + dy;
  }

  // Spacing and offset follow the camera, so browsing and zooming move the grid too.
  function frame() {
    const sp = SP * (1 + (cam.k - 1) * 0.35);
    const ox = (((cam.tx * 0.3) % sp) + sp) % sp;
    const oy = (((cam.ty * 0.3) % sp) + sp) % sp;
    return { sp, ox, oy };
  }

  // `box` restricts both which lines are built and how far along each one
  // is walked, to a screen-space rectangle. The maths is identical to the
  // unbounded case — a box is only ever passed for the glow/wave passes,
  // whose gradients already fade to nothing past their own radius, so the
  // pixels outside the box were going to render as transparent anyway.
  // Skipping them here just saves the per-point disp() work and path
  // building for segments nobody would see.
  const MARGIN = BULGE * 2.2 + 10;
  const FINE_STEP = 14;
  // Outside the pointer bulge and any wave front, disp() always returns the
  // point unchanged, so a line there is dead straight — a few coarse points
  // draw exactly the same pixels as many fine ones, for a fraction of the
  // per-point disp() and path-building cost. Only the base (unboxed) pass
  // walks a whole screen's worth of line, so only it bothers with this.
  // Kept well under the smallest hot box a fresh wave can have (a ring
  // spawns at ~140px wide) so a coarse jump can never leap clean over one.
  const COARSE_STEP = 50;
  const hotBoxes: { x0: number; y0: number; x1: number; y1: number }[] = [];
  function collectHotBoxes() {
    hotBoxes.length = 0;
    if (reduce.matches) return;
    if (ptr.on > 0.01) {
      hotBoxes.push({ x0: ptr.sx - R * 1.6, y0: ptr.sy - R * 1.6, x1: ptr.sx + R * 1.6, y1: ptr.sy + R * 1.6 });
    }
    for (const w of waves) {
      const rad = w.t * WAVE_SPEED;
      hotBoxes.push({ x0: w.x - rad - 70, y0: w.y - rad - 70, x1: w.x + rad + 70, y1: w.y + rad + 70 });
    }
  }
  function isHot(x: number, y: number): boolean {
    for (const b of hotBoxes) {
      if (x >= b.x0 && x <= b.x1 && y >= b.y0 && y <= b.y1) return true;
    }
    return false;
  }
  function gridPath(major: boolean, box?: { x0: number; y0: number; x1: number; y1: number }) {
    const { sp, ox, oy } = frame();
    const step = FINE_STEP;
    if (!box) collectHotBoxes();
    // Majors are every fourth line, anchored to the camera so they move too.
    const bi = Math.floor((cam.tx * 0.3) / sp);
    const bj = Math.floor((cam.ty * 0.3) / sp);
    const x0 = box ? Math.max(-step, box.x0 - MARGIN) : -step;
    const x1 = box ? Math.min(GW + step, box.x1 + MARGIN) : GW + step;
    const y0 = box ? Math.max(-step, box.y0 - MARGIN) : -step;
    const y1 = box ? Math.min(GH + step, box.y1 + MARGIN) : GH + step;
    ctx.beginPath();
    for (let i = -1, x = ox - sp; x < GW + sp; x += sp, i++) {
      if ((((i - bi) % 4) + 4) % 4 === 0 !== major) continue;
      if (box && (x < x0 || x > x1)) continue;
      let first = true;
      for (let y = y0; y <= y1; ) {
        disp(x, y);
        if (first) {
          ctx.moveTo(P[0], P[1]);
          first = false;
        } else {
          ctx.lineTo(P[0], P[1]);
        }
        y += !box && !isHot(x, y) ? COARSE_STEP : step;
      }
    }
    for (let j = -1, y = oy - sp; y < GH + sp; y += sp, j++) {
      if ((((j - bj) % 4) + 4) % 4 === 0 !== major) continue;
      if (box && (y < y0 || y > y1)) continue;
      let first = true;
      for (let x = x0; x <= x1; ) {
        disp(x, y);
        if (first) {
          ctx.moveTo(P[0], P[1]);
          first = false;
        } else {
          ctx.lineTo(P[0], P[1]);
        }
        x += !box && !isHot(x, y) ? COARSE_STEP : step;
      }
    }
  }

  function strokeGrid(box?: { x0: number; y0: number; x1: number; y1: number }) {
    gridPath(false, box);
    ctx.stroke();
    gridPath(true, box);
    ctx.stroke();
  }

  function spawnComet(now: number) {
    const { sp, ox, oy } = frame();
    const horiz = Math.random() < 0.6;
    const dir = Math.random() < 0.5 ? 1 : -1;
    const line = horiz ? oy + sp * Math.floor(Math.random() * (GH / sp)) : ox + sp * Math.floor(Math.random() * (GW / sp));
    const len = horiz ? GW : GH;
    comets.push({ horiz, line, dir, p: dir > 0 ? -160 : len + 160, len, v: 240 + Math.random() * 220, tail: 110 + Math.random() * 90 });
    nextComet = now + 700 + Math.random() * 1500;
  }

  // True once the pointer glow, any rings/comets and the camera have all
  // settled, so there is nothing left for this frame to change on screen.
  let wasIdle = false;
  function draw(now: number, camera: Camera) {
    cam = camera;
    const dt = Math.min(0.05, (now - (last || now)) / 1000);
    last = now;
    ptr.on += (ptr.want - ptr.on) * 0.08;
    ptr.sx += (ptr.x - ptr.sx) * 0.22;
    ptr.sy += (ptr.y - ptr.sy) * 0.22;
    for (let i = waves.length - 1; i >= 0; i--) {
      waves[i].t += dt;
      if (waves[i].t > WAVE_LIFE) waves.splice(i, 1);
    }

    const camStill = cam.k === lastCam.k && cam.tx === lastCam.tx && cam.ty === lastCam.ty;
    const dueComet = !reduce.matches && now > nextComet;
    const idle = ptr.on < 0.002 && waves.length === 0 && comets.length === 0 && camStill && !dueComet && !themeDirty;
    // Copied field by field, never kept as the caller's object: the desk
    // pans by changing its camera in place, and a shared reference always
    // compared as "still", so the canvas never dropped to 1x during a drag.
    lastCam.k = cam.k;
    lastCam.tx = cam.tx;
    lastCam.ty = cam.ty;
    if (idle && wasIdle) return;
    wasIdle = idle;
    themeDirty = false;

    if (!camStill) lastMoveAt = now;
    const wantLow = fullDpr > 1 && now - lastMoveAt < LOWRES_SETTLE_MS;
    if (wantLow && dpr !== 1) applyDpr(1);
    else if (!wantLow && dpr !== fullDpr) applyDpr(fullDpr);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, GW, GH);
    ctx.lineWidth = 1;

    // Base grid: hairline minors, slightly stronger majors.
    gridPath(false);
    ctx.strokeStyle = rgba(col.line, 0.1);
    ctx.stroke();
    gridPath(true);
    ctx.strokeStyle = rgba(col.line, 0.2);
    ctx.stroke();

    // Accent glow round the pointer: the same lines restroked through a radial gradient.
    // Bounded to the glow's own radius — the gradient is 0% opacity past
    // R * 1.2 anyway, so there's nothing to see further out.
    if (ptr.on > 0.01) {
      const g = ctx.createRadialGradient(ptr.sx, ptr.sy, 0, ptr.sx, ptr.sy, R * 1.2);
      g.addColorStop(0, rgba(col.accent, 0.85 * ptr.on));
      g.addColorStop(0.45, rgba(col.accent, 0.35 * ptr.on));
      g.addColorStop(1, rgba(col.accent, 0));
      ctx.strokeStyle = g;
      ctx.lineWidth = 1.25;
      strokeGrid({ x0: ptr.sx - R * 1.2, y0: ptr.sy - R * 1.2, x1: ptr.sx + R * 1.2, y1: ptr.sy + R * 1.2 });
      ctx.lineWidth = 1;
    }

    // Each press sends an accent ring outwards through the grid, bounded to
    // the ring's current reach (it only grows out to WAVE_LIFE seconds).
    for (const w of waves) {
      const rad = w.t * WAVE_SPEED;
      const fade = 1 - w.t / WAVE_LIFE;
      const g = ctx.createRadialGradient(w.x, w.y, Math.max(0, rad - 50), w.x, w.y, rad + 50);
      g.addColorStop(0, rgba(col.accent, 0));
      g.addColorStop(0.5, rgba(col.accent, 0.7 * fade));
      g.addColorStop(1, rgba(col.accent, 0));
      ctx.strokeStyle = g;
      strokeGrid({ x0: w.x - rad - 50, y0: w.y - rad - 50, x1: w.x + rad + 50, y1: w.y + rad + 50 });
    }

    // Telemetry pulses: short accent streaks running along grid lines.
    if (!reduce.matches) {
      if (now > nextComet && comets.length < 5) spawnComet(now);
      for (let c = comets.length - 1; c >= 0; c--) {
        const m = comets[c];
        m.p += m.v * dt * m.dir;
        if (m.p < -260 || m.p > m.len + 260) {
          comets.splice(c, 1);
          continue;
        }
        const head = m.p;
        const tail = m.p - m.tail * m.dir;
        const at = (q: number) => (m.horiz ? disp(q, m.line) : disp(m.line, q));
        const hx = m.horiz ? head : m.line;
        const hy = m.horiz ? m.line : head;
        const g = ctx.createLinearGradient(m.horiz ? tail : m.line, m.horiz ? m.line : tail, hx, hy);
        g.addColorStop(0, rgba(col.accent, 0));
        g.addColorStop(1, rgba(col.accent, 0.9));
        ctx.strokeStyle = g;
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        for (let s = 0; s <= 12; s++) {
          at(tail + ((head - tail) * s) / 12);
          if (s) ctx.lineTo(P[0], P[1]);
          else ctx.moveTo(P[0], P[1]);
        }
        ctx.stroke();
        at(head);
        ctx.fillStyle = rgba(col.accent, 0.95);
        ctx.beginPath();
        ctx.arc(P[0], P[1], 1.8, 0, Math.PI * 2);
        ctx.fill();
      }
      ctx.lineWidth = 1;
    }
  }

  size();
  readTheme();

  return {
    draw,
    destroy() {
      observer.disconnect();
      darkQuery.removeEventListener("change", readTheme);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      root.removeEventListener("pointerleave", onLeave);
      window.removeEventListener("blur", onLeave);
      window.removeEventListener("resize", size);
    },
  };
}
