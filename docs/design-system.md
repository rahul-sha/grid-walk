# Grid Walk design system

Fourth edition, 2026-11-03. The living copy of the design-system doc; update it with every change that touches an island, pill, card, token, or rule. The original Claude Doc (with the anatomy diagram of the carousel) is at https://claude.ai/artifact/7GVBYKg68jq7hGS6Yxh6TB.

## Why this exists

Grid Walk grew over a hundred-odd rounds, so the same idea, such as a rounded pill, ended up with several names and several copies of its CSS. This doc fixes one name for each part, so a request like "make the island taller" or "give the jump tabs more room" means one exact thing, and the code uses the same names.

This is the fourth edition. It describes the site after PR #112, when the **desk** became the home page: every card of the season laid out in labelled rows on one pannable, zoomable table, with jump tabs and a gliding accent pill in the top bar, an overview island in the corner, and a start-up animation. The previous home page, the **carousel** (a horizontal strip of cards), is kept unlinked at `/carousel`, where the weekly picture capture still photographs the cards. Shared parts (islands, pills, cards, tokens) are the same on both.

## Glossary

The site uses three shapes. An **island** floats on its own, a **pill** is a small control that sits inside an island or a card, and a **card** holds one graphic. Every other name in this table is a particular kind of one of these three, or a part of the layout they sit on.

### Shared parts

| Name | What it is | Kind | Where you see it |
| --- | --- | --- | --- |
| Island | A floating, rounded container, 48px tall, translucent on desktop and solid on phones | Shape | Logo island, top bar island, overview |
| Pill | A fully rounded control, 36px tall, that sits inside an island | Shape | Jump tabs, About, season picker, Fit all |
| Icon pill | A round pill, 36 × 36px, holding only an icon | Shape | Theme and palette buttons, zoom − and + |
| Card | A rounded tonal panel holding one graphic, with its title and subtitle at the top | Shape | Every card, on the desk and the carousel |
| Logo island | The island holding the Grid Walk mark and name. On the desk it glides back to the opening view | Island | Top left |
| Controls | About, theme, palette, and season, grouped together at the right of the top bar | Group | Top bar |
| Accent pill | A pill tinted with the accent colour, for the one action that leaves or resets the view | Pill | About, Fit all |
| Card toggle | A small accent pill, 12px text with a swap icon, at the top right of a card that has two views. It crossfades between them | Pill | Results (Drivers/Teams), Frequency (Finish/Qualifying) |
| Subsection | A second graphic lower in the same card, under its own header and a hairline | Part | Evolution (Constructors), Podiums (Teams) |
| Baked title | A card whose picture already carries its own title (because it also has a subsection), so the card shows no header of its own | Part | Evolution, Podiums |
| Divider | A 1 × 22px hairline between groups inside an island | Part | Top bar |
| Menu | A floating panel of options that opens from a pill | Surface | Season picker |
| Hint | The one line of muted help text that fades after your first move | Text | Under the top bar |
| Page plane | The flat background colour every page sits on | Layer | Everywhere |
| Live grid | The canvas grid that bends and glows round the cursor or finger, and drifts with the camera | Layer | Behind the desk and the carousel |
| Latest Race card | The one live card (not a picture): the race picker flag strip, the results, and session times in your own time zone | Card | First row of the desk (current season only) |
| About card | The live "About this site" card | Card | Last row of the desk |

### The desk (home page)

