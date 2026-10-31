// Implementation plan P5.5: blank geometry, sidecar and layout.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { buildBlank, neckCylinder } from '../src/blank.js';
import { buildSidecar } from '../src/sidecar.js';
import { buildLayout } from '../src/layout.js';
import { closedCheck, measure, weld } from '../src/measure.js';
import { parseStl } from '../src/stl.js';
import { plan } from '../src/planner.js';
import { DEFAULT_MACHINE, ROLES, WELD_TOL } from '../src/config.js';
import { APPENDIX_B, DEFAULT_INPUTS, PACKAGE_DIR } from './helpers/data.js';

const IN = 25.4;
const skip = !existsSync(PACKAGE_DIR) && 'prepared package not present';
const meshes = () => Object.fromEntries(ROLES.map((r) => [r, parseStl(readFileSync(join(PACKAGE_DIR, `${r}.stl`)))]));
const pawnLen = APPENDIX_B.pawn.axialLength * 1.27;
const twoPawns = { index: 1, pieces: [{ role: 'pawn', xStart: 0, xEnd: pawnLen }, { role: 'pawn', xStart: pawnLen + 10, xEnd: 2 * pawnLen + 10 }] };

test('neck cylinder is closed with positive volume', () => {
  const { verts, faces } = weld(neckCylinder(0, 10, 3.8), WELD_TOL);
  const c = closedCheck(verts, faces);
  assert.equal(c.closed, true);
  assert.ok(c.volume > 0);
});

test('two-pawn blank: min X 0, max X 119.22 ± 0.05', { skip }, () => {
  const m = measure(buildBlank(twoPawns, meshes(), 1.27));
  assert.ok(Math.abs(m.minX) < 1e-6, `minX ${m.minX}`);
  assert.ok(Math.abs(m.maxX - 119.22) < 0.05, `maxX ${m.maxX}`);
});

test('two-pawn blank: outcome B (7.6 mm neck) welds closed; outcome A has no neck triangles', { skip }, () => {
  const ms = meshes();
  const withNeck = buildBlank(twoPawns, ms, 1.27, 7.6);
  const { verts, faces } = weld(withNeck, WELD_TOL);
  assert.equal(closedCheck(verts, faces).closed, true);
  const without = buildBlank(twoPawns, ms, 1.27);
  assert.equal(without.length, 2 * ms.pawn.length);
  assert.equal(withNeck.length, without.length + neckCylinder(0, 1, 1).length);
});

test('KQP blank: the queen slice measures base 38.1 ± 0.05 (AC-SIZE-01)', { skip }, () => {
  const r = plan({ ...DEFAULT_INPUTS, stockLength: 12 * IN }, APPENDIX_B, DEFAULT_MACHINE);
  const tris = buildBlank(r.blanks[0], meshes(), r.scale, 7.6);
  const [x0, x1] = [109.05, 195.43];
  const keep = [];
  for (let t = 0; t < tris.length; t += 9) {
    if ([0, 3, 6].every((k) => tris[t + k] >= x0 && tris[t + k] <= x1)) keep.push(...tris.subarray(t, t + 9));
  }
  const m = measure(Float64Array.from(keep));
  assert.ok(Math.abs(m.baseDiameter - 38.1) < 0.05, `base ${m.baseDiameter}`);
});

test('sidecar for light blank 1, 12 in × 2 in square, defaults', () => {
  const r = plan({ ...DEFAULT_INPUTS, stockLength: 12 * IN }, APPENDIX_B, DEFAULT_MACHINE);
  const s = buildSidecar({ blank: r.blanks[0], file: 'light_blank_01.stl', inputs: { ...DEFAULT_INPUTS, stockLength: 12 * IN }, jawSet: r.jawSet, pluginVersion: '0.1.0', folder: 'job' });
  const { source, ...rest } = s;
  assert.deepEqual(rest, {
    format: 'rotary-setup', formatVersion: 1, model: 'light_blank_01.stl', units: 'mm',
    orientation: { turningAxis: 'X', chuckEnd: 'min', onAxis: 'model-origin', upAtZero: '+Z' },
    stock: { shape: 'square', width: 50.8, length: 304.8 },
    placement: { chuckOffset: 25.4, modelLength: 260.03 },
    workholding: { jawSet: 'alternate', tailstock: true },
  });
  assert.deepEqual(source, { plugin: 'com.infield.chessset', version: '0.1.0', job: 'job' });
});

test('layout.json for 12 in, both sides, outcome B matches tests/fixtures/layout-12in.json', () => {
  const inputs = { ...DEFAULT_INPUTS, stockLength: 12 * IN, neckEnabled: true, neckDiameter: 7.6 };
  const r = plan(inputs, APPENDIX_B, DEFAULT_MACHINE);
  const pkg = { id: 'staunton-clarkerubber', version: '0.1.0', name: 'Staunton (clarkerubber)' };
  const got = buildLayout({ pluginVersion: '0.1.0', pkg, inputs, plan: r, createdAt: '2026-10-30T12:00:00.000Z' });
  const want = JSON.parse(readFileSync('tests/fixtures/layout-12in.json', 'utf8'));
  for (const k of Object.keys(want)) assert.deepEqual(got[k], want[k], k);
  assert.deepEqual(Object.keys(got).sort(), Object.keys(want).sort());
});

test('layout.json under outcome A: supportOutcome A, neckDiameter null, no covered tops; light only', () => {
  const inputs = { ...DEFAULT_INPUTS, stockLength: 12 * IN, neckEnabled: false, sides: 'light' };
  const r = plan(inputs, APPENDIX_B, DEFAULT_MACHINE);
  const got = buildLayout({ pluginVersion: '0.1.0', pkg: { id: 'x', version: '0.1.0', name: 'X' }, inputs, plan: r, createdAt: 't' });
  assert.equal(got.supportOutcome, 'A');
  assert.equal(got.neckDiameter, null);
  assert.deepEqual(got.coveredTops, []);
  assert.deepEqual(got.blanks.map((b) => b.file), ['light_blank_01.stl', 'light_blank_02.stl', 'light_blank_03.stl', 'light_blank_04.stl', 'light_blank_05.stl']);
});
