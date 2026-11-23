# Grid Walk

Rahul's personal Formula 1 stats site: every card of a season (results,
points evolution, podiums, positions, positions gained, and finish and
qualifying frequency) laid out in labelled rows on one pannable, zoomable
table, plus a Latest Race drop-down. Live at
[thegridwalk.vercel.app](https://thegridwalk.vercel.app).

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

## What it does

- **One table for a season.** The cards sit in labelled rows: **Championship** (Results, Points Evolution, Podiums), **Race by race** (Positions, Positions Gained, Finish and Qualifying Frequency), and **About**. Drag to pan, scroll or pinch to zoom; the jump tabs (desktop) or the overview (phones) take you straight to a card.
- **Latest Race.** A pill in the top bar opens a recap of any race of the current season: podium, pole, fastest lap, full classification, qualifying order, and session times in your own time zone.
- **Card switches.** Results, Podiums, and Frequency switch between Drivers and Teams, or Finish and Qualifying. Points Evolution has two switches: Drivers or Teams, and Place (championship place after each race) or Points (running total).
- **Seasons from 2020.** Pick a season from the calendar pill in the top bar; the site opens on the current year.
- **Four palettes, light and dark.** Monokai, Coffee, Ember, and Dracula, remembered between visits.
- **Installable.** Add it to a phone's home screen or install it from the address bar in Chrome or Edge.

## How it works

- **Data.** Race data comes from the [Jolpica F1 API](https://api.jolpi.ca/ergast/f1) and is saved as one JSON file per season in `data/seasons/`. The site reads those files; the live API is only a fallback for a season with no file. Every request to Jolpica names the app (`GridWalk/<version>`), as its [guide](https://github.com/jolpica/jolpica-f1/blob/main/docs/README.md) requires.
- **Cards are pictures.** Every card except Latest Race and About is a saved WebP picture, one per season, palette, and theme, in `public/card-snapshots/`. Heavy live charts made panning choppy. Each season's `manifest.json` holds the picture sizes and the capture time, which is added to every picture address (`?v=...`) so browsers fetch a new set instead of showing a stored one.
- **Weekly jobs.** `snapshot-season.yml` refreshes the current season twice each Monday (2:17 pm and 10:43 pm Singapore time; GitHub may start scheduled jobs late). When it brings new data, `capture-card-snapshots.yml` starts by itself and re-makes that season's pictures by photographing the cards at `/carousel`. Both can be run by hand; the picture job takes a year, or `all`.
- **Old carousel.** The previous home page is kept, unlinked, at `/carousel`, because the picture job needs it.
- **Design.** Everything is built from three parts (island, pill, card) with colours from theme variables; see [docs/design-system.md](docs/design-system.md). There is no blur anywhere, because it cost the GPU on every frame.

## Run it locally

1. Install [Node.js](https://nodejs.org) (the current LTS version).
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

It runs the version check, the lint check (one known warning about `<img>`), and the production build.

Every pull request that changes the site raises the version in `package.json`, which the About card shows: `npm version patch --no-git-tag-version` for a fix, `minor` for a feature, `major` for a redesign. Season data, card pictures, docs, workflows, and scripts need no new version. The **Check version** workflow stops a pull request that forgets.

## Deploy

The site is hosted on Vercel (project `grid-walk`). Merging a pull request into `main` deploys it to production; each pull request gets a preview first. Vercel skips deployments for commits that change only season data, and previews for commits that change only card pictures (`scripts/vercel-ignore-build.sh`), because every deployment stores its own copy of the pictures.

## Where things live

| Where | What |
| --- | --- |
| `src/components/desk/` | The home page table (the "desk") |
| `src/components/gridwalk/` | The old carousel, kept at `/carousel` |
| `src/components/ui/`, `src/styles/ui.css` | Shared parts: island, pill, card |
| `src/app/globals.css` | Theme colours and design tokens |
| `src/lib/` | Data loading, Latest Race recap, season helpers |
| `data/seasons/` | Saved season data, one JSON file per year |
| `public/card-snapshots/` | Baked card pictures and their manifests |
| `scripts/` | Season snapshot and card-picture capture scripts, Vercel skip rules |
| `.github/workflows/` | Season data, card pictures, backfill, and version check jobs |
| `CLAUDE.md` | How Claude works in this project |
| `docs/design-system.md` | The design system |
| `docs/bugs.md` | The bug list |
| `docs/roadmap.md` | The plan |

## Security

The site has no sign-in, forms, or secrets. Season and round values from outside the app are checked against the supported seasons before use, the workflows pass their inputs to the shell as environment variables, the third-party auto-commit action is pinned to an exact commit, and `next.config.ts` sets the standard browser security headers.
