// Worker handlers (implementation plan Detail 1, P4.8). The same handlers
// run in the page when a Worker can't start (import only). They never fetch:
// the page reads every file and posts its contents.
import { ROLES } from './config.js';
import { checkPiece } from './measure.js';
import { buildBlank } from './blank.js';
import { fromBase64, parseStl, toBase64, writeAscii, writeBinary } from './stl.js';

export function createHandlers() {
  const meshes = new Map(); // package key → {role: tris}

  const handlers = {
    ping: () => 'pong',

    // {files: {role: ArrayBuffer}} → {role: {measurements, profile, side, b64, errors}}
    measurePackage({ files }) {
      const out = {};
      for (const role of ROLES) {
        const { measurements, profile, side, tris, errors } = checkPiece(files[role]);
        out[role] = { measurements, profile, side, errors, b64: errors.length ? null : toBase64(writeBinary(tris)) };
      }
      return out;
    },

    // {key, b64: {role: string}} → true. Keeps the meshes for export.
    loadPackage({ key, b64 }) {
      const set = {};
      for (const role of ROLES) set[role] = parseStl(fromBase64(b64[role]));
      meshes.set(key, set);
      return true;
    },

    // {key, blank, scale, neck?, name} → the blank as ASCII STL text.
    buildBlankText({ key, blank, scale, neck, name }) {
      const set = meshes.get(key);
      if (!set) throw new Error(`package ${key} is not loaded`);
      return writeAscii(name, buildBlank(blank, set, scale, neck));
    },
  };

  return async (msg) => {
    const fn = handlers[msg.type];
    if (!fn) throw new Error(`unknown call: ${msg.type}`);
    return fn(msg);
  };
}
