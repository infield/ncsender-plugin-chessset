// One blank's geometry (implementation plan P4.6; spec §5.5). Pure.
import { NECK_OVERLAP, NECK_SEGMENTS } from './config.js';
import { transform } from './stl.js';

// A closed cylinder on the X axis from x0 to x1, radius r, wound
// counter-clockwise as seen from outside (outward normals).
export function neckCylinder(x0, x1, r, segments = NECK_SEGMENTS) {
  const out = new Float64Array(segments * 4 * 9);
  let o = 0;
  const tri = (a, b, c) => {
    out.set(a, o);
    out.set(b, o + 3);
    out.set(c, o + 6);
    o += 9;
  };
  const p = (x, k) => {
    const a = (2 * Math.PI * k) / segments;
    return [x, r * Math.cos(a), r * Math.sin(a)];
  };
  for (let k = 0; k < segments; k++) {
    tri(p(x0, k), p(x1, k + 1), p(x1, k));
    tri(p(x0, k), p(x0, k + 1), p(x1, k + 1));
    tri([x0, 0, 0], p(x0, k + 1), p(x0, k)); // end at x0 faces −X
    tri([x1, 0, 0], p(x1, k), p(x1, k + 1)); // end at x1 faces +X
  }
  return out;
}

// `blank` from plan(); `meshes` {role: tris} in the package frame. With
// `neck` (a diameter), one neck per gap, overlapping each neighbour by
// NECK_OVERLAP. Pieces and necks are separate closed shells (§5.5).
export function buildBlank(blank, meshes, scale, neck) {
  const parts = blank.pieces.map((p) => transform(meshes[p.role], scale, p.xStart));
  if (neck) {
    for (let j = 1; j < blank.pieces.length; j++) {
      parts.push(neckCylinder(blank.pieces[j - 1].xEnd - NECK_OVERLAP, blank.pieces[j].xStart + NECK_OVERLAP, neck / 2));
    }
  }
  const out = new Float64Array(parts.reduce((n, a) => n + a.length, 0));
  let o = 0;
  for (const a of parts) {
    out.set(a, o);
    o += a.length;
  }
  return out;
}
