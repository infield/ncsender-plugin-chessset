// Unit conversion, rounding and formatting (implementation plan P4.1, D8).
// The code works in mm; inches exist only at the input and display edge.

export const MM_PER_IN = 25.4;

// Absorbs floating-point noise such as 7.15 * 10 = 71.49999999999999.
const EPS = 1e-9;

export function roundHalfUp(x, d) {
  const f = 10 ** d;
  return (Math.sign(x) * Math.floor(Math.abs(x) * f + 0.5 + EPS)) / f;
}

// For minimums ("needed"): never shows a value that is too small.
export function ceilTo(x, d) {
  const f = 10 ** d;
  return Math.ceil(x * f - EPS) / f;
}

// For maximums ("fits"): never shows a value that is too large.
export function floorTo(x, d) {
  const f = 10 ** d;
  return Math.floor(x * f + EPS) / f;
}

function fixed(x, d) {
  return roundHalfUp(x, d).toFixed(d);
}

// Display text: primary unit first, the other in parentheses.
// mm to 1 decimal, inches to 2.
export function fmt(mm, primary) {
  const mmText = `${fixed(mm, 1)} mm`;
  const inText = `${fixed(mm / MM_PER_IN, 2)} in`;
  return primary === 'in' ? `${inText} (${mmText})` : `${mmText} (${inText})`;
}

// Input-field text: mm to 2 decimals, inches to 3, trailing zeros trimmed.
export function fieldText(mm, unit) {
  const text = unit === 'in' ? fixed(mm / MM_PER_IN, 3) : fixed(mm, 2);
  return text.includes('.') ? text.replace(/0+$/, '').replace(/\.$/, '') : text;
}

// Plain decimals only: optional digits, then an optional fraction with at
// least one digit. Returns mm, or null.
const DECIMAL = /^(?:\d+(?:\.\d+)?|\.\d+)$/;

export function parse(text, unit) {
  const t = String(text ?? '').trim();
  if (!DECIMAL.test(t)) return null;
  const value = Number(t);
  // Inches are converted and rounded to 0.0001 mm, so 12 in is stored as
  // exactly 304.8 and any 3-decimal inch value converts exactly.
  return unit === 'in' ? Math.round(value * MM_PER_IN * 1e4) / 1e4 : value;
}

// Like fmt, for a minimum needed: both units rounded up (D8).
export function fmtMin(mm, primary) {
  const mmText = `${ceilTo(mm, 1).toFixed(1)} mm`;
  const inText = `${ceilTo(mm / MM_PER_IN, 2).toFixed(2)} in`;
  return primary === 'in' ? `${inText} (${mmText})` : `${mmText} (${inText})`;
}

// Like fmt, for a maximum that fits: both units rounded down (D8).
export function fmtMax(mm, primary) {
  const mmText = `${floorTo(mm, 1).toFixed(1)} mm`;
  const inText = `${floorTo(mm / MM_PER_IN, 2).toFixed(2)} in`;
  return primary === 'in' ? `${inText} (${mmText})` : `${mmText} (${inText})`;
}

// One unit only, half up: mm to 1 decimal, inches to 2.
export function fmtOne(mm, unit) {
  return unit === 'in' ? `${fixed(mm / MM_PER_IN, 2)} in` : `${fixed(mm, 1)} mm`;
}

// [primary, other] texts for a value shown on two lines: the display
// unit first, the other unit on a smaller line below. Half up.
export function fmtPair(mm, primary) {
  const other = primary === 'in' ? 'mm' : 'in';
  return [fmtOne(mm, primary), fmtOne(mm, other)];
}
