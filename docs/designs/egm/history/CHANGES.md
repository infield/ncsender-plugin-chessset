# Spec revision history

This history used to sit in the spec's header. It was moved here in Revision 8 (review finding X-M17).

| Rev | Date | What changed | Snapshot |
|---|---|---|---|
| 1 | 2026-10-30 | First draft (349 lines). | [`rev1.md`](rev1.md) |
| 2 | 2026-10-30 | Restructured by topic. Answered the Stage 5–7 reviews. Added facts checked against the ncSender source and the Staunton model files. | [`rev2.md`](rev2.md) |
| 3 | 2026-10-30 | Fixes from the Stage 7 re-audit (`../reviews/rev2/critic_report.md`, resolved in `../reviews/rev2/goldfish_review_report.md`). | [`rev3.md`](rev3.md) |
| 4 | 2026-10-30 | Owner's answers: Rotary CAM places the part on the axis and makes the holding tab; the longest blank is 36 in; the jaw-set grip ranges; neck size and gap are settled on a 12 in test blank. | none |
| 5 | 2026-10-30 | Added the Detailed Implementation Plan, with matching edits to §5.1, §5.8 and §6. | none |
| 6 | 2026-10-30 | Plan revised after the Stage 9 review (`../reviews/rev5/implementation_readiness_report.md`). | [`rev6.md`](rev6.md) |
| 7 | 2026-10-30 | Added the Rotary CAM handoff sidecar (§5.11). For now, stock size and placement stay in Rotary CAM. | [`rev7.md`](rev7.md) |
| 7 (reorg) | 2026-10-30 | No content change. The spec moved to `docs/designs/egm/` and links were updated (+2 lines after line 5). | git `aa1912a` |
| 8 | 2026-10-30 | Applied the owner decisions DISC-2/3/4/6/8 and Rev 7 Part A1–A8, plus the Rev 7 Part B fixes, which include the open Rev 6 findings R-M1 to R-M11. The plan's module details became contracts (A8). Decisions: `docs/product/decisions/product-decisions.md`. | [`rev8.md`](rev8.md) |
| 9 | 2026-10-30 | Resolved the Rev 8 re-review: 2 🔴 and 15 🟡 from `../reviews/rev8/`, and most nits. Main changes:<br>• the dialog-hosting model is stated, and export has no page fallback and is blocked while a job runs<br>• a smallest-section report for each blank<br>• Download files is one click per file<br>• the `config-ui` route is corrected to GET<br>• the mock keeps `.b64` files<br>• the free-folder check uses folder names<br>• Phase 0 has a console snippet for saving the test files<br>• a range table, plus the machine-settings and settings-failure contracts<br>Accepted, not applied: link-style consistency; "acceptance criteria" vs "ACs" wording; bold on every **Download files** mention; contractions; using `__INITIAL_CONFIG__` in place of the first settings GET; reusing ncCAM's release and CI scripts. | [`rev9.md`](rev9.md) |
