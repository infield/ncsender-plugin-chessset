// Mesh measurement and checks (implementation plan P4.3). The rotary axis is X.
import { BAND, FRAME_TOL, PROFILE_STEP } from './config.js';
import { parseStl } from './stl.js';

// Merges vertices within `tol` (Euclidean) using a spatial hash with cell
// size `tol`; each vertex searches the 3×3×3 cells around its own.
// Faces that end up with a repeated index are dropped and counted.
export function weld(tris, tol) {
  const buckets = new Map();
  const coords = [];
  const vertexCount = tris.length / 3;
  const index = new Uint32Array(vertexCount);
  const cell = (v) => Math.floor(v / tol);

  for (let v = 0; v < vertexCount; v++) {
    const x = tris[v * 3], y = tris[v * 3 + 1], z = tris[v * 3 + 2];
    const cx = cell(x), cy = cell(y), cz = cell(z);
    let found = -1;
    search: for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        for (let dz = -1; dz <= 1; dz++) {
          const bucket = buckets.get(`${cx + dx},${cy + dy},${cz + dz}`);
          if (!bucket) continue;
          for (const i of bucket) {
            if (Math.hypot(coords[i * 3] - x, coords[i * 3 + 1] - y, coords[i * 3 + 2] - z) <= tol) {
              found = i;
              break search;
            }
          }
        }
      }
    }
    if (found < 0) {
      found = coords.length / 3;
      coords.push(x, y, z);
      const key = `${cx},${cy},${cz}`;
      const bucket = buckets.get(key);
      if (bucket) bucket.push(found);
      else buckets.set(key, [found]);
    }
    index[v] = found;
  }

  const faces = [];
  let degenerate = 0;
  for (let t = 0; t < vertexCount / 3; t++) {
    const a = index[t * 3], b = index[t * 3 + 1], c = index[t * 3 + 2];
    if (a === b || b === c || a === c) degenerate++;
    else faces.push(a, b, c);
  }
  return { verts: Float64Array.from(coords), faces: Uint32Array.from(faces), degenerate };
}

// Closed when every undirected edge is used exactly twice. Volume is signed:
// positive for outward-facing (counter-clockwise from outside) winding.
export function closedCheck(verts, faces) {
  const n = verts.length / 3;
  const edges = new Map();
  const addEdge = (a, b) => {
    const key = a < b ? a * n + b : b * n + a;
    edges.set(key, (edges.get(key) || 0) + 1);
  };
  let volume = 0;
  for (let f = 0; f < faces.length; f += 3) {
    const a = faces[f], b = faces[f + 1], c = faces[f + 2];
    addEdge(a, b);
    addEdge(b, c);
    addEdge(c, a);
    const ax = verts[a * 3], ay = verts[a * 3 + 1], az = verts[a * 3 + 2];
    const bx = verts[b * 3], by = verts[b * 3 + 1], bz = verts[b * 3 + 2];
    const cx = verts[c * 3], cy = verts[c * 3 + 1], cz = verts[c * 3 + 2];
    volume += (ax * (by * cz - bz * cy) - ay * (bx * cz - bz * cx) + az * (bx * cy - by * cx)) / 6;
  }
  let openEdges = 0;
  for (const count of edges.values()) if (count !== 2) openEdges++;
  return { closed: edges.size > 0 && openEdges === 0, openEdges, volume };
}

export function measure(tris) {
  let minX = Infinity, maxX = -Infinity;
  for (let i = 0; i < tris.length; i += 3) {
    if (tris[i] < minX) minX = tris[i];
    if (tris[i] > maxX) maxX = tris[i];
  }
  let minY = Infinity, maxY = -Infinity, minZ = Infinity, maxZ = -Infinity;
  let swept = 0, base = 0, top = 0;
  for (let i = 0; i < tris.length; i += 3) {
    const x = tris[i], y = tris[i + 1], z = tris[i + 2];
    const r = Math.hypot(y, z);
    if (r > swept) swept = r;
    if (x <= minX + BAND) {
      if (r > base) base = r;
      if (y < minY) minY = y;
      if (y > maxY) maxY = y;
      if (z < minZ) minZ = z;
      if (z > maxZ) maxZ = z;
    }
    if (x >= maxX - BAND && r > top) top = r;
  }
  return {
    minX,
    maxX,
    axialLength: maxX - minX,
    axisOffset: Math.hypot((minY + maxY) / 2, (minZ + maxZ) / 2),
    baseDiameter: 2 * base,
    sweptDiameter: 2 * swept,
    topDiameter: 2 * top,
  };
}

