// Export to the File Manager, and Download files (implementation plan
// P4.9; spec §5.8). Never calls /api/gcode-files/load*, /api/gcode-job or
// /api/send-command.
import { EXPORT_ROOT, MAX_COPIES } from './config.js';
import { buildLayout, blankFile, sidesOf } from './layout.js';
import { loadPackageMeshes } from './package.js';
import { buildSidecar } from './sidecar.js';
import { roundHalfUp } from './units.js';

export const REFUSE_RUNNING = 'Export is unavailable while a job is running.';
export const REFUSE_WORKER = 'Export needs a background worker, which this browser blocked.';
export const JOB_NAME_RULE = 'Job name may use letters, digits, space and . _ - ( ) only.';

export class ExportError extends Error {
  constructor({ path, status, body }) {
    super(`Saving ${path} failed: ${status || 'no connection'} ${body || ''}`.trim());
    this.path = path;
    this.status = status;
    this.body = body;
  }
}

// "<package id> Q<base> <length>x<width>", e.g. "staunton-clarkerubber Q38.1 457x51".
export function defaultJobName(pkg, inputs) {
  const base = String(roundHalfUp(inputs.queenBase, 1)).replace(/\.0$/, '');
  return `${pkg.id} Q${base} ${roundHalfUp(inputs.stockLength, 0)}x${roundHalfUp(inputs.stockWidth, 0)}`;
}

// null when allowed, otherwise the error message.
export function validJobName(name) {
  const ok = typeof name === 'string' && /^[A-Za-z0-9 ._()-]+$/.test(name) && !name.startsWith('.') && !name.includes('..');
  return ok ? null : JOB_NAME_RULE;
}

// D3: the first of name, "name (2)", … that isn't a folder directly under
// "chess set" in one File Manager listing.
export function freeFolder(tree, name) {
  const root = (tree?.tree || []).find((e) => e.type === 'folder' && e.name === EXPORT_ROOT);
  const taken = new Set((root?.children || []).filter((e) => e.type === 'folder').map((e) => e.name));
  for (let n = 1; n <= MAX_COPIES; n++) {
    const candidate = n === 1 ? name : `${name} (${n})`;
    if (!taken.has(candidate)) return candidate;
  }
  throw new Error(`Too many copies of ${name}; rename the job.`);
}

export function refusal({ jobRunning, workerAvailable }) {
  if (jobRunning) return REFUSE_RUNNING;
  if (!workerAvailable) return REFUSE_WORKER;
  return null;
}

// LICENSE-models.txt: the package licence with its attribution.
function licenseModels(pkg, licenseText) {
  return `Chess-piece models: ${pkg.name} ${pkg.version}\n${pkg.attribution}\nLicence: ${pkg.license}\nSource: ${pkg.source}\n\n${licenseText}`;
}

// Every file of the job in the D4 order, each with a build() returning its
// text. Nothing is built until build() is called.
function jobFiles({ call, plan, pkg, key, inputs, folder, pluginVersion, licenseText, createdAt }) {
  const neck = inputs.neckEnabled === true ? inputs.neckDiameter : undefined;
  const files = [{ name: 'LICENSE-models.txt', build: async () => licenseModels(pkg, licenseText) }];
  for (const side of sidesOf(inputs.sides)) {
    for (const blank of plan.blanks) {
      const file = blankFile(side, blank.index);
      const solid = file.replace(/\.stl$/, '');
      files.push({ name: file, build: () => call('buildBlankText', { key, blank, scale: plan.scale, neck, name: solid }) });
      files.push({
        name: `${solid}.rotary.json`,
        build: async () => `${JSON.stringify(buildSidecar({ blank, file, inputs, jawSet: plan.jawSet, pluginVersion, folder }), null, 2)}\n`,
      });
    }
  }
  files.push({ name: 'layout.json', build: async () => `${JSON.stringify(buildLayout({ pluginVersion, pkg, inputs, plan, createdAt }), null, 2)}\n` });
  return files;
}

async function prepare({ fm, call, pkg, key, jobRunning, workerAvailable, jobName }) {
  const refused = refusal({ jobRunning, workerAvailable });
  if (refused) throw new Error(refused);
  const nameError = validJobName(jobName);
  if (nameError) throw new Error(nameError);
  await loadPackageMeshes({ fm, call, key, pkg });
  const licenseText = await fm.readText(`${pkg.dir}/LICENSE`);
  if (licenseText === null) throw new Error(`The installed package files are missing (${pkg.dir}/LICENSE). Re-import the package.`);
  return licenseText;
}

// Writes chess set/<free folder>/ in the D4 order, layout.json last.
// Returns {folder, files}. A failed save throws ExportError.
export async function exportJob({ fm, call, plan, pkg, key, inputs, jobName, pluginVersion, jobRunning, workerAvailable, createdAt = new Date().toISOString(), onProgress = () => {} }) {
  const licenseText = await prepare({ fm, call, pkg, key, jobRunning, workerAvailable, jobName });
  const folder = freeFolder(await fm.tree(), jobName);
  const files = jobFiles({ call, plan, pkg, key, inputs, folder, pluginVersion, licenseText, createdAt });
  const written = [];
  for (let i = 0; i < files.length; i++) {
    const path = `${EXPORT_ROOT}/${folder}/${files[i].name}`;
    onProgress(`Saving ${i + 1} of ${files.length}: ${files[i].name}`);
    let text = await files[i].build();
    try {
      await fm.saveText(path, text);
    } catch (e) {
      throw new ExportError({ path, status: e.status, body: e.body });
    }
    text = null; // release the blank's text before building the next one
    written.push(files[i].name);
  }
  return { folder, files: written };
}

// Download files: the same files, in the same order, as {name, download()}.
// download() builds that one file and returns {name, text}.
export async function downloadFiles({ fm, call, plan, pkg, key, inputs, jobName, pluginVersion, jobRunning, workerAvailable, createdAt = new Date().toISOString() }) {
  const licenseText = await prepare({ fm, call, pkg, key, jobRunning, workerAvailable, jobName });
  return jobFiles({ call, plan, pkg, key, inputs, folder: jobName, pluginVersion, licenseText, createdAt }).map((f) => ({
    name: f.name,
    download: async () => ({ name: f.name, text: await f.build() }),
  }));
}
