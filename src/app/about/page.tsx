import Image from "next/image";
import HomeLogo from "@/components/HomeLogo";
import LiveGridBackground from "@/components/gridwalk/LiveGridBackground";

export const metadata = { title: "About | Grid Walk" };

function CreditIcon({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span className="credit-icon" title={title}>
      {children}
    </span>
  );
}

export default function AboutPage() {
  return (
    <div className="px-[10px] py-6 sm:p-6">
      <LiveGridBackground />
      <HomeLogo />
      <div className="about-page-wrap">
      <div className="page-header">
        <h1 className="text-sm font-semibold" style={{ color: "var(--text-secondary)" }}>
          About
        </h1>
        <p className="text-sm">Who built this, how, and who it&apos;s built on.</p>
      </div>

      <div className="about-layout">
        <div className="about-main">
        <section id="about-project" data-rail-label="About this project" className="about table-card">
          <h2 className="mb-2.5 text-sm font-semibold">About this project</h2>
          <p>
            A personal F1 results tracker, directed by one person and built by Claude
            (Anthropic&rsquo;s AI coding assistant) — every design reviewed and approved before it
            goes live.
          </p>

          <p>
            <strong>What Claude did here:</strong>
          </p>
          <ul>
            <li>Designed and built the whole site — heatmaps, charts, theming and navigation</li>
            <li>Wired up the F1 data pipeline, with caching and a live-API fallback</li>
            <li>Rebuilt the homepage as Grid Walk, a draggable, zoomable carousel with a live background</li>
            <li>Keeps refining the design and fixing bugs as they turn up</li>
          </ul>

          <p style={{ marginTop: 18 }}>
            This is an independent fan project — not affiliated with Formula 1, the FIA, or any
            team.
          </p>
        </section>

        <section id="about-timeline" data-rail-label="How this has progressed" className="about table-card">
          <h2 className="mb-2.5 text-sm font-semibold">How this has progressed</h2>
          <Image
            src="/grid-walk-demo.gif"
            alt="Dragging between Grid Walk's cards, then clicking one to zoom it to full size"
            className="about-media"
            width={820}
            height={513}
            unoptimized
            loading="lazy"
          />
          <p className="timeline-count">
            71 rounds shipped since launch &mdash; most recent first. Minor polish-only rounds are
            folded into the ones around them rather than listed separately.
          </p>
          <div className="timeline-inset" tabIndex={0} role="region" aria-label="Project timeline, scrollable">
            <ul className="timeline">
              <li>
                <span className="seq">71</span>
                <b>Accessibility pass from a site audit</b>
                <span>
                  A performance and WCAG 2.1 AA audit found a few real issues: card subtitles were too
                  low-contrast to read comfortably, the homepage had no heading, there was no
                  skip-to-content link, and this timeline couldn&rsquo;t be scrolled with a keyboard.
                  All fixed. A couple of deeper findings (the card toggle&rsquo;s tap target, and how
                  it&rsquo;s nested inside the card) need a design call before changing, so they&rsquo;re
                  tracked rather than patched in a hurry.
                </span>
              </li>
              <li>
                <span className="seq">70</span>
                <b>Repository renamed to Grid Walk</b>
                <span>
                  The GitHub repository itself (previously F1resultstracker) and the Vercel project
                  are now named grid-walk, matching the app&rsquo;s name everywhere else. The source
                  code link on this page points to the new address.
                </span>
              </li>
              <li>
                <span className="seq">69</span>
                <b>Icons that follow light/dark</b>
                <span>
                  The browser tab icon now switches with the device&rsquo;s light/dark setting, and
                  Android 13+ can tint the home-screen icon to match its system theme.
                </span>
              </li>
              <li>
                <span className="seq">68</span>
                <b>Design system written down</b>
                <span>
                  The names for every part of the site (island, pill, card, nav bar, jump bar, card
                  toggle, and the rest), the colour and size tokens, the rules they follow, and where
                  each one lives in the code, kept in the repository as docs/design-system.md so it
                  stays current with the code.
                </span>
              </li>
              <li>
                <span className="seq">67</span>
                <b>Tidy-up</b>
                <span>
                  Leftovers from the old multi-page site cleared out: the Ember palette is stored
                  under its own name instead of &ldquo;red&rdquo; (an old saved choice still works),
                  the page-wide glow blobs that nothing could see any more are gone, the nav icons
                  live with the other shared parts, and stale comments and class names now describe
                  the site as it is. Nothing changed on screen.
                </span>
              </li>
              <li>
                <span className="seq">66</span>
                <b>Shared building blocks in code</b>
                <span>
                  The island, pill, tab strip, logo, card header, card toggle and menu are now
                  components, so the nav bar, the phone jump bar and the zoom island are built from
                  the same parts and run the same swipe, drag and wheel code. The theme and palette
                  buttons in the desktop nav bar now sit flat like the tabs beside them, as they were
                  always meant to.
                </span>
              </li>
              <li>
                <span className="seq">65</span>
                <b>One stylesheet for islands, pills and cards</b>
                <span>
                  Every island, pill, tab and card now shares one definition instead of its own
                  copy, which also evened out the last few odd ones: the zoom island is the same
                  height as the others, Fit is an accent pill everywhere, and every pill lights up
                  the same way on hover.
                </span>
              </li>
              <li>
                <span className="seq">64</span>
                <b>Design tokens</b>
                <span>
                  Island, pill and card heights, radii and shadows are now named tokens at the top of
                  the stylesheet instead of the same numbers copied into every rule. Nothing changed
                  on screen.
                </span>
              </li>
              <li>
                <span className="seq">63</span>
                <b>Installable as an app</b>
                <span>
                  A web app manifest, home-screen icons and a new favicon, so phones and desktops
                  can install Grid Walk like a native app instead of only opening it as a tab.
                </span>
              </li>
              <li>
                <span className="seq">62</span>
                <b>Cards rise into place on load</b>
              </li>
              <li>
                <span className="seq">61</span>
                <b>Pictures only, for every season</b>
              </li>
              <li>
                <span className="seq">60</span>
                <b>Same-height cards and a Drivers/Teams toggle</b>
              </li>
              <li>
                <span className="seq">59</span>
                <b>Cards as pictures for the current season</b>
              </li>
              <li>
                <span className="seq">58</span>
                <b>No more blur</b>
              </li>
              <li>
                <span className="seq">57</span>
                <b>A lighter Points Evolution chart</b>
              </li>
              <li>
                <span className="seq">56</span>
                <b>Dragging smooth again on the heavier cards</b>
              </li>
              <li>
                <span className="seq">55</span>
                <b>No more background flash on the toggle card</b>
              </li>
              <li>
                <span className="seq">54</span>
                <b>Finish and Qualifying Frequency share a card with a toggle</b>
              </li>
              <li>
                <span className="seq">53</span>
                <b>Driver and team graphics now share a card</b>
              </li>
              <li>
                <span className="seq">52</span>
                <b>Smoother dragging on Grid Walk</b>
              </li>
              <li>
                <span className="seq">51</span>
                <b>The phone jump bar catches up</b>
              </li>
              <li>
                <span className="seq">50</span>
                <b>A quieter About page, and no more Auto theme</b>
              </li>
              <li>
                <span className="seq">49</span>
                <b>Top bar fixes and button feedback</b>
              </li>
              <li>
                <span className="seq">48</span>
                <b>One nav bar at the top</b>
              </li>
              <li>
                <span className="seq">47</span>
                <b>Old Results and Positions pages retired</b>
              </li>
              <li>
                <span className="seq">46</span>
                <b>A live grid behind Grid Walk</b>
              </li>
              <li>
                <span className="seq">45</span>
                <b>Grid Walk becomes a carousel</b>
              </li>
              <li>
                <span className="seq">44</span>
                <b>Grid Walk: scroll and pinch zoom, cleaner cards</b>
              </li>
              <li>
                <span className="seq">43</span>
                <b>Grid Walk: full-size cards, free panning</b>
              </li>
              <li>
                <span className="seq">42</span>
                <b>Grid Walk: tidier topbar, clockwise cards</b>
              </li>
              <li>
                <span className="seq">41</span>
                <b>Grid Walk: one shared camera, not an isolated card</b>
              </li>
              <li>
                <span className="seq">40</span>
                <b>Grid Walk: one continuous zoom, not two</b>
              </li>
              <li>
                <span className="seq">39</span>
                <b>Grid Walk: true one-object zoom</b>
              </li>
              <li>
                <span className="seq">38</span>
                <b>Grid Walk: eight sections, zoom-in cards</b>
              </li>
              <li>
                <span className="seq">37</span>
                <b>Grid Walk: a 3D home page</b>
              </li>
              <li>
                <span className="seq">36</span>
                <b>Evolution charts: full width, full field, curved lines</b>
              </li>
              <li>
                <span className="seq">35</span>
                <b>No-axis evolution charts, points bubbles</b>
              </li>
              <li>
                <span className="seq">34</span>
                <b>Constructors evolution chart, scroll animation</b>
              </li>
              <li>
                <span className="seq">33</span>
                <b>Driver Points Evolution chart</b>
              </li>
              <li>
                <span className="seq">32</span>
                <b>Real bio, timeline tidy-up</b>
                <span>Added the real About me bio, compacted this timeline, and tinted the credit icons.</span>
              </li>
              <li>
                <span className="seq">31</span>
                <b>Share button on every graphic</b>
              </li>
              <li>
                <span className="seq">30</span>
                <b>Sprint marker, header cards, section rail &amp; overscroll navigation</b>
              </li>
              <li>
                <span className="seq">29</span>
                <b>First automated test, fewer duplicate data requests</b>
                <span>A Playwright test for Positions, and live-fetch calls now shared instead of duplicated.</span>
              </li>
              <li>
                <span className="seq">28</span>
                <b>Agent skills added</b>
                <span>frontend-design, webapp-testing and vercel-react-best-practices, reviewed and installed.</span>
              </li>
              <li>
                <span className="seq">26</span>
                <b>Qualifying frequency heatmap</b>
                <span>Ranked by average qualifying position rather than the standings; backfilled for 2020&ndash;2026.</span>
              </li>
              <li>
                <span className="seq">22</span>
                <b>Glassmorphism</b>
                <span>The nav bar and table cards got a blurred, translucent glass look.</span>
              </li>
              <li>
                <span className="seq">21</span>
                <b>Dracula light mode, a drifting background</b>
                <span>Dracula gained a light variant; the background glow now drifts instead of sitting still.</span>
              </li>
              <li>
                <span className="seq">20</span>
                <b>A soft background glow</b>
                <span>Added a theme-coloured gradient behind every page instead of a flat colour.</span>
              </li>
              <li>
                <span className="seq">19</span>
                <b>Drag-to-pan tables, a Dracula theme</b>
                <span>Overflowing tables now pan by click-and-drag; added a fourth colour palette.</span>
              </li>
              <li>
                <span className="seq">17</span>
                <b>One nav bar, same design everywhere</b>
                <span>The separate desktop bar and mobile dock merged into a single bar at every size.</span>
              </li>
              <li>
                <span className="seq">14</span>
                <b>Bottom dock nav on mobile, nav icons on desktop</b>
                <span>Narrow screens got a floating bottom dock; the desktop bar gained matching icons.</span>
              </li>
              <li>
                <span className="seq">13</span>
                <b>Centred layout, global season selector</b>
                <span>Pages centre on wide screens; the season you pick now persists across pages.</span>
              </li>
              <li>
                <span className="seq">12</span>
                <b>Positions merged with Finish Positions</b>
                <span>One page now; pole and fastest lap marked with a superscript on Results too.</span>
              </li>
              <li>
                <span className="seq">11</span>
                <b>Security review</b>
                <span>Found and fixed a script-injection bug in the data-snapshot job; added security headers.</span>
              </li>
              <li>
                <span className="seq">9</span>
                <b>Polish pass across the heatmap pages</b>
                <span>Simplified DNF counts to match how the data source reports them from 2023 onward.</span>
              </li>
              <li>
                <span className="seq">8</span>
                <b>Constructors section &amp; page cleanup</b>
                <span>Added Constructors to Results; retired the separate Standings page.</span>
              </li>
              <li>
                <span className="seq">7</span>
                <b>Positions &amp; Finish Positions pages</b>
                <span>Per-race finishes, a finish-frequency grid, and podium counts for drivers and teams.</span>
              </li>
              <li>
                <span className="seq">6</span>
                <b>Live-data resilience</b>
                <span>The current season falls back to its last saved snapshot if the live API has downtime.</span>
              </li>
              <li>
                <span className="seq">5</span>
                <b>Pinned points column &amp; data fixes</b>
                <span>The points total stays on screen while scrolling; corrected team-change data.</span>
              </li>
              <li>
                <span className="seq">4</span>
                <b>Material 3 restyle</b>
                <span>The whole look moved to tonal surfaces, pill shapes and a floating top bar.</span>
              </li>
              <li>
                <span className="seq">3</span>
                <b>Season snapshots</b>
                <span>Older seasons&apos; data saved into the repo instead of only ever fetched live.</span>
              </li>
              <li>
                <span className="seq">2</span>
                <b>Flags, hover details &amp; more themes</b>
                <span>Country flags, hover-to-see-detail cards, and the Coffee and Ember colour themes.</span>
              </li>
              <li>
                <span className="seq">1</span>
                <b>Results &amp; theme toggle</b>
                <span>The first version: the race-by-race results table and a light/dark theme switch.</span>
              </li>
            </ul>
          </div>
        </section>
        </div>

        <aside className="about-side">
          <section id="about-me" data-rail-label="About me" className="about table-card">
            <h2 className="mb-2.5 text-sm font-semibold">About me</h2>
            <p>
              This site is built and run by one person — an F1 fan who wanted a cleaner way to
              follow race results and standings than what was out there, and ended up building
              one. By day, just someone who likes tinkering with side projects; by race weekend,
              fully invested in the midfield battle as much as the win. Directs every design and
              feature decision on this site, with Claude doing the actual implementation.
            </p>
          </section>

          <section id="about-design" data-rail-label="Design inspiration" className="about table-card">
            <h2 className="mb-2.5 text-sm font-semibold">Design inspiration</h2>
            <div className="credit-grid">
              <div className="credit">
                <CreditIcon title="Generic icon — no official Tableau logo used">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M5 19V11M12 19V5M19 19V13" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Mateusz Karmalski</b>
                  <a
                    href="https://public.tableau.com/app/profile/mateusz.karmalski/viz/F1ResultsTracker/Results"
                    target="_blank"
                    rel="noopener"
                  >
                    &quot;F1 Results Tracker&quot; on Tableau Public
                  </a>{" "}
                  — the results-heatmap layout this site is based on
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 7a8 8 0 1116 0M4 7v10a8 8 0 0016 0V7" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Material 3</b>Google&apos;s open design system — the tonal surfaces, pill shapes and
                  layout language this site follows
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <circle cx="12" cy="12" r="8" stroke="currentColor" strokeWidth="2.2" />
                    <path d="M12 8v4l3 2" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Monokai</b>Colour scheme by Wimer Hazenberg — our default theme borrows its name
                  and palette
                </span>
              </div>
              <div className="credit">
                <CreditIcon title="Generic icon — no official Dracula logo used">
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M12 3c3 3 5 6.2 5 9.5a5 5 0 01-10 0C7 9.2 9 6 12 3z"
                      stroke="currentColor"
                      strokeWidth="2.2"
                      strokeLinejoin="round"
                    />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Dracula</b>
                  <a href="https://draculatheme.com" target="_blank" rel="noopener">
                    The Dracula Theme
                  </a>{" "}
                  by Zeno Rocha and contributors — our Dracula palette borrows its name and colours
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 2v6M12 22c-4 0-6-2.5-6-6 0-3 2-4 2-7 2 1 3 3 3 5 1-2 1-5-1-8 4 2 6 6 6 10 0 3.5-2 6-4 6z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Coffee &amp; Ember</b>Original palettes created for this site, not borrowed from
                  elsewhere
                </span>
              </div>
            </div>
          </section>

          <section id="about-tools" data-rail-label="Data & tools" className="about table-card">
            <h2 className="mb-2.5 text-sm font-semibold">Data &amp; tools this site is built on</h2>
            <div className="credit-grid">
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 5h16M4 12h16M4 19h7" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
                    <path d="M15 16l3 3 3-3" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Jolpica F1 API</b>
                  Race, standings &amp; results data —{" "}
                  <a href="https://github.com/jolpica/jolpica-f1" target="_blank" rel="noopener">
                    View on GitHub
                  </a>
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M6 20V4M6 4h11l-2.5 3.5L17 11H6" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>flag-icons</b>Country flag SVGs
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M9 7l-4 5 4 5M15 7l4 5-4 5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Next.js &amp; React</b>App framework
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M4 18h4l2-10 3 14 2-9h5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Tailwind CSS</b>Styling
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M6 17a4 4 0 010-8 5 5 0 019.6-1.5A4 4 0 0118 17H6z" stroke="currentColor" strokeWidth="2.2" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Vercel</b>Hosting
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path d="M12 3l1.8 5.6L19 10l-5.2 1.4L12 17l-1.8-5.6L5 10l5.2-1.4L12 3z" stroke="currentColor" strokeWidth="1.8" strokeLinejoin="round" />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Claude Code</b>Design &amp; development
                </span>
              </div>
              <div className="credit">
                <CreditIcon>
                  <svg viewBox="0 0 24 24" fill="none">
                    <path
                      d="M9 19c-5 1.5-5-2.5-7-3m14 6v-3.9a3.1 3.1 0 00-.9-2.4c3-.3 6-1.6 6-6.7A5.1 5.1 0 0019.6 5c.5-1.1.5-2.3 0-3.5 0 0-1.3-.3-3.6 1.3a12.3 12.3 0 00-6 0C7.7 1.2 6.4 1.5 6.4 1.5c-.5 1.2-.5 2.4 0 3.5A5.1 5.1 0 004.9 8.3c0 5.1 3 6.4 6 6.7a3.1 3.1 0 00-.9 2.4V21"
                      stroke="currentColor"
                      strokeWidth="1.6"
                      strokeLinecap="round"
                      strokeLinejoin="round"
                    />
                  </svg>
                </CreditIcon>
                <span>
                  <b>Source code</b>
                  <a href="https://github.com/rahul-sha/grid-walk" target="_blank" rel="noopener">
                    View on GitHub
                  </a>
                </span>
              </div>
            </div>
          </section>
        </aside>
      </div>
      </div>
    </div>
  );
}
