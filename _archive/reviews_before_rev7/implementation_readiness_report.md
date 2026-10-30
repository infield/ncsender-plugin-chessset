# Stage 9 — Implementation Readiness Report (re-audit of Revision 6)

- **Target:** `Chess_Set_Creator.md` Revision 6, lines 503–1299 (`## Detailed Implementation Plan`, P1–P6)
- **Reviewers:** three fresh-context reviewers, run in parallel: egm-implementation-readiness, egm-codebase-details and egm-style
- **Context supplied:** ncCAM, AAxis, `test_files/` and the Staunton listing. The items Phase 0 decides and D11 were declared as known exceptions.
- **Re-audit:** this is Stage 9's one allowed re-audit. The first round is in `implementation_readiness_report_rev1.md`.
- **Date:** 2026-10-30

| Reviewer | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| Implementation readiness | Close; not yet zero-decision | 0 | 11 | 13 |
| Codebase details | Close to ready | 0 | 7 | 9 |
| Style | Dry and direct; precision gaps | 0 | 9 | 19 |

**After removing duplicates: 0 🔴 · 11 🟡 · grouped 🟢.**

**Progress since round 1.** All 6 blockers from round 1 are closed. The codebase reviewer confirmed every ncCAM and AAxis citation in the plan (D2, D3, D9, D10, D13, the loader, the harness, the settings route, the close message and the Staunton paths), plus the library APIs. The readiness reviewer recomputed every number. Two are wrong; see R-M8.

**Orchestrator spot checks (confirmed):**
- On 100 mm stock the usable length is 55.55 mm. K, Q, B, N and R all exceed it, giving **5** `TOO_LONG` errors, not 1. This was my error.
- AAxis `build.sh` bumps the patch version before zipping, so a ZIP never ships with the version the plan writes in.

---

## 🟡 Major

### R-M1. Some Phase 0 outcomes have no handling [readiness M1, M2, M3; codebase M5, M7]
**Lines:** 600–622, 620, 806, 964–968

**Problems:**
- **ASCII STL rejected.** If Rotary CAM rejects ASCII STL, the Download ZIP fallback still holds ASCII blanks, so the fallback doesn't help.
- **Two tests in one folder.** The dot-folder test and the file-type test share `.chess-set-creator/probe/`. If the server rejects a leading dot, the plan would wrongly set `STORE_SUFFIX`.
- **No outcome if `.txt` also fails.**
- **Read-back format.** There is no `application/octet-stream` branch.
- **404 never checked.** The status for a missing file, which the free-folder probe depends on, is never checked.
- **Overwrite.** There is no outcome if "overwrite" does not replace the file.
- **Download ZIP.** It is not checked in ncSender's own window, which may be a kiosk or webview that ignores `<a download>`.
- **`@` in folder names.** Nothing confirms that the File Manager accepts `@` in `<id>@<version>`.

**Fix:**
- **Flags:**
  - Add `EXPORT_BINARY`. When true, blanks are written with `writeBinary`; ZIP only, since the File Manager can't hold binary. If neither ASCII nor binary loads, stop and open a question.
  - Test file types in `chess set/_test/probe/`, and the dot-folder separately. If `.txt` also fails, stop.
- **Read-back and probe:**
  - Any other content type → `res.text()`.
  - Add a step that GETs a missing path. If the status isn't 404, D3 becomes "taken if 200".
  - If overwrite does not replace, re-import saves to a timestamped folder.
- **Download and naming:**
  - Add a step that tests an `<a download>` Blob in ncSender's own window.
  - Probe `PACKAGE_ROOT/probe@1.0.0/`. If `@` fails, use `<id>--<version>`.

### R-M2. The first settings save is impossible on a fresh install [readiness M4, N9]
**Lines:** 985–1001

**Problem:**
- If ncSender returns 404, or an empty/`null` body, for a plugin that has never saved settings, `save` throws. Import then never registers the package.
- A `null` body also crashes `load`.
- The delayed `lastInputs` save and the unit toggle can interleave and lose an update.

**Fix:**
- Treat 404, an empty body or `null` as `{}`. Only other non-OK statuses throw.
- Run saves one at a time through a single promise chain.
- Add a test: GET 404 → PUT of `DEFAULTS` merged with the change.
- Define what `offline` does: show a banner and disable import.

### R-M3. The mock's `config-ui` response doesn't match the copied harness [codebase M2, N2; readiness M5]
**Lines:** 588, 1089

**Problem:**
- ncCAM's harness expects `config-ui` to return JSON, `{"configUI": …}` (`serve.mjs:15`, `harness.html:25`). The mock serves raw HTML, so every ui-check step fails.
- The root element has no id.
- The harness edits listed are wrong. It has no "root id", and its `dropFixture` hook doesn't apply.

