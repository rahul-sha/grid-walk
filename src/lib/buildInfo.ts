// The "Build N" badge on the About card used to be a number bumped by hand
// each round — it went stale because nobody remembered to bump it (see the
// "grid-walk-about-card" memory). These are baked in at build time from the
// commit actually being deployed (see next.config.ts), so the badge is
// always correct for whatever is live, with no manual step.
export const buildId = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

export const buildDateLabel = (() => {
  const raw = process.env.NEXT_PUBLIC_BUILD_DATE;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
})();
