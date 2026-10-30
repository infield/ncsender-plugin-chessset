# Product: Chess Set Creator

This page is an index. The requirements live in the spec, [`docs/designs/egm/chess-set-creator.md`](docs/designs/egm/chess-set-creator.md), and this page only links to them. Anything not yet written down is marked **MISSING**. Nothing here adds a new product decision.

## What exists

| Topic | Where | Notes |
|---|---|---|
| Problem statement | Spec §1 | Laying 32 pieces out across turning blanks by hand in CAD, and redoing it whenever the size or stock changes |
| Goals and non-goals (v1) | Spec §2 | Six goals, all tagged [C]. Non-goals include G-code generation, machine motion, automatic shrinking, weight pockets and promotion queens |
| Users | Spec §4 | "One user: Marc, on ncSender 2.x Pro … working at the shop machine." **Superseded in intent by the 2026-10-30 audience decision below. The spec text is unchanged until DISC-1 is decided.** |
| Requirements | Spec §5.1–§5.11 | Each item is tagged [C] confirmed, [P] proposed, [O-n] open, or [v2] |
| Acceptance criteria | Spec §9 | AC-PKG, AC-SEC, AC-IN, AC-SIZE, AC-FIT, AC-PLAN, AC-UI, AC-EXP |
| Open questions | Spec §13 | O-1 … O-13 |
| Feature → spec index, with status | [`docs/product/requirements/feature-index.md`](docs/product/requirements/feature-index.md) | F1 … F12 |
| Owner decisions so far | [`docs/product/decisions/product-decisions.md`](docs/product/decisions/product-decisions.md) | |
| Decisions pending from the last review | [`docs/designs/egm/reviews/rev7/consolidated_review_report.md`](docs/designs/egm/reviews/rev7/consolidated_review_report.md), Part A | A1–A8 |

## MISSING

| Artifact | Status |
|---|---|
| Product vision statement | MISSING |
| Target audience definition (who, which machines and ncSender versions) | MISSING. Direction decided (other ncSender rotary users); no profile yet |
| Personas, jobs-to-be-done, ideal customer profile | MISSING (`docs/product/personas/`, `docs/research/`) |
| Success metrics (outcomes, not acceptance tests) | MISSING. For example, time saved or stock wasted compared with manual layout |
| Competitive or alternatives analysis (manual CAD layout, other tools) | MISSING |
| Dated roadmap or milestones | MISSING. See [`ROADMAP.md`](ROADMAP.md) for what is documented |

## Audience decision (2026-10-30)

**The product is for other ncSender rotary users, not only the owner's shop.** It's recorded in [`docs/product/decisions/product-decisions.md`](docs/product/decisions/product-decisions.md).

The spec still describes one user and one shop. Eight conflicts are logged for owner decision in [`docs/product/decisions/discrepancies.md`](docs/product/decisions/discrepancies.md):
- DISC-1: the user description
- DISC-2: fixed wood species
- DISC-3: the owner's jaw sets
- DISC-4: the 36 in default
- DISC-5: supported ncSender versions
- DISC-6: how other users get a model package
- DISC-7: depending on unreleased Rotary CAM
- DISC-8: licence and release channel

The spec is unchanged until those are decided.

Product discovery is now worth doing. The aim is to define who these users are, which machines, rotary units and ncSender versions they run, and what they use for rotary CAM. DISC-1, DISC-5 and DISC-7 depend on that research.
