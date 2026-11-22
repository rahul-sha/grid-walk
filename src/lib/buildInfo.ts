// The About card's version badge. The version (e.g. "1.0.0") comes from
// package.json and is raised in each pull request that changes the site
// (scripts/check-version-bump.mjs stops one that forgets). The commit code
// and date are baked in at build time from the commit actually being
// deployed (see next.config.ts), so they are always right for whatever is
// live, with no manual step.
export const appVersion = process.env.NEXT_PUBLIC_APP_VERSION || "0.0.0";

export const buildId = process.env.NEXT_PUBLIC_BUILD_ID || "dev";

export const buildDateLabel = (() => {
  const raw = process.env.NEXT_PUBLIC_BUILD_DATE;
  if (!raw) return null;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return null;
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short", year: "numeric" });
})();
