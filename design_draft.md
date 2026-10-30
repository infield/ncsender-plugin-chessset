<!-- Copy of the plan merged into Chess_Set_Creator.md Revision 6. Edit the spec, not this file. -->

## Detailed Implementation Plan

**Status:** approved by the owner on 2026-10-30, except D11 (licence), which is pending the owner. Revised the same day after the Stage 9 review (`implementation_readiness_report.md`, resolved in `goldfish_review_report.md`).

**Numbering:** plan sections are numbered P1–P6 so they stay apart from the spec's § numbers. A bare § always refers to the spec.

**Units:** every length inside the code is in millimetres. Inches exist only at the input and display edge (`src/units.js`).

### P1. Decisions fixed by this plan

This table fixes every implementation decision except four:
- **D5, D6 and `FM_HANDOFF`** are set from the Phase 0 results.
- **D11** waits for the owner.

| # | Decision | Value | Reason |
|---|---|---|---|
| D1 | Source of piece dimensions for planning | **Measured** values, taken at import and stored in settings. Declared manifest values are used only for import check 4. | Per §5.2 and §6. |
| D2 | Worker | See detail 1. | Same pattern as ncCAM `src/index.js:8–66`. Needs no separate `lib/worker.js` and no cross-origin worker URL. |
| D3 | Free-folder check | Probe `GET /api/gcode-files/file?path=<encoded "chess set/<folder>/LICENSE-models.txt">`. A 404 means the folder is free. | Same probe as ncCAM `app.js:854–862`. The tree route's response shape is unverified; this check does not depend on it. |
| D4 | Export write order | `LICENSE-models.txt` → maple blanks → walnut blanks → `layout.json`. | D3 needs the licence file first; §5.8 needs `layout.json` last. |
| D5 | Support mode | Constant `SUPPORT_MODE` in `src/config.js`: `'necks'` (outcome B) or `'cam'` (outcome A). Set from Phase 0. Default `'necks'`. | O-2 has two outcomes. Both code paths are built; the constant selects one. |
| D6 | Package storage root | Constant `PACKAGE_ROOT`: `.chess-set-creator/sets` if Phase 0 shows the tree hides dot-folders, else `Chess Set Creator/sets`. A second constant, `STORE_SUFFIX`, is `''`, or `'.txt'` if Phase 0 step 6 fails. | Per §5.7. |
| D7 | Lengths in the planner | Integer micrometres (`Math.round(mm × 1000)`). | Equal-length pieces (bishop and knight) must compare exactly equal. |
| D8 | Display rounding | `roundHalfUp(x, d) = sign(x) × floor(abs(x) × 10^d + 0.5 + 1e-9) / 10^d`. Minimum sizes use `ceilTo(x, d) = ceil(x × 10^d − 1e-9) / 10^d`. mm shows 1 decimal; inches show 2. | Per §5.4 ("rounded half up"). The `1e-9` terms absorb floating-point noise. |
| D9 | Dependencies | `devDependencies`, as ncCAM lists its bundled libraries: `esbuild ^0.28.2`, `playwright-core ^1.64.1`, `fflate ^0.8.2`. STL parsing and writing are our own code. | §6 and §7 reject three.js and mesh kernels. ncCAM's `src/core/mesh.js` works on indexed meshes, has no STL I/O, and returns an unsigned volume, so it cannot be reused here. |
| D10 | Tests | `node --test tests/*.test.js`. | Same as ncCAM `package.json`. |
| D11 | Plugin licence | **GPL-3.0, pending owner.** | Matches AAxis and ncCAM. If the owner picks another licence, change this row, `com.infield.chessset/LICENSE` and `package.json`. |
| D12 | Versioning | Start at `0.1.0`. Every `build.sh` run bumps the patch number and needs a CHANGELOG entry. Move to `0.2.0` once a 12 in blank has been cut end to end. | AAxis `CLAUDE.md` item 5. |
| D13 | Host version floor | `minAppVersion "2.0.88"`, `platforms {"v2":"2.0.88","pro-v2":"2.0.149"}`. No `repository` field in v1, so there is no update check. | These are ncCAM's values. ncCAM is the only reference plugin that uses the `gcode-files` routes. The shop runs v2.0.271. |

**Detail 1, the Worker (D2).** The same bundle `lib/app.js` runs in two places.

- **Inside a Worker** (`typeof document === 'undefined'`):
  - `self.onmessage` dispatches `{id, type, ...args}` to the handlers in `src/worker.js`.
  - It replies `{id, ok:true, result}` or `{id, ok:false, error}`.
  - Results that hold `ArrayBuffer`s are transferred.
- **In the page:**
  - `window.ChessSet = {build, mount}`.
  - `mount` loads the UI with a dynamic `import('./ui/app.js')`. No UI module is evaluated inside the Worker.
  - The engine is created once and cached: `ChessSet.engine ||= startEngine()`.
- **`startEngine`:**
  1. Creates `new Worker(URL.createObjectURL(new Blob([ChessSet.source], {type:'text/javascript'})))`.
  2. Races `call('ping')` against a 5 s timeout.
  3. On timeout or a thrown error, calls `terminate()` and runs the same handlers in the page.
- **The Worker never fetches.** The page reads every file and posts its content.

### P2. Files

All paths are relative to `Chess-Set-Creator/`. **N** = new, **M** = modified. No existing file is deleted.

