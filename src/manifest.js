// chess-set.json validation (implementation plan P4.4; spec §5.6). Pure.
import { ROLES } from './config.js';

// A non-empty string with no backslash, not starting with "/", and with no
// "." or ".." segment.
export function passesPathRule(p) {
  if (typeof p !== 'string' || p === '' || p.includes('\\') || p.startsWith('/')) return false;
  return p.split('/').every((seg) => seg !== '.' && seg !== '..');
}

const isNonEmptyString = (v) => typeof v === 'string' && v.trim() !== '';

// Returns {errors, manifest}. `names` is a Set (or array) of the file paths
// in the package folder, relative to its root. Each error is {field, message}.
export function validateManifest(json, names) {
  const present = names instanceof Set ? names : new Set(names || []);
  const errors = [];
  const err = (field, message) => errors.push({ field, message });

  if (json === null || typeof json !== 'object' || Array.isArray(json)) {
    return { errors: [{ field: '(file)', message: 'chess-set.json must contain a JSON object.' }], manifest: null };
  }

  // A path that fails the path rule gets only that error; presence is
  // checked only for paths that pass.
  const checkFile = (field, value) => {
    if (!passesPathRule(value)) err(field, 'must be a relative path inside the package folder.');
    else if (!present.has(value)) err(field, `file "${value}" is not in the package folder.`);
  };

  if (json.schema !== 1) err('schema', 'must be 1.');
  if (typeof json.id !== 'string' || !/^[a-z0-9-]+$/.test(json.id)) {
    err('id', 'must use only lowercase letters, digits and "-".');
  }
  if (typeof json.version !== 'string' || !/^\d+\.\d+\.\d+$/.test(json.version)) {
    err('version', 'must be a version like 1.0.0.');
  }
  if (!isNonEmptyString(json.name) || json.name.length > 80) {
    err('name', 'must be a non-empty string of at most 80 characters.');
  }
  for (const field of ['author', 'source', 'license', 'attribution']) {
    if (!isNonEmptyString(json[field])) err(field, 'must be a non-empty string.');
  }
  checkFile('licenseFile', json.licenseFile);
  if (json.units !== 'mm') err('units', 'Inch packages are not supported in v1; units must be mm.');
  if (json.frame !== 'x-axis-base-at-origin-v1') err('frame', 'must be "x-axis-base-at-origin-v1".');

  const pieces = json.pieces;
  if (pieces === null || typeof pieces !== 'object' || Array.isArray(pieces)) {
    err('pieces', `must list exactly these pieces: ${ROLES.join(', ')}.`);
  } else {
    const keys = Object.keys(pieces);
    const missing = ROLES.filter((r) => !keys.includes(r));
    const extra = keys.filter((k) => !ROLES.includes(k));
    if (missing.length || extra.length) {
      const parts = [];
      if (missing.length) parts.push(`missing ${missing.join(', ')}`);
      if (extra.length) parts.push(`unexpected ${extra.join(', ')}`);
      err('pieces', `must list exactly the six pieces (${parts.join('; ')}).`);
    } else {
      for (const role of ROLES) {
        const piece = pieces[role];
        if (piece === null || typeof piece !== 'object') err(`pieces.${role}`, 'must be an object with a "file".');
        else checkFile(`pieces.${role}.file`, piece.file);
      }
    }
  }

  if (json.notes !== undefined && (typeof json.notes !== 'string' || json.notes.length > 2000)) {
    err('notes', 'must be a string of at most 2000 characters.');
  }

  return { errors, manifest: errors.length ? null : json };
}