**Fix:**
- The mock returns `application/json {"configUI": <html>}`.
- Use `<div class="csc-shell" id="csc-root">`.
- Harness edits:
  - change the plugin id;
  - change the two "ncCAM" labels;
  - delete `dropFixture`.

### R-M4. ui-check can't be repeated, and is undefined when `FM_HANDOFF` is false [codebase M6; readiness M6]
**Lines:** 1101, 1282–1284

**Problems:**
- **Leftover store:** a store saved from the previous run makes steps 6 and 7 fail.
- **Ctrl-C:** an async save on exit doesn't run when the user presses Ctrl-C.
- **Hidden export:** with `FM_HANDOFF` false, steps 6–8 can't run.

**Fix:**
- **Starting state:**
  - `ui-check` starts the mock with `--fresh`.
  - The mock loads and saves its store only with `--persist`, using `writeFileSync` on both SIGINT and exit.
  - Add `POST /__mock/reset`.
- **`FM_HANDOFF` false:** ui-check clicks Download ZIP and checks for one download per side (`waitForEvent('download')`).
- **Step 8:** also checks that the `(3)` folder has no `layout.json`.

### R-M5. The fflate ZIP sequence is incomplete [codebase M3, N7]
**Lines:** 964–968

**Problem:**
- There is no `new Zip(callback)`, no `zip.add`, and no `zip.end()`, so the ZIP is never finished.
- Compressing about 72 MB per side on the page thread freezes the dialog.

**Fix:**
- Spell out the full callback → `add` → `push` → `end` sequence, plus the error message.
- Move the ZIP build into the Worker as `zipSide(...) → ArrayBuffer` (transferred back), with progress shown per file.

### R-M6. The SHA-256 check is async and returns bytes [codebase M4; readiness N5]
**Lines:** 759–770, 804, 1148

**Problem:**
- `crypto.subtle.digest` returns `Promise<ArrayBuffer>`, but the manifest stores a hex string.
- `sha256` sits at the top level of the manifest, keyed by file, while `checkPiece` reads `declared.sha256`.
- Mismatch handling isn't specified.

**Fix:**
- `async checkPiece(buf, declared, units, digest, expectedHex)`.
- Hash the original bytes before parsing.
- Convert to lowercase hex.
- On a mismatch: *"sha256 mismatch: <file>"*.
- The test awaits the result.

### R-M7. `build.sh` bumps the version on every run [codebase M1; readiness N3]
**Lines:** 530, 558, 564, 689

**Problem:** The first ZIP ships as 0.1.1, not 0.1.0. "Set 0.2.0 and run `build.sh`" ships 0.2.1.

**Fix:**
- `build.sh --no-bump` zips the manifest version as it stands.
- The first build and Phase 6 use `--no-bump`, so 0.1.0 and 0.2.0 ship as written.
- Add a `__VERSION__` define for `layout.json`.

### R-M8. Test expectations are wrong or underspecified [readiness M7, M8, M9, N1, N2, N4; style M10]

**Problems:**
- **AC-FIT-03:** should be **5 `TOO_LONG` errors**, each with minimum length 143.6. My error.
- **`shifted-axis`:** gives **3** errors (base, swept, axis offset), not 1.
- **The four other bad packages:** "each fails" contradicts `script-name`, which passes.
- **Cylinders:** the ASCII and binary versions can't match within 1e-6 when both are generated from the same coordinates.
- **`layout.test.js`:** it would use the real package's float32 dimensions, so the fixture values drift.
- **Phase 1 exit:** it includes `settings.test.js`, which isn't written until Phase 3.
- **KQP queen slice:** literal bounds risk float noise at the edges.

**Fix:**
- **Exact error counts:**
  - AC-FIT-03: 5 errors.
  - `shifted-axis`: 3 errors.
  - `missing-file`, `schema-2` and `open-mesh`: 1 error each.
  - `script-name` is listed as the one exception.
- **Cylinders:**
  - Binary = `writeBinary(parseStl(ascii))`.
  - The cylinder spans X 0–20 with capped ends.
  - Give the `checkPiece` call explicitly.
- **`layout.test.js`:**
  - Not skipped.
  - Uses the Appendix B dimensions, `sides: 'both'` (10 entries) and a fixed `pkg`, version and `createdAt`.
  - Scale is rounded to 6 decimal places.
- **Phase 1 exit:** P5.1–P5.3 plus `planner.test.js`.
- **Queen slice:** use the planner's `xStart − 0.01` / `xEnd + 0.01`.

### R-M9. Export orchestration gaps [readiness M10; style N16]
**Lines:** 957–968, 825

**Problem:**
- Nothing says when `loadPackageMeshes` runs.
- Nothing says what happens if the stored files are missing.
- The source of the licence text is unstated.
- `saveText`'s return contract is undefined.
- The ZIP name ignores a job name the user typed.

