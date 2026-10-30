# Goldfish Annotated Review Report — Stage 9 (Implementation Plan)

**Status: resolved.** The owner chose "Auto accept", and all 20 PROPOSE FIX items were applied, producing `Chess_Set_Creator.md` Revision 6. Revision 5 is not archived separately; its plan text is superseded.

| Outcome | Count |
|---|---|
| Fixes applied | 20 |
| Escalated | 1: D11 licence, still pending the owner; GPL-3.0 kept as the placeholder |
| Declined | 2 nits |
| Left unaddressed | 0 |

**Verification:**
- Headings and code fences are intact.
- The §11 x-ranges were recomputed.
- The `roundHalfUp` and `ceilTo` cases were checked.
- The jaw-set nearest values were checked: 24 mm gives 22.86, 24.5 mm gives 25.4.
- The default job name was checked: Q40 457x51.

**Target:** `Chess_Set_Creator.md` Revision 5, lines 501–1082 (`## Detailed Implementation Plan`)
**Source findings:** `implementation_readiness_report.md`
**Earlier resolution logs:** `goldfish_review_report_stage7.md`, `goldfish_review_report_rev1.md`

**I wrote this plan in this session**, so I know the reasoning behind each choice. The reviewers recomputed every number. The errors they found are real, including two I made myself (IR-B2, IR-B3).

**Summary:**

| Category | Count |
|---|---|
| PROPOSE FIX | 20: 6 Blockers, 14 Majors, plus the nits grouped as one item |
| CONTEST | 0 |
| ESCALATE | 1: D11 licence, which only the owner can decide |
| DECLINE | 2 nits |

The fixes don't change any requirement in the spec body. They make the plan explicit enough that the implementer makes no decisions. The only spec-body edits are the §6 manifest line (IR-M2) and the §5.8 job-name note (nits).

---

## Prioritized Findings & AI Suggestions

