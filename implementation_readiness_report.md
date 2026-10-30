# Stage 9 — Implementation Readiness Report

- **Target:** `Chess_Set_Creator.md` Revision 7, DetailedRange lines 589–1390. Lines 1–588 were read for reference.
- **Reviewers:** three fresh-context reviewers, run in parallel:
  - egm-implementation-readiness (implementation-readiness standard)
  - egm-codebase-details (implementation-readiness standard)
  - egm-style (persona rules)
- **Context supplied:**
  - `egm_context/ncSender` at `2f8a659`
  - `egm_context/ncsender-plugin-nccam` at `68a5ed8`
  - `egm_context/Staunton-Pieces` at `cef2c79`
  - `../AAxis/`
  - the files the target links to
- **Date:** 2026-10-30.
- **Mode:** consolidated run. No fixes were applied between stages.

| Reviewer | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| Implementation readiness | Not ready | 1 | 14 | 10 |
| Codebase details | Not ready | 1 | 5 | 4 |
| Style | Ready with style fixes | 0 | 3 | grouped |

**After removing duplicates:** 2 🔴, 16 🟡, grouped 🟢.

Prefixes in brackets show where each finding came from:
- **R** = readiness
- **K** = codebase details
- **W** = style
- **C-**, **C7-**, **Z-** = earlier stages

**Orchestrator spot checks:**
- K-M4 holds. `PluginManifest.Permissions` (`PluginModels.cs:52`) is the only mention of "permission" in the C# source, so nothing reads it.
- The AC-FIT-03 arithmetic (R-B7) holds: 100 − 25.4 − 19.05 = 55.55 mm, and only the pawn (54.61 mm) fits.

**Checked and accurate** (per the reviewers):
- ncCAM: the Worker pattern (`src/index.js:8–66`), the loader (`config.html:244–265`), the `build.mjs` options, the `package.json` versions and licence, and the manifest's `minAppVersion` and `platforms`. Also confirmed: `src/core/mesh.js` works on indexed meshes, has no STL I/O, and computes an unsigned volume.
- AAxis: the port quoting (`config.html:97–101`), and `CLAUDE.md` items 5, 9, 10, 15 and 45.
- ncSender:
  - the manifest keys
  - `icon?file=`
  - the 200 MB limit
  - the `close-plugin-dialog` listener
- Staunton paths and the `LICENSE` path.
- Worked-example values:
  - the x ranges
  - 119.22 mm and 143.6 mm
  - 30.48 mm
  - AC-FIT-01: 5 `TOO_WIDE`, 41.2 mm
  - the largest queen base: 47.7 / 60.4 mm
  - the AC-FIT-04 nearest widths
  - covered tops on Q and B
  - the default job name
  - the encoded probe URL

---

## 🔴 Blockers

### R9-B1. The plan hands 11 known defects to the implementer [R-B1, W-M1; also C-B1, Z-N5, A2]
- **Lines:** 591–593.
- **Problem:**
  - The plan says "fix each one before or during the phase it affects". That leaves the implementer to design fixes the reviewers have already identified, which fails the Zero-Decision Rule.
  - The status block contradicts itself: "approved", then "revised", then "has not been re-reviewed since".
  - R-M1…R-M11 live only in `_archive/reviews_before_rev7/implementation_readiness_report.md`. The archive move happened just before this run.
- **Fix:**
  - Write each resolution into its P-section. The findings below give checked fixes for most of them.
  - Delete the "open findings" paragraph.
  - Mark the plan "draft" until it has been re-reviewed.

### R9-B2. D3 and `fm.js` cite ncCAM for a per-file probe that ncCAM rejected [K-B1, R-nit; also C-M2, Z-N3]
- **Lines:** 609 and 665; also §5.8 line 238.
- **Problem:**
  - The citation `app.js:854–862` points at a file that doesn't exist at that path. At `src/ui/app.js:853–868` the code is `flash()` and `loadProgram()`.
  - ncCAM's `freePath` (`src/ui/app.js:883–895`) makes one call, `GET /api/gcode-files`, and walks the tree. Its comment explains why: *"asking for each name logged a 404 for every free one"*.
  - ncCAM never calls `GET …/file?path=` and never URL-encodes a path. Its `file/save` call is at line 874, not 845.
- **Fix:** either keep the probe as this plan's own choice, with the 404 log noise accepted and the ncCAM reference removed, or reuse ncCAM's tree walk. The tree's shape is known (R9-M1). Correct all three citations either way.

---

## 🟡 Major

