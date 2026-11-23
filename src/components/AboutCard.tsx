import type { ReactNode } from "react";
import type { SiteStats } from "@/lib/site-stats";
import { STACK_LOGOS, type StackLogo } from "@/components/about/stackLogos";

// Grid Walk's last card: who built the site, how to get around it, what it
// runs on, and the unofficial-fan-site disclaimer F1's brand guidelines ask
// every fan site to carry on its landing page. Like the Latest Race card it
// is never a snapshot image: it is text and links, and baking it would
// break the links. Its content is laid out at the same natural size as the
// baked cards (.about-card, 1298 x 1000), so the table scales it the same
// way and it sits at the same width and text size as the cards above it.

function Glyph({ children }: { children: ReactNode }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      {children}
    </svg>
  );
}

function Logo({ name }: { name: StackLogo }) {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d={STACK_LOGOS[name]} />
    </svg>
  );
}

type StackItem = { name: string; role: string; logo: ReactNode; href?: string };

const STACK: StackItem[] = [
  { name: "Next.js", role: "App framework", logo: <Logo name="nextdotjs" /> },
  { name: "React", role: "Interface", logo: <Logo name="react" /> },
  { name: "TypeScript", role: "Language", logo: <Logo name="typescript" /> },
  { name: "Tailwind CSS", role: "Styling", logo: <Logo name="tailwindcss" /> },
  { name: "Node.js", role: "Server", logo: <Logo name="nodedotjs" /> },
  { name: "Vercel", role: "Hosting", logo: <Logo name="vercel" /> },
  { name: "GitHub Actions", role: "Weekly data and pictures", logo: <Logo name="githubactions" /> },
  {
    name: "Jolpica F1 API",
    role: "Race and standings data",
    href: "https://github.com/jolpica/jolpica-f1",
    logo: (
      <Glyph>
        <path d="M4 5h16M4 12h16M4 19h7" />
        <path d="M15 16l3 3 3-3" />
      </Glyph>
    ),
  },
  {
    name: "flag-icons",
    role: "Country flags",
    logo: (
      <Glyph>
        <path d="M6 20V4M6 4h11l-2.5 3.5L17 11H6" />
      </Glyph>
    ),
  },
  { name: "Claude Code", role: "Design and build", logo: <Logo name="claude" /> },
];

const DESIGN: { name: string; by: string; href?: string }[] = [
  { name: "Material 3", by: "Google's design system: surfaces, pills, and layout" },
  { name: "Monokai", by: "Colour scheme by Wimer Hazenberg" },
  { name: "Dracula", by: "The Dracula Theme by Zeno Rocha and contributors", href: "https://draculatheme.com" },
  { name: "Coffee and Ember", by: "Original palettes made for this site" },
];

export default function AboutCard({ stats }: { stats: SiteStats | null }) {
  const tiles = stats
    ? [
        { value: stats.seasons, label: `seasons, ${stats.firstSeason} to ${stats.lastSeason}` },
        { value: stats.races, label: "races on the table" },
        { value: stats.drivers, label: "drivers who started a race" },
        { value: 6, label: "stats cards per season" },
      ]
    : [];

  return (
    <div className="about-card">
      <div className="about-card-top">
        <div className="about-card-story">
          <p className="about-card-hello">
            One fan&rsquo;s cleaner way to follow <em>every finish</em>, from the win to the midfield.
          </p>
          <p className="about-card-intro">
            Every design is reviewed and approved before it goes live, with Claude (Anthropic&rsquo;s AI
            coding assistant) doing the building: the heatmaps, charts, theming, and both views, carousel and table.
            An independent fan project, not affiliated with Formula 1, the FIA, or any team.
          </p>
          <ul className="about-card-how" aria-label="How to get around">
            <li>
              <Glyph>
                <path d="M12 3v18M3 12h18M12 3l-3 3M12 3l3 3M12 21l-3-3M12 21l3-3M3 12l3-3M3 12l3 3M21 12l-3-3M21 12l-3 3" />
              </Glyph>
              Drag to pan
            </li>
            <li>
              <Glyph>
                <circle cx="11" cy="11" r="7" />
                <path d="M21 21l-4.5-4.5M8 11h6M11 8v6" />
              </Glyph>
              Scroll or pinch to zoom
            </li>
            <li>
              <Glyph>
                <path d="M5 12h14M13 6l6 6-6 6" />
              </Glyph>
              Tabs jump to a card
            </li>
          </ul>
        </div>

        {tiles.length > 0 && (
          <dl className="about-card-stats">
            {tiles.map((t) => (
              <div key={t.label} className="about-card-stat">
                <dt>{t.label}</dt>
                <dd>{t.value}</dd>
              </div>
            ))}
          </dl>
        )}
      </div>

      <div className="about-card-feature">
        <span className="about-card-feature-icon" title="Generic icon — no official Tableau logo used">
          <Glyph>
            <path d="M5 19V11M12 19V5M19 19V13" />
          </Glyph>
        </span>
        <p>
          <span className="about-card-eyebrow">Design inspiration</span>
          <b>Mateusz Karmalski</b>{" "}
          <a
            href="https://public.tableau.com/app/profile/mateusz.karmalski/viz/F1ResultsTracker/Results"
            target="_blank"
            rel="noopener"
          >
            &quot;F1 Results Tracker&quot; on Tableau Public
          </a>{" "}
          — the results-heatmap layout this site is based on
        </p>
      </div>

      <div className="about-card-bottom">
        <section>
          <h2>Built with</h2>
          <ul className="about-card-stack">
            {STACK.map((s) => (
              <li key={s.name}>
                <span className="about-card-logo">{s.logo}</span>
                <span>
                  <b>
                    {s.href ? (
                      <a href={s.href} target="_blank" rel="noopener">
                        {s.name}
                      </a>
                    ) : (
                      s.name
                    )}
                  </b>
                  {s.role}
                </span>
              </li>
            ))}
          </ul>
        </section>
        <section>
          <h2>Look and colours</h2>
          <ul className="about-card-design">
            {DESIGN.map((d) => (
              <li key={d.name}>
                <b>
                  {d.href ? (
                    <a href={d.href} target="_blank" rel="noopener">
                      {d.name}
                    </a>
                  ) : (
                    d.name
                  )}
                </b>
                {d.by}
              </li>
            ))}
          </ul>
        </section>
      </div>

      <p className="about-card-disclaimer">
        This website is unofficial and is not associated in any way with the Formula 1 companies. F1,
        FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX and related marks are
        trade marks of Formula One Licensing B.V.
      </p>
    </div>
  );
}
