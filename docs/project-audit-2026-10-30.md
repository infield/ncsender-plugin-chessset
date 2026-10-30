> **Historical record.** This audit was written on October 30, 2026, *before* the reorganization it proposed. Its file paths describe the old layout. The migration was approved and carried out the same day; see the git log. For current paths, see `docs/designs/egm/reviews/INDEX.md`.

# Chess Set Creator: project audit and reorganization proposal

- **Prepared:** October 30, 2026, for Marc Infield.
- **Scope:** read-only audit. Nothing in the project folder was changed.
- **Project folder:** `…/Francis Creations/ncsender_plugins/Chess-Set-Creator/` (Google Drive shared drive). Called **the project** below.

**What was inspected:**
- every file in the project
- the sibling `../AAxis/` plugin, which is a git repo
- the installed Claude plugins and marketplaces
- the GitHub account `infield`
- the EGM plugin's own conventions (`docs/claude.md`, `egm_draft`, `egm_review`)

---

## 0. Ground truth first

| Question | Answer |
|---|---|
| Is the project a git repository? | **No.** There is no `.git`, so there is no history, branches or commits. Only `../AAxis/` is under git. |
| Is there a GitHub repo, issues or milestones? | **No.** `gh repo list infield` shows `ncsender-plugin-aaxis`, `ContourCNC`, `contour-catalog` and `Contour`. There is no chess-set repo. |
| Is there a project `CLAUDE.md` or other agent instructions? | **No.** The closest is `../AAxis/CLAUDE.md` ("This folder holds ncSender plugins built for Marc's shop"). It sits in a sibling folder, so it doesn't load automatically in a Chess-Set-Creator session. There's also no user-level `~/.claude/CLAUDE.md`. |
| Is there source code or tests? | **No.** The plan reserves the paths: `com.infield.chessset/`, `src/`, `tools/`, `tests/`, `packages/`, `build.mjs`, `build.sh`, `package.json`, `.gitignore`. None of them exist yet. |
| Is there a README or user documentation? | **No.** |
| Which plugins are installed? | **EGM 0.1.0** (`google/elephant-goldfish-model`) and swift-lsp, which isn't relevant. |
| Which plugins are available but not installed? | **pm-skills** (`phuryn/pm-skills`) is registered as a marketplace but not installed. It includes `ideal-customer-profile`, `user-personas`, `user-segmentation`, `job-stories`, `interview-script`, `summarize-interview`, `identify-assumptions-existing`, `product-vision`, `create-prd`, `outcome-roadmap`, `competitor-analysis` and more. |
| Which plugins aren't present at all? | **Anthropic Product Management** and **Compound Engineering**: no marketplace or cache entry for either. Their folder conventions could not be checked, so everything below that depends on them is marked *unverified*. |
| Which files did the review context use? | Copies of the context repos are in this session's scratch folder (`egm_context/`, about 775 MB): ncSender `2f8a659`, ncCAM `68a5ed8`, Staunton-Pieces `cef2c79`. They aren't part of the project. |

---

## 1. How the existing EGM artifacts are organized

The EGM plugin writes everything to the **working directory** and uses **fixed file names**: `zoom_out_report.md`, `comprehension_report.md`, `critic_report.md`, `intermediate_zoom_out_report.md`, `implementation_readiness_report.md`, `goldfish_review_report.md`, `consolidated_review_report.md`, `design_draft.md`.

Each new run overwrites the previous run's files. In this project, earlier rounds were saved by hand: some were renamed with suffixes (`_rev1`, `_stage7`) and the rest were moved to `_archive/` before the next run.

EGM supports exactly one supported way to change where reports go: a line `EGM artifact directory: <path>` in `CLAUDE.md` or `AGENTS.md`, per `egm/docs/claude.md`. EGM's draft skill also defaults finished designs to `docs/designs/` and registers them in `docs/designs/SITEMAP.md`.

### 1.1 What the project actually contains

```
Chess-Set-Creator/
├── Chess_Set_Creator.md            the one authoritative document: product requirements, the technical
│                                   spec and the implementation plan, all in one file. Revision 7, 1,390 lines.
├── design_draft.md                 EGM drafting copy of the plan at Revision 6. Its own header says
│                                   "Edit the spec, not this file." Stale duplicate.
├── Wooden_Staunton_Build_Notes.md  shop notes on physical sizing, weights and finishing. Not about the plugin.
├── zoom_out_report.md              ┐
├── comprehension_report.md         │ Revision 7 review run, Stages 5–9, plus the consolidated report.
├── critic_report.md                │ Complete; findings not yet resolved.
├── intermediate_zoom_out_report.md │
├── implementation_readiness_report.md
├── consolidated_review_report.md   ┘
├── test_files/                     two ASCII STLs used to answer O-1 and O-2 with Rotary CAM (Phase 0)
└── _archive/
    ├── Chess_Set_Creator_2026-10-30_pre-review-draft.md   Revision 1
    ├── …_rev2.md   …_rev3.md   …_rev6.md                  (no snapshot of Revisions 4, 5 or 7)
    └── reviews_before_rev7/                               earlier review rounds, original names kept
```

### 1.2 The spec's revisions and review rounds

