# Stage 8 — Intermediate Zoom Out Report

- **Target:** `Chess_Set_Creator.md`
- **Reviewer:** egm-zoom-out (fresh context), Zoom-Out Standard
- **Reviewed against:** Revision 3 (476 lines; now `_archive/Chess_Set_Creator_2026-10-30_rev3.md`)
- **Context supplied:** ncCAM, Staunton-Pieces, `../AAxis/CLAUDE.md`, and the Stage 5 `zoom_out_report.md`
- **Date:** 2026-10-30

> **Revision note (orchestrator):** the owner saved **Revision 4** (482 lines) while this review was running. Line numbers below refer to Revision 3. The column "Status in Rev 4" compares each finding with the Revision 3 → 4 diff.

**Verdict: no blockers; 2 Major, 6 Nit.** The spec still targets the root problem: a repeatable stock plan plus one STL per blank for Rotary CAM. Most Stage 5 concerns are resolved. Two things remain:
1. The riskiest assumption, the Rotary CAM handoff, is held back by a gate instead of being tested.
2. Package import has gained validation and versioning machinery that a single user with one self-prepared package hasn't shown a need for.

---

## 🟡 Major

### Z-M1. The handoff is gated, not tested, so most of the design rests on open questions
**Scope (Rev 3):** L153 (gate), L79, L155, L161–162, R1/R10, O-1/O-2/O-10, AC-EXP-04

**Problem:** The gate stops only `exporter.js` from being built. Four other parts depend on the same answers and would be built first:
- the package frame (§5.6)
- the `layout.json` format and the per-blank card
- the overlapping-shell decision (§7)
- the reasoning for storing exports as ASCII

If O-2 comes back "No", the plugin needs a mesh kernel. If Rotary CAM measures position from the stock end, the frame and reservation model change.

**Recommendation:** Make a handoff spike step 0, before any plugin code:
1. Build one 12 in blank by hand as an ASCII STL (pieces plus overlapping neck cylinders, in the §5.5 frame).
2. Save it with `POST /api/gcode-files/file/save` from the browser console.
3. Open it in Rotary CAM, simulate, and note where the part sits relative to the chuck.

That answers O-1, O-2 and O-10 in about an hour, and the same file doubles as the R3 prototype blank. Then replace the gate with the measured facts.

**Status in Rev 4: partly addressed.**
- O-10 is partly answered by the owner. Rotary CAM places the part and makes the holding tabs, and O-10 no longer blocks the exporter. Tab and neck lengths remain open.
- O-4 now names a 12 in test blank as the way to settle the neck and gap.
- **Still open:** O-1 and O-2 still block the exporter, and the spec doesn't yet say that the 12 in test blank should also answer O-1 and O-2. The cheap fix is to make the O-4 test blank the spike: save it through the File Manager and open it in Rotary CAM before any plugin code is written.

### Z-M2. Package import does more than one self-prepared package needs, and keeps two sources of truth
**Scope (Rev 3):** §5.6 L169–212, L110, L301, L220, L179, L196, R11, AC-SEC-01, AC-PKG-03

**Problem:**
- **Dimensions are both declared and measured.** The manifest declares every dimension, the plugin measures them again, and import is rejected if they differ by more than ±0.1 mm (check 4). The spec also uses both sources: L110 scales from the *measured* queen base, while L301 plans from the *manifest* dimensions. That is two sources for the same numbers.
- **Versioning only v2 uses:** the semver pattern, the `<id>@<version>` storage path and `sha256` are all v1 cost for v2 features.
- **A hostile-author security model** (R11, AC-SEC-01), although the only package author is the user.

Together these bring back the Stage 5 M1 infrastructure concern through validation.