| File | | What and why |
|---|---|---|
| `.gitignore` | N | `node_modules/`, `*.zip`, `.mock-store.json`, `.DS_Store`. |
| `package.json` | N | `"type":"module"`, `private:true`, `license` per D11. Scripts: `build` (`node build.mjs`), `test` (`node --test tests/*.test.js`), `fixtures` (`node tools/make-fixtures.mjs`), `prepare-package` (`node tools/prepare-package.mjs`), `mock` (`node tools/mock-ncsender.mjs`), `ui-check` (`node tools/ui-check.mjs`). `devDependencies` per D9. |
| `build.mjs` | N | Reads `version` from `com.infield.chessset/manifest.json`; `tag = version + '-' + Date.now().toString(36)`. Runs esbuild with `{entryPoints:['src/index.js'], bundle:true, format:'iife', platform:'browser', target:['chrome110'], minify:true, legalComments:'eof', define:{__BUILD__: JSON.stringify(tag)}, outfile:'com.infield.chessset/lib/app.js'}`. Then replaces `/var BUILD = '[^']*';/` in `com.infield.chessset/config.html`. Prints the bundle size. |
| `build.sh` | N | Adapted from AAxis `build.sh`. Order: bump the patch number in `com.infield.chessset/manifest.json` → `node build.mjs` → `zip -qr com.infield.chessset-<v>.zip com.infield.chessset -x '*.DS_Store'` (old ZIPs are deleted first). Prints the CHANGELOG reminder. |
| `com.infield.chessset/manifest.json` | N | `id`, `name:"Chess Set Creator"`, `version`, `minAppVersion` and `platforms` per D13, `author:"Marc Infield"`, `description`, `configUi:"config.html"`, `icon:"icon.svg"`, `category:"utility"`, `events:[]`, `permissions:["gcode.modify"]`, `toolMenu:[{id:"chess-set-creator",label:"Chess Set Creator",icon:"icon.svg",clientOnly:true}]`. No `entry` field (there is no server module) and no `repository` field (D13). |
| `com.infield.chessset/config.html` | N | The dialog shell: a root `<div class="csc-shell">` and the loader script. The loader follows ncCAM `config.html:244–265`, with one deliberate change: the port placeholder is quoted, as AAxis does it (`config.html:97–101`): `var RAW_PORT = '__SERVER_PORT__'; var PORT = /^\d+$/.test(RAW_PORT) ? parseInt(RAW_PORT, 10) : 8090;`. This lets it run when Settings → Plugins serves the file unreplaced. Then: `base = ncSender.getApiBaseUrl(PORT)` if present, else `''`. `file(name)` = `base + '/api/plugins/com.infield.chessset/icon?file=' + encodeURIComponent(name)`. It fetches `lib/app.js` unless `window.ChessSet.build === BUILD`, injects the script, stores the code in `ChessSet.source`, and calls `ChessSet.mount(root, {base, file})`. A load error is shown with `textContent`. `__INITIAL_CONFIG__` is not used; settings come from the GET in `settings.js`. |
| `com.infield.chessset/lib/app.js` | N (built) | Output of `build.mjs`. Included in the ZIP; never edited by hand. |
| `com.infield.chessset/icon.svg` | N | A 24×24 single-path pawn silhouette with `fill="currentColor"`. |
| `com.infield.chessset/README.md` | N | What the plugin does, how to import a package, how to export, and where the files go. Links the spec. |
| `com.infield.chessset/CHANGELOG.md` | N | AAxis format. First entry `0.1.0`. |
| `com.infield.chessset/LICENSE` | N | The licence text per D11. |
| `src/config.js` | N | All lengths in mm. `SUPPORT_MODE`, `FM_HANDOFF = true`, `PACKAGE_ROOT`, `STORE_SUFFIX = ''`, `EXPORT_ROOT = 'chess set'`, `PLUGIN_ID = 'com.infield.chessset'`, `JAWS = [{name:'standard', min:0, max:22.86}, {name:'alternate', min:25.4, max:63.5}]`, `NECK_OVERLAP = 0.5`, `NECK_SEGMENTS = 64`, `WELD_TOL = 0.001`, `WELD_RETRY_TOL = 0.01`, `MEASURE_TOL = 0.1`, `BAND = 1.0`, `PROFILE_STEP = 0.5`, `MAX_COPIES = 999`. |
| `src/units.js` | N | `MM_PER_IN = 25.4`, `roundHalfUp`, `ceilTo` (D8). `fmt(mm, primary)` returns e.g. `"18.00 in (457.2 mm)"` or `"457.2 mm (18.00 in)"`. `parse(text, primary)` returns mm, or `null`. |
| `src/stl.js` | N | `parseStl`, `writeAscii`, `writeBinary`, `transform`, `toBase64`, `fromBase64`. See P4.1. |
| `src/measure.js` | N | `weld`, `closedCheck`, `measure`, `profile`, `checkPiece`. See P4.2. |
| `src/manifest.js` | N | `validateManifest(json, names) → {errors[], manifest}`. See P4.3. |
| `src/package.js` | N | `importPackage({fm, call, settings, fileList, onProgress})` and `loadPackageMeshes({fm, call, pkg})`. See P4.4. |
| `src/planner.js` | N | `plan(inputs, pieces, mode)` → `{errors, scale, jawSet, pieces, coveredTips, blanks?, summary?}`. Pure. See P4.5. |
| `src/blank.js` | N | `buildBlank(blank, meshes, scale, inputs, mode)` → `Float64Array`. Pure. See P4.6. |
| `src/layout.js` | N | `buildLayout({pluginVersion, pkg, inputs, plan, sides, mode, createdAt})` → an object (P4.7). Pure. |
| `src/exporter.js` | N | `defaultJobName`, `validJobName`, `freeFolder`, `exportJob({fm, call, plan, pkg, inputs, sides, jobName, onProgress})` → `{folder, files}`, and `downloadZips({...same, folder})`. See P4.8. `call` is the Worker client from Detail 1. |
| `src/fm.js` | N | `createFm(base)` returns `{saveText(path, content), probe(path) → status, readText(path), getSettings(), putSettings(obj)}`. Every `?path=` value is built with `encodeURIComponent(path)` (ncCAM `app.js:858`). `file/save` sends the raw path in its JSON body (`app.js:845`). `readText` handles the response format recorded in Phase 0 step 5. |
| `src/settings.js` | N | `DEFAULTS`, `load(fm)`, `save(fm, patch)`. See P4.9. |
| `src/worker.js` | N | The handlers, with their payloads:<br>• `ping() → true`<br>• `measurePackage({units, files:{role:ArrayBuffer}, declared:{role:{…}}, sha256}) → {role:{measurements, profile, b64, errors}}` (buffers are transferred)<br>• `loadPackage({key, b64:{role:string}}) → true` (meshes cached by `key`)<br>• `buildBlankText({key, blank, scale, inputs, mode, name}) → string`<br>The same handlers run in the page as the fallback. |
| `src/index.js` | N | Entry point, as in Detail 1. |
| `src/ui/app.js` | N | `mountApp(root, host, call)`. Holds the state object, `render()`, a 150 ms debounced recompute on every `input` event, and the no-package state. |
| `src/ui/dom.js` | N | `el(tag, attrs, ...children)`. Text is set only with `textContent`. There is no `innerHTML` anywhere in `src/` (AC-SEC-01). |
| `src/ui/form.js` | N | The Package, Size, Stock, Allowances, Sides and Machine sections. See P4.10. |
| `src/ui/planview.js` | N | Error box (with one message template per error code, P4.5), piece table, summary, per-blank cards, and the export area. |
| `src/ui/preview.js` | N | SVG side view of one blank. See P4.10. |
| `src/ui/style.css.js` | N | Exports `injectStyle()`, which `mountApp` calls once. Uses ncSender CSS variables (`--color-accent`, `--color-surface`, `--color-surface-muted`, `--color-border`, `--color-text-primary`, `--color-text-secondary`, `--color-danger`, `--color-success`). Selectors use (0,2,1) specificity, e.g. `.csc-shell .csc-main button` (AAxis item 9). |
| `tools/make-fixtures.mjs` | N | Writes `tests/fixtures/` (P5.0). |
| `tools/prepare-package.mjs` | N | One-time Staunton preparation (P4.11). |
| `tools/harness.html` | N | Copied from ncCAM `dev/harness.html`, with the plugin id and the root id changed. It provides `window.ncSender.getApiBaseUrl`, the host CSS variables, `v-html`-style script re-execution, and the `close-plugin-dialog` listener. |
| `tools/mock-ncsender.mjs` | N | Dev server on port 8777 (P4.12). |
| `tools/ui-check.mjs` | N | Headless Playwright check (P5.8). |
| `packages/staunton-clarkerubber/` | N (generated) | `chess-set.json`, `king.stl` … `pawn.stl` (binary), `LICENSE`. Kept outside the plugin (§10). Not ignored by `.gitignore`. |
| `tests/*.test.js` | N | `units`, `stl`, `measure`, `manifest`, `settings`, `planner`, `blank`, `layout`, `exporter` (P5). |
| `tests/fixtures/` | N (generated + one hand-written file) | Generated by `make-fixtures.mjs`, plus the hand-written `layout-12in.json` (P5.5). |
| `Chess_Set_Creator.md` | M | Spec edits made with this plan: the §6 file tree, planning line and manifest line; the §5.1 Machine note; the §5.8 free-folder and job-name notes. Later: the Phase 0, 2 and 6 results (§12, §13, Appendix B, §5.1 defaults). |

