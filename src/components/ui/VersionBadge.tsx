import { appVersion, buildDateLabel, buildId } from "@/lib/buildInfo";

// VersionBadge: the About card's "v1.0.0 · 22 Nov 2026" tag. The commit code
// of the live build shows in a tip on hover or keyboard focus (tabIndex),
// so we can still check exactly which commit is deployed.
export default function VersionBadge() {
  const commit = `Commit ${buildId}`;
  return (
    <span className="about-tag ui-version-badge" tabIndex={0} aria-label={`Version ${appVersion}${buildDateLabel ? `, ${buildDateLabel}` : ""}, ${commit}`} data-tip={commit}>
      v{appVersion}
      {buildDateLabel ? ` · ${buildDateLabel}` : ""}
    </span>
  );
}
