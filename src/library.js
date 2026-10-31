// The chess-set library picker (spec §5.6, §5.9; implementation plan P4.8a).
// Reads library.json from the library's main branch, then a set's files
// from raw.githubusercontent.com at the set's release tag. Downloaded files
// go through the same import checks as a picked folder (importPackage).
import { LIBRARY_INDEX, LIBRARY_RAW } from './config.js';
import { passesPathRule } from './manifest.js';

const ID = /^[a-z0-9-]+$/;
const VERSION = /^\d+\.\d+\.\d+$/;
const text = (v, max = 200) => typeof v === 'string' && v.trim() !== '' && v.length <= max;

export class LibraryError extends Error {}

// Checks library.json and returns its sets. Each set:
// {id, name, version, tag, path, license, attribution, source, author?, description?}.
export function validateIndex(json) {
  if (!json || json.format !== 'chessset-library' || json.formatVersion !== 1 || !Array.isArray(json.sets)) {
    throw new LibraryError('The library index is not a chess-set library (format chessset-library, version 1).');
  }
  return json.sets.filter((s) =>
    s && ID.test(s.id ?? '') && VERSION.test(s.version ?? '') && s.tag === `${s.id}-v${s.version}`
    && passesPathRule(s.path) && s.path.startsWith('sets/')
    && text(s.name, 80) && text(s.license) && text(s.attribution) && text(s.source, 500));
}

async function get(fetchFn, url, as) {
  let res;
  try {
    res = await fetchFn(url);
  } catch (e) {
    throw new LibraryError(`Can't reach the chess-set library (${e.message || e}). Check the internet connection, or import a package folder instead.`);
  }
  if (!res.ok) throw new LibraryError(`The library returned ${res.status} for ${url}.`);
  return as === 'json' ? res.json() : as === 'text' ? res.text() : res.arrayBuffer();
}

export async function fetchLibrary(fetchFn = fetch) {
  return validateIndex(await get(fetchFn, LIBRARY_INDEX, 'json'));
}

// Compares two x.y.z versions numerically: <0, 0 or >0.
export function compareVersions(a, b) {
  const pa = String(a).split('.').map(Number);
  const pb = String(b).split('.').map(Number);
  for (let i = 0; i < 3; i++) if ((pa[i] || 0) !== (pb[i] || 0)) return (pa[i] || 0) - (pb[i] || 0);
  return 0;
}

// What the library list offers for a set (§5.9): 'have' when this exact
// version is installed, 'update' when only older versions of the set are
// installed, else 'install' (none installed, or a newer one is).
export function libraryAction(set, packages) {
  const versions = Object.values(packages || {}).filter((p) => p?.id === set.id).map((p) => p.version);
  if (versions.includes(set.version)) return 'have';
  if (versions.length && versions.every((v) => compareVersions(v, set.version) < 0)) return 'update';
  return 'install';
}

// The raw URL of one file of a set, pinned to the set's release tag.
export function setFileUrl(set, name) {
  const parts = `${set.path}/${name}`.split('/').map(encodeURIComponent).join('/');
  return `${LIBRARY_RAW}/${encodeURIComponent(set.tag)}/${parts}`;
}

// Downloads a set's files and returns them as File-like objects for
// importPackage: {name, webkitRelativePath, text(), arrayBuffer()}.
export async function fetchSetFiles(set, { fetchFn = fetch, onProgress = () => {} } = {}) {
  const root = set.id;
  const file = (name, buf) => ({
    name,
    webkitRelativePath: `${root}/${name}`,
    text: async () => new TextDecoder().decode(buf),
    arrayBuffer: async () => buf,
  });
  onProgress('Downloading chess-set.json…');
  const manifestBuf = await get(fetchFn, setFileUrl(set, 'chess-set.json'), 'buffer');
  let manifest;
  try {
    manifest = JSON.parse(new TextDecoder().decode(manifestBuf));
  } catch {
    throw new LibraryError(`${set.name}: chess-set.json in the library is not valid JSON.`);
  }
  if (manifest.id !== set.id || manifest.version !== set.version) {
    throw new LibraryError(`${set.name}: the library lists ${set.id} ${set.version}, but its chess-set.json is ${manifest.id} ${manifest.version}.`);
  }
  // Only names that pass the path rule are fetched; importPackage reports the rest.
  const names = [manifest.licenseFile, ...Object.values(manifest.pieces || {}).map((p) => p?.file)].filter((n) => passesPathRule(n));
  const files = [file('chess-set.json', manifestBuf)];
  for (let i = 0; i < names.length; i++) {
    onProgress(`Downloading ${i + 1} of ${names.length}: ${names[i]}`);
    files.push(file(names[i], await get(fetchFn, setFileUrl(set, names[i]), 'buffer')));
  }
  return files;
}
