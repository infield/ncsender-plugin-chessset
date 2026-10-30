// Implementation plan P5.3 (manifest checks).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync, readdirSync } from 'node:fs';
import { validateManifest } from '../src/manifest.js';
import { PACKAGE_DIR, BAD_DIR } from './helpers/data.js';

const ROLE_FILES = ['king', 'queen', 'bishop', 'knight', 'rook', 'pawn'];

function goodManifest() {
  return {
    schema: 1,
    id: 'staunton-clarkerubber',
    version: '1.0.0',
    name: 'Staunton (clarkerubber)',
    author: 'clarkerubber; prepared by Marc Infield',
    source: 'https://github.com/clarkerubber/Staunton-Pieces/tree/cef2c79/Source/Staunton',
    license: 'MIT',
    licenseFile: 'LICENSE',
    attribution: 'Copyright (c) 2014 clarkerubber',
    units: 'mm',
    frame: 'x-axis-base-at-origin-v1',
    pieces: Object.fromEntries(ROLE_FILES.map((r) => [r, { file: `${r}.stl` }])),
  };
}
const NAMES = new Set(['chess-set.json', 'LICENSE', ...ROLE_FILES.map((r) => `${r}.stl`)]);

test('the example manifest is valid', () => {
  const r = validateManifest(goodManifest(), NAMES);
  assert.deepEqual(r.errors, []);
  assert.ok(r.manifest);
});

const cases = [
  ['schema: 2', (m) => { m.schema = 2; }, 'schema'],
  ['version: "../x"', (m) => { m.version = '../x'; }, 'version'],
  ['id: "A B"', (m) => { m.id = 'A B'; }, 'id'],
  ['units: "in"', (m) => { m.units = 'in'; }, 'units'],
  ['frame: "y-up"', (m) => { m.frame = 'y-up'; }, 'frame'],
  ['missing pawn', (m) => { delete m.pieces.pawn; }, 'pieces'],
  ['file: "../king.stl" (path rule only)', (m) => { m.pieces.king.file = '../king.stl'; }, 'pieces.king.file'],
  ['file: "King.stl" when only king.stl exists', (m) => { m.pieces.king.file = 'King.stl'; }, 'pieces.king.file'],
];
for (const [label, change, field] of cases) {
  test(`bad manifest, ${label}: exactly one error, naming the field`, () => {
    const m = goodManifest();
    change(m);
    const r = validateManifest(m, NAMES);
    assert.equal(r.errors.length, 1, JSON.stringify(r.errors));
    assert.equal(r.errors[0].field, field);
    assert.equal(r.manifest, null);
  });
}

test('the units error says inch packages are not supported', () => {
  const m = goodManifest();
  m.units = 'in';
  assert.match(validateManifest(m, NAMES).errors[0].message, /Inch packages are not supported in v1/);
});

const namesIn = (dir) => new Set(readdirSync(dir));
const loadPkg = (dir) => validateManifest(JSON.parse(readFileSync(`${dir}/chess-set.json`, 'utf8')), namesIn(dir));
const noPackage = !existsSync(PACKAGE_DIR) && `${PACKAGE_DIR}/ is made in Phase 2`;
const noBad = !existsSync(BAD_DIR) && `${BAD_DIR}/ is made by npm run fixtures after Phase 2`;

test('the prepared package passes validateManifest', { skip: noPackage }, () => {
  assert.deepEqual(loadPkg(PACKAGE_DIR).errors, []);
});

for (const [dir, field] of [['missing-file', 'pieces.rook.file'], ['schema-2', 'schema'], ['inch-units', 'units']]) {
  test(`bad package ${dir}: exactly one error (${field})`, { skip: noBad }, () => {
    const r = loadPkg(`${BAD_DIR}/${dir}`);
    assert.deepEqual(r.errors.map((e) => e.field), [field]);
  });
}

test('bad package script-name passes validation (its name is shown as text, P5.8)', { skip: noBad }, () => {
  assert.deepEqual(loadPkg(`${BAD_DIR}/script-name`).errors, []);
});
