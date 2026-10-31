// Implementation plan P5.6. A fake fm (fixed tree) and a fake call, both
// recording every call.
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { ExportError, REFUSE_RUNNING, REFUSE_WORKER, defaultJobName, downloadFiles, exportJob, freeFolder, validJobName } from '../src/exporter.js';
import { plan } from '../src/planner.js';
import { DEFAULT_MACHINE, ROLES } from '../src/config.js';
import { APPENDIX_B, DEFAULT_INPUTS } from './helpers/data.js';

const IN = 25.4;
const inputs = { ...DEFAULT_INPUTS, stockLength: 12 * IN, neckEnabled: true, neckDiameter: 7.6 };
const thePlan = plan(inputs, APPENDIX_B, DEFAULT_MACHINE);
let keySeq = 0;

function setup({ tree = [], failOnSave = 0, missing = null } = {}) {
  const key = `pkg@0.0.${++keySeq}`; // a fresh key, so meshes are read each time
  const pkg = { id: 'staunton-clarkerubber', version: '0.1.0', name: 'Staunton (clarkerubber)', author: 'a', source: 's', license: 'MIT', attribution: 'Copyright (c) 2014 clarkerubber', dir: '.chess-set-creator/sets/x' };
  const log = [];
  let saves = 0;
  const fm = {
    async tree() { log.push('GET /api/gcode-files'); return { tree }; },
    async readText(path) {
      log.push(`read ${path}`);
      if (missing && path.endsWith(missing)) return null;
      return path.endsWith('LICENSE') ? 'MIT licence text' : 'b64';
    },
    async saveText(path) {
      saves++;
      log.push(`save ${path}`);
      if (saves === failOnSave) throw Object.assign(new Error('x'), { status: 500, body: 'disk full' });
    },
  };
  const call = async (type, args) => {
    log.push(`call ${type}${args.name ? ` ${args.name}` : ''}`);
    return type === 'buildBlankText' ? `solid ${args.name}\nendsolid ${args.name}\n` : true;
  };
  const opts = { fm, call, plan: thePlan, pkg, key, inputs, jobName: 'job', pluginVersion: '0.1.0', jobRunning: false, workerAvailable: true, createdAt: 't' };
  return { log, opts, saves: () => log.filter((l) => l.startsWith('save ')).map((l) => l.slice(5)) };
}

const expectedFiles = (folder) => {
  const names = ['LICENSE-models.txt'];
  for (const side of ['light', 'dark']) for (let i = 1; i <= 5; i++) names.push(`${side}_blank_0${i}.stl`, `${side}_blank_0${i}.rotary.json`);
  names.push('layout.json');
  return names.map((n) => `chess set/${folder}/${n}`);
};

test('order: LICENSE and mesh reads first, then LICENSE-models.txt, STL + sidecar per blank (light first), layout.json last', async () => {
  const { log, opts, saves } = setup();
  const result = await exportJob(opts);
  assert.equal(result.folder, 'job');
  assert.deepEqual(saves(), expectedFiles('job'));
  const firstSave = log.findIndex((l) => l.startsWith('save '));
  const reads = log.slice(0, firstSave).filter((l) => l.startsWith('read '));
  assert.equal(reads.length, 1 + ROLES.length + 1); // LICENSE check, six meshes, LICENSE text
  assert.ok(log.indexOf('call loadPackage') < firstSave);
});

test('free folder: with "job" present the export goes to "job (2)"', async () => {
  const tree = [{ type: 'folder', name: 'chess set', children: [{ type: 'folder', name: 'job' }] }];
  const { opts, saves } = setup({ tree });
  assert.equal((await exportJob(opts)).folder, 'job (2)');
  assert.ok(saves().every((p) => p.startsWith('chess set/job (2)/')));
  assert.equal(freeFolder({ tree }, 'other'), 'other');
});

test('failure: save number 3 fails → ExportError, no further saves, no layout.json', async () => {
  const { opts, saves } = setup({ failOnSave: 3 });
  await assert.rejects(exportJob(opts), (e) => e instanceof ExportError && e.status === 500 && e.path === 'chess set/job/light_blank_01.rotary.json');
  assert.equal(saves().length, 3);
  assert.ok(!saves().some((p) => p.endsWith('layout.json')));
});

test('missing meshes: a null .b64 read gives the re-import error and nothing is saved', async () => {
  const { opts, saves } = setup({ missing: 'queen.stl.b64' });
  await assert.rejects(exportJob(opts), /The installed package files are missing \(.*queen\.stl\.b64\)\. Re-import the package\./);
  assert.deepEqual(saves(), []);
});

test('job names: ../x, a/b and .hidden are rejected; "Q38.1 (test)" is accepted', async () => {
  for (const bad of ['../x', 'a/b', '.hidden', 'a\\b', '']) assert.equal(validJobName(bad), 'Job name may use letters, digits, space and . _ - ( ) only.');
  assert.equal(validJobName('Q38.1 (test)'), null);
  const { opts, saves } = setup();
  await assert.rejects(exportJob({ ...opts, jobName: '../x' }), /Job name may use/);
  assert.deepEqual(saves(), []);
});

test('default name at queen base 40 is "staunton-clarkerubber Q40 457x51"', () => {
  assert.equal(defaultJobName({ id: 'staunton-clarkerubber' }, { ...DEFAULT_INPUTS, queenBase: 40 }), 'staunton-clarkerubber Q40 457x51');
  assert.equal(defaultJobName({ id: 'staunton-clarkerubber' }, { ...DEFAULT_INPUTS, stockLength: 304.8 }), 'staunton-clarkerubber Q38.1 305x51');
});

test('Download files: same names and order, nothing built until a link is used', async () => {
  const { log, opts } = setup();
  const list = await downloadFiles(opts);
  assert.deepEqual(list.map((f) => `chess set/job/${f.name}`), expectedFiles('job'));
  assert.ok(!log.some((l) => l.startsWith('call buildBlankText') || l.startsWith('save ')));
  const one = await list[1].download();
  assert.equal(one.name, 'light_blank_01.stl');
  assert.match(one.text, /^solid light_blank_01/);
  assert.equal(log.filter((l) => l.startsWith('call buildBlankText')).length, 1);
});

test('refusals: a running job or no Worker refuses export and Download files, saving nothing', async () => {
  for (const [change, message] of [[{ jobRunning: true }, REFUSE_RUNNING], [{ workerAvailable: false }, REFUSE_WORKER]]) {
    const { opts, saves, log } = setup();
    await assert.rejects(exportJob({ ...opts, ...change }), { message });
    await assert.rejects(downloadFiles({ ...opts, ...change }), { message });
    assert.deepEqual(saves(), []);
    assert.deepEqual(log, []);
  }
});

test('no forbidden calls: nothing touches load*, gcode-job or send-command', async () => {
  const { log, opts } = setup();
  await exportJob(opts);
  assert.ok(!log.some((l) => /load\b|load-|gcode-job|send-command/.test(l.replace('call loadPackage', ''))));
});
