// The dialog (implementation plan P4.10). Phase 3: the shell, first-run
// machine setup, the Package section and the Machine section. Planning
// (Size, Stock, Allowances, Sides, the plan and preview) is Phase 4.
import { DEFAULT_MACHINE, ROLES } from '../config.js';
import { createFm } from '../fm.js';
import { importPackage } from '../package.js';
import { load, save } from '../settings.js';
import { fmt } from '../units.js';
import { h, clear } from './dom.js';
import { draftFrom, machineForm } from './machine.js';
import { injectStyle } from './style.js';

const ROLE_NAME = { king: 'King', queen: 'Queen', bishop: 'Bishop', knight: 'Knight', rook: 'Rook', pawn: 'Pawn' };

export async function mountApp(root, host, engine) {
  injectStyle();
  clear(root);
  const main = h('div', { class: 'csc-main' }, h('div', { class: 'csc-body csc-single' }, h('div', { class: 'csc-muted', text: 'Loading settings…' })));
  root.append(main);

  const fm = createFm(host.base);
  const loaded = await load(fm);
  const state = {
    settings: loaded.settings,
    // A status code when settings can't be read or saved (banner shown).
    settingsStatus: loaded.offline ? loaded.status : null,
    unit: loaded.settings.displayUnit === 'mm' ? 'mm' : 'in',
    importing: false,
    importProgress: '',
    importErrors: [],
    importDone: '',
    setupDraft: null,
    machineDraft: null,
  };

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

  function close() {
    window.postMessage({ type: 'close-plugin-dialog' }, '*');
  }

  function header() {
    const seg = h('div', { class: 'csc-seg', attrs: { role: 'group', 'aria-label': 'Display unit' } },
      ['in', 'mm'].map((u) => h('button', { type: 'button', text: u, class: state.unit === u ? 'csc-on' : '', dataset: { unit: u },
        onclick: () => setUnit(u) })));
    return h('div', { class: 'csc-head' },
      h('div', { class: 'csc-title', text: 'Chess Set Creator' }),
      h('div', { class: 'csc-build', text: host.build || '' }),
      h('div', { class: 'csc-spacer' }),
      seg,
      h('button', { type: 'button', text: 'Close', dataset: { act: 'close' }, onclick: close }));
  }

  function setUnit(u) {
    if (u === state.unit) return;
    state.unit = u;
    render();
    saveSettings({ displayUnit: u }).catch(() => {});
  }

  // ---- First-run setup ------------------------------------------------
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

  // ---- Package section --------------------------------------------------
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
      : h('div', { class: 'csc-muted', text: 'No model package installed. Download the package ZIP from its release page, unzip it, then import the folder.' });

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

  // ---- Machine section --------------------------------------------------
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
          return null;
        },
      }));
    if (state.machineOpen) details.open = true;
    details.addEventListener('toggle', () => { state.machineOpen = details.open; });
    return details;
  }

  // ---- Right column (Phase 3: the installed package's measured pieces) ---
  function rightColumn() {
    const pkg = installed();
    if (!pkg) {
      return h('div', { class: 'csc-col' }, bannerSlot,
        h('div', { class: 'csc-card' }, h('h3', { text: 'Plan' }),
          h('div', { class: 'csc-muted', text: 'Import a model package folder to start planning.' })));
    }
    const rows = ROLES.map((role) => {
      const p = pkg.pieces[role];
      return h('tr', {}, h('td', { text: ROLE_NAME[role] }), h('td', { text: fmt(p.axialLength, state.unit) }),
        h('td', { text: fmt(p.baseDiameter, state.unit) }), h('td', { text: fmt(p.sweptDiameter, state.unit) }));
    });
    return h('div', { class: 'csc-col' }, bannerSlot,
      h('div', { class: 'csc-card', dataset: { section: 'pieces' } },
        h('h3', { text: 'Pieces as measured' }),
        h('table', {}, h('thead', {}, h('tr', {}, ['Piece', 'Axial length', 'Base Ø', 'Swept Ø'].map((t) => h('th', { text: t })))), h('tbody', {}, rows)),
        h('div', { class: 'csc-muted', text: 'Unscaled sizes, measured at import. Sizing, fit checks and blank plans come in the next build.' })));
  }

  function render() {
    renderBanner();
    clear(main);
    main.append(header());
    if (!machine()) {
      main.append(h('div', { class: 'csc-body csc-single' }, setupView()));
      return;
    }
    main.append(h('div', { class: 'csc-body' },
      h('div', { class: 'csc-col' }, packageSection(), machineSection()),
      rightColumn()));
  }

  render();
}