**Recommendation:**
- Keep only what can't be measured in the manifest: file mapping, `units`, `frame`, licence and attribution, and display name.
- Measure all dimensions on import, store them with the installed package in settings, and plan from those. Drop the declared dimension fields and check 4. Appendix B records the measured values.
- Keep checks 1, 2 and 5. Check 3 (weld plus closed mesh) can stay, but it pays off mainly during package preparation.
- Drop the semver pattern, the `@<version>` path and `sha256` from v1, and add them with v2 distribution. Store packages under `.chess-set-creator/sets/<id>/`.
- Keep `textContent`, since it costs nothing. Reduce R11 and AC-SEC-01 to a one-line note, or move them to v2.

**Status in Rev 4: unchanged.**

> Elephant note: several of these items were added by the Stage 7 resolution (Issues 3 and 5) at the critics' request. This finding pulls in the opposite direction. The tension is real: the critics judged the spec against a v2 threat model, and this reviewer judges it against v1 scope. The owner should choose. A middle path keeps `textContent` and path validation (cheap, and needed for v2 anyway) and drops the declared dimensions and the `@<version>` path.

---

## 🟢 Nits

| # | Finding | Status in Rev 4 |
|---|---|---|
| N1 | **Download ZIP fallback** (fflate, one side at a time, AC-EXP-07). Build it only if the spike shows O-1 needs it; until then, retrying into a new folder is enough. | Unchanged |
| N2 | **Web Worker.** Nothing has measured the main thread as a bottleneck. Mark it [P] "if export freezes the dialog", or justify it with a measurement. | Unchanged |
| N3 | **Max blank length** was a check against an unmeasured guess (O-3). | **Resolved.** O-3 closed at 36 in (914.4 mm) [C]. |
| N4 | **Implementation detail in the spec:** the settings read-modify-write steps, STL decimal places, the job-name character set, the `< 100 ms` claim, and the `src/` file tree. These belong in the implementation plan. | Unchanged |
| N5 | **Dot-folder inconsistency.** §12 says the tree hides dot-*files*, but §5.7 asks the reader to confirm that dot-*folders* are hidden too, and gives a fallback path inline. Settle it with one check of the source. R2 depends on the answer. | Unchanged |
| N6 | **Citation.** "`../AAxis/CLAUDE.md`, item 45" refers to line 45, not a numbered item. Cite the section heading instead. | Unchanged. *Elephant: I introduced this error in the Revision 3 edit.* |

---

## What was earned (no action)
- **Exact search with ordered tie-breaks.** The search space is tiny, the result is a provable minimum, and the determinism is needed for AC-PLAN-01.
- **2-D SVG preview** instead of three.js. The layout question is one-dimensional.
- **Browser-only runtime, `events: []`.** This matches the AAxis conventions and avoids the Jint quarantine risk.
- **Free-folder check, with `layout.json` written last.** This reuses ncCAM's `freePath()` pattern.
- **Non-goals list, and the build notes moved to their own file.**

**Reuse check:** ncCAM has no STL parser or writer, and its only Worker is its own CAM engine. The proposed `stl.js` and `measure.js` don't duplicate anything in the context repos.

---

## Stage 5 findings: current status (Revision 4)

| Stage 5 | Topic | Status |
|---|---|---|
| B1 | Unknown consumer; STL storage | **Mostly resolved.** Rotary CAM is named, storage is verified (§12), and placement and tabs are answered by the owner. O-1 and O-2 are still open (Z-M1). |
| M1 | Package and distribution over-scoped for v1 | **Mostly resolved.** The v1/v2 split is in place. Some v2 machinery is still in v1 (Z-M2). |
| M2 | Storage relied on an unverified API | **Resolved.** Leftover: the dot-folder question (N5). |
| M3 | Reuse ncCAM integration patterns | **Resolved.** |
| M4 | Same contract written three times, and drifted | **Resolved.** |
| M5 | Confirmed items contradicted open ones | **Resolved.** |
| N1 | Implementation detail in the spec | **Partly resolved** (N4). |
| N2 | Hedging about packing | **Resolved.** |
| N3 | Unclear model source | **Resolved.** |
| N4 | Deferred items scattered | **Resolved.** |
| N5 | Appendix bloat | **Resolved.** |
