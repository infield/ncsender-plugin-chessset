// Plugin settings (implementation plan P4.7; spec §5.1, §5.7).
// Every save re-reads the stored settings and merges its change in before
// writing, because the dialog can be open on several clients at once.
import { DEFAULT_INPUTS } from './config.js';
import { fieldText } from './units.js';

export const DEFAULTS = Object.freeze({
  schema: 1,
  machine: null,
  packages: {},
  lastPackage: null,
  lastInputs: { ...DEFAULT_INPUTS },
});

export class SettingsError extends Error {
  constructor(status) {
    super(`Settings unavailable (${status || 'no connection'})`);
    this.status = status;
  }
}

const isObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

// Stored settings over DEFAULTS; lastInputs merged field by field.
export function merge(stored) {
  const s = isObject(stored) ? stored : {};
  const out = { ...structuredClone(DEFAULTS), ...structuredClone(s) };
  out.lastInputs = { ...DEFAULT_INPUTS, ...(isObject(s.lastInputs) ? s.lastInputs : {}) };
  if (!isObject(out.packages)) out.packages = {};
  return out;
}

// Returns {settings, offline, status}. On failure the settings are the
// defaults and offline is true.
export async function load(fm) {
  try {
    return { settings: merge(await fm.getSettings()), offline: false, status: null };
  } catch (e) {
    return { settings: merge({}), offline: true, status: e.status ?? 0 };
  }
}

// One chain for every save, so two saves never interleave.
let chain = Promise.resolve();

// `patch` is an object, or a function of the current settings that returns
// one. A lastInputs patch is merged into the stored lastInputs. Resolves to
// the settings written. Throws SettingsError without a PUT if the GET fails.
export function save(fm, patch) {
  const run = chain.then(async () => {
    let stored;
    try {
      stored = await fm.getSettings();
    } catch (e) {
      throw new SettingsError(e.status ?? 0);
    }
    const next = merge(stored);
    const change = typeof patch === 'function' ? patch(next) : patch;
    for (const [key, value] of Object.entries(change)) {
      next[key] = key === 'lastInputs' ? { ...next.lastInputs, ...value } : value;
    }
    try {
      await fm.putSettings(next);
    } catch (e) {
      throw new SettingsError(e.status ?? 0);
    }
    return next;
  });
  chain = run.catch(() => {});
  return run;
}

// §5.1 machine-settings rules. Returns [{field, message}]; limits are shown
// in `unit` ('mm' or 'in').
export function validateMachine(machine, unit = 'mm') {
  const errors = [];
  const err = (field, message) => errors.push({ field, message });
  const len = (mm) => `${fieldText(mm, unit)} ${unit}`;
  const num = (v) => typeof v === 'number' && Number.isFinite(v);

  if (!isObject(machine)) return [{ field: 'machine', message: 'Machine settings are missing.' }];
  const max = machine.maxBlankLength;
  if (!num(max) || max < 100 || max > 2000) {
    err('maxBlankLength', `Max blank length must be between ${len(100)} and ${len(2000)}.`);
  }
  const jaws = machine.jaws;
  if (!Array.isArray(jaws) || jaws.length < 1 || jaws.length > 4) {
    err('jaws', 'Add between 1 and 4 jaw sets.');
    return errors;
  }
  const seen = new Set();
  jaws.forEach((jaw, i) => {
    const label = `Jaw set ${i + 1}`;
    const name = typeof jaw?.name === 'string' ? jaw.name.trim() : '';
    if (!name) err(`jaws.${i}.name`, `${label} needs a name.`);
    else if (seen.has(name.toLowerCase())) err(`jaws.${i}.name`, `${label}: the name "${name}" is already used.`);
    seen.add(name.toLowerCase());
    if (!num(jaw?.min) || !num(jaw?.max) || jaw.min < 0 || jaw.max > 300 || jaw.min >= jaw.max) {
      err(`jaws.${i}.range`, `${label}: widths must satisfy 0 ≤ min < max ≤ ${len(300)}.`);
    }
  });
  return errors;
}
