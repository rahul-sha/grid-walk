# Grid Walk

A personal Formula 1 results tracker built with Next.js, TypeScript and
Tailwind CSS. It reads race, sprint and championship data from the
[Jolpica F1 API](https://api.jolpi.ca/ergast/f1) (a community-run successor
to the retired Ergast API) and presents it as a set of driver/constructor
heatmaps and standings, styled after Google's Material 3 Expressive
language.

## Pages

**Home / Grid Walk** (`/`) is the site's entry point and its only page for
race data: the season's cards laid out neatly on one big table, in labelled
rows that group them by what they are about. **Latest race** holds the
Latest Race card, which is current-season only: a recap of a race (podium,
pole, fastest lap, full classification and qualifying order) plus that
race's own session schedule, converted into the visitor's own time zone. A
flag strip lets visitors browse any race of the season, not just the
latest; only the latest race's recap loads with the page, and every other
one is fetched on demand when picked. A race that hasn't happened yet shows
a plain "race yet to be held" message instead. **Championship** holds
Drivers/Team Results, Driver/Constructor Points Evolution and
Driver/Constructor Podiums; **Race by race** holds Positions, Positions
Gained and Finish/Qualifying Frequency. Results, Evolution, Frequency and
Podiums are shared cards — a driver half and a team half either stacked
with a divider or toggled in place with a pill button — and each card is
the same real heatmap, chart, grid or podium bars that used to live on its
own page, under the same title and subtitle. The last row, **About**,
covers who built the site, how, the design and data credits, and the
unofficial-fan-site disclaimer F1's brand guidelines ask every fan site to
carry on its landing page.

The previous presentation — the same cards on one horizontal carousel
strip, browsed one at a time — is kept at **`/carousel`** so the two can be
compared and the home page switched back easily; it is not linked from
the site itself.

On the Positions card every points finish (P1–P10) gets its own shade,
blended from the palette's heat colours, with bigger steps between P1, P2 and
P3 so the podium stands out; anything outside the points is left plain. The
column on the right is each driver's median finishing position (retirements
left out).

The Positions Gained card, next to it, shows how many places each driver
gained or lost from their grid slot to the chequered flag in every Grand
Prix (starting 12th and finishing 5th is +7). Gains are shaded on the
palette's heat ramp and losses in a neutral grey. Retirements are marked but
not counted, and the two columns on the right are each driver's average and
median over the races they finished.

Every card but Latest Race is pre-rendered: for each season, every
theme/palette combination is saved as a lossless WebP image under
`public/card-snapshots/<season>/<palette>-<theme>/`, with a `manifest.json`
recording each image's natural size so the layout is known before anything
loads. Visitors never render those cards live. The images come from
`scripts/capture-card-snapshots.mjs` (which photographs the cards rendered
live on `/carousel`), which the `capture-card-snapshots.yml`
workflow runs every Monday for the current season (pass a year, or `all`,
to capture finished seasons by hand). The visitor's theme and palette are
read from cookies so the server can pick the right image on first paint.
The table loads only the pictures for the current colour combination;
switching theme or palette fetches the new set then. (The carousel at
`/carousel` still prefetches every combination once the browser is idle.)
Latest Race is the deliberate exception: it's built fresh on every request
(`src/lib/recap.ts`), because converting each session time into the
visitor's own time zone can't be baked into a shared image. It only shows
anything for the current season, so its row is left off the table entirely
for any other one — switching seasons can change how many cards are on
the table. Picking a different race from its flag strip calls a server action
(`src/app/actions/recap.ts`) rather than shipping every race's results with
the page. About is the other exception: it's plain text and links, so
there's no snapshot to bake and no GPU cost to save by baking one.

Drag anywhere on the table to pan, and scroll or pinch to zoom around the
pointer; the controls at the bottom zoom in and out or fit the whole table
into view. An **overview** in the bottom-right corner shows the table in
miniature — every card as a labelled shape under its row label, with the
current view outlined — and pressing or dragging inside it moves the view.
On phones the overview sits folded small above the zoom controls; a tap
opens it full size and it folds away again a moment after the last touch.
On load the camera sits on the whole table while the cards rise into place
one after another, then glides in to the opening view (skipped under
reduced-motion settings, and cancelled by any early input). The top bar
holds the logo (back to the top of the table), an About pill that glides
to the About card, and the theme, palette and season controls. A live grid
drawn in the active theme's colours sits behind the cards, glowing around
the cursor — it switches off under reduced-motion settings, its redraw
work stays limited to the area it actually lights up, and it drops to
standard resolution while the table is moving, so dragging and zooming
stay smooth. Anything that changes every frame (the camera, the overview's
outline, the open tab) is written straight to the page rather than
re-rendering the cards. The old standalone Results, Positions and About
pages were retired once Grid Walk covered the same ground; their addresses
redirect here, as does the table's old preview address, `/desk`.

The top bar, logo and overview use a plain translucent surface with no
blur (a real device trace showed blur costing the GPU on every frame). The
carousel at `/carousel` also keeps its soft, slowly drifting gradient glow
behind the cards.

Pick a season from the selector in Grid Walk's top bar, shown as a
calendar icon next to the year. The app defaults to the current calendar
year; only seasons from 2020 onwards are supported.

## Navigation

Grid Walk's own top bar is the only navigation — the whole site is this
one table now. The carousel at `/carousel` keeps its own top bar and jump
bar.

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

Vercel skips a deployment when a commit changes only season data, and
skips branch previews for commits that change only the baked card images
(`scripts/vercel-ignore-build.sh`). Each deployment stores its own copy of
the images, so this keeps deployment storage down.

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
rounded container such as the top bar or logo island), a **pill** (a
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
