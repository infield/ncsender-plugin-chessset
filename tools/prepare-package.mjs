// One-time preparation of the Staunton model package (implementation plan P4.11; spec §10).
//
// Usage:
//   prepare-package <src> <outDir> [--knight-flip] [--replace <Piece>=<file.stl>]
//   prepare-package --measure <file.stl> [--x0 <a> --x1 <b>]
//   prepare-package --svg <outDir>
//
// <src> is <clone>/Source/Staunton from clarkerubber/Staunton-Pieces at cef2c79.
import { copyFileSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join, resolve } from 'node:path';
import { parseStl, writeBinary } from '../src/stl.js';
import { weld, closedCheck, measure } from '../src/measure.js';
import { BAND, ROLES, WELD_TOL } from '../src/config.js';

const PIECE_NAME = { king: 'King', queen: 'Queen', bishop: 'Bishop', knight: 'Knight', rook: 'Rook', pawn: 'Pawn' };
const KNIGHT_NOTE = 'Knight: Rotary CAM indexed pass reaches part of the jaw/mane only; hand finishing expected.';

function fail(message) {
  console.error(message);
  process.exit(1);
}

const r2 = (v) => Math.round(v * 100) / 100;

// Step 1: Y-up to the X axis, (x, y, z) → (y, −x, z). A proper rotation, so
// the winding (and outward normals) are kept.
function yUpToX(tris) {
  const out = new Float64Array(tris.length);
  for (let i = 0; i < tris.length; i += 3) {
    out[i] = tris[i + 1];
    out[i + 1] = -tris[i];
    out[i + 2] = tris[i + 2];
  }
  return out;
}

// Step 2: base-band centre onto the axis, and minX = 0.
function centre(tris) {
  const m = measure(tris);
  let minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  for (let i = 0; i < tris.length; i += 3) {
    if (tris[i] <= m.minX + BAND) {
      minY = Math.min(minY, tris[i + 1]);
      maxY = Math.max(maxY, tris[i + 1]);
      minZ = Math.min(minZ, tris[i + 2]);
      maxZ = Math.max(maxZ, tris[i + 2]);
    }
  }
  const cy = (minY + maxY) / 2, cz = (minZ + maxZ) / 2;
  const out = new Float64Array(tris.length);
  for (let i = 0; i < tris.length; i += 3) {
    out[i] = tris[i] - m.minX;
    out[i + 1] = tris[i + 1] - cy;
    out[i + 2] = tris[i + 2] - cz;
  }
  return out;
}

function rotateAboutX(tris, theta) {
  const c = Math.cos(theta), s = Math.sin(theta);
  const out = new Float64Array(tris.length);
  for (let i = 0; i < tris.length; i += 3) {
    const y = tris[i + 1], z = tris[i + 2];
    out[i] = tris[i];
    out[i + 1] = y * c - z * s;
    out[i + 2] = y * s + z * c;
  }
  return out;
}

// Step 3 (knight): rotate so the mean Y/Z of the top 40% points to +Z.
function knightFacing(tris, flip) {
  const { minX, axialLength } = measure(tris);
  let sy = 0, sz = 0, n = 0;
  for (let i = 0; i < tris.length; i += 3) {
    if (tris[i] >= minX + 0.6 * axialLength) {
      sy += tris[i + 1];
      sz += tris[i + 2];
      n++;
    }
  }
  const theta = Math.atan2(sy / n, sz / n) + (flip ? Math.PI : 0);
  return { tris: rotateAboutX(tris, theta), theta };
}


// Step 4: weld at WELD_TOL and check closure. Small, simple holes (each
// boundary loop has at most MAX_HOLE_EDGES edges, at most MAX_HOLES loops,
// no edge shared by more than two faces) are filled with a fan from the
// hole's centroid, wound to match the surrounding faces. Anything else
// stops with the MeshLab instructions. A looser re-weld is not used: on the
// Staunton knight it merged nearby vertices into 391 open edges.
const MAX_HOLES = 4;
const MAX_HOLE_EDGES = 24;

