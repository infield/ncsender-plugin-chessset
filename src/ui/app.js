// The dialog (implementation plan P4.10). Shell, first-run machine setup,
// Package, the planning inputs, the live plan with its preview, and the
// Machine section. Export (Phase 5) is not built yet.
import { COUNTS_PER_SIDE, DEFAULT_MACHINE, ROLES } from '../config.js';
import { createFm } from '../fm.js';
import { importPackage } from '../package.js';
import { plan } from '../planner.js';
import { load, save } from '../settings.js';
import { fmtOne, fmtPair } from '../units.js';
import { h, clear } from './dom.js';
import { lengthField } from './fields.js';
import { draftFrom, machineForm } from './machine.js';
import { ROLE_NAME, planMessages, rangeHint } from './messages.js';
import { blankPreview } from './preview.js';
import { injectStyle } from './style.js';

const SAVE_DELAY_MS = 1000;
const SIDE_LABEL = { both: 'Both sides', light: 'Light only', dark: 'Dark only' };

export async function mountApp(root, host, engine) {
  injectStyle(host.build || '');
  clear(root);
  const main = h('div', { class: 'csc-main' }, h('div', { class: 'csc-body csc-single' }, h('div', { class: 'csc-muted', text: 'Loading settings…' })));
  root.append(main);

  const fm = createFm(host.base);
  const loaded = await load(fm);
  // Lengths are shown in ncSender's units setting; ncSender's default is metric.
  const hostUnit = await fm.displayUnit().catch(() => 'mm');
  const state = {
    settings: loaded.settings,
    // A status code when settings can't be read or saved (banner shown).
    settingsStatus: loaded.offline ? loaded.status : null,
    unit: hostUnit, // 'mm' or 'in'; stored values are always mm
    inputs: { ...loaded.settings.lastInputs }, // mm; null when a field doesn't parse
    importing: false,
    importProgress: '',
    importErrors: [],
    importDone: '',
    setupDraft: null,
    machineDraft: null,
    machineOpen: false,
  };

  // ---- Settings -----------------------------------------------------------
  const saveSettings = (patch) =>
    save(fm, patch).then(
      (next) => {
        state.settings = next;
        return next;
      },
      (e) => {
        state.settingsStatus = e.status ?? 0;
        renderBanner();
        throw e;
      },
    );

  // lastInputs: saved 1 s after the last change, and flushed on close.
  let saveTimer = null;
  let inputsDirty = false;
  const scheduleInputsSave = () => {
    inputsDirty = true;
    clearTimeout(saveTimer);
    saveTimer = setTimeout(flushInputs, SAVE_DELAY_MS);
  };
  function flushInputs() {
    clearTimeout(saveTimer);
    saveTimer = null;
    if (!inputsDirty) return Promise.resolve();
    inputsDirty = false;
    return saveSettings({ lastInputs: { ...state.inputs } }).catch(() => {});
  }
  // Follow ncSender's units setting while the dialog is open. Changing the
  // unit re-renders the fields from state; nothing is re-parsed.
  const onHostSettings = (event) => {
    const units = event?.detail?.unitsPreference;
    if (!units) return;
    const u = units === 'imperial' ? 'in' : 'mm';
    if (u === state.unit) return;
    state.unit = u;
    render();
  };
  window.addEventListener('settings-changed', onHostSettings);

  // The host can also close the dialog by removing it; flush then too.
  const stop = () => {
    watcher.disconnect();
    window.removeEventListener('settings-changed', onHostSettings);
  };
  const watcher = new MutationObserver(() => {
    if (!root.isConnected) {
      stop();
      flushInputs();
    }
  });
  watcher.observe(document.body, { childList: true, subtree: true });

  // Offline: planning runs with DEFAULT_MACHINE and no setup (P4.7).
  const machine = () => state.settings.machine || (state.settingsStatus !== null ? DEFAULT_MACHINE : null);
  const installed = () => state.settings.packages[state.settings.lastPackage] || null;

  const bannerSlot = h('div');
  function renderBanner() {
    clear(bannerSlot);
    bannerSlot.classList.toggle('csc-hidden', state.settingsStatus === null);
    if (state.settingsStatus === null) return;
    bannerSlot.append(h('div', { class: 'csc-banner', attrs: { role: 'status' },
      text: `Settings unavailable (${state.settingsStatus || 'no connection'}); changes in this dialog won't be kept.` }));
  }

  async function close() {
    await flushInputs();
    stop();
    window.postMessage({ type: 'close-plugin-dialog' }, '*');
  }

  // ---- Header -------------------------------------------------------------
  function segmented(label, options, current, onPick, key) {
    return h('div', { class: 'csc-seg', attrs: { role: 'group', 'aria-label': label } },
      options.map(([value, text]) => h('button', { type: 'button', text, class: current === value ? 'csc-on' : '',
        dataset: { [key]: value }, attrs: { 'aria-pressed': String(current === value) }, onclick: () => onPick(value) })));
  }

  function header() {
    return h('div', { class: 'csc-head' },
      h('div', { class: 'csc-title', text: 'Chess Set Creator' }),
      h('div', { class: 'csc-build', text: host.build || '' }),
      h('div', { class: 'csc-spacer' }),
      h('div', { class: 'csc-muted', dataset: { unitNote: '' }, text: `Units follow ncSender: ${state.unit === 'in' ? 'inches' : 'mm'}` }),
      h('button', { type: 'button', text: 'Close', dataset: { act: 'close' }, onclick: close }));
  }

  // ---- First-run setup ----------------------------------------------------
  function setupView() {
    state.setupDraft ||= draftFrom(DEFAULT_MACHINE);
    return h('div', { class: 'csc-col' },
      bannerSlot,
      h('div', { class: 'csc-card', dataset: { view: 'setup' } },
        h('h3', { text: 'Machine setup' }),
        h('div', { class: 'csc-muted', text: 'Confirm the longest blank your machine holds between chuck and tailstock, and the stock widths your chuck jaws grip. The values below are an example machine; edit them to match yours. You can change them later in the Machine section.' }),
        machineForm({
          draft: state.setupDraft, unit: state.unit, saveLabel: 'Save machine settings',
          onSave: async (m) => {
            try {
              await saveSettings({ machine: m });
            } catch (e) {
              return `Saving failed: settings unavailable (${e.status || 'no connection'}). Try again.`;
            }
            state.setupDraft = null;
            render();
            return null;
          },
        })));
  }

  // ---- Package section ----------------------------------------------------
  function packageSection() {
    const pkg = installed();
    const input = h('input', { type: 'file', class: 'csc-hidden', multiple: true, attrs: { webkitdirectory: '', 'data-import': '' } });
    input.addEventListener('change', () => runImport(input.files));
    const button = h('button', { type: 'button', class: pkg ? '' : 'csc-primary', text: 'Import package folder', disabled: state.importing,
      dataset: { act: 'import' }, onclick: () => input.click() });

    const line = pkg
      ? h('div', { class: 'csc-col', attrs: { style: 'gap:2px' } },
          h('div', { class: 'csc-pkg-name', dataset: { pkg: 'name' }, text: pkg.name }),
          h('div', { class: 'csc-muted', text: `Version ${pkg.version} · ${pkg.author}` }),
          h('div', { class: 'csc-muted', text: `${pkg.license} · ${pkg.attribution}` }))
      : h('div', { class: 'csc-muted', text: 'No model package installed. Download a set from the chess-set library (github.com/infield/chessset-library), unzip it, then import the folder.' });

    const errors = state.importErrors.length
      ? h('ul', { class: 'csc-errors', dataset: { importErrors: '' } }, state.importErrors.map((e) => h('li', { text: e })))
      : null;

    return h('div', { class: 'csc-card', dataset: { section: 'package' } },
      h('h3', { text: 'Package' }),
      line,
      h('div', { class: 'csc-row' }, button, input),
      state.importProgress ? h('div', { class: 'csc-muted', text: state.importProgress }) : null,
      state.importDone ? h('div', { class: 'csc-ok', text: state.importDone }) : null,
      errors);
  }

  async function runImport(fileList) {
    if (!fileList || !fileList.length) return;
    state.importing = true;
    state.importErrors = [];
    state.importDone = '';
    state.importProgress = 'Reading the folder…';
    render();
    let result;
    try {
      result = await importPackage({
        fm, call: engine.call, saveSettings, fileList,
        onProgress: (text) => { state.importProgress = text; render(); },
      });
    } catch (e) {
      result = { ok: false, errors: [`Import failed: ${e.message || e}`] };
    }
    state.importing = false;
    state.importProgress = '';
    if (result.ok) state.importDone = `Installed ${result.record.name} ${result.record.version}.`;
    else state.importErrors = result.errors;
    render();
  }

  // ---- Planning inputs ----------------------------------------------------
  const fields = {}; // field → {setError}
  let jawReadout = null;

  function inputField(field, label) {
    const f = lengthField({
      label, mm: state.inputs[field], unit: state.unit, range: rangeHint(field, state.unit), name: field,
      onInput: (mm) => {
        state.inputs[field] = mm;
        scheduleInputsSave();
        updatePlan();
      },
    });
    fields[field] = f;
    return f.el;
  }

  function pick(field, value) {
    state.inputs[field] = value;
    scheduleInputsSave();
    render();
  }

  function inputSections() {
    jawReadout = h('div', { class: 'csc-hint', dataset: { readout: 'jaw' } });
    return [
      h('div', { class: 'csc-card', dataset: { section: 'size' } },
        h('h3', { text: 'Size' }),
        inputField('queenBase', 'Queen base diameter'),
        h('div', { class: 'csc-muted', text: 'Every piece is scaled by the same factor, so the set keeps its proportions.' })),
      h('div', { class: 'csc-card', dataset: { section: 'stock' } },
        h('h3', { text: 'Stock' }),
        inputField('stockLength', 'Stock length'),
        h('div', { class: 'csc-field' }, h('label', { text: 'Shape' }),
          segmented('Stock shape', [['square', 'Square'], ['round', 'Round']], state.inputs.stockShape, (v) => pick('stockShape', v), 'shape')),
        inputField('stockWidth', state.inputs.stockShape === 'round' ? 'Stock diameter' : 'Stock width'),
        jawReadout),
      h('div', { class: 'csc-card', dataset: { section: 'allowances' } },
        h('h3', { text: 'Allowances' }),
        inputField('chuckRes', 'Chuck reservation'),
        inputField('tailRes', 'Tailstock reservation'),
        inputField('gap', 'Gap between pieces'),
        inputField('radialAllowance', 'Radial allowance (per side)')),
      h('div', { class: 'csc-card', dataset: { section: 'sides' } },
        h('h3', { text: 'Sides' }),
        segmented('Sides', Object.entries(SIDE_LABEL), state.inputs.sides, (v) => pick('sides', v), 'sides')),
    ];
  }

  // ---- Machine section ----------------------------------------------------
  function machineSection() {
    state.machineDraft ||= draftFrom(machine());
    const details = h('details', { class: 'csc-card', dataset: { section: 'machine' } },
      h('summary', { text: 'Machine' }),
      machineForm({
        draft: state.machineDraft, unit: state.unit, saveLabel: 'Save',
        onSave: async (m) => {
          try {
            await saveSettings({ machine: m });
          } catch (e) {
            return `Saving failed: settings unavailable (${e.status || 'no connection'}).`;
          }
          updatePlan();
          return null;
        },
      }));
    if (state.machineOpen) details.open = true;
    details.addEventListener('toggle', () => { state.machineOpen = details.open; });
    return details;
  }

  // ---- Plan (right column) -----------------------------------------------
  const planSlot = h('div', { class: 'csc-col' });

  function updatePlan() {
    const pkg = installed();
    const unit = state.unit;
    clear(planSlot);
    planSlot.append(bannerSlot);
    if (!pkg) {
      planSlot.append(h('div', { class: 'csc-card' }, h('h3', { text: 'Plan' }),
        h('div', { class: 'csc-muted', text: 'Import a model package folder to start planning.' })));
      if (jawReadout) jawReadout.textContent = '';
      return;
    }
    const inputs = state.inputs;
    const m = machine();
    const result = plan(inputs, pkg.pieces, m);
    const messages = planMessages(result, inputs, unit);

    // Field hints: the RANGE message, or the range.
    for (const [field, f] of Object.entries(fields)) {
      const msg = messages.find((x) => x.code === 'RANGE' && x.field === field);
      f.setError(msg ? msg.text : null);
    }
    if (jawReadout) {
      const jaw = result.jawSet && m.jaws.find((j) => j.name === result.jawSet);
      jawReadout.textContent = jaw
        ? `Jaw set: ${jaw.name} (${fmtOne(jaw.min, unit)}–${fmtOne(jaw.max, unit)})`
        : result.errors.some((e) => e.code === 'RANGE') ? '' : 'No jaw set fits this width.';
    }

    if (messages.length) {
      planSlot.append(h('ul', { class: 'csc-errors', dataset: { planErrors: '' } },
        messages.map((x) => h('li', { text: x.text, dataset: { code: x.code } }))));
    }

    if (result.pieces) planSlot.append(pieceTable(result, unit));
    if (!result.blanks) {
      if (!messages.length) planSlot.append(h('div', { class: 'csc-muted', text: 'No plan.' }));
      return;
    }

    const both = inputs.sides === 'both';
    const s = result.summary;
    const sideText = both
      ? `${s.blanksPerSide} blanks per side · Light ${s.blanksPerSide}, Dark ${s.blanksPerSide} · ${s.totalBlanks} blanks in total`
      : `${s.blanksPerSide} blanks · ${SIDE_LABEL[inputs.sides]}`;
    planSlot.append(h('div', { class: 'csc-summary', dataset: { summary: '' } },
      h('div', { text: sideText }),
      h('div', { class: 'csc-muted', text: `Stock to buy: ${s.totalBlanks} × ${fmtPair(inputs.stockLength, unit)[0]} = ${fmtPair(s.stockToBuy, unit)[0]} · scale ${result.scale.toFixed(3)}` }),
      h('small', { class: 'csc-muted', text: `${s.totalBlanks} × ${fmtPair(inputs.stockLength, unit)[1]} = ${fmtPair(s.stockToBuy, unit)[1]}` })));

    for (const blank of result.blanks) planSlot.append(blankCard(blank, result, pkg, inputs, unit));
  }

  // A length on two lines: the display unit, and the other unit below.
  const two = (mm, unit) => {
    const [a, b] = fmtPair(mm, unit);
    return h('span', { class: 'csc-two' }, h('span', { text: a }), h('small', { text: b }));
  };

  function pieceTable(result, unit) {
    const rows = ROLES.map((role, i) => {
      const p = result.pieces[role];
      return h('tr', {}, h('td', { text: ROLE_NAME[role] }), h('td', { text: String(COUNTS_PER_SIDE[i]) }),
        h('td', {}, two(p.axialLength, unit)), h('td', {}, two(p.baseDiameter, unit)), h('td', {}, two(p.sweptDiameter, unit)));
    });
    return h('div', { class: 'csc-card', dataset: { section: 'pieces' } },
      h('table', {}, h('thead', {}, h('tr', {}, ['Piece', 'Per side', 'Axial length', 'Base Ø', 'Swept Ø'].map((t) => h('th', { text: t })))), h('tbody', {}, rows)));
  }

  function blankCard(blank, result, pkg, inputs, unit) {
    const title = inputs.sides === 'both'
      ? `Blank ${blank.index} · per side × 2`
      : `Blank ${blank.index} · ${inputs.sides === 'light' ? 'Light' : 'Dark'}`;
    const kv = (k, v) => h('div', { class: 'csc-kv' }, h('span', { text: k }), h('b', {}, v));
    const [lenA, lenB] = fmtPair(inputs.stockLength, unit);
    const [widA, widB] = fmtPair(inputs.stockWidth, unit);
    return h('div', { class: 'csc-card', dataset: { blank: String(blank.index) } },
      h('h3', { text: title }),
      h('div', { class: 'csc-pieces', text: `Chuck → ${blank.pieces.map((p) => ROLE_NAME[p.role]).join(' · ')} → tailstock` }),
      blankPreview({ blank, inputs, pieces: pkg.pieces, scale: result.scale }),
      h('div', { class: 'csc-kvs' },
        kv('Used', two(blank.used, unit)),
        kv('Leftover', two(blank.leftover, unit)),
        kv('Stock', h('span', { class: 'csc-two', dataset: { stock: '' } }, h('span', { text: `${lenA} × ${widA} ${inputs.stockShape}` }), h('small', { text: `${lenB} × ${widB}` }))),
        kv('Chuck reservation', two(inputs.chuckRes, unit)),
        kv('Tailstock reservation', two(inputs.tailRes, unit)),
        kv('Jaw set', result.jawSet)));
  }

  // ---- Render -------------------------------------------------------------
  function render() {
    renderBanner();
    clear(main);
    main.append(header());
    if (!machine()) {
      main.append(h('div', { class: 'csc-body csc-single' }, setupView()));
      return;
    }
    for (const k of Object.keys(fields)) delete fields[k];
    const left = h('div', { class: 'csc-col' }, packageSection(), installed() ? inputSections() : null, machineSection());
    main.append(h('div', { class: 'csc-body' }, left, planSlot));
    updatePlan();
  }

  render();
}
