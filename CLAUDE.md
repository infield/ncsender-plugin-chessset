# CLAUDE.md: Chess Set Creator

Chess Set Creator is an ncSender plugin, not yet built. It scales a six-piece chess model set from one queen-base diameter and packs a full side (16 pieces) onto the fewest turning blanks. It then writes one STL per blank, plus a sidecar file, into an ncSender File Manager folder for the Rotary CAM plugin.

Read this file before working here.

EGM artifact directory: docs/designs/egm/reviews/current

## Sources of truth

| What | Where |
|---|---|
| Requirements, technical spec, implementation plan | `docs/designs/egm/chess-set-creator.md`. This is the **only** authoritative spec. Product requirements (§1–§5), architecture (§6–§8) and the plan (`## Detailed Implementation Plan`, P1–P6) are all in this one file. |
| Open review findings and owner decisions still pending | `docs/designs/egm/reviews/rev7/consolidated_review_report.md` |
| Owner decisions made so far | `docs/product/decisions/product-decisions.md` |
| Workflow, stage ownership, list of authoritative documents | `WORKFLOW.md` |
| Feature → spec section → status | `docs/product/requirements/feature-index.md` |
| ncSender plugin model, shop machine, build and release conventions | `../AAxis/CLAUDE.md` (sibling repo; read it before writing plugin code) |

Paths in the spec are relative to this folder (the project root), not to the spec file.

## Rules

1. **Do not change a requirement or design decision without the owner.** If research or engineering contradicts the spec, add an entry to `docs/product/decisions/discrepancies.md` and ask. Don't edit the spec to match.
2. **No copies of the spec.** Other documents link to spec sections; they don't restate them.
3. **History is read-only.** Don't edit:
   - `docs/designs/egm/history/`
   - `docs/designs/egm/reviews/rev*/`

   The one exception is fixing a broken path, and only when the owner asks.
4. **Snapshot before editing the spec.** Before the first edit of a new revision, copy the live spec to `docs/designs/egm/history/rev<N>.md`. Review reports cite line numbers in that exact text.
5. **Code paths are reserved by plan P2:**
   - `com.infield.chessset/`
   - `src/`, `tools/`, `tests/`, `packages/`
   - `build.mjs`, `build.sh`, `package.json`

   Don't put documents there.
6. **No machine motion.** The plugin never calls `/api/gcode-job`, `/api/send-command` or `/api/gcode-files/load*` (spec §2, AC-EXP-05).
7. **Units:** the code works in mm. The display puts mm first, with inches in parentheses (shop convention from `../AAxis/CLAUDE.md`).

## EGM review rounds

EGM writes its reports under fixed names (`zoom_out_report.md`, `critic_report.md`, …), and the next run overwrites them. The `EGM artifact directory` line above sends them to `docs/designs/egm/reviews/current/` instead.

**Run a round:**
1. Snapshot the spec (rule 4).
2. Run `/egm:egm_review` with target `docs/designs/egm/chess-set-creator.md`, from this folder.
3. Pass the review context listed in `docs/designs/egm/review-context.md`.

**After the round:**
1. `git mv docs/designs/egm/reviews/current docs/designs/egm/reviews/rev<N>`.
2. Recreate an empty `current/` holding `.gitkeep`.
3. Add a row to `docs/designs/egm/reviews/INDEX.md`.

## Git

- **Repo:** local git, branch `main`, the same set-up as AAxis. No GitHub remote yet.
- **Google Drive:** the repo lives on a Drive shared drive. Git needs delete permission on the folder to clean up its lock and temp files (see `../AAxis/CLAUDE.md`, Git / releases).
- **Moves:** use `git mv` so history follows the file.
- **Commits:** commit only when asked.