### [Issue 1] [`codebase-details`, `implementation-readiness`] — High (IR-B1): Worker pattern
- **Scope:** [L512](Chess_Set_Creator.md#L512) (D2), [L554–555](Chess_Set_Creator.md#L554-L555), [L775](Chess_Set_Creator.md#L775)
- **Discrepancy:** The plan falls back only when `new Worker` throws, so a Worker that fails later leaves import hanging. The message format, transfer lists and Worker test are missing. The Worker can't fetch package files when `base` is `''`.
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** Confirmed against ncCAM `src/index.js:8–66`.
- ***Proposed Edit:***
  - **D2 Value** becomes:
    > Same as ncCAM `src/index.js:8–66`.
    > - `typeof document === 'undefined'` means Worker: `self.onmessage` dispatches `{id, type, ...args}` and replies `{id, ok:true, result}` or `{id, ok:false, error}`.
    > - In the page, `mount` loads the UI with a dynamic `import('./ui/app.js')`, so no UI module is evaluated in the Worker.
    > - The engine is created once and cached as `ChessSet.engine ||= startEngine()`.
    > - `startEngine` tries a Blob Worker, then races `call('ping')` against 5 s. On timeout it calls `terminate()` and runs the same handlers in the page.
    > - The Worker never fetches: the page reads every file and posts the content.
  - **P2 `src/worker.js` row:** list the handlers and their payloads.
    - `ping() → true`
    - `measurePackage({units, files:{role:ArrayBuffer}, declared}) → {role:{measurements, profile, b64, errors}}`. The buffers are transferred.
    - `loadPackage({key, b64:{role:string}}) → true`. The meshes are cached by `key`.
    - `buildBlankText({key, blank, scale, inputs, mode, name}) → string`
  - **P4.4 step 6:** the page reads the six `.b64` files with `fm.readText` and calls `loadPackage`.

### [Issue 2] [`implementation-readiness`] — High (IR-B2): AC-FIT-04 test value
- **Scope:** [L1028](Chess_Set_Creator.md#L1028)
- ***AI Suggestion:*** PROPOSE FIX (my error)
- ***Proposed Edit:*** `24 → an error with nearest 25.4` becomes `24 → an error with nearest 22.9 (standard jaws); 24.5 → an error with nearest 25.4 (alternate jaws)`.

### [Issue 3] [`implementation-readiness`, `codebase-details`] — High (IR-B3): Base64 chunking
- **Scope:** [L688–689](Chess_Set_Creator.md#L688-L689), [L982](Chess_Set_Creator.md#L982)
- ***AI Suggestion:*** PROPOSE FIX (my error)
- ***Proposed Edit:***
  - **P4.1** becomes:
    > `toBase64(u8)`: build the binary string from 32,768-byte slices with `String.fromCharCode.apply(null, slice)`, join them, and call `btoa` once.
    > `fromBase64(s)`: call `atob` once, then copy the character codes into a `Uint8Array`.
  - **P5.2** becomes: "Base64 round-trips 100,001 random bytes exactly."

### [Issue 4] [`implementation-readiness`, `style`] — High (IR-B4): Phase gates
- **Scope:** L574, 602, 612–613, 631, 1000, 1036–1041, 1054, 1080
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **L574:** "From Phase 1 on, every phase leaves `npm test` passing; from Phase 3 on, the plugin ZIP installs."
  - **Phase 1 exit:** P5.1–P5.4.
  - **New pure function in `measure.js` (Phase 1):** `checkPiece(buf, declared, units) → {measurements, profile, tris, errors}`. It runs §5.6 checks 2–6 for one file. `measurePackage` and the tests both call it.
  - **"Prepared package validates":** `test.skip` when `packages/staunton-clarkerubber/` is absent.
  - **Phase 2 exit:** that test passes.
  - **`ui-check`:** add a `--until=plan` flag (steps 1–5 and 9–10) for the Phase 4 exit. The full run is part of the Phase 5 exit. The P6 table changes to match.
  - **P5.7:** replace it with one table, `AC | Phase | Method` (unit test / ui-check / manual in ncSender / manual in Rotary CAM), covering every AC. The P3 exits then say "the ACs listed for this phase in P5.7".

### [Issue 5] [`implementation-readiness`, `style`] — High (IR-B5): Range table
- **Scope:** [L790](Chess_Set_Creator.md#L790), L794, L1024
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:*** P4.5 step 1 becomes an explicit table of field, label, min and max.

  | Field | Label | Min | Max |
  |---|---|---|---|
  | `queenBase` | Queen base diameter | 15 | 100 |
  | `stockLength` | Stock length | 50 | — |
  | `stockWidth` | Stock width | 0.1 | — |
  | `chuckRes` | Chuck reservation | 0 | 200 |
  | `tailRes` | Tailstock reservation | 0 | 200 |
  | `gap` | Gap | 6.35 | 50 |
  | `neckDiameter` | Neck diameter | 3 | stockWidth |
  | `radialAllowance` | Radial allowance | 0 | 10 |
  | `maxBlankLength` | Max blank length | 100 | 2000 |

  - `neckDiameter` is not checked when `mode === 'cam'`.
  - Add this sentence: "The upper stock-length limit (max blank length) and the jaw-set ranges are checked only in step 3, so they get their own messages."
  - Add to the §5.1 Machine note: "valid 100–2000 mm".

### [Issue 6] [`implementation-readiness`, `codebase-details`] — High (IR-B6): Settings wipe
- **Scope:** [L894–895](Chess_Set_Creator.md#L894-L895)
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **`load()`** (for display): unchanged.
  - **`save(patch)`:**
    1. `GET`; if the response is not OK, throw `SettingsError(status)` and do not `PUT`.
    2. Merge the response over `DEFAULTS`, apply the patch, and `PUT`.
  - **UI:** catch the error and show *"Settings not saved (status). Your changes stay in this dialog."*
  - **New `tests/settings.test.js`:** when the GET fails, no PUT is sent; a nested `lastInputs` patch keeps `packages`.

### [Issue 7] [`codebase-details`, `implementation-readiness`, `style`] — Medium (IR-M1): Build scripts
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **P2 `build.mjs`:** list the full esbuild options:

    ```js
    {entryPoints:['src/index.js'], bundle:true, format:'iife', platform:'browser', target:['chrome110'], minify:true, legalComments:'eof', define:{__BUILD__}, outfile:'com.infield.chessset/lib/app.js'}
    ```

    It reads the version from `com.infield.chessset/manifest.json`, and its regex rewrites `com.infield.chessset/config.html`.
  - **`build.sh` order:** bump the patch number → `node build.mjs` → zip.
  - **Phase 3 exit:** "`./build.sh` produces…".

### [Issue 8] [`codebase-details`] — Medium (IR-M2): Manifest floors
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** ncCAM is the only reference plugin that uses the `gcode-files` routes, and it declares these floors. The shop runs v2.0.271, which is above both floors.
- ***Proposed Edit:***
  - **P2 manifest row and spec §6 tree:**
    - `minAppVersion "2.0.88"`
    - `platforms {"v2":"2.0.88","pro-v2":"2.0.149"}`
    - "no `repository` field in v1 (no update check)"
  - **Phase 0:** add step 0, "Record the ncSender edition and version (Settings → About)."

### [Issue 9] [`codebase-details`] — Medium (IR-M3): URL encoding
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **P2 `fm.js`:** "Every `?path=` value is `encodeURIComponent(path)` (ncCAM `app.js:858`); `file/save` sends the raw path in its JSON body (`app.js:845`)."
  - **P4.12:** "Query strings are parsed with `URL`/`URLSearchParams`."

### [Issue 10] [`codebase-details`] — Medium (IR-M4): `crypto.subtle`
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **P4.4 step 3, sha256 bullet:** "If `crypto.subtle` is undefined (plain HTTP on the LAN), skip the comparison and show the import note *'sha256 not checked: this connection is not secure.'*"
  - **`checkPiece`** takes `digest` as an injectable function, so the test can pass `undefined`.

### [Issue 11] [`codebase-details`, `implementation-readiness`] — Medium (IR-M5): Mock, harness and ui-check
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **New file `tools/harness.html`**, copied from ncCAM `dev/harness.html`, with the IDs changed.
  - **P4.12 mock:**
    - port **8777**;
    - serves the harness at `/` and `config.html` at `/api/plugins/com.infield.chessset/config-ui`;
    - rejects `..` in paths;
    - `POST /__mock/fail-save {after:n}` makes the n-th next save return 500;
    - stores only path and size for `.stl`, and full content for everything else;
    - the `x-mock-fail` header is removed.
  - **P5.8:**
    - `ui-check` starts the mock itself;
    - it launches `chromium.launch({executablePath: process.env.CSC_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})`;
    - step 2 uses `page.setInputFiles('input[webkitdirectory]', <abs path>)`;
    - step 4 expects `304.8 mm (12.00 in)`;
    - a new step 5b sets the width back to 50.8 mm;
    - step 8 calls `/__mock/fail-save`;
    - a new step 11 closes and reopens the dialog with zero page errors.

### [Issue 12] [`codebase-details`] — Medium (IR-M6): Phase 0 file types
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:*** add Phase 0 step 5b: "Save `.chess-set-creator/probe/x.stl.b64`, `x.json` and `LICENSE` with known text, read each back, and compare. If any differs or fails, set `STORE_SUFFIX = '.txt'` in `config.js` and append it to every stored package file name."

### [Issue 13] [`implementation-readiness`] — Medium (IR-M7): Knight rotation
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** Checked. With `(y, z) = r(sinθ, cosθ)`, the rotation that zeroes y is +θ.
- ***Proposed Edit:*** P4.11 step 3 becomes:
  > "rotate every vertex by +θ: `y' = y·cosθ − z·sinθ`, `z' = y·sinθ + z·cosθ`. Then assert that the top-40% mean has |y| < 0.01 and z > 0. Print θ. In Phase 2, confirm once in the preview that +Z is the face, not the mane. If it is the mane, use θ + π."

### [Issue 14] [`implementation-readiness`] — Medium (IR-M8): Weld retry
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:*** P4.11 step 4 becomes: "Whichever tolerance closes the mesh, the tool writes triangles rebuilt from the welded `verts`/`faces`, with degenerate faces dropped. It then re-runs `weld` + `closedCheck` at `WELD_TOL` on that output, and fails if the mesh is not closed."

### [Issue 15] [`implementation-readiness`] — Medium (IR-M9): Signatures and golden file
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **P2 rows:**
    - `exportJob({fm, call, plan, pkg, inputs, sides, jobName, onProgress}) → {folder, files}`. Here `call` is the Worker client.
    - `buildLayout({pluginVersion, pkg, inputs, plan, sides, mode, createdAt}) → object`
  - **P5.5:** the expected file `tests/fixtures/layout-12in.json` is written by hand from the §11 numbers. `layout.test.js` compares against it field by field, with `createdAt` fixed.

    | Blank | Pieces | x-ranges | Used | Leftover |
    |---|---|---|---|---|
    | 1 | K Q P | K 0–99.06, Q 109.06–195.42, P 205.42–260.03 | 260.03 | 0.32 |
    | 2–5 | (likewise) | | | |

### [Issue 16] [`implementation-readiness`] — Medium (IR-M10): AC-SIZE-01
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **P4.11:** add `--measure <file> --x0 <a> --x1 <b>`. It keeps only the triangles whose vertices all lie in `[a, b]`, then measures them.
  - **Phase 5 exit:** "AC-SIZE-01: measure the queen's x-range from `layout.json`."
  - **`blank.test.js`:** add the same check on a built KQP blank.

### [Issue 17] [`implementation-readiness`, `style`] — Medium (IR-M11): Planner errors
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **P4.5:** errors become `{code, field, role?, values}`. Values are in mm.
  - **Codes:**
    - `RANGE`
    - `NO_USABLE`
    - `TOO_LONG_FOR_MACHINE`
    - `JAW`
    - `TOO_WIDE`
    - `TOO_LONG`
    - `NECK_WIDER_THAN_BASE`
    - `NO_PACKAGE`
  - **`planview.js`:** holds one message template per code (the current texts, with `<name>` placeholders) and formats values with `fmt(v, primary)`.
  - **Output:** `warnings` is removed. When there are errors, the planner returns `{errors, scale, jawSet, pieces}` with no `blanks`.

### [Issue 18] [`implementation-readiness`, `style`] — Medium (IR-M12): Fixtures, switches and states
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **New file `tools/make-fixtures.mjs`** (Phase 1 for the meshes, Phase 2 for the packages). It writes:
    - `tests/fixtures/cube.stl` (10 mm, ASCII)
    - `cube-open.stl`
    - `cylinder-ascii.stl` / `cylinder-binary.stl` (r 5, length 20, along X)
    - `tests/fixtures/bad-packages/{missing-file, schema-2, shifted-axis, open-mesh, script-name}/`, copied from the prepared package with one change each (as in the report)
  - **`config.js`:** add `FM_HANDOFF = true`. Phase 0 step 2 sets it to `false` if Rotary CAM cannot open files from File Manager folders or cannot read ASCII STL.
  - **P4.10:** add the no-package state. When `lastPackage` is null, show only the Package section and an error box with *"Import a model package folder."*

### [Issue 19] [`style`] — Medium (IR-M13): Framing
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **L503:** "Approved by the owner on 2026-10-30, except D11 (licence)."
  - **L507:** "This table fixes every implementation decision except D5, D6 and `FM_HANDOFF`, which Phase 0 sets, and D11, which waits for the owner."
  - **Wording:** remove "tested", "proven" and "Code for both is small". Use the style reviewer's rewrites.
  - **L594 and L927:** "If Rotary CAM cannot open files from File Manager folders or cannot load ASCII STL (`FM_HANDOFF = false`)…"

### [Issue 20] [`codebase-details`, `implementation-readiness`] — Medium (IR-M14): Colour variable
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:*** P4.10 preview fill becomes `color-mix(in srgb, var(--color-accent) 35%, transparent)`. The reservations use `color-mix(in srgb, var(--color-text-secondary) 15%, transparent)`.

### [Issue 21] [`style`, all] — Low: grouped nits
- ***AI Suggestion:*** PROPOSE FIX for everything in the report's Nits section, **except** the two declined below.

  This includes:
  - `closedCheck(verts, faces)`
  - `ceilTo`
  - skip length checks when usable ≤ 0
  - path-rule-first in the manifest tests; no `sha256` in fixtures
  - exact B/N tie assertions
  - the pawn source for `blank.test.js`
  - the float `roundHalfUp` case
  - the `toExponential` note
  - "120.00 in"
  - the job-name formatting rule, plus a §5.8 note that the job name uses `roundHalfUp` with trailing zeros trimmed
  - throw after 999
  - the full `layout.json` in each ZIP
  - stop-on-failure during import
  - `.gitignore`
  - the `__INITIAL_CONFIG__` note
  - the D9 reuse note
  - port parsing in `config.html`
  - the `prepare-package` LICENSE path
  - Phase 0 cleanup and `base`
  - units on constants
  - the style wording fixes N1–N15

- **DECLINE:**
  - "Store only path and size in the mock": already covered in Issue 11.
  - "Pad the exponent to `e+00`": parsers accept both forms, so a note is enough.

### [Escalation] D11 — plugin licence
The plan needs one value. GPL-3.0 matches AAxis and ncCAM, but no file the reviewers could read records the owner's preference. **Owner input needed:** GPL-3.0, MIT, or something else.

---

**Apply order if accepted:** Issues 19 (framing) → 1 → 3 → 2 → 5 → 6 → 4 → 7–18 → 20 → 21, plus D11 once answered. I'll check the spec's modification time before editing. Afterwards I'll re-verify the §11 numbers and code fences, then offer the one allowed Stage 9 re-audit.
