// Shared, client-safe theme/palette ("variant") helpers. The theme and
// palette toggles persist their choice in localStorage for the anti-FOUC
// script in layout.tsx, and ALSO in these cookies so the server can pick
// the right pre-rendered card image on first paint (see card-snapshots.ts)
// without ever rendering a card live for a visitor.

export const THEME_COOKIE = "f1-theme";
export const ACCENT_COOKIE = "f1-accent";

export const ACCENTS = ["monokai", "coffee", "ember", "dracula"] as const;
export const THEMES = ["light", "dark"] as const;

export type Accent = (typeof ACCENTS)[number];
export type Theme = (typeof THEMES)[number];

export function isAccent(value: unknown): value is Accent {
  return typeof value === "string" && (ACCENTS as readonly string[]).includes(value);
}

// The Ember palette was stored as "red" until October 2026; a choice saved
// under the old name still counts.
export function normaliseAccent(value: unknown): Accent | null {
  if (value === "red") return "ember";
  return isAccent(value) ? value : null;
}

export function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

// A year, path=/ so it applies to every route; samesite=lax as these carry
// nothing sensitive and must survive ordinary navigation.
export function persistCookie(name: string, value: string) {
  document.cookie = `${name}=${value}; path=/; max-age=31536000; samesite=lax`;
}

// Snapshot image names GridWalk shows, one per card view. Toggled cards
// (Drivers/Teams, Finish/Qualifying) have one per view.
export const SNAPSHOT_NAMES = [
  "results-drivers",
  "results-teams",
  "evolution",
  "positions",
  "gained",
  "freq-finish",
  "freq-quali",
  "podiumsD",
] as const;

export type SnapshotName = (typeof SNAPSHOT_NAMES)[number];

export function snapshotPath(season: number, accent: Accent, theme: Theme, name: string) {
  return `/card-snapshots/${season}/${accent}-${theme}/${name}.webp`;
}
