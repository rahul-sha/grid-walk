# Project rules: Grid Walk

Rules for this project only. They add to, or override, the shared rules from the Cartographer plugin (`DESIGN.md` and the shared skills). Claude Code loads this file automatically because it sits in `.claude/rules/`.

Cartographer plugin: 0.16.0 (the version this project last took in; the setup-project skill sets it, and the version check compares it at the start of each session)

Keep each rule to one line, with the reason after a colon. Tag each one so the weekly review can sort it.

## Adds
Rules the shared base does not cover.

- [data] After changing how any baked card looks, re-run the `capture-card-snapshots.yml` workflow for the affected seasons: visitors see the saved pictures, never the live card.
- [data] Do not start two picture captures at once, and check after each race weekend that the season-data job ran before the capture job: the jobs can fire hours late and leave stale pictures.
- [data] Read season data from `data/seasons/<year>.json`; use the live Jolpica API only as a fallback when a season has no snapshot: keeps pages fast and off the API.
- [design] Take every colour, including heatmap shades, from the theme variables in `src/app/globals.css`: all four palettes, light and dark, must keep working.
- [design] Build new UI from the island, pill, and card parts in `src/components/ui/` and `src/styles/ui.css`, and update `docs/design-system.md` in the same pull request: keeps one name and one style per part.
- [design] No blur or backdrop-filter anywhere: a device trace showed it costing the GPU on every frame while panning.
- [design] Anything that changes every frame (camera, overview outline, open tab) is written straight to the page, not through React state: re-rendering the cards makes dragging choppy.
- [design] Keep the About card's credit to Mateusz Karmalski's "F1 Results Tracker" Tableau visualisation unchanged: it is the original design inspiration.
- [workflow] Keep the old carousel working at `/carousel`: the weekly capture photographs the cards there.
- [deploy] Leave `scripts/vercel-ignore-build.sh` skipping data-only and preview image-only deploys: each deploy stores about 48 MB of card images.
- [workflow] Update the README in the same pull request when a page, card, or workflow changes: the README is the site's full description.
- [workflow] Update `docs/design-system.md` and the About card in the same pull request as a change they describe: the About card tells visitors how the site works, and the design system names every part.

## Overrides
Rules that replace a shared one for this project. Name the shared rule being replaced.

- None yet.

## Tags
Use one of: `design`, `workflow`, `safety`, `testing`, `writing`, `deploy`, `data`.
