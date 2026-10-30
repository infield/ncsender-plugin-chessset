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

## Pending

| Decision | Where it is described |
|---|---|
| Is this a personal shop tool or a product for other ncSender rotary users? | [`PRODUCT.md`](../../../PRODUCT.md) |
| A1–A8: support mode, export fallback, package storage, validation scope, sidecar scope, planning-only milestone, mm-only packages, level of detail in the plan | [`rev7/consolidated_review_report.md`](../../designs/egm/reviews/rev7/consolidated_review_report.md), Part A |
| D11: plugin licence (GPL-3.0 proposed, to match AAxis and ncCAM) | Spec plan P1 D11 |
| Owner-held open questions O-6, O-7, O-9, O-11, O-12 | Spec §13 |