### R9-M1. Phase 0 re-checks facts the source already answers [R-B3, K-M1; also Z-M3, C-M1, C7-M5]
- **Lines:** 612, 654, 701–707, 1184, 1387.
- **Problem:** these are already settled in the source:
  - **File read:** `GET /api/gcode-files/file` returns `200 {"content": …}` in camelCase (`GcodeFileEndpoints.cs:105–112`, `ApiResponses.cs:50`, `NcSenderJsonContext.cs:11`). A missing file returns `404 "File not found"`.
  - **Tree:** the tree has the shape `{storagePath, tree:[{id, name, type, path, children?, size?, uploadedAt?}]}` (`GcodeFileService.cs:49–57, 313–353`). It skips every folder and file whose name starts with `.` (lines 323 and 338).
  - **Save and read:** no extension filter (`GcodeFileService.cs:134–152`).
- **Fix:**
  - `fm.readText` = `(await r.json()).content`.
  - `PACKAGE_ROOT = '.chess-set-creator/sets'`.
  - `STORE_SUFFIX = ''`; delete it.
  - The mock's GET returns `{content}`.
  - Keep Phase 0 for O-1, O-2 and the overwrite check only. Phase 3 then no longer waits on Phase 0.

### R9-M2. A copy of the ncCAM harness can't open the dialog against the planned mock [R-B2, K-M2]
- **Lines:** 677, 1178.
- **Problem:**
  - ncCAM's harness parses JSON (`const { configUI } = await (...).json()`, `dev/harness.html:25`), and its mock returns `{configUI}` (`dev/serve.mjs:15`).
  - The real host returns `text/html` (`PluginEndpoints.cs:140–146`), and the planned mock serves HTML too. The copied harness throws, so every ui-check step fails.
  - The harness has no "root id" to change. It contains ncCAM-only hooks (`dropFixture`, `[data-file]`, `/fixtures/`, lines 32–38).
- **Fix:** have the harness read `await res.text()`. List the exact edits: title, the plugin id in the URL, and removing the fixture hooks.

### R9-M3. Existing ncCAM dev tools aren't reused [K-M3; also C-M6, A4]
- **Lines:** 678, 1172–1190, 1362–1378.
- **Problem:** ncCAM `dev/serve.mjs` is already an in-memory mock on port 8777. It serves:
  - `/`
  - `config-ui`
  - `icon?file=`, with a `..` guard
  - the tree
  - `file`
  - `file/save`

  `dev/reopen-check.mjs` and `dev/ui-run.mjs` are Playwright drivers.
- **Fix:** adapt `tools/mock-ncsender.mjs` from `dev/serve.mjs`, and list the additions: settings GET/PUT, `__mock/*`, and the FORBIDDEN log. Keep the store in memory (see R9-M5).

### R9-M4. The mock's settings GET on a fresh store doesn't match the host [R-B4, K-M5]
- **Lines:** 1074–1082, 1180–1181.
- **Problem:**
  - The real host returns `200 {}` when no config exists (`PluginManager.cs:322–326`). PUT creates the file (`PluginManager.cs:369–376`).
  - If the mock returns 404, `save` throws `SettingsError` and the first import can never be saved.
- **Fix:** the mock's GET returns `{}` when nothing is stored.

### R9-M5. `ui-check` can't be run twice with the same result [R-B5; also C-M6]
- **Lines:** 1190, 1373–1376.
- **Problem:** if the persisted `.mock-store.json` is reloaded on start:
  - step 7's `(2)` becomes `(3)` on the next run
  - step 9's `script-name` package overwrites the installed package's name
- **Fix:** keep the store in memory, or start `ui-check` with an empty store. State which in P4.12.

### R9-M6. Not every Phase 0 outcome has a defined path [R-B6; also C-M5]
- **Lines:** 699, 709, 1373–1377.
- **Problem:**
  - With `FM_HANDOFF = false`, steps 6–8 and 10 click a hidden button.
  - "Both cut through → stop" has nothing after it.
  - A second failure of step 6, even with `.txt`, isn't covered.
- **Fix:** define replacement checks for `!FM_HANDOFF` (for example `page.waitForEvent('download')`) and a next step for each Phase 0 outcome. Alternatively, apply Z-M2: keep one export path and drop `FM_HANDOFF`.

### R9-M7. Two test expectations are wrong [R-B7, R-B8, W-M2; also C-B2]
- **Lines:** 1251–1256, 1283.
- **AC-FIT-03:** with 100 mm stock, the usable length is 55.55 mm. K, Q, B, N and R all exceed it, so the test expects **5** `TOO_LONG` errors, each with `minLength` 143.6 mm.
- **`shifted-axis`:** this case fails three checks: axis offset, base Ø (25.0 vs 24.00) and swept Ø. `checkPiece` never says whether it stops at the first failure.
- **Fix:**
  - State the rule: stop after a failure in check 1 or check 3; checks 4–5 collect every error.
  - Then `shifted-axis` → exactly [base, swept, axisOffset]. If Z-M5 moves the declared-vs-measured comparison into `prepare-package`, this becomes [axisOffset].

