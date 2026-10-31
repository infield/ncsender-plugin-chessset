// Headless check of the dialog against a fresh mock ncSender
// (implementation plan P5.8). Fails on any page error or console error.
// Usage: npm run ui-check [-- --until=import|plan]
//   CSC_CHROME=/path/to/chrome overrides the installed Chrome.
//
// Runs steps 1–12, with extra checks for bad packages, stale styles, jaw
// sets, a real download and the running-job refusal.
// --until=import stops after the import steps; --until=plan skips export.
import { chromium } from 'playwright-core';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { startMock } from './mock-ncsender.mjs';

const PORT = 8777;
const until = (process.argv.find((a) => a.startsWith('--until=')) || '--until=all').slice(8);
const PACKAGE = resolve('packages/staunton-clarkerubber');
const BAD = resolve('tests/fixtures/bad-packages');

if (!existsSync('com.infield.chessset/lib/app.js')) {
  console.error('com.infield.chessset/lib/app.js is missing: run npm run build first.');
  process.exit(1);
}

// ncSender set to imperial at the start; step 4 switches it to metric.
const mock = await startMock({ port: PORT, quiet: true, units: 'imperial' });
const browser = await chromium.launch(process.env.CSC_CHROME ? { executablePath: process.env.CSC_CHROME } : { channel: 'chrome' });
const page = await browser.newPage({ viewport: { width: 1400, height: 950 }, acceptDownloads: true });
const problems = [];
page.on('pageerror', (e) => problems.push(`pageerror: ${e.message}`));
page.on('console', (m) => { if (m.type() === 'error') problems.push(`console error: ${m.text()} ${m.location().url || ''}`.trim()); });

