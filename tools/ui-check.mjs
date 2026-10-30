// Headless check of the dialog against a fresh mock ncSender
// (implementation plan P5.8). Fails on any page error or console error.
// Usage: npm run ui-check [-- --until=import|plan]
//   CSC_CHROME=/path/to/chrome overrides the installed Chrome.
//
// Phase 3 runs steps 1, 1b, 2 (with the bad-package checks) and 8.
// Steps 3–7 (planning) are added in Phase 4, and 9–11 (export) in Phase 5.
import { chromium } from 'playwright-core';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { startMock } from './mock-ncsender.mjs';

const PORT = 8777;
const until = (process.argv.find((a) => a.startsWith('--until=')) || '--until=plan').slice(8);
const PACKAGE = resolve('packages/staunton-clarkerubber');
const BAD = resolve('tests/fixtures/bad-packages');

if (!existsSync('com.infield.chessset/lib/app.js')) {
  console.error('com.infield.chessset/lib/app.js is missing: run npm run build first.');
  process.exit(1);
}

const mock = await startMock({ port: PORT, quiet: true });
const browser = await chromium.launch(process.env.CSC_CHROME ? { executablePath: process.env.CSC_CHROME } : { channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 } });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console error: ${m.text()} ${m.location().url || ''}`.trim()); });

let failed = false;
const step = async (name, fn) => {
  try {
    await fn();
    console.log(`ok    ${name}`);
  } catch (e) {
    failed = true;
    console.log(`FAIL  ${name}\n      ${String(e.message || e).split('\n')[0]}`);
  }
};
const expect = (cond, message) => { if (!cond) throw new Error(message); };
const text = (sel) => page.locator(sel).first().textContent();

async function importFolder(dir) {
  await page.locator('input[data-import]').setInputFiles(dir);
  await page.waitForFunction(() => !document.querySelector('[data-act="import"]')?.disabled, null, { timeout: 60000 });
  await page.waitForFunction(() => document.querySelector('.csc-ok, [data-import-errors]'), null, { timeout: 60000 });
}
const importErrors = () => page.locator('[data-import-errors] li').allTextContents();

try {
  await page.goto(mock.url);

  await step('1. first open shows the machine setup with the defaults', async () => {
    await page.waitForSelector('[data-view="setup"]', { timeout: 15000 });
    expect((await page.inputValue('input[name="maxBlankLength"]')) === '36', 'max blank length is not 36 in');
    expect((await page.inputValue('input[name="jaw0-name"]')) === 'standard', 'jaw 1 is not "standard"');
    expect((await page.inputValue('input[name="jaw1-max"]')) === '2.5', 'jaw 2 max is not 2.5 in');
    expect((await page.locator('[data-section="package"]').count()) === 0, 'planning UI shown before setup is saved');
  });

  await step('1. invalid machine settings cannot be saved', async () => {
    await page.fill('input[name="maxBlankLength"]', '2');
    await page.click('[data-act="save-machine"]');
    await page.waitForSelector('[data-view="setup"] .csc-errors li');
    const store = await (await fetch(mock.url + '__mock/store')).json();
    expect(store.settings === null, 'settings were saved');
    await page.fill('input[name="maxBlankLength"]', '36');
  });

  await step('1. saving the setup shows the dialog', async () => {
    await page.click('[data-act="save-machine"]');
    await page.waitForSelector('[data-section="package"]');
    const store = await (await fetch(mock.url + '__mock/store')).json();
    expect(store.settings.machine.maxBlankLength === 914.4, `stored max ${store.settings.machine.maxBlankLength}`);
    expect(store.settings.machine.jaws.length === 2, 'jaw sets not stored');
  });

  await step('1b. the raw config-ui (no port filled in) starts without errors', async () => {
    const before = problems.length;
    await page.goto(mock.url + '?raw=1');
    await page.waitForSelector('[data-section="package"]', { timeout: 15000 });
    expect(problems.length === before, problems.slice(before).join('; '));
  });

  await step('2. bad packages each give exactly one error (AC-PKG-03)', async () => {
    expect(existsSync(BAD), 'bad packages missing: run npm run fixtures');
    for (const [name, pattern] of [
      ['missing-file', /pieces\.rook\.file/],
      ['schema-2', /schema — must be 1/],
      ['inch-units', /Inch packages are not supported/],
      ['shifted-axis', /pawn\.stl — axis offset — 0\.50 mm \(limit 0\.1 mm\)/],
    ]) {
      await importFolder(resolve(BAD, name));
      const errs = await importErrors();
      expect(errs.length === 1 && pattern.test(errs[0]), `${name}: ${JSON.stringify(errs)}`);
    }
    const store = await (await fetch(mock.url + '__mock/store')).json();
    expect(Object.keys(store.files).length === 0, 'a bad package saved files');
  });

  await step('2. import the prepared package; it shows as installed', async () => {
    await importFolder(PACKAGE);
    expect((await importErrors()).length === 0, JSON.stringify(await importErrors()));
    expect((await text('[data-pkg="name"]')) === 'Staunton (clarkerubber)', 'package name not shown');
    const store = await (await fetch(mock.url + '__mock/store')).json();
    const files = Object.keys(store.files);
    expect(files.length === 8 && files.every((f) => f.startsWith('.chess-set-creator/sets/staunton-clarkerubber@1.0.0/')), files.join(', '));
    const tree = await (await fetch(mock.url + 'api/gcode-files')).json();
    expect(tree.tree.length === 0, 'the stored package is visible in the File Manager tree');
  });

  await step('2. the installed package survives a reopen', async () => {
    await page.click('[data-act="close"]');
    await page.click('#harness-open');
    await page.waitForSelector('[data-pkg="name"]', { timeout: 15000 });
  });

  if (until !== 'import') {
    console.log('skip  3–7 planning steps (Phase 4)');
  }

  await step('8. a <script> package name shows as plain text (AC-SEC-01)', async () => {
    await importFolder(resolve(BAD, 'script-name'));
    expect((await text('[data-pkg="name"]')) === '<script>x</script>', `shown: ${await text('[data-pkg="name"]')}`);
    expect((await page.locator('.csc-shell script').count()) === 0, 'a script element was created');
  });

  await step('12. no forbidden calls in the mock log', async () => {
    const bad = mock.log.filter((l) => l.startsWith('FORBIDDEN'));
    expect(bad.length === 0, bad.join('; '));
  });

  await step('no page errors or console errors', async () => {
    expect(problems.length === 0, problems.join('; '));
  });
} finally {
  await browser.close();
  await mock.close();
}
process.exit(failed ? 1 : 0);
