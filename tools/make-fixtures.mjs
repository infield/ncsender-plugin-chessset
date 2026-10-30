// Writes the test fixtures (implementation plan P5.0).
// Usage: npm run fixtures
//   - Mesh fixtures go in tests/fixtures/ (committed).
//   - Bad packages go in tests/fixtures/bad-packages/ (git-ignored). They are
//     written only once packages/staunton-clarkerubber/ exists (Phase 2).
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, unlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { parseStl, writeAscii, writeBinary } from '../src/stl.js';

const OUT = 'tests/fixtures';
mkdirSync(OUT, { recursive: true });

// 10 mm cube from 0 to 10, outward (counter-clockwise from outside) winding.
const CUBE_FACES = [
  // -z
  [[0, 0, 0], [0, 10, 0], [10, 10, 0]], [[0, 0, 0], [10, 10, 0], [10, 0, 0]],
  // +z (removed for cube-open)
  [[0, 0, 10], [10, 0, 10], [10, 10, 10]], [[0, 0, 10], [10, 10, 10], [0, 10, 10]],
  // -y
  [[0, 0, 0], [10, 0, 0], [10, 0, 10]], [[0, 0, 0], [10, 0, 10], [0, 0, 10]],
  // +y
  [[0, 10, 0], [0, 10, 10], [10, 10, 10]], [[0, 10, 0], [10, 10, 10], [10, 10, 0]],
  // -x
  [[0, 0, 0], [0, 0, 10], [0, 10, 10]], [[0, 0, 0], [0, 10, 10], [0, 10, 0]],
  // +x
  [[10, 0, 0], [10, 10, 0], [10, 10, 10]], [[10, 0, 0], [10, 10, 10], [10, 0, 10]],
];

const toTris = (faces) => Float64Array.from(faces.flat(2));

writeFileSync(join(OUT, 'cube.stl'), writeAscii('cube', toTris(CUBE_FACES)));

// One face (its two triangles) removed: 4 open edges.
writeFileSync(join(OUT, 'cube-open.stl'), writeAscii('cube_open', toTris(CUBE_FACES.filter((_, i) => i !== 2 && i !== 3))));

// The shared corner (10, 10, 10) moved by 0.0005 mm in two of its
// triangles; welding at 0.001 mm closes it again.
const gapFaces = CUBE_FACES.map((f) => f.map((v) => v.slice()));
let moved = 0;
for (const face of gapFaces) {
  for (const v of face) {
    if (moved < 2 && v[0] === 10 && v[1] === 10 && v[2] === 10) {
      v[0] += 0.0005;
      moved++;
      break;
    }
  }
}
writeFileSync(join(OUT, 'cube-gap.stl'), writeAscii('cube_gap', toTris(gapFaces)));

// Cylinder along X from 0 to 20, radius 5, 64 segments, capped ends.
function cylinder(x0, x1, r, segments) {
  const p = (x, a) => [x, r * Math.cos(a), r * Math.sin(a)];
  const faces = [];
  for (let k = 0; k < segments; k++) {
    const a0 = (2 * Math.PI * k) / segments;
    const a1 = (2 * Math.PI * (k + 1)) / segments;
    faces.push([p(x0, a0), p(x1, a1), p(x1, a0)], [p(x0, a0), p(x0, a1), p(x1, a1)]);
    faces.push([[x0, 0, 0], p(x0, a1), p(x0, a0)], [[x1, 0, 0], p(x1, a0), p(x1, a1)]);
  }
  return toTris(faces);
}
const cylinderAscii = writeAscii('cylinder', cylinder(0, 20, 5, 64));
writeFileSync(join(OUT, 'cylinder-ascii.stl'), cylinderAscii);
writeFileSync(join(OUT, 'cylinder-binary.stl'), writeBinary(parseStl(Buffer.from(cylinderAscii))));

console.log(`mesh fixtures written to ${OUT}/`);

// Bad packages: each a copy of the prepared package with one change.
const PACKAGE = 'packages/staunton-clarkerubber';
const BAD = join(OUT, 'bad-packages');
if (!existsSync(PACKAGE)) {
  console.log(`${PACKAGE}/ not found; bad packages skipped (they are made after Phase 2).`);
} else {
  rmSync(BAD, { recursive: true, force: true });
  const copy = (name) => {
    const dir = join(BAD, name);
    cpSync(PACKAGE, dir, { recursive: true });
    return dir;
  };
  const editManifest = (dir, change) => {
    const p = join(dir, 'chess-set.json');
    const json = JSON.parse(readFileSync(p, 'utf8'));
    change(json);
    writeFileSync(p, JSON.stringify(json, null, 2) + '\n');
  };

  unlinkSync(join(copy('missing-file'), 'rook.stl'));
  editManifest(copy('schema-2'), (m) => { m.schema = 2; });
  editManifest(copy('inch-units'), (m) => { m.units = 'in'; });

  const shifted = copy('shifted-axis');
  const pawnPath = join(shifted, 'pawn.stl');
  const pawn = parseStl(readFileSync(pawnPath));
  for (let i = 1; i < pawn.length; i += 3) pawn[i] += 0.5;
  writeFileSync(pawnPath, writeBinary(pawn));

  editManifest(copy('script-name'), (m) => {
    m.name = '<script>x</script>';
    m.version = '9.9.9';
  });
  console.log(`bad packages written to ${BAD}/`);
}
