// The dialog (implementation plan P4.10). Shell, first-run machine setup,
// Package, the planning inputs, the live plan with its preview, and the
// Machine section. Export (Phase 5) is not built yet.
import { COUNTS_PER_SIDE, DEFAULT_MACHINE, ROLES } from '../config.js';
import { REFUSE_RUNNING, REFUSE_WORKER, defaultJobName, downloadFiles, exportJob, validJobName } from '../exporter.js';
import { createFm } from '../fm.js';
import { importPackage, removePackage } from '../package.js';
import { fetchLibrary, fetchSetFiles, libraryAction } from '../library.js';
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
    // mm; null when a field doesn't parse. Connecting necks were removed in
    // 0.1.8 (Rotary CAM supplies the support), so any stored value is dropped.
    inputs: (({ neckEnabled, neckDiameter, ...rest }) => rest)(loaded.settings.lastInputs),
    importing: false,
    importProgress: '',
    importErrors: [],
    importDone: '',
    confirmRemove: null, // the key of the set awaiting Remove confirmation
    setupDraft: null,
    machineDraft: null,
    machineOpen: false,
    library: null, // null, {loading:true}, {error}, or {sets}
    libraryOpen: null, // null until toggled: open only when no set is installed
    jobName: null, // null follows the default name
    exporting: false,
    exportStatus: '',
    exportError: '',
    downloadList: null, // [{name, download}] once Download files is opened
    serverState: null,
  };
  const pluginVersion = String(host.build || '').split('-')[0] || '0.0.0';

  // The host posts {type:'server-state-update', state} into the window. A job
  // is running when jobLoaded.status === 'running' (§12).
  const onHostMessage = (event) => {
    if (event?.data?.type !== 'server-state-update') return;
    const was = jobRunning();
    state.serverState = event.data.state || null;
    if (jobRunning() !== was) updatePlan();
  };
  const jobRunning = () => state.serverState?.jobLoaded?.status === 'running';
  window.addEventListener('message', onHostMessage);

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
    window.removeEventListener('message', onHostMessage);
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

  // ---- Package section --------------------------------------------------
  const keyOf = (set) => `${set.id}@${set.version}`;

  function packageSection() {
    const pkg = installed();
    const input = h('input', { type: 'file', class: 'csc-hidden', multiple: true, attrs: { webkitdirectory: '', 'data-import': '' } });
    input.addEventListener('change', () => runImport(() => input.files));
    const browse = h('button', { type: 'button', text: 'Refresh library',
      disabled: state.importing || state.library?.loading, dataset: { act: 'browse' }, onclick: loadLibrary });
    const folder = h('button', { type: 'button', text: 'Import package folder', disabled: state.importing,
      dataset: { act: 'import' }, onclick: () => input.click() });

    const busy = state.importing || state.exporting;
    const line = pkg
      ? h('div', { class: 'csc-row', attrs: { style: 'align-items:flex-start' } },
          h('div', { class: 'csc-col', attrs: { style: 'gap:2px; flex:1; min-width:0' } },
            h('div', { class: 'csc-pkg-name', dataset: { pkg: 'name' }, text: pkg.name }),
            h('div', { class: 'csc-muted', text: `Version ${pkg.version} · ${pkg.author}` }),
            h('div', { class: 'csc-muted', text: `${pkg.license} · ${pkg.attribution}` })),
          h('button', { type: 'button', text: 'Remove', disabled: busy, dataset: { removeSet: state.settings.lastPackage },
            onclick: () => askRemove(state.settings.lastPackage) }))
      : h('div', { class: 'csc-muted', text: 'No chess set installed. Browse the library and install one, or import a package folder.' });

    // Switch between installed sets.
    const keys = Object.keys(state.settings.packages);
    const switcher = keys.length > 1
      ? h('div', { class: 'csc-col', attrs: { style: 'gap:4px' } }, h('div', { class: 'csc-muted', text: 'Installed sets' }),
          keys.map((k) => {
            const p = state.settings.packages[k];
            const active = k === state.settings.lastPackage;
            return h('div', { class: 'csc-row', attrs: { style: 'gap:4px' } },
              h('button', { type: 'button', class: active ? 'csc-set csc-on' : 'csc-set', disabled: active || state.importing, dataset: { useSet: k },
                text: `${p.name} ${p.version}${active ? ' (in use)' : ''}`, onclick: () => useSet(k) }),
              active ? null : h('button', { type: 'button', class: 'csc-link', text: '✕', disabled: busy, dataset: { removeSet: k },
                attrs: { 'aria-label': `Remove ${p.name} ${p.version}`, title: 'Remove' }, onclick: () => askRemove(k) }));
          }))
      : null;

    const errors = state.importErrors.length
      ? h('ul', { class: 'csc-errors', dataset: { importErrors: '' } }, state.importErrors.map((e) => h('li', { text: e })))
      : null;

    const toRemove = state.settings.packages[state.confirmRemove];
    const confirmBox = toRemove
      ? h('div', { class: 'csc-confirm', dataset: { confirmRemove: state.confirmRemove }, attrs: { role: 'alertdialog', 'aria-label': 'Remove set' } },
          h('div', { text: `Remove ${toRemove.name} ${toRemove.version}? Its files are deleted from ncSender. You can install it again from the library or its package folder.` }),
          h('div', { class: 'csc-row' },
            h('button', { type: 'button', class: 'csc-danger', text: 'Remove', disabled: busy, dataset: { act: 'confirm-remove' }, onclick: () => runRemove(state.confirmRemove) }),
            h('button', { type: 'button', text: 'Cancel', dataset: { act: 'cancel-remove' }, onclick: () => { state.confirmRemove = null; render(); } })))
      : null;

    return h('div', { class: 'csc-card', dataset: { section: 'package' } },
      h('h3', { text: 'Chess set' }),
      line,
      switcher,
      confirmBox,
      librarySection(pkg, browse, folder),
      input,
      state.importProgress ? h('div', { class: 'csc-muted', dataset: { importProgress: '' }, text: state.importProgress }) : null,
      state.importDone ? h('div', { class: 'csc-ok', text: state.importDone }) : null,
      errors);
  }

  // The library list and the import button, collapsed so normally only the
  // set in use shows. Opening it reads the library the first time.
  function librarySection(pkg, browse, folder) {
    const details = h('details', { class: 'csc-lib', dataset: { section: 'library' } },
      h('summary', { text: 'Chess-set library', dataset: { act: 'library' } }),
      h('div', { class: 'csc-col', attrs: { style: 'gap:8px; margin-top:8px' } },
        libraryList(),
        h('div', { class: 'csc-row' }, browse, folder)));
    if (state.libraryOpen ?? !pkg) details.open = true;
    details.addEventListener('toggle', () => {
      state.libraryOpen = details.open;
      if (details.open && state.library === null) loadLibrary();
    });
    return details;
  }

  function libraryList() {
    const lib = state.library;
    if (!lib) return null;
    if (lib.loading) return h('div', { class: 'csc-muted', text: 'Reading the chess-set library…' });
    if (lib.error) return h('div', { class: 'csc-errors', dataset: { libraryError: '' }, text: lib.error });
    if (!lib.sets.length) return h('div', { class: 'csc-muted', text: 'The library has no sets.' });
    return h('div', { class: 'csc-col', dataset: { library: '' }, attrs: { style: 'gap:8px' } },
      lib.sets.map((set) => {
        const key = keyOf(set);
        const kind = libraryAction(set, state.settings.packages);
        const have = kind === 'have';
        const older = kind === 'update';
        const active = key === state.settings.lastPackage;
        const action = have
          ? h('button', { type: 'button', text: active ? 'In use' : 'Use', disabled: active || state.importing, dataset: { useSet: key }, onclick: () => useSet(key) })
          : h('button', { type: 'button', class: 'csc-primary', text: older ? `Update to ${set.version}` : 'Install', disabled: state.importing,
              dataset: { install: set.id }, onclick: () => runImport((onProgress) => fetchSetFiles(set, { onProgress })) });
        return h('div', { class: 'csc-libset', dataset: { libSet: set.id } },
          h('div', { class: 'csc-col', attrs: { style: 'gap:2px; flex:1; min-width:0' } },
            h('div', { class: 'csc-pkg-name', text: `${set.name} ${set.version}` }),
            set.description ? h('div', { class: 'csc-muted', text: set.description }) : null,
            h('div', { class: 'csc-muted', text: `${set.license} · ${set.attribution}` })),
          action);
      }));
  }

  async function loadLibrary() {
    state.library = { loading: true };
    render();
    try {
      state.library = { sets: await fetchLibrary() };
    } catch (e) {
      state.library = { error: e.message || String(e) };
    }
    render();
  }

  function askRemove(key) {
    state.confirmRemove = key;
    state.importDone = '';
    state.importErrors = [];
    render();
  }

  async function runRemove(key) {
    state.confirmRemove = null;
    state.importing = true;
    state.importProgress = 'Removing the set…';
    render();
    const result = await removePackage({ fm, saveSettings, key });
    state.importing = false;
    state.importProgress = '';
    if (result.ok) {
      resetExport();
      state.importDone = `Removed ${result.name}.`;
      if (result.warning) state.importErrors = [result.warning];
    } else state.importErrors = [result.error];
    render();
  }

  function useSet(key) {
    resetExport();
    state.settings.lastPackage = key;
    render();
    saveSettings({ lastPackage: key }).catch(() => {});
  }

  // `getFiles(onProgress)` returns a FileList or File-like array: from the
  // folder picker, or downloaded from the library.
  async function runImport(getFiles) {
    state.importing = true;
    state.importErrors = [];
    state.importDone = '';
    state.importProgress = 'Reading the files…';
    render();
    const onProgress = (text) => { state.importProgress = text; render(); };
    let result;
    try {
      const fileList = await getFiles(onProgress);
      result = fileList && fileList.length
        ? await importPackage({ fm, call: engine.call, saveSettings, fileList, onProgress })
        : { ok: false, errors: [] };
    } catch (e) {
      result = { ok: false, errors: [e.message || String(e)] };
    }
    state.importing = false;
    state.importProgress = '';
    if (result.ok) {
      resetExport();
      state.importDone = `Installed ${result.record.name} ${result.record.version}.`;
    } else state.importErrors = result.errors;
    render();
  }

  // ---- Planning inputs ----------------------------------------------------
  const fields = {}; // field → {setError}
  let jawReadout = null;

  function inputField(field, label) {
    const f = lengthField({
      label, mm: state.inputs[field], unit: state.unit, range: rangeHint(field, state.unit, state.inputs), name: field,
      onInput: (mm) => {
        state.inputs[field] = mm;
        resetExport();
        scheduleInputsSave();
        updatePlan();
      },
    });
    fields[field] = f;
    return f.el;
  }

  function resetExport() {
    state.downloadList = null;
    state.exportStatus = '';
    state.exportError = '';
  }

  function pick(field, value) {
    state.inputs[field] = value;
    resetExport();
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
    planSlot.append(exportSection(result, pkg));
  }

  // ---- Export ------------------------------------------------------------
  function exportSection(result, pkg) {
    const name = state.jobName ?? defaultJobName(pkg, state.inputs);
    const nameError = validJobName(name);
    const blocked = jobRunning() ? REFUSE_RUNNING : !engine.worker ? REFUSE_WORKER : null;
    const input = h('input', { type: 'text', value: name, attrs: { name: 'jobName', 'aria-label': 'Job name', autocomplete: 'off' } });
    const hint = h('div', { class: nameError ? 'csc-hint csc-bad' : 'csc-hint', text: nameError || 'Folder in the File Manager: chess set/<job name>/' });
    const exportBtn = h('button', { type: 'button', class: 'csc-primary', text: 'Export to File Manager', dataset: { act: 'export' }, disabled: Boolean(blocked || nameError || state.exporting) });
    const downloadBtn = h('button', { type: 'button', text: state.downloadList ? 'Hide download list' : 'Download files', dataset: { act: 'download' }, disabled: Boolean(blocked || nameError || state.exporting) });
    const status = h('div', { class: 'csc-muted', dataset: { exportStatus: '' }, text: state.exportStatus });
    input.addEventListener('input', () => {
      state.jobName = input.value;
      resetExport();
      const err = validJobName(input.value);
      hint.textContent = err || 'Folder in the File Manager: chess set/<job name>/';
      hint.classList.toggle('csc-bad', Boolean(err));
      exportBtn.disabled = downloadBtn.disabled = Boolean(blocked || err);
    });
    const job = () => ({
      fm, call: engine.call, plan: result, pkg, key: state.settings.lastPackage, inputs: { ...state.inputs },
      jobName: state.jobName ?? defaultJobName(pkg, state.inputs), pluginVersion, jobRunning: jobRunning(), workerAvailable: Boolean(engine.worker),
    });
    exportBtn.addEventListener('click', async () => {
      state.exporting = true;
      state.exportError = '';
      state.exportStatus = 'Starting…';
      updatePlan();
      try {
        const done = await exportJob({ ...job(), onProgress: (t) => { state.exportStatus = t; const el = planSlot.querySelector('[data-export-status]'); if (el) el.textContent = t; } });
        state.exportStatus = `Exported ${done.files.length} files to chess set/${done.folder}/.`;
      } catch (e) {
        state.exportStatus = '';
        state.exportError = e.path
          ? `Saving ${e.path} failed: ${e.status || 'no connection'} ${e.body || ''}. Files already written stay in place; this folder has no layout.json, so it is incomplete. Use Download files below instead.`
          : e.message || String(e);
        if (e.path) await openDownloads();
      }
      state.exporting = false;
      updatePlan();
    });
    downloadBtn.addEventListener('click', async () => {
      if (state.downloadList) {
        state.downloadList = null;
        updatePlan();
        return;
      }
      await openDownloads();
      updatePlan();
    });
    async function openDownloads() {
      try {
        state.downloadList = await downloadFiles(job());
      } catch (e) {
        state.exportError = e.message || String(e);
      }
    }

    const list = state.downloadList
      ? h('ul', { class: 'csc-downloads', dataset: { downloadList: '' } }, state.downloadList.map((f) => {
          const link = h('button', { type: 'button', class: 'csc-link', text: f.name, dataset: { file: f.name } });
          link.addEventListener('click', async () => {
            link.disabled = true;
            link.textContent = `${f.name} (building…)`;
            try {
              const { name: fileName, text } = await f.download();
              const url = URL.createObjectURL(new Blob([text], { type: fileName.endsWith('.json') ? 'application/json' : 'text/plain' }));
              const a = h('a', { href: url, attrs: { download: fileName } });
              document.body.append(a);
              a.click();
              a.remove();
              setTimeout(() => URL.revokeObjectURL(url), 60000);
              link.textContent = `${f.name} ✓`;
            } catch (e) {
              link.textContent = `${f.name} (failed: ${e.message || e})`;
            }
            link.disabled = false;
          });
          return h('li', {}, link);
        }))
      : null;

    return h('div', { class: 'csc-card', dataset: { section: 'export' } },
      h('h3', { text: 'Export' }),
      h('div', { class: 'csc-field' }, h('label', { text: 'Job name' }), input, hint),
      h('div', { class: 'csc-row' }, exportBtn, downloadBtn),
      blocked ? h('div', { class: 'csc-banner', dataset: { exportBlocked: '' }, text: blocked }) : null,
      status,
      state.exportError ? h('div', { class: 'csc-errors', dataset: { exportError: '' }, text: state.exportError }) : null,
      state.downloadList ? h('div', { class: 'csc-muted', text: 'One file per click. Each blank STL is built when you click it.' }) : null,
      list,
      h('div', { class: 'csc-muted', text: `One STL per blank${state.inputs.sides === 'both' ? ' per side' : ''} (ASCII, mm; X is the rotary axis, the first base at X = 0), with empty gaps between pieces for Rotary CAM to support, a .rotary.json setup file next to each, layout.json and the model licence.` }));
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
    const heads = ['Piece', 'Per side', 'Axial length', 'Base Ø', 'Swept Ø'];
    return h('div', { class: 'csc-card', dataset: { section: 'pieces' } },
      h('table', {}, h('thead', {}, h('tr', {}, heads.map((t) => h('th', { text: t })))), h('tbody', {}, rows)));
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
