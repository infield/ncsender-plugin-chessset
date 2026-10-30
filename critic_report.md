# Stage 7: Critic Review Report

- **Target:** `Chess_Set_Creator.md` Revision 7, FeatureRange lines 1–588.
- **Reviewers** (three fresh-context reviewers, run in parallel):
  - egm-design (feature-spec standard)
  - egm-structural (feature-spec standard)
  - egm-style (persona rules)
- **Context supplied:**
  - `egm_context/ncSender` at `2f8a659`
  - `egm_context/ncsender-plugin-nccam` at `68a5ed8`
  - `egm_context/Staunton-Pieces` at `cef2c79`
  - files the target links to
- **Date:** 2026-10-30.
- **Mode:** consolidated run. No fixes were applied between stages.

| Reviewer | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| Design | Conditional pass | 0 | 5 | 8 |
| Structural | Fail (narrowly) | 0 | 6 | 9 |
| Style | No blockers | 0 | 4 | 9 |

**After removing duplicates:** 0 🔴 · 11 🟡 · grouped 🟢. The ID in brackets after each finding is the reviewer finding it came from: D = design, S = structural, W = style.

**What the reviewers confirmed against source:** every section the standard requires is present. Headings are nested properly. These claims match the code:
- `file/save` is text-only and rejects paths that escape its folder.
- The upload limit is 200 MB.
- The load route does no extension check.
- Dot-folders are hidden from the File Manager.
- ncCAM's loader, Blob Worker and manifest values match what the spec says.

**Orchestrator spot checks:**
- D-M3 holds. A minimum width of 41.138 mm, rounded half up to 0.1, shows as 41.1 mm, and 41.1 mm stock fails the fit check.
- D-N3's triangle count holds. Blank N N R P P has 2 × 62,500 + 11,478 + 2 × 9,398 = 155,274 triangles.

---

## 🟡 Major

### C7-M1. §7 contradicts the §5.5 support decision [D-M1, S-M1; also Stage 5 Z-M1]
- **Lines:** 420–421 vs 160–163.
- **Problem:**
  - §5.5 leaves O-2 open and calls outcome A "preferred if available". Outcome A is: separate bodies, with Rotary CAM leaving the support.
  - §7 records "Necks in the STL" as chosen. It rejects separate bodies, and rejects "Rotary CAM adds the necks".
  - Line 421, "Revisit if O-2 is 'No'", no longer fits, because O-2 is now an A/B outcome.
- **Fix:**
  - Rewrite the "Blank connectivity" row as pending O-2: A preferred, B by default. Make the rejection reasons conditional on the outcome.
  - Reword line 421 to "Revisit if outcome B and overlapping shells are rejected".

### C7-M2. The O-2 fork isn't carried through the rest of the spec [D-M2, S-M2]
- **Lines:** 101–102, 124, 164–165, 278, 380, 433, 468, 470.
- **Problem:**
  - Line 161 drops the neck input and the covered-top rule under outcome A.
  - These still assume necks with no condition:
    - the neck input, tagged [C] (102)
    - the neck-vs-base check (124) and its error row (278)
    - the R3 mitigation (433)
    - AC-EXP-04, "joined by necks" (468)
    - AC-EXP-06 (470)
  - The gap rule (101) also depends on who makes the support.
  - `SUPPORT_MODE` (380) implies both modes are built, but the spec never says so.
- **Fix:** do one of these:
  - Add an "Outcome A changes" list naming the inputs, checks, errors and ACs that are removed or changed.
  - State that both modes ship behind `SUPPORT_MODE`, with ACs for each.

  Stage 5 (Z-M1) argues for building only the mode Phase 0 selects.

### C7-M3. The one-tag rule on line 7 isn't followed [S-M3, W-M1, D-N4]
- **Lines:** 81, 89–104, 95, 101, 123, 158, 339, 532.
- **Problem:**
  - **Two tags on one item:** L101 ([C] status, [O-4] in notes); L123 ([C] + [O-12]).
  - **Qualified tags:**
    - L158: "[C, owner's understanding; confirm with the Rotary CAM author]". This is really an open item: O-10/O-13.
    - L339: "[P, for the Rotary CAM author]".
    - L532: "[C: method]".
  - **Inconsistent format:** L81 and L95 use (O-n), and L156 uses a bare O-1.
  - **Contradiction:** L89 says all defaults and ranges are [P], yet every row's Status column says [C].
- **Fix:**
  - Either change line 7 to "one tag per clause; the Status column covers whether the input exists; defaults and ranges are [P]", or split mixed items so each carries one tag.
  - Retag L158 as [O-10].
  - Use the [O-n] form everywhere.

