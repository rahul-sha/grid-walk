# Bugs

Known bugs and gaps in Grid Walk, newest first. The Cartographer weekly review reads this file, so the helper can answer "any open bugs?" from any project. Add bugs here, not in GitHub issues; a copy in Trilium is for safekeeping only.

Move a bug to "Fixed" when its fix is merged, and add one line on what fixed it.

## Open

| Found | Bug | Where | Notes |
| --- | --- | --- | --- |
| 2026-11-03 | On phones (390 px wide) the top bar overflows its island | Home page top bar, phones | Noted in the desk performance audit (PR #117); not yet fixed |
| 2026-11-02 | The desktop nav pill is capped at 940 px wide, so the sixth tab, "Driver Podiums", is cut off | `/carousel` only; `.gw-navpill` in `src/app/gridwalk.css` | Waiting for Rahul's OK to fix; the home page is not affected since PR #112 |

## Fixed

| Fixed | Bug | What fixed it |
| --- | --- | --- |
| 2026-11-02 | Latest Race strip opened at Round 1 ("No races scheduled") while results were pending, and Session Times clipped | PR #109: round taken from the schedule; room kept for every session row |
