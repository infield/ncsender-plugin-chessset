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
| 2026-10-30 | **Licence changed back to GPL-3.0 only**, as AAxis and ncCAM. Reverses the dual-licence entry above; DISC-8's original GPL-3.0 decision stands. | Spec D11, §5.9, §7; `LICENSE` |
| 2026-10-30 | **Units follow ncSender.** All measurements are stored, computed and exported in mm. The dialog shows lengths in ncSender's units setting (`unitsPreference`), with the other unit on a line below; the plugin's own in/mm toggle is removed. | Spec §5.1, AC-IN-02, P4.1, P4.7, P4.10, P4.12, P5.8, §12 |
| 2026-10-30 | **Model packages come from a general chess-set library**, `infield/chessset-library` (renamed from `chessset-staunton-package`): one package per set style under `sets/<id>/`, each with its own licence and its own releases (`<id>-v<version>`). Staunton is the only set for now. | Spec §5.6, §5.9, D14, §10, P3 |
| 2026-10-30 | **Stay in beta.** The Staunton set is version 0.1.0, not 1.0.0. Model packages start at 0.1.0 and reach 1.0.0 only with owner approval after shop validation; the plugin stays below 1.0. Releases are titled "beta" but are not GitHub pre-releases, so ncSender's update check still finds them. | Spec D12, §5.6 example, §10 |
| 2026-10-30 | **DISC-1, DISC-5, DISC-7 decided.** Users: advanced-hobbyist ncSender rotary users. Versions: the latest ncSender 2.x only (no 0.3.x; O-9 closed). CAM: Rotary CAM in ncSender only; Download files is a save-failure fallback, not a route to other CAM programs. | [`discrepancies.md`](discrepancies.md); spec §4, §5.8, §6, §7, R12, AC-EXP-09, D13, §13 |
| 2026-10-30 | **Export now, before Phase 0.** Rotary CAM isn't released, so the owner asked for downloads in the meantime. Export is built with both support outcomes behind a **Connecting necks** on/off input (on by default = outcome B), plus Export to File Manager and Download files shown at all times. After Phase 0 the input and the unused outcome are removed, and Download files returns to fallback-only (DISC-7). | Spec §5.1, §5.5, §5.8, AC-EXP-09, D5, P3 Phase 5, P4.5, P4.10, P5.8 |
| 2026-10-30 | **Connecting necks taken out.** The owner expects Rotary CAM to provide the rods between pieces, so exports follow outcome A (empty gaps) and the switch is removed (0.1.8). The outcome-B code stays dormant until Phase 0 confirms. | Spec §5.1, §5.5, D5, P4.5, P4.10 |
| 2026-10-30 | **Library picker in v1.** The dialog lists the chess-set library's sets (`library.json`) and installs one by downloading its files from GitHub at its release tag; several sets can be installed and switched. Moved from v2. | Spec §5.6, §5.9, §5.10, §7, §12, P4.8a, P4.10, P5.8 |
| 2026-10-30 | **More sets in the library** (all 0.1.0 beta): Dubrovnik I 1950 (Zarlor, CC BY), Minimal Look (FunFunBoy, CC BY-NC), Minimalist contemporary (link0007, CC BY-NC), Gothic (nestra, CC BY; published at the owner's choice despite being after Peter Ganine's design). Prepared with the packaging tool's new recipe mode. **Duchamp not published** (owner confirmed 2026-10-30): prepared from clarkerubber's copy for reference only, because the Duchamp estate objected to these models in 2014. | Spec §10, P4.11; `packages/recipes/` |
| 2026-10-31 | **Remove installed sets.** The dialog can remove any installed set after an inline confirmation: its settings entry is dropped first, then its stored folder is deleted with the File Manager's folder delete. Exports already written are not touched. | Spec §5.6, §12, P4.8, P4.10, P5.8 |

## Pending

| Decision | Where it is described |
|---|---|
| Owner-held open questions O-6, O-7, O-11, O-12 | Spec §13 |
