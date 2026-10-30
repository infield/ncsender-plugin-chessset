# Product decisions log

This log holds decisions made by the owner, Marc Infield. The October 30, 2026 entries were collected from the spec's [C] tags and revision notes, and from the owner's answers in the working session that day. The spec is still the source of truth. Each entry points to the section that records it.

## Made

| Date | Decision | Recorded in |
|---|---|---|
| 2026-10-30 | Build an ncSender plugin, "Chess Set Creator", that writes chess-piece STLs into a **chess set** folder in the ncSender File Manager for a later rotary machining step | Spec §2 goal 5, §5.8 |
| 2026-10-30 | Maple for the light side and walnut for the dark side. Blanks are counted separately for each side | Spec §2 goal 4, §3 "Side" |
| 2026-10-30 | Size the set from one input, the **queen base diameter**, and scale every piece by the same factor | Spec §2 goal 1, §5.2 |
| 2026-10-30 | Keep model geometry in a separate model package, not in plugin code | Spec §2 goal 6, §5.6 |
| 2026-10-30 | Phase the package work. v1: one prepared package imported from a folder. v2: selector, GitHub download, checksums, version pinning | Spec §5.6, §5.9 |
| 2026-10-30 | The downstream program is **Rotary CAM**, an ncSender plugin that has not been released yet | Spec §3 "Rotary CAM" |
| 2026-10-30 | Hand off through a folder in the ncSender File Manager | Spec §5.8, §7 "Handoff" |
| 2026-10-30 | Rotary CAM places the part on the axis and makes the holding tab. *This is the owner's understanding and still needs confirming with the Rotary CAM author (O-10).* | Spec §5.5, §13 O-10 |
| 2026-10-30 | The longest blank between chuck and tailstock is 36 in (914.4 mm) | Spec §5.1 |
| 2026-10-30 | Jaw sets: standard grips 0–0.9 in, alternate grips 1–2.5 in | Spec §3, §5.3 |
| 2026-10-30 | Neck size and gap will be settled by cutting a 12 in test blank | Spec §13 O-4, plan Phase 6 |
| 2026-10-30 | For now, stock size and part placement are set in Rotary CAM. The plugin writes a per-blank sidecar describing orientation and stock | Spec §5.11 |
| 2026-10-30 | Implementation plan approved, except D11 (licence). *The Rev 7 review flags this status as contradicting the open findings (X-B1).* | Spec plan "Status" |
| 2026-10-30 | Reorganize the project into the current layout under local git, set up like AAxis | This repo's git history |
| 2026-10-30 | **Audience: the product is for other ncSender rotary users, not only the owner's shop.** The spec still describes one user (§4), so this is not yet reflected there; the conflicts are logged as DISC-1 … DISC-8 in [`discrepancies.md`](discrepancies.md) | Owner, in the working session; recorded in spec Rev 8 §4 |
| 2026-10-30 | DISC-2: generic light/dark sides; no species names in file names | [`discrepancies.md`](discrepancies.md); written into spec Rev 8 |
| 2026-10-30 | DISC-3: jaw ranges become editable machine settings (Vortex defaults); the check still blocks | same; written into Rev 8 |
| 2026-10-30 | DISC-4: first-run setup asks new users for their machine settings | same; written into Rev 8 |
| 2026-10-30 | DISC-6: the prepared package is published as a GitHub release ZIP for manual import; in-plugin download stays v2 | same; written into Rev 8 |
| 2026-10-30 | DISC-8: GPL-3.0 (closes D11), public repo `infield/ncsender-plugin-chessset`, GitHub releases, `repository` field. Creating the repo needs separate approval | same; written into Rev 8 |
| 2026-10-30 | A1: build only the support mode the Phase 0 test selects; remove the other from the spec | [`rev7/consolidated_review_report.md`](../../designs/egm/reviews/rev7/consolidated_review_report.md) Part A; written into spec Rev 8 |
| 2026-10-30 | A2: if a File Manager save fails, offer each blank STL and `layout.json` as a plain browser download. No ZIP and no fflate | same; written into Rev 8 |
| 2026-10-30 | A3: import once and store the package in the hidden File Manager folder (as specified) | same; written into Rev 8 |
| 2026-10-30 | A4: minimal checks on import in v1 (parse, measure, check the frame). Closed-mesh and declared-vs-measured checks go in the packaging tool; SHA-256 moves to v2 | same; written into Rev 8 |
| 2026-10-30 | A5: **keep §5.11 as written**, including the general format and the reader rules. Review findings Z-M6 and C7-M4 are **accepted as a trade-off by the owner**; don't raise them again | same; written into Rev 8 |
| 2026-10-30 | A6: the first milestone is planning only (plan Phases 1–4); export follows Phase 0 | same; written into Rev 8 |
| 2026-10-30 | A7: mm-only packages in v1; inch packages move to v2 | same; written into Rev 8 |
| 2026-10-30 | A8: rewrite plan P4 as module contracts plus the P5 test expectations; keep a single file tree | same; written into Rev 8 |
| 2026-10-30 | **Licence changed to match ncSender:** dual GPL-3.0 / commercial licence. Copyright holder and commercial contact: Marc Infield, marc@infield.net. Replaces the GPL-3.0-only part of DISC-8. | Spec D11, §5.9, §7; `LICENSE` |

## Pending

| Decision | Where it is described |
|---|---|
| DISC-1 (target users), DISC-5 (ncSender versions), DISC-7 (Rotary CAM only, or other CAM too): these need discovery first | [`discrepancies.md`](discrepancies.md) |
| Owner-held open questions O-6, O-7, O-9, O-11, O-12 | Spec §13 |