**Fix:**
- `exportJob` and `downloadZips` first load the meshes, unless that package's key is already loaded (tracked in a page-side `Set`).
- If loading fails: *"The installed package files are missing (<path>). Re-import the package."*
- The licence comes from `fm.readText(pkg.dir + 'LICENSE' + STORE_SUFFIX)`.
- `saveText` throws `{status, body}` when the response isn't OK.
- The ZIP uses the job-name field.
- A probe failure also offers Download ZIP.

### R-M10. Input round-trips change values [readiness M11]
**Lines:** 1022–1025, 526

**Problem:** A gap of 10 mm shows as 0.39 in, which reads back as 9.906 mm. If fields are re-parsed, toggling units silently changes the plan.

**Fix:**
- State holds mm. Only the field that fired `input` is parsed, and toggling units never re-parses.
- Fields show 3 decimals in inches and 2 in mm, with trailing zeros trimmed.
- `parse` accepts a plain decimal only.
- A `null` result gives a `RANGE` error: *"<label> must be a number"*.

### R-M11. Wording that contradicts itself or hides an algorithm [style M1–M9; codebase N4, N5; readiness N6, N8]

**Problems:**
- **Units claim (line 509):** it contradicts the µm planner (D7).
- **"Except four" (line 513):** it miscounts the exceptions.
- **`checkPiece` steps:** they don't follow §5.6's check numbers.
- **Loader:** the whole algorithm sits in one table cell. It should be a numbered **Detail 2**: inject the script → set `.source` → mount; start with `var BUILD = 'dev';`; guard with `window.ChessSet?.build === BUILD`.
- **`JAW` message:** it hard-codes mm.
- **Card title:** ambiguous.
- **Knight face check:** no tool produces the SVG it needs. Add `prepare-package --svg`.
- **`--knight-flip`:** missing from the usage block.
- **Weld-retry flow:** unclear.
- **`call()`:** has no `transfer` parameter.
- **Mount failures:** not caught. Copy ncCAM `index.js:22–28`.
- **Repair path:** missing. Add `--replace <Piece>=<file>`, with MeshLab named as the repair tool.
- **Planner output:** `jawSet: null` and the output after a `RANGE` stop are undefined.

**Fix:** Apply the reviewers' rewrites as given.

---

## 🟢 Nits (grouped)

**Tests and harness**
- `node:test` skip syntax: `{ skip: !existsSync(dir) && 'reason' }`.
- Collect `pageerror` and console errors and assert there are none.
- The mock's settings GET returns `{}` until the first PUT.
- Chrome path: note that `CSC_CHROME` is required where branded Chrome isn't installed.
- Split ui-check step 5 into 5a and 5b.
- The timing test runs on the dev Mac (Node ≥ 20).

**Code**
- `injectStyle` is guarded by a `<style id="csc-style">` check.
- The package "select" becomes a read-only line, since a selector is v2.

**Wording and notation**
- D13: "only reference plugin using `file/save` and `file?path=`" (AAxis uses `load-temp`).
- "Committed to the repo" rather than "not ignored".
- Date the v2.0.271 fact.
- One multiplication notation throughout.
- Name the column "Status".
- Use full paths in the phase lists.
- Plus the small rewrites listed in the style report (N1–N19).

**Repo hygiene**
- The bad packages (about 70 MB) go under `tests/fixtures/bad-packages/` and are git-ignored. `make-fixtures` regenerates them.

**Phase 0**
- Step 0: if the ncSender version is below D13, stop.
- Step 3: the "stop" outcome lets Phases 1–4 continue, and it also covers the necked file being rejected on load.

---

## Re-audit cap

This was Stage 9's one allowed re-audit. If you resolve these findings, the plan is not re-reviewed by fresh reviewers. Any issue left over is recorded as an accepted trade-off.

## Traceability matrix

| Consolidated | Readiness | Codebase | Style |
|---|---|---|---|
| R-M1 Phase 0 outcomes | M1, M2, M3, N13 | M5, M7 | — |
| R-M2 Settings first save | M4, N9 | N9 | — |
| R-M3 Mock / harness shape | M5 | M2, N2 | — |
| R-M4 ui-check repeatability | M6 | M6 | N19 |
| R-M5 fflate sequence | — | M3, N7 | — |
| R-M6 SHA-256 | N5 | M4 | N10 |
| R-M7 Version bump | N3, N12 | M1 | — |
| R-M8 Test expectations | M7, M8, M9, N1, N2, N4 | N6 | M10 |
| R-M9 Export orchestration | M10, N10 | — | N16 |
| R-M10 Input round-trip | M11 | — | — |
| R-M11 Wording / loader / tools | N6, N8 | N3, N4, N5 | M1–M9 |
| Nits | N7, N11 | N1, N8 | N1–N19 |
