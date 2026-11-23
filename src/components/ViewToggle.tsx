"use client";

import type { CSSProperties } from "react";
import { useRouter } from "next/navigation";
import { VIEW_COOKIE, persistCookie, type SiteView } from "@/lib/variant-constants";

function CarouselIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="7" y="5" width="10" height="14" rx="2" />
      <path d="M3 7v10M21 7v10" />
    </svg>
  );
}

function TableIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <rect x="3" y="4" width="8" height="7" rx="1.5" />
      <rect x="13" y="4" width="8" height="7" rx="1.5" />
      <rect x="3" y="13" width="8" height="7" rx="1.5" />
      <rect x="13" y="13" width="8" height="7" rx="1.5" />
    </svg>
  );
}

const OPTIONS: { value: SiteView; label: string; Icon: () => React.JSX.Element }[] = [
  { value: "carousel", label: "Carousel view", Icon: CarouselIcon },
  { value: "table", label: "Table view", Icon: TableIcon },
];

// ViewToggle: switches the whole site between the carousel and the table.
// The choice is kept in a cookie, so the home page opens in the same view
// next time; the server then renders the chosen view.
export default function ViewToggle({ value }: { value: SiteView }) {
  const router = useRouter();
  const index = OPTIONS.findIndex((o) => o.value === value);
  const style = { "--n": OPTIONS.length, "--i": index } as CSSProperties;
  function choose(next: SiteView) {
    if (next === value) return;
    persistCookie(VIEW_COOKIE, next);
    if (window.location.pathname === "/") router.refresh();
    else router.push("/");
  }
  return (
    <div className="ui-card-toggle ui-view-toggle" role="radiogroup" aria-label="Site view" style={style}>
      <span className="ui-card-toggle-thumb" aria-hidden="true" />
      {OPTIONS.map(({ value: v, label, Icon }) => (
        <button key={v} type="button" role="radio" aria-checked={v === value} aria-label={label} title={label} onClick={() => choose(v)}>
          <Icon />
        </button>
      ))}
    </div>
  );
}
