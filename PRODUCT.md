# Product: Chess Set Creator

This page is an index. The requirements live in the spec, [`docs/designs/egm/chess-set-creator.md`](docs/designs/egm/chess-set-creator.md), and this page only links to them. Anything not yet written down is marked **MISSING**. Nothing here adds a new product decision.

## What exists

| Topic | Where | Notes |
|---|---|---|
| Problem statement | Spec §1 | Laying 32 pieces out across turning blanks by hand in CAD, and redoing it whenever the size or stock changes |
| Goals and non-goals (v1) | Spec §2 | Six goals, all tagged [C]. Non-goals include G-code generation, machine motion, automatic shrinking, weight pockets and promotion queens |
| Users | Spec §4 | Advanced hobbyists who run ncSender with a rotary axis (DISC-1, decided 2026-10-30), with the owner's shop as the first user and test site |
| Requirements | Spec §5.1–§5.11 | Each item is tagged [C] confirmed, [P] proposed, [O-n] open, or [v2] |
| Acceptance criteria | Spec §9 | AC-PKG, AC-SEC, AC-IN, AC-SIZE, AC-FIT, AC-PLAN, AC-UI, AC-EXP |
| Open questions | Spec §13 | O-1 … O-13 |
| Feature → spec index, with status | [`docs/product/requirements/feature-index.md`](docs/product/requirements/feature-index.md) | F1 … F12 |
| Owner decisions so far | [`docs/product/decisions/product-decisions.md`](docs/product/decisions/product-decisions.md) | |
| Review history | [`docs/designs/egm/reviews/INDEX.md`](docs/designs/egm/reviews/INDEX.md) | Last review: Rev 8 (resolved in Rev 9). Changes made since then during implementation are owner decisions, not yet reviewed |
| Releases | [Plugin releases](https://github.com/infield/ncsender-plugin-chessset/releases), [chess-set library](https://github.com/infield/chessset-library) | Public beta 0.1.x; five sets at 0.1.0 |

## MISSING

| Artifact | Status |
|---|---|
| Product vision statement | MISSING |
| Target audience definition | Partly: advanced-hobbyist ncSender rotary users on the latest ncSender 2.x, using Rotary CAM (DISC-1, 5, 7). No profile of their machines or rotary units yet |
| Personas, jobs-to-be-done, ideal customer profile | MISSING (`docs/product/personas/`, `docs/research/`) |
| Success metrics (outcomes, not acceptance tests) | MISSING. For example, time saved or stock wasted compared with manual layout |
| Competitive or alternatives analysis (manual CAD layout, other tools) | MISSING |
| Dated roadmap or milestones | MISSING. See [`ROADMAP.md`](ROADMAP.md) for what is documented |

## Audience decision (2026-10-30)

**The product is for advanced-hobbyist ncSender rotary users, not only the owner's shop.** It's recorded in [`docs/product/decisions/product-decisions.md`](docs/product/decisions/product-decisions.md).

Eight conflicts between that decision and the spec were logged in [`docs/product/decisions/discrepancies.md`](docs/product/decisions/discrepancies.md):
- DISC-1: the user description
- DISC-2: fixed wood species
- DISC-3: the owner's jaw sets
- DISC-4: the 36 in default
- DISC-5: supported ncSender versions
- DISC-6: how other users get a model package
- DISC-7: depending on unreleased Rotary CAM
- DISC-8: licence and release channel

All eight are decided. DISC-2, 3, 4, 6 and 8 were written into spec Revision 8. DISC-1, 5 and 7 were decided on 2026-10-30 without separate discovery: advanced-hobbyist ncSender rotary users, the latest ncSender 2.x only, and Rotary CAM in ncSender only.

Further discovery (which machines and rotary units these users run) can still inform defaults, but no open decision waits on it.