| Name | What it is | Kind | Where you see it |
| --- | --- | --- | --- |
| Table | The rounded surface (radius 28px, `--surface-1` at 55%) that every row sits on. Dragging anywhere on it pans; wheel or pinch zooms | Layout | Home page |
| Row | One group of cards, left-aligned, in a fixed order: Latest race, Championship, Race by race, About | Layout | Table |
| Row label | The small upper-case name above a row | Text | Table |
| Sheet | A card as it sits on the table, scaled down to 430px tall; its width follows the card's own shape | Card | Table |
| Camera | The view of the table: zoom from 25% to 250%, plus position | Behaviour | Home page |
| Opening view | The camera as the table opens: as wide as the table, at the top | Behaviour | Home page |
| Top bar | The logo island on the left and the top bar island on the right, along the top edge | Layout | Home page |
| Top bar island | The island holding the jump tabs, a divider, About, and the controls | Island | Top right |
| Jump tabs | A fixed row of pills, one per card except About. A tap glides the camera to that card | Pill | Top bar island, desktop only |
| Tab marker | The accent-container pill behind the open jump tab. The tabs never move; the marker glides to whichever tab is open. The open tab follows the card nearest the middle of the view as you pan | Part | Behind the jump tabs |
| Overview | An island in the bottom-right corner showing the whole table in miniature: a tile per card under its row label, and the viewport. Press or drag inside it to move the view | Island | Bottom right |
| Viewport | The accent-outlined rectangle in the overview showing what is on screen | Part | Overview |
| Zoom bar | The rounded bar at the bottom centre with −, zoom level, +, and Fit all | Control | Bottom centre |
| Start-up | On load, the camera sits on the whole table while the sheets and row labels rise in one after another, then it glides in to the opening view | Motion | Home page, once per load |
| Glide | The eased camera move used by jump tabs, About, the logo, and Fit all | Motion | Home page |

### The carousel (kept at `/carousel`)

| Name | What it is | Kind | Where you see it |
| --- | --- | --- | --- |
| Nav bar | The desktop island at the top: the tab strip, a divider, then the controls | Island | Desktop only |
| Jump bar | The phone island at the bottom: the tab strip, a divider, then Fit | Island | Phones only |
| Zoom island | The small corner island with −, zoom level, + and Fit, styled as flat tabs | Island | Desktop only, bottom right |
| Tab strip | The scrolling row of tabs inside the nav bar or jump bar. The open card's tab rests at its left | Part | Nav bar, jump bar |
| Card strip | The horizontal carousel of cards, 900px tall. The centred card is the focus card; its neighbours are dimmed. On first load the cards rise into place one after another | Layout | Carousel |
| Arrows | Round 44px buttons on the left and right edges that step one card | Control | Desktop |
| Glow | The two slow-drifting accent blobs behind the carousel (`.gw-pulse-a`, `.gw-pulse-b`) | Layer | Carousel only |

In conversation, use the name in the first column. For example, "the tab marker" means the accent pill gliding behind the jump tabs, "the overview's viewport" means the outlined rectangle in the corner map, and "the Results card toggle" means the Drivers/Teams switch.

## Foundations

Every colour comes from a small set of tokens, and each palette in each theme fills in the same set. The look is Material 3 Expressive: tonal surfaces, fully rounded pills, and no boxed cells or gridlines. Since round 58 there is no blur anywhere, because it cost too much on the GPU and made dragging choppy.

**Colour tokens** (in `src/app/globals.css`, one block per theme and palette)

| Token | Role |
| --- | --- |
| `--page-plane` | Page background |
| `--surface-1`, `--surface-2`, `--surface-3` | Tonal surfaces, lowest to highest. The table uses 1, islands and cards use 2, hover and overview tiles use 3 |
| `--text-primary`, `--text-secondary`, `--text-muted` | Text, strongest to weakest. Row labels use muted |
| `--accent` | Brand colour: logo mark, focus rings, live grid, the overview's viewport |
| `--accent-container`, `--on-accent-container` | Fill and text for the tab marker, active tabs, card toggles, and selected options |
| `--border-hairline` | 12–14% outlines and dividers |
| `--gridline`, `--baseline` | Chart axes |
| `--heat-0` to `--heat-6`, `--heat-fg-lo`, `--heat-fg-hi` | The seven-step heatmap ramp and its text colours |

**Themes and palettes:** two themes (Light and Dark) times four palettes (Monokai, Coffee, Ember, and Dracula), set by `data-theme` and `data-accent` on the page root. The keys are `monokai`, `coffee`, `ember`, and `dracula`; a choice saved under Ember's old key, `red`, is still honoured and renamed on the next load. Each choice is saved twice: in local storage for the first paint, and in the cookies `f1-theme` and `f1-accent` so the server can pick the matching card pictures. There are eight sets of card pictures per season, one per theme and palette pair.