function fillSmallHoles(verts, faces) {
  const n = verts.length / 3;
  const uses = new Map();
  const directed = new Map(); // undirected key -> [a, b] as it appears in its one face
  for (let f = 0; f < faces.length; f += 3) {
    for (const [a, b] of [[faces[f], faces[f + 1]], [faces[f + 1], faces[f + 2]], [faces[f + 2], faces[f]]]) {
      const key = a < b ? a * n + b : b * n + a;
      uses.set(key, (uses.get(key) || 0) + 1);
      directed.set(key, [a, b]);
    }
  }
  if ([...uses.values()].some((c) => c > 2)) return null;
  const next = new Map();
  for (const [key, count] of uses) {
    if (count !== 1) continue;
    const [a, b] = directed.get(key);
    if (next.has(a)) return null; // not a simple loop
    next.set(a, b);
  }
  const loops = [];
  const seen = new Set();
  for (const start of next.keys()) {
    if (seen.has(start)) continue;
    const loop = [];
    let v = start;
    while (!seen.has(v)) {
      seen.add(v);
      loop.push(v);
      v = next.get(v);
      if (v === undefined) return null;
    }
    if (v !== start || loop.length > MAX_HOLE_EDGES) return null;
    loops.push(loop);
  }
  if (loops.length > MAX_HOLES) return null;

  const coords = Array.from(verts);
  const out = Array.from(faces);
  for (const loop of loops) {
    const c = coords.length / 3;
    const centroid = [0, 1, 2].map((k) => loop.reduce((sum, v) => sum + verts[v * 3 + k], 0) / loop.length);
    coords.push(...centroid);
    // Each boundary edge a→b belongs to a face that uses it as a→b, so the
    // filling face must use it as b→a.
    for (let i = 0; i < loop.length; i++) out.push(c, loop[(i + 1) % loop.length], loop[i]);
  }
  return { verts: Float64Array.from(coords), faces: Uint32Array.from(out), holes: loops.map((l) => l.length) };
}

function rebuild({ verts, faces }) {
  const out = new Float64Array(faces.length * 3);
  for (let f = 0; f < faces.length; f++) {
    const v = faces[f];
    out[f * 3] = verts[v * 3];
    out[f * 3 + 1] = verts[v * 3 + 1];
    out[f * 3 + 2] = verts[v * 3 + 2];
  }
  return out;
}

function closeMesh(tris, pieceName) {
  let mesh = weld(tris, WELD_TOL);
  let check = closedCheck(mesh.verts, mesh.faces);
  let holes = [];
  if (!check.closed) {
    const filled = fillSmallHoles(mesh.verts, mesh.faces);
    if (filled) {
      mesh = { ...filled, degenerate: mesh.degenerate };
      holes = filled.holes;
      check = closedCheck(mesh.verts, mesh.faces);
    }
  }
  if (!check.closed) {
    fail(
      `${pieceName} is not closed (${check.openEdges} open edges): repair it in MeshLab ` +
        `(Filters → Cleaning and Repairing → Close Holes), then rerun with --replace ${pieceName}=<repaired.stl>`,
    );
  }
  if (check.volume <= 0) fail(`${pieceName} is inside out (volume ${check.volume.toFixed(1)} mm³); check its winding.`);
  return { tris: rebuild(mesh), volume: check.volume, degenerate: mesh.degenerate, holes };
}