### P3. Phases

From Phase 1 on, every phase leaves `npm test` passing. From Phase 3 on, the plugin ZIP installs. Each phase's acceptance criteria are listed in P5.7.

#### Phase 0 — Handoff and host facts (no plugin code)

On the shop machine's ncSender, in the browser console, with `base = ''` (same origin):

0. Record the ncSender edition and version (Settings → About). Check them against D13.
1. Save both `test_files/` STLs. For each file, read it through a file input, then call `fetch('/api/gcode-files/file/save', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({path:'chess set/_test/<name>.stl', content:text})})`.
2. **O-1:** in Rotary CAM, open each file from `chess set/_test/`. Record whether File Manager folders are offered and whether ASCII STL loads. If either answer is no, set `FM_HANDOFF = false`.
3. **O-2:** with Turning axis X and On axis Model origin, run Simulate on both files.
   - The floating file keeps a support → `SUPPORT_MODE = 'cam'`.
   - The floating file is cut through and the necked file is kept → `'necks'`.
   - Both are cut through → stop and add an open question.
4. **Overwrite:** save `chess set/_test/x.txt` twice with different content, read it back, and confirm §12's "replaces an existing file".
5. **Read-back format:** `GET /api/gcode-files/file?path=` + `encodeURIComponent('chess set/_test/x.txt')`. Record the `content-type` and the body shape. This fixes `fm.readText`:
   - for `text/*`, use the body;
   - for JSON, use the field that holds the text.
6. **Stored file types:** save `.chess-set-creator/probe/x.stl.b64`, `x.json` and `LICENSE` with known text. Read each back and compare. If any differs or fails, set `STORE_SUFFIX = '.txt'`.
7. **Dot-folders:** check whether `.chess-set-creator` shows in the File Manager tree, and set `PACKAGE_ROOT` (D6).
8. Delete `chess set/_test/` in the File Manager. Leave `.chess-set-creator/probe/`; it is hidden or harmless.
9. Write the results into the spec: §12 facts, the O-1 and O-2 answers, and `SUPPORT_MODE`, `FM_HANDOFF`, `PACKAGE_ROOT` and `STORE_SUFFIX`.

**If `FM_HANDOFF = false`:** Phase 5 still builds the exporter, but **Download ZIP** becomes the main button and **Export to File Manager** is hidden.

**Exit:** steps 0 and 2–7 are recorded in the spec.

#### Phase 1 — Repo skeleton and pure core

Create these, then run `npm install` and `npm run fixtures`:
- `.gitignore`, `package.json`, `build.mjs`, `build.sh`
- `src/config.js`, `units.js`, `stl.js`, `measure.js` (including `checkPiece`), `manifest.js`, `planner.js`
- `tools/make-fixtures.mjs` (mesh fixtures only)
- `tests/units`, `stl`, `measure`, `manifest` and `planner` tests

**Exit:** `npm test` passes P5.1–P5.4. The prepared-package and bad-package cases skip at this point.

#### Phase 2 — Prepared Staunton package

Write `tools/prepare-package.mjs`. Run it on a local clone of `clarkerubber/Staunton-Pieces` at `cef2c79`:

`npm run prepare-package -- <clone>/Source/Staunton packages/staunton-clarkerubber`

Then run `npm run fixtures` again, which adds the bad packages. Fill in Appendix B's "Closed after weld" column, and confirm the knight's face direction in a quick SVG export (P4.11 step 3).

**Exit:**
- The "prepared package validates" and "bad packages" cases in P5.3 pass.
- The measurements match Appendix B within 0.1 mm.

#### Phase 3 — Plugin shell, settings and import

Write:
- `com.infield.chessset/*`
- `src/index.js`, `fm.js`, `settings.js`, `package.js`, `worker.js`
- `ui/app.js`, `ui/dom.js`, `ui/style.css.js`, and the Package section of `ui/form.js`
- `tools/harness.html`, `tools/mock-ncsender.mjs`
- `tests/settings.test.js`

**Exit:**
- `./build.sh` produces a ZIP with no `.stl` inside.
- The plugin installs in ncSender.
- The Phase 3 ACs in P5.7 pass.

#### Phase 4 — Planning UI and preview

Write the rest of `ui/form.js`, plus `ui/planview.js`, `ui/preview.js` and `tools/ui-check.mjs`.

**Exit:**
- `npm run ui-check -- --until=plan` passes (P5.8 steps 1–5, 9 and 11).
- The Phase 4 ACs in P5.7 pass.

#### Phase 5 — Export (needs Phase 0 recorded)

Write:
- `src/blank.js`, `layout.js`, `exporter.js`
- the `buildBlankText` handler
- the export area of `ui/planview.js`, including Download ZIP
- `tests/blank`, `layout` and `exporter` tests, plus `tests/fixtures/layout-12in.json`

**Exit:**
- `npm test` passes in full.
- `npm run ui-check` passes in full.
- The Phase 5 ACs in P5.7 pass.

#### Phase 6 — Shop validation

1. Export a 12 in × 2 in job with the defaults.
2. Load blank 1 in Rotary CAM, simulate, check clearance, and cut it.
3. Record:
   - neck diameter, gap and cutter diameter → O-4;
   - Rotary CAM's tab and parting-neck lengths → O-10.
4. Update the §5.1 defaults if they changed.
5. Add a CHANGELOG entry, set the version to `0.2.0` (D12), and run `./build.sh`.

**Exit:** O-4 and O-10 are closed in the spec.

### P4. Module details

#### P4.1 `stl.js`

A triangle list is a `Float64Array` holding 9 numbers per triangle (x1, y1, z1, x2, …).

**`parseStl(buf)`**
- Binary when `buf.byteLength >= 84` and `byteLength === 84 + 50 × uint32LE(80)`. Each 50-byte record holds 12 float32 values: discard the first 3 (the normal) and keep the 9 vertex coordinates.
- Otherwise ASCII: decode as UTF-8 and take every `vertex x y z` line in order.
- Throws `"not an STL"` when:
  - the vertex count is 0;
  - the vertex count is not a multiple of 3;
  - any coordinate is not finite.

**`writeAscii(name, tris)`** uses the line layout of `test_files/`:
- `solid <name>`
- ` facet normal nx ny nz`
- `  outer loop`
- `   vertex x y z` (×3)
- `  endloop`
- ` endfacet`
- `endsolid <name>`

