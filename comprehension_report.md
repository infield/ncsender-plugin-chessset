# Stage 6: Comprehension Test Report

- **Target:** `Chess_Set_Creator.md`, Revision 7.
  - FeatureRange: lines 1–588.
  - DetailedRange: lines 589–1390.
- **Reviewer:** egm-comprehension, in a fresh context, applying `re-implementation-standard.md`.
- **Context supplied:**
  - `egm_context/ncSender` at commit `2f8a659`
  - `egm_context/ncsender-plugin-nccam` at commit `68a5ed8`
  - `egm_context/Staunton-Pieces` at commit `cef2c79`
  - the files the target links
- **Date:** 2026-10-30.
- **Mode:** consolidated run; no fixes were applied between stages.

**Verdict: FAIL.** A builder could rebuild the core logic from this document: sizing, fit checks, packing, STL I/O, manifest checks, the sidecar and `layout.json`. The reviewer checked the following by hand, and they hold:
- the §11 arithmetic
- AC-FIT-01 and AC-FIT-04
- the covered tips
- the length of the two-pawn test blank
- the D8 rounding cases

The document still fails, for three reasons:
- The plan says it has unfixed defects, but they are listed only in a report that isn't where the plan points.
- Two test expectations are wrong.
- Several contracts are deferred to "Phase 0 results" or rest on wrong references.

| 🔴 | 🟡 | 🟢 |
|---|---|---|
| 2 | 8 | 8 |

---

## 🔴 Blockers

### C-B1. Known defects are deferred to a report the plan doesn't link correctly
- **Lines:** 591–593; also 5 and 553.
- **Problem:** The plan says 11 Stage 9 Majors (R-M1 to R-M11) are still open and that it "has not been re-reviewed". It tells the builder to fix each one "before or during the phase it affects". It summarises only 8 of them, with no fixes.
- **Note:** the Stage 9 report that line 593 cites, and the reports cited at lines 5 and 553, were moved to `_archive/reviews_before_rev7/` just before this run, so that this run's reports wouldn't overwrite them. That move caused the "missing file" part of this finding. The underlying problem stands either way: the open defects are not written into the plan.
- **What a builder must guess:** what R-M1 to R-M11 are, and how to fix them.
- **Fix:** fold every fix into P1–P5, point the citations at `_archive/reviews_before_rev7/`, and drop line 593.

### C-B2. Two test expectations are wrong, as line 593 already admits
- **Lines:** 1283 and 1254.
- **AC-FIT-03:** 100 mm stock gives a usable length of 55.55 mm, so K, Q, B, N and R all produce `TOO_LONG`. That is five errors, not just the king. Only the pawn (54.61 mm) fits.
- **`shifted-axis`:** moving the pawn 0.5 mm in Y fails the axis-offset check. It also adds about 1.0 mm to the measured base and swept diameters, because those are taken about the origin. That is three errors, not one.
- **What a builder must guess:** whether to write the tests as stated, which will fail, or to change them.
- **Fix:** state the exact set of errors each test expects.

---

## 🟡 Major

### C-M1. The read-back format is deferred to Phase 0, but the source already answers it
- **Lines:** 665, 701–703, 1184.
- **Problem:** `fm.readText` and the mock's GET are written against "the Phase 0 format". At commit `2f8a659`, `GET /api/gcode-files/file` already returns `Results.Ok(new ContentResponse(content))`. That is JSON `{content}`, assuming the default camelCase. A missing file returns 404 with `"File not found"` (`GcodeFileEndpoints.cs:105–112`, `ApiResponses.cs:50`).
- **Fix:** state this contract in the plan. Keep Phase 0 step 5 only as a confirmation.

### C-M2. The "ncCAM free-path probe" reference is stale
- **Lines:** 238, 609, 665.
- **Problem:** At ncCAM commit `68a5ed8`:
  - `src/ui/app.js:854–862` is `flash` and `loadProgram`.
  - ncCAM's `freePath` (`src/ui/app.js:883–895`) uses a single tree listing. Its comment says it stopped probing per file name because every free name logged a 404.
  - The citations `app.js:858` and `app.js:845` are also wrong, and the file path is `src/ui/app.js`.