// The largest value of f(y, z) in each PROFILE_STEP slice from minX; an
// empty slice repeats the previous value. A cross-section is a polygon, and
// a convex f (a radius, or ±z) peaks at one of its corners: a vertex, or a
// point where an edge crosses the section plane. So both are sampled: every
// vertex, and every edge crossing of a slice boundary (which counts for the
// slices on both sides). Vertices alone miss long edges that span a slice.
function sliceMax(tris, f) {
  const { minX, axialLength } = measure(tris);
  const slices = Math.max(1, Math.ceil(axialLength / PROFILE_STEP));
  const out = new Array(slices).fill(-Infinity);
  const put = (s, v) => {
    if (s >= 0 && s < slices && v > out[s]) out[s] = v;
  };
  const sliceOf = (x) => Math.min(slices - 1, Math.floor((x - minX) / PROFILE_STEP));
  for (let i = 0; i < tris.length; i += 3) put(sliceOf(tris[i]), f(tris[i + 1], tris[i + 2]));
  for (let t = 0; t < tris.length; t += 9) {
    for (let e = 0; e < 3; e++) {
      const a = t + e * 3;
      const b = t + ((e + 1) % 3) * 3;
      let [x0, y0, z0, x1, y1, z1] = [tris[a], tris[a + 1], tris[a + 2], tris[b], tris[b + 1], tris[b + 2]];
      if (x0 > x1) [x0, y0, z0, x1, y1, z1] = [x1, y1, z1, x0, y0, z0];
      for (let k = Math.floor((x0 - minX) / PROFILE_STEP) + 1; minX + k * PROFILE_STEP < x1; k++) {
        const u = (minX + k * PROFILE_STEP - x0) / (x1 - x0);
        const v = f(y0 + u * (y1 - y0), z0 + u * (z1 - z0));
        put(k - 1, v);
        put(k, v);
      }
    }
  }
  for (let s = 0; s < slices; s++) if (out[s] === -Infinity) out[s] = s > 0 ? out[s - 1] : 0;
  return out;
}

// Largest radius about the X axis in each slice: the turning envelope.
export function profile(tris) {
  return sliceMax(tris, (y, z) => Math.hypot(y, z));
}

// The side view seen along Y (+Z up): the highest and lowest Z in each
// slice. For a turned piece it matches the profile; for the knight it shows
// the head, which faces +Z.
export function sideProfile(tris) {
  return { top: sliceMax(tris, (y, z) => z), bottom: sliceMax(tris, (y, z) => -z).map((v) => -v) };
}

// §5.6 import checks 3 and 4 for one file. Pure and synchronous. No closure
// check, no declared-size comparison and no checksum (owner decision A4).
export function checkPiece(buf) {
  let tris;
  try {
    tris = parseStl(buf);
  } catch (e) {
    return { measurements: null, profile: null, side: null, tris: null, errors: [{ check: 'parse', value: e.message }] };
  }
  const measurements = measure(tris);
  const errors = [];
  if (measurements.axisOffset > FRAME_TOL) {
    errors.push({ check: 'axisOffset', value: measurements.axisOffset, limit: FRAME_TOL });
  }
  if (Math.abs(measurements.minX) > FRAME_TOL) {
    errors.push({ check: 'basePlane', value: measurements.minX, limit: FRAME_TOL });
  }
  return { measurements, profile: profile(tris), side: sideProfile(tris), tris, errors };
}
