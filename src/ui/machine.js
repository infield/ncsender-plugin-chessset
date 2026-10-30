// Machine settings form: the first-run setup and the Machine section use
// the same fields (spec §5.1; P4.10).
import { validateMachine } from '../settings.js';
import { h, clear } from './dom.js';
import { lengthField, rangeText } from './fields.js';

const MAX_JAWS = 4;

// `draft` is a mutable {maxBlankLength, jaws:[{name,min,max}]} in mm, kept
// by the caller so it survives a unit toggle. onSave(machine) resolves to
// an error message, or null on success.
export function machineForm({ draft, unit, saveLabel, onSave }) {
  const rows = h('div', { class: 'csc-col' });
  const errors = h('ul', { class: 'csc-errors csc-hidden' });
  const status = h('div', { class: 'csc-ok' });
  const addBtn = h('button', { type: 'button', text: '+ Add jaw set', onclick: () => {
    draft.jaws.push({ name: '', min: NaN, max: NaN });
    renderRows();
  } });

  const maxField = lengthField({
    label: 'Max blank length', mm: draft.maxBlankLength, unit, range: rangeText(100, 2000, unit), name: 'maxBlankLength',
    onInput: (mm) => { draft.maxBlankLength = mm ?? NaN; status.textContent = ''; },
  });

  function renderRows() {
    clear(rows);
    draft.jaws.forEach((jaw, i) => {
      const name = h('input', { type: 'text', value: jaw.name, attrs: { 'aria-label': `Jaw set ${i + 1} name`, name: `jaw${i}-name` } });
      name.addEventListener('input', () => { jaw.name = name.value; status.textContent = ''; });
      const min = lengthField({ label: 'Min width', mm: jaw.min, unit, name: `jaw${i}-min`, onInput: (mm) => { jaw.min = mm ?? NaN; status.textContent = ''; } });
      const max = lengthField({ label: 'Max width', mm: jaw.max, unit, name: `jaw${i}-max`, onInput: (mm) => { jaw.max = mm ?? NaN; status.textContent = ''; } });
      const remove = h('button', { type: 'button', class: 'csc-link', text: '✕', disabled: draft.jaws.length <= 1,
        attrs: { 'aria-label': `Remove jaw set ${i + 1}`, title: 'Remove' },
        onclick: () => { draft.jaws.splice(i, 1); renderRows(); } });
      rows.append(h('div', { class: 'csc-jaw' }, h('div', { class: 'csc-field' }, h('label', { text: `Jaw set ${i + 1} name` }), name, h('div', { class: 'csc-hint', text: ' ' })), min.el, max.el, remove));
    });
    addBtn.disabled = draft.jaws.length >= MAX_JAWS;
  }
  renderRows();

  const saveBtn = h('button', { type: 'button', class: 'csc-primary', text: saveLabel, dataset: { act: 'save-machine' } });
  saveBtn.addEventListener('click', async () => {
    status.textContent = '';
    const machine = {
      maxBlankLength: draft.maxBlankLength,
      jaws: draft.jaws.map((j) => ({ name: String(j.name).trim(), min: j.min, max: j.max })),
    };
    const problems = validateMachine(machine, unit).map((e) => e.message);
    if (!problems.length) {
      saveBtn.disabled = true;
      const message = await onSave(machine);
      saveBtn.disabled = false;
      if (message) problems.push(message);
      else status.textContent = 'Saved.';
    }
    clear(errors);
    for (const p of problems) errors.append(h('li', { text: p }));
    errors.classList.toggle('csc-hidden', problems.length === 0);
  });

  return h('div', { class: 'csc-col' },
    maxField.el,
    h('div', { class: 'csc-muted', text: 'Jaw sets: the stock widths each set of chuck jaws can grip. Ranges may overlap; the first match is used.' }),
    rows,
    h('div', { class: 'csc-row' }, addBtn),
    errors,
    h('div', { class: 'csc-row' }, saveBtn, status));
}

export const draftFrom = (machine) => ({
  maxBlankLength: machine.maxBlankLength,
  jaws: machine.jaws.map((j) => ({ name: j.name, min: j.min, max: j.max })),
});
