"use client";

import { useEffect, useRef, useState } from "react";
import { Island, IconPill } from "@/components/ui";

// F1's brand guidelines ask unofficial fan sites to carry a disclaimer on
// the landing page. A permanently visible paragraph read badly on Grid
// Walk's homepage, so it lives behind this small "i" button instead — its
// own small island (the same shape as the zoom island), not folded into
// the nav pill alongside About/theme/palette/season.
//
// Rendered twice (top bar and jump bar), each instance toggled by CSS per
// breakpoint rather than by JS — the same pattern GridWalk already uses
// for its two tab strips (.gw-toptabs / .gw-jumpbar-pills). Only one is
// ever visible at a time, so the two instances' independent open state
// never both show.
export default function DisclaimerButton({ className }: { className: string }) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("click", handleClickOutside);
    return () => document.removeEventListener("click", handleClickOutside);
  }, [open]);

  return (
    <div
      className={"ui-menu-anchor gw-disclaimer-anchor " + className + (open ? " open" : "")}
      ref={rootRef}
    >
      <Island className="gw-disclaimer-island">
        <IconPill
          aria-label="Unofficial fan site disclaimer"
          aria-haspopup="dialog"
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
        >
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" aria-hidden="true">
            <circle cx="12" cy="12" r="9" stroke="currentColor" strokeWidth="1.8" />
            <path
              d="M12 8h.01M11 11.5h1v5h1"
              stroke="currentColor"
              strokeWidth="1.8"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </IconPill>
      </Island>
      {open ? (
        <div className="ui-menu gw-disclaimer-menu" role="dialog" aria-label="Unofficial fan site disclaimer">
          <p>
            This website is unofficial and is not associated in any way with the Formula 1
            companies. F1, FORMULA ONE, FORMULA 1, FIA FORMULA ONE WORLD CHAMPIONSHIP, GRAND PRIX
            and related marks are trade marks of Formula One Licensing B.V.
          </p>
        </div>
      ) : null}
    </div>
  );
}
