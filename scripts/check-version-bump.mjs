#!/usr/bin/env node
// Version check: a pull request that changes the site must raise the
// version in package.json (shown on the About card as v1.2.3).
//   Fix or small tweak      1.0.0 -> 1.0.1
//   New card or feature     1.0.1 -> 1.1.0
//   Big redesign            1.1.0 -> 2.0.0
// Changes that never reach visitors' screens as new code (season data,
// baked card pictures, docs, Markdown, workflows, scripts, Claude settings)
// do not need a new version.
//
// Usage: node scripts/check-version-bump.mjs [base]
// `base` is the commit or branch to compare with (default: origin/main).
// The GitHub workflow passes the pull request's base commit.
import { execSync } from "node:child_process";
import { readFileSync } from "node:fs";

const base = process.argv[2] || process.env.VERSION_BASE || "origin/main";

function git(cmd) {
  return execSync(`git ${cmd}`, { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] }).trim();
}

let mergeBase;
try {
  mergeBase = git(`merge-base ${base} HEAD`);
} catch {
  console.log(`Version check skipped: cannot find ${base} to compare with.`);
  process.exit(0);
}

const exempt = [
  /^data\//,
  /^public\/card-snapshots\//,
  /^docs\//,
  /\.md$/i,
  /^\.github\//,
  /^\.claude\//,
  /^scripts\//,
];

// Committed changes plus any uncommitted ones, so it also works before a commit.
const changed = git(`diff --name-only ${mergeBase}`).split("\n").filter(Boolean);
const siteFiles = changed.filter((f) => !exempt.some((re) => re.test(f)));

if (siteFiles.length === 0) {
  console.log("Version check passed: no site files changed, so no new version is needed.");
  process.exit(0);
}

const parse = (v) => {
  const m = /^(\d+)\.(\d+)\.(\d+)$/.exec(v || "");
  return m ? m.slice(1).map(Number) : null;
};
const current = JSON.parse(readFileSync("package.json", "utf8")).version;
let previous = null;
try {
  previous = JSON.parse(git(`show ${mergeBase}:package.json`)).version;
} catch {
  // No package.json at the base: nothing to compare with.
}

const now = parse(current);
const before = parse(previous);
if (!now) {
  console.error(`Version check failed: package.json version "${current}" is not in the form 1.2.3.`);
  process.exit(1);
}
const isHigher =
  !before ||
  now[0] > before[0] ||
  (now[0] === before[0] && (now[1] > before[1] || (now[1] === before[1] && now[2] > before[2])));

if (!isHigher) {
  console.error(
    [
      `Version check failed: this change touches site files but the version is still ${current}.`,
      `Raise "version" in package.json (and package-lock.json) above ${previous}:`,
      "  fix or small tweak: last number, new card or feature: middle number, big redesign: first number.",
      "Site files changed:",
      ...siteFiles.slice(0, 10).map((f) => `  ${f}`),
    ].join("\n"),
  );
  process.exit(1);
}

console.log(`Version check passed: ${previous ?? "none"} -> ${current}.`);
