# Bugs

Last full check-up: none yet

Known bugs and gaps in Grid Walk, newest first. The Cartographer weekly review reads this file, so the helper can answer "any open bugs?" from any project. Add bugs here, not in GitHub issues; a copy in Trilium is for safekeeping only.

The "Last full check-up" line is set by each full check-up (343 Guilty Spark); a monthly run skips the project when it is 14 days old or less.

Move a bug to "Fixed" when its fix is merged, and add one line on what fixed it.

## Open

| Found | Bug | Where | Notes |
| --- | --- | --- | --- |
| 2026-11-22 | From 1 January 2027 (8:00 am Singapore) the home page opens on 2027, which has no data or pictures: every card shows "2027 images are not ready yet" until the first race in March, and Latest Race falls back to the live API | `src/lib/season-constants.ts` `currentSeason()`, `src/app/page.tsx` | Check-up 2026-11-22, design, Medium. Open on the newest season that has pictures, and offer the new season once its first race is in |
| 2026-11-22 | The jump tabs are hidden below 1300 px wide and the overview shows on phones only, so on most laptops (1280 px) and tablets there is no quick way to reach a card except dragging. The README and design system say the tabs show "on desktop" | `src/components/desk/desk.css` (`@media (max-width: 1300px)`), `README.md`, `docs/design-system.md` | Check-up 2026-11-22, design, Medium. Show compact tabs (or the overview) between 768 and 1300 px; mock-up first |
| 2026-11-22 | Latest Race is called the live card, but it reads the current season from the committed data file. Data-only commits do not deploy, so a race's results reach the card only when the picture job deploys, about two days after the race | `src/lib/ergast.ts` (snapshot first), `src/lib/recap.ts`, `scripts/vercel-ignore-build.sh` | Check-up 2026-11-22, workflow, Medium. Let Latest Race read the current season from the live API with the existing one-hour refresh, or reword `CLAUDE.md` and the README. Linked to the open deploy-skip decision from PR #120 |
| 2026-11-22 | Keyboard order: after "Skip to content", Tab goes through every card switch and the About card's links before it reaches the top bar (season, Latest Race, About) and the zoom controls | `src/components/desk/DeskView.tsx` (table comes before the bars) | Check-up 2026-11-22, design, Low. Put the top bar and zoom bar before the table in the page order; their on-screen position stays the same |
| 2026-11-22 | Touch targets on phones are below 44 px: the race flag chips (27 by 36), the season and About pills (36 tall), and the card switches (about 22 by 10 at the opening zoom) | Top bar, bottom bar, card headers | Check-up 2026-11-22, design, Low. Give each a 44 px tap area with padding or an invisible larger hit area, without changing the look |
| 2026-11-22 | No GitHub check runs lint and build on pull requests; only Vercel's preview build does, and image-only previews are skipped | `.github/workflows/` | Check-up 2026-11-22, workflow, Low. Add a small workflow that runs `npm test` on each pull request |
| 2026-11-22 | On phones a blank band of about 150 px sits between the top bar and the Championship row in the opening view | Home page, 390 px | Check-up 2026-11-22, design, Low. Check whether it is left over from the old Latest Race row, then close the gap; mock-up first |
| 2026-11-22 | 19 finished `claude/*` branches (already merged) are still on GitHub | GitHub branches | Check-up 2026-11-22, workflow, Low. Delete merged branches, or turn on "Automatically delete head branches" in the repo settings |
| 2026-11-22 | The roadmap was last updated on 16 November and its two questions for Rahul are unanswered; "Now" is empty | `docs/roadmap.md` | Check-up 2026-11-22, documents, Low. Answer the questions and pick the next item |
| 2026-11-22 | The build map (artifact and Trilium copy, last synced 16 November) lists "Playwright (end-to-end checks)", which no longer exist, and misses PRs #121 to #124 | Build map artifact, Trilium "Grid Walk / Build map" | Check-up 2026-11-22, documents, Low. Update the artifact first, then sync Trilium with the `trilium-project-docs` skill |
| 2026-11-18 | `npm run test:e2e` fails with "No tests found" because the `tests/` folder was removed in PR #95 | `package.json`, `playwright.config.ts` | Found by the Cartographer rules check (Low). Remove the script, or add real tests |
| 2026-11-02 | The desktop nav pill is capped at 940 px wide, so the sixth tab, "Driver Podiums", is cut off | `/carousel` only; `.gw-navpill` in `src/components/gridwalk/gridwalk.css` | Waiting for Rahul's OK to fix; the home page is not affected since PR #112 |

## Fixed

| Fixed | Bug | What fixed it |
| --- | --- | --- |
| 2026-11-24 | The picture job was not tied to the data job: both ran on fixed Monday times that GitHub fired about ten hours late and in either order | The picture job now starts from the data job (`workflow_run`, only after it succeeds, and only when the season's data is newer than its pictures); the data job is queued with a `concurrency` group and scheduled at 06:17 and 14:43 UTC, off the top of the hour |
| 2026-11-24 | The workflows used Node 20 and `actions/checkout@v4` / `setup-node@v4`, which printed a "Node.js 20 is deprecated" notice on every run | All four workflows use Node 22 with `actions/checkout@v7` and `actions/setup-node@v7` |
| 2026-11-24 | A re-baked card picture kept the same address, so a browser could keep showing the old one (seen again on 24 November: Las Vegas was live, the browser still showed Brazil as the last race) | The manifest's capture time is added to each picture address (`?v=<capturedAt digits>`) by `snapshotPath()` in `src/lib/variant-constants.ts` |
| 2026-11-23 | The season data job failed with "403 Forbidden": Jolpica now refuses requests that do not name the calling app, so Las Vegas (Rd 21) did not arrive | A `GridWalk/<version>` user agent on every Jolpica request, in `scripts/snapshot-season.mjs` and `src/lib/ergast.ts` |
| 2026-11-22 | The README lagged behind: old intro, no live link or full tech stack | README catch-up pull request: live link, tech stack panel, run steps, Tests and checks, Deploy, Where things live |
| 2026-11-22 | Unchecked `?season=`, `?noSnapshot=1`, and Latest Race season and round input; auto-commit action pinned by tag; 7 moderate development-tool advisories | Security tidy-up pull request: one `parseSeason()` check (2020 to this year) on both pages and the server action, capture mode ignored on Vercel, action pinned to its v5.2.0 commit, `npm audit fix` |
| 2026-11-22 | On phones (390 px wide) the top bar overflowed its island; `docs/design-system.md` disagreed | Checked in the 2026-11-22 check-up: at 390 px the logo, season, and About fit with no sideways scroll (the Latest Race pill moved to the bottom bar in PR #118), so `docs/design-system.md` is right |
| 2026-11-02 | Latest Race strip opened at Round 1 ("No races scheduled") while results were pending, and Session Times clipped | PR #109: round taken from the schedule; room kept for every session row |