### R9-M8. `checkPiece` is called pure and synchronous, but SHA-256 is asynchronous [R-B9; also C-M3]
- **Lines:** 848, 855–857, 893.
- **Problem:**
  - `crypto.subtle.digest` returns a Promise.
  - Converting the digest to hex isn't specified.
  - `sha256` is keyed by file name, not by role.
- **Fix:** make it `async`, look the hash up with `declared.sha256[manifest.pieces[role].file]`, and convert with a stated hex routine. Alternatively, defer SHA-256 to v2 (Z-M5).

### R9-M9. The `build.sh` version bump contradicts D12 [R-B10, K-N3; also C-M7]
- **Lines:** 618, 646, 652, 778.
- **Problem:**
  - AAxis `build.sh:6–14` bumps the patch number before zipping. The first ZIP is therefore 0.1.1, while the CHANGELOG starts at 0.1.0.
  - Phase 6 sets 0.2.0 and then runs `build.sh`, which ships 0.2.1.
- **Fix:** add a `--no-bump` flag to `build.sh`. Phase 6 then sets `0.2.0` and runs `./build.sh --no-bump`. State that the first build ships 0.1.1, or start the manifest at 0.1.0 and build it with `--no-bump`. Note that the bump uses python3, as AAxis does.

### R9-M10. The fflate streaming sequence is incomplete [R-B11; also C-M4]
- **Lines:** 1054–1057.
- **Problem:** the sequence has no:
  - `new Zip((err, chunk, final) => …)` callback collecting chunks
  - `zip.add(entry)`
  - `zip.end()`
  - step building a `Blob` before the object URL
- **Fix:** write out the exact sequence, or drop the ZIP fallback (Z-M2).

### R9-M11. Input fields: what they show and how they are read back is undefined [R-M12]
- **Lines:** 655, 669, 1111–1114.
- **Problem:**
  - Re-parsing displayed text makes values drift. For example, 7.6 mm shows as `0.30` in, which reads back as 7.62 mm. That would change the §11 results and AC-IN-02.
  - When `parse` returns `null`, the behaviour is undefined.
- **Fix:**
  - State holds values in mm.
  - A field is parsed only on its own `input` event.
  - Fields show 1 decimal in mm or 3 decimals in inches.
  - A `null` parse raises a `RANGE` error and is not saved to `lastInputs`.

### R9-M12. Who loads the meshes, and when, isn't specified [R-M13; also C-N6]
- **Lines:** 664, 914, 1048.
- **Problem:**
  - `loadPackageMeshes` is never called.
  - The Worker cache `key` is never defined.
  - The exporter test's fakes don't know whether `exportJob` reads the `.b64` files and the `LICENSE`.
- **Fix:**
  - `key = id@version`.
  - `exportJob` and `downloadZips` call `loadPackageMeshes` once for each Worker and key, then call `fm.readText` for the `LICENSE`.
  - Add these reads to the P5.6 write-order expectation.

### R9-M13. The sources of `pluginVersion` and `jobName` aren't specified [R-M14]
- **Lines:** 662–664.
- **Problem:** `buildSidecar` and `buildLayout` need `pluginVersion`, but `exportJob`'s arguments don't include it. It's unclear whether `source.job` is the typed name or the resolved folder name.
- **Fix:** `pluginVersion = __BUILD__.split('-')[0]` and `source.job = folder`.

### R9-M14. No repair procedure for a Staunton mesh that isn't closed [R-M15]
- **Line:** 1162; Appendix B, "Closed after weld" = [TBD].
- **Problem:** the plan stops at "repair needed", leaving the choice of tool and method to the implementer.
- **Fix:** name a fallback (a specific external tool and its steps, or a fixed hole-fill rule), or make it an owner escalation with an exit condition.

### R9-M15. O-8 (permissions) is left open, but the host never reads the field [K-M4]
- **Lines:** 405, 536, 619, 647.
- **Problem:** `PluginManifest.Permissions` (`PluginModels.cs:52`) is declared and never read.
- **Fix:** close O-8. Keep `["gcode.modify"]` only for consistency with other plugins, or use `[]`. Remove the "Implementer (read `PluginModels.cs`)" owner.

### R9-M16. Table cells carry whole procedures [W-M3]
- **Lines:** 645, 648, 654, 667.
- **Problem:** the `config.html` cell runs to about 150 words of loader steps. The `build.mjs` and `worker.js` cells are similarly dense.
- **Fix:** move each into a "Detail N" block, as Detail 1 already does, and leave a one-line purpose in the table.

