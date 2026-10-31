# Workflow

Work moves through four stages. Each stage owns its own documents. A stage can be skipped when its entry question is already answered, so not every change needs every stage.

## Authoritative documents

| Question | Authoritative source | Owner stage |
|---|---|---|
| What must the plugin do, and how is it designed and planned? | [`docs/designs/egm/chess-set-creator.md`](docs/designs/egm/chess-set-creator.md). This is the only spec: requirements §1–§5, architecture §6–§8, implementation plan P1–P6. | EGM (requirements content set by product management) |
| Which design findings are open, and which owner decisions do they need? | [`docs/designs/egm/reviews/rev7/consolidated_review_report.md`](docs/designs/egm/reviews/rev7/consolidated_review_report.md) | EGM |
| What has the owner decided, and what is pending? | [`docs/product/decisions/product-decisions.md`](docs/product/decisions/product-decisions.md) | Product management |
| Where does new evidence conflict with the spec? | [`docs/product/decisions/discrepancies.md`](docs/product/decisions/discrepancies.md) | Product management |
| Which spec section covers a feature, and what is its status? | [`docs/product/requirements/feature-index.md`](docs/product/requirements/feature-index.md). This is an index only; the spec wins any disagreement. | Product management |
| What did each review round say, and against which spec text? | [`docs/designs/egm/reviews/INDEX.md`](docs/designs/egm/reviews/INDEX.md) and `docs/designs/egm/history/` (read-only) | EGM |
| How do plugins work on ncSender, and what are the shop conventions? | [`../AAxis/CLAUDE.md`](../AAxis/CLAUDE.md) (sibling repo) | Engineering |

Everything else (`PRODUCT.md`, `ROADMAP.md`, `README.md`, the `docs/**/README.md` files) is an index that links to these sources and does not restate them.

## Stages

| Stage | Owns | Tools | Starts when | Hands off when | Writes to |
|---|---|---|---|---|---|
| **Product management** | Vision, requirements, priority, roadmap, success criteria, owner decisions | pm-skills (`product-vision`, `create-prd`, `outcome-roadmap`, `prioritization-frameworks`). Marketplace registered; **not installed**. "Anthropic Product Management": **not installed**; confirm which plugin is meant | New idea, a discovery result, or an EGM finding that needs an owner decision | Each affected requirement has an owner-confirmed tag ([C]/[P]/[v2]), a success criterion and a priority. The decision is logged with a link to the spec section | `PRODUCT.md`, `ROADMAP.md`, `docs/product/` |
| **Product discovery** | Audience, ideal customer profile, jobs-to-be-done, interviews, assumption tests, validation evidence | pm-skills (`ideal-customer-profile`, `user-personas`, `job-stories`, `interview-script`, `summarize-interview`, `identify-assumptions-existing`, `prioritize-assumptions`, `competitor-analysis`); **not installed** | Product management marks a question "discovery needed" | An evidence file with its source and date. Any conflict with the spec goes to `docs/product/decisions/discrepancies.md`. The spec itself is not edited | `docs/research/` |
| **EGM** | Technical spec, architecture, alternatives, adversarial review, design integrity | `/egm:egm_draft`, `/egm:egm_review`, `egm-resolve` (EGM 0.1.0, installed) | A [C] or [P] requirement that changes behaviour or architecture | Review has no 🔴. Every 🟡 is fixed or accepted by the owner as a trade-off. The round is archived to `reviews/rev<N>/` and the spec snapshot to `history/rev<N>.md` (see `CLAUDE.md`). **At most one re-review per design change** | `docs/designs/egm/` |
| **Engineering** | Implementation, tests, code review, release readiness, lessons learned | Compound Engineering: **not installed**; folder conventions unverified, so check `docs/engineering/` after install. EGM Stage 9 for plan readiness | A feature is *Ready for engineering*: its spec section and plan phase have no open 🔴 or 🟡 | The phase's acceptance criteria pass (plan P5.7), with a CHANGELOG entry and lessons recorded. A deviation from the spec goes back to EGM as a finding; it is not changed silently in code | `com.infield.chessset/`, `src/`, `tests/`, `docs/engineering/` |

## Rules that apply across stages

1. **Existing EGM work stands.** A new product or discovery result can question a [C] item, but it cannot change one. A change goes through the owner's decision log and then a new spec revision.
2. **Discrepancies.** Record each one in `docs/product/decisions/discrepancies.md` with: date, source, spec section, the conflict, the options. Leave the spec unchanged and ask the owner.
3. **One source per fact.** Link to spec sections; don't copy them.

## Feature status

The status of each feature, with its spec sections, acceptance criteria, plan phase and open findings, is kept in one place: [`docs/product/requirements/feature-index.md`](docs/product/requirements/feature-index.md). M1 (planning) is built and released as 0.1.x beta; its features are ready for validation. M2 (export) waits on the Phase 0 Rotary CAM test.

**Audience (decided 2026-10-30): advanced-hobbyist ncSender rotary users**, on the latest ncSender 2.x, using Rotary CAM (DISC-1, 5, 7). The shop-specific conflicts are in `docs/product/decisions/discrepancies.md` (DISC-1 … DISC-8).
