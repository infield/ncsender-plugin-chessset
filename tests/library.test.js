// The chess-set library picker (P4.8a): index checks, pinned URLs, and a
// full install from a fake GitHub serving the prepared package.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { LibraryError, fetchLibrary, fetchSetFiles, setFileUrl, validateIndex } from '../src/library.js';
import { importPackage } from '../src/package.js';
import { createHandlers } from '../src/worker.js';
import { LIBRARY_INDEX } from '../src/config.js';
import { PACKAGE_DIR } from './helpers/data.js';

const index = JSON.parse(readFileSync('tests/fixtures/library.json', 'utf8'));
const staunton = index.sets[0];
const skip = !existsSync(PACKAGE_DIR) && 'prepared package not present';

// A fake fetch: library.json, and the set's files at its tag.
function fakeGitHub(log = []) {
  return async (url) => {
    log.push(url);
    if (url === LIBRARY_INDEX) return new Response(JSON.stringify(index));
    const prefix = `https://raw.githubusercontent.com/infield/chessset-library/${staunton.tag}/${staunton.path}/`;
    if (url.startsWith(prefix)) {
      const p = join(PACKAGE_DIR, decodeURIComponent(url.slice(prefix.length)));
      if (existsSync(p)) return new Response(readFileSync(p));
    }
    return new Response('not found', { status: 404 });
  };
}

test('validateIndex keeps good sets and drops bad ones', () => {
  const bad = [
    { ...staunton, id: 'Bad Id' },
    { ...staunton, tag: 'v0.1.0' },
    { ...staunton, path: '../x' },
    { ...staunton, path: 'other/x' },
    { ...staunton, license: '' },
  ];
  assert.deepEqual(validateIndex({ ...index, sets: [staunton, ...bad] }).map((s) => s.id), ['staunton-clarkerubber']);
  assert.throws(() => validateIndex({ format: 'x', formatVersion: 1, sets: [] }), LibraryError);
});

test('set files are pinned to the release tag', () => {
  assert.equal(setFileUrl(staunton, 'king.stl'), 'https://raw.githubusercontent.com/infield/chessset-library/staunton-clarkerubber-v0.1.0/sets/staunton-clarkerubber/king.stl');
});

test('fetchLibrary reads the index; a network failure says how to recover', async () => {
  assert.deepEqual((await fetchLibrary(fakeGitHub())).map((s) => s.id), ['staunton-clarkerubber']);
  await assert.rejects(fetchLibrary(async () => { throw new TypeError('Failed to fetch'); }), /Can't reach the chess-set library .*import a package folder instead/);
});

test('installing Staunton from the library: downloads 8 files and passes the import checks', { skip }, async () => {
  const log = [];
  const files = await fetchSetFiles(staunton, { fetchFn: fakeGitHub(log) });
  assert.equal(files.length, 8);
  assert.ok(log.every((u) => u.includes('/staunton-clarkerubber-v0.1.0/')));
  const handle = createHandlers();
  const saved = [];
  const r = await importPackage({ fm: { saveText: async (p) => saved.push(p) }, call: (type, a) => handle({ ...a, type }), saveSettings: async () => {}, fileList: files });
  assert.equal(r.ok, true, JSON.stringify(r.errors));
  assert.equal(r.key, 'staunton-clarkerubber@0.1.0');
  assert.equal(saved.length, 8);
});

test('a library entry that does not match its chess-set.json is refused', { skip }, async () => {
  await assert.rejects(fetchSetFiles({ ...staunton, version: '0.1.1', tag: staunton.tag }, { fetchFn: fakeGitHub() }), /lists staunton-clarkerubber 0\.1\.1, but its chess-set\.json is staunton-clarkerubber 0\.1\.0/);
});
