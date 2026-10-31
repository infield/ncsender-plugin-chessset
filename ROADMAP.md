# Roadmap

This page lists only what the spec already documents. **Dates and milestones beyond these: MISSING.**

## v1: scope

The six v1 goals are in spec §2. Items tagged [v2] are left out of v1.

## v1: build phases

These come from spec, Detailed Implementation Plan, P3, which holds each phase's exit criteria.

| Phase | What | Depends on |
|---|---|---|
| 0 | Handoff and host facts: the Rotary CAM test with `test_files/` (answers O-1 and O-2), plus checks on the ncSender File Manager | Shop machine, Rotary CAM |
| 1 | Repo skeleton and pure core: units, STL, measurement, manifest, planner, with tests | — |
| 2 | Prepared Staunton package (`tools/prepare-package.mjs`) | Phase 1 |
| 3 | Plugin shell, settings and package import | Phases 1–2 |
| 4 | Planning UI and 2-D preview | Phase 3 |
| 5 | Export (STL per blank, sidecar, `layout.json`) | Phases 0 and 4 |
| 6 | Shop validation: cut one 12 in blank. This closes O-4 (neck and gap) and O-10 (holding-tab length) | Phase 5 |

**Version rule** (plan D12): the plugin stays at `0.1.x` and moves to `0.2.0` once a 12 in blank has been cut end to end.

**Milestones** (owner decision A6; plan P3):
- **M1, planning:** Phases 1–4. Ships as 0.1.x and does not depend on Rotary CAM.
- **M2, export:** Phases 5–6, after the Phase 0 Rotary CAM test. Reaches 0.2.0 once the test blank is cut.

Release channel (DISC-8): GitHub releases of `infield/ncsender-plugin-chessset`, under GPL-3.0 (D11). Public since the M1 release (0.1.5, 2026-10-30). Model packages are released from the chess-set library, `infield/chessset-library`: one package per set style, Staunton (0.1.0, beta) for now. The plugin and the sets stay in beta (below 1.0) until a set has been cut and checked in the shop.

## v2: documented intent

- A selector for several installed model packages, in-plugin download from GitHub releases, SHA-256 checksums, update offers, and job records that pin the package version (spec §5.9).
- Separate stock settings for each side (spec §5.1).
- Tracking which pieces have been cut (spec §2).
- 3-D preview (spec §6), and mesh simplification to shrink exported STLs (spec §8, R5).

## Not yet scheduled

Open questions O-1 … O-13 (spec §13) and Part A decisions A1–A8 (Rev 7 consolidated review).
