# Consolidated Review Report: Chess Set Creator, Revision 7

- **Target:** `Chess_Set_Creator.md`, Revision 7 (1,390 lines). Now `docs/designs/egm/chess-set-creator.md`; the exact reviewed text is `docs/designs/egm/history/rev7.md`.
  - FeatureRange: lines 1–588.
  - DetailedRange: lines 589–1390.
- **Run:** all five review stages in one pass, without checkpoints. No fixes were applied between stages.
- **Date:** 2026-10-30.
- **Context supplied to reviewers:**
  - `egm_context/ncSender` at commit `2f8a659`
  - `egm_context/ncsender-plugin-nccam` at commit `68a5ed8`
  - `egm_context/Staunton-Pieces` at commit `cef2c79`
  - `../AAxis/`
  - files linked from the spec
- **Stage reports:** `zoom_out_report.md`, `comprehension_report.md`, `critic_report.md`, `intermediate_zoom_out_report.md`, `implementation_readiness_report.md`.
- **Earlier review reports:** moved before this run; now in `docs/designs/egm/reviews/rev1/` … `rev6/` (see `docs/designs/egm/reviews/INDEX.md`). At the time of this review the spec cited them at their old paths (lines 5, 553, 593); those citations were updated in the reorganization that followed.

## Verdict

**Not ready to implement.** The core logic is sound, and several reviewers checked it by hand: sizing, fit checks, exact packing, STL handling, the worked examples and the sidecar contents. The document fails for three reasons:

1. **It defers its own known defects.** The plan lists 11 open Majors from the last review and tells the implementer to fix them.
2. **It builds both branches of decisions that Phase 0 settles before any export code is written,** and it hedges on facts the pinned ncSender source already answers.
3. **The plan is written at code level.** That makes it large, and the detail is where the defects keep appearing.

The Stage 8 recommendation is the core of this report: **cut first, then fix, then re-review once.** About half of the Stage 6, 7 and 9 Majors go away once the cuts in Part A are made.

| Stage | Reviewers | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| 5 Initial Zoom Out | zoom-out | 0 | 7 | 5 |
| 6 Comprehension | comprehension | 2 | 8 | 8 |
| 7 Critic (FeatureRange) | design, structural, style | 0 | 11 | grouped |
| 8 Intermediate Zoom Out | zoom-out | 0 | 2 | 2 |
| 9 Implementation Readiness (DetailedRange) | readiness, codebase details, style | 2 | 16 | grouped |
| **Consolidated (after removing duplicates)** | | **3** | **26** | grouped |

---

## Part A: Scope decisions (owner)

Each decision removes several downstream findings. The owner should make them before anyone edits the spec.

| # | Decision | Recommendation | Findings it removes or shrinks |
|---|---|---|---|
| A1 | **Support mode.** Build both branches behind `SUPPORT_MODE`, or only the one Phase 0 selects? | Build only the selected branch. Until Phase 0 runs, keep a short "Outcome A removes:" list. | Z-M1, C7-M1 (§7 row), C7-M2, part of C-M5 and R9-M6 |
| A2 | **Export fallback.** Keep `FM_HANDOFF` and the streaming fflate ZIP? | Drop both unless Phase 0 sets `FM_HANDOFF = false`. If a save fails, show the error and retry into a new folder. | Z-M2, C-M4, R9-M10, R9-M6, ui-check step 8, part of AC-EXP-07 |
| A3 | **Package import in v1.** Keep the stored base64 mesh copy, or re-pick the package folder at export? | Owner's choice. The re-pick option removes the whole stored-mesh layer. Either way, record the trade-off in §7. | Z-M4, A1 (Stage 8), R9-M12 |
| A4 | **Validation and trust in v1.** Re-check meshes and declared values at import, plus SHA-256 and untrusted-package defences? | v1 import parses, measures and checks the frame. Closed-mesh and declared-vs-measured checks move to `prepare-package`. SHA-256 moves to v2. Keep `textContent`. | Z-M5, C-M3, R9-M8, half of R9-M7 |
| A5 | **Sidecar scope.** Keep §5.11 as a general format for any plugin, including reader rules for Rotary CAM? | Keep writing the sidecar; the writer is small and pure. Move the reader rules and the "not chess-specific" goal into a separate note for the Rotary CAM author. In the spec, add sidecars to AC-EXP-01 and add one clause to R10. | Z-M6, C7-M4 |
| A6 | **Planning-only milestone.** Should Phases 1–4 ship blank counts and layouts before any export work? | Yes. Phases 1–4 store settings only; mesh storage and export move after Phase 0. | Stage 8 A1 |
| A7 | **Units.** Accept packages in inches in v1? | No. Accept mm only in v1; inch packages move to v2. | Stage 8 A3, one proposed AC |
| A8 | **Plan detail level.** Keep code-level P4? | Reduce P4 to module contracts (inputs, outputs, invariants, error codes) plus the P5 test expectations. Keep one file tree (P2) and delete the §6 tree. | Z-M7, C-N2, R9-M16, many wording nits |

