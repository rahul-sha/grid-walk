import type { ButtonHTMLAttributes, Ref } from "react";

export interface PillProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  // Passed straight through to the <button> (React 19 treats ref as a prop).
  ref?: Ref<HTMLButtonElement>;
  // The open tab: filled with the accent container.
  active?: boolean;
  // The one action in an island that leaves or resets the view (About, Fit).
  accent?: boolean;
  // A round pill holding only an icon (theme, palette, zoom in/out).
  icon?: boolean;
}

// Pill: any control inside an island or a card. 36px, borderless, ghost
// until hovered. Always a real <button>, so it is focusable and labelled.
export default function Pill({ active, accent, icon, className, type = "button", ...rest }: PillProps) {
  const classes = ["ui-pill"];
  if (accent) classes.push("ui-pill--accent");
  if (icon) classes.push("ui-icon-pill");
  if (active) classes.push("active");
  if (className) classes.push(className);
  return <button type={type} className={classes.join(" ")} {...rest} />;
}

export function IconPill(props: Omit<PillProps, "icon">) {
  return <Pill icon {...props} />;
}
