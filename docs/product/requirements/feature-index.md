# Feature index

This index maps each product feature to where the spec defines it. It adds no requirements of its own. Every entry links into the authoritative spec, [`chess-set-creator.md`](../../designs/egm/chess-set-creator.md), which is now at Revision 8. If this index and the spec disagree, the spec is right.

**Status vocabulary:**
- Discovery needed
- Product decision needed
- EGM design needed
- EGM review needed
- Ready for engineering
- In implementation
- Ready for validation
- Complete
- Deferred to v2

Revision 8 includes the owner's decisions of 2026-10-30: A1–A8 and DISC-2/3/4/6/8 (see [`../decisions/product-decisions.md`](../decisions/product-decisions.md)). It also includes the Rev 7 review fixes. "EGM review needed (Rev 8 re-review)" means the design is written down and is waiting for its one re-review (Stages 7 and 9).

| ID | Feature | Spec sections | Acceptance criteria (§9) | Plan: milestone · phase · modules | Open items | Status |
|---|---|---|---|---|---|---|
| F1 | Sizing from queen base diameter | §5.2; §11 | AC-SIZE-01 | M1 · Phase 1 · `src/planner.js`, `src/units.js` | — | EGM review needed (Rev 8 re-review) |
| F2 | Stock fit: width, length, jaw sets; machine settings and first-run setup | §5.1; §5.3; §5.10 | AC-FIT-01 … 04, AC-IN-04 | M1 · Phases 1, 3 · `src/planner.js`, `src/settings.js`, `src/ui/*` | O-12 | EGM review needed (Rev 8 re-review) |
| F3 | Blank planning (exact packing per side, light/dark) | §5.4; §11 | AC-PLAN-01 … 04 | M1 · Phase 1 · `src/planner.js` | — | EGM review needed (Rev 8 re-review) |
| F4 | Model package import (minimal checks, mm only, stored once) | §5.6; §5.7; §5.10 | AC-PKG-01 … 04, AC-SEC-01 | M1 · Phase 3 · `src/manifest.js`, `src/package.js`, `src/measure.js`, `src/stl.js` | — | EGM review needed (Rev 8 re-review) |
| F5 | Prepared Staunton package (packaging tool, release ZIP) | §10; §5.9; Appendix B | AC-PKG-02 | M1 · Phase 2 · `tools/prepare-package.mjs` | Appendix B "closed after weld", filled in Phase 2 | EGM review needed (Rev 8 re-review) |
| F6 | Export geometry and supports between pieces | §5.5; §7 "Blank connectivity"; §14 | AC-EXP-03, 04, 06 | M2 · Phase 5 · `src/blank.js` | O-1, O-2 (Phase 0 test with `test_files/`) | Discovery needed (technical: Phase 0) |
| F7 | Export to File Manager, and Download files | §5.7; §5.8; §12 | AC-EXP-01, 02, 05, 07 | M2 · Phase 5 · `src/exporter.js`, `src/fm.js`, `src/layout.js` | O-1, O-7 | EGM review needed (Rev 8 re-review); build after Phase 0 |
| F8 | Rotary CAM handoff sidecar (`.rotary.json`) | §5.11 | AC-EXP-08 | M2 · Phase 5 · `src/sidecar.js` | O-13 (Rotary CAM author); DISC-7 | EGM review needed (Rev 8 re-review). Z-M6 and C7-M4 accepted (A5) |
| F9 | Plan UI, 2-D preview, units display | §4; §5.1; §6 | AC-IN-01 … 03, AC-UI-01 | M1 · Phase 4 · `src/ui/*`, `src/units.js` | Unit preference: follow ncSender's setting or keep the plugin toggle (Rev 7 nit Z-N2, not decided) | EGM review needed (Rev 8 re-review) |
| F10 | Plugin shell, settings, build and release | §5.9; §6; plan P1–P2 | AC-REL-01; phase exits (P3) | M1 · Phase 3 · `com.infield.chessset/*`, `build.mjs`, `build.sh` | DISC-5 (which ncSender versions to support) | EGM review needed (Rev 8 re-review) |
| F11 | Distribution v2: package selector, in-plugin download, checksums | §5.9 | none | not planned (v2) | — | Deferred to v2 |
| F12 | Cut-progress tracking | §2 (deferred) | none | not planned (v2) | — | Discovery needed |

**Milestones** (plan P3):
- **M1** is planning only: Phases 1–4. It has no dependency on Rotary CAM.
- **M2** is export: Phases 5–6. It needs the Phase 0 Rotary CAM test first.

**Out of scope by owner decision** (§2 non-goals): toolpaths and G-code, machine motion (enforced by AC-EXP-05), automatic shrinking, weight pockets, promotion queens.

**ID prefixes:**
- **O-…:** spec §13 open questions.
- **DISC-…:** [`../decisions/discrepancies.md`](../decisions/discrepancies.md).
- **A…, X-…, Z-…, C7-…:** findings and decisions from the Rev 7 review ([`rev7/consolidated_review_report.md`](../../designs/egm/reviews/rev7/consolidated_review_report.md)).
