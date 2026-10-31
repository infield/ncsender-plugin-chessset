// Planner error text (spec §5.10) and the rounded display helpers (D8).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { plan } from '../src/planner.js';
import { DEFAULT_MACHINE } from '../src/config.js';
import { fmtMax, fmtMin, fmtOne } from '../src/units.js';
import { planMessages, rangeHint } from '../src/ui/messages.js';
import { APPENDIX_B, DEFAULT_INPUTS } from './helpers/data.js';

const msgs = (overrides, unit = 'mm') => {
  const inputs = { ...DEFAULT_INPUTS, ...overrides };
  return planMessages(plan(inputs, APPENDIX_B, DEFAULT_MACHINE), inputs, unit);
};

test('fmtMin rounds up, fmtMax rounds down, fmtOne half up', () => {
  assert.equal(fmtMin(41.1381, 'mm'), '41.2 mm (1.62 in)');
  assert.equal(fmtMax(22.86, 'in'), '0.90 in (22.8 mm)');
  assert.equal(fmtOne(38.1, 'in'), '1.50 in');
  assert.equal(fmtOne(54.61, 'mm'), '54.6 mm');
});

test('AC-FIT-01: 38.1 mm stock names five pieces, each with the 41.2 mm minimum', () => {
  const m = msgs({ stockWidth: 38.1 });
  assert.deepEqual(m.map((x) => x.role), ['king', 'queen', 'bishop', 'knight', 'rook']);
  for (const x of m) assert.match(x.text, /Stock at least 41\.2 mm \(1\.62 in\) wide is needed\.$/);
  assert.match(m[2].text, /^Bishop is too wide: swept Ø 38\.1 mm \+ 2 × 1\.5 mm allowance = 41\.1 mm, more than the 38\.1 mm stock\./);
});

test('AC-FIT-03: 100 mm stock gives the 143.6 mm minimum length', () => {
  const m = msgs({ stockLength: 100 });
  assert.equal(m.length, 5);
  for (const x of m) assert.match(x.text, /Stock at least 143\.6 mm \(5\.65 in\) long is needed\.$/);
});

test('AC-FIT-04: the jaw message lists the sets and the nearest width that fits', () => {
  const [m] = msgs({ stockWidth: 24 }, 'in');
  assert.equal(m.code, 'JAW');
  assert.equal(m.text, "Stock width 0.94 in doesn't fit any jaw set (standard 0.00–0.90 in; alternate 1.00–2.50 in). Nearest width that fits: 0.90 in (22.8 mm).");
});

test('NO_USABLE and TOO_LONG_FOR_MACHINE name both values', () => {
  assert.match(msgs({ stockLength: 300, chuckRes: 200, tailRes: 200 })[0].text, /200\.0 mm \+ .*200\.0 mm leave no usable length on 300\.0 mm stock/);
  assert.match(msgs({ stockLength: 1000 })[0].text, /1000\.0 mm \(39\.37 in\) is longer than the machine's max blank length, 914\.4 mm \(36\.00 in\)/);
});

test('RANGE messages and hints use the display unit', () => {
  assert.equal(msgs({ gap: 5 })[0].text, 'Gap must be between 6.35 and 50 mm.');
  assert.equal(msgs({ gap: 5 }, 'in')[0].text, 'Gap must be between 0.25 and 1.969 in.');
  assert.equal(msgs({ stockWidth: null })[0].text, 'Stock width must be a number.');
  assert.equal(rangeHint('stockLength', 'in'), 'at least 1.969 in');
  assert.equal(rangeHint('stockWidth', 'mm'), 'greater than 0 mm');
});
