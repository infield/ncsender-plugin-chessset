// Package import (implementation plan P4.8), against the prepared package
// and the bad packages. Skips while they are absent (P5.3 rule).
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { importPackage, loadPackageMeshes } from '../src/package.js';
import { createHandlers } from '../src/worker.js';
import { ROLES } from '../src/config.js';
import { APPENDIX_B, BAD_DIR, PACKAGE_DIR } from './helpers/data.js';

// File-like objects as <input webkitdirectory> gives them.
function folderFiles(dir) {
  const root = dir.split('/').pop();
  const out = [];
  const walk = (d) => {
    for (const name of readdirSync(d)) {
      const full = join(d, name);
      if (statSync(full).isDirectory()) walk(full);
      else {
        const bytes = readFileSync(full);
        out.push({
          name,
          webkitRelativePath: `${root}/${relative(dir, full)}`,
          text: async () => bytes.toString('utf8'),
          arrayBuffer: async () => bytes.buffer.slice(bytes.byteOffset, bytes.byteOffset + bytes.byteLength),
        });
      }
    }
  };
  walk(dir);
  return out;
}

function fakeFm({ failOn } = {}) {
  const files = new Map();
  const saves = [];
  return {
    files,
    saves,
    async saveText(path, content) {
      saves.push(path);
      if (failOn && path.endsWith(failOn)) throw Object.assign(new Error('boom'), { status: 500 });
      files.set(path, content);
    },
    async readText(path) {
      return files.has(path) ? files.get(path) : null;
    },
  };
}

const handle = createHandlers();
const call = (type, args = {}) => handle({ ...args, type });
const skipPkg = !existsSync(PACKAGE_DIR) && 'prepared package not present';
const skipBad = !existsSync(BAD_DIR) && 'bad packages not generated (npm run fixtures)';

test('the prepared package imports: 8 files saved, measurements recorded', { skip: skipPkg }, async () => {
  const fm = fakeFm();
  let patchFn = null;
  const result = await importPackage({ fm, call, fileList: folderFiles(PACKAGE_DIR), saveSettings: async (p) => { patchFn = p; } });
  assert.equal(result.ok, true, JSON.stringify(result.errors));
  assert.equal(result.key, 'staunton-clarkerubber@1.0.0');
  const dir = '.chess-set-creator/sets/staunton-clarkerubber@1.0.0';
  assert.deepEqual(fm.saves, [`${dir}/chess-set.json`, `${dir}/LICENSE`, ...ROLES.map((r) => `${dir}/${r}.stl.b64`)]);
  for (const role of ROLES) {
    for (const [k, v] of Object.entries(APPENDIX_B[role])) {
      assert.ok(Math.abs(result.record.pieces[role][k] - v) < 0.1, `${role}.${k} ${result.record.pieces[role][k]} vs ${v}`);
    }
    assert.ok(result.record.pieces[role].profile.length > 50);
  }
  const next = patchFn({ packages: { 'old@1.0.0': {} } });
  assert.deepEqual(Object.keys(next.packages), ['old@1.0.0', result.key]);
  assert.equal(next.lastPackage, result.key);

  // The stored meshes load back.
  await loadPackageMeshes({ fm, call, key: result.key, pkg: result.record });
});

test('a failed save stops the import and writes nothing to settings', { skip: skipPkg }, async () => {
  const fm = fakeFm({ failOn: 'queen.stl.b64' });
  let saved = false;
  const result = await importPackage({ fm, call, fileList: folderFiles(PACKAGE_DIR), saveSettings: async () => { saved = true; } });
  assert.equal(result.ok, false);
  assert.match(result.errors[0], /^Saving .*queen\.stl\.b64 failed \(500\)\. The package is not installed\.$/);
  assert.equal(saved, false);
  assert.equal(fm.saves.at(-1).endsWith('queen.stl.b64'), true);
});

test('missing package files give the re-import message', async () => {
  const fm = fakeFm();
  await assert.rejects(
    loadPackageMeshes({ fm, call, key: 'x@1.0.0', pkg: { dir: 'd' } }),
    /The installed package files are missing \(d\/LICENSE\)\. Re-import the package\./,
  );
});

test('a folder without chess-set.json is refused', async () => {
  const result = await importPackage({ fm: fakeFm(), call, saveSettings: async () => {}, fileList: [{ webkitRelativePath: 'x/a.stl', text: async () => '' }] });
  assert.deepEqual(result, { ok: false, errors: ['No chess-set.json in the selected folder.'] });
});

for (const [name, pattern] of [
  ['missing-file', /^chess-set\.json — pieces\.rook\.file — file "rook\.stl" is not in the package folder\.$/],
  ['schema-2', /^chess-set\.json — schema — must be 1\.$/],
  ['inch-units', /^chess-set\.json — units — Inch packages are not supported/],
  ['shifted-axis', /^pawn\.stl — axis offset — 0\.50 mm \(limit 0\.1 mm\)$/],
]) {
  test(`AC-PKG-03: ${name} gives exactly one error and saves nothing`, { skip: skipBad }, async () => {
    const fm = fakeFm();
    const result = await importPackage({ fm, call, fileList: folderFiles(join(BAD_DIR, name)), saveSettings: async () => assert.fail('no settings save') });
    assert.equal(result.ok, false);
    assert.equal(result.errors.length, 1, result.errors.join('\n'));
    assert.match(result.errors[0], pattern);
    assert.deepEqual(fm.saves, []);
  });
}