| Rev | What changed | Reviews of this revision | Resolution |
|---|---|---|---|
| 1 | First draft (349 lines) | S5 `zoom_out_report.md`; S6 `comprehension_report.md`; S7 `critic_report_rev1.md` | `goldfish_review_report_rev1.md`: 14 fixes accepted but **not applied**, superseded by a rewrite |
| 2 | Restructured by topic | S7 re-audit `critic_report.md` | `goldfish_review_report_stage7.md`: 14 fixes applied, giving Rev 3 |
| 3 | Fixes applied | S8 `intermediate_zoom_out_report.md` | — |
| 4 | Owner answers: Rotary CAM tab and axis, 36 in maximum blank, jaw sets, 12 in test blank | none | **No snapshot** |
| 5 | Implementation plan added | S9 `implementation_readiness_report_rev1.md` | `goldfish_review_report.md`: 20 fixes applied, giving Rev 6. **No Rev 5 snapshot** (the report says so) |
| 6 | Plan revised | S9 re-audit `implementation_readiness_report.md`: 11 Majors (R-M1 to R-M11) **accepted but left open** | Spec line 593 points here. The file now lives in `_archive/reviews_before_rev7/` |
| 7 | Rotary CAM sidecar (§5.11) merged from owner input | Full run S5–S9, plus `consolidated_review_report.md` (3 🔴, 26 🟡) | **Not resolved.** Part A holds 8 owner decisions. **No Rev 7 snapshot**, and the live file is Rev 7 |

All 4 archived review files (Revisions 1–3) live in `_archive/reviews_before_rev7/` under their original names, along with every later round up to Rev 6. Several names collide across rounds: there are three different `critic_report*`, three `goldfish_review_report*`, and two `implementation_readiness_report*` files. Without the table above, nothing says which round a file belongs to.

---

## A. Inventory of existing artifacts

Status key:
- **Auth** = authoritative source of truth
- **Dup** = duplicates another artifact
- **Hist** = historical record, kept but not current

