// Implementation plan P5.3 (meshes and package checks).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { parseStl } from '../src/stl.js';
import { weld, closedCheck, measure, checkPiece } from '../src/measure.js';
import { WELD_TOL, ROLES } from '../src/config.js';
import { APPENDIX_B, PACKAGE_DIR, BAD_DIR } from './helpers/data.js';

const meshCheck = (name, tol = 0) => {
  const { verts, faces } = weld(parseStl(readFileSync(`tests/fixtures/${name}`)), tol);
  return closedCheck(verts, faces);
};

test('cube.stl is closed, with volume 1000', () => {
  const r = meshCheck('cube.stl');
  assert.equal(r.closed, true);
  assert.ok(Math.abs(r.volume - 1000) < 1e-9);
});

test('cube-open.stl is not closed, with 4 open edges', () => {
  const r = meshCheck('cube-open.stl');
  assert.equal(r.closed, false);
  assert.equal(r.openEdges, 4);
});

test('cube-gap.stl is closed after welding, and open without it', () => {
  assert.equal(meshCheck('cube-gap.stl', 0).closed, false);
  assert.equal(meshCheck('cube-gap.stl', WELD_TOL).closed, true);
});

test('the cylinder measures swept = base = top = 10 and axial length 20', () => {
  const m = measure(parseStl(readFileSync('tests/fixtures/cylinder-ascii.stl')));
  for (const d of [m.sweptDiameter, m.baseDiameter, m.topDiameter]) assert.ok(Math.abs(d - 10) < 1e-3, `${d}`);
  assert.ok(Math.abs(m.axialLength - 20) < 1e-9);
  assert.ok(m.axisOffset < 1e-3);
});

test('checkPiece reports an unreadable file as one parse error', () => {
  const r = checkPiece(new Uint8Array(83));
  assert.deepEqual(r.errors.map((e) => e.check), ['parse']);
});

const noPackage = !existsSync(PACKAGE_DIR) && `${PACKAGE_DIR}/ is made in Phase 2`;
const noBad = !existsSync(BAD_DIR) && `${BAD_DIR}/ is made by npm run fixtures after Phase 2`;

test('prepared package: every piece passes checkPiece and matches Appendix B within 0.1 mm', { skip: noPackage }, () => {
  for (const role of ROLES) {
    const r = checkPiece(readFileSync(`${PACKAGE_DIR}/${role}.stl`));
    assert.deepEqual(r.errors, [], role);
    for (const key of ['axialLength', 'baseDiameter', 'sweptDiameter']) {
      assert.ok(Math.abs(r.measurements[key] - APPENDIX_B[role][key]) <= 0.1, `${role} ${key}`);
    }
  }
});

test('shifted-axis: exactly one error, axis offset', { skip: noBad }, () => {
  const r = checkPiece(readFileSync(`${BAD_DIR}/shifted-axis/pawn.stl`));
  assert.deepEqual(r.errors.map((e) => e.check), ['axisOffset']);
});
