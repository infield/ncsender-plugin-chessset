// Planner errors as text (spec §5.10). Pure: no DOM.
import { MM_PER_IN, fieldText, fmt, fmtMax, fmtMin, fmtOne, floorTo, ceilTo } from '../units.js';
import { RANGE_FIELDS } from '../planner.js';

export const ROLE_NAME = { king: 'King', queen: 'Queen', bishop: 'Bishop', knight: 'Knight', rook: 'Rook', pawn: 'Pawn' };

const lim = (mm, unit) => `${fieldText(mm, unit)} ${unit}`;

// "range 6.35–50 mm", "at least 50 mm", "greater than 0 mm".
export function rangeHint(field, unit) {
  const f = RANGE_FIELDS.find((r) => r.field === field);
  if (!f) return '';
  if (f.exclusiveMin) return `greater than ${lim(f.min, unit)}`;
  if (f.max === null) return `at least ${lim(f.min, unit)}`;
  return `range ${fieldText(f.min, unit)}–${lim(f.max, unit)}`;
}

export function rangeMessage(e, unit) {
  const { label, kind, min, max } = e.values;
  if (kind === 'number') return `${label} must be a number.`;
  if (kind === 'greaterThan') return `${label} must be greater than ${lim(min, unit)}.`;
  if (kind === 'atLeast') return `${label} must be at least ${lim(min, unit)}.`;
  return `${label} must be between ${fieldText(min, unit)} and ${lim(max, unit)}.`;
}

// A jaw set's range as it fits: min rounded up, max rounded down.
function jawRange(j, unit) {
  const d = unit === 'in' ? 2 : 1;
  const v = (mm) => (unit === 'in' ? mm / MM_PER_IN : mm);
  return `${j.name} ${ceilTo(v(j.min), d).toFixed(d)}–${floorTo(v(j.max), d).toFixed(d)} ${unit}`;
}

// [{code, field?, role?, text}] for every error in a plan() result.
export function planMessages(result, inputs, unit) {
  const errs = result.errors || [];
  // The minimum width or length for the whole set, from the widest or
  // longest failing piece (which is the widest or longest piece overall).
  const minWidth = Math.max(...errs.filter((e) => e.code === 'TOO_WIDE').map((e) => e.values.need));
  const minLength = Math.max(...errs.filter((e) => e.code === 'TOO_LONG').map((e) => e.values.length)) + inputs.chuckRes + inputs.tailRes;

  return errs.map((e) => {
    const v = e.values;
    const name = ROLE_NAME[e.role];
    let text;
    switch (e.code) {
      case 'RANGE':
        text = rangeMessage(e, unit);
        break;
      case 'TOO_WIDE':
        text = `${name} is too wide: swept Ø ${fmtOne(v.swept, unit)} + 2 × ${fmtOne(v.allowance, unit)} allowance = ${fmtOne(v.need, unit)}, more than the ${fmtOne(v.width, unit)} stock. Stock at least ${fmtMin(minWidth, unit)} wide is needed.`;
        break;
      case 'TOO_LONG':
        text = `${name} is too long: ${fmtOne(v.length, unit)}, more than the ${fmtOne(v.usable, unit)} usable length. Stock at least ${fmtMin(minLength, unit)} long is needed.`;
        break;
      case 'NO_USABLE':
        text = `Chuck reservation ${fmtOne(v.chuck, unit)} + tailstock reservation ${fmtOne(v.tail, unit)} leave no usable length on ${fmtOne(v.length, unit)} stock.`;
        break;
      case 'TOO_LONG_FOR_MACHINE':
        text = `Stock length ${fmt(v.length, unit)} is longer than the machine's max blank length, ${fmt(v.max, unit)}.`;
        break;
      case 'JAW': {
        const nearest = v.nearestBound === 'upper' ? fmtMax(v.nearest, unit) : fmtMin(v.nearest, unit);
        text = `Stock width ${fmtOne(v.width, unit)} doesn't fit any jaw set (${v.jaws.map((j) => jawRange(j, unit)).join('; ')}). Nearest width that fits: ${nearest}.`;
        break;
      }
      default:
        text = e.code;
    }
    return { code: e.code, field: e.field, role: e.role, text };
  });
}
