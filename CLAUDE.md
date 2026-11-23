# Grid Walk

## What this project does
Grid Walk is Rahul's personal Formula 1 stats site: every card of a season (results, points evolution, podiums, positions, positions gained, finish and qualifying frequency) laid out in labelled rows on one pannable, zoomable table, plus a live Latest Race drop-down. It is live at https://thegridwalk.vercel.app. The README describes every page and card in full.

## Tech stack
- Next.js 16 (App Router), React 19, TypeScript, Tailwind CSS v4. Server Components for data; no client-side data store.
- Hosted on Vercel (project `grid-walk`); production deploys from `main`.
- Race data from the Jolpica F1 API, saved as JSON snapshots in `data/seasons/`.
- GitHub Actions: `snapshot-season.yml` (weekly season data), `capture-card-snapshots.yml` (card pictures, started by the data job), `backfill-seasons.yml`.
- Playwright (used by the card-picture capture script) and `sharp`.

## Run commands
- Install: `npm install`
- Start locally: `npm run dev`, then open http://localhost:3000
- Check: `npm run lint` (one known warning about `<img>` in `GridWalk.tsx`), and `npm run build`
- Tests: no test suite. `npm test` runs the lint and build checks; Cartographer's safety check runs it before every pull request. `npm run test:e2e` exists but there are no e2e tests.
- Refresh a season's data: `npm run snapshot:season`, or run the `snapshot-season.yml` workflow.
- Re-bake card pictures: run the `capture-card-snapshots.yml` workflow (a year, or `all`; `all` takes 10 to 15 minutes).
- Version: raise `version` in `package.json` in every pull request that changes the site (`npm version patch|minor|major --no-git-tag-version`); `npm run check:version` checks it.
- Deploy: merge to `main`; Vercel deploys production automatically.

## Where things live
- Home page (the desk): `src/components/desk/`. Old carousel (kept at `/carousel`): `src/components/gridwalk/`.
- Shared parts (island, pill, card): `src/components/ui/`, `src/styles/ui.css`; tokens in `src/app/globals.css`.
- Design system: `docs/design-system.md`. Bugs: `docs/bugs.md`. Roadmap: `docs/roadmap.md`.
- Baked card pictures: `public/card-snapshots/<season>/<palette>-<theme>/` with a `manifest.json`.
- Latest Race recap: `src/lib/recap.ts` and the server action `src/app/actions/recap.ts`.
- Deploy skip rules: `scripts/vercel-ignore-build.sh`.

## Data and safety
- `main` is the live site; anything merged goes straight to visitors.
- The scheduled workflows commit season data and card pictures to `main` themselves. Do not run two picture captures at once.
- No secrets, auth, or forms. No environment variables are needed to run the site.
- The repo is public: never commit keys or personal details.
- Revert point for the desk home page: branch `milestone/pre-desk-home`.

## How to work
- This project uses the Cartographer plugin (turned on in `.claude/settings.json`). Its shared rules apply; project-only rules are in `.claude/rules/project-rules.md`. Log bugs in `docs/bugs.md` and plans in `docs/roadmap.md`.
- New feature, or a change across several files: show a short plan first and wait for Rahul's OK. Small fixes go straight ahead.
- Work on a branch with one small pull request per step. Never push to `main`.
- Rahul is new to Linux and programming: explain each step plainly, give exact commands, and say where to click.
- UK English with the Oxford comma.
- For a design change, show Rahul a mock-up or screenshot before building.

## Conventions and decisions
- Cards are baked pictures, not live: heavy charts made panning choppy. Latest Race and About are the only live cards.
- No blur anywhere: it cost the GPU on every frame.
- Season data is snapshot-first; the live API is only a fallback.
- Vercel skips data-only deploys and image-only previews: each deploy stores about 48 MB of pictures.
- The carousel stays at `/carousel`, unlinked: the weekly capture photographs the cards there.
- The About card's credit to Mateusz Karmalski's "F1 Results Tracker" Tableau visualisation stays unchanged.