- **Fix:** correct the citations and drop "same as ncCAM", or state that the 404 noise is accepted on purpose.

### C-M3. `checkPiece` is called pure and synchronous, but SHA-256 is asynchronous
- **Lines:** 848 vs 893; 855 vs 202.
- **Problem:**
  - `crypto.subtle.digest` is async, so the return type (a Promise or not) is undefined.
  - Line 855 has `declared.sha256` per piece role, but the manifest has `sha256` as a top-level map keyed by file name (line 202).
- **What a builder must guess:** the async signature, and how to look up a piece's hash.

### C-M4. The fflate streaming sequence is incomplete
- **Lines:** 1053–1057.
- **Problem:** The steps leave out:
  - `zip.ondata` collecting the chunks into a Blob
  - `zip.add(entry)`
  - `zip.end()`
  - how to wait for completion before creating the object URL

### C-M5. Not every Phase 0 outcome has a path
- **Lines:** 703–711.
- **Problem:**
  - "Both cut through → stop and add an open question" leaves nothing to build.
  - `FM_HANDOFF = false` hides the export button, yet AC-EXP-01/02 and ui-check steps 6–8 still expect a File Manager export. The expected results in that mode aren't defined.

### C-M6. The mock and ui-check aren't repeatable
- **Lines:** 1178, 1189–1190.
- **Problem:**
  - `.mock-store.json` persists between runs. On the second run, the step 6 count ("10 STLs") and the step 7 `(2)` folder both change.
  - The real `config-ui` route is a POST that broadcasts `plugin:show-dialog` and fills in placeholders (`PluginEndpoints.cs:119–131`). The mock serves it as a GET returning HTML, and the response shape the harness expects isn't stated.

### C-M7. Versioning contradicts itself
- **Lines:** 646 and 778, vs D12.
- **Problem:**
  - Every `build.sh` run bumps the patch number, so the first build ships 0.1.1, not 0.1.0.
  - Phase 6 sets 0.2.0 and then runs `build.sh`, which produces 0.2.1.
- **Fix:** say whether the bump happens before or after a version is set by hand.

### C-M8. The `layout.json` shape for both sides is ambiguous
- **Lines:** 1002–1025 and 1316–1324.
- **Problem:**
  - The example shows maple only. For both sides, is it 10 `blanks` entries, maple 1–5 then walnut 1–5, with `index` restarting for each side?
  - Is `layout-12in.json` for one side or both? The P5.5 table lists 5 blanks.

---

## 🟢 Nits

- **C-N1.** Lines 398 and 418: "AAxis `CLAUDE.md`, item 45" refers to line 45 of that file, not a numbered item. Items 5, 9, 10 and 15 do check out.
- **C-N2.** `src/sidecar.js` is missing from the §6 file tree (lines 370–395) and from the Phase 5 file list (lines 757–763). It is listed in P2 (line 662).
- **C-N3.** Line 1037: the job-name error message leaves out `x`, which §5.8 and the regex allow. The `x` in the regex is redundant anyway.
- **C-N4.** Lines 1132–1138: the preview doesn't give the vertical position of the centre line for piece outlines and necks (presumably `stockWidth/2`), or how far each neck extends along X.
- **C-N5.** Lines 1086–1090: settings saves read, merge and then write back (GET, merge, PUT), and two of them can run at once without being serialised. The debounced `lastInputs` save can run during an import's `packages` save, so an installed-package entry can be lost.
- **C-N6.** Lines 667 and 914: the source of the Worker cache `key` isn't stated. Presumably it is `id@version`.
- **C-N7.** Line 436 vs line 577: "queen offset 66 mm in X" is relative to the other pieces; Appendix B gives the absolute value, X 80.9. Say which is meant.
- **C-N8.** Line 617: D11 (the licence) is still pending the owner, so `LICENSE` and `package.json` can't be finalised.
