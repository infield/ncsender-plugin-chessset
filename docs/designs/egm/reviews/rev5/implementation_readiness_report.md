# Stage 9 — Implementation Readiness Report

- **Target:** `Chess_Set_Creator.md` Revision 5, lines 501–1082 (`## Detailed Implementation Plan`, P1–P6). Lines 1–500 are the requirements it implements.
- **Reviewers:** three fresh-context reviewers in parallel: egm-implementation-readiness and egm-codebase-details (both against the Implementation Readiness Standard), and egm-style.
- **Context supplied:**
  - ncCAM source
  - the AAxis plugin and its `CLAUDE.md`
  - `test_files/`
  - the Staunton repo listing

  The ncSender host source and Rotary CAM were not available.
- **Date:** 2026-10-30

| Reviewer | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| Implementation readiness | Fails the Zero-Decision Rule | 4 | 11 | 20 |
| Codebase details | Not ready yet | 1 | 12 | 8 |
| Style | No blockers | 0 | 6 | 15 |

**After removing duplicates: 6 🔴 · 14 🟡 · grouped 🟢.**

**What held up:**
- The readiness reviewer recomputed every number in the plan. All of them hold, including the §11 layouts and the tie-break choices (BBN, KQBPP, BRPPPP), the fit limits (41.2, 47.7, 60.4, 143.6), the 30.48 neck limit and the 119.22 mm test blank. The one exception is the AC-FIT-04 value (IR-B2).
- The codebase reviewer confirmed most ncCAM and AAxis citations: `index.js:42`, `app.js:854`, the dependency versions, the settings route, the loader, the close message and the Staunton paths.

**Orchestrator spot checks (confirmed):**
- ncCAM `src/index.js:8–66`: a document-based Worker test, the `{id,type}` → `{id,ok,result|error}` message format, and a 5 s `init` race before falling back to the page.
- ncCAM `manifest.json`: `minAppVersion 2.0.88`, platforms `v2 2.0.88` and `pro-v2 2.0.149`.
- ncCAM `dev/harness.html` exists.
- `32768 % 3 = 2`, so the plan's base64 chunking corrupts data.
- 24 mm is 1.14 from 22.86 and 1.40 from 25.4, so its nearest jaw boundary is 22.86.

---

## 🔴 Blockers

### IR-B1. The Worker setup is only half of ncCAM's pattern [codebase 🔴1; readiness nit; readiness M1, M5]
**Lines:** 512 (D2), 554–555, 775

**Problem:**
- **The fallback misses a common failure.** D2 falls back to the page only when `new Worker` throws. A blocked or crashing Blob Worker usually fails later instead, so import would hang. ncCAM races an `init` call against a 5 s timeout, calls `terminate()` on timeout, then falls back.
- **Details the plan leaves out:**
  - the message format;
  - the transfer lists;
  - the Worker test (`typeof document === 'undefined'`, not `typeof window`);
  - the dynamic `import('./ui/app.js')`, which keeps UI code from running inside the Worker;
  - the payloads of `measurePackage`, `loadPackage` and `buildBlankText`.
- **Relative URLs break inside the Worker.** A Blob Worker can't fetch a relative URL. When `base` is `''`, as in the mock, `loadPackage` fails.

**Fix:**
- Rewrite D2 to point at ncCAM `src/index.js:8–66` line by line.
- Define the message format and each handler's payload.
- Have the **page** read the six `.b64` texts and post them to the Worker. The Worker then never fetches anything.

### IR-B2. The AC-FIT-04 test value contradicts the nearest-boundary rule [readiness B2]
**Lines:** 795, 1028

**Problem:** Under the rule as written, 24 mm is nearest to **22.86**, not 25.4.

**Fix:** Keep the rule. Change the test to `24 → 22.9 (standard)` and add `24.5 → 25.4`.

> Elephant note: this was my error in drafting.

### IR-B3. The base64 chunking corrupts data [readiness B3, codebase 7]
**Lines:** 688–689, 982

**Problem:** Encoding each 32 KB chunk with `btoa` and joining the results puts `=` padding in the middle of the string, so every stored package mesh would be corrupt.

**Fix:**
- **Encode:** build the binary string in 32 KB pieces with `String.fromCharCode.apply`, then call `btoa` once.
- **Decode:** call `atob` once on the whole string.
- **Test:** round-trip ≥ 100 KB of random bytes, with a length that is not a multiple of 3.

