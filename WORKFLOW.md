# Workflow

Work moves through four stages. Each stage owns its own documents. A stage can be skipped when its entry question is already answered. This is a one-person shop tool, so not every change needs every stage.

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

## Feature status (as of the October 30, 2026 audit)

| Feature | Status |
|---|---|
| Sizing, stock fit, blank planning (spec §5.2–§5.4) | EGM review needed (minor fixes) |
| Package import (§5.6–§5.7) | Product decision needed (Part A3, A4) |
| Prepared Staunton package (§10) | EGM review needed (mesh-repair procedure) |
| Export geometry and supports (§5.5) | Discovery needed: technical; Phase 0 Rotary CAM test |
| File Manager export (§5.8) | Product decision needed (A2), then Phase 0 |
| Rotary CAM sidecar (§5.11) | Product decision needed (A5); O-13 is external |
| Plan UI and preview (§6) | EGM review needed |
| Plugin shell, build, release (§6, P1–P2) | EGM review needed; licence D11 pending |
| Distribution (§5.9, v2) | Discovery needed (audience) |
| Cut-progress tracking (v2) | Discovery needed |

No feature is in implementation, ready for validation, or complete.
