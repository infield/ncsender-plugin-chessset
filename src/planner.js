// Fit checks and exact blank packing (implementation plan P4.5; spec §5.3, §5.4).
// Pure: no DOM, no network. Inputs and outputs are in mm; packing runs in
// integer micrometres so equal-length pieces compare exactly (D7).
//
// Connecting necks (outcome B) apply when inputs.neckEnabled is true: the
// neck-diameter range and check, covered tops and each blank's smallest
// section. With it off (outcome A) none of these appear.
import { COUNTS_PER_SIDE, NECK_OVERLAP, PROFILE_STEP, ROLES } from './config.js';
import { ceilTo, floorTo } from './units.js';

// Rule 1: per-field ranges. Stock length's upper limit and the jaw fit are
// not range checks; they have their own codes in rule 3.
export const RANGE_FIELDS = [
  { field: 'queenBase', label: 'Queen base diameter', min: 15, max: 100 },
  { field: 'stockLength', label: 'Stock length', min: 50, max: null },
  { field: 'stockWidth', label: 'Stock width', min: 0, max: null, exclusiveMin: true },
  { field: 'chuckRes', label: 'Chuck reservation', min: 0, max: 200 },
  { field: 'tailRes', label: 'Tailstock reservation', min: 0, max: 200 },
  { field: 'gap', label: 'Gap', min: 6.35, max: 50 },
  { field: 'radialAllowance', label: 'Radial allowance', min: 0, max: 10 },
];

function rangeErrors(inputs) {
  const errors = [];
  for (const { field, label, min, max, exclusiveMin } of RANGE_FIELDS) {
    const v = inputs[field];
    let kind = null;
    if (typeof v !== 'number' || !Number.isFinite(v)) kind = 'number';
    else if (exclusiveMin ? v <= min : v < min) kind = exclusiveMin ? 'greaterThan' : max === null ? 'atLeast' : 'between';
    else if (max !== null && v > max) kind = 'between';
    if (kind) errors.push({ code: 'RANGE', field, values: { label, kind, min, max } });
  }
  if (inputs.neckEnabled === true) {
    const v = inputs.neckDiameter;
    const w = inputs.stockWidth;
    const max = typeof w === 'number' && Number.isFinite(w) ? w : null;
    let kind = null;
    if (typeof v !== 'number' || !Number.isFinite(v)) kind = 'number';
    else if (v < 3 || (max !== null && v > max)) kind = max === null ? 'atLeast' : 'between';
    if (kind) errors.push({ code: 'RANGE', field: 'neckDiameter', values: { label: 'Connecting-neck diameter', kind, min: 3, max } });
  }
  return errors;
}

// The nearest jaw-set boundary to `width`; a tie goes to the larger value.
// An upper boundary is shown rounded down and a lower one rounded up, so the
// value shown always fits (rule 3).
function nearestJawBoundary(width, jaws) {
  let best = null;
  for (const jaw of jaws) {
    for (const [value, bound] of [[jaw.min, 'lower'], [jaw.max, 'upper']]) {
      const d = Math.abs(width - value);
      if (best === null || d < best.d || (d === best.d && value > best.value)) best = { d, value, bound };
    }
  }
  return best;
}

export function shownNearest(values, decimals = 1) {
  return values.nearestBound === 'upper' ? floorTo(values.nearest, decimals) : ceilTo(values.nearest, decimals);
}

const um = (mm) => Math.round(mm * 1000);
const mm = (micro) => micro / 1000;

// Rule 5: exact search. Returns the best list of patterns, where each
// pattern is {counts, used, list} and `list` holds role indexes in
// K, Q, B, N, R, P order.
function pack(lengthsUm, gapUm, usableUm) {
  const patterns = [];
  const walk = (i, counts) => {
    if (i === ROLES.length) {
      const n = counts.reduce((a, b) => a + b, 0);
      if (n === 0) return;
      const used = counts.reduce((sum, c, k) => sum + c * lengthsUm[k], 0) + (n - 1) * gapUm;
      if (used > usableUm) return;
      const list = [];
      counts.forEach((c, k) => {
        for (let j = 0; j < c; j++) list.push(k);
      });
      patterns.push({ counts: counts.slice(), used, list });
      return;
    }
    for (let c = 0; c <= COUNTS_PER_SIDE[i]; c++) {
      counts[i] = c;
      walk(i + 1, counts);
    }
    counts[i] = 0;
  };
  walk(0, new Array(ROLES.length).fill(0));

  const compareLists = (x, y) => {
    for (let j = 0; j < Math.min(x.length, y.length); j++) if (x[j] !== y[j]) return x[j] - y[j];
    return x.length - y.length; // a prefix comes first
  };
  // Fewer blanks; then the larger used length at the first blank where they
  // differ; then the piece lists, blank by blank.
  const comparePlans = (a, b) => {
    if (a.length !== b.length) return a.length - b.length;
    for (let i = 0; i < a.length; i++) if (a[i].used !== b[i].used) return b[i].used - a[i].used;
    for (let i = 0; i < a.length; i++) {
      const c = compareLists(a[i].list, b[i].list);
      if (c !== 0) return c;
    }
    return 0;
  };

  const memo = new Map();
  const best = (rem) => {
    if (rem.every((c) => c === 0)) return [];
    const key = rem.join(',');
    if (memo.has(key)) return memo.get(key);
    let winner = null;
    for (const p of patterns) {
      if (!p.counts.every((c, k) => c <= rem[k])) continue;
      const rest = best(rem.map((c, k) => c - p.counts[k]));
      if (rest === null) continue;
      const candidate = [p, ...rest];
      if (winner === null || comparePlans(candidate, winner) < 0) winner = candidate;
    }
    memo.set(key, winner);
    return winner;
  };
  return best(COUNTS_PER_SIDE.slice());
}

