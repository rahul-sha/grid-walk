# Roadmap: Grid Walk

- **Updated:** 2026-11-23

## Now
Being built this week or next. At most three items.
- A livelier, tidier About card, matching the other cards' size, with the stack's logos (v1.1.0).

## Next
Agreed and waiting for a slot.
- Fix the phone top-bar overflow at 390 px: the bar spills out of its island on small phones. (Question for Rahul: is this agreed?)

## Later
Ideas worth keeping, not yet agreed.
- Season Map/Calendar card and a Season Globe: mock-ups waiting for Rahul's reaction.
- Give the Driver/Constructor Podiums card a Drivers/Teams switch like the other shared cards, in place of its baked title and subsection.

## Done recently
- 2026-11-24: The carousel is the default home page again, restyled with the table's top bar and zoom bar, with a view switch beside theme and palette, and one card order for both views (v1.3.0).
- 2026-11-23: Points Evolution card redrawn as a flat race chart with Drivers/Teams and Place/Points switches (v1.2.0).
- 2026-11-22: App version numbers on the About card, raised in every pull request (PR #128).
- 2026-11-04: Latest Race card moved off the table into a top-bar drop-down; card toggles became sliding switches (PR #118).
- 2026-11-03: The desk ("clean table") became the home page; the carousel moved to `/carousel` (PR #112).
- 2026-11-03: Desk performance tidy-up and design-system fourth edition (PR #117).
- 2026-11-03: Fewer Vercel deployments to curb storage (PR #116).
- 2026-11-03: Positions Gained card (PR #114) and ten-shade Positions card (PRs #113, #115).

## Decisions
- 2026-11-24: The carousel is the default view; the table stays one tap away on the view switch, remembered per visitor. Latest Race lives only in the top-bar pill in both views, and both views show the cards in the table's order.
- 2026-11-23: Points Evolution stays 2D. Rahul was not satisfied with the 3D mock-ups and chose the standings race (Place) together with the points line chart in the same style (Points), with a faint grid on both.
- 2026-11-22: Versions follow 1.2.3 (fix, feature, redesign) and are raised in each pull request, with a check that stops one that forgets: Rahul's choice over an automatic bump after each merge.
- 2026-11-03: Old carousel kept at `/carousel`, unlinked: easy to compare or switch back, and the weekly capture uses it. Revert point: branch `milestone/pre-desk-home`.
- 2026-11-03: Pit-lane starts show as PL on Positions Gained and are left out like retirements.
- 2026-10-27: Latest Race is the one live card: session times must be in each visitor's own time zone.
- 2026-10-27: No pit-stop or lap data: it is not in the data pipeline.
- 2026-10-26: Keep the carousel's idle prefetch of every picture set: Rahul's choice, for instant theme switching.
- 2026-10-24: Repo stays public; no licence or community-standards files.
- 2026-10-23: Cards are baked pictures, not live: heavy charts made panning choppy.
