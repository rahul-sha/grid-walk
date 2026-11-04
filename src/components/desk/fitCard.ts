// GridWalk's first pass: scale a card's content (.gw-fit) to fill its
// frame's height, and make the frame as wide as that makes it. The caller
// then scales the whole card to whatever size it needs.
export function fitContent(card: HTMLElement) {
  const fit = card.querySelector<HTMLElement>(".gw-fit");
  const frame = fit?.parentElement ?? null;
  if (!fit || !frame) return;
  fit.style.transform = "";
  frame.style.width = "";
  const fh = frame.clientHeight;
  const cw = fit.offsetWidth;
  const ch = fit.offsetHeight;
  if (!cw || !ch || !fh) return;
  const fs = fh / ch;
  fit.style.transform = `scale(${fs})`;
  frame.style.width = `${cw * fs}px`;
}
