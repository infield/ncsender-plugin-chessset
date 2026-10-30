# EGM review rounds

There is one folder per spec revision reviewed. Report file names are EGM's fixed names. Before the October 30, 2026 reorganization, earlier rounds were saved by renaming or moving files. The **Old path** column lets a stale file name in an old report be traced to its current file.

Spec snapshots live in [`../history/`](../history/). Each round reviewed the snapshot of the same revision number. Use the snapshot, not the live spec, to check a report's line numbers.

| Round | Spec reviewed | Stage | File | Old path (before reorganization) | Outcome |
|---|---|---|---|---|---|
| rev1 | Rev 1, 349 lines ([`history/rev1.md`](../history/rev1.md)) | 5 Initial zoom out | [`rev1/zoom_out_report.md`](rev1/zoom_out_report.md) | `zoom_out_report.md` → `_archive/reviews_before_rev7/zoom_out_report.md` | — |
| rev1 | Rev 1 | 6 Comprehension | [`rev1/comprehension_report.md`](rev1/comprehension_report.md) | `comprehension_report.md` → `_archive/reviews_before_rev7/comprehension_report.md` | — |
| rev1 | Rev 1 | 7 Critic | [`rev1/critic_report.md`](rev1/critic_report.md) | `critic_report_rev1.md` | — |
| rev1 | Rev 1 | Resolution | [`rev1/goldfish_review_report.md`](rev1/goldfish_review_report.md) | `goldfish_review_report_rev1.md` | 14 fixes accepted but **not applied**. Superseded by the Rev 2 rewrite |
| rev2 | Rev 2, 442 lines ([`history/rev2.md`](../history/rev2.md)) | 7 Critic re-audit | [`rev2/critic_report.md`](rev2/critic_report.md) | `critic_report.md` (the Rev 2 one) | — |
| rev2 | Rev 2 | Resolution | [`rev2/goldfish_review_report.md`](rev2/goldfish_review_report.md) | `goldfish_review_report_stage7.md` | 14 fixes applied, producing Rev 3 |
| rev3 | Rev 3, 476 lines ([`history/rev3.md`](../history/rev3.md)) | 8 Intermediate zoom out | [`rev3/intermediate_zoom_out_report.md`](rev3/intermediate_zoom_out_report.md) | `intermediate_zoom_out_report.md` (the Rev 3 one) | — |
| — | Rev 4 (owner answers) | none | — | — | **No snapshot** |
| rev5 | Rev 5 (plan added; **no snapshot**) | 9 Implementation readiness | [`rev5/implementation_readiness_report.md`](rev5/implementation_readiness_report.md) | `implementation_readiness_report_rev1.md` | — |
| rev5 | Rev 5 | Resolution | [`rev5/goldfish_review_report.md`](rev5/goldfish_review_report.md) | `goldfish_review_report.md` (the Stage 9 one) | 20 fixes applied, producing Rev 6 |
| rev6 | Rev 6, 1,301 lines ([`history/rev6.md`](../history/rev6.md)) | 9 Re-audit | [`rev6/implementation_readiness_report.md`](rev6/implementation_readiness_report.md) | `implementation_readiness_report.md` (the Rev 6 one) | 11 Majors (R-M1 … R-M11) accepted and left open. Resolved in Rev 8 |
| rev7 | Rev 7, 1,390 lines ([`history/rev7.md`](../history/rev7.md)) | 5–9 full run | [`rev7/`](rev7/): `zoom_out_report.md`, `comprehension_report.md`, `critic_report.md`, `intermediate_zoom_out_report.md`, `implementation_readiness_report.md` | same names at the project root | 3 🔴, 26 🟡. Applied in Rev 8 |
| rev7 | Rev 7 | Consolidated | [`rev7/consolidated_review_report.md`](rev7/consolidated_review_report.md) | `consolidated_review_report.md` | Part A: owner decisions A1–A8 (decided 2026-10-30). Part B: fixes. Both applied in Rev 8 |
| rev8 | Rev 8, 1,363 lines ([`history/rev8.md`](../history/rev8.md)) | 7 Critic re-review | [`rev8/critic_report.md`](rev8/critic_report.md) | — | 0 🔴, 7 🟡. Resolved in Rev 9 |
| rev8 | Rev 8 | 9 Implementation readiness re-review | [`rev8/implementation_readiness_report.md`](rev8/implementation_readiness_report.md) | — | 2 🔴, 8 🟡, all local text fixes. Resolved in Rev 9. Both stages have now used their one re-review |
| — | Rev 9, 1445 lines ([`history/rev9.md`](../history/rev9.md)) | not re-reviewed (cap reached) | — | — | Accepted residual nits are listed in [`history/CHANGES.md`](../history/CHANGES.md) |

**Line numbers.** Report line numbers refer to the snapshot of the revision they reviewed, not to the live spec. Since Revision 8 the live spec differs throughout, so read the Rev 7 reports against [`history/rev7.md`](../history/rev7.md). Revision 8 is snapshotted as [`history/rev8.md`](../history/rev8.md), and the revision history is in [`history/CHANGES.md`](../history/CHANGES.md).

**Text inside old reports is unedited.** Those reports name files at their old paths, such as `_archive/…`, `Chess_Set_Creator.md` and `critic_report_rev1.md`. Use the table above to find the current path.

**Next round:** EGM writes to [`current/`](current/) (set in `CLAUDE.md`). Rename that folder to `rev<N>/` when the round ends.

Review context used in each round: [`../review-context.md`](../review-context.md).
