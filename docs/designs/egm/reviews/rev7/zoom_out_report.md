# Stage 5: Initial Zoom Out Report

- **Target:** `Chess_Set_Creator.md`, Revision 7, the whole file (lines 1–1390). FeatureRange is lines 1–588; DetailedRange is lines 589–1390.
- **Reviewer:** egm-zoom-out, fresh context, applying `zoom-out-standard.md`.
- **Context supplied:**
  - `egm_context/ncSender` at commit `2f8a659`
  - `egm_context/ncsender-plugin-nccam` at commit `68a5ed8`
  - `egm_context/Staunton-Pieces` at commit `cef2c79`
  - files the target links to
- **Date:** 2026-10-30
- **Mode:** consolidated run. No fixes were applied between stages.

**Verdict: needs revision; no blockers.** The goal and root problem are clear. Most findings fall into three groups:
- v1 builds both branches of decisions that Phase 0 settles before any export code is written.
- The spec hedges on facts the pinned ncSender source already answers.
- The implementation plan goes into code-level detail.

**Orchestrator spot check:** at commit `2f8a659`, `GcodeFileService.BuildTree` skips both folders and files whose names start with `.`. This confirms M3's dot-folder claim.

| 🔴 | 🟡 | 🟢 |
|---|---|---|
| 0 | 7 | 5 |

---

## 🟡 Major

### Z-M1. Both support modes get built when only one is needed (YAGNI)
- **Lines:** 156, 160–163, 611 (D5), 953, 966–968, 1025, 1107, 1308–1314, 1389
- **Problem:**
  - §5.5 says the exporter waits for the O-2 answer, and P6 runs Phase 0 (which answers O-2) before Phase 5. Even so, D5 says both code paths are built, with a constant choosing between them.
  - That `SUPPORT_MODE` flag runs through range checks, neck checks, covered tips, `blank.js`, `layout.json`, the UI and the tests. Half of that code will never run.
- **Contradiction:**
  - §7 (line 420) rejects "separate bodies with empty gaps", but §5.5 (line 161) calls that option, outcome A, "preferred if available".
  - Line 421's "Revisit if O-2 is 'No'" doesn't match the A/B framing.
- **Recommendation:** Build only the branch Phase 0 selects, and drop `SUPPORT_MODE`. Rewrite the §7 rows at lines 420–421 to match §5.5.

### Z-M2. Two export paths and a ZIP library for a rare failure (YAGNI)
- **Lines:** 253, 402, 615 (fflate), 709, 1051–1057, 1126–1130, 1375
- **Problem:**
  - `FM_HANDOFF` keeps two paths alive after Phase 0 has picked one.
  - The fallback for a failed save is a streaming fflate ZIP, built per side. That's a lot of machinery for one user saving to a local server.
  - Line 252 already defines a retry into a new free folder.
  - The "incomplete fflate ZIP sequence" is one of the 11 Stage 9 Majors still listed as open (line 593).
- **Recommendation:** Build the ZIP path only if Phase 0 sets `FM_HANDOFF = false`. Otherwise a failed save shows the error and offers a retry. That removes a dependency, ui-check step 8, and part of AC-EXP-07.

### Z-M3. Phase 0 re-tests facts the pinned source already settles
- **Lines:** 226, 612 (D6), 654, 665, 701–707 (Phase 0 steps 5–7), 1184
- **Problem:** At commit `2f8a659`, the source already answers these:
  - The tree hides dot-folders: `GcodeFileService.cs:323`.
  - `GET /api/gcode-files/file` always returns JSON `{content}`: `GcodeFileEndpoints.cs:105–112`.
  - Saving and reading don't filter by extension: `WriteAllTextAsync` / `ReadAllTextAsync`, and `SafePath.GetSafePath` rejects only `..` and paths that escape the folder.
- **Recommendation:**
  - Fix `PACKAGE_ROOT = '.chess-set-creator/sets'`.
  - Delete `STORE_SUFFIX` and the content-type branching in `fm.readText`.
  - Record all three as §12 facts.
  - Cut Phase 0 down to the Rotary CAM tests (O-1, O-2), plus one smoke check that v2.0.271 behaves like the pinned commit.

### Z-M4. Copying the package into the File Manager adds a storage subsystem
- **Lines:** 226, 230, 400, 416, 893–898, 914, 667 (`loadPackage`)
- **Problem:** Planning uses only measured dimensions, which are already kept in settings (line 400). Only export needs the meshes. Even so, v1 adds:
  - re-encoding as binary
  - about 9 MB of base64 text in a hidden folder
  - six saves, with handling for partial failure
  - `toBase64` and `fromBase64`
  - a mesh cache in the Worker
  - the R2 exposure for stored meshes
- **Recommendation:**
  - Weigh a simpler option: keep the measurements in settings, and have the user re-pick the package folder at export. It still works offline (AC-PKG-04).
  - If one-time import is kept, record the trade-off in §7. Today §7 compares it only with ASCII and IndexedDB.

