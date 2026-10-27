#!/usr/bin/env node
// Captures a static image of each Grid Walk card's content, for every
// theme x palette combination, for one season (or every supported one).
// Visitors only ever see these images: live rendering of the cards
// (tables/charts/bars) is by far the single biggest cost to the GPU on
// every drag frame (see "grid-walk-blur-gpu-cost" project memory, from a
// real device trace), so it now happens only here, in capture mode.
//
// Alongside the images each season gets a manifest.json recording every
// image's natural CSS-pixel size, which the page uses to lay the cards out
// before any image has loaded. Images are lossless WebP: a third the size
// of PNG for this flat-colour content, with nothing lost.
//
// Usage (against a server already serving the built app — see the
// "capture-card-snapshots" GitHub Actions workflow for the full
// build-and-serve sequence, or locally: npm run build && npm run start
// -- -p 3100):
//   node scripts/capture-card-snapshots.mjs            # current season
//   node scripts/capture-card-snapshots.mjs 2024       # one season
//   node scripts/capture-card-snapshots.mjs all        # 2020 to current
import { chromium } from "@playwright/test";
import sharp from "sharp";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const PORT = process.env.SNAPSHOT_PORT || "3100";
const BASE_URL = `http://localhost:${PORT}`;
const FIRST_SEASON = 2020;
const CURRENT_SEASON = new Date().getFullYear();
const ARG = process.argv[2];
const SEASONS =
  ARG === "all"
    ? Array.from({ length: CURRENT_SEASON - FIRST_SEASON + 1 }, (_, i) => FIRST_SEASON + i)
    : [Number(ARG) || CURRENT_SEASON];

const ACCENTS = ["monokai", "coffee", "ember", "dracula"];
const THEMES = ["light", "dark"];
// Index within GridWalk's `sections` array (and so its top tab strip's
// tabs) — each must be focused via its tab before its card is screenshot,
// since an unfocused card sits dimmed and off-centre in the carousel.
// "recap" (Latest Race) is never a snapshot — see
// "grid-walk-recap-schedule-card" memory — and, since round 74, isn't in
// the strip at all for any season but the current one (see
// "grid-walk-recap-schedule-card" memory's hide-for-past-seasons note), so
// every other card's tab index shifts down by one for a past season. Base
// indices below assume recap IS present; captureSeason() adjusts by -1
// when capturing a season that isn't CURRENT_SEASON.
const PLAIN_SECTIONS = [
  { id: "evolution", tabIndex: 2 },
  { id: "positions", tabIndex: 3 },
  { id: "podiumsD", tabIndex: 5 },
];
// Cards with an in-header toggle: both views captured, one image each.
const TOGGLED_SECTIONS = [
  { id: "results", tabIndex: 1, views: ["drivers", "teams"] },
  { id: "freq", tabIndex: 4, views: ["finish", "quali"] },
];
// .gw-slot's opacity transition (0.35s) plus the camera-pan/zoom-reset
// animation goTo() triggers both need to fully settle before a screenshot.
const FOCUS_SETTLE_MS = 900;

async function focusTab(page, tabIndex) {
  const tabs = await page.$$(".gw-toptabs-track .ui-pill");
  await tabs[tabIndex].click();
  await page.waitForTimeout(FOCUS_SETTLE_MS);
}

// Screenshot the element and save it as lossless WebP; return its natural
// (untransformed) CSS-pixel size for the manifest.
async function capture(el, file) {
  const png = await el.screenshot({ type: "png" });
  await sharp(png).webp({ lossless: true }).toFile(file);
  return el.evaluate((node) => ({ w: node.offsetWidth, h: node.offsetHeight }));
}

async function captureSeason(browser, season) {
  const outRoot = path.join(__dirname, "..", "public", "card-snapshots", String(season));
  const sizes = {};
  // recap's tab only exists for the current season; every other tab's
  // index shifts down by one when it's absent.
  const tabOffset = season === CURRENT_SEASON ? 0 : -1;

  for (const accent of ACCENTS) {
    for (const theme of THEMES) {
      const dir = path.join(outRoot, `${accent}-${theme}`);
      await mkdir(dir, { recursive: true });

      // Tall enough that every card sits at its natural size (no fit-down
      // scaling), so the 2x capture really is 2x the content.
      const page = await browser.newPage({
        viewport: { width: 1800, height: 1400 },
        deviceScaleFactor: 2,
      });
      await page.addInitScript(
        ({ accent, theme }) => {
          window.localStorage.setItem("f1-theme", theme);
          window.localStorage.setItem("f1-accent", accent);
        },
        { accent, theme }
      );
      // noSnapshot=1 puts the page in capture mode: cards render live at
      // natural size — otherwise this script would screenshot the very
      // images it is meant to be regenerating.
      await page.goto(`${BASE_URL}/?season=${season}&noSnapshot=1`, { waitUntil: "networkidle" });
      await page.waitForTimeout(600);

      for (const { id, tabIndex } of PLAIN_SECTIONS) {
        await focusTab(page, tabIndex + tabOffset);
        const el = await page.$(`.gw-snap-target[data-section="${id}"]`);
        if (!el) {
          console.warn(`skip ${season}/${accent}-${theme}/${id}: not found on page`);
          continue;
        }
        sizes[id] = await capture(el, path.join(dir, `${id}.webp`));
        console.log(`${season}/${accent}-${theme}/${id}.webp`);
      }

      for (const { id, tabIndex, views } of TOGGLED_SECTIONS) {
        await focusTab(page, tabIndex + tabOffset);
        for (const [n, view] of views.entries()) {
          if (n > 0) {
            await page.click(`.ui-card-toggle[data-toggle="${id}"]`);
            await page.waitForTimeout(300);
          }
          const el = await page.$(`.gw-snap-target[data-section="${id}"]`);
          if (!el) {
            console.warn(`skip ${season}/${accent}-${theme}/${id}-${view}: not found on page`);
            break;
          }
          sizes[`${id}-${view}`] = await capture(el, path.join(dir, `${id}-${view}.webp`));
          console.log(`${season}/${accent}-${theme}/${id}-${view}.webp`);
        }
      }

      await page.close();
    }
  }

  const manifest = { season, capturedAt: new Date().toISOString(), sizes };
  await writeFile(path.join(outRoot, "manifest.json"), JSON.stringify(manifest, null, 2) + "\n");
  console.log(`Done: season ${season}`);
}

async function main() {
  // Unset in CI (a freshly `playwright install`ed browser is used there);
  // only needed to point at a specific local Chromium build.
  const browser = await chromium.launch({ executablePath: process.env.PLAYWRIGHT_CHROMIUM_PATH || undefined });
  for (const season of SEASONS) {
    await captureSeason(browser, season);
  }
  await browser.close();
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