// The smallest diameter along one blank (outcome B): every piece's scaled
// profile, the necks in the gaps, and the larger of the two where a neck
// overlaps a piece. Null when the pieces have no profiles.
function smallestSection(placed, pieces, scale, neck) {
  let min = placed.length > 1 ? neck : Infinity;
  for (let j = 0; j < placed.length; j++) {
    const prof = pieces[placed[j].role].profile;
    if (!prof) return null;
    const len = placed[j].xEnd - placed[j].xStart;
    const neckBefore = j > 0;
    const neckAfter = j < placed.length - 1;
    for (let i = 0; i < prof.length; i++) {
      const xa = i * PROFILE_STEP * scale;
      const xb = Math.min((i + 1) * PROFILE_STEP * scale, len);
      let d = 2 * prof[i] * scale;
      if ((neckBefore && xa < NECK_OVERLAP) || (neckAfter && xb > len - NECK_OVERLAP)) d = Math.max(d, neck);
      if (d < min) min = d;
    }
  }
  return min === Infinity ? null : min;
}

export function plan(inputs, pieces, machine) {
  const rangeErrs = rangeErrors(inputs);
  if (rangeErrs.length) return { errors: rangeErrs };

  const { queenBase, stockLength, stockWidth, chuckRes, tailRes, gap, radialAllowance } = inputs;
  const sideCount = inputs.sides === 'both' ? 2 : 1;

  // Rule 2: one scale for every piece.
  const scale = queenBase / pieces.queen.baseDiameter;
  const scaled = {};
  for (const role of ROLES) {
    const p = pieces[role];
    scaled[role] = {
      axialLength: p.axialLength * scale,
      baseDiameter: p.baseDiameter * scale,
      sweptDiameter: p.sweptDiameter * scale,
      topDiameter: p.topDiameter * scale,
    };
  }

  // Rule 3: every check is collected before stopping.
  const errors = [];
  const usable = stockLength - chuckRes - tailRes;
  if (usable <= 0) {
    errors.push({ code: 'NO_USABLE', values: { chuck: chuckRes, tail: tailRes, length: stockLength } });
  }
  if (stockLength > machine.maxBlankLength) {
    errors.push({ code: 'TOO_LONG_FOR_MACHINE', values: { length: stockLength, max: machine.maxBlankLength } });
  }

  const jaw = machine.jaws.find((j) => j.min <= stockWidth && stockWidth <= j.max) || null;
  if (!jaw) {
    const nearest = nearestJawBoundary(stockWidth, machine.jaws);
    errors.push({
      code: 'JAW',
      values: {
        width: stockWidth,
        jaws: machine.jaws.map(({ name, min, max }) => ({ name, min, max })),
        nearest: nearest.value,
        nearestBound: nearest.bound,
      },
    });
  }

  const needs = ROLES.map((r) => scaled[r].sweptDiameter + 2 * radialAllowance);
  const minWidth = ceilTo(Math.max(...needs), 1);
  ROLES.forEach((role, i) => {
    if (needs[i] > stockWidth) {
      errors.push({
        code: 'TOO_WIDE',
        role,
        values: { need: needs[i], swept: scaled[role].sweptDiameter, allowance: radialAllowance, width: stockWidth, minWidth },
      });
    }
  });

  if (usable > 0) {
    const longest = Math.max(...ROLES.map((r) => scaled[r].axialLength));
    const minLength = ceilTo(longest + chuckRes + tailRes, 1);
    for (const role of ROLES) {
      if (scaled[role].axialLength > usable) {
        errors.push({ code: 'TOO_LONG', role, values: { length: scaled[role].axialLength, usable, minLength } });
      }
    }
  }

  // Outcome B: the neck may not be wider than the smallest base.
  const neckOn = inputs.neckEnabled === true;
  const neck = inputs.neckDiameter;
  if (neckOn) {
    const narrowest = ROLES.reduce((a, r) => (scaled[r].baseDiameter < scaled[a].baseDiameter ? r : a), ROLES[0]);
    if (neck > scaled[narrowest].baseDiameter) {
      errors.push({ code: 'NECK_WIDER_THAN_BASE', role: narrowest, values: { neck, base: scaled[narrowest].baseDiameter } });
    }
  }

  const result = { errors, scale, jawSet: jaw ? jaw.name : null, pieces: scaled };
  if (neckOn) result.coveredTops = ROLES.filter((r) => scaled[r].topDiameter < neck);
  if (errors.length) return result;

  // Rule 5: packing in integer micrometres.
  const lengthsUm = ROLES.map((r) => um(scaled[r].axialLength));
  const gapUm = um(gap);
  const usableUm = um(usable);
  const best = pack(lengthsUm, gapUm, usableUm);

  // Rule 6: descending axial length from the chuck; ties go K, Q, B, N, R, P.
  result.blanks = best.map((pattern, i) => {
    const order = pattern.list.slice().sort((a, b) => lengthsUm[b] - lengthsUm[a] || a - b);
    let x = 0;
    const placed = order.map((k, j) => {
      const xStart = j === 0 ? 0 : x + gapUm;
      x = xStart + lengthsUm[k];
      return { role: ROLES[k], xStart: mm(xStart), xEnd: mm(x) };
    });
    const out = { index: i + 1, pieces: placed, used: mm(pattern.used), leftover: mm(usableUm - pattern.used) };
    if (neckOn) out.smallestSection = smallestSection(placed, pieces, scale, neck);
    return out;
  });
  result.summary = {
    blanksPerSide: best.length,
    sideCount,
    totalBlanks: best.length * sideCount,
    stockToBuy: best.length * sideCount * stockLength,
  };
  return result;
}