Formatting:
- Vertices use `toFixed(4)`.
- Normals use `toExponential(6)`, which prints `e+0` where `test_files` has `e+00`. Both parse the same.
- A normal is the normalised `(v2−v1)×(v3−v1)`. If its length is below 1e-12, the normal is `0 0 0`.
- Lines are built in chunks of 10,000 facets, and the chunks are joined once with `''`. This avoids repeatedly concatenating one growing string.

**`writeBinary(tris)`**
- an 80-byte header holding `"chess-set-creator"`;
- a uint32 triangle count;
- then for each triangle: the computed normal, three vertices as float32, and a uint16 of 0.

**`transform(tris, s, dx)`** returns a new array with `x' = x·s + dx`, `y' = y·s`, `z' = z·s`.

**`toBase64(u8)`** builds the binary string from 32,768-byte slices with `String.fromCharCode.apply(null, slice)`, joins them, and calls `btoa` once.

**`fromBase64(s)`** calls `atob` once on the whole string and copies the character codes into a `Uint8Array`.

#### P4.2 `measure.js`

**`weld(tris, tol)`**
- A spatial hash with cell size `tol`.
- Each vertex searches the 3×3×3 block of cells centred on its own cell for an existing vertex within Euclidean distance `tol`. If none is found, it gets a new index.
- Returns `{verts, faces, degenerate}`. Faces with a repeated index are dropped and counted in `degenerate`.

**`closedCheck(verts, faces)`**
- Counts each undirected edge. The mesh is closed when every count is exactly 2.
- `volume = Σ v1·(v2×v3) / 6` (signed).
- Returns `{closed, openEdges, volume}`.

**`measure(tris)`** (the axis is X):
- `minX`, `maxX`, `axialLength = maxX − minX`.
- **Base band:** vertices with `x ≤ minX + BAND`.
  - `baseCentre = ((minY+maxY)/2, (minZ+maxZ)/2)`, taken over the band.
  - `axisOffset = hypot(baseCentre)`.
- For each vertex, `r = hypot(y, z)`. Then:
  - `sweptDiameter = 2·max r`
  - `baseDiameter = 2·max r` over the base band
  - `topDiameter = 2·max r` over `x ≥ maxX − BAND`

**`profile(tris)`**
- Returns `ceil(axialLength / PROFILE_STEP)` radii: the largest `r` in each `PROFILE_STEP` slice, counted from `minX`.
- An empty slice takes the previous slice's value.

**`checkPiece(buf, declared, units, digest)`** runs §5.6 checks 2–6 for one file. It is pure; `digest` is injected and may be `undefined`.

1. `parseStl`. On failure, the error is `"unreadable STL"`.
2. If `units` is `"in"`, multiply every coordinate by 25.4.
3. `weld` at `WELD_TOL`, then `closedCheck`. Fails on `!closed` (giving `openEdges`) or `volume ≤ 0`.
4. `measure`. For each of `axialLength`, `baseDiameter` and `sweptDiameter`: `abs(measured − declared × (units === 'in' ? 25.4 : 1)) ≤ MEASURE_TOL`.
5. `axisOffset ≤ MEASURE_TOL` and `abs(minX) ≤ MEASURE_TOL`.
6. If `declared.sha256` is given:
   - if `digest` is available, compare;
   - otherwise add the note `"sha256 not checked: this connection is not secure"`. This is not an error.

Returns `{measurements, profile, tris, errors, notes}`.

#### P4.3 `manifest.js`

**`validateManifest(json, names)`**. `names` is the set of file paths in the folder, relative to its root. Each error is `{file:'chess-set.json', field, message}`.

1. `schema` is the integer 1.
2. `id` matches `^[a-z0-9-]+$`.
3. `version` matches `^\d+\.\d+\.\d+$`.
4. `name` is a non-empty string, at most 80 characters.
5. `author`, `source`, `license` and `attribution` are non-empty strings.
6. `licenseFile` passes the path rule. **Only if it does**, it must be present in `names`.
7. `units` is `"mm"` or `"in"`.
8. `frame` is exactly `"x-axis-base-at-origin-v1"`.
9. `pieces` has exactly the keys king, queen, bishop, knight, rook and pawn. Each piece has:
   - a `file` that passes the path rule, and only then is present in `names`;
   - `axialLength`, `baseDiameter`, `sweptDiameter` and `topDiameter` as finite numbers > 0.
10. `sha256`, if present, maps file names to `^[0-9a-f]{64}$`. The `"…"` placeholder in the §5.6 example fails this check, so fixtures and `prepare-package` leave `sha256` out.
11. `notes`, if present, is a string of at most 2000 characters.

