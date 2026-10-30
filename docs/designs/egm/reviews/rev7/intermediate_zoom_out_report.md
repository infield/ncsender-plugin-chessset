# Stage 8: Intermediate Zoom Out Report

- **Target:** `Chess_Set_Creator.md` Revision 7, the whole file (lines 1–1390).
- **Reviewer:** egm-zoom-out, in a fresh context, applying `zoom-out-standard.md`. It had the Stage 5–7 reports as input.
- **Context supplied:**
  - `egm_context/ncSender` at commit `2f8a659`
  - `egm_context/ncsender-plugin-nccam` at commit `68a5ed8`
  - `egm_context/Staunton-Pieces` at commit `cef2c79`
  - the files the target links to
- **Date:** 2026-10-30.
- **Mode:** consolidated run. No fixes were applied between stages.

**Verdict: revise before building. Nothing blocks, but apply Stage 5's cuts before the Stage 6/7 fixes.**
- About half of the Stage 6/7 Majors go away once Z-M1–Z-M5 are applied.
- Several Stage 7 fixes would grow the parts that Stage 5 says to shrink.

| 🔴 | 🟡 | 🟢 |
|---|---|---|
| 0 | 2 | 2 |

---

## 1. What to do with each Stage 6/7 recommendation

| Finding | Action | Reason |
|---|---|---|
| C-B1 (fold in R-M1…R-M11) | **Merge with Z-M7 and Z-N5; apply after the cuts** | Several of the R-M findings disappear once Z-M1–Z-M5 are applied: the fflate sequence, async SHA-256, the Phase 0 outcomes and the read-back format. Fold in only what remains. |
| C-B2 (wrong test expectations) | **Take** | `shifted-axis` (line 1254): the expected error count depends on Z-M5. If the declared-vs-measured check moves to `prepare-package`, import gives 1 error; if not, 3. AC-FIT-03 (line 1283) gives 5 `TOO_LONG` errors either way. |
| C-M1 | **Merge into Z-M3** | It's the same fact: the route returns JSON `{content}`. |
| C-M2 / Z-N3 | **Take the cheaper option** | Keep checking each file name. Fix the citation and say plainly that the 404 log noise is accepted. Walking the tree would add a second response format to depend on. |
| C-M3 (async SHA-256) | **Drop** | Goes away when Z-M5 moves `sha256` to v2. |
| C-M4 (fflate sequence) | **Drop** | Goes away when Z-M2 replaces the ZIP fallback with "show the error and retry". |
| C-M5 (Phase 0 outcomes) | **Mostly drop** | Once Z-M1 and Z-M2 are in, keep one line: "both cut through → stop; the spec needs a revision." |
| C-M6 (mock not repeatable) | **Take, by reusing ncCAM** | ncCAM's `dev/serve.mjs:15` already returns `{configUI: html}` and keeps its store in memory (`saved = new Map()`). Base the mock on it and drop `.mock-store.json` (lines 643, 1190). |
| C-M7, C-M8 | **Take** | One line each. |
| C-N2 (`sidecar.js` missing from the §6 tree) | **Turn it around** | Delete the §6 tree (lines 370–395) and keep P2 as the only file list (Z-M7). |
| C-N5 (settings save race) | **Take, minimal** | Run saves one after another through a single promise chain. |
| C7-M1 | **Take, framed by Z-M1** | Rewrite the §7 row now as "pending O-2". After Phase 0, record the outcome and delete the branch that lost. |
| C7-M2 | **Take option 1 only; reject option 2** | Option 2 (ship both modes, with ACs for each) contradicts Z-M1. Add a short "Outcome A removes:" list that stays only until Phase 0 is done. |
| C7-M3 (one-tag rule) | **Take the cheaper option** | Change the rule on line 7 instead of splitting every item. Retag line 158 as [O-10]. |
| C7-M4 (sidecar in §7/§8/§9) | **Shrink; decide Z-M6 first** | Keep writing the sidecar: the owner asked for it, and the writer is small and pure. Move the reader rules and the "not chess-specific" goal (lines 289, 339–356) into a separate note for the Rotary CAM author. In this spec, add the sidecars to AC-EXP-01 and add one clause to R10 about misreading `chuckEnd`/`upAtZero`. |
| C7-M5 | **Merge into Z-M3** | — |
| C7-M6 (requirements with no AC) | **Take as traceability, not new ACs** | Those checks already have tests in P5.4/P5.6. Extend AC-FIT-03, AC-EXP-01 and AC-EXP-07 to point at them. Drop the inch-package AC (see A3). Drop the AC for the export gate: it's a process step and can't be tested. |
| C7-M7 (minimums round the wrong way) | **Take** | A real bug; the fix is one sentence. |
| C7-M8 (R2 server effects) | **Take the Impact text only** | Don't deliberately load a 38 MB STL on the shop server, because `lastLoadedFile` persists across restarts. The structural fix is O-7 (ask ncSender to check the extension on load). |
| C7-M9, C7-M10, C7-M11 | **Take** | Wording only. Mark Rotary CAM behaviour as "owner-reported" rather than opening new O-rows. |
| C7 package-lifecycle nit (D-N6) | **Defer to v2** | YAGNI for one owner-prepared package. |
| C7 nit: GitHub fetch as a §13 row | **Drop** | Lines 259–265 already cover it as v2. |