---

## Part B: Fixes needed whatever the Part A answers

### 🔴 Blockers

| ID | Finding | Fix | Sources |
|---|---|---|---|
| X-B1 | The plan defers 11 known defects to the implementer. Its status block contradicts itself ("approved", then "not re-reviewed"). The cited report is now `docs/designs/egm/reviews/rev6/implementation_readiness_report.md`. | Write each resolution into its P-section, using the checked fixes in `implementation_readiness_report.md`. Delete line 593. Mark the plan "draft" until it is re-reviewed. Point the citations at `_archive/reviews_before_rev7/`. | C-B1, R9-B1, Z-N5, A2 |
| X-B2 | Wrong test expectations. AC-FIT-03 with 100 mm stock produces **5** `TOO_LONG` errors (usable length 55.55 mm; only the pawn fits). `shifted-axis` fails **3** checks, and `checkPiece` never says whether it stops at the first failure. | State the rule: stop after a failure in check 1 or 3; checks 4–5 collect all errors. Expect [base, swept, axisOffset], or [axisOffset] under A4. Expect 5 `TOO_LONG` errors, each with `minLength` 143.6. | C-B2, R9-M7 |
| X-B3 | D3 and `fm.js` cite ncCAM for a file-by-file probe that ncCAM abandoned. The real `freePath` is one tree walk (`src/ui/app.js:883–895`), and all three citations point to the wrong lines. | Either keep the probe as this plan's own choice, accepting the 404 log noise, or reuse the tree walk. Correct the citations either way. | R9-B2, C-M2, Z-N3 |

### 🟡 Major: facts and correctness

| ID | Finding | Fix | Sources |
|---|---|---|---|
| X-M1 | Facts the source already answers are still treated as open: file reads return JSON `{content}`, missing files return 404, the tree shape is known, dot-folders are hidden, and save/read accept any extension. | Write these in as facts (`PACKAGE_ROOT`, no `STORE_SUFFIX`, `fm.readText`). Delete the hedge at line 226. Cut Phase 0 down to O-1, O-2 and the overwrite check. | Z-M3, C-M1, C7-M5, R9-M1 |
| X-M2 | §7 rejects "separate bodies with empty gaps", but §5.5 calls that outcome A and prefers it. Line 421's "Revisit if O-2 is 'No'" no longer fits. | Rewrite the §7 row as pending O-2. After Phase 0, record the result and delete the branch that lost (A1). | C7-M1, Z-M1 |
| X-M3 | Minimum widths and lengths in error messages round half up, so 41.138 mm shows as 41.1 mm, which still fails. AC-FIT-01 expects 41.2. | Round minimums up and maximums down, in both units. Say so in §5.3 or §5.10. | C7-M7 |
| X-M4 | A copy of the ncCAM test harness parses JSON from `config-ui`, but the host and the planned mock return HTML. Every ui-check step would fail. | Have the harness read `res.text()`, and list the exact edits. Base the mock on ncCAM's `dev/serve.mjs` (in memory). Its settings GET returns `{}` when empty. | R9-M2, R9-M3, R9-M4, R9-M5, C-M6, A4 |
| X-M5 | `build.sh` bumps the version before zipping, so the first build ships 0.1.1 and Phase 6 ships 0.2.1. | Add `--no-bump`, and state which version ships first. | C-M7, R9-M9 |
| X-M6 | The `layout.json` shape for both sides is ambiguous. `onAxis` is `"Model origin"` in `layout.json` but `model-origin` in the sidecar. | State that `blanks` holds 10 entries, with `index` restarting for each side. Pin the inputs for `layout-12in.json`. Use one `onAxis` value. | C-M8, Stage 9 W nit |
| X-M7 | R2 understates what clicking an exported STL does: the server runs plugin transforms, pre-analyses the file, writes `current.gcode`, and keeps `lastLoadedFile` across restarts. | Update R2's Impact column. Don't test by loading a 38 MB STL on purpose. O-7 (ask ncSender to check extensions) is the structural fix. | C7-M8 |
| X-M8 | O-8 (permissions) is still open, but ncSender never reads `Permissions`: `PluginModels.cs:52` is the only reference. | Close O-8. | R9-M15 |