**Path rule:** a non-empty string with no `\`, not starting with `/`, and with no segment equal to `..` or `.`.

Unknown top-level fields are ignored.

#### P4.4 `package.js`

**`importPackage`:**

1. The file input is `<input type="file" webkitdirectory>`.
   - **Root** = the first segment of `webkitRelativePath`.
   - **`names`** = the paths with the root removed.
   - If there is no root `chess-set.json`, the error is "No chess-set.json in the selected folder".
2. Parse the JSON (a parse error is reported with `field:"(file)"`), then run `validateManifest`. Stop on errors.
3. Read the six STLs as `ArrayBuffer`s.
4. Call `measurePackage`. The Worker runs `checkPiece` per role, with `digest` set to `crypto.subtle?.digest` bound to `'SHA-256'`, and returns `b64 = toBase64(writeBinary(tris))`.
5. If there are any errors, show the full list as `file — check — measured vs declared`. Nothing is stored. Notes are shown as information.
6. Save the files under `dir = PACKAGE_ROOT/<id>@<version>/`, appending `STORE_SUFFIX` to each name:
   - `chess-set.json` (the original text);
   - `LICENSE` (the text of `licenseFile`);
   - the six `<role>.stl.b64` files.

   If any save fails, stop, write nothing to settings, and show *"Saving <path> failed (<status>). The package is not installed."*
7. `settings.save` with:

   ```js
   packages[`${id}@${version}`] = {
     id, version, name, author, source, license, attribution, dir,
     installedAt: ISO,
     pieces: {role: {axialLength, baseDiameter, sweptDiameter, topDiameter, profile}}
   }
   lastPackage = `${id}@${version}`
   ```

   Re-importing the same `id@version` overwrites it.

**`loadPackageMeshes({fm, call, pkg})`:** the page reads the six `<role>.stl.b64` files (plus suffix) with `fm.readText`, then calls `loadPackage({key, b64})`.

#### P4.5 `planner.js`

**Inputs** (all mm):
- `queenBase`, `stockLength`, `stockShape`, `stockWidth`
- `chuckRes`, `tailRes`, `gap`, `neckDiameter`, `radialAllowance`
- `sides` (`'maple'`, `'walnut'` or `'both'`)
- `maxBlankLength`

`pieces` = the installed package's measured dimensions. `mode` = `SUPPORT_MODE`.

**Errors** are `{code, field?, role?, values}`, with `values` in mm. `planview.js` turns each code into the message below and formats the values with `fmt(v, primary)`. Placeholders are written `<name>`.

| Code | Message |
|---|---|
| `NO_PACKAGE` | Import a model package folder. |
| `RANGE` | `<label>` must be between `<min>` and `<max>`. (With no max: "must be at least `<min>`".) |
| `NO_USABLE` | Reservations (chuck `<chuck>` + tailstock `<tail>`) leave no usable length on `<length>` stock. |
| `TOO_LONG_FOR_MACHINE` | Stock length `<length>` is longer than the longest blank the machine holds (`<max>`). |
| `JAW` | Stock width `<width>` is outside both jaw sets (standard 0–22.9 mm, alternate 25.4–63.5 mm). Nearest width that fits: `<nearest>`. |
| `TOO_WIDE` | `<piece>` needs `<need>` (swept Ø `<swept>` + 2 × `<allowance>`) but the stock is `<width>` wide. Minimum stock width: `<minWidth>`. |
| `TOO_LONG` | `<piece>` is `<length>` long but the usable length is `<usable>`. Minimum stock length: `<minLength>`. |
| `NECK_WIDER_THAN_BASE` | Neck Ø `<neck>` is wider than the `<piece>` base (`<base>`). |

**Step 1 — ranges.** Any `RANGE` error stops planning here.

| Field | Label | Min | Max |
|---|---|---|---|
| `queenBase` | Queen base diameter | 15 | 100 |
| `stockLength` | Stock length | 50 | — |
| `stockWidth` | Stock width | 0.1 | — |
| `chuckRes` | Chuck reservation | 0 | 200 |
| `tailRes` | Tailstock reservation | 0 | 200 |
| `gap` | Gap | 6.35 | 50 |
| `neckDiameter` | Neck diameter | 3 | `stockWidth` |
| `radialAllowance` | Radial allowance | 0 | 10 |
| `maxBlankLength` | Max blank length | 100 | 2000 |

- `neckDiameter` is not checked when `mode === 'cam'`.
- The upper stock-length limit and the jaw ranges are checked only in step 3, so they get their own messages.

**Step 2 — scale.** `scale = queenBase / pieces.queen.baseDiameter`. Every scaled dimension = measured × scale.

**Step 3 — checks.** Collect every failure. Then stop if there are any.
- **Usable length:** `usable = stockLength − chuckRes − tailRes`. If `usable ≤ 0`, report `NO_USABLE`, and skip the length checks below.
- **Machine length:** if `stockLength > maxBlankLength`, report `TOO_LONG_FOR_MACHINE`.
- **Jaw set:** `jawSet` = the name of the `JAWS` range that contains `stockWidth`. If there is none, report `JAW`, with `nearest`:
  - between 22.86 and 25.4: the closer boundary (a tie goes to 25.4);
  - above 63.5: 63.5.
- **Cross-section,** per role: `need = scaledSwept + 2·radialAllowance`. If `need > stockWidth`, report `TOO_WIDE`. `minWidth = ceilTo(max need, 1)`.
- **Length,** per role (only when `usable > 0`): if `scaledAxial > usable`, report `TOO_LONG`. `minLength = ceilTo(max scaledAxial + chuckRes + tailRes, 1)`.
- **Neck** (only when `mode === 'necks'`): if `neckDiameter > min scaled baseDiameter`, report `NECK_WIDER_THAN_BASE`.

**Step 4 — covered tips** (only when `mode === 'necks'`): the roles whose scaled `topDiameter < neckDiameter`.

**Step 5 — packing,** in integer µm (D7). The counts per side are `[1,1,2,2,2,8]`, in K, Q, B, N, R, P order.
- `patterns(rem)`: every count vector `c ≤ rem` with `Σc ≥ 1` and `Σ cᵢ·lenᵢ + (Σc − 1)·gap ≤ usable`.
- `best(rem)` is memoised by `rem.join(',')`:
  - `[]` for the empty vector;
  - otherwise, the lowest-comparing candidate `[p, ...best(rem − p)]` over all patterns `p`.
- **Comparing two plans a and b:**
  1. fewer blanks wins;
  2. else, at the first index i where `used(aᵢ)` differs, the larger wins;
  3. else, compare piece lists element by element, each written in K, Q, B, N, R, P order. The earlier role wins, and a list that is a prefix of the other comes first.
- This key has optimal substructure: with the first blank fixed, the rest compares by the same key. At most 972 states, each with at most 972 patterns.

**Step 6 — per blank:**
- Pieces in descending axial length; equal lengths go K, Q, B, N, R, P.
- x ranges: `[0, len₀]`, then `[prevEnd + gap, …]`.
- `used = lastEnd`; `leftover = usable − used`.

**Step 7 — output** (converted back to mm):
- **On errors:** `{errors, scale, jawSet, pieces, coveredTips}`. No `blanks`.
- **Otherwise also:**
  - `blanks: [{index, pieces:[{role, xStart, xEnd}], used, leftover}]`
  - `summary: {blanksPerSide, sides: n, totalBlanks, stockToBuy}`

#### P4.6 `blank.js`

`buildBlank(blank, meshes, scale, inputs, mode)`:
- For each piece, add `transform(meshes[role], scale, xStart)`.
- If `mode === 'necks'`, also add one closed cylinder per gap:
  - axis X, radius `neckDiameter/2`, `NECK_SEGMENTS` segments;
  - running from `prevEnd − NECK_OVERLAP` to `nextStart + NECK_OVERLAP`;
  - side quads as two triangles each, plus two end-cap fans;
  - windings counter-clockwise seen from outside.

#### P4.7 `layout.json` (schema 1)

```jsonc
{
  "format": "chess-set-creator-layout", "formatVersion": 1,
  "createdAt": "2026-11-02T14:05:00Z",
  "plugin": { "id": "com.infield.chessset", "version": "0.1.0" },
  "package": { "id": "staunton-clarkerubber", "version": "1.0.0", "name": "Staunton (clarkerubber)" },
  "units": "mm", "frame": "x-axis-base-at-origin-v1", "turningAxis": "X", "onAxis": "Model origin",
  "scale": 1.27, "queenBaseDiameter": 38.1,
  "stock": { "length": 304.8, "width": 50.8, "shape": "square", "jawSet": "alternate" },
  "reservations": { "chuck": 25.4, "tailstock": 19.05 },
  "gap": 10, "supportMode": "necks", "neckDiameter": 7.6, "radialAllowance": 1.5,
  "coveredTips": ["queen", "bishop"],
  "blanks": [
    { "side": "maple", "index": 1, "file": "maple_blank_01.stl",
      "pieces": [ { "role": "king", "xStart": 0, "xEnd": 99.06 }, "…" ],
      "usedLength": 260.03, "leftoverLength": 0.32 }
  ]
}
```

- Numbers are rounded half up to 0.001 mm.
- When `supportMode` is `"cam"`: `neckDiameter` is `null` and `coveredTips` is `[]`.

#### P4.8 `exporter.js`

**1. Job name.**
- `defaultJobName = pkg.id + ' Q' + trim(roundHalfUp(queenBase, 1)) + ' ' + Math.round(stockLength) + 'x' + Math.round(stockWidth)`.
- `trim` drops a trailing `.0`, so 40 gives `Q40` and 38.1 gives `Q38.1`.
- `validJobName`:
  - matches `^[A-Za-z0-9 ._()x-]+$`;
  - does not start with `.`;
  - does not contain `..`.

  Otherwise the error is *"Job name may use letters, digits, space and . _ - ( ) only."*

**2. Free folder (D3).** For n = 1…`MAX_COPIES`: the folder is `name` when n is 1, otherwise `name (n)`. Probe `chess set/<folder>/LICENSE-models.txt`:
- 404 → use this folder;
- 200 → try the next n;
- any other status → *"Could not check the File Manager (<status>)."*

After `MAX_COPIES`: *"Too many copies of <name>; rename the job."*

**3. Write order (D4).** Each file is saved with `fm.saveText`, and `onProgress({file, i, n})` is called.
1. `LICENSE-models.txt` = the package `LICENSE` text + `\n\nAttribution: <attribution>\nSource: <source>\n`.
2. For each selected side, maple first, then for each blank i: `call('buildBlankText', {key, blank, scale, inputs, mode, name: '<side>_blank_<ii>'})`, then save. The page releases the string after the save completes.
3. `layout.json` (`JSON.stringify(obj, null, 2)`).

**4. On a failed save:** stop, then throw `ExportError({path, status, body: first 200 chars})`. The UI shows *"Saving <path> failed: <status> <body>. Files already written stay in place; this folder has no layout.json, so it is incomplete."* It also shows **Download ZIP**.

**5. `downloadZips`** creates one ZIP per selected side, named `<folder> <side>.zip`. `<folder>` is the default job name when no File Manager export ran.
- Uses fflate's streaming `Zip` with `ZipDeflate` at level 6.
- Text goes in through `strToU8`, with `push(u8, true)`.
- Each ZIP contains `LICENSE-models.txt`, that side's blanks (generated one at a time, then released) and the full `layout.json`.
- Downloaded through an object URL and a temporary `<a download>`.

**6. On success:** *"Exported <n> blanks to chess set/<folder>/."*

The exporter never calls `/api/gcode-files/load*`, `/api/gcode-job` or `/api/send-command` (AC-EXP-05).

#### P4.9 `settings.js`

```js
DEFAULTS = {
  schema: 1, displayUnit: 'in', maxBlankLength: 914.4,
  packages: {}, lastPackage: null,
  lastInputs: { queenBase: 38.1, stockLength: 457.2, stockShape: 'square', stockWidth: 50.8,
    chuckRes: 25.4, tailRes: 19.05, gap: 10, neckDiameter: 7.6, radialAllowance: 1.5, sides: 'both' }
}
```

**`load(fm)`** (for display):
- `GET`, then `Object.assign({}, DEFAULTS, s, { lastInputs: {...DEFAULTS.lastInputs, ...(s.lastInputs || {})}, packages: s.packages || {} })`.
- On failure, it returns `DEFAULTS` and sets `offline = true`.

**`save(fm, patch)`:**
1. `GET`. If the response is not OK, throw `SettingsError(status)` and **do not PUT**.
2. Merge the response over `DEFAULTS` as `load` does.
3. Apply the patch at the top level. If the patch has `lastInputs`, merge it into the existing `lastInputs`.
4. `PUT` the whole object.

The UI catches `SettingsError` and shows *"Settings not saved (<status>). Your changes stay in this dialog."*

**When it saves:**
- `lastInputs`: 1 s after the last input change;
- `displayUnit`: on toggle;
- `maxBlankLength`: on change;
- `packages` and `lastPackage`: on import.

#### P4.10 UI

**Layout.** `.csc-shell` holds a header and two columns. Below 900 px the columns stack.

**Header:**
- the title;
- the units toggle (`in` / `mm`), which changes the primary unit only;
- the build tag, in small text.

**No-package state.** When `lastPackage` is null or not installed, only the Package section shows, with the error box *"Import a model package folder."* The plan and the export area are hidden.

**Left column, in this order:**
1. **Package:** a select of installed packages; the **Import package folder** button; the selected package's name, author and licence; import progress, errors and notes.
2. **Size:** queen base diameter.
3. **Stock:** length; shape (radio: square / round); width; a jaw-set readout.
4. **Allowances:** chuck reservation, tailstock reservation, gap, neck diameter (hidden when `mode === 'cam'`), radial allowance.
5. **Sides:** radio (both / maple / walnut).
6. **Machine:** a collapsed row with max blank length (100–2000 mm), saved to settings.

**Each input:**
- shows its value in the primary unit;
- has a small line below with the other unit and the valid range;
- on a `RANGE` error, gets the class `bad`, and the small line shows the message.

**Right column:**
- **Error box:** every error, only when there are errors.
- **Piece table:** role, per side, axial length, base Ø, swept Ø, and a "tip covered by neck" mark.
- **Summary line:** e.g. "Blanks per side: 5 (× 2 sides) · Total: 10 · Stock to buy: 120.00 in (3048.0 mm)".
- **One card per blank,** titled "Blank 2 — per side × 2", or "maple" / "walnut" for a single side. Each card shows:
  - the piece list in order;
  - used / leftover length;
  - stock and reservations in both units;
  - the jaw set;
  - the preview.
- **Export area:**
  - the job name field;
  - **Export to File Manager** (only when `FM_HANDOFF`);
  - a progress line;
  - **Download ZIP**, shown after a failed save, or as the main button when `!FM_HANDOFF`.

**Preview** (`preview.js`):
- Shown only when the plan has no errors.
- An SVG with `viewBox="0 0 <stockLength> <stockWidth>"` and width 100%. It contains:
  - the stock rectangle (`stroke: var(--color-border)`);
  - the reservations, filled `color-mix(in srgb, var(--color-text-secondary) 15%, transparent)`;
  - each piece as a mirrored polygon from its scaled profile, offset by `chuckRes + xStart`, filled `color-mix(in srgb, var(--color-accent) 35%, transparent)`;
  - each neck as a rectangle of the neck diameter.
- Built with `createElementNS` and attributes only.

**Closing:** `window.postMessage({type:'close-plugin-dialog'}, '*')`. The dialog never uses `alert`, `confirm` or `prompt` (AAxis item 10).

#### P4.11 `tools/prepare-package.mjs`

**Usage:**
- `prepare-package <clone>/Source/Staunton <outDir>`
- `prepare-package --measure <file.stl> [--x0 <a> --x1 <b>]`

For each of King, Queen, Bishop, Knight, Rook and Pawn, it reads `<src>/<Piece>/<Piece>.STL`, then:

1. **Rotate Y-up to the X axis:** `(x, y, z) → (y, −x, z)`.
2. **Centre:** measure the base-band centre, then translate by `(−minX, −cy, −cz)`.
3. **Knight only — face to +Z:**
   - Over the vertices with `x ≥ minX + 0.6·axialLength`, take the mean `(ȳ, z̄)` and `θ = atan2(ȳ, z̄)`.
   - Rotate every vertex by +θ: `y' = y·cosθ − z·sinθ`, `z' = y·sinθ + z·cosθ`.
   - Assert that the new top-40% mean has `|ȳ| < 0.01` and `z̄ > 0`.
   - Print θ. In Phase 2, check once in an SVG side view that +Z is the face and not the mane. If it is the mane, rerun with `--knight-flip`, which uses θ + π.
4. **Close the mesh:**
   - `weld` at `WELD_TOL`, then `closedCheck`. If the mesh is not closed, retry at `WELD_RETRY_TOL`.
   - Whichever tolerance closes it, rebuild the triangles from the welded `verts` and `faces`, with degenerate faces dropped.
   - Re-run `weld` + `closedCheck` at `WELD_TOL` on the rebuilt mesh.
   - If it is still not closed, stop with *"<piece> is not closed (<k> open edges) — repair needed"* and write nothing.
5. **Write:** measure, then write `<role>.stl` as binary STL.

Then it:
- writes `chess-set.json` with the measured values rounded to 0.01, the §5.6 example fields, no `sha256`, and the knight `notes`;
- copies `LICENSE` from `path.join(src, '..', '..', 'LICENSE')`;
- prints an Appendix B–format table with the weld tolerance used and the closed status.

**`--measure`** prints the axial length and the base, swept and top diameters. With `--x0` and `--x1`, it keeps only the triangles whose three vertices lie in `[x0, x1]`. AC-SIZE-01 uses this with the queen's range from `layout.json`.

#### P4.12 `tools/mock-ncsender.mjs`

A Node `http` server on port **8777**. ncSender itself uses 8090.

**Routes** (paths and queries are parsed with `URL`/`URLSearchParams`; any path containing `..` is rejected):
- `/` serves `tools/harness.html`.
- `/api/plugins/com.infield.chessset/config-ui` serves `config.html` with `__SERVER_PORT__` replaced by 8777.
- `/api/plugins/com.infield.chessset/icon?file=` serves files from `com.infield.chessset/`.
- `/api/plugins/com.infield.chessset/settings`: GET and PUT.
- `/api/gcode-files/file/save` (POST) stores the file:
  - `.stl` → path and size only;
  - anything else → full content.
- `/api/gcode-files/file?path=` (GET): 404 when missing; otherwise the Phase 0 format, using stored content or `"(stl omitted)"`.
- `POST /__mock/fail-save {after:n}` makes the n-th next save return 500.
- `GET /__mock/store` returns the store as JSON, for `ui-check`.

**Logging:** every call is logged. Any call to a `load*`, `gcode-job` or `send-command` path is logged as `FORBIDDEN`.

**Persistence:** the store is saved to `.mock-store.json` on exit.

### P5. Test plan

#### P5.0 Fixtures (`tools/make-fixtures.mjs`)

**Meshes, written in Phase 1:**
- `cube.stl`: 10 mm, ASCII, closed, volume 1000.
- `cube-open.stl`: the same cube with one face (2 triangles) removed, leaving 4 open edges.
- `cube-gap.stl`: the cube with two shared vertices offset by 0.0005 mm.
- `cylinder-ascii.stl` and `cylinder-binary.stl`: r 5, length 20, along X, 64 segments.

**Bad packages, written once `packages/staunton-clarkerubber/` exists.** Each is a copy of the prepared package with one change:
- `missing-file`: `rook.stl` deleted.
- `schema-2`: `schema` set to 2.
- `shifted-axis`: the pawn translated by +0.5 mm in Y.
- `open-mesh`: one triangle of the pawn deleted.
- `script-name`: `name` set to `<script>x</script>`.

**Hand-written:** `tests/fixtures/layout-12in.json` (P5.5).

#### P5.1 `units.test.js`
- `roundHalfUp(7.15, 1) === 7.2`
- `roundHalfUp(412.75 − 405.6, 1) === 7.2`
- `roundHalfUp(0.32, 1) === 0.3`
- `ceilTo(41.2, 1) === 41.2`
- `ceilTo(41.14, 1) === 41.2`
- `fmt(457.2, 'in') === '18.00 in (457.2 mm)'`
- `fmt(304.8, 'mm') === '304.8 mm (12.00 in)'`
- `parse('2.5', 'in') === 63.5`
- `parse('abc', 'mm') === null`

#### P5.2 `stl.test.js`
- The ASCII and binary cylinders parse to the same triangles within 1e-6.
- `writeBinary` → `parseStl` round-trips exactly at float32 precision.
- `writeAscii` → `parseStl` round-trips within 5e-5.
- Base64 round-trips 100,001 random bytes exactly.
- A 0-triangle file and an 83-byte file both throw.
- `test_files/test_two_pawns_necked.stl` parses.

#### P5.3 `measure.test.js` and `manifest.test.js`

**Mesh checks:**
- `cube.stl`: closed, volume 1000.
- `cube-open.stl`: not closed, 4 open edges.
- `cube-gap.stl`: welds closed.
- The cylinder: `swept = base = top = 10`, axial length 20.
- `checkPiece` with `digest` undefined and a `sha256` present returns one note and no error.

**Bad manifests** each give exactly one error, naming the field:
- `schema: 2`
- `version: "../x"`
- `id: "A B"`
- missing `pawn`
- `file: "../king.stl"` (path rule only; no presence error)
- `file: "King.stl"` when only `king.stl` exists
- `units: "cm"`
- `frame: "y-up"`

**Prepared package validates.** Skipped when `packages/staunton-clarkerubber/` is absent. It must pass `validateManifest` and `checkPiece` for all six pieces, and the measurements must match Appendix B within 0.1 mm.

**Bad packages.** Skipped when they are absent. Each fails with the expected check:
- `missing-file`: presence;
- `schema-2`: schema;
- `shifted-axis`: axis offset;
- `open-mesh`: closed;
- `script-name`: passes validation (the name is shown as text; see P5.8).

#### P5.4 `planner.test.js` and `settings.test.js`

The planner tests use the Appendix B dimensions.

**§11 at 12 in × 2 in:**
- exactly: K Q P | R P P P | R P P P | **B B N** | **N P**;
- used: 260.0 / 256.1 / 256.1 / 244.8 / 139.5;
- leftover: 0.3 / 4.3 / 4.3 / 15.6 / 120.8.

**§11 at 18 in × 2 in:**
- exactly: **K Q B P P** | **B R P P P P** | N N R P P;
- used: 409.6 / 405.6 / 361.3;
- leftover: 3.2 / 7.2 / 51.4.

**Equivalent cases:**
- 2½ in stock gives the same plans.
- Queen base 36 mm and 40 mm each give 5 blanks per side on 12 in stock and 3 on 18 in stock.

**AC-PLAN-02:** every plan contains exactly 1 K, 1 Q, 2 B, 2 N, 2 R and 8 P.

**AC-FIT-01:**
- 38.1 mm square stock gives 5 `TOO_WIDE` errors (every piece but the pawn), with `minWidth` 41.2.
- The largest queen base that fits is 47.7 on 2 in stock and 60.4 on 2½ in stock (searched in 0.1 mm steps).

**AC-FIT-03:**
- 100 mm stock gives `TOO_LONG` for the king, with `minLength` **143.6** (king 99.06 + reservations 44.45 = 143.51, rounded up to 0.1).
- 1000 mm stock gives `TOO_LONG_FOR_MACHINE`.

**AC-FIT-04:**
- 50.8 → `jawSet` `alternate`
- 19.05 → `jawSet` `standard` (returned even though `TOO_WIDE` errors are present)
- 24 → `JAW`, nearest **22.86** (shown as 22.9)
- 24.5 → `JAW`, nearest 25.4
- 70 → `JAW`, nearest 63.5

**Other planner checks:**
- **`NO_USABLE`:** chuck 200 + tail 200 on 300 mm stock gives exactly one error, `NO_USABLE`. Length checks are skipped.
- **`RANGE`:** gap 5 gives a `RANGE` error and no other errors.
- **Neck:** neck 31 mm gives `NECK_WIDER_THAN_BASE` (pawn base 30.48).
- **Covered tips** at the defaults: `['queen', 'bishop']`.
- **Timing:** `plan()` on 18 in stock completes in under 100 ms (`performance.now`).

**`settings.test.js`:**
- When the fake GET fails, `save` throws `SettingsError` and sends no PUT.
- `save({lastInputs:{gap:12}})` keeps `packages` and the other `lastInputs` fields.

#### P5.5 `blank.test.js` and `layout.test.js`

Skipped when `packages/staunton-clarkerubber/` is absent.

- **Two-pawn blank** (`pawn.stl`, scale 1.27, gap 10, necks mode):
  - welded and closed-checked, it is closed;
  - min X is 0 ± 1e-6;
  - max X is 119.22 ± 0.05.

  The 119.22 figure assumes the Appendix B pawn length of 43.00.
- **`cam` mode:** the same blank has no neck triangles.
- **KQP blank:** the queen slice from x 109.06 to 195.42 measures a base diameter of 38.1 ± 0.05 (AC-SIZE-01).
- **`layout-12in.json`** is written by hand from §11. `layout.test.js` compares `buildLayout(...)` (with `createdAt` fixed) against it field by field.

| Blank | Pieces (x ranges, mm) | Used | Leftover |
|---|---|---|---|
| 1 | K 0–99.06; Q 109.06–195.42; P 205.42–260.03 | 260.03 | 0.32 |
| 2 | R 0–62.23; P 72.23–126.84; P 136.84–191.45; P 201.45–256.06 | 256.06 | 4.29 |
| 3 | same as 2 | 256.06 | 4.29 |
| 4 | B 0–74.93; B 84.93–159.86; N 169.86–244.79 | 244.79 | 15.56 |
| 5 | N 0–74.93; P 84.93–139.54 | 139.54 | 120.81 |

#### P5.6 `exporter.test.js`

Uses a fake `fm` and a fake `call` that both record their calls.

- **Write order:** `LICENSE-models.txt` → maple 01…05 → walnut 01…05 → `layout.json`.
- **Free folder:** with the probe answering 200 for `job/` and 404 for `job (2)/`, the export goes to `job (2)`.
- **Encoding:** the probe URL for `chess set/job (2)/LICENSE-models.txt` is encoded (`chess%20set%2Fjob%20(2)%2F…`).
- **Failure:** when save #3 fails, `ExportError` is thrown, and there are no further saves and no `layout.json`.
- **Job names:** `../x` and `.hidden` are rejected.
- **Default name:** at queen base 40 it is `staunton-clarkerubber Q40 457x51`.
- **No forbidden calls:** no call path matches `/load|gcode-job|send-command/`.

#### P5.7 Acceptance criteria by phase

| AC | Phase | Method |
|---|---|---|
| AC-PKG-01 | 3 | List the ZIP; no `.stl` inside |
| AC-PKG-02 | 3 | Manual in ncSender: import the prepared package |
| AC-PKG-03 | 2 / 3 | Unit test (P5.3 bad packages); manual import of each bad package |
| AC-PKG-04 | 3 | Manual: rebuild and reinstall the ZIP; disconnect the network; reopen |
| AC-SEC-01 | 3 / 4 | Unit test (P5.3); ui-check step 9 |
| AC-IN-01 | 4 | Unit test (`RANGE`); ui-check step 5 |
| AC-IN-02 | 4 | ui-check step 4 |
| AC-IN-03 | 5 | Manual: "Maple only" exports maple blanks only |
| AC-SIZE-01 | 5 | Unit test (P5.5 KQP queen slice); `--measure --x0 --x1` on an exported blank |
| AC-FIT-01 to AC-FIT-04 | 1 / 4 | Unit tests (P5.4); ui-check step 5 |
| AC-PLAN-01 to AC-PLAN-04 | 1 / 4 | Unit tests (P5.4); ui-check step 3 (AC-PLAN-03) |
| AC-UI-01 | 4 | Manual: preview to scale |
| AC-EXP-01 / 02 / 05 | 5 | Unit tests (P5.6); ui-check steps 6, 7 and 10 |
| AC-EXP-03 | 5 | Unit test (P5.5) |
| AC-EXP-04 | 5 / 6 | Manual in Rotary CAM |
| AC-EXP-06 | 5 | Unit test (covered tips); manual check of the plan table |
| AC-EXP-07 | 5 | ui-check step 8 |

#### P5.8 `tools/ui-check.mjs`

The script starts the mock itself. It launches Playwright with `chromium.launch({executablePath: process.env.CSC_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})`, then opens `http://localhost:8777/`.

