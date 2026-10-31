// Implementation plan P5.4 (planner). Uses the Appendix B dimensions and
// DEFAULT_MACHINE. Outcome B cases are added in Phase 5, only if selected.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { plan, shownNearest } from '../src/planner.js';
import { DEFAULT_MACHINE, ROLE_LETTER } from '../src/config.js';
import { roundHalfUp } from '../src/units.js';
import { APPENDIX_B, DEFAULT_INPUTS } from './helpers/data.js';

const IN = 25.4;
const run = (overrides = {}, machine = DEFAULT_MACHINE) => plan({ ...DEFAULT_INPUTS, ...overrides }, APPENDIX_B, machine);
const lists = (r) => r.blanks.map((b) => b.pieces.map((p) => ROLE_LETTER[p.role]).join(' '));
const r1 = (xs) => xs.map((x) => roundHalfUp(x, 1));
const codes = (r) => r.errors.map((e) => e.code);

test('§11 worked example, 12 in × 2 in', () => {
  const r = run({ stockLength: 12 * IN });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(lists(r), ['K Q P', 'R P P P', 'R P P P', 'B B N', 'N P']);
  assert.deepEqual(r1(r.blanks.map((b) => b.used)), [260.0, 256.1, 256.1, 244.8, 139.5]);
  assert.deepEqual(r1(r.blanks.map((b) => b.leftover)), [0.3, 4.3, 4.3, 15.6, 120.8]);
  const { stockToBuy, ...counts } = r.summary;
  assert.deepEqual(counts, { blanksPerSide: 5, sideCount: 2, totalBlanks: 10 });
  assert.ok(Math.abs(stockToBuy - 10 * 12 * IN) < 1e-9); // 120 in
});

test('§11 worked example, 18 in × 2 in', () => {
  const r = run({ stockLength: 18 * IN });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(lists(r), ['K Q B P P', 'B R P P P P', 'N N R P P']);
  assert.deepEqual(r1(r.blanks.map((b) => b.used)), [409.6, 405.6, 361.3]);
  assert.deepEqual(r1(r.blanks.map((b) => b.leftover)), [3.2, 7.2, 51.4]);
});

test('2½ in stock gives the same plans as 2 in stock', () => {
  for (const len of [12, 18]) {
    assert.deepEqual(lists(run({ stockLength: len * IN, stockWidth: 2.5 * IN })), lists(run({ stockLength: len * IN })));
  }
});

test('queen bases of 36 and 40 mm give 5 blanks on 12 in and 3 on 18 in', () => {
  for (const queenBase of [36, 40]) {
    assert.equal(run({ queenBase, stockLength: 12 * IN }).summary.blanksPerSide, 5);
    assert.equal(run({ queenBase, stockLength: 18 * IN }).summary.blanksPerSide, 3);
  }
});

test('AC-PLAN-02: every plan contains exactly 1 K, 1 Q, 2 B, 2 N, 2 R and 8 P', () => {
  for (const stockLength of [12 * IN, 18 * IN, 36 * IN]) {
    for (const queenBase of [30, 36, 38.1, 40]) {
      const r = run({ stockLength, queenBase });
      const counts = {};
      for (const b of r.blanks) for (const p of b.pieces) counts[p.role] = (counts[p.role] || 0) + 1;
      assert.deepEqual(counts, { king: 1, queen: 1, bishop: 2, knight: 2, rook: 2, pawn: 8 });
    }
  }
});

test('single side: one side counted', () => {
  const r = run({ stockLength: 12 * IN, sides: 'light' });
  assert.equal(r.summary.sideCount, 1);
  assert.equal(r.summary.totalBlanks, 5);
});

test('AC-FIT-01: 38.1 mm stock gives 5 TOO_WIDE errors (not the pawn), minWidth 41.2', () => {
  const r = run({ stockWidth: 38.1 });
  assert.deepEqual(codes(r), Array(5).fill('TOO_WIDE'));
  assert.deepEqual(r.errors.map((e) => e.role), ['king', 'queen', 'bishop', 'knight', 'rook']);
  for (const e of r.errors) assert.equal(e.values.minWidth, 41.2);
  assert.equal(r.blanks, undefined);
});

test('AC-FIT-01: largest queen base that fits is 47.7 on 2 in and 60.4 on 2½ in', () => {
  const largest = (stockWidth) => {
    let best = null;
    for (let k = 300; k <= 1000; k++) {
      const queenBase = k / 10;
      if (!run({ queenBase, stockWidth }).errors.some((e) => e.code === 'TOO_WIDE')) best = queenBase;
    }
    return best;
  };
  assert.equal(largest(2 * IN), 47.7);
  assert.equal(largest(2.5 * IN), 60.4);
});

