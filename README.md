# Grid Walk

A personal Formula 1 results tracker built with Next.js, TypeScript and
Tailwind CSS. It reads race, sprint and championship data from the
[Jolpica F1 API](https://api.jolpi.ca/ergast/f1) (a community-run successor
to the retired Ergast API) and presents it as a set of driver/constructor
heatmaps and standings, styled after Google's Material 3 Expressive
language.

## Pages

**Home / Grid Walk** (`/`) is the site's entry point and now its only page
for race data. The first card, **Latest Race**, is current-season only: a
recap of a race (podium, pole, fastest lap, full classification and
qualifying order) plus that race's own session schedule, converted into the
visitor's own time zone. A flag strip lets visitors browse any race of the
season, not just the latest; only the latest race's recap loads with the
page, and every other one is fetched on demand when picked. A race that
hasn't happened yet shows a plain "race yet to be held" message instead. The
remaining five graphics
follow it on the same horizontal carousel strip, in the same order as the
"Jump to" bar below it: Driver/Constructor Points Evolution,
Driver/Constructor Podiums, Drivers/Team Results, Finish and Qualifying
Frequency, and Positions. The latter four are shared cards — a driver half
and a team half either stacked with a divider or toggled in place with a
pill button — and each card is the same real heatmap, chart, grid or podium
bars that used to live on its own page, under the same title and subtitle.
The last card, **About**, covers who built the site, how, the design and
data credits, and the unofficial-fan-site disclaimer F1's brand guidelines
ask every fan site to carry on its landing page.

Every card but Latest Race is pre-rendered: for each season, every
theme/palette combination is saved as a lossless WebP image under
`public/card-snapshots/<season>/<palette>-<theme>/`, with a `manifest.json`
recording each image's natural size so the layout is known before anything
loads. Visitors never render those cards live. The images come from
`scripts/capture-card-snapshots.mjs`, which the `capture-card-snapshots.yml`
workflow runs every Monday for the current season (pass a year, or `all`,
to capture finished seasons by hand). The visitor's theme and palette are
read from cookies so the server can pick the right image on first paint,
and the other colour combinations are prefetched once the browser is idle.
Latest Race is the deliberate exception: it's built fresh on every request
(`src/lib/recap.ts`), because converting each session time into the
visitor's own time zone can't be baked into a shared image. It only shows
anything for the current season, so it's left out of the strip entirely
for any other one — switching seasons can change how many cards are on
the strip. Picking a different race from its flag strip calls a server action
(`src/app/actions/recap.ts`) rather than shipping every race's results with
the page. About is the other exception: it's plain text and links, so
there's no snapshot to bake and no GPU cost to save by baking one.

Browse by dragging, swiping, the side arrows, the ← → keys or the jump-bar
tabs. Scroll or pinch to zoom around the pointer, then drag to pan; a
sideways trackpad swipe browses instead of zooming. Click the centred card
(or press Esc) to jump between full size and fit. On desktop the controls
sit in one translucent top bar; on phones they split between a top bar and
a bottom jump bar. A live grid drawn in the active theme's colours sits
behind the cards, glowing around the cursor and rippling on each click or
tap — all of it switches off under reduced-motion settings, and its redraw
work stays limited to the area it actually lights up so dragging and
scrolling stay smooth. The old standalone Results, Positions and About
pages were retired once Grid Walk covered the same ground; their addresses
redirect here.

Every page sits over a soft, slowly drifting gradient glow built from the
active theme's own colours. The Grid Walk bars and logo, and each page's
title/subtitle card, use a plain translucent surface with no blur (a real
device trace showed blur costing the GPU on every frame); table cards
elsewhere are solid.

Pick a season from the selector in Grid Walk's top bar, shown as a
calendar icon next to the year. The app defaults to the current calendar
year; only seasons from 2020 onwards are supported.

## Navigation

Grid Walk's own top bar and jump bar are the only navigation — the whole
site is this one page now.

## Getting started

```bash
npm install
npm run dev
```

Then open [http://localhost:3000](http://localhost:3000).

## Data source

Season data is snapshot-first: each season from 2020 onwards is saved as a
JSON file in `data/seasons/<year>.json`, committed to the repo, so pages
don't hit the live API on every request. A weekly GitHub Action
(`snapshot-season.yml`, also runnable by hand) refreshes the current
season's snapshot. A live fetch from `https://api.jolpi.ca/ergast/f1` is
used only as a fallback, when no snapshot exists yet for a season at all.
No API key is required.

Grand Prix flags/abbreviations, constructor colours and team-name display
overrides are mapped locally in `src/lib/circuits.ts`,
`src/lib/team-colors.ts` and `src/lib/team-names.ts`.

## Theming

Four colour palettes — Monokai (default), Coffee, Ember and Dracula — can
be toggled from Grid Walk's top bar and are remembered in `localStorage`
and a cookie. Each has a light and a dark variant, switched independently
of palette (there's no Auto option). All colour in the UI, including the
heatmap shading, comes from theme CSS custom properties in
`src/app/globals.css`, so nothing is hardcoded to a single palette.

## Design system

The full reference — every part's name, its tokens, its rules, and where
each lives in the code — is [docs/design-system.md](docs/design-system.md).

In short: the UI is built from three shapes, an **island** (a floating
rounded container such as the nav bar or logo island), a **pill** (a
control inside an island, such as a tab) and a **card** (one graphic).
Their sizing and styling are design tokens in `src/app/globals.css`, each
shape is styled once in `src/styles/ui.css`, and the matching React
components live in `src/components/ui/` (`Island`, `Pill`, `Divider`,
`TabStrip`, `Logo`, `CardHeader`, `CardToggle`, `Menu`, and the theme/palette
icons). New UI should be built from these rather than from raw elements and
one-off classes.

## Install as an app

Grid Walk is a Progressive Web App: a web app manifest
(`public/manifest.webmanifest`), home-screen icons (`public/icons/`,
`public/apple-touch-icon.png`), a themed status bar, and a minimal service
worker (`public/sw.js`, no caching, just enough to make the app
installable) let Chrome, Edge and Safari offer "Install" or "Add to Home
Screen".

- **Android (Chrome):** open the site, tap the **⋮** menu, then **Add to
  Home screen** / **Install app**.
- **iPhone/iPad (Safari):** open the site, tap the **Share** icon, then
  **Add to Home Screen**.
- **Desktop (Chrome/Edge):** open the site, click the install icon at the
  right of the address bar (or the **⋮** menu → **Install Grid Walk…**).

The browser tab icon switches between a light and dark version to match
the device's own setting. The home-screen icon itself can't retheme live
once installed — a platform limitation — but on Android 13+ a
"monochrome" variant lets the OS tint it to match the phone's system theme,
the same as a native app's icon.

## Tech stack

- Next.js (App Router) + TypeScript
- Tailwind CSS v4
- Server Components for data fetching, no client-side data store

## Security

The season-snapshot GitHub Action passes its workflow inputs to the shell
via `env:` variables rather than interpolating them into `run:` script
text, which avoids a class of GitHub Actions script-injection
vulnerability. `next.config.ts` sets standard browser security headers
(`X-Frame-Options`, `X-Content-Type-Options`, `Referrer-Policy`,
`Permissions-Policy`). The app has no auth or forms, and no secrets are
committed to the repo. Its one server action (fetching a single race's
recap for the Latest Race card's flag strip) takes a season and round
number and reads from the same local, public season-snapshot data every
page already renders from — no user input reaches a file path, a query, or
an external request.