> Elephant note: my error in drafting.

### IR-B4. Phase exit checks can't be met in phase order [readiness B4, style M5, M6]
**Lines:** 574, 602, 612–613, 631, 1000, 1036–1041, 1054, 1080

**Problem:**
- Phase 1's exit requires P5.5, but `blank.js` and `layout.js` don't exist until Phase 5.
- Phase 2 needs the import checks, which only exist in Worker code written in Phase 3.
- Phase 4 requires all of `ui-check`, including the export steps from Phase 5.
- P5.7 doesn't match the acceptance lists in P3.

**Fix:**
- Phase 1's exit becomes P5.1–P5.4.
- Add a pure `checkPiece(buf, declared, units)` to `measure.js` in Phase 1. Both the Worker and the tests call it.
- The prepared-package test skips itself when the folder is absent.
- `ui-check --until=plan` runs in Phase 4; the full run happens in Phase 5.
- Replace P5.7 with one table: AC | Phase | Method.

### IR-B5. The stock-length and stock-width range checks swallow the specific errors [readiness B1]
**Lines:** 790, 794, 1024, 1028

**Problem:**
- Step 1 applies the §5.1 ranges, which include "≤ max blank length" and "inside a jaw range". So the Step 3 errors, the max-length error and the jaw-set message with a nearest width, can never fire, and P5.4 fails.
- The range table, its labels and the width lower bound are never written out.

**Fix:** Add an explicit Step 1 table:

| Field | Range |
|---|---|
| `queenBase` | 15–100 |
| `stockLength` | ≥ 50 |
| `stockWidth` | > 0 |
| `chuckRes`, `tailRes` | 0–200 |
| `gap` | 6.35–50 |
| `neckDiameter` | 3 to stock width |
| `radialAllowance` | 0–10 |
| `maxBlankLength` | 100–2000 |

Each row also needs its display label. Then state that the maximum stock length and the jaw ranges are checked only in Step 3.

### IR-B6. A failed settings read can erase installed packages [readiness M4, codebase 6]
**Lines:** 894–895

**Problem:** `load()` returns `DEFAULTS` when the GET fails, and `save()` then sends that back with PUT. So `packages: {}` replaces the stored package list.

**Fix:**
- Make `save()` use a strict read that throws on a non-OK response, and skip the PUT.
- Show *"Settings not saved (status)."*
- Add a test: when the GET fails, no PUT is sent.

> Elephant note: raised from Major to Blocker. It silently loses user data on a single network error.

---

## 🟡 Major

### IR-M1. Build script details [codebase 2, 3; readiness nit; style N7]
**Lines:** 533–534, 621

**Problem:**
- `build.mjs` is missing `bundle: true`.
- It doesn't say which `manifest.json` and `config.html` to read.
- `build.sh` builds *before* bumping the version, so the `BUILD` tag lags the ZIP name.

**Fix:**
- Spell out the esbuild options.
- Read and write the files under `com.infield.chessset/`.
- `build.sh` order: bump, then `node build.mjs`, then zip.
- Drop "`npm run build`, then".

### IR-M2. Manifest version floor and platform keys [codebase 4]
**Lines:** 535, §6 tree

**Problem:** The only reference plugin that uses `gcode-files` (ncCAM) declares `minAppVersion 2.0.88` and platforms `v2:2.0.88`, `pro-v2:2.0.149`. The plan copies AAxis's `2.0.0`, which never calls those routes.

**Fix:** Use ncCAM's floors. Add a Phase 0 step that records the shop's ncSender edition and version. Leave the `repository` field out on purpose, and say so.

### IR-M3. URL encoding is unspecified [codebase 5; readiness nit]
**Lines:** 513, 552, 586, 964

**Problem:** Paths contain spaces and parentheses.

**Fix:**
- Every `?path=` value goes through `encodeURIComponent`, as ncCAM `app.js:858` does.
- `file/save` sends the raw path in its JSON body.
- The mock decodes paths with `URLSearchParams`.

### IR-M4. `crypto.subtle` is missing over plain HTTP [codebase 8]
**Line:** 756

**Problem:** ncSender is reached over HTTP on the LAN, where `crypto.subtle` doesn't exist. An import that has a `sha256` entry would throw.