function preparePackage(src, outDir, flip, replacements) {
  const prepared = {};
  for (const role of ROLES) {
    const name = PIECE_NAME[role];
    const file = replacements[name] || join(src, name, `${name}.STL`);
    if (!existsSync(file)) fail(`Missing ${file}`);
    let tris = centre(yUpToX(parseStl(readFileSync(file))));
    if (role === 'knight') {
      const turned = knightFacing(tris, flip);
      tris = turned.tris;
      console.log(`Knight turned ${((turned.theta * 180) / Math.PI).toFixed(2)}° about X${flip ? ' (flipped)' : ''}`);
    }
    const closed = closeMesh(tris, name);
    prepared[role] = { ...closed, source: file, triangles: closed.tris.length / 9, m: measure(closed.tris) };
    if (closed.holes.length) console.log(`${name}: filled ${closed.holes.length} hole(s) of ${closed.holes.join(', ')} edges`);
  }

  // Nothing is written until every piece has passed.
  mkdirSync(outDir, { recursive: true });
  const pieces = {};
  for (const role of ROLES) {
    writeFileSync(join(outDir, `${role}.stl`), writeBinary(prepared[role].tris));
    const m = prepared[role].m;
    pieces[role] = {
      file: `${role}.stl`,
      axialLength: r2(m.axialLength),
      baseDiameter: r2(m.baseDiameter),
      sweptDiameter: r2(m.sweptDiameter),
      topDiameter: r2(m.topDiameter),
    };
  }
  const manifest = {
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
    pieces,
    notes: KNIGHT_NOTE,
  };
  writeFileSync(join(outDir, 'chess-set.json'), JSON.stringify(manifest, null, 2) + '\n');
  copyFileSync(resolve(src, '..', '..', 'LICENSE'), join(outDir, 'LICENSE'));

  console.log('\n| Piece | Triangles | Axial length | Base Ø | Swept Ø | Top Ø | Closed after weld (' + WELD_TOL + ' mm) |');
  console.log('|---|---:|---:|---:|---:|---:|---|');
  for (const role of ROLES) {
    const p = prepared[role];
    const m = p.m;
    console.log(
      `| ${PIECE_NAME[role]} | ${p.triangles} | ${m.axialLength.toFixed(2)} | ${m.baseDiameter.toFixed(2)} | ` +
        `${m.sweptDiameter.toFixed(2)} | ${m.topDiameter.toFixed(2)} | yes${p.holes.length ? `, after filling ${p.holes.length} hole(s) of ${p.holes.join(', ')} edges` : ''} |`,
    );
  }
  console.log(`\nWrote ${outDir}/: chess-set.json, LICENSE, ${ROLES.map((r) => `${r}.stl`).join(', ')}`);
}

function measureFile(file, x0, x1) {
  let tris = parseStl(readFileSync(file));
  if (x0 !== undefined && x1 !== undefined) {
    const kept = [];
    for (let t = 0; t < tris.length; t += 9) {
      if ([0, 3, 6].every((k) => tris[t + k] >= x0 && tris[t + k] <= x1)) kept.push(...tris.subarray(t, t + 9));
    }
    if (!kept.length) fail(`No triangles lie entirely between x ${x0} and ${x1}.`);
    tris = Float64Array.from(kept);
  }
  const m = measure(tris);
  console.log(`axial length ${m.axialLength.toFixed(3)} mm`);
  console.log(`base Ø ${m.baseDiameter.toFixed(3)} mm, swept Ø ${m.sweptDiameter.toFixed(3)} mm, top Ø ${m.topDiameter.toFixed(3)} mm`);
}

// Shaded, depth-sorted views of the knight for checking its facing
// direction: a side view (X across, base at left; +Z up) and an end view
// seen from the top of the piece (Y across, +Z up). Every triangle is drawn,
// far ones first, shaded by how directly it faces a light near the viewer.
function shadedView(tris, project, depthOf, light, scale) {
  const polys = [];
  for (let t = 0; t < tris.length; t += 9) {
    const a = [tris[t], tris[t + 1], tris[t + 2]], b = [tris[t + 3], tris[t + 4], tris[t + 5]], c = [tris[t + 6], tris[t + 7], tris[t + 8]];
    const u = [b[0] - a[0], b[1] - a[1], b[2] - a[2]], v = [c[0] - a[0], c[1] - a[1], c[2] - a[2]];
    const nx = u[1] * v[2] - u[2] * v[1], ny = u[2] * v[0] - u[0] * v[2], nz = u[0] * v[1] - u[1] * v[0];
    const len = Math.hypot(nx, ny, nz) || 1;
    const lit = Math.abs((nx * light[0] + ny * light[1] + nz * light[2]) / len);
    const g = Math.round(70 + 170 * lit);
    const pts = [a, b, c].map((q) => project(q).map((k) => (k * scale).toFixed(1)).join(',')).join(' ');
    polys.push({ depth: (depthOf(a) + depthOf(b) + depthOf(c)) / 3, svg: `<polygon points="${pts}" fill="rgb(${g},${Math.round(g * 0.8)},${Math.round(g * 0.6)})"/>` });
  }
  polys.sort((p, q) => p.depth - q.depth);
  return polys.map((p) => p.svg).join('');
}