### C7-M4. §5.11 (the sidecar) never reached §7, §8 or §9 [S-M4, D-M4; also Stage 5 Z-M6]
- **Lines:** 283–364; §7 409–425; §8; AC-EXP-01 at 465.
- **Problem:**
  - **§7:** has no alternatives row for the handoff metadata. Options not weighed:
    - Rotary CAM reads `layout.json` per blank
    - setup data in the STL header
    - STEP with placement
    - one job-level manifest
    - entering values by hand only
  - **§8:** has no risk for the sidecar being misread. A `chuckEnd` or `upAtZero` read the opposite way flips or misplaces the part, which ties into R10. There is also no risk for ownership of the schema: the Rotary CAM author would have to adopt a format this plugin defines.
  - **§9:** AC-EXP-01 still lists folder contents without the sidecars, so it contradicts §5.8 (line 242).
- **Fix:**
  - Add a §7 row and an R12 risk, mitigated by O-13 and the simulation step.
  - Add the sidecars to AC-EXP-01.

### C7-M5. The dot-folder hedge is out of date, and R2 relies on it [S-M5, W-M2, D-N1; also Stage 5 Z-M3]
- **Lines:** 226, 432, 521.
- **Problem:**
  - Line 226 says to "confirm that the tree also hides dot-folders", with a fallback path. That open item isn't in §13.
  - R2 (432) treats the folder as hidden.
  - §12 (521) mentions only dot-files.
  - The source settles it: `GcodeFileService.cs:323` skips folders whose names start with `.`.
- **Fix:**
  - Delete the hedge and the fallback on line 226.
  - Change §12 to "files and folders starting with `.` are hidden (`GcodeFileService.cs:323`)".

### C7-M6. Some stated requirements have no acceptance criterion [S-M6]
- **Lines:** 156, 216, 237, 238, 252, 277, 278, 363.
- **Problem:** §9 has no AC for:
  - usable length ≤ 0
  - neck wider than a base
  - importing an inch package
  - job-name character rules
  - `LICENSE-models.txt` first and `layout.json` last
  - each sidecar written right after its STL
  - the export gate
- **Fix:** add these as ACs, or extend AC-PKG-03, AC-FIT-03 and AC-EXP-07 to cover them.

### C7-M7. Minimum sizes in error messages round the wrong way [D-M3]
- **Lines:** 125, 150, 275–276, 456.
- **Problem:**
  - §5.4 rounds every displayed length half up. The bishop/rook minimum of 41.138 mm therefore shows as 41.1 mm, which still fails.
  - AC-FIT-01 expects 41.2, which contradicts the rule.
  - The plan's D8 has `ceilTo`, but the spec never states it.
- **Fix:** in §5.3 or §5.10, state that minimum-needed values round up and maximums (such as line 509) round down, in both units. Reference that rule from AC-FIT-01 and AC-FIT-03.

### C7-M8. R2 understates what happens when an exported STL is clicked [D-M5]
- **Lines:** 432, 523.
- **Problem:** exported STLs must stay visible in the File Manager. Clicking one makes the server run `LoadFileAsync` (`GcodeFileService.cs:74–109`), which:
  - runs every installed plugin's `onGcodeProgramLoad` transform
  - runs `GCodePreAnalyzer`
  - writes `current.gcode`
  - saves `lastLoadedFile`, so the file is restored after a restart

  On a blank of about 38 MB, that is heavy work on the shop machine. R2 mentions only the client parser.
- **Fix:**
  - Add the server-side effects and the persistence after restart to R2's Impact column.
  - Test with the largest blank, not a small STL. Record server CPU use and how to recover (Clear or Unload, including after a restart).

### C7-M9. Unverified claims are stated as fact [W-M2, D-N5]
- **Lines:** 69, 102, 121, 135, 230, 287, 419, 424, 434.
- **Problem:**
  - **L230:** "(Rotary CAM reads them)" contradicts O-1.
  - **L135, L424:** "under 100 ms" and "within the same time budget" have no source or AC.
  - **L287:** "the file is harmless" is a judgement call. Nothing shows how Rotary CAM treats an unknown file.
  - **Lines 69, 102, 121, 419, 434:** Rotary CAM behaviour stated as fact: STEP input, the 0.3 in default neck, Corners turning to the inscribed circle, one part per program, 43% knight reach. Rotary CAM is unreleased, so none of this can be checked.
- **Fix:**
  - Mark Rotary CAM facts as "owner-reported (demo GIF)", or move them to O-1, O-2 or O-10.
  - Either make the 100 ms figure a requirement with an AC, or mark it as an estimate.
  - Rewrite L230 and L287 as neutral statements.

### C7-M10. The §5.5 lead-in doesn't describe its list [W-M3, S-N2]
- **Lines:** 154–168.
- **Problem:**
  - "The export fixes one convention, which `layout.json` records:" heads a list that also holds a build gate (156), an open decision (160–162) and a rule about how shells are built (168).
  - The Gate bullet cites §5.5 from inside §5.5, and names `exporter.js` before §6 defines it.
