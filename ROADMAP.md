# Roadmap

This page lists only what the spec already documents. **Dates and milestones beyond these: MISSING.**

## v1: scope

The six v1 goals are in spec §2. Items tagged [v2] are left out of v1.

## v1: build phases

These come from spec, Detailed Implementation Plan, P3, which holds each phase's exit criteria.

| Phase | What | Depends on | Status (2026-10-30) |
|---|---|---|---|
| 0 | Handoff and host facts: the Rotary CAM test with `test_files/` (answers O-1 and O-2), plus checks on the ncSender File Manager | Shop machine, Rotary CAM | **Waiting**: Rotary CAM isn't released |
| 1 | Repo skeleton and pure core: units, STL, measurement, manifest, planner, with tests | — | Done |
| 2 | Prepared Staunton package (`tools/prepare-package.mjs`) | Phase 1 | Done |
| 3 | Plugin shell, settings and package import | Phases 1–2 | Done (0.1.0); verified by the owner in ncSender |
| 4 | Planning UI and 2-D preview | Phase 3 | Done (0.1.1–0.1.4); released publicly as 0.1.5 (M1) |
| 5 | Export (STL per blank, sidecar, `layout.json`) | Phases 0 and 4 | Built early (0.1.7) because Rotary CAM isn't released. Outcome A (empty gaps) since 0.1.8; Phase 0 still confirms it |
| 6 | Shop validation: cut one 12 in blank. This closes O-4 (gap) and O-10 (holding-tab length) | Phase 5 | Waiting on Phase 0 |

**Added outside the phases** (owner, 2026-10-30): units follow ncSender (0.1.3); the chess-set library with its picker (0.1.6, 0.1.8); four more sets in the library.

**Version rule** (plan D12): the plugin stays at `0.1.x` and moves to `0.2.0` once a 12 in blank has been cut end to end.

**Milestones** (owner decision A6; plan P3):
- **M1, planning:** Phases 1–4. Ships as 0.1.x and does not depend on Rotary CAM.
- **M2, export:** Phases 5–6, after the Phase 0 Rotary CAM test. Reaches 0.2.0 once the test blank is cut.

Release channel (DISC-8): GitHub releases of `infield/ncsender-plugin-chessset`, under GPL-3.0 (D11). Public since the M1 release (0.1.5, 2026-10-30). Model packages are released from the chess-set library, `infield/chessset-library`: one package per set style, each released on its own. Five sets so far, all 0.1.0 beta: Staunton, Dubrovnik I 1950, Minimal Look, Minimalist contemporary and Gothic. The plugin and the sets stay in beta (below 1.0) until a set has been cut and checked in the shop.

## v2: documented intent

- SHA-256 checksums for library sets, automatic update prompts, and job records that pin the package version (spec §5.9). The set picker and in-plugin download moved into v1 (0.1.8).
- Separate stock settings for each side (spec §5.1).
- Tracking which pieces have been cut (spec §2).
- 3-D preview (spec §6), and mesh simplification to shrink exported STLs (spec §8, R5).

## Not yet scheduled

Open questions still waiting (spec §13): O-1, O-2, O-10 and O-13 (Rotary CAM), O-4 (the test blank), O-7 (ask ncSender to block loading non-G-code files). A1–A8 and DISC-1 … DISC-8 are all decided.
