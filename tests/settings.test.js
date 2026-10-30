// Implementation plan P5.4 (settings.test.js).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { DEFAULTS, SettingsError, load, save, validateMachine } from '../src/settings.js';
import { DEFAULT_MACHINE } from '../src/config.js';

// A fake fm holding one stored settings object. Records every call.
function fakeFm(stored = {}, { failGet = false } = {}) {
  const calls = [];
  return {
    calls,
    get stored() { return stored; },
    async getSettings() {
      calls.push('GET');
      if (failGet) throw Object.assign(new Error('down'), { status: 503 });
      await new Promise((r) => setTimeout(r, 5)); // let saves overlap if they could
      return structuredClone(stored);
    },
    async putSettings(obj) {
      calls.push('PUT');
      stored = structuredClone(obj);
    },
  };
}

test('load: empty settings give DEFAULTS; a failed GET gives DEFAULTS and offline', async () => {
  const ok = await load(fakeFm({}));
  assert.equal(ok.offline, false);
  assert.deepEqual(ok.settings, structuredClone(DEFAULTS));
  const down = await load(fakeFm({}, { failGet: true }));
  assert.equal(down.offline, true);
  assert.equal(down.status, 503);
  assert.equal(down.settings.machine, null);
});

test('save: a failed GET throws SettingsError and sends no PUT', async () => {
  const fm = fakeFm({}, { failGet: true });
  await assert.rejects(save(fm, { displayUnit: 'mm' }), (e) => e instanceof SettingsError && e.status === 503);
  assert.deepEqual(fm.calls, ['GET']);
});

test('save({lastInputs:{gap:12}}) keeps packages, machine and the other lastInputs', async () => {
  const fm = fakeFm({ machine: DEFAULT_MACHINE, packages: { 'a@1.0.0': { id: 'a' } }, lastInputs: { stockLength: 304.8 } });
  await save(fm, { lastInputs: { gap: 12 } });
  assert.deepEqual(fm.stored.machine, structuredClone(DEFAULT_MACHINE));
  assert.deepEqual(fm.stored.packages, { 'a@1.0.0': { id: 'a' } });
  assert.equal(fm.stored.lastInputs.gap, 12);
  assert.equal(fm.stored.lastInputs.stockLength, 304.8);
  assert.equal(fm.stored.lastInputs.queenBase, 38.1);
});

test('two saves in a row are applied in order', async () => {
  const fm = fakeFm({});
  const a = save(fm, { lastInputs: { gap: 12 }, displayUnit: 'mm' });
  const b = save(fm, { lastInputs: { gap: 15 } });
  await Promise.all([a, b]);
  assert.deepEqual(fm.calls, ['GET', 'PUT', 'GET', 'PUT']);
  assert.equal(fm.stored.lastInputs.gap, 15);
  assert.equal(fm.stored.displayUnit, 'mm');
});

test('a function patch sees the stored settings', async () => {
  const fm = fakeFm({ packages: { 'a@1.0.0': { id: 'a' } } });
  await save(fm, (s) => ({ packages: { ...s.packages, 'b@1.0.0': { id: 'b' } }, lastPackage: 'b@1.0.0' }));
  assert.deepEqual(Object.keys(fm.stored.packages), ['a@1.0.0', 'b@1.0.0']);
  assert.equal(fm.stored.lastPackage, 'b@1.0.0');
});

test('validateMachine rejects the §5.1 rule breaks and accepts overlapping ranges', () => {
  const ok = { maxBlankLength: 914.4, jaws: [{ name: 'a', min: 0, max: 30 }, { name: 'b', min: 20, max: 60 }] };
  assert.deepEqual(validateMachine(ok), []);
  assert.deepEqual(validateMachine(structuredClone(DEFAULT_MACHINE)), []);
  const bad = (change) => {
    const m = structuredClone(ok);
    change(m);
    return validateMachine(m);
  };
  assert.equal(bad((m) => { m.jaws = []; }).length, 1);
  assert.equal(bad((m) => { m.jaws = Array.from({ length: 5 }, (_, i) => ({ name: `j${i}`, min: 0, max: 10 })); }).length, 1);
  assert.deepEqual(bad((m) => { m.jaws[0].name = '  '; }).map((e) => e.field), ['jaws.0.name']);
  assert.deepEqual(bad((m) => { m.jaws[1].name = 'a'; }).map((e) => e.field), ['jaws.1.name']);
  assert.deepEqual(bad((m) => { m.jaws[0].min = 30; }).map((e) => e.field), ['jaws.0.range']);
  assert.deepEqual(bad((m) => { m.jaws[0].max = 301; }).map((e) => e.field), ['jaws.0.range']);
  assert.deepEqual(bad((m) => { m.jaws[0].min = NaN; }).map((e) => e.field), ['jaws.0.range']);
  assert.deepEqual(bad((m) => { m.maxBlankLength = 99; }).map((e) => e.field), ['maxBlankLength']);
  assert.deepEqual(bad((m) => { m.maxBlankLength = 2001; }).map((e) => e.field), ['maxBlankLength']);
});

test('validateMachine shows limits in the display unit', () => {
  const [e] = validateMachine({ maxBlankLength: 50, jaws: [{ name: 'a', min: 0, max: 10 }] }, 'in');
  assert.equal(e.message, 'Max blank length must be between 3.937 in and 78.74 in.');
});
