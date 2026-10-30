# Stage 9 — Implementation Readiness Report (re-review of Revision 8)

- **Target:** `docs/designs/egm/chess-set-creator.md` Revision 8 (snapshot `history/rev8.md`), DetailedRange lines 692–1363.
- **Reviewers:** three fresh-context reviewers, run in parallel:
  - egm-implementation-readiness (implementation-readiness standard; judged against the owner's "contracts, not code" level of detail, A8)
  - egm-codebase-details (implementation-readiness standard)
  - egm-style
- **Context supplied:**
  - the owner decision log
  - ncSender at `2f8a659`
  - ncCAM at `68a5ed8`
  - Staunton-Pieces at `cef2c79`
  - `../AAxis/`
- **Date:** 2026-10-30. This is Stage 9's one re-review after Revision 7.

| Reviewer | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| Implementation readiness | Not ready yet | 0 | 6 | 9 |
| Codebase details | Not ready | 2 | 3 | 10 |
| Style | Pass with minor edits | 0 | 1 | 17 |

**After removing duplicates:** 2 🔴, 8 🟡, grouped 🟢. For comparison, Revision 7's Stage 9 had 2 🔴 and 16 🟡, all resolved in Revision 8. Every finding below is a local text fix. None reopens a design decision.

**Orchestrator spot checks** (all confirmed):
- `config-ui` is `MapGet` (`PluginEndpoints.cs:140`).
- ncCAM's `freePath` adds only non-folder paths to `taken` (`src/ui/app.js:888`).
- `POST /api/gcode-files` (upload) calls `LoadFileAsync`, which makes the file the active program (`GcodeFileEndpoints.cs:51–53`).
- `POST /api/gcode-files/folders/delete` exists.

**Confirmed correct by the reviewers:**
- every other ncCAM, ncSender and AAxis citation
- the worked numbers (scale, x ranges, 143.6, 41.2, 30.48, covered tops)
- ncSender's update check takes the first `.zip` asset of the latest release (`PluginManager.cs:532–541`), so D14's separate package repository is the right call

---

## 🔴 Blockers

### R8-9-B1. `config-ui` is a GET that returns the raw file [codebase B1; readiness M4; also Stage 7 R8-7-N1]
- **Lines:** 1138, 1148–1150; spec §12 line 612.
- **Problem:** the host serves `GET /api/plugins/{id}/config-ui` and returns the file unchanged (`PluginEndpoints.cs:140–146`, `PluginManager.cs:433–440`). The placeholders are filled in only by `POST /api/plugins/tool-menu-items/execute`, which pushes the HTML over the WebSocket. The plan's mock serves POST with the port filled in, and ncCAM's harness sends GET, so the harness and the mock never meet.
- **Fix:**
  - §12: change the route to GET, returning the raw file.
  - Mock: serve GET, and fill in the port as the execute path does.
  - Add a ui-check that opens the dialog with the literal `__SERVER_PORT__` left in place. It must fall back to 8090.

### R8-9-B2. The mock discards the `.b64` package files that export reads back [codebase B2; readiness M3]
- **Lines:** 1142, against 1054 and 1348.
- **Problem:** ui-check step 9 fails with "Re-import the package", so the Phase 5 exit can never pass.
- **Fix:** keep the content of `.b64` files. Only `.stl` exports may drop content.

---

## 🟡 Major

### R8-9-M1. Free folder: ncCAM's walk looks only at files [codebase M1]
- **Line:** 714.
- **Problem:** a literal copy of ncCAM's walk never marks job folders as taken, so a second export overwrites the first. That breaks AC-EXP-02.
- **Fix:** taken names are the `name` of entries with `type === 'folder'` directly under `chess set`.

### R8-9-M2. Range checks hide the machine-length and jaw errors [readiness M1]
- **Lines:** 958, 962–963, 1246, 1251–1253.
- **Problem:** §5.1 gives stock length a range of "50 – max blank length" and stock width "inside a jaw set". As written, `RANGE` stops planning first, so `TOO_LONG_FOR_MACHINE` and `JAW` never fire.
- **Fix:** add a per-field `RANGE` table (field, label, min, max/none):
  - stock length: min 50, no max
  - stock width: greater than 0, no max

  Machine length and jaw fit are reported only through their own codes. Align the §5.1 wording to match.

### R8-9-M3. The "nearest" jaw width breaks the rounding rule [readiness M2]
- **Line:** 1251.
- **Problem:** 22.86 shown as "22.9" is outside the standard jaw range.
- **Fix:** round down when the nearest width is an upper bound (22.8), and up when it is a lower bound. Correct the test.

### R8-9-M4. No contract for what the UI does when settings fail [readiness M5]
- **Lines:** 1027–1035.
- **Problem:** nothing reads `offline`. There is no `SettingsError` message. If the first GET fails, the first-run setup shows and its save fails too.
- **Fix:**
  - Show a banner: "Settings unavailable (<status>); changes in this dialog won't be kept."
  - Planning is still allowed, with `DEFAULT_MACHINE`.
  - The setup screen stays open with the error.

### R8-9-M5. No validation contract for machine settings [readiness M6]
- **Lines:** 1079, 1086.
- **Problem:** nothing defines who checks max blank length (100–2000), 1–4 jaw sets, or 0 ≤ min < max ≤ 300. Nothing says whether names must be unique, whether ranges may overlap, or whether settings save on Save or on every keystroke.
- **Fix:**
  - Add `validateMachine(machine) → errors` in `settings.js`, with tests in P5.4.
  - Names must be non-empty and unique.
  - Overlapping ranges are allowed; the first match wins.
  - The Machine section saves only through a **Save** button, and only when it is valid.

### R8-9-M6. Phase 0 steps 2 and 5 leave the method open [codebase M2]
- **Lines:** 787, 790.
- **Problem:** step 2 doesn't say how to get the STL file into ncSender. The obvious path, the File Manager upload, both rejects `.stl` in its picker and loads the uploaded file as the active program (R2).
- **Fix:**
  - **Step 2:** give a console snippet. A temporary `<input type=file>` reads the file, then `file/save` stores it. Warn against using upload.
  - **Step 5:** use `POST /api/gcode-files/folders/delete {path}`.

### R8-9-M7. An icon with `fill="currentColor"` renders black inside `<img>` [codebase M3]
- **Line:** 755.
- **Problem:** ncSender draws plugin icons with `<img>` (`ConsolePanel.vue:142`), where `currentColor` doesn't pick up the theme colour.
- **Fix:** use explicit colours, as AAxis `icon.svg` does.

### R8-9-M8. "Stop and raise it" is ambiguous [style M1]
- **Line:** 786.
- **Fix:** "If it is below the D13 floor (2.0.88; Pro 2.0.149), stop and upgrade ncSender before continuing."

---

## 🟢 Nits (grouped)

**Contracts and tests**
- **`checkPiece` errors:** use items of the form `{check, value, limit}`, so the UI can render `file — check — value` (1046–1049).
- **`LICENSE` reads back as `null`:** reuse the "Re-import the package" error (1066).
- **`downloadFiles`:** await each download, or require one user click per file. Never fire a burst. Ties to Stage 7 R8-7-M3 (1072).
- **`lastInputs` debounce:** flush it when the dialog closes, and make ui-check step 7 wait more than 1 s (1038, 1346).
- **`settings.test.js` timing:** it doesn't exist until Phase 3. Reword "skip" in the Phase 1 exit (810).
- **P5.5 blank tests that need the package:** give them the P5.3 skip guard and the `--x0/--x1` filtering rule (1270, 1273).
- **`defaultJobName`:** whole mm, rounded half up (304.8 → 305) (1060).
- **`script-name` fixture:** it shares `id@version` with the real package. Give it version `9.9.9` (1347).
- **STL buffer guard:** check `byteLength ≥ 84` before reading the count at offset 80 (886, 1194).
- **Worker messages:** post `{...args, id, type}`, as ncCAM does (728).
- **Plugin update without a page reload:** reset the cached engine when `build` changes (729).
- **Mock gaps:** add the host's `400` for a missing path or content, and its null-path cases (1143).

**Accuracy and repo**
- **`.gitignore`:** it already has `node_modules/`. Remove `.mock-store.json` and add `tests/fixtures/bad-packages/` (748).
- **`LICENSE` source:** it is at `<src>/../../LICENSE`, the Staunton-Pieces root (1127).
- **Chrome path:** name the exact default path, or use `channel:'chrome'` (1335).
- **`toolMenu` entry:** give it in full: `{"id":"open-config","label":"Chess Set Creator","icon":"icon.svg","clientOnly":true}` (752).
- **Versioning:** note that publishing 0.1.x publicly departs from AAxis item 5, which reserves public sharing for `1.0.0` (723).
- **Optional — `__INITIAL_CONFIG__`:** it could replace the first settings GET (753).
- **Optional — reuse:** ncCAM's `dev/reopen-check.mjs` for step 7; `.scripts/release.sh` and the release and test workflows for D14 and CI.

**Wording (style)**
- **Status block:** "except where noted" names no exceptions, and "not re-reviewed yet" will go stale (694–697).
- **Table header:** P2's second column has no header (746).
- **Unclear phrases:**
  - "A usable blank calculator" (779)
  - "O-1 is no" (798)
  - "knight's face" → "facing direction" (816, 1132)
  - "the rest of the form" (841)
  - "on its release" (847)
  - "a selector is v2" (1081)
- **Sentences to rewrite:**
  - 892 (string building)
  - 895 (call-stack limit)
  - 925 and 928 (path rule, then presence)
  - 972 (state the optimality claim as a requirement P5.4 checks)
- **Missing specifics:**
  - a single-side card title example (1095)
  - "same plans as 2 in" (1237)
  - name the timing machine, or call the limit advisory (1258)
  - the AC-EXP-08 wording (1329)
- **Consistency:**
  - **Download files** in bold everywhere
  - one form: "acceptance criteria" or "ACs"
  - "tailstock", not "tail" (1247)
  - lowercase "outcome"
  - contractions (optional)

---

## Traceability

| Consolidated | Readiness | Codebase | Style | Stage 7 |
|---|---|---|---|---|
| R8-9-B1 config-ui GET | M4 | B1 | — | R8-7-N1 |
| R8-9-B2 mock `.b64` | M3 | B2 | — | — |
| R8-9-M1 free folder | — | M1 | — | — |
| R8-9-M2 range vs codes | M1 | — | — | — |
| R8-9-M3 nearest rounding | M2 | — | — | — |
| R8-9-M4 settings failure UI | M5 | — | — | — |
| R8-9-M5 validateMachine | M6 | — | — | — |
| R8-9-M6 Phase 0 method | — | M2 | — | — |
| R8-9-M7 icon colour | — | M3 | — | — |
| R8-9-M8 "raise it" | — | — | M1 | — |
| Nits | N1–N9 | N1–N10 | N2–N18 | R8-7-M3 |