function knightSvg(outDir) {
  const file = join(outDir, 'knight.stl');
  if (!existsSync(file)) fail(`Missing ${file}; prepare the package first.`);
  const tris = parseStl(readFileSync(file));
  const { maxX, sweptDiameter } = measure(tris);
  const scale = 6;
  const r = (sweptDiameter / 2) * scale;
  // Side view: camera on −Y looking toward +Y; nearer means smaller y.
  const side = shadedView(tris, (q) => [q[0], -q[2]], (q) => -q[1], [0.3, -1, 0.4], scale);
  // End view from the top: camera on +X looking toward −X, so +Y appears to the left.
  const end = shadedView(tris, (q) => [-q[1], -q[2]], (q) => q[0], [1, -0.3, 0.4], scale);
  const W = maxX * scale;
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="-20 ${-r - 40} ${W + 2 * r + 100} ${2 * r + 70}" font-family="sans-serif" font-size="11">
  <text x="0" y="${-r - 20}">Side view (from −Y): base at left = chuck end, +Z up. The face should point up.</text>
  <g>${side}</g>
  <line x1="0" y1="0" x2="${W}" y2="0" stroke="#36c" stroke-dasharray="4 4"/>
  <text x="${W + r + 40 - 30}" y="${-r - 20}">End view from the top, +Z up</text>
  <g transform="translate(${W + r + 60},0)">${end}
    <line x1="${-r}" y1="0" x2="${r}" y2="0" stroke="#36c" stroke-dasharray="4 4"/>
    <text x="4" y="${-r - 4}">+Z</text>
  </g>
</svg>
`;
  writeFileSync(join(outDir, 'knight-check.svg'), svg);
  console.log(`Wrote ${join(outDir, 'knight-check.svg')}`);
}

const args = process.argv.slice(2);
const flagValue = (name) => {
  const i = args.indexOf(name);
  return i >= 0 ? args[i + 1] : undefined;
};

if (args[0] === '--measure') {
  if (!args[1]) fail('Usage: prepare-package --measure <file.stl> [--x0 <a> --x1 <b>]');
  const x0 = flagValue('--x0'), x1 = flagValue('--x1');
  measureFile(args[1], x0 === undefined ? undefined : Number(x0), x1 === undefined ? undefined : Number(x1));
} else if (args[0] === '--svg') {
  if (!args[1]) fail('Usage: prepare-package --svg <outDir>');
  knightSvg(args[1]);
} else {
  const positional = [];
  const replacements = {};
  let flip = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--knight-flip') flip = true;
    else if (args[i] === '--replace') {
      const [piece, file] = String(args[++i] || '').split('=');
      if (!PIECE_NAME[String(piece).toLowerCase()] || !file) fail('--replace needs <Piece>=<file.stl>, e.g. --replace Knight=knight-fixed.stl');
      replacements[PIECE_NAME[piece.toLowerCase()]] = file;
    } else positional.push(args[i]);
  }
  if (positional.length !== 2) {
    fail('Usage: prepare-package <src> <outDir> [--knight-flip] [--replace <Piece>=<file.stl>]');
  }
  preparePackage(positional[0], positional[1], flip, replacements);
}