| # | Path (relative to project) | Purpose | Status | Subsystem | Category | Auth? | Duplicates | Proposed destination |
|---|---|---|---|---|---|---|---|---|
| 1 | `Chess_Set_Creator.md` | Single source of truth. §1 problem, §2 goals and non-goals, §3 glossary, §4 users and flow, §5 requirements (5.1–5.11), §6 architecture, §7 alternatives, §8 risks, §9 acceptance criteria, §10 reference package, §11 worked examples, §12 verified host facts, §13 open questions, §14 test files, §15 references, Appendices A–B, then **Detailed Implementation Plan** P1–P6 (lines 589–1390) | Rev 7, draft. The header says "draft, not implemented". The plan section says "approved", which the Rev 7 review flags as a contradiction (X-B1) | All | PRODUCT (§1, 2, 4) + ARCHITECTURE/EGM (§3, 5–15, appendices) + ENGINEERING (plan) | **Yes** | Plan is copied in #2 (stale). Appendix A copies a table from #3 on purpose | `docs/designs/egm/chess-set-creator.md`, kept whole (see B.3) |
| 2 | `design_draft.md` | EGM drafting copy of the plan | Stale. It matches Rev 6's plan and lacks the sidecar edits (13 lines differ) | Plan | ENGINEERING | No (its header says so) | **Dup** of #1, lines 589–1390 | `docs/designs/egm/history/design_draft_rev6-plan.md` |
| 3 | `Wooden_Staunton_Build_Notes.md` | Physical build: sizing table, weights and washers, epoxy, felt, rotary prep | Informative. Split out of Rev 1 | Domain (not the plugin) | RESEARCH (domain) / PROJECT KNOWLEDGE | Yes, for shop practice | Sizing table repeated in #1 Appendix A, intentionally | `docs/research/domain/wooden-staunton-build-notes.md` |
| 4 | `zoom_out_report.md` | S5 of Rev 7 | Complete | All | EGM reviews | Yes, for Rev 7 | — | `docs/designs/egm/reviews/rev7/` |
| 5 | `comprehension_report.md` | S6 of Rev 7 | Complete | All | EGM reviews | Yes, for Rev 7 | — | same |
| 6 | `critic_report.md` | S7 of Rev 7 | Complete | Spec | EGM reviews | Yes, for Rev 7 | — | same |
| 7 | `intermediate_zoom_out_report.md` | S8 of Rev 7 | Complete | All | EGM reviews | Yes, for Rev 7 | — | same |
| 8 | `implementation_readiness_report.md` | S9 of Rev 7 | Complete | Plan | EGM reviews | Yes, for Rev 7 | — | same |
| 9 | `consolidated_review_report.md` | Merged S5–S9 for Rev 7: Part A (owner decisions), Part B (fixes), fix order | Complete; **findings unresolved** | All | EGM reviews → backlog | **Yes: current to-do list for the design** | Summarises #4–#8 by design | same |
| 10 | `test_files/test_two_pawns_floating.stl`, `…_necked.stl` | Phase 0 fixtures for O-1 and O-2 | Created; **test not yet run** | Export / Rotary CAM handoff | ENGINEERING (test) | Yes | — | **Stay in place** until Phase 0 is recorded (the spec cites `test_files/` 6 times) |
| 11 | `_archive/Chess_Set_Creator_2026-10-30_pre-review-draft.md` | Rev 1 snapshot | Hist | All | EGM history | No | Superseded by #1 | `docs/designs/egm/history/rev1.md` |
| 12 | `_archive/…_rev2.md` | Rev 2 snapshot | Hist | All | EGM history | No | Superseded | `…/history/rev2.md` |
| 13 | `_archive/…_rev3.md` | Rev 3 snapshot | Hist | All | EGM history | No | Superseded | `…/history/rev3.md` |
| 14 | `_archive/…_rev6.md` | Rev 6 snapshot | Hist | All | EGM history | No | Superseded | `…/history/rev6.md` |
| 15 | `_archive/reviews_before_rev7/zoom_out_report.md` | S5 of Rev 1 | Hist | All | EGM reviews | No | — | `…/reviews/rev1/` |
| 16 | `…/comprehension_report.md` | S6 of Rev 1 | Hist | All | EGM reviews | No | — | `…/reviews/rev1/` |
| 17 | `…/critic_report_rev1.md` | S7 of Rev 1 | Hist | Spec | EGM reviews | No | — | `…/reviews/rev1/critic_report.md` (suffix dropped once in its own folder) |
| 18 | `…/goldfish_review_report_rev1.md` | Resolution of Rev 1 S7: accepted, not applied | Hist, superseded | Spec | EGM resolved findings | No | — | `…/reviews/rev1/goldfish_review_report.md` |
| 19 | `…/critic_report.md` | S7 re-audit of Rev 2 | Hist | Spec | EGM reviews | No | — | `…/reviews/rev2/` |
| 20 | `…/goldfish_review_report_stage7.md` | Resolution giving Rev 3 | Hist, resolved | Spec | EGM resolved findings | No | — | `…/reviews/rev2/goldfish_review_report.md` |
| 21 | `…/intermediate_zoom_out_report.md` | S8 of Rev 3 | Hist | All | EGM reviews | No | — | `…/reviews/rev3/` |
| 22 | `…/implementation_readiness_report_rev1.md` | S9 of Rev 5 | Hist | Plan | EGM reviews | No | — | `…/reviews/rev5/implementation_readiness_report.md` |
| 23 | `…/goldfish_review_report.md` | S9 resolution giving Rev 6 (20 fixes) | Hist, resolved | Plan | EGM resolved findings | No | — | `…/reviews/rev5/goldfish_review_report.md` |
| 24 | `…/implementation_readiness_report.md` | S9 re-audit of Rev 6; **source of R-M1 to R-M11, which the spec still cites as open** | Hist, but **still referenced** | Plan | EGM reviews | Partly: the R-M list | Overlaps Rev 7 S9 (#8) | `…/reviews/rev6/` |
| 25 | `../AAxis/CLAUDE.md` *(outside the project)* | ncSender plugin model, shop machine facts, build and release conventions | Live, owned by the AAxis repo | Host integration | PROJECT KNOWLEDGE | Yes | — | **Do not move.** Link to it from the new `CLAUDE.md` |
| 26 | `egm_context/` *(outside the project, session scratch)* | Copies of the review context repos | Temporary | Review context | — | No | Upstream repos | **Don't copy.** Record the three commits in `docs/designs/egm/review-context.md` |

### A.1 MISSING (the audit found no such artifact)

| Category | Missing artifact | Closest existing material (facts only) |
|---|---|---|
| PRODUCT | Vision statement | §1 problem statement and §2 goals (#1) |
| PRODUCT | Target audience / ICP | §4: "One user: Marc, on ncSender 2.x Pro … at the shop machine." No other audience is documented |
| PRODUCT | Personas | — |
| PRODUCT | Standalone PRD | Requirements are inside #1 §5, tagged [C]/[P]/[O-n]/[v2] |
| PRODUCT | Success metrics | Only acceptance criteria (#1 §9). There is no outcome metric, such as time saved or stock waste |
| PRODUCT | Roadmap | Only v1/v2 tags and implementation phases 0–6 (#1 P3). No dates, no milestones beyond D12's version rule |
| PRODUCT | Product decision log | Owner decisions are scattered: header revision notes, [C] tags, Rev 4 answers, Rev 7 sidecar input |
| RESEARCH | User discovery / interviews | — |
| RESEARCH | Jobs-to-be-done | — |
| RESEARCH | Competitive analysis | — (no comparison with manual CAD layout or other rotary layout tools) |
| RESEARCH | Market assumptions | — |
| RESEARCH | Validation evidence | — (Phase 0 and Phase 6 are planned technical validation, not run) |
| ARCHITECTURE | Technical decision log (ADR index) | §7 alternatives and plan P1 (D1–D13) inside #1 |
| ARCHITECTURE | Review index / map of rounds | Only §1.2 of this audit |
| ENGINEERING | Source code, tests, build scripts | Paths reserved by plan P2 |
| ENGINEERING | Issue tracker / task list | Rev 7 consolidated report (#9) is the de facto backlog |
| ENGINEERING | Technical-debt register | — (open findings act as debt) |
| ENGINEERING | Release notes / CHANGELOG | Planned at `com.infield.chessset/CHANGELOG.md` (AAxis convention) |
| ENGINEERING | Lessons learned | — |
| KNOWLEDGE | Project `CLAUDE.md`, README, `WORKFLOW.md` | `../AAxis/CLAUDE.md` (sibling only) |
| KNOWLEDGE | Git repository and history | — |

---

## B. Proposed project structure

### B.1 Design rules

1. **One source of truth per fact.** `PRODUCT.md`, `ROADMAP.md` and the `docs/*` READMEs **link** into the spec; they don't copy it.
2. **Leave the spec whole for now.** Product requirements, the EGM spec and the plan stay in one file until the Rev 7 findings are resolved. Splitting it now would create three files that drift apart, and it would invalidate every line reference in the Rev 7 reports. See B.3 for when a split makes sense.
3. **Keep EGM's fixed report names; control their location.** Each review round gets its own folder, so names never collide and no file is overwritten. Point EGM at the current round's folder with `EGM artifact directory:` in the project `CLAUDE.md`.
4. **Code paths come from plan P2 and are reserved.** The structure doesn't create, rename or clash with `com.infield.chessset/`, `src/`, `tools/`, `tests/`, `packages/` or the build files.
5. **Install plugins at user level; don't copy them in.** `.claude/skills/` is only for skills specific to this project.

### B.2 Tree

New folders and files below are marked **NEW**. Files that would only hold a pointer, or record that something is MISSING, are marked *(stub)*.

```
Chess-Set-Creator/                       ← becomes a git repo (step M0)
├── CLAUDE.md                NEW  project instructions. Links ../AAxis/CLAUDE.md for the ncSender plugin
│                                 model. Includes the line:
│                                 "EGM artifact directory: docs/designs/egm/reviews/current"
├── README.md                NEW  what the plugin is, status, where the docs are
├── PRODUCT.md               NEW  (stub) index into spec §1, §2, §4 and the [C] requirements.
│                                 Lists the MISSING product artifacts
├── ROADMAP.md               NEW  (stub) only what's documented: v1 vs v2 tags, plan phases 0–6, D12 versions
├── WORKFLOW.md              NEW  stage ownership and handoff gates (section F)
├── test_files/                   unchanged until Phase 0 results are recorded
├── docs/
│   ├── product/
│   │   ├── personas/        NEW  (stub) MISSING
│   │   ├── requirements/    NEW  README → spec §5 (the requirements live there today)
│   │   └── decisions/       NEW  product-decisions.md: owner decisions to date, each with date and spec link
│   ├── research/
│   │   ├── audience/        NEW  (stub) MISSING
│   │   ├── jobs-to-be-done/ NEW  (stub) MISSING
│   │   ├── competitive-analysis/ NEW (stub) MISSING
│   │   ├── validation/      NEW  Phase 0 and Phase 6 result records go here when they exist
│   │   └── domain/
│   │       └── wooden-staunton-build-notes.md   ← #3
│   ├── designs/                      (EGM's default design folder)
│   │   ├── SITEMAP.md       NEW  EGM's index of designs (one row: chess-set-creator)
│   │   ├── egm/
│   │   │   ├── chess-set-creator.md          ← #1, the authoritative spec
│   │   │   ├── review-context.md   NEW  the three context-repo commits used by the reviewers
│   │   │   ├── reviews/
│   │   │   │   ├── INDEX.md  NEW  the §1.2 table: revision → stage → file → resolution
│   │   │   │   ├── rev1/  rev2/  rev3/  rev5/  rev6/   ← #15–#24
│   │   │   │   ├── rev7/                               ← #4–#9
│   │   │   │   └── current/  NEW  empty; where EGM writes the next round. Renamed to revN when done
│   │   │   └── history/
│   │   │       ├── rev1.md rev2.md rev3.md rev6.md     ← #11–#14
│   │   │       ├── rev7.md   NEW  snapshot of the live file before any further edit
│   │   │       └── design_draft_rev6-plan.md           ← #2
│   │   ├── architecture/    NEW  README → spec §6 (architecture lives there)
│   │   └── decisions/       NEW  README: ADR index → spec §7 and plan P1 D1–D13
│   └── engineering/                  (Compound Engineering conventions *unverified*; adjust after install)
│       ├── plans/           NEW  README → the spec's Detailed Implementation Plan
│       ├── decisions/       NEW  (empty) implementation-time decisions
│       ├── lessons/         NEW  (empty) compound-engineering learnings
│       └── release-notes/   NEW  README → com.infield.chessset/CHANGELOG.md once it exists
├── .claude/
│   └── skills/              NEW  (empty) project-only skills, if any
│
│   ── reserved by plan P2; not created by this migration ──
├── com.infield.chessset/   src/   tools/   tests/   packages/
└── build.mjs  build.sh  package.json  .gitignore
```

### B.3 When to split the spec (deferred; your decision)

After the Rev 7 findings are resolved and re-reviewed, the plan section (P1–P6) could move to `docs/engineering/plans/chess-set-creator-v1-plan.md`, leaving the spec as product plus architecture. EGM's review splits the spec at the `## Detailed Implementation Plan` heading anyway, so either layout works with EGM.

Splitting now is not recommended: the Rev 7 reports cite line numbers in the single file.

---

## C. File migration mapping

**Preconditions:**
- No other session is editing the project.
- You approve.

**Order matters:**
1. Put the current state under git.
2. Snapshot Rev 7.
3. Move files with `git mv`.
4. Fix links.
5. Add the new index files.

| Step | From | To | Method | Link updates needed |
|---|---|---|---|---|
| M0 | *(whole folder)* | — | `git init`. Commit everything **exactly as it is now** ("snapshot before reorganization"). `.gitignore`: `.DS_Store`, `node_modules/`, `*.zip`. Large STLs: `test_files/` totals about 7 MB, acceptable without Git LFS | — |
| M0b *(optional)* | `_archive` snapshots | git history | Optionally replay Rev 1, 2, 3, 6 and 7 as a sequence of commits on a separate branch, so `git log -p` shows how the spec evolved. The snapshot files stay either way | — |
| M1 | `Chess_Set_Creator.md` (live) | `docs/designs/egm/history/rev7.md` | **copy** (snapshot, so the Rev 7 reports' line numbers stay checkable) | none |
| M2 | `Chess_Set_Creator.md` | `docs/designs/egm/chess-set-creator.md` | `git mv` | Inside the spec: `../AAxis/CLAUDE.md` ×4 → `../../../../AAxis/CLAUDE.md`. `` `test_files/…` `` ×6 → `../../../test_files/…`. `_archive/` ×1 → `history/`. `Wooden_Staunton_Build_Notes.md` ×1 → `../../research/domain/wooden-staunton-build-notes.md`. Bare report names: line 5 (`critic_report.md`, `goldfish_review_report.md` = Rev 2 round) → `reviews/rev2/…`; line 553 (references list) → `reviews/INDEX.md`; line 593 (`implementation_readiness_report.md`, R-M list) → `reviews/rev6/implementation_readiness_report.md`. **Do not change** `../x`, `../king.stl`, `packages/script-name/` or `packages/staunton-clarkerubber/`: these are test inputs or code paths relative to the repo root, not document links |
| M3 | `design_draft.md` | `docs/designs/egm/history/design_draft_rev6-plan.md` | `git mv` | none (no inbound links) |
| M4 | `Wooden_Staunton_Build_Notes.md` | `docs/research/domain/wooden-staunton-build-notes.md` | `git mv` | inbound: spec (handled in M2) |
| M5 | `zoom_out_report.md`, `comprehension_report.md`, `critic_report.md`, `intermediate_zoom_out_report.md`, `implementation_readiness_report.md`, `consolidated_review_report.md` | `docs/designs/egm/reviews/rev7/` (same names) | `git mv` | Cross-references between these six stay valid (same folder). In `consolidated_review_report.md`: `_archive/reviews_before_rev7/` → `../rev6/` (and the other `revN/` folders) |
| M6 | `_archive/reviews_before_rev7/zoom_out_report.md`, `comprehension_report.md` | `…/reviews/rev1/` | `git mv` | none |
| M7 | `…/critic_report_rev1.md`, `…/goldfish_review_report_rev1.md` | `…/reviews/rev1/critic_report.md`, `…/reviews/rev1/goldfish_review_report.md` | `git mv` (rename) | Text inside that names the other `_rev1` file → update. Record old names in `INDEX.md` |
| M8 | `…/critic_report.md`, `…/goldfish_review_report_stage7.md` | `…/reviews/rev2/critic_report.md`, `…/reviews/rev2/goldfish_review_report.md` | `git mv` | same as M7 |
| M9 | `…/intermediate_zoom_out_report.md` | `…/reviews/rev3/` | `git mv` | none |
| M10 | `…/implementation_readiness_report_rev1.md`, `…/goldfish_review_report.md` | `…/reviews/rev5/implementation_readiness_report.md`, `…/reviews/rev5/goldfish_review_report.md` | `git mv` | same as M7 |
| M11 | `…/implementation_readiness_report.md` | `…/reviews/rev6/` | `git mv` | inbound: spec line 593 (handled in M2) |
| M12 | `_archive/Chess_Set_Creator_2026-10-30_pre-review-draft.md`, `…_rev2.md`, `…_rev3.md`, `…_rev6.md` | `docs/designs/egm/history/rev1.md`, `rev2.md`, `rev3.md`, `rev6.md` | `git mv` | Archived reports that name `_archive/Chess_Set_Creator_…` → update, or leave historical text as is and record the mapping in `INDEX.md` (recommended: don't edit historical reports) |
| M13 | `_archive/`, `_archive/reviews_before_rev7/` (now empty) | — | remove the empty folders **only** | — |
| M14 | — | `CLAUDE.md`, `README.md`, `PRODUCT.md`, `ROADMAP.md`, `WORKFLOW.md`, `docs/**/README.md` stubs, `reviews/INDEX.md`, `SITEMAP.md`, `review-context.md`, `product-decisions.md` | new files | Content is links and facts already in the spec; anything else is marked MISSING |
| M15 | `test_files/` | unchanged | — | Move later (e.g. to `docs/research/validation/phase0/`) once Phase 0 results are recorded, updating spec §14 and Phase 0 at the same time |

**What does not change:**
- `../AAxis/` (separate repo)
- `~/.claude/plugins/**`: EGM cache, marketplaces, plugin data. Plugin-managed; never edit.
- EGM's report file names
- the code paths reserved by P2

**Historical reports:** the policy is to **not edit historical reports' text**. `INDEX.md` records the old and new names, so a stale filename in an old report can still be resolved. Only the live spec and the Rev 7 consolidated report get their links updated.

**Verification after migration:**
- `git status` shows only renames (R100) plus the planned new files and link edits.
- A link check on the spec and the Rev 7 reports finds no broken relative links. The deliberate test strings `../x` and `../king.stl` are excluded.
- File count before = after, plus the new files. Nothing is deleted except the empty `_archive` folders.

---

## D. Requirements traceability matrix

Columns follow the 9 questions:
- **Problem:** what user problem it solves
- **Audience:** documented?
- **Approved req:** is there an approved product requirement?
- **EGM spec:** does it exist?
- **Reviewed:** has it been through Goldfish review?
- **Open findings:** are unresolved findings documented?
- **Impl:** has implementation started?
- **ACs:** are acceptance criteria defined?
- **Ready:** is it ready for engineering?

**Source key:** **D** = documented in the spec; **I** = inferred by this audit (not a recorded decision).

| Feature | Problem (source) | Audience | Approved req | EGM spec | Reviewed | Open findings | Impl | ACs | Ready |
|---|---|---|---|---|---|---|---|---|---|
| F1 Sizing from queen base diameter | Scaling six models consistently by hand (D: §1) | Marc only (D: §4) | Yes, [C] (§2 goal 1, §5.2) | §5.2 | Rev 7 full run | X-M3 rounding of minimums | No | AC-SIZE-01 | Nearly: small fixes |
| F2 Stock fit: width, length, jaw sets | Checking each piece fits the stock (D: §1) | Marc (D) | Yes, [C] (§5.3; jaw sets from owner, Rev 4) | §5.3 | Yes | X-M3; O-12 (square stock grip) open | No | AC-FIT-01–04 (AC-FIT-03 expectation wrong: X-B2) | Nearly |
| F3 Blank planning (exact packing, per side) | Fitting pieces end to end across blanks; redoing on any change (D: §1) | Marc (D) | Yes, [C] (§2 goals 3–4, §5.4) | §5.4, §11 worked examples | Yes; worked examples checked by hand in Rev 7 S6/S9 | X-M6 (layout.json shape) | No | AC-PLAN-01–04 | Nearly |
| F4 Model package import and validation | Geometry kept separate from plugin code (D: §2 goal 6, [C]) | Marc (D). Third-party packages only in v2 | Yes, [C] that geometry is separate. Storage and validation depth are [P] | §5.6, §5.7 | Yes | **Part A3, A4** (storage approach, validation scope); X-M1 | No | AC-PKG-01–04, AC-SEC-01 | **Blocked on owner decisions** |
| F5 Prepared Staunton package (`prepare-package`) | Upstream models misaligned (D: R6, Appendix B) | Marc (D) | Yes, v1 deliverable (§10) | §10, P4.11 | Yes | X-M11 (no mesh-repair procedure); Appendix B "closed after weld" = TBD | No | via AC-PKG-02 | Nearly |
| F6 Export geometry and support between pieces (necks vs Rotary CAM) | Roughing could part the blank (D: §5.5, §7) | Marc (D) | [P] with **O-2 open** | §5.5 | Yes | **Part A1**; X-M2 (§7 contradicts §5.5); depends on Phase 0 | No | AC-EXP-03, 04, 06 | **Blocked on Phase 0 test** |
| F7 Export to File Manager (job folder, licence, `layout.json`, no overwrite) | Handoff to Rotary CAM through the shared server store (D: §5.8, [C] path) | Marc (D) | Yes, [C] (folder and handoff). Fallback is [P] | §5.7, §5.8 | Yes | **Part A2** (ZIP fallback); X-B3 (wrong ncCAM citation); O-1 open | No | AC-EXP-01, 02, 05, 07 | **Blocked on Phase 0 and A2** |
| F8 Rotary CAM sidecar (`.rotary.json`) | Retyping stock and placement into Rotary CAM (D: owner request, Rev 7; §5.11) | Marc (D) | Yes, [C] that it's wanted. Format is [P] | §5.11 | Yes (Rev 7) | **Part A5** (scope); O-13 (Rotary CAM author adoption); `onAxis` mismatch (X-M6) | No | AC-EXP-08 | Writer nearly ready; reading it is external |
| F9 Plan UI and 2-D preview, units display | Seeing the plan before exporting (D: §4 step 4) | Marc (D) | [P] (§6) | §6, P4.10 | Yes | X-M9 (input fields round-trip); host vs plugin unit setting (Z-N2) | No | AC-IN-01–03, AC-UI-01 | Needs fixes |
| F10 Plugin shell, settings, build and release | Run inside ncSender (D: §6) | Marc (D) | [P] | §6, P1–P2 | Yes | X-M4 (harness and mock), X-M5 (versioning), X-M8 (permissions), D11 licence pending | No | Phase exits in P3 | Needs fixes |
| F11 Distribution: package selector, GitHub download, checksums | Reuse prepared packages without manual import (D: §5.9) | **Not documented** beyond Marc. Distribution implies other users (I) | [v2] | §5.9 (outline only) | Not reviewed in depth (v2) | Browser cross-origin fetch question (§5.9) | No | none | Not in v1 |
| F12 Cut-progress tracking | Not stated | — | [v2] (§2) | none | No | — | No | none | Not in v1 |
| — Weight pockets, toolpaths, machine motion | — | — | **Non-goals** [C] (§2) | — | — | — | — | AC-EXP-05 enforces "no motion" | Out of scope |

**What's documented and what's inferred**
- **Documented:** the problem statement (§1), the goals (§2), and the [C] tags. These record owner confirmations, made in conversation with the spec author on October 30.
- **Not documented anywhere:**
  - why this matters beyond Marc's shop
  - who else would use it
  - what success looks like in outcome terms (for example time saved, or stock wasted vs manual layout)

  The audit does not fill these in.

---

## E. Current feature readiness assessment

| Feature | Classification | Why |
|---|---|---|
| F1 Sizing | **EGM review needed** (minor) | Spec reviewed; small findings open (X-M3, X-B2). After the fixes: Ready for engineering |
| F2 Stock fit | **EGM review needed** (minor) | Same, plus O-12 |
| F3 Blank planning | **EGM review needed** (minor) | Core algorithm sound and checked by hand; the `layout.json` shape needs pinning down |
| F4 Package import | **Product decision needed** | Part A3 (store meshes vs re-pick folder) and A4 (validation depth) |
| F5 Prepared package | **EGM review needed** | Mesh-repair procedure missing (X-M11) |
| F6 Export geometry and support | **Discovery needed** (technical, not user) | O-1 and O-2 need the Phase 0 Rotary CAM test with `test_files/`. Then Part A1 |
| F7 File Manager export | **Product decision needed** | Part A2 (fallback), then Phase 0 |
| F8 Sidecar | **Product decision needed** | Part A5 (scope); O-13 depends on the Rotary CAM author |
| F9 UI and preview | **EGM review needed** | X-M9, units setting |
| F10 Shell, build, release | **EGM review needed** | X-M4, X-M5, X-M8; D11 licence is a product decision |
| F11 Distribution (v2) | **Discovery needed** | Audience beyond Marc is undocumented. Whether to distribute at all is the open product question |
| F12 Cut-progress tracking (v2) | **Discovery needed** | No problem statement |

Nothing is *In implementation*, *Ready for validation* or *Complete*.

**Possible fast path:** the consolidated review (Stage 8, A1) suggests a **planning-only milestone** (F1–F3 plus F9, with package import that stores settings only). It could reach *Ready for engineering* soon after the minor fixes, without waiting for Rotary CAM.

---

## F. Recommended workflow and next steps

### F.1 Critique first: what this workflow may not fit

- **Size mismatch.** This is a single-user shop tool: one documented user, roughly a few thousand lines of browser JavaScript. Running four full methods (PM, JTBD/ICP, EGM, Compound Engineering) on every change would cost more than the product. The structure below lets each stage be skipped when its entry question is already answered.
- **The real product question isn't recorded yet:** is this Marc's personal tool, or something for other ncSender rotary users?
  - **If personal:** ICP and JTBD work adds little, and v2 distribution is questionable.
  - **If for others:** §4 ("One user: Marc") and several [C] decisions (maple/walnut only, the shop's jaw sets, the 36 in maximum blank) were made for one shop and would need reopening.

  This is the main discrepancy for you to decide. It isn't settled here.
- **Review churn.** Rev 7 was the fourth EGM round in one day. The Stage 8 reviewer flagged that each round grows the spec (A2). The workflow below caps EGM at one re-review per design change.

### F.2 Ownership and handoffs

| Stage | Owns | Tools | Entry criteria | Exit / handoff criteria | Writes to |
|---|---|---|---|---|---|
| **Product management** | Vision, requirements, priority, roadmap, success criteria, owner decisions | pm-skills: `product-vision`, `create-prd`, `outcome-roadmap`, `prioritization-frameworks`. Anthropic PM plugin: *not installed; confirm which plugin you mean* | A new idea, a discovery result, or an EGM finding that needs an owner decision | Each requirement has an owner-confirmed status ([C]/[P]/[v2]), a success criterion, and a priority. Recorded in `docs/product/decisions/` with a link to the spec section it changes | `PRODUCT.md`, `ROADMAP.md`, `docs/product/` |
| **Product discovery** | Audience, ICP, jobs-to-be-done, interviews, assumption tests, validation evidence | pm-skills: `ideal-customer-profile`, `user-personas`, `job-stories`, `interview-script`, `summarize-interview`, `identify-assumptions-existing`, `prioritize-assumptions`, `competitor-analysis` | PM marks an audience or problem question "discovery needed" | Evidence file in `docs/research/…` with source and date. **Any conflict with an existing spec item is filed as a discrepancy for the owner, not edited into the spec** | `docs/research/` |
| **EGM** | Technical spec, architecture, alternatives, adversarial review, design integrity | `/egm:egm_draft`, `/egm:egm_review`, `egm-resolve` (installed) | A requirement marked [C] or [P] by PM that changes behaviour or architecture | Review stages pass with no 🔴. Every 🟡 is fixed or recorded as an accepted trade-off by the owner. The review round is archived to `reviews/revN/`. The spec snapshot is in `history/` | `docs/designs/egm/` |
| **Engineering** | Implementation plan execution, code, tests, code review, release readiness, lessons | Compound Engineering (*not installed; folder conventions unverified*), EGM Stage 9 for plan readiness, `pr-review-toolkit` / `code-review` (available in the official marketplace) | A feature classified *Ready for engineering*: spec section and plan phase have no open 🔴/🟡 | All the phase's ACs pass (P5.7). CHANGELOG entry. Lessons in `docs/engineering/lessons/`. Any deviation from the spec goes back to EGM as a finding, not a silent code change | `com.infield.chessset/`, `src/`, `tests/`, `docs/engineering/` |

**Rules that cut across stages:**
1. **Existing EGM work stands.** New PM or discovery work can *question* a [C] item. It can't change one. Changes go through the owner's decision log, then an EGM revision.
2. **Discrepancy procedure.** If any stage finds a conflict with the spec:
   - record it in `docs/product/decisions/discrepancies.md` (date, source, spec section, the conflict, options)
   - leave the spec unchanged
   - ask the owner
3. **One source per fact.** PM and research files link to spec sections; they don't restate requirements.

### F.3 Next steps, in order

1. **Approve or adjust this reorganization**, then run migration M0–M15. This is the only step that changes files, and only with your approval.
2. **Decide the product framing question** (personal tool, or for other ncSender users). This decides whether discovery work is worth doing now.
3. **Decide Part A1–A8** of `consolidated_review_report.md` (the owner decisions from the Rev 7 review).
4. **Run Phase 0** on the machine: load `test_files/` STLs in Rotary CAM and record O-1 and O-2 in `docs/research/validation/`.
5. **Apply the Rev 7 fixes** (Part B) as Revision 8, then do one EGM re-review of Stages 7 and 9 only.
6. **Optionally start the planning-only milestone** (F1–F3, F9) in engineering while Phase 0 is pending.
7. **Install the tools before running their stages:**
   - `pm-skills` is ready to install from its registered marketplace.
   - Confirm which "Anthropic Product Management" plugin and which "Compound Engineering" source you mean. After installing them, check their output folders against B.2 `docs/engineering/` and `docs/product/`.

---

## G. Risks and possible information loss

| # | Risk | Impact | Mitigation |
|---|---|---|---|
| G1 | **No git.** Moves done without git leave no trace, and Google Drive's own version history doesn't track renames well | Losing track of where things came from | Step M0: commit the exact current state first, then use `git mv` for every move |
| G2 | **Snapshots already missing:** Revs 4, 5 and the live Rev 7 have no copy | Rev 7 reports cite line numbers in the live file; the next edit makes them unverifiable | Step M1: snapshot Rev 7 before *any* edit. Revs 4 and 5 can't be recovered from the project (Drive version history may have them) |
| G3 | **EGM overwrites fixed report names** on every run | A future run silently replaces Rev 7 reports | `EGM artifact directory: docs/designs/egm/reviews/current` in `CLAUDE.md`, then rename `current/` to `revN/` after each round |
| G4 | **Concurrent sessions.** Another thread was editing the spec earlier today | A move during an edit loses that edit, or the edit recreates a file at the old path | Confirm no other session is active before M0. Afterwards, agents follow `CLAUDE.md` for paths |
| G5 | **Git on Google Drive.** Drive sync and git lock files conflict; AAxis `CLAUDE.md` notes delete permission is needed | Corrupt index, or "conflict" copies | Follow the AAxis practice (delete permission per session). Or keep the git working copy on local disk and sync to Drive (your choice) |
| G6 | **Link rewriting catches test strings** (`../x`, `../king.stl`, `packages/…`) | Broken tests or broken requirements | Explicit exclusions in M2. Link check afterwards |
| G7 | **The R-M1 to R-M11 list exists only in the Rev 6 Stage 9 report** | If that file is treated as obsolete history, the deferred defects are lost | Keep it in `reviews/rev6/`. `INDEX.md` marks it "still referenced by the live spec" until X-B1 is fixed |
| G8 | **`design_draft.md` looks like a current plan** | Someone implements from the stale Rev 6 plan, missing the sidecar | Move it to `history/` with its "edit the spec" header intact |
| G9 | **Duplicating the spec** into `PRODUCT.md` or `docs/product/requirements/` | Copies drift apart | Stubs link only (B.1 rule 1). Any split happens later as a *move* (B.3) |
| G10 | **The new process reopens settled decisions without the owner** | Approved [C] items churn | Rule F.2-1 and the discrepancy procedure |
| G11 | **Unverified conventions** for Compound Engineering and the Anthropic PM plugin | The proposed `docs/engineering/` or `docs/product/` folders may not match where those tools write | Mark as provisional. Check after install, before their first use |
| G12 | **The review context lives in session scratch** (`egm_context/`) | Context lost after cleanup; reviewers can't reproduce | `review-context.md` records the three upstream commits. They can be re-cloned |