`--until=plan` runs steps 1–5, 9 and 11.

1. Open the dialog. Zero page errors.
2. `page.setInputFiles('input[webkitdirectory]', <absolute path of packages/staunton-clarkerubber>)`. The package shows as installed.
3. Set stock length to 12 in. Expect 5 cards.
4. Toggle units to mm. The first card shows `304.8 mm (12.00 in)`.
5. Type width 38.1 (mm). The error box lists 5 pieces. Then set the width back to 50.8 and type gap 5: a `RANGE` message appears. Then set the gap back to 10.
6. Export. `GET /__mock/store` holds 10 STLs, `layout.json` and `LICENSE-models.txt`.
7. Export again. The `(2)` folder is used.
8. `POST /__mock/fail-save {after:3}`, then export. The Download ZIP button appears.
9. Import `tests/fixtures/bad-packages/script-name/`. The name shows literally as `<script>x</script>`.
10. The mock log has zero `FORBIDDEN` lines.
11. Close the dialog (the `close-plugin-dialog` message), reopen it through the harness, and check zero page errors.

### P6. Order of work and checkpoints

| Phase | Depends on | Checkpoint |
|---|---|---|
| 0 | — | Facts recorded in the spec; `SUPPORT_MODE`, `FM_HANDOFF`, `PACKAGE_ROOT` and `STORE_SUFFIX` set |
| 1 | — (can run alongside Phase 0) | `npm test` passes (P5.1–P5.4) |
| 2 | 1 | Prepared package and bad packages pass; Appendix B "Closed after weld" filled in |
| 3 | 0 (read-back format, file types), 2 | ZIP installs; Phase 3 ACs pass |
| 4 | 3 | `ui-check --until=plan` passes |
| 5 | 0, 4 | `npm test` and `ui-check` pass in full; Phase 5 ACs pass |
| 6 | 5 | O-4 and O-10 closed; version 0.2.0 |
