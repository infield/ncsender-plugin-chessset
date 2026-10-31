// Model package import and loading (implementation plan P4.8; spec §5.6).
import { PACKAGE_ROOT, ROLES } from './config.js';
import { validateManifest } from './manifest.js';
import { roundHalfUp } from './units.js';

const CHECK_LABEL = { parse: 'parse', axisOffset: 'axis offset', basePlane: 'base plane' };

// One line per failed check: "file — check — value (limit)".
export function pieceErrorLine(file, e) {
  const check = CHECK_LABEL[e.check] || e.check;
  if (e.check === 'parse') return `${file} — ${check} — ${e.value}`;
  return `${file} — ${check} — ${roundHalfUp(e.value, 2).toFixed(2)} mm (limit ${e.limit} mm)`;
}

const round3 = (x) => roundHalfUp(x, 3);

// Import a package folder picked with <input webkitdirectory>.
// `fileList` holds File-like objects with webkitRelativePath, text() and
// arrayBuffer(). `saveSettings(patch)` saves a settings patch.
// Returns {ok:true, key, record} or {ok:false, errors:[string]}.
export async function importPackage({ fm, call, saveSettings, fileList, onProgress = () => {} }) {
  const files = Array.from(fileList || []);
  const fail = (...errors) => ({ ok: false, errors });

  // 1. The root is the first segment of webkitRelativePath.
  const byName = new Map();
  for (const f of files) {
    const rel = String(f.webkitRelativePath || f.name);
    const slash = rel.indexOf('/');
    byName.set(slash >= 0 ? rel.slice(slash + 1) : rel, f);
  }
  const manifestFile = byName.get('chess-set.json');
  if (!manifestFile) return fail('No chess-set.json in the selected folder.');

  // 2. Parse and validate the manifest.
  onProgress('Checking chess-set.json…');
  const manifestText = await manifestFile.text();
  let json;
  try {
    json = JSON.parse(manifestText);
  } catch (e) {
    return fail(`chess-set.json — (file) — not valid JSON: ${e.message}`);
  }
  const { errors, manifest } = validateManifest(json, new Set(byName.keys()));
  if (errors.length) return fail(...errors.map((e) => `chess-set.json — ${e.field} — ${e.message}`));

  // 3. Read the six STLs and check them in the Worker.
  onProgress('Checking the six pieces…');
  const buffers = {};
  for (const role of ROLES) buffers[role] = await byName.get(manifest.pieces[role].file).arrayBuffer();
  const checked = await call('measurePackage', { files: buffers }, Object.values(buffers));

  // 4. Report every piece error; store nothing.
  const pieceErrors = [];
  for (const role of ROLES) {
    for (const e of checked[role].errors) pieceErrors.push(pieceErrorLine(manifest.pieces[role].file, e));
  }
  if (pieceErrors.length) return fail(...pieceErrors);

  // 5. Save the package files.
  const key = `${manifest.id}@${manifest.version}`;
  const dir = `${PACKAGE_ROOT}/${key}`;
  const licenseText = await byName.get(manifest.licenseFile).text();
  const toSave = [
    [`${dir}/chess-set.json`, manifestText],
    [`${dir}/LICENSE`, licenseText],
    ...ROLES.map((role) => [`${dir}/${role}.stl.b64`, checked[role].b64]),
  ];
  for (let i = 0; i < toSave.length; i++) {
    const [path, content] = toSave[i];
    onProgress(`Saving ${i + 1} of ${toSave.length}…`);
    try {
      await fm.saveText(path, content);
    } catch (e) {
      return fail(`Saving ${path} failed (${e.status ?? 'error'}). The package is not installed.`);
    }
  }

  // 6. Record it in settings.
  const pieces = {};
  for (const role of ROLES) {
    const m = checked[role].measurements;
    pieces[role] = {
      axialLength: round3(m.axialLength),
      baseDiameter: round3(m.baseDiameter),
      sweptDiameter: round3(m.sweptDiameter),
      topDiameter: round3(m.topDiameter),
      profile: checked[role].profile.map(round3),
      side: { top: checked[role].side.top.map(round3), bottom: checked[role].side.bottom.map(round3) },
    };
  }
  const { id, version, name, author, source, license, attribution } = manifest;
  const record = { id, version, name, author, source, license, attribution, dir, installedAt: new Date().toISOString(), pieces };
  try {
    await saveSettings((current) => ({ packages: { ...current.packages, [key]: record }, lastPackage: key }));
  } catch (e) {
    return fail(`The package files were saved, but settings couldn't be updated (${e.status || 'no connection'}). The package is not installed.`);
  }
  onProgress('');
  return { ok: true, key, record };
}

// Keys whose meshes are already in the engine.
const loaded = new Set();

export async function loadPackageMeshes({ fm, call, key, pkg }) {
  if (loaded.has(key)) return;
  const missing = (path) => new Error(`The installed package files are missing (${path}). Re-import the package.`);
  const licensePath = `${pkg.dir}/LICENSE`;
  if ((await fm.readText(licensePath)) === null) throw missing(licensePath);
  const b64 = {};
  for (const role of ROLES) {
    const path = `${pkg.dir}/${role}.stl.b64`;
    const text = await fm.readText(path);
    if (text === null) throw missing(path);
    b64[role] = text;
  }
  await call('loadPackage', { key, b64 });
  loaded.add(key);
}

// Remove an installed set: drop it from settings first, then delete its
// folder. If the set was in use, the first remaining set takes its place.
// Only `PACKAGE_ROOT/<id>@<version>` is ever deleted, never a path read from
// settings. Returns {ok:true, name, warning?} or {ok:false, error}.
const KEY = /^[a-z0-9-]+@\d+\.\d+\.\d+$/;

export async function removePackage({ fm, saveSettings, key }) {
  let record = null;
  try {
    await saveSettings((current) => {
      record = current.packages[key] || null;
      const packages = { ...current.packages };
      delete packages[key];
      const lastPackage = current.lastPackage === key || !(current.lastPackage in packages)
        ? (Object.keys(packages)[0] ?? null)
        : current.lastPackage;
      return { packages, lastPackage };
    });
  } catch (e) {
    return { ok: false, error: `Removing the set failed: settings couldn't be updated (${e.status || 'no connection'}). The set is still installed.` };
  }
  loaded.delete(key);
  const name = record ? `${record.name} ${record.version}` : key;
  if (!KEY.test(key)) return { ok: true, name };
  const dir = `${PACKAGE_ROOT}/${key}`;
  try {
    await fm.deleteFolder(dir);
  } catch (e) {
    return { ok: true, name, warning: `${name} was removed, but deleting its files failed (${e.status || 'no connection'}). They stay in ${dir} and are replaced if you install the set again.` };
  }
  return { ok: true, name };
}
