import type { NextConfig } from "next";
import { execSync } from "node:child_process";

// Identify the commit actually being built, so the About card's build badge
// (src/lib/buildInfo.ts) never needs a manual bump. VERCEL_GIT_COMMIT_SHA is
// set by Vercel without needing git history; falling back to `git` covers
// local dev and any other host. The commit's own date works even on a
// shallow clone, since that only needs the commit itself, not its ancestors.
function readGit(command: string): string | null {
  try {
    return execSync(command, { encoding: "utf8" }).trim() || null;
  } catch {
    return null;
  }
}

const commitSha = process.env.VERCEL_GIT_COMMIT_SHA || readGit("git rev-parse HEAD");
const buildId = commitSha ? commitSha.slice(0, 7) : "dev";
const buildDate = commitSha ? readGit(`git log -1 --format=%cI ${commitSha}`) : null;

const nextConfig: NextConfig = {
  env: {
    NEXT_PUBLIC_BUILD_ID: buildId,
    NEXT_PUBLIC_BUILD_DATE: buildDate ?? "",
  },
  // The old Results, Positions and About pages were folded into Grid
  // Walk's cards; send any saved links to the home page instead of a 404.
  async redirects() {
    return [
      { source: "/results", destination: "/", permanent: true },
      { source: "/positions", destination: "/", permanent: true },
      { source: "/about", destination: "/", permanent: true },
    ];
  },
  async headers() {
    return [
      {
        source: "/:path*",
        headers: [
          { key: "X-Frame-Options", value: "DENY" },
          { key: "X-Content-Type-Options", value: "nosniff" },
          { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
          { key: "Permissions-Policy", value: "camera=(), microphone=(), geolocation=()" },
        ],
      },
    ];
  },
};

export default nextConfig;
