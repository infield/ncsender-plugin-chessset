# CLAUDE.md: Chess Set Creator

Chess Set Creator is an ncSender plugin, built and released as a public beta (0.1.x). It installs a chess set from the chess-set library, scales it from one queen-base diameter and packs a full side (16 pieces) onto the fewest turning blanks. It then writes one STL per blank, plus a sidecar file, into an ncSender File Manager folder for the Rotary CAM plugin, or offers the files as downloads. Export hasn't been tested in Rotary CAM yet (it's unreleased).

Read this file before working here.

EGM artifact directory: docs/designs/egm/reviews/current

## Sources of truth

| What | Where |
|---|---|
| Requirements, technical spec, implementation plan | `docs/designs/egm/chess-set-creator.md`. This is the **only** authoritative spec. Product requirements (§1–§5), architecture (§6–§8) and the plan (`## Detailed Implementation Plan`, P1–P6) are all in this one file. |
| Latest review round (resolved in Rev 9) and review history | `docs/designs/egm/reviews/rev8/`, `docs/designs/egm/reviews/INDEX.md`. The owner-directed changes made in place on Rev 9 during implementation (logged in the decision log) have **not** been reviewed. |
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
7. **Units:** the code works in mm, and everything stored or exported is mm. The dialog shows lengths in ncSender's own units setting (`unitsPreference`), with the other unit on a smaller line below; error sentences put it in parentheses (spec §5.1). There is no unit toggle in the plugin.
8. **Third-party models stay out of git.** Downloads go in `sources/` (git-ignored). Only a set's recipe (`packages/recipes/`) is committed here; the prepared set is published in the chess-set library, and only after its licence has been checked and the owner agrees. The Duchamp set is prepared but must not be published (owner decision).

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

## Development and release

- **Node 22.** The machine's default Node is 14. Prefix commands with `export PATH="$HOME/.nvm/versions/node/v22.22.0/bin:$PATH";`.
- **Checks before any commit of code:** `npm test` and `npm run ui-check` must both pass. `ui-check` needs Chrome; it intercepts GitHub requests and serves the library from the repo.
- **Build:** `./build.sh` bumps the patch version (`--no-bump` keeps it) and zips the plugin. Add a CHANGELOG entry for every zipped build. Spec D12.
- **Plugin release** (only when the owner asks): commit and push `main`, create the tag locally (`git tag -a v<version>`; `gh release create --target` fails without the workflow scope), push it, then `gh release create v<version> com.infield.chessset-<version>.zip --verify-tag --title "v<version> - Beta"`. Beta releases are **not** marked pre-release: ncSender's update check and `releases/latest` skip pre-releases.
- **Update check timing:** ncSender caches GitHub answers for 15 minutes on the server and once per session in the page. After a release, the owner waits about 15 minutes and reloads.
- **Chess-set library** (`infield/chessset-library`): each set is in `sets/<id>/`, listed in `library.json` and released as tag `<id>-v<version>` with `<id>-<version>.zip`. Tag and release a set before `library.json` lists it, because the plugin downloads from the tag. Sets start at 0.1.0 (beta); 1.0.0 needs owner approval after shop validation.

## Git

- **Repo:** git, branch `main`, the same set-up as AAxis. Remote `origin` = https://github.com/infield/ncsender-plugin-chessset (**public** since the M1 release, 2026-10-30, per DISC-8). Model packages are published from the chess-set library, https://github.com/infield/chessset-library (one folder per set under `sets/<id>/`, releases tagged `<id>-v<version>`; D14, §5.9). Use the HTTPS remote, as AAxis does; this machine has no SSH key for GitHub.
- **Pushing:** push only when the owner asks.
- **Branch protection:** `main` is protected against force pushes and deletion (set at M1). Pull requests aren't required; commits go straight to `main`, as in AAxis.
- **Google Drive:** the repo lives on a Drive shared drive. Git needs delete permission on the folder to clean up its lock and temp files (see `../AAxis/CLAUDE.md`, Git / releases).
- **Moves:** use `git mv` so history follows the file.
- **Commits:** commit only when asked.