### 🟡 Major: missing contracts in the plan

| ID | Finding | Fix | Sources |
|---|---|---|---|
| X-M9 | Input fields: how they display and read back values is undefined. For example, 7.6 mm shows as `0.30` in, which reads back as 7.62 mm. Behaviour on a `null` parse is undefined. | Keep state in mm. Parse a field only on its own input event. Show 1 decimal in mm and 3 in inches. A `null` parse raises a `RANGE` error and is not saved. | R9-M11 |
| X-M10 | It's unspecified who loads meshes and when. The cache `key`, `pluginVersion` and `source.job` are also unspecified. | `key = id@version`. Load once per Worker before export. `pluginVersion = __BUILD__.split('-')[0]`. `source.job = folder`. Some of this goes away under A3. | R9-M12, R9-M13, C-N6 |
| X-M11 | There is no repair procedure if a Staunton mesh isn't closed after welding. | Name a tool and its steps, or make it an owner escalation with an exit condition. | R9-M14 |
| X-M12 | Not every Phase 0 outcome has a next step: "both cut through", a second failure of step 6, and `!FM_HANDOFF` in ui-check. | Give each outcome a defined next step. Under A1 and A2, most of these disappear. | C-M5, R9-M6 |

### 🟡 Major: spec consistency

| ID | Finding | Fix | Sources |
|---|---|---|---|
| X-M13 | The one-tag rule on line 7 is broken (double tags, qualified tags, (O-n) vs [O-n], [C] rows under a "[P]" note). Line 158 claims [C] for an unconfirmed fact about Rotary CAM. | Change line 7 to "one tag per clause; Status is whether the input exists; defaults are [P]". Retag line 158 as [O-10]. Use [O-n] everywhere. | C7-M3 |
| X-M14 | Unverified claims are written as fact: "Rotary CAM reads them", "under 100 ms", "harmless", and Rotary CAM behaviour taken from the demo GIF. | Mark Rotary CAM details as "owner-reported". Mark timings as estimates or add an AC. Make lines 230 and 287 neutral. | C7-M9 |
| X-M15 | Requirements have no AC: usable length ≤ 0, neck wider than base, job-name rules, write order, and sidecar order. | Extend AC-FIT-03, AC-EXP-01 and AC-EXP-07 to point at the existing P5 tests. Skip the "export gate" AC, since a process gate can't be tested. | C7-M6 |
| X-M16 | The §5.5 lead-in ("one convention") doesn't describe its list. Glossary terms drift: tenon/holding tab; end neck/parting neck; tip/finial/top; "support" undefined. | Move the gate out of the list and change the lead-in. Use the glossary terms throughout. Define "support". | C7-M10, C7-M11 |
| X-M17 | The review loop keeps growing the spec. Each stage adds rows while known Majors stay open. | Freeze scope. Apply Part A, then Part B, then one re-review. Move the revision history and review notes out of the spec. | Stage 8 A2 |

### 🟢 Nits