// The chess-set library on GitHub, served from this repository: the index
// from tests/fixtures/library.json, set files from packages/<id>/.
let libraryOnline = true;
await page.route('https://raw.githubusercontent.com/**', (route) => {
  if (!libraryOnline) return route.abort('internetdisconnected');
  const url = new URL(route.request().url());
  if (url.pathname === '/infield/chessset-library/main/library.json') {
    return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: readFileSync('tests/fixtures/library.json') });
  }
  const m = url.pathname.match(/^\/infield\/chessset-library\/[^/]+\/sets\/([a-z0-9-]+)\/(.+)$/);
  const file = m && resolve('packages', m[1], decodeURIComponent(m[2]));
  if (file && existsSync(file)) return route.fulfill({ status: 200, headers: { 'access-control-allow-origin': '*' }, body: readFileSync(file) });
  return route.fulfill({ status: 404, body: 'not found' });
});

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

  await step('2a. library offline: Browse library says so and suggests a folder import', async () => {
    libraryOnline = false;
    await page.click('[data-act="browse"]');
    await page.waitForSelector('[data-library-error]');
    expect(/Can't reach the chess-set library .*import a package folder instead/.test(await text('[data-library-error]')), await text('[data-library-error]'));
    libraryOnline = true;
    // The aborted request is logged as a console error; that one is expected.
    for (let i = problems.length - 1; i >= 0; i--) if (/ERR_INTERNET_DISCONNECTED|Failed to load resource/.test(problems[i])) problems.splice(i, 1);
  });

  await step('2b. install Staunton from the library', async () => {
    await page.click('[data-act="browse"]');
    await page.waitForSelector('[data-lib-set="staunton-clarkerubber"] [data-install]');
    await page.click('[data-lib-set="staunton-clarkerubber"] [data-install]');
    await page.waitForSelector('[data-lib-set="staunton-clarkerubber"] [data-use-set]', { timeout: 60000 });
    expect((await text('[data-lib-set="staunton-clarkerubber"] [data-use-set]')) === 'In use', 'not shown as in use');
    expect((await text('[data-pkg="name"]')) === 'Staunton (clarkerubber)', 'package name not shown');
    const files = Object.keys((await (await fetch(mock.url + '__mock/store')).json()).files);
    expect(files.length === 8, files.join(', '));
  });

  await step('2. import the prepared package; it shows as installed', async () => {
    await importFolder(PACKAGE);
    expect((await importErrors()).length === 0, JSON.stringify(await importErrors()));
    expect((await text('[data-pkg="name"]')) === 'Staunton (clarkerubber)', 'package name not shown');
    const store = await (await fetch(mock.url + '__mock/store')).json();
    const files = Object.keys(store.files);
    expect(files.length === 8 && files.every((f) => f.startsWith('.chess-set-creator/sets/staunton-clarkerubber@0.1.0/')), files.join(', '));
    const tree = await (await fetch(mock.url + 'api/gcode-files')).json();
    expect(tree.tree.length === 0, 'the stored package is visible in the File Manager tree');
  });

  await step('2. the installed package survives a reopen', async () => {
    await page.click('[data-act="close"]');
    await page.click('#harness-open');
    await page.waitForSelector('[data-pkg="name"]', { timeout: 15000 });
  });

  if (until !== 'import') {
    const cards = () => page.locator('[data-blank]');
    const lists = () => page.locator('[data-blank] .csc-pieces').allTextContents();
    const planErrors = (code) => page.locator(`[data-plan-errors] li[data-code="${code}"]`);
    let before;

    await step('3. stock length 12 in gives 5 blank cards', async () => {
      await page.fill('input[name="stockLength"]', '12');
      await page.waitForFunction(() => document.querySelectorAll('[data-blank]').length === 5, null, { timeout: 5000 });
      before = await lists();
      expect(before[0] === 'Chuck → King · Queen · Pawn → tailstock', `blank 1: ${before[0]}`);
      expect((await text('[data-blank="1"] h3')) === 'Blank 1 · per side × 2', 'card title');
      expect((await text('[data-summary]')).includes('Light 5, Dark 5'), 'light/dark counts not shown');
    });

    await step('3b. previews are styled, also after an update without a page reload', async () => {
      const fill = () => page.$eval('[data-blank="1"] .csc-pv-stock', (e) => getComputedStyle(e).fill);
      expect((await fill()) !== 'rgb(0, 0, 0)', 'preview stock is unstyled (black)');
      // Simulate the previous build's stylesheet left in the page.
      await page.evaluate(() => { const s = document.getElementById('csc-style'); s.dataset.build = 'old'; s.textContent = ''; });
      // Unstyled, the dialog is taller than the window; click Close in the page.
      await page.$eval('[data-act="close"]', (b) => b.click());
      await page.waitForSelector('.csc-shell', { state: 'detached' });
      await page.click('#harness-open');
      await page.waitForSelector('[data-blank="1"]', { timeout: 15000 });
      expect((await fill()) !== 'rgb(0, 0, 0)', 'stale stylesheet was not replaced');
    });

    await step('4. ncSender switched to metric: mm first, inches below, gap 10, plan unchanged', async () => {
      await page.evaluate(() => window.setHostUnits('metric'));
      await page.waitForFunction(() => document.querySelector('input[name="gap"]')?.value === '10', null, { timeout: 5000 });
      const stock = await page.locator('[data-blank="1"] [data-stock]').innerText();
      expect(stock.replace(/\s+/g, ' ') === '304.8 mm × 50.8 mm square 12.00 in × 2.00 in', `stock: ${JSON.stringify(stock)}`);
      expect((await page.inputValue('input[name="gap"]')) === '10', `gap field: ${await page.inputValue('input[name="gap"]')}`);
      expect((await page.inputValue('input[name="stockLength"]')) === '304.8', 'stock length field not 304.8');
      expect(JSON.stringify(await lists()) === JSON.stringify(before), 'plan changed on unit toggle');
    });

    await step('5. width 38.1 mm lists 5 pieces in the error box (AC-FIT-01)', async () => {
      await page.fill('input[name="stockWidth"]', '38.1');
      expect((await planErrors('TOO_WIDE').count()) === 5, `TOO_WIDE count ${await planErrors('TOO_WIDE').count()}`);
      expect((await cards().count()) === 0, 'blank cards shown despite errors');
      await page.fill('input[name="stockWidth"]', '50.8');
      expect((await cards().count()) === 5, 'plan not back after width reset');
    });

    await step('5b. editing a jaw set changes accepted widths (AC-IN-04)', async () => {
      await page.click('[data-section="machine"] summary');
      await page.fill('[data-section="machine"] input[name="jaw1-max"]', '49');
      await page.click('[data-section="machine"] [data-act="save-machine"]');
      await page.waitForSelector('[data-plan-errors] li[data-code="JAW"]', { timeout: 5000 });
      await page.fill('[data-section="machine"] input[name="jaw1-max"]', '63.5');
      await page.click('[data-section="machine"] [data-act="save-machine"]');
      await page.waitForFunction(() => document.querySelectorAll('[data-blank]').length === 5, null, { timeout: 5000 });
    });

    await step('6. gap 5 shows a RANGE message', async () => {
      await page.fill('input[name="gap"]', '5');
      expect((await planErrors('RANGE').count()) === 1, 'no RANGE error');
      const hint = await page.locator('input[name="gap"] ~ .csc-hint').textContent();
      expect(hint === 'Gap must be between 6.35 and 50 mm.', `hint: ${hint}`);
      await page.fill('input[name="gap"]', '10');
      expect((await cards().count()) === 5, 'plan not back after gap reset');
    });

    await step('7. closing right after an edit keeps it; reopen restores the inputs', async () => {
      await page.fill('input[name="queenBase"]', '40');
      await page.click('[data-act="close"]');
      await page.waitForSelector('.csc-shell', { state: 'detached' });
      await page.click('#harness-open');
      await page.waitForSelector('[data-blank="1"]', { timeout: 15000 });
      expect((await page.inputValue('input[name="queenBase"]')) === '40', `queen base: ${await page.inputValue('input[name="queenBase"]')}`);
      expect((await page.inputValue('input[name="stockLength"]')) === '304.8', 'stock length not restored');
      expect((await page.inputValue('input[name="gap"]')) === '10', 'not shown in mm after reopen');
      expect((await cards().count()) === 5, 'queen base 40 on 12 in should give 5 blanks');
      const { settings } = await (await fetch(mock.url + '__mock/store')).json();
      expect(settings.lastInputs.queenBase === 40 && settings.lastInputs.stockLength === 304.8, `stored inputs not in mm: ${JSON.stringify(settings.lastInputs)}`);
    });
  }

  await step('8. a <script> package name shows as plain text (AC-SEC-01)', async () => {
    await importFolder(resolve(BAD, 'script-name'));
    expect((await text('[data-pkg="name"]')) === '<script>x</script>', `shown: ${await text('[data-pkg="name"]')}`);
    expect((await page.locator('.csc-shell script').count()) === 0, 'a script element was created');
  });

  await step('8b. two sets installed: switch back to Staunton', async () => {
    await page.click('[data-use-set="staunton-clarkerubber@0.1.0"]');
    await page.waitForFunction(() => document.querySelector('[data-pkg="name"]')?.textContent === 'Staunton (clarkerubber)');
    let last;
    for (let i = 0; i < 50 && last !== 'staunton-clarkerubber@0.1.0'; i++) {
      last = (await (await fetch(mock.url + '__mock/store')).json()).settings.lastPackage;
      if (last !== 'staunton-clarkerubber@0.1.0') await page.waitForTimeout(100);
    }
    expect(last === 'staunton-clarkerubber@0.1.0', `stored lastPackage ${last}`);
  });

  const storeNow = async () => (await (await fetch(mock.url + '__mock/store')).json());
  const waitStored = async (cond, what) => {
    for (let i = 0; i < 50; i++) {
      if (cond(await storeNow())) return;
      await page.waitForTimeout(100);
    }
    throw new Error(`not stored: ${what}`);
  };

  await step('8c. remove a set that is not in use: Cancel keeps it, Remove deletes its folder', async () => {
    const other = 'staunton-clarkerubber@9.9.9';
    await page.click(`[data-remove-set="${other}"]`);
    await page.waitForSelector(`[data-confirm-remove="${other}"]`);
    await page.click('[data-act="cancel-remove"]');
    await page.waitForSelector('[data-confirm-remove]', { state: 'detached' });
    expect(Object.keys((await storeNow()).files).some((f) => f.includes(`/${other}/`)), 'Cancel deleted files');
    await page.click(`[data-remove-set="${other}"]`);
    await page.click('[data-act="confirm-remove"]');
    await page.waitForSelector('[data-section="package"] .csc-ok');
    expect((await text('[data-section="package"] .csc-ok')) === 'Removed <script>x</script> 9.9.9.', await text('[data-section="package"] .csc-ok'));
    await waitStored((st) => !st.settings.packages[other] && st.settings.lastPackage === 'staunton-clarkerubber@0.1.0', 'settings without 9.9.9');
    const files = Object.keys((await storeNow()).files);
    expect(!files.some((f) => f.includes(`/${other}/`)), `9.9.9 files left: ${files.join(', ')}`);
    expect(files.filter((f) => f.includes('/staunton-clarkerubber@0.1.0/')).length === 8, 'Staunton files touched');
    expect((await text('[data-pkg="name"]')) === 'Staunton (clarkerubber)', 'Staunton no longer in use');
    expect((await page.locator('[data-use-set]').count()) === 0, 'set switcher still shown with one set');
  });

  if (until !== 'import' && until !== 'plan') {
    const store = async () => (await (await fetch(mock.url + '__mock/store')).json()).files;
    const inFolder = (files, folder) => Object.keys(files).filter((f) => f.startsWith(`chess set/${folder}/`)).map((f) => f.slice(`chess set/${folder}/`.length));
    const waitExport = async () => {
      await page.waitForFunction(() => !document.querySelector('[data-act="export"]')?.disabled || document.querySelector('[data-export-error]'), null, { timeout: 180000 });
    };
    let folder;

    await step('9. export writes 10 STLs, 10 sidecars, layout.json and LICENSE-models.txt', async () => {
      folder = await page.inputValue('input[name="jobName"]');
      await page.click('[data-act="export"]');
      await waitExport();
      const names = inFolder(await store(), folder);
      const stl = names.filter((n) => n.endsWith('.stl'));
      const side = names.filter((n) => n.endsWith('.rotary.json'));
      expect(stl.length === 10 && side.length === 10, `${stl.length} STLs, ${side.length} sidecars in "${folder}"`);
      expect(names.includes('layout.json') && names.includes('LICENSE-models.txt'), names.join(', '));
      expect((await text('[data-export-status]')).startsWith('Exported 22 files'), await text('[data-export-status]'));
    });

    await step('10. exporting again uses the "(2)" folder', async () => {
      await page.click('[data-act="export"]');
      await waitExport();
      expect(inFolder(await store(), `${folder} (2)`).length === 22, 'no (2) folder with 22 files');
    });

    await step('11. a forced save failure offers Download files; no layout.json in that folder', async () => {
      await fetch(mock.url + '__mock/fail-save', { method: 'POST', body: JSON.stringify({ after: 3 }) });
      await page.click('[data-act="export"]');
      await page.waitForSelector('[data-export-error]', { timeout: 180000 });
      await page.waitForSelector('[data-download-list] [data-file="light_blank_01.stl"]');
      expect(!inFolder(await store(), `${folder} (3)`).includes('layout.json'), 'incomplete folder has layout.json');
      // The browser logs the forced 500 as a console error; that one is expected.
      const forced = problems.filter((p) => /500 .*\/api\/gcode-files\/file\/save/.test(p));
      expect(forced.length === 1, `expected one forced-failure log, got ${forced.length}`);
      problems.splice(problems.indexOf(forced[0]), 1);
    });

    await step('11b. a Download files link downloads one blank STL', async () => {
      const [download] = await Promise.all([page.waitForEvent('download', { timeout: 60000 }), page.click('[data-download-list] [data-file="light_blank_01.stl"]')]);
      expect(download.suggestedFilename() === 'light_blank_01.stl', download.suggestedFilename());
      const head = (await (await import('node:fs/promises')).readFile(await download.path(), 'utf8')).slice(0, 30);
      expect(head.startsWith('solid light_blank_01'), head);
    });

    await step('11c. while a job runs, export and Download files are disabled with the §5.10 message', async () => {
      await page.evaluate(() => window.postMessage({ type: 'server-state-update', state: { jobLoaded: { status: 'running' } } }, '*'));
      await page.waitForSelector('[data-export-blocked]');
      expect((await text('[data-export-blocked]')) === 'Export is unavailable while a job is running.', await text('[data-export-blocked]'));
      expect(await page.locator('[data-act="export"]').isDisabled(), 'export enabled during a job');
      expect(await page.locator('[data-act="download"]').isDisabled(), 'download enabled during a job');
      await page.evaluate(() => window.postMessage({ type: 'server-state-update', state: { jobLoaded: { status: 'idle' } } }, '*'));
      await page.waitForSelector('[data-export-blocked]', { state: 'detached' });
    });
  }

  await step('12b. removing the last set, the one in use, leaves no set installed', async () => {
    await page.click('[data-remove-set="staunton-clarkerubber@0.1.0"]');
    await page.click('[data-act="confirm-remove"]');
    await page.waitForSelector('[data-section="package"] .csc-ok');
    expect((await text('[data-section="package"] .csc-ok')) === 'Removed Staunton (clarkerubber) 0.1.0.', await text('[data-section="package"] .csc-ok'));
    expect((await page.locator('[data-pkg="name"]').count()) === 0, 'a set is still shown');
    expect((await page.locator('[data-blank]').count()) === 0, 'blank cards shown with no set');
    await waitStored((st) => Object.keys(st.settings.packages).length === 0 && st.settings.lastPackage === null, 'no packages, lastPackage null');
    const left = Object.keys((await storeNow()).files).filter((f) => f.startsWith('.chess-set-creator/'));
    expect(left.length === 0, left.join(', '));
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
