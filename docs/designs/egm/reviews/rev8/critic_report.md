# Stage 7: Critic Review Report (re-review of Revision 8)

- **Target:** `docs/designs/egm/chess-set-creator.md`, Revision 8 (snapshot `docs/designs/egm/history/rev8.md`), FeatureRange lines 1–691.
- **Reviewers:** three fresh-context reviewers, run in parallel:
  - egm-design (feature-spec standard)
  - egm-structural (feature-spec standard)
  - egm-style (persona rules)
- **Context supplied:**
  - the owner's decision and discrepancy logs (settled decisions, and the trade-offs accepted under A5)
  - ncSender at `2f8a659`
  - ncCAM at `68a5ed8`
  - Staunton-Pieces at `cef2c79`
  - the files the spec links to
- **Date:** 2026-10-30. This is Stage 7's one re-review after Revision 7.

| Reviewer | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| Design | Passes with conditions | 0 | 3 | 5 |
| Structural | Structurally compliant | 0 | 2 | 6 |
| Style | Pass with revisions | 0 | 2 | 11 |

**After removing duplicates:** 0 🔴, 7 🟡, grouped 🟢. Revision 7's Stage 7 run had 0 🔴 and 11 🟡; all 11 are resolved in Revision 8. No reviewer re-raised an owner-settled item.

**Orchestrator spot checks (ncSender `2f8a659`):**
- The tool menu broadcasts `plugin:show-dialog` to every client (`PluginEndpoints.cs:107–131`).
- The dialog is inserted with `v-html` (`PluginDialog.vue:35`).
- `config-ui` is `MapGet` (`PluginEndpoints.cs:140`).

These confirm R8-7-M1 and R8-7-N1.

**Confirmed correct by the reviewers:**
- every section the standard requires is present, and the heading hierarchy, fences and tables are valid
- the §11 worked examples, AC-FIT-01, AC-FIT-03 and the largest-queen-base figures recompute correctly
- every §12 citation is correct except the one in R8-7-N1

---

## 🟡 Major

### R8-7-M1. The spec doesn't describe how ncSender hosts the dialog [design M1]
- **Lines:** 455–458 (§6 "Runs in", "STL work").
- **Problem:** the plugin dialog is not an iframe. The tool menu broadcasts `plugin:show-dialog` to every connected client, and each client inserts the HTML with `v-html` and runs it inside ncSender's main window. This has two consequences:
  - **The UI can freeze.** The "falls back to the page if Workers are blocked" path writes up to about 38 MB of STL text on the main thread of the machine-control UI. That could stall feed-hold and stop during a running job.
  - **Clients can overwrite each other's settings.** Opening the dialog on one client opens it on every client. Settings `PUT` replaces the whole object, so the last writer wins (for example, during first-run setup).
- **Fix:**
  - State the hosting model in §6 and add a risk row.
  - Either remove the main-thread fallback for export, or block export while a job is running (from `server-state-update`).
  - State how conflicting settings writes from several clients are handled.

### R8-7-M2. The neck check guards the wrong dimension [design M2]
- **Lines:** 146, 345, 494 (R3).
- **Problem:** §5.3 blocks a neck wider than the smallest scaled *base*. Bases are 30–38 mm and the neck is 7.6 mm, so the check almost never fires. Because the neck covers the thin tops, the real weak point under outcome B is the smallest section anywhere along the blank: a waist, a top just behind the 0.5 mm overlap, or the neck itself. R3 describes this incorrectly.
- **Fix:**
  - From the stored radius profiles and the neck, report the smallest section diameter for each blank.
  - Correct R3's wording.
  - Record the smallest section on the 12 in test blank (O-4) so a threshold can be set.

### R8-7-M3. The Download files fallback isn't verified to work [design M3]
- **Lines:** 306–308, 483.
- **Problem:** two sides at 12 in produce 22 downloads. Browsers may block or prompt for multiple automatic downloads. The desktop app (`NcSender.Desktop/main.js`) has no download handler, so Electron shows Save As once per file. The A2 decision itself is not questioned here, only whether its mechanism works.
- **Fix:**
  - Add a risk row.
  - Add a Phase 0 check of downloads in both the desktop app and a browser client.
  - Specify the user flow: one click per file, or a list of links, not an automatic burst.

### R8-7-M4. "The plan" names two different things [style M1]
- **Lines:** 157, 183, 270, 439, 444, 503 (document) vs 164, 166, 170, 352 (the blank layout shown to the user).
- **Fix:** write "implementation plan" whenever the document is meant, and keep "plan" for the layout the user sees.