Grouped in each stage report:
- `critic_report.md` § Nits
- `implementation_readiness_report.md` § Nits
- `comprehension_report.md` C-N1–C-N8
- `zoom_out_report.md` Z-N1, Z-N2, Z-N4

Notable ones:
- **Units preference.** Follow the host's `unitsPreference`, as ncCAM does, or keep a toggle in the plugin on purpose (Z-N2, K-N2).
- **Settings writes can race.** Two read-merge-write cycles on settings can overlap. Chain them one after another (C-N5).
- **R5's size estimate is low.** It should say about 38.6 MB per blank, not 34 MB (D-N3).
- **Platforms mismatch.** The manifest lists `v2`, but the text says `pro-v2` only (D-N2).
- **Rationale for quoting the port.** The stated reason doesn't hold at commit `2f8a659` (K-N1).
- **Licence D11** is still pending the owner.

---

## Fix order

1. The owner decides Part A (A1–A8).
2. Apply the Part A cuts to the spec and plan.
3. Run Phase 0 on the machine. Use the `test_files/` STLs in Rotary CAM to answer O-1 and O-2. Record the results and delete the branch that wasn't chosen.
4. Fix the 🔴 items X-B1–X-B3 and the facts and correctness Majors (X-M1–X-M8).
5. Fill the remaining contracts in the plan (X-M9–X-M12) and the spec-consistency items (X-M13–X-M17).
6. Do the nit and wording passes.
7. Run one re-review (Stages 7 and 9 only), then mark the plan approved.

---

## Traceability

| Consolidated | Stage 5 | Stage 6 | Stage 7 | Stage 8 | Stage 9 |
|---|---|---|---|---|---|
| A1 Support mode | Z-M1 | C-M5 (part) | C7-M1, C7-M2 | §1 table | R9-M6 (part) |
| A2 Export fallback | Z-M2 | C-M4, C-M5 | — | §1 table | R9-M6, R9-M10 |
| A3 Package storage | Z-M4 | C-N6 | D-N6 | A1 | R9-M12 |
| A4 Validation scope | Z-M5 | C-M3 | — | §1 table | R9-M7, R9-M8 |
| A5 Sidecar scope | Z-M6 | C-N2 | C7-M4 | §1 table | — |
| A6 Planning milestone | — | — | — | A1 | — |
| A7 mm only | — | — | — | A3 | — |
| A8 Plan altitude | Z-M7 | C-N2 | — | §1 table | R9-M16 |
| X-B1 Deferred defects | Z-N5 | C-B1 | — | A2 | R9-B1 |
| X-B2 Test expectations | — | C-B2 | — | §1 table | R9-M7 |
| X-B3 ncCAM probe citation | Z-N3 | C-M2 | W-N5 | §1 table | R9-B2 |
| X-M1 Facts already in source | Z-M3 | C-M1 | C7-M5 | — | R9-M1 |
| X-M2 §7 vs §5.5 | Z-M1 | — | C7-M1 | — | — |
| X-M3 Rounding of minimums | — | — | C7-M7 | — | — |
| X-M4 Harness and mock | — | C-M6 | — | A4 | R9-M2–M5 |
| X-M5 Versioning | — | C-M7 | — | — | R9-M9 |
| X-M6 layout.json / onAxis | — | C-M8 | — | — | W nit |
| X-M7 R2 server effects | — | — | C7-M8 | §1 table | — |
| X-M8 Permissions | — | — | — | — | R9-M15 |
| X-M9 Input fields | — | — | — | — | R9-M11 |
| X-M10 Mesh loading and identifiers | — | C-N6 | — | — | R9-M12, R9-M13 |
| X-M11 Mesh repair | — | — | — | — | R9-M14 |
| X-M12 Phase 0 outcomes | — | C-M5 | — | §1 table | R9-M6 |
| X-M13 Tag rule | — | — | C7-M3 | §1 table | — |
| X-M14 Unverified claims | — | — | C7-M9 | §1 table | — |
| X-M15 Missing ACs | — | — | C7-M6 | §1 table | — |
| X-M16 Lead-in and terminology | — | — | C7-M10, C7-M11 | — | — |
| X-M17 Review-loop growth | — | — | — | A2 | — |