---

## 🟢 Nits (grouped)

**Accuracy**
- **K-N1, line 648:** the stated reason for quoting the port doesn't hold in this build. Settings → Plugins calls `response.json()` on a `text/html` reply (`features/plugins/api.ts:147–154`), so it fails before showing the file. Quoting is still harmless.
- **K-N4, line 1176:** the host returns 404 on a `..` path for GET, but an unhandled 500 for `file/save`. The mock should mirror that split, so `freeFolder`'s "other status" branch can be tested.
- **R-nit, line 628:** use `window.ChessSet ||= {}`, as ncCAM does (`index.js:20`), so the cached `engine` and `source` aren't wiped.
- **W, lines 1010 vs 1331:** `onAxis` is `"Model origin"` in `layout.json` but `model-origin` in the sidecar. This came from the Revision 7 sidecar merge. Use one value, or state on purpose that they differ.
- **R-nit, line 667:** `measurePackage` returns no `notes`, but P4.4 step 5 uses them.
- **R-nit, lines 721 and 1258:** `settings.test.js` is part of Phase 1, but `settings.js` is only written in Phase 3.
- **R-nit, line 1316:** pin the inputs for `layout-12in.json`: sides `'both'` (10 blanks, not 5), `mode`, and `pluginVersion`.

**Behaviour to specify**
- **K-N2, line 1067:** `displayUnit` is local to the plugin. ncCAM follows the host's `unitsPreference` (`src/core/units.js:4`). Choose one on purpose. This also appears as Z-N2.
- **R-nit, line 1053:** the ZIP uses the default job name even when the user typed one. Use the validated field instead.
- **R-nit, line 1134:** state the preview's Y centring (`stockWidth/2`) and the neck cylinder's starting angle.
- **W, line 934:** the `JAW` message hard-codes "0–22.9 mm". Format it with `fmt`, as every other message does.

**Wording and notation (W)**
- Remove filler words:
  - "deliberate" (648)
  - "quick" (729)
  - "hidden or harmless" (706)
- Reword unclear lines:
  - 601: "every decision except four" overclaims. List the open items instead.
  - 612: the `STORE_SUFFIX` sentence.
  - 852: "(giving `openEdges`)".
  - 874: rule wording.
  - 1101: `lastPackage`.
  - 1185: "n-th next save".
  - 1360.
- 646: put "old ZIPs deleted first" in its place in the sequence.
- Line 1372 step 5 holds four actions. Split them.
- Use one capitalisation for "Detail 1" and one form for references, with full paths: "AAxis item 9" vs "AAxis `CLAUDE.md` item 5"; `app.js` vs `src/index.js`.
- Lines 1146–1147: `--knight-flip` is missing from the usage block (also flagged by R).
- Line 1313: add "mm".
- Lines 1263 and 1268: explain the bold plan groups, or remove the bold.
- Line 1331: write the expected sidecar fragment with field names.
- Line 617: D11 (licence) is still pending the owner.

---

## Traceability

| Consolidated | Readiness | Codebase | Style | Earlier stage |
|---|---|---|---|---|
| R9-B1 Open defects deferred | B1 | — | M1 | C-B1, Z-N5, A2 |
| R9-B2 Wrong ncCAM probe citation | nit | B1 | — | C-M2, Z-N3 |
| R9-M1 Facts already in source | B3 | M1 | — | Z-M3, C-M1, C7-M5 |
| R9-M2 Harness vs mock | B2 | M2 | — | — |
| R9-M3 Reuse ncCAM dev tools | — | M3 | — | C-M6, A4 |
| R9-M4 Settings GET on empty store | B4 | M5 | — | — |
| R9-M5 ui-check repeatability | B5 | — | — | C-M6 |
| R9-M6 Phase 0 outcomes | B6 | — | — | C-M5 |
| R9-M7 Wrong test expectations | B7, B8 | — | M2 | C-B2 |
| R9-M8 Async SHA-256 | B9 | — | — | C-M3 |
| R9-M9 build.sh versioning | B10 | N3 | — | C-M7 |
| R9-M10 fflate sequence | B11 | — | — | C-M4 |
| R9-M11 Input fields | M12 | — | — | — |
| R9-M12 Mesh loading | M13 | — | — | C-N6 |
| R9-M13 pluginVersion/jobName | M14 | — | — | — |
| R9-M14 Mesh repair | M15 | — | — | — |
| R9-M15 Permissions unused | — | M4 | — | — |
| R9-M16 Procedures in table cells | — | — | M3 | — |
