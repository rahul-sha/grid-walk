"use client";

import { useEffect } from "react";
import { isTheme, type Theme } from "@/lib/variant-constants";

const FAVICON: Record<Theme, string> = {
  light: "/icons/favicon-light.png",
  dark: "/icons/favicon-dark.png",
};
const THEME_COLOR: Record<Theme, string> = {
  light: "#faf9f0",
  dark: "#1b1c17",
};

// The tab icon and browser-chrome colour in layout.tsx are picked by the
// browser from the device's light/dark setting. Once the visitor has chosen
// a theme with the in-app toggle (data-theme on <html>), that no longer
// matches, so this points every candidate at the chosen theme's asset
// instead — whichever one the browser's media query selects, it now shows
// the right theme. With no stored choice the browser's own pick stands.
// The original values are kept on each element so a choice can be undone.
export default function ThemedFavicon() {
  useEffect(() => {
    const root = document.documentElement;

    // Looked up on every run: React may swap the server-rendered <head>
    // elements for its own during hydration, which would leave a list
    // captured once pointing at detached nodes.
    function apply() {
      const theme = root.getAttribute("data-theme");
      const chosen = isTheme(theme) ? theme : null;
      const icons = document.querySelectorAll<HTMLLinkElement>('link[rel="icon"][media]');
      const colors = document.querySelectorAll<HTMLMetaElement>('meta[name="theme-color"][media]');
      icons.forEach((link) => {
        link.dataset.defaultHref ??= link.href;
        link.href = chosen ? FAVICON[chosen] : link.dataset.defaultHref;
      });
      colors.forEach((meta) => {
        meta.dataset.defaultContent ??= meta.content;
        meta.content = chosen ? THEME_COLOR[chosen] : meta.dataset.defaultContent;
      });
    }

    apply();
    const observer = new MutationObserver(apply);
    observer.observe(root, { attributes: true, attributeFilter: ["data-theme"] });
    // Next streams some of its metadata tags into <head> after hydration,
    // so icons that arrive later than this effect get repointed too.
    observer.observe(document.head, { childList: true });
    return () => observer.disconnect();
  }, []);
  return null;
}