- **Fix:** move the gate to its own paragraph before the list, and change the lead-in to "Export geometry rules:".

### C7-M11. Glossary terms drift [W-M4]
- **Problem:**
  - "Holding tab" also appears as "tenon" (55, 99).
  - "Parting neck" also appears as "end neck(s)" (99, 420, 530) and "end parting necks" (337).
  - "Top" also appears as "tip" (161, 164) and "finial" (433), and "finial" isn't defined.
  - "Support" (160–161, 530) isn't defined.
- **Fix:**
  - Use the glossary terms throughout. Keep any alias only in the glossary.
  - Define "support" as "the material Rotary CAM leaves between bodies", or reuse "connecting neck".

---

## 🟢 Nits (grouped)

**Header and layout**
- L5: the revision history is one dense paragraph sitting before the problem statement. Move it to a changelog table or `_archive/` [S-N1, W-N1].
- L585–587: there are two `---` rules in a row [S-N9, W-N9].
- L96: "Max blank length" sits in the per-job input table. Move it to a machine-settings line [S-N6].
- L576–581: Appendix B uses "[TBD]", which is not a line-7 tag [S-N8].

**Cross-references**
- L363: "(P4.8)" points forward into the plan. Write "see Detailed Implementation Plan, P4.8" [S-N4, W-N5].
- L238: "ncCAM's free-path probe" is never explained. Also see Stage 6 C-M2: the citation is wrong [W-N5].
- L552: the FIDE reference is never cited [W-N5].
- L553: the review-report file names are process records, not references [W-N4].

**Open items outside §13**
- L226, L265: the GitHub-fetch question needs its own §13 row, tagged [v2] [S-N5].
- L531, L533: O-3 and O-5 are closed. Move them to a "Closed" sub-table [W-N4].
- L538: O-10 mixes a partial answer, a question that is still open, and a cross-reference. Split it [W-N7].

**Wording**
- L81: step 6 has five sentences. Split it into open, enter values, and simulate [W-N2].
- L102: "Neck **diameter**" repeats itself, and "0.3 in in diameter" reads badly [W-N3].
- Filler [W-N3]:
  - L161: "actually"
  - L137: "useful"
  - L398: "that cannot happen here"
  - L433: "hangs off it"
  - L416: "slow to reparse", with no figure
- L67: drop "Other names used in revision 1…" [W-N4].
- L468: "expected pieces" should be "the pieces listed for that blank in the plan" [W-N8].
- Mixed notation: "2½ in" vs "2.5 in", "~72 MB" vs "about", "Ø" vs "diameter" [W-N6].
- Overloaded table cells [W-N7]:
  - L227: a read-merge-PUT procedure
  - L440: six sentences
  - L504–505: blanks separated by em dashes. Use one row per blank.

**Accuracy**
- L372 vs L406: the manifest declares `v2` and `pro-v2`, but the text says `pro-v2` only [D-N2].
- L435 (R5): "about 34 MB per blank" should be about 38.6 MB (155,274 triangles × ~249 bytes) [D-N3].
- §5.10: has no error row for an invalid job name (L237) [S-N7].

**Gaps in the package lifecycle** [D-N6]
- Re-importing the same `id@version` silently overwrites it.
- v1 has no way to remove a package, and its folder is hidden.
- Export doesn't re-check stored meshes against the saved measurements.

**Accepted limits to state**
- L238: checking for a free folder and then saving can race between two clients. Fine for one user; list it in R9 [D-N7].
- L402: say whether a two-side Download ZIP produces one file or two [D-N8].

---

## Traceability

| Consolidated | Design | Structural | Style | Earlier stage |
|---|---|---|---|---|
| C7-M1 §7 vs §5.5 | M1 | M1 | — | Z-M1 |
| C7-M2 O-2 fork | M2 | M2 | — | Z-M1 |
| C7-M3 Tag rule | N4 | M3 | M1 | — |
| C7-M4 Sidecar in §7/§8/§9 | M4 | M4 | — | Z-M6 |
| C7-M5 Dot-folder hedge | N1 | M5 | M2 (part) | Z-M3 |
| C7-M6 Missing ACs | — | M6 | — | — |
| C7-M7 Rounding of minimums | M3 | — | — | — |
| C7-M8 R2 server effects | M5 | — | — | — |
| C7-M9 Unverified claims | N5 | — | M2 | — |
| C7-M10 §5.5 lead-in | — | N2 | M3 | — |
| C7-M11 Terminology | — | — | M4 | — |
| Nits | N2, N3, N6–N8 | N1, N3–N9 | N1–N9 | C-M2 |