test('AC-FIT-03: 100 mm stock gives 5 TOO_LONG errors, each with minLength 143.6', () => {
  const r = run({ stockLength: 100 });
  assert.deepEqual(codes(r), Array(5).fill('TOO_LONG'));
  assert.deepEqual(r.errors.map((e) => e.role), ['king', 'queen', 'bishop', 'knight', 'rook']);
  for (const e of r.errors) {
    assert.equal(e.values.minLength, 143.6);
    assert.ok(Math.abs(e.values.usable - 55.55) < 1e-9);
  }
});

test('AC-FIT-03: 1000 mm stock gives TOO_LONG_FOR_MACHINE', () => {
  assert.deepEqual(codes(run({ stockLength: 1000 })), ['TOO_LONG_FOR_MACHINE']);
});

test('AC-FIT-03: chuck 200 + tailstock 200 on 300 mm stock gives exactly NO_USABLE', () => {
  assert.deepEqual(codes(run({ stockLength: 300, chuckRes: 200, tailRes: 200 })), ['NO_USABLE']);
});

test('AC-FIT-04: jaw sets with the default machine', () => {
  assert.equal(run({ stockWidth: 50.8 }).jawSet, 'alternate');

  const small = run({ stockWidth: 19.05, queenBase: 15 });
  assert.equal(small.jawSet, 'standard');
  assert.deepEqual(small.errors, []);

  const jaw = (w) => run({ stockWidth: w }).errors.find((e) => e.code === 'JAW');
  assert.equal(jaw(24).values.nearest, 22.86);
  assert.equal(shownNearest(jaw(24).values), 22.8);
  assert.equal(jaw(24.5).values.nearest, 25.4);
  assert.equal(shownNearest(jaw(24.5).values), 25.4);
  assert.equal(jaw(70).values.nearest, 63.5);
});

test('AC-FIT-04: a custom machine with one jaw set of 30–80 mm accepts 70 mm', () => {
  const machine = { maxBlankLength: 914.4, jaws: [{ name: 'big chuck', min: 30, max: 80 }] };
  const r = run({ stockWidth: 70 }, machine);
  assert.equal(r.jawSet, 'big chuck');
  assert.deepEqual(r.errors, []);
});

test('RANGE: a gap of 5 gives one RANGE error and nothing else', () => {
  const r = run({ gap: 5 });
  assert.deepEqual(r.errors.map((e) => [e.code, e.field]), [['RANGE', 'gap']]);
  assert.equal(r.blanks, undefined);
});

test('RANGE: a null stock width gives one RANGE error ("must be a number")', () => {
  const r = run({ stockWidth: null });
  assert.deepEqual(r.errors.map((e) => [e.code, e.field, e.values.kind]), [['RANGE', 'stockWidth', 'number']]);
});

test('plan() on 18 in stock: under 100 ms (advisory)', (t) => {
  run({ stockLength: 18 * IN }); // warm-up
  const start = performance.now();
  run({ stockLength: 18 * IN });
  const ms = performance.now() - start;
  t.diagnostic(`plan() took ${ms.toFixed(1)} ms`);
  if (ms >= 100) t.diagnostic('ADVISORY: slower than the 100 ms target');
});

// Outcome B: connecting necks on (neckEnabled), with the Appendix B sizes.
test('outcome B: a 31 mm neck is wider than the pawn base (30.48)', () => {
  const r = run({ neckEnabled: true, neckDiameter: 31 });
  assert.deepEqual(codes(r), ['NECK_WIDER_THAN_BASE']);
  assert.equal(r.errors[0].role, 'pawn');
  assert.ok(Math.abs(r.errors[0].values.base - 30.48) < 1e-9);
});

test('outcome B: covered tops at the defaults are queen and bishop', () => {
  const r = run({ neckEnabled: true, neckDiameter: 7.6 });
  assert.deepEqual(r.errors, []);
  assert.deepEqual(r.coveredTops, ['queen', 'bishop']);
});

test('outcome B: the neck diameter is range-checked against 3 mm and the stock width', () => {
  assert.deepEqual(run({ neckEnabled: true, neckDiameter: 2 }).errors.map((e) => [e.code, e.field]), [['RANGE', 'neckDiameter']]);
  assert.deepEqual(run({ neckEnabled: true, neckDiameter: 60 }).errors.map((e) => [e.code, e.field]), [['RANGE', 'neckDiameter']]);
  assert.deepEqual(run({ neckEnabled: true, neckDiameter: null }).errors.map((e) => e.values.kind), ['number']);
});

test('outcome A: no neck fields in the result and the same plan as before', () => {
  const r = run({ stockLength: 12 * IN, neckEnabled: false, neckDiameter: 99 });
  assert.equal(r.coveredTops, undefined);
  assert.equal(r.blanks[0].smallestSection, undefined);
  assert.deepEqual(lists(r), ['K Q P', 'R P P P', 'R P P P', 'B B N', 'N P']);
});
