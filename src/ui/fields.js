// Length input fields. State holds mm. A field is parsed only on its own
// input event; a unit change re-renders fields from state (P4.10).
import { fieldText, parse } from '../units.js';
import { h } from './dom.js';

const other = (unit) => (unit === 'in' ? 'mm' : 'in');

// The small line under a field: the value in the other unit, plus `extra`.
function hintText(mm, unit, extra) {
  const o = other(unit);
  const conv = mm === null || mm === undefined || !Number.isFinite(mm) ? '' : `= ${fieldText(mm, o)} ${o}`;
  return [conv, extra].filter(Boolean).join(' · ');
}

// A length field. onInput(mm or null) runs on every keystroke. Returns
// {el, setError(message|null)}.
export function lengthField({ label, mm, unit, range = '', name, onInput }) {
  const input = h('input', {
    type: 'text',
    value: Number.isFinite(mm) ? fieldText(mm, unit) : '',
    attrs: { inputmode: 'decimal', autocomplete: 'off', 'aria-label': label, ...(name ? { name } : {}) },
  });
  const hint = h('div', { class: 'csc-hint', text: hintText(mm, unit, range) });
  let current = mm;
  input.addEventListener('input', () => {
    current = parse(input.value, unit);
    hint.textContent = hintText(current, unit, range);
    onInput(current);
  });
  const el = h('div', { class: 'csc-field' }, h('label', { text: `${label} (${unit})` }), input, hint);
  return {
    el,
    setError(message) {
      input.classList.toggle('csc-bad', Boolean(message));
      hint.classList.toggle('csc-bad', Boolean(message));
      hint.textContent = message || hintText(current, unit, range);
    },
  };
}

export const rangeText = (min, max, unit) => `range ${fieldText(min, unit)}–${fieldText(max, unit)} ${unit}`;
