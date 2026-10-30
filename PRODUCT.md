# Product: Chess Set Creator

This page is an index. The requirements live in the spec, [`docs/designs/egm/chess-set-creator.md`](docs/designs/egm/chess-set-creator.md), and this page only links to them. Anything not yet written down is marked **MISSING**. Nothing here adds a new product decision.

## What exists

| Topic | Where | Notes |
|---|---|---|
| Problem statement | Spec §1 | Laying 32 pieces out across turning blanks by hand in CAD, and redoing it whenever the size or stock changes |
| Goals and non-goals (v1) | Spec §2 | Six goals, all tagged [C]. Non-goals include G-code generation, machine motion, automatic shrinking, weight pockets and promotion queens |
| Users | Spec §4 | "One user: Marc, on ncSender 2.x Pro … working at the shop machine." |
| Requirements | Spec §5.1–§5.11 | Each item is tagged [C] confirmed, [P] proposed, [O-n] open, or [v2] |
| Acceptance criteria | Spec §9 | AC-PKG, AC-SEC, AC-IN, AC-SIZE, AC-FIT, AC-PLAN, AC-UI, AC-EXP |
| Open questions | Spec §13 | O-1 … O-13 |
| Owner decisions so far | [`docs/product/decisions/product-decisions.md`](docs/product/decisions/product-decisions.md) | |
| Decisions pending from the last review | [`docs/designs/egm/reviews/rev7/consolidated_review_report.md`](docs/designs/egm/reviews/rev7/consolidated_review_report.md), Part A | A1–A8 |

## MISSING

| Artifact | Status |
|---|---|
| Product vision statement | MISSING |
| Target audience beyond the owner | MISSING. See the open question below |
| Personas, jobs-to-be-done, ideal customer profile | MISSING (`docs/product/personas/`, `docs/research/`) |
| Success metrics (outcomes, not acceptance tests) | MISSING. For example, time saved or stock wasted compared with manual layout |
| Competitive or alternatives analysis (manual CAD layout, other tools) | MISSING |
| Dated roadmap or milestones | MISSING. See [`ROADMAP.md`](ROADMAP.md) for what is documented |

## Open product question (owner decision)

**Is this a personal shop tool, or meant for other ncSender rotary users?**
- **What the spec says now:** §4 names one user. Several confirmed decisions belong to this shop: maple and walnut, its two jaw sets, and the 36 in maximum blank.
- **What points the other way:** v2 GitHub distribution (§5.9) implies other users.

The answer decides whether audience research is worth doing now. It may also mean reopening those shop-specific [C] items. This is logged in [`docs/product/decisions/product-decisions.md`](docs/product/decisions/product-decisions.md) as pending.