**Fix:** If `crypto.subtle` is undefined, skip the check and show the warning *"sha256 not checked (insecure connection)"*. Add a test for this.

### IR-M5. The mock doesn't behave like the host [codebase 9, 10, 11, 15; readiness M8]
**Lines:** 563, 958–966, 1058–1068

**Problem:**
- The mock doesn't reproduce how the host injects the dialog, unlike ncCAM's `dev/harness.html`.
- The `x-mock-fail` header can't be sent, because the plugin makes the requests.
- Playwright's browser isn't specified.
- Port 8090 clashes with ncSender's own port.
- In `ui-check`, step 4 expects the wrong unit order, and step 6 exports while the plan still has errors.

**Fix:**
- Copy ncCAM's `harness.html` to `tools/harness.html` and serve `config.html` through a `config-ui` route, keeping the `..` guard.
- Add `POST /__mock/fail-save {after:n}`.
- Launch Chrome via `executablePath` from `CSC_CHROME`, defaulting to ncCAM's path.
- Use port 8777.
- Step 4 expects `304.8 mm (12.00 in)`.
- Reset the width to 50.8 before step 6.
- Add a close-and-reopen step.

### IR-M6. Phase 0 doesn't test the file types import stores [codebase 13]
**Lines:** 580–591

**Problem:** Import stores `.stl.b64`, `.json` and an extension-less `LICENSE`. Phase 0 tests only `.stl` and `.txt`.

**Fix:** Save and read back each of those types, and compare the content. If any fails, store everything with a `.txt` suffix.

### IR-M7. The knight rotation sign is ambiguous [readiness M2]
**Line:** 948

**Problem:** With `θ = atan2(y, z)`, a standard rotation about X needs **+θ** to turn the face to +Z:
- `y' = y·cosθ − z·sinθ`
- `z' = y·sinθ + z·cosθ`

**Fix:**
- Write both formulas into the plan.
- Assert that after rotation the top-40% mean has |y| < 0.01 and z > 0.
- Confirm visually once that this is the face and not the mane, and record θ.

### IR-M8. The weld retry writes a mesh that import will reject [readiness M3]
**Lines:** 949–950

**Problem:** After a retry at 0.01 mm, the tool writes the unwelded triangles. Import then welds at 0.001 mm and fails.

**Fix:** Write the welded mesh, then re-run the 0.001 mm check on it before reporting success.

### IR-M9. Signatures, interfaces and the golden file are undefined [readiness M5]
**Lines:** 550–551, 554, 861–881, 1041–1051

**Fix:** Define:
- `exportJob({fm, call, plan, pkg, inputs, sides, jobName, onProgress})`
- `buildLayout({pluginVersion, pkg, inputs, plan, sides, mode, createdAt})`
- `buildBlankText({key, blank, scale, inputs, mode, name})`

Write the expected `layout.json` for the 12 in example by hand from the §11 numbers, rather than generating it with the code under test.

### IR-M10. AC-SIZE-01's measurement doesn't measure the queen [readiness M6]
**Line:** 640

**Problem:** `--measure` reports the first piece's base, which is always the king. It passes only because the king and queen share a 30 mm base.

**Fix:** Add `--x0/--x1` slicing using the queen's range from `layout.json`, or a `blank.test.js` case that measures the queen slice.

### IR-M11. Planner errors don't follow the display unit, and their shape is undefined [readiness M7]
**Lines:** 548, 790–823

**Fix:**
- Errors become `{code, field, role?, values:{…mm}}`, formatted in `planview.js` with `fmt`.
- Drop `warnings`.
- On errors, return `{errors, scale, jawSet, pieces}` with no `blanks`.

### IR-M12. Missing fixtures, switches and states [readiness M9, M10, M11]

**Fixtures:** add `tools/make-bad-packages.mjs`. It writes:
- 5 bad packages for AC-PKG-03 and AC-SEC-01: missing file, schema 2, shifted axis, open mesh, script in the name;
- the cube (10 mm) and cylinder fixtures.

**O-1 switch:** add an `FM_HANDOFF` constant for the case where O-1 is "no".

**No-package state:** when no package is installed, show only the Package section and the message *"Import a model package folder"*.