---

## 2. New findings at this level

### 🟡 A1. Export-only machinery is built before anyone knows export will work
- **Lines:** 226, 400, 735–747, 893–898, 914, 1387.
- **Problem:**
  - Planning needs only the measured dimensions, and those already live in settings (line 400).
  - Phase 3 still builds the mesh store: binary-to-base64 encoding, about 9 MB of saves, the Worker mesh cache, and `loadPackageMeshes`.
  - Once Z-M3 removes Phase 3's dependency on Phase 0, all of that lands before O-1 and O-2 are answered. Those two answers decide whether export happens at all.
- **Recommendation:**
  - Make Phases 1–4 a planning-only milestone. Import reads the manifest and measures the pieces; nothing is stored except settings.
  - Move mesh storage, or Z-M4's "re-pick the folder at export", into Phase 5.
  - This delivers blank counts and layouts with no dependency on Rotary CAM.

### 🟡 A2. The review loop itself is making the spec grow
- **Lines:** 5, 591–593.
- **Problem:** Revision 7 added §5.11, and each stage adds more rows, risks and ACs, while 11 known Majors are still open.
- **Recommendation:**
  - Freeze scope.
  - Apply the cuts first (Z-M1–Z-M6, A1), then fold in the fixes that remain, then do one re-review.
  - Move the revision history and the "open review findings" paragraph out of the spec.
  - Mark the plan "draft", not "approved", until that re-review is done.

### 🟢 A3. Packages in inches are speculative
- **Lines:** 192, 216, 851, 853.
- **Problem:** v1 has one package, in mm, prepared by the owner.
- **Recommendation:** accept only `units: "mm"` in v1 and move inch conversion to v2. That removes one manifest branch, one `checkPiece` branch and one proposed AC.

### 🟢 A4. The UI test setup is heavier than the pattern it cites
- **Lines:** 407, 677–679, 1172–1190, 1362–1378.
- **Problem:** AAxis item 15 describes a throwaway harness. The plan instead checks in a mock server, a harness, and an 11-step Playwright suite with failure injection.
- **Recommendation:**
  - Base the mock on ncCAM's `dev/serve.mjs` (in memory, about 40 lines).
  - With Z-M2 applied, drop ui-check step 8 and `/__mock/fail-save`.
  - Fix line 407 to match what is actually checked in.

---

## 3. Fix order

1. **Decide the scope cuts:**
   - Z-M1: build one support mode.
   - Z-M2: no ZIP fallback and no `FM_HANDOFF`.
   - Z-M3: hard-code the facts from source and shrink Phase 0.
   - Z-M5: minimal import in v1; SHA-256 moves to v2.
   - Z-M6: split out the sidecar reader rules.
   - A1: planning-only milestone.
   - A3: mm only.
2. **Run Phase 0** (O-1 and O-2 only). Then delete the branch it didn't select, from both §5.5 and §7.
3. **Fix the bugs:** C-B2 (written after the Z-M5 decision), C7-M7, C-M7 and C-M8.
4. **Fold in what remains:** the leftover R-M items, plus the reduced C7-M2, C7-M4 and C7-M6. Reuse ncCAM's `serve.mjs` for the mock (C-M6, A4).
5. **Bring P4 back up to module contracts,** with a single file tree (Z-M7).
6. **Wording passes:** C7-M3, C7-M9, C7-M10, C7-M11 and the nits.
7. **One re-review,** then mark the plan approved (A2).
