# Bugs

Known bugs and gaps in Grid Walk, newest first. The Cartographer weekly review reads this file, so the helper can answer "any open bugs?" from any project. Add bugs here, not in GitHub issues; a copy in Trilium is for safekeeping only.

Move a bug to "Fixed" when its fix is merged, and add one line on what fixed it.

## Open

| Found | Bug | Where | Notes |
| --- | --- | --- | --- |
| 2026-11-18 | The Latest Race server action passes the season and round from the browser straight on: the season becomes part of a file path in `data/seasons/` and, when no file exists, a live Jolpica request. Low risk (it only reads `.json` files), but the README's Security section says no user input reaches a file path or request | `src/app/actions/recap.ts`, `src/lib/season-snapshot.ts` | Found by the Cartographer rules check (Low). Suggested fix: accept only a whole-number season from 2020 to the current year and a positive whole-number round, else return nothing |
| 2026-11-18 | `npm run test:e2e` fails with "No tests found" because the `tests/` folder was removed in PR #95 | `package.json`, `playwright.config.ts` | Found by the Cartographer rules check (Low). Remove the script, or add real tests |
| 2026-11-18 | `docs/design-system.md` says the top bar fits at 390 px wide, which disagrees with the phone overflow bug below | `docs/design-system.md`, "Known gaps" | Check at 390 px, then correct whichever is wrong |
| 2026-11-03 | On phones (390 px wide) the top bar overflows its island | Home page top bar, phones | Noted in the desk performance audit (PR #117); not yet fixed |
| 2026-11-02 | The desktop nav pill is capped at 940 px wide, so the sixth tab, "Driver Podiums", is cut off | `/carousel` only; `.gw-navpill` in `src/components/gridwalk/gridwalk.css` | Waiting for Rahul's OK to fix; the home page is not affected since PR #112 |

## Fixed

| Fixed | Bug | What fixed it |
| --- | --- | --- |
| 2026-11-02 | Latest Race strip opened at Round 1 ("No races scheduled") while results were pending, and Session Times clipped | PR #109: round taken from the schedule; room kept for every session row |
