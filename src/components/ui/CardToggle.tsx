import type { CSSProperties, MouseEvent } from "react";

interface CardToggleOption<T extends string> {
  value: T;
  label: string;
}

interface CardToggleProps<T extends string> {
  // The card's views, in order ("Drivers", "Teams").
  options: CardToggleOption<T>[];
  // The view showing now.
  value: T;
  onChange: (value: T) => void;
  // Identifies the toggle to the snapshot capture script.
  name: string;
}

// CardToggle: a segmented switch at the top right of a card with two
// views. Every view is named in one rounded track, and an accent thumb
// slides under the one showing. The thumb's width and position come from
// CSS (equal-width columns), so nothing is measured. Clicks stop here so
// the card beneath doesn't also react.
export default function CardToggle<T extends string>({ options, value, onChange, name }: CardToggleProps<T>) {
  const index = Math.max(0, options.findIndex((o) => o.value === value));
  const style = { "--n": options.length, "--i": index } as CSSProperties;
  function stop(e: MouseEvent<HTMLDivElement>) {
    e.stopPropagation();
  }
  return (
    <div className="ui-card-toggle" role="radiogroup" aria-label="View" data-toggle={name} style={style} onClick={stop}>
      <span className="ui-card-toggle-thumb" aria-hidden="true" />
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === value}
          onClick={() => onChange(o.value)}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