### R8-7-M5. A bare "neck" is ambiguous [style M2]
- **Lines:** 146, 197–199, 304, 345, 494, 625.
- **Problem:** the glossary separates the *parting neck* (made by Rotary CAM) from the *connecting neck* (added by the plugin), but the body often says just "neck". Line 199 uses it to mean the parting neck.
- **Fix:** write "connecting neck" (and "connecting-neck diameter") wherever outcome B is meant.

### R8-7-M6. The manifest example contradicts the text on which fields are required [structural M1]
- **Lines:** 217, 233–238, 244–245, 250.
- **Problem:** the example's convention is "required unless marked optional", but the four piece dimensions are not marked optional, while the text says they are.
- **Fix:** mark them `// optional; informational, ignored by v1`.

### R8-7-M7. The §5.5 lead-in claims both files record every rule [structural M2]
- **Lines:** 185, compared with §5.8 (298–305) and §5.11 (362–400).
- **Problem:** neither `layout.json` nor the sidecar records the encoding, the decimal places or the shell structure.
- **Fix:** use the lead-in "Rules for the exported STL:", and point to §5.8 and §5.11 for what each file records.

---

## 🟢 Nits (grouped)

**Accuracy**
- **R8-7-N1.** Line 612 (§12): `config-ui` is **GET**, not POST (`PluginEndpoints.cs:140`). The tool menu opens the dialog through `POST /api/plugins/tool-menu-items/execute`, which also fills in `__INITIAL_CONFIG__`. The same error is in plan P4.12 (the mock). [design N4]
- Line 111: the gap note asks for "cutter diameter plus clearance", but the minimum gap of 6.35 mm equals the cutter diameter. Raise the floor, or say clearance is the user's responsibility. [design N5; style N9]
- Lines 147, 340–341, 521: the per-piece minimum-length message and AC-FIT-03's single 143.6 mm figure disagree. State whether the minimum is per piece or for the whole set. [design N6]
- Line 522 (AC-FIT-04): 0.75 in stock at the default queen base also fails the width check. Name the errors expected alongside it, or use a smaller queen base for this test. [design N7]
- §5.6 check 4: say how the piece's axis is found (the centre of the base band; see plan P4.3). [design N8]
- Line 259: "usable meshes" overclaims, since closure isn't checked on import. Write "each file parses as STL and sits in the agreed frame". [style N5]
- Line 519: write "the widest are the bishop and rook". [style N7]

**Tags and structure**
- Line 9: a tag on a block or its lead-in covers every clause under it. Untagged clauses include 197, 261, 358 and 360. Tag every §7 "Chosen" cell. [structural N1]
- Line 13: "row" should be "number". [structural N2]
- Glossary: add Phase 0 (pointing to plan P3), Outcome A/B, per-blank card, and sidecar. [structural N3; style N10]
- Lines 50–52: promote "Deferred or open" to an H3. [structural N4]
- Link style: use relative Markdown links for project files and one form for URLs. [structural N5]
- Requirements with no AC: Download files always offered, the default job-name format, the scaled-dimensions table, and inputs restored on reopen. [structural N6]

**Wording**
- Lines 91 and 501: "Once Rotary CAM reads the sidecar" should be "If Rotary CAM adopts the sidecar" (O-13 is open). [style N4]
- Vague size words: 157, 354, 485 (also rewrite the reason for rejecting first-fit decreasing), 493, 664. [style N1]
- Subjective words in §7: 472 "just", 473 "simpler", 483 "rare". [style N2]
- Narration of the decision process: 249, 306, 356. Line 5 should be one sentence pointing to `CHANGES.md`. [style N3]
- Line 590: "this set" is ambiguous. Write "the Staunton package on the owner's machine". [style N6]
- Awkward phrasing: 9, 142, 286, 446, 503. [style N8]
- Spelling and date convention: the text mixes British spelling with US dates. Pick one. [style N11]

---

## Traceability

| Consolidated | Design | Structural | Style |
|---|---|---|---|
| R8-7-M1 Dialog hosting | M1 | — | — |
| R8-7-M2 Smallest section | M2 | — | — |
| R8-7-M3 Download mechanism | M3 | — | — |
| R8-7-M4 "plan" | — | — | M1 |
| R8-7-M5 "neck" | — | — | M2 |
| R8-7-M6 Manifest example | — | M1 | — |
| R8-7-M7 §5.5 lead-in | — | M2 | — |
| Nits | N4–N8 | N1–N6 | N1–N11 |
