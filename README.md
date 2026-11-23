# Grid Walk

Rahul's personal Formula 1 stats site: every card of a season (results,
points evolution, podiums, positions, positions gained, and finish and
qualifying frequency) laid out in labelled rows on one pannable, zoomable
table, plus a Latest Race drop-down. Live at
[thegridwalk.vercel.app](https://thegridwalk.vercel.app).

Race, sprint, and championship data come from the
[Jolpica F1 API](https://api.jolpi.ca/ergast/f1) (a community-run successor
to the retired Ergast API); the look follows Google's Material 3 Expressive
language.

## Tech stack

<table>
  <tr>
    <th width="190">Front-end</th>
    <th width="130">Data</th>
    <th width="130">Hosting</th>
    <th width="150">Other</th>
  </tr>
  <tr>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/nextjs/nextjs-original.svg" height="36" alt="Next.js" title="Next.js">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/react/react-original.svg" height="36" alt="React" title="React">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/typescript/typescript-original.svg" height="36" alt="TypeScript" title="TypeScript">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/tailwindcss/tailwindcss-original.svg" height="36" alt="Tailwind CSS" title="Tailwind CSS">
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/json/json-original.svg" height="36" alt="JSON snapshots" title="JSON snapshots">
    </td>
    <td align="center">
      <img src="https://cdn.simpleicons.org/vercel/000/fff" height="36" alt="Vercel" title="Vercel">
      <img src="https://cdn.simpleicons.org/githubactions" height="36" alt="GitHub Actions" title="GitHub Actions">
    </td>
    <td align="center">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/playwright/playwright-original.svg" height="36" alt="Playwright" title="Playwright">
      <img src="https://cdn.jsdelivr.net/gh/devicons/devicon@v2.16.0/icons/nodejs/nodejs-original.svg" height="36" alt="Node.js" title="Node.js">
    </td>
  </tr>
  <tr>
    <td align="center" valign="top"><sub>Next.js 16 (App Router)<br>React 19<br>TypeScript<br>Tailwind CSS v4<br>Installable as a PWA</sub></td>
    <td align="center" valign="top"><sub>Jolpica F1 API<br>Season JSON files in <code>data/seasons/</code></sub></td>
    <td align="center" valign="top"><sub>Vercel<br>GitHub Actions (weekly jobs)</sub></td>
    <td align="center" valign="top"><sub>Playwright (card pictures)<br>sharp (WebP images)<br>Node.js scripts</sub></td>
  </tr>
</table>

## Pages

**Home / Grid Walk** (`/`) is the site's entry point and its only page for
race data: the season's cards laid out neatly on one big table, in labelled
rows that group them by what they are about. The Latest Race card is kept
off the table: a pill in the top bar (on phones, in the bottom island next
to the zoom controls) opens it as a drop-down, and it always shows the
current season, whichever season is on the table. A small dot on the pill
marks a result the visitor hasn't opened yet. The card is a recap of a race
(podium, pole, fastest lap, full classification and qualifying order) plus
that race's own session schedule, converted into the visitor's own time
zone. A flag strip lets visitors browse any race of the season, not just
the latest; only the latest race's recap loads with the page, and every
other one is fetched on demand when picked. A race that hasn't happened yet
shows a plain "race yet to be held" message instead. **Championship** holds
Drivers/Team Results, Driver/Constructor Points Evolution and
Driver/Constructor Podiums; **Race by race** holds Positions, Positions
Gained and Finish/Qualifying Frequency. Points Evolution has two sliding
switches: Drivers or Teams, and Place or Points. Place shows each
championship place after every race, so an overtake in the standings is a
visible crossing; Points shows the running points total, so the size of
every gap is visible. Both draw one line per driver or team in the team's
colour (dashed for a team's second driver), with a faint grid down from
each race and a name pill with the season total at the end of every line.
Results, Evolution, Frequency and
Podiums are shared cards — a driver half and a team half either stacked
with a divider or toggled in place with a sliding two-way switch — and each card is
the same real heatmap, chart, grid or podium bars that used to live on its
own page, under the same title and subtitle. The last row, **About**,
covers who built the site and how, live numbers worked out from the
season files (seasons, races, and drivers on the table), how to get around
(drag, zoom, jump tabs), the design inspiration credit, the stack the site
is built with (with each tool's logo), the palettes' sources, and the
unofficial-fan-site disclaimer F1's brand guidelines ask every fan site to
carry on its landing page. It is laid out at the same size as the baked
cards, so it sits at the same width and text size as the cards above it.

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
Its numbers come from `src/lib/site-stats.ts`, and its logos are
monochrome Simple Icons paths copied into `src/components/about/stackLogos.ts`
(no extra package). Its badge shows the site's version and the date of the live build (for
example "v1.0.0 · 22 Nov 2026"); hover or tap it to see the commit code.

Drag anywhere on the table to pan, and scroll or pinch to zoom around the
pointer; the controls at the bottom (with the theme and palette toggles)
zoom in and out or fit the whole table into view. On desktop the jump tabs
in the top bar glide to any card; no tab is lit until you first move, and
pressing the logo returns to the opening view. On phones an **overview**
sits folded small above the bottom controls — the table in miniature, every
card as a labelled shape under its row label, with the current view
outlined; a tap opens it full size, pressing or dragging inside it moves
the view, and it folds away again a moment after the last touch.
The start-up plays once per visit (not on a season switch): the camera
sits on the whole table while the cards rise into place one after another, then glides in to the opening view (the top of the table on desktop, the first card on phones; skipped under
reduced-motion settings, and cancelled by any early input). The top bar
holds the logo (back to the top of the table), the jump tabs, the Latest
race pill, the season switcher, and an About pill that glides to the About
card. A live grid
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

## Run it locally

1. Install [Node.js](https://nodejs.org) (the current LTS version, 24).
2. In a terminal, inside this folder, download the packages the site uses:

   ```bash
   npm install
   ```

3. Start the site on your computer:

   ```bash
   npm run dev
   ```

4. Open [http://localhost:3000](http://localhost:3000) in your browser.

No settings or keys are needed.

## Tests and checks

There is no test suite yet. Before opening a pull request, run:

```bash
npm test
```

It runs the lint check (`npm run lint`, one known warning about `<img>`)
and then the production build (`npm run build`), and takes a few minutes.
Claude runs it automatically before every pull request. `npm run test:e2e`
exists but has no tests to run.

### Version numbers

The site's version lives in `package.json` (`"version"`) and shows on the
About card. Every pull request that changes the site raises it:

| Change | Example |
| --- | --- |
| Fix or small tweak | 1.0.0 to 1.0.1 |
| New card or feature | 1.0.1 to 1.1.0 |
| Big redesign | 1.1.0 to 2.0.0 |

Change it in `package.json` and `package-lock.json` together, or run
`npm version patch --no-git-tag-version` (or `minor`, or `major`), which
does both. Season data, card pictures, docs, workflows, and scripts do not
need a new version. `npm run check:version` (also the first step of
`npm test`) and the **Check version** workflow on every pull request stop
one that forgets.

## Deploy

The site is hosted on Vercel (project `grid-walk`). Merging a pull request
into `main` deploys it to production automatically; each pull request gets
its own preview first. `main` is the live site, so changes always go
through a branch and a pull request.

## Data source

The site shows seasons from 2020 onwards. `data/seasons/` also holds every
season back to 1950 (filled in by the `backfill-seasons.yml` workflow), but
those older seasons are not offered on the site.

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

## Where things live

| Where | What |
| --- | --- |
| `src/components/desk/` | The home page table (the "desk") |
| `src/components/gridwalk/` | The old carousel, kept at `/carousel` |
| `src/components/ui/`, `src/styles/ui.css` | Shared parts: island, pill, card |
| `src/lib/` | Data loading, Latest Race recap, season helpers |
| `data/seasons/` | Saved season data, one JSON file per year |
| `public/card-snapshots/` | Baked card pictures and their manifests |
| `scripts/` | Season snapshot and card-picture capture scripts, Vercel skip rules |
| `.github/workflows/` | Weekly season data, weekly card pictures, and backfill jobs |
| `CLAUDE.md` | How Claude works in this project |
| `docs/design-system.md` | The design system |
| `docs/bugs.md` | The bug list |
| `docs/roadmap.md` | The plan |

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
an external request. Every season that comes from outside the app (a
`?season=` address or the server action) is checked against the supported
seasons first, and `/carousel`'s capture mode (`?noSnapshot=1`) only works on
the capture job's own local server, never on Vercel. The workflows pin the
third-party auto-commit action to an exact commit.
