# Chess Set Creator (ncSender plugin)

**Status: specification stage. No code yet.** The spec is at Revision 7. Its last full EGM review (October 30, 2026) is complete. The findings are not yet resolved, and several owner decisions are pending.

## What it will do

A rotary-machining helper for ncSender (Sienci AltMill with the Vortex rotary axis):
1. Scale a prepared six-piece chess model set from one setting, the queen base diameter.
2. Check that each piece fits the stock.
3. Work out the fewest turning blanks for a full side (maple for light, walnut for dark).
4. Write one STL per blank into the ncSender File Manager for the Rotary CAM plugin to machine.

## Where things are

| | |
|---|---|
| Spec (requirements, design, implementation plan) | [`docs/designs/egm/chess-set-creator.md`](docs/designs/egm/chess-set-creator.md) |
| Open review findings and pending decisions | [`docs/designs/egm/reviews/rev7/consolidated_review_report.md`](docs/designs/egm/reviews/rev7/consolidated_review_report.md) |
| Product summary and gaps | [`PRODUCT.md`](PRODUCT.md) |
| Roadmap (from the spec) | [`ROADMAP.md`](ROADMAP.md) |
| How work moves from product → design → engineering | [`WORKFLOW.md`](WORKFLOW.md) |
| Review history | [`docs/designs/egm/reviews/INDEX.md`](docs/designs/egm/reviews/INDEX.md) |
| Rotary CAM test files (Phase 0) | [`test_files/`](test_files/) |
| Shop build notes (weights, felt, sizing) | [`docs/research/domain/wooden-staunton-build-notes.md`](docs/research/domain/wooden-staunton-build-notes.md) |
| Agent instructions | [`CLAUDE.md`](CLAUDE.md) |

Related: [`../AAxis/`](../AAxis/), the A-Axis Tools plugin, whose conventions this project follows.
