// Implementation plan P5.2.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { parseStl, writeAscii, writeBinary, toBase64, fromBase64 } from '../src/stl.js';

const fixture = (name) => readFileSync(`tests/fixtures/${name}`);
const f32 = (v) => Math.fround(v);

test('ASCII and binary cylinders parse to the same triangles (float32 precision)', () => {
  const a = parseStl(fixture('cylinder-ascii.stl'));
  const b = parseStl(fixture('cylinder-binary.stl'));
  assert.equal(a.length, b.length);
  for (let i = 0; i < a.length; i++) assert.equal(b[i], f32(a[i]));
});

test('writeBinary → parseStl round-trips at float32 precision', () => {
  const tris = parseStl(fixture('cylinder-ascii.stl'));
  const back = parseStl(writeBinary(tris));
  for (let i = 0; i < tris.length; i++) assert.equal(back[i], f32(tris[i]));
});

test('writeAscii → parseStl round-trips within 5e-5', () => {
  const tris = parseStl(fixture('cylinder-binary.stl'));
  const back = parseStl(Buffer.from(writeAscii('t', tris)));
  assert.equal(back.length, tris.length);
  for (let i = 0; i < tris.length; i++) assert.ok(Math.abs(back[i] - tris[i]) <= 5e-5, `index ${i}`);
});

test('base64 round-trips 100,001 random bytes exactly', () => {
  const bytes = new Uint8Array(100001);
  for (let i = 0; i < bytes.length; i++) bytes[i] = (Math.random() * 256) | 0;
  assert.deepEqual(fromBase64(toBase64(bytes)), bytes);
});

test('an empty file and an 83-byte file both throw', () => {
  assert.throws(() => parseStl(Buffer.from('solid empty\nendsolid empty\n')), /not an STL/);
  const binaryEmpty = new Uint8Array(84); // valid size for 0 triangles
  assert.throws(() => parseStl(binaryEmpty), /not an STL/);
  assert.throws(() => parseStl(new Uint8Array(83)), /not an STL/);
});

test('test_files/test_two_pawns_necked.stl parses', () => {
  const tris = parseStl(readFileSync('test_files/test_two_pawns_necked.stl'));
  assert.ok(tris.length > 0 && tris.length % 9 === 0);
});
