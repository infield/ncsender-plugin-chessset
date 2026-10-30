// STL reading and writing (implementation plan P4.2).
// A triangle list is a Float64Array holding 9 numbers per triangle:
// x1 y1 z1 x2 y2 z2 x3 y3 z3.

function bytesOf(buf) {
  if (buf instanceof Uint8Array) return buf;
  if (ArrayBuffer.isView(buf)) return new Uint8Array(buf.buffer, buf.byteOffset, buf.byteLength);
  if (buf instanceof ArrayBuffer) return new Uint8Array(buf);
  throw new Error('not an STL');
}

function notStl() {
  return new Error('not an STL');
}

// Binary when the size matches the triangle count stored at byte 80;
// otherwise ASCII, reading every `vertex x y z` line in order.
export function parseStl(buf) {
  const u8 = bytesOf(buf);
  const dv = new DataView(u8.buffer, u8.byteOffset, u8.byteLength);
  let tris;
  if (u8.byteLength >= 84 && u8.byteLength === 84 + 50 * dv.getUint32(80, true)) {
    const count = dv.getUint32(80, true);
    tris = new Float64Array(count * 9);
    for (let t = 0; t < count; t++) {
      const base = 84 + t * 50 + 12; // skip the stored normal
      for (let k = 0; k < 9; k++) tris[t * 9 + k] = dv.getFloat32(base + k * 4, true);
    }
  } else {
    const text = new TextDecoder('utf-8').decode(u8);
    const values = [];
    const re = /vertex\s+(\S+)\s+(\S+)\s+(\S+)/g;
    let m;
    while ((m = re.exec(text)) !== null) values.push(Number(m[1]), Number(m[2]), Number(m[3]));
    tris = Float64Array.from(values);
  }
  const vertexCount = tris.length / 3;
  if (vertexCount === 0 || vertexCount % 3 !== 0) throw notStl();
  for (let i = 0; i < tris.length; i++) if (!Number.isFinite(tris[i])) throw notStl();
  return tris;
}

// Unit normal from the winding (right-hand rule); 0 0 0 when degenerate.
export function triangleNormal(tris, t) {
  const o = t * 9;
  const ux = tris[o + 3] - tris[o], uy = tris[o + 4] - tris[o + 1], uz = tris[o + 5] - tris[o + 2];
  const vx = tris[o + 6] - tris[o], vy = tris[o + 7] - tris[o + 1], vz = tris[o + 8] - tris[o + 2];
  const nx = uy * vz - uz * vy, ny = uz * vx - ux * vz, nz = ux * vy - uy * vx;
  const len = Math.hypot(nx, ny, nz);
  return len < 1e-12 ? [0, 0, 0] : [nx / len, ny / len, nz / len];
}

// 6-digit exponent form with a two-digit exponent, as in test_files/ (1.000000e+00).
function expText(v) {
  return v.toExponential(6).replace(/e([+-])(\d)$/, 'e$10$2');
}

const FACETS_PER_CHUNK = 10000;

// ASCII STL in the test_files/ layout. Text is built in chunks and joined
// once, since outputs reach about 38 MB.
export function writeAscii(name, tris) {
  const count = tris.length / 9;
  const chunks = [`solid ${name}\n`];
  let lines = [];
  for (let t = 0; t < count; t++) {
    const [nx, ny, nz] = triangleNormal(tris, t);
    const o = t * 9;
    lines.push(
      ` facet normal ${expText(nx)} ${expText(ny)} ${expText(nz)}\n  outer loop\n` +
        `   vertex ${tris[o].toFixed(4)} ${tris[o + 1].toFixed(4)} ${tris[o + 2].toFixed(4)}\n` +
        `   vertex ${tris[o + 3].toFixed(4)} ${tris[o + 4].toFixed(4)} ${tris[o + 5].toFixed(4)}\n` +
        `   vertex ${tris[o + 6].toFixed(4)} ${tris[o + 7].toFixed(4)} ${tris[o + 8].toFixed(4)}\n` +
        '  endloop\n endfacet\n',
    );
    if (lines.length === FACETS_PER_CHUNK) {
      chunks.push(lines.join(''));
      lines = [];
    }
  }
  chunks.push(lines.join(''), `endsolid ${name}\n`);
  return chunks.join('');
}

// Standard binary STL with computed normals.
export function writeBinary(tris) {
  const count = tris.length / 9;
  const out = new Uint8Array(84 + 50 * count);
  const dv = new DataView(out.buffer);
  const header = 'chess-set-creator';
  for (let i = 0; i < header.length; i++) out[i] = header.charCodeAt(i);
  dv.setUint32(80, count, true);
  for (let t = 0; t < count; t++) {
    const base = 84 + t * 50;
    const n = triangleNormal(tris, t);
    for (let k = 0; k < 3; k++) dv.setFloat32(base + k * 4, n[k], true);
    for (let k = 0; k < 9; k++) dv.setFloat32(base + 12 + k * 4, tris[t * 9 + k], true);
    dv.setUint16(base + 48, 0, true);
  }
  return out;
}

// New array with x·s + dx, y·s, z·s.
export function transform(tris, s, dx) {
  const out = new Float64Array(tris.length);
  for (let i = 0; i < tris.length; i += 3) {
    out[i] = tris[i] * s + dx;
    out[i + 1] = tris[i + 1] * s;
    out[i + 2] = tris[i + 2] * s;
  }
  return out;
}

const SLICE = 32768; // stays well under the call-stack limit for fromCharCode.apply

export function toBase64(u8) {
  const bytes = bytesOf(u8);
  const parts = [];
  for (let i = 0; i < bytes.length; i += SLICE) {
    parts.push(String.fromCharCode.apply(null, bytes.subarray(i, i + SLICE)));
  }
  return btoa(parts.join(''));
}

export function fromBase64(s) {
  const bin = atob(s);
  const out = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}
