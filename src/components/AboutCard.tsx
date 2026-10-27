function CreditIcon({ children, title }: { children: React.ReactNode; title?: string }) {
  return (
    <span className="credit-icon" title={title}>
      {children}
    </span>
  );
}

// Grid Walk's last card: who built the site, what it runs on, and the
// unofficial-fan-site disclaimer F1's brand guidelines ask every fan site to
// carry on its landing page (see "grid-walk-f1-brand-guidelines" memory).
// Like the Latest Race card, this one is never a snapshot image — it's plain
// text and links, so there's no GPU cost to bake down, and baking it would
// break the links. It picks up the active theme/palette the same way the
// rest of the live page does, through the CSS custom properties on <html>.
export default function AboutCard() {
  return (
    <div className="about-card">
      <p className="about-card-intro">
        A personal F1 results tracker, built and directed by one fan who wanted a cleaner way to
        follow results and standings than what was out there — by day, just someone who likes
        tinkering with side projects; by race weekend, fully invested in the midfield battle as
        much as the win. Every design is reviewed and approved before it goes live, with Claude
        (Anthropic&rsquo;s AI coding assistant) doing the implementation — the heatmaps, charts,
        theming, and this carousel itself. This is an independent fan project, not affiliated with
        Formula 1, the FIA, or any team.
      </p>

      <div className="about-card-cols">
        <div className="about-card-col">
          <h2>Design inspiration</h2>
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
        </div>

        <div className="about-card-col">
          <h2>Data &amp; tools this site is built on</h2>
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
          </div>
        </div>
      </div>

      <div className="about-card-disclaimer">
        <p>
          This website is unofficial and is not associated in any way with the Formula 1
          companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX
          and related marks are trade marks of Formula One Licensing B.V.
        </p>
      </div>
    </div>
  );
}