### Z-M5. Package validation is duplicated and guards a threat v1 doesn't have
- **Lines:** 179–218, 202, 607 (D1), 848–881, 1158–1168, 441 (R11), 451 (AC-SEC-01), 1207, 1376
- **Problem:**
  - v1 has one package, which the owner prepares with `prepare-package.mjs`. That tool already welds, checks the mesh is closed, measures, and writes the declared dimensions.
  - Import then repeats all of it and compares the result with numbers the same tool wrote from the same measurements. The check is circular, and D1 confirms the declared values are used for nothing else.
  - SHA-256 and the untrusted-package defences (R11, AC-SEC-01) only matter once strangers supply packages, which is v2.
- **Recommendation:**
  - v1 import: parse a minimal manifest, apply the path rule, parse the STLs, measure, and check the frame.
  - Move the closed-mesh check and the declared-vs-measured comparison into `prepare-package` only.
  - Defer `sha256` and the declared dimensions to v2.
  - Keep `textContent`; it costs nothing.

### Z-M6. §5.11 designs another plugin's interface in this spec
- **Lines:** 283–364, 662, 1048, 472 (AC-EXP-08), 1331
- **Problem:**
  - §5.11 defines a general format for any rotary plugin ("any plugin that writes a rotary part can use it", line 289).
  - It also sets reading rules for Rotary CAM, which is unreleased and whose author hasn't agreed to read the file (O-13).
  - The per-blank values largely repeat `layout.json` (stock, reservations, used length), so there are two records to keep in sync.
  - The generality requirement is speculative.
- **Recommendation:**
  - Move the format and reader rules into a separate proposal for the Rotary CAM author.
  - In this spec, keep only "write a per-blank setup file once the format is agreed". Until then, the per-blank card and `layout.json` give the user the values.
  - If the sidecar stays in v1, drop the "not chess-specific" goal, and generate it from the same blank record as `layout.json`.

### Z-M7. The plan drops to code level, and that detail is producing defects
- **Lines:** 614 (rounding epsilons), 645 (esbuild flags), 648 (loader script), 654 (constants), 786–846 (slice sizes, 10,000-facet chunks, `e+0` vs `e+00`), 1065–1090, 1132–1139 (CSS `color-mix` strings), 1151–1157 (rotation formulas), 1364 (Chrome path)
- **Problem:**
  - Several things are described twice: the §6 file tree (lines 370–395) and P2, §5.8 and P4.8, and the settings PUT mechanics in the §5.7 table (line 227).
  - Line 593 records 11 open Stage 9 Majors, mostly at this level of detail (the fflate sequence, wrong test expectations, `build.sh` bumping). The plan "has not been re-reviewed since".
- **Recommendation:** Reduce P4 to module contracts (inputs, outputs, invariants, error codes) plus the P5 test expectations, and let the code and tests be the source of truth. Keep the file tree in one place.

---

## 🟢 Nit

- **Z-N1. The Worker is an unproven optimisation** (lines 401, 608, 621–635, 667).
  - Planning never touches meshes; only import and export do, and both are one-shot actions with a progress line.
  - The page fallback means both paths are kept anyway.
  - Consider dropping the Worker in v1 and yielding control between blanks instead.
- **Z-N2. The units toggle doesn't follow the host's pattern** (lines 87, 1067, 1098).
  - ncCAM follows ncSender's own unit setting: `unitsFrom(settings.unitsPreference)`, in `src/core/units.js:2–4` and `ui/app.js:75`.
  - Use the host setting, and drop the plugin's `displayUnit` setting and toggle.
- **Z-N3. D3 cites ncCAM incorrectly** (lines 238, 609).
  - ncCAM's `freePath` walks the `/api/gcode-files` tree once (`app.js:886–892`). It doesn't probe file by file, and the cited lines 854–862 are actually `loadProgram`.
  - The claim that the tree's response shape is "unverified" is also wrong: ncCAM relies on it.
  - Reuse the one-call tree walk, or correct the citation and the reasoning.
- **Z-N4. The spec contradicts its own conventions.**
  - Line 368 says "all UI and logic in `config.html`" (AAxis item 1), but the architecture bundles `lib/app.js` the way ncCAM does.
  - Line 407 says the test harness "is not checked in", but P2 checks in `tools/harness.html`, the mock server and `ui-check.mjs`.
  - State the deviation from AAxis once.
- **Z-N5. Approval status** (line 593). The plan is marked "approved" with 11 known Majors still open. For example, line 1283 expects a single `TOO_LONG` error, while line 593 says AC-FIT-03 produces 5. Fold in the simplifications above before re-reviewing, instead of patching each Major separately.

---

## Kept as is

These are suitably simple:
- the focus on the root problem (§1–§2)
- exact-search packing
- the 2-D SVG preview
- ASCII export
- the free-folder check
- writing `layout.json` last