### IR-M13. Framing contradicts the plan's own content [style M1, M2, M3, M4]
**Problem:**
- The plan says "Approved" and "the implementer makes none", yet D11 is still open and D5/D6 depend on Phase 0.
- "Tested" and "proven" are unsupported claims.
- "If O-1 is no" doesn't say which of its two facts.

**Fix:** Use the style reviewer's rewrites, and name the exceptions explicitly.

### IR-M14. The preview colour variable [codebase 12; readiness nit]
**Line:** 934

**Problem:** Neither reference plugin uses `--color-primary`.

**Fix:** Use `color-mix(in srgb, var(--color-accent) 35%, transparent)`, as ncCAM does.

---

## 🟢 Nits (grouped)

**Functions**
- `closedCheck(verts, faces)` needs the vertices to compute volume.
- Define `ceilTo(x, d) = Math.ceil(x·10^d − 1e-9)/10^d`.
- Skip the length checks when usable ≤ 0.

**Tests**
- Manifest path-rule failures should skip the presence check.
- The §5.6 example `sha256` value fails rule 10, so fixtures omit it.
- The B/N tie test should assert the exact lists, not "swap input order".
- The `blank.test.js` pawn source is `packages/…/pawn.stl` (skip if absent).
- Add a `roundHalfUp(412.75 − 405.6, 1)` float case.

**Formats**
- `toExponential` gives `e+0`, not `e+00`. Say so.
- The summary shows "120.00 in".
- Name the job with `roundHalfUp` and trim trailing zeros.
- Throw after n = 999 (ncCAM: "too many saved copies").
- Each side's ZIP gets the full `layout.json`.

**Robustness**
- If one of the eight saves fails mid-import, stop and don't write settings.
- The mock stores only path and size for `.stl` files.
- Add a `.gitignore` (`node_modules/`, `*.zip`, `.mock-store.json`, `.DS_Store`).
- Note that `__INITIAL_CONFIG__` is unused on purpose.
- D9: ncCAM's `mesh.js` isn't reusable (indexed meshes, no STL I/O, unsigned volume).

**Paths and config**
- `config.html` parses the port the AAxis way: quoted placeholder, `/^\d+$/` test, default 8090. This is a deliberate change from ncCAM.
- `prepare-package` finds `LICENSE` at `../../LICENSE` relative to `Source/Staunton`.
- Phase 0 cleanup: a hidden dot-folder can't be deleted by hand, so leave it. Use `base = ''` in the console.
- Constants: lengths are in mm. Use `PROFILE_STEP` and `MEASURE_TOL` by name.

**Wording** (style N1–N15)
- Remove filler ("already", "tested", "proven").
- Fix the nested backticks at line 866.
- Change "Committed" to "Included in the ZIP".
- Use one placeholder style.
- Make the D12 changelog rule apply to `build.sh` runs only.
- "From Phase 1 on, `npm test` passes."
- Replace "green" with "passes".

---

## Traceability matrix

| Consolidated | Readiness | Codebase | Style |
|---|---|---|---|
| IR-B1 Worker pattern | M1, M5 (part), nit | 🔴1 | — |
| IR-B2 AC-FIT-04 value | B2 | — | — |
| IR-B3 Base64 | B3 | 7 | — |
| IR-B4 Phase gates | B4 | — | M5, M6 |
| IR-B5 Range table | B1 | — | N13 |
| IR-B6 Settings wipe | M4 | 6 | — |
| IR-M1 Build | nit | 2, 3 | N7 |
| IR-M2 Manifest floors | nit (repository) | 4, 18 | — |
| IR-M3 URL encoding | nit | 5 | — |
| IR-M4 crypto.subtle | — | 8 | — |
| IR-M5 Mock / harness / ui-check | M8, nit | 9, 10, 11, 15 | — |
| IR-M6 Phase 0 file types | — | 13 | — |
| IR-M7 Knight rotation | M2 | — | — |
| IR-M8 Weld retry | M3 | — | — |
| IR-M9 Signatures / golden | M5 | — | — |
| IR-M10 AC-SIZE-01 | M6 | — | — |
| IR-M11 Planner errors | M7 | — | N12 |
| IR-M12 Fixtures / switches / states | M9, M10, M11 | — | M4 (part) |
| IR-M13 Framing | nit (D11) | — | M1–M4 |
| IR-M14 Colour var | nit | 12 | — |
| Nits | 20 nits | 14, 16, 17, 19, 20, 21 | N1–N15 |