**Scale** (the tokens at the top of `src/app/globals.css`, plus the desk's layout constants at the top of `DeskView.tsx`)

| Thing | Value | Used by |
| --- | --- | --- |
| Island height | 48px (`--island-h`) | Logo island, top bar island, nav bar, jump bar, zoom island |
| Pill height | 36px (`--pill-h`) | Jump tabs, tab marker, controls, Fit all, zoom buttons |
| Card toggle height | about 28px (6px padding, 12px text) | Card toggle |
| Card height | 900px, every card (`--card-h`) | Cards on the carousel; the desk measures each card at this size, then scales it |
| Sheet height | 430px at 100% zoom (`SHEET_H`) | Sheets on the desk |
| Gap between sheets | 36px (`GAP`) | Desk rows |
| Gap between rows | 64px, plus 30px for the row label (`ROW_GAP`, `LABEL_H`) | Desk |
| Table padding | 72px (`PAD`) | Desk |
| Zoom range | 25% to 250% (`K_MIN`, `K_MAX`) | Desk camera |
| Island radius | 28px (`--radius-island`) | All islands; the table uses the same 28px |
| Pill radius | 999px, fully round (`--radius-pill`) | All pills, the tab marker, and card toggles |
| Card radius | 14px (`--radius-card`) | Cards, the overview |
| Table card radius | 20px (`--radius-table-card`) | Heatmap tables in a capture |
| Menu radius | 16px, options 10px (`--radius-menu`, `--radius-menu-option`) | Season menu |
| Gap inside an island | 4px between tabs, 6–8px between groups | Top bar island, nav bar, jump bar |
| Edge inset | 16px on the desk; 20px desktop and 0.9rem phone on the carousel | Islands from the screen edge |
| Overview width | 360px (300px on phones), drawn at half size until hovered | Overview |

**Type:** the system font stack throughout. Pills and tabs use 13px at weight 600 (12px for jump tabs below 1540px wide), and card toggles 12px at weight 600. Row labels are 13px at weight 600, upper case, with 0.08em spacing, in `--text-muted`. The logo uses 0.95rem at weight 800, upper case, with 0.04em spacing. Card titles are 14px at weight 600 in `--text-secondary`, and subtitles, captions, and the hint use `--text-muted`. Overview tile titles are 12px at weight 600 (9px on the narrow Latest Race and About tiles), and its row labels 8px upper case.

**Elevation**

- **Translucent island** (desktop): `--island-fill` (`--surface-2` at 80% opacity) with `--shadow-island` (0 4px 16px at 22%, a hairline ring, and a faint top highlight). No blur.
- **Solid island** (phones): the same shape and shadow on plain `--surface-2`.
- **Overview:** `--surface-1` at 55%, so the table shows through, with `--shadow-island`.
- **Card:** a hairline border and `--shadow-card` (0 14px 40px at 22%). **Menu:** `--shadow-menu` (0 8px 24px at 18% plus a hairline ring).
- **Table:** a flat hairline ring and no shadow; it is the surface, not something floating on it.

**Motion**

- Tab and pill colours ease over 0.25s. A card toggle lifts 1px on hover and crossfades its two views over 0.22s.
- The tab marker glides to the open tab over 0.35s; the tabs themselves never move.
- The theme and palette icons spin in over 0.45s with an accent ring over 0.6s.
- **Start-up (desk):** with the camera on the whole table, each sheet and row label rises 48px and fades in over 0.6s, 90ms after the one before. About 0.15s after the last one lands, the camera glides to the opening view over 1.1s. Any press, drag, or wheel cancels the glide. It animates only position and opacity, never size.
- **Glides (desk):** an ease-out-cubic camera move: 0.7s for a jump tab, About, or the logo; 0.5s for Fit all.
- The overview grows from half to full size on hover over 0.28s. On phones it sits folded at 40%, opens on a tap, and folds again 2.2s after the last touch or as soon as the table is dragged.
- **Carousel:** each card rises 28px and fades in over 0.5s, 60ms apart, once per visit; cards glide with an ease-out camera.
- Reduced-motion settings switch all the decorative animations off; the desk then opens straight on the opening view.

## Components

Each component below lists what it holds, how it reacts, and where its code lives. Every shape is styled once in `src/styles/ui.css` (the `.ui-*` classes) and built once in `src/components/ui/` (the React components); the `dk-*` classes in `src/components/desk/desk.css` and the `gw-*` classes in `src/components/gridwalk/gridwalk.css` add position and layout on top. New UI is built from these parts rather than from raw elements and one-off classes.

### Shared

| Component | Holds | States | Desktop | Phone | Code |
| --- | --- | --- | --- | --- | --- |
| Logo island | Mark (accent) and "Grid Walk" | Hover tints with the accent; focus ring | 48px, top left | Same | `Logo` (`.ui-logo`) |
| Accent pill | Label | Hover: `--surface-3` | About, Fit all | Same | `Pill accent` (`.ui-pill--accent`) |
| Icon pill | Icon | Press shrinks to 90%; each theme or palette click spins the icon and sends an accent ring | 36 × 36px | Same | `IconPill` (`.ui-icon-pill`) in `ThemeToggle.tsx`, `AccentToggle.tsx`, and the zoom bar; the click feedback is `.icon-toggle-btn` in `globals.css`; icons in `ui/icons.tsx` |
| Season picker | Calendar icon, year, chevron; menu of seasons | Open flips the chevron; selected option uses accent container | Opens downwards | Same | `Pill` plus `Menu`, `MenuAnchor`, and `MenuOption` (`.ui-menu`, `.ui-menu-option`) in `SeasonSelector.tsx` |
| Card | Title, subtitle, a picture of the graphic, an optional subsection | See the desk and carousel tables | | | `.ui-card` for the look; `.gw-card`, `.gw-frame`, `.gw-fit` for fitting the content; `CardHeader` (`.ui-card-header`) for the title, left out when the card has a baked title |
| Card toggle | Swap icon and the other view's name | Hover lifts 1px; click crossfades the two pictures | Top right of the card header | Same | `CardToggle` (`.ui-card-toggle`) in the header (`.ui-card-head`); the two pictures are `.ui-card-views` and `.ui-card-view` |
| Subsection | Its own title and subtitle, then a graphic | None | A hairline and 1.6rem gap above | Same | `CardHeader subsection` (`.ui-subsection`) |
| Card picture | A `.webp` of one graphic, captured weekly per theme and palette | Shows "Image unavailable" at the right size if a capture is missing | Chosen from the theme and palette cookies | Same | `card-snapshots.ts`, `variant-constants.ts`, `scripts/capture-card-snapshots.mjs` (photographs `/carousel`) |
| Live grid | A canvas | Bends and glows round the pointer; a ring on each press; drops to 1x resolution while the camera moves and sharpens a beat after it stops | Behind everything | Same | `liveGrid.ts` |

### Desk

| Component | Holds | States | Desktop | Phone | Code |
| --- | --- | --- | --- | --- | --- |
| Table | Rows of sheets with their labels | Drag pans; wheel, ctrl-wheel, or pinch zooms about the pointer | Fills the window | Same | `.dk-wrap`, `.dk-world` (the camera's transform), `.dk-table`, `.dk-group-label`; layout in `layout()` in `DeskView.tsx` |
| Sheet | One production card, fitted to its frame then scaled to 430px tall | Controls inside (Latest Race's picker and table, card toggles) keep working; everything else pans | Same | Same | `.dk-sheet` around `.gw-card ui-card` |
| Top bar island | Jump tabs, divider, About, theme, palette, season | None of its own | Translucent island, top right | Solid island; the jump tabs are hidden | `Island` with `.dk-navpill` |
| Jump tabs | One `Pill` per card except About, and the tab marker | Tap glides to the card; the open tab follows the card nearest the view's middle | 13px, 12px below 1540px, hidden below 1300px | Hidden | `.dk-tabs`, `.dk-tab`, `.dk-tab-marker` |
| Overview | A tile per card under its row label, and the viewport | Hover grows it to full size; press or drag moves the view | Bottom right, half size until hovered | Folded to 40% above the zoom bar; tap opens | `.dk-minimap`, `.dk-mm-box`, `.dk-mm-tile`, `.dk-mm-label`, `.dk-mm-viewport` |
| Zoom bar | −, zoom level, +, Fit all | Level reads a percentage | Bottom centre | Same | `IconPill` and `Pill accent` inside `.dk-ctl` |
| Hint | "Drag the table to pan · scroll to zoom" | Fades after the first move | Under the top bar | Wraps to two lines | `.dk-hint` |

### Carousel (`/carousel`)

| Component | Holds | States | Desktop | Phone | Code |
| --- | --- | --- | --- | --- | --- |
| Nav bar | Tab strip, divider, controls | None of its own | Translucent island, width clamp(560px, 66vw, 940px), top centre | Splits: the controls sit as a top row, the tabs move to the jump bar | `Island` with `.gw-navpill` |
| Jump bar | Tab strip, divider, Fit | None of its own | Hidden | Solid island, full width less 0.9rem each side, 12px above the bottom | `Island` with `.gw-jumpbar-island`; on desktop the same island is the zoom island |
| Zoom island | −, level, +, Fit as flat tabs | Level reads "Fit" or a percentage | Translucent island, bottom right | Only Fit, inside the jump bar | `IconPill` and `Pill accent` inside `.gw-zoomctl` |
| Tab strip | Tabs | Snaps so the open tab rests at the left; swiping, wheeling, or dragging opens the tab that settles at the left; a fade on the right edge | Wheel steps one tab; mouse drag scrolls | Swipe scrolls | `TabStrip` (`.ui-tab-strip`) |
| Card on the strip | As a card | Focus: full opacity. Neighbours: 38%. Click toggles fit and natural size. Rises in on first load | 900px tall, fitted between the bars, never enlarged | Same | `.gw-slot` around `.gw-card` |
| Arrows | Chevron | Hidden at the first or last card | Left and right edges | Hidden | `.gw-arrow` |

## Layout and behaviour rules

The site has one main breakpoint: 640px and below is a phone, and 641px and up is desktop. These rules held across the recent rounds and should hold for anything new.

**Breakpoints (desk)**

- **1541px and up:** the logo island top left; the top bar island top right with every jump tab at 13px; the overview bottom right; the zoom bar bottom centre.
- **1301–1540px:** the same, with tighter 12px jump tabs.
- **1300px and below:** the jump tabs and their divider are hidden; the overview and About still reach every card.
- **640px and below:** solid islands, and the overview sits folded above the zoom bar.

**Breakpoints (carousel):** 641px and up has one translucent nav bar at the top centre with the zoom island bottom right; 640px and below has the controls row at the top and the jump bar at the bottom; 480px and below shows the logo mark only.

**Consistency rules**

1. Things that sit side by side share a height: islands are 48px, pills inside them are 36px, every card is measured at 900px, and every sheet on the desk is 430px.
2. One active state everywhere: the accent container fill with on-accent-container text. The tab marker and card toggles use it too.
3. Only one accent pill per island, for the action that leaves or resets the view, and at most one card toggle per card.
4. No borders on pills inside an island; hover uses `--surface-3` instead.
5. No blur. Translucency on desktop comes from opacity alone.
6. Every card looks like the others: the same card style, widths, and gaps, with no one-off treatments.
7. A graphic that comes in two flavours (drivers or teams, finish or qualifying) shares one card, either as a card toggle or as a subsection, rather than taking a second card.
8. A card with a subsection carries its title in the picture (a baked title) and shows no header of its own, so its two titles are always the same size.

**Interaction rules**

1. Islands, the overview, the zoom bar, and controls inside a card own their events. Pressing, dragging, or scrolling on them never pans or zooms the table.
2. On the desk, the rows are fixed: cards cannot be dragged or reordered. Dragging anywhere else pans.
3. On the desk, the jump tabs stay put and the tab marker moves; the open tab follows what is in the middle of the view. On the carousel, the open card's tab rests at the left of its tab strip.
4. Every press gets visible feedback, at the least a colour change, and an animation for buttons that change the whole view.
5. Visitors see pictures of the graphics, never a live render, except the Latest Race and About cards. Anything that changes a graphic must also re-run the capture script, or the change will not show.
6. One-off animations (the start-up, the carousel's rise-in) play once per load, and any user input cuts them short.
7. Anything that runs every frame (the camera, the overview's viewport, the live grid) is written straight to the page, never through a React re-render. React only renders when the sheets' own inputs change.

## How the code is organised

| Layer | File | What lives there |
| --- | --- | --- |
| Tokens | `src/app/globals.css` (top) | `--island-h`, `--pill-h`, `--card-h`, `--radius-island`, `--radius-pill`, `--radius-card`, `--radius-table-card`, `--radius-menu`, `--radius-menu-option`, `--island-fill`, `--shadow-island`, `--shadow-card`, `--shadow-menu`, and the colour tokens per theme and palette |
| Shapes | `src/styles/ui.css` | `.ui-island`, `.ui-pill` (`.active`, `--accent`), `.ui-icon-pill`, `.ui-logo`, `.ui-divider`, `.ui-tab-strip`, `.ui-card`, `.ui-card-header`, `.ui-card-head`, `.ui-card-toggle`, `.ui-card-views`, `.ui-card-view`, `.ui-subsection`, `.ui-menu-anchor`, `.ui-menu`, `.ui-menu-option` |
| Components | `src/components/ui/` | `Island`, `Pill` (accepts a `ref`), `IconPill`, `Divider`, `TabStrip`, `Logo`, `CardHeader`, `CardToggle`, `Menu`, `MenuAnchor`, `MenuOption`, `ThemeIcon`, `PaletteIcon` (all exported from `index.ts`) |
| Controls | `src/components/` | `ThemeToggle.tsx`, `AccentToggle.tsx`, `SeasonSelector.tsx`, built from the components above; `RecapCard.tsx` and `AboutCard.tsx` are the two live cards |
| Desk (home page) | `src/app/page.tsx`, `src/components/desk/` | `page.tsx` reads the season, the picture cookies, and the manifest on the server; `DeskView.tsx` holds the rows, the camera, the start-up, the jump tabs, and the overview; `desk.css` adds only position and layout |
| Carousel | `src/app/carousel/`, `src/components/gridwalk/` | `GridWalk.tsx` composes the carousel; `gridwalk.css` adds position and layout, and the card-fitting classes the desk reuses; `liveGrid.ts` is the canvas behind both |
| Pictures | `src/lib/variant-constants.ts`, `src/lib/card-snapshots.ts`, `scripts/capture-card-snapshots.mjs`, `public/card-snapshots/<season>/<palette>-<theme>/` | The theme and palette keys and cookies, the server-side picture choice, and the capture script with its weekly workflow |

Rules of thumb:

1. A new control goes inside an island as a `Pill` or `IconPill`; a new floating container is an `Island`. Neither needs new CSS for its look.
2. A card with two flavours of one graphic gets a `CardToggle` and two pictures, or a `CardHeader subsection` under the first graphic, never a second card.
3. A new card goes in both `GROUPS` in `DeskView.tsx` (the desk's rows) and the carousel's sections in `GridWalk.tsx` (which the capture script photographs), with the same title, `navLabel`, and `bakedTitle`.
4. A size, radius, or shadow is a token. If a new one is needed, add it to the token block rather than writing a literal.
5. `desk.css`, `gridwalk.css`, and `globals.css` rules say where something sits; `ui.css` rules say what it looks like. A `dk-*` or `gw-*` rule that sets a fill, radius, or shadow is a smell.
6. Anything that changes a graphic also re-runs the capture script, or visitors will not see it.

## Known gaps

These are places where the desk does not yet follow the rules above. They are listed so they are not copied; each would be a small visible change, so each wants a mock-up before it is touched.

1. **The zoom bar, overview, hint, and table set their own look** in `desk.css` (fill, border, radius, shadow) instead of being an `Island` or using tokens. The zoom bar in particular is a hand-made pill bar rather than an island.
2. **The top bar island does not fit a phone.** At 390px wide the island runs past the right edge, so the season picker is cut off.
3. **The opening view on a phone** is limited by the 25% minimum zoom, so the table opens wider than the screen with its left side cut off.
4. **The hint says "scroll to zoom" on phones**, where it means pinch.
5. **Card radius:** cards (14px) and table cards (20px) still differ. Unifying on 20px is not done.

## How we got here

**Third edition (PRs #89 to #93, rounds 64 to 68):** the code plan from the second edition shipped as five PRs, each screenshot-diffed on desktop and phone, light and dark: tokens (#89), shared styles in `ui.css` (#90), shared components in `src/components/ui/` (#91), a tidy-up (#92), and the first copy of this document (#93).

**Since then:** the About page became the live About card (#107), the Latest Race card (#102, #103) and the Positions Gained card (#114) were added, and the desk replaced the carousel as the home page (#112), with the carousel kept at `/carousel` and a revert point on the branch `milestone/pre-desk-home`.

**Fourth edition (this one):** adds the desk's parts (table, rows, sheets, top bar island, jump tabs and tab marker, overview, zoom bar, start-up, glides), the baked-title rule, the per-frame rendering rule, and the known gaps above.
