# Roadmap: Grid Walk

- **Updated:** 2026-11-16

## Now
Being built this week or next. At most three items.
- Nothing in progress. (Question for Rahul: what should come next?)

## Next
Agreed and waiting for a slot.
- Fix the phone top-bar overflow at 390 px: the bar spills out of its island on small phones. (Question for Rahul: is this agreed?)

## Later
Ideas worth keeping, not yet agreed.
- 3D-style Points Evolution chart: mock-up waiting for Rahul's reaction.
- Season Map/Calendar card and a Season Globe: mock-ups waiting for Rahul's reaction.
- Fix the carousel's clipped "Driver Podiums" tab (see `docs/bugs.md`).
- Give the Driver/Constructor Podiums card the same `bakedTitle` fix the Evolution card got in PR #100.

## Done recently
- 2026-11-04: Latest Race card moved off the table into a top-bar drop-down; card toggles became sliding switches (PR #118).
- 2026-11-03: The desk ("clean table") became the home page; the carousel moved to `/carousel` (PR #112).
- 2026-11-03: Desk performance tidy-up and design-system fourth edition (PR #117).
- 2026-11-03: Fewer Vercel deployments to curb storage (PR #116).
- 2026-11-03: Positions Gained card (PR #114) and ten-shade Positions card (PRs #113, #115).

## Decisions
- 2026-11-03: Old carousel kept at `/carousel`, unlinked: easy to compare or switch back, and the weekly capture uses it. Revert point: branch `milestone/pre-desk-home`.
- 2026-11-03: Pit-lane starts show as PL on Positions Gained and are left out like retirements.
- 2026-10-27: Latest Race is the one live card: session times must be in each visitor's own time zone.
- 2026-10-27: No pit-stop or lap data: it is not in the data pipeline.
- 2026-10-26: Keep the carousel's idle prefetch of every picture set: Rahul's choice, for instant theme switching.
- 2026-10-24: Repo stays public; no licence or community-standards files.
- 2026-10-23: Cards are baked pictures, not live: heavy charts made panning choppy.
