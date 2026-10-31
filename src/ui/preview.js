// To-scale side view of one blank (implementation plan P4.10; AC-UI-01).
// SVG user units are mm: viewBox = 0 0 <stockLength> <stockWidth>.
import { PROFILE_STEP } from '../config.js';
import { ROLE_NAME } from './messages.js';

const NS = 'http://www.w3.org/2000/svg';
const n = (x) => Math.round(x * 100) / 100;

function el(tag, attrs, cls) {
  const e = document.createElementNS(NS, tag);
  for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, String(v));
  if (cls) e.setAttribute('class', cls);
  return e;
}

// Outline of one piece, seen from the side: `top` and `bottom` are the
// highest and lowest Z in each PROFILE_STEP slice (SVG y grows downward, so
// +Z is drawn up). Points sit at slice centres, joined by straight lines.
export function piecePath(top, bottom, axialLength, scale, x0, cy) {
  const xs = top.map((_, i) => x0 + Math.min((i + 0.5) * PROFILE_STEP, axialLength) * scale);
  const end = x0 + axialLength * scale;
  const upper = [[x0, cy - top[0] * scale], ...xs.map((x, i) => [x, cy - top[i] * scale]), [end, cy - top.at(-1) * scale]];
  const lower = [[x0, cy - bottom[0] * scale], ...xs.map((x, i) => [x, cy - bottom[i] * scale]), [end, cy - bottom.at(-1) * scale]].reverse();
  return `M${[...upper, ...lower].map(([x, y]) => `${n(x)} ${n(y)}`).join('L')}Z`;
}

// `blank` from plan(); `pieces` are the installed package's unscaled
// pieces (with profile); `scale` from plan().
export function blankPreview({ blank, inputs, pieces, scale }) {
  const { stockLength: L, stockWidth: W, chuckRes, tailRes } = inputs;
  const cy = W / 2;
  const svg = el('svg', { viewBox: `0 0 ${n(L)} ${n(W)}`, role: 'img', 'aria-label': `Blank ${blank.index} side view, to scale` }, 'csc-pv');
  svg.append(el('rect', { x: 0, y: 0, width: n(L), height: n(W) }, 'csc-pv-stock'));
  svg.append(el('rect', { x: 0, y: 0, width: n(chuckRes), height: n(W) }, 'csc-pv-res'));
  svg.append(el('rect', { x: n(L - tailRes), y: 0, width: n(tailRes), height: n(W) }, 'csc-pv-res'));
  svg.append(el('line', { x1: 0, y1: n(cy), x2: n(L), y2: n(cy) }, 'csc-pv-axis'));
  for (const p of blank.pieces) {
    const src = pieces[p.role];
    // Packages imported before 0.1.4 have no side view; mirror the profile.
    const side = src.side || { top: src.profile, bottom: src.profile.map((r) => -r) };
    const path = el('path', { d: piecePath(side.top, side.bottom, src.axialLength, scale, chuckRes + p.xStart, cy) }, 'csc-pv-piece');
    const title = document.createElementNS(NS, 'title');
    title.textContent = ROLE_NAME[p.role];
    path.append(title);
    svg.append(path);
  }
  return svg;
}
