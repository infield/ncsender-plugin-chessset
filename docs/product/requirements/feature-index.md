# Feature index

This index maps each product feature to the place where the spec defines it. It adds no requirements. Every entry links into the authoritative spec, [`chess-set-creator.md`](../../designs/egm/chess-set-creator.md), and the current review findings in [`rev7/consolidated_review_report.md`](../../designs/egm/reviews/rev7/consolidated_review_report.md). If this index and the spec disagree, the spec is right.

**Status vocabulary:** Discovery needed · Product decision needed · EGM design needed · EGM review needed · Ready for engineering · In implementation · Ready for validation · Complete · Deferred to v2.

**Owner decisions of 2026-10-30** (A1–A8, DISC-2/3/4/6/8; see [`../decisions/product-decisions.md`](../decisions/product-decisions.md)) are made but **not yet written into the spec**. "EGM design needed (Rev 8)" means the decision exists and the spec revision doesn't yet.

| ID | Feature | Spec sections | Acceptance criteria (§9) | Plan (phase · modules, P2/P3) | Open findings, questions, decisions | Status |
|---|---|---|---|---|---|---|
| F1 | Sizing from queen base diameter | §5.2; §11 | AC-SIZE-01 | Phase 1 · `src/planner.js`, `src/units.js` | X-M3 (rounding of minimums) | EGM review needed (minor) |
| F2 | Stock fit: width, length, jaw sets | §5.3; §5.1; §5.10 | AC-FIT-01 … 04 | Phase 1 · `src/planner.js` | X-B2 (AC-FIT-03 expectation), X-M3; O-12. Decided: DISC-3 (jaw ranges as machine settings), DISC-4 (first-run setup) | EGM design needed (Rev 8: write in DISC-3/4) |
| F3 | Blank planning (exact packing per side) | §5.4; §11 | AC-PLAN-01 … 04 | Phase 1 · `src/planner.js`; `src/layout.js` (Phase 5) | X-M6 (`layout.json` shape). Decided: DISC-2 (generic light/dark) | EGM design needed (Rev 8: write in DISC-2), then minor fixes |
| F4 | Model package import and validation | §5.6; §5.7; §5.10 | AC-PKG-01 … 04, AC-SEC-01 | Phase 3 · `src/manifest.js`, `src/package.js`, `src/measure.js`, `src/stl.js` | X-M1, X-M10. Decided: A3 (store once), A4 (minimal checks), A7 (mm only), DISC-6 (release download) | EGM design needed (Rev 8); storage moves to the export phase (A6) |
| F5 | Prepared Staunton reference package | §10; Appendix B | via AC-PKG-02 | Phase 2 · `tools/prepare-package.mjs` | X-M11 (mesh repair); Appendix B "closed after weld" TBD. Decided: DISC-6 (published as a GitHub release ZIP); A4 (deep checks live here) | EGM review needed |
| F6 | Export geometry and supports between pieces | §5.5; §7 "Blank connectivity"; §14 | AC-EXP-03, 04, 06 | Phase 5 · `src/blank.js` | X-M2; O-1, O-2 (Phase 0 test with `test_files/`). Decided: A1 (build only the tested mode) | Discovery needed (technical: Phase 0) |
| F7 | Export to File Manager (job folder, licence, `layout.json`) | §5.7; §5.8; §12 | AC-EXP-01, 02, 05, 07 | Phase 5 · `src/exporter.js`, `src/fm.js`, `src/layout.js` | X-B3, X-M7; O-1, O-7. Decided: A2 (per-file download fallback); A6 (after the planning milestone) | EGM design needed (Rev 8), then Phase 0 |
| F8 | Rotary CAM handoff sidecar (`.rotary.json`) | §5.11 | AC-EXP-08 | Phase 5 · `src/sidecar.js` | X-M6 (`onAxis` value); O-13; DISC-7. Decided: A5 (keep §5.11 as written; Z-M6 and C7-M4 accepted) | EGM review needed (consistency fixes); O-13 external |
| F9 | Plan UI, 2-D preview, units display | §4; §6; §5.1 | AC-IN-01 … 03, AC-UI-01 | Phase 4 · `src/ui/*`, `src/units.js`, `src/settings.js` | X-M9 (input fields); unit preference (Z-N2). Decided: DISC-4 (first-run setup screen) | EGM design needed (Rev 8: first-run setup) |
| F10 | Plugin shell, settings, build and release | §6; plan P1–P2 | Phase exits (P3) | Phase 3 · `com.infield.chessset/manifest.json`, `config.html`, `build.mjs`, `build.sh` | X-M4, X-M5, X-M8; DISC-5. Decided: DISC-8 (GPL-3.0, public repo, releases, `repository` field; closes D11); A8 (contracts-level plan) | EGM design needed (Rev 8) |
| F11 | Distribution: package selector, GitHub download, checksums | §5.9 | none | not planned (v2) | v1 route decided: DISC-6 (manual release download); DISC-8 (GitHub releases) | Deferred to v2 |
| F12 | Cut-progress tracking | §2 (deferred) | none | not planned (v2) | — | Discovery needed |

**Out of scope by owner decision** (§2 non-goals): toolpaths and G-code, machine motion (enforced by AC-EXP-05), automatic shrinking, weight pockets, promotion queens.

**ID prefixes:**
- **X-…** and **Part A…:** Rev 7 consolidated review.
- **O-…:** spec §13 open questions.
- **DISC-…:** [`../decisions/discrepancies.md`](../decisions/discrepancies.md).
- **D11:** plan P1.
