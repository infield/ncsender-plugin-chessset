# Stage 7 — Critic Review Report (re-audit of Revision 2)

- **Target:** `Chess_Set_Creator.md`, Revision 2, lines 1–442 (whole file)
- **Reviewers:** three fresh-context reviewers, run in parallel:
  - egm-design (Feature Spec Standard)
  - egm-structural (Feature Spec Standard)
  - egm-style
- **Context supplied:** local copies of ncCAM and Staunton-Pieces. The ncSender host source (commit `2f8a659`) and Rotary CAM were **not** available, so the facts in §5.7 and §12 could not be checked.
- **Re-audit:** this is Stage 7's one allowed re-audit. The first-round report is in `critic_report_rev1.md`.
- **Date:** 2026-10-30

| Reviewer | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| Design | Not ready to implement | 1 | 9 | 6 |
| Structural | Pass with fixes | 0 | 6 | 11 |
| Style | Approve with changes | 0 | 6 | 13 |

**After removing duplicates: 1 🔴 · 13 🟡 · grouped 🟢.**

**Progress since Revision 1.** All five Revision 1 blockers are closed. The spec now has a problem statement, goals, architecture, alternatives, risks and one acceptance list, all organised by topic. The design reviewer recomputed the worked examples in §11 from the Appendix B dimensions, and the arithmetic holds, apart from N4 below.

**Orchestrator spot checks (all confirmed in the text):**
- The bishop and knight are both 59.00 mm long (Appendix B), which supports R-M1.
- The pawn's top is 6.38 mm, narrower than the 0.3 in = 7.62 mm neck (L93, L146), which supports R-M7.
- L150 cites [O-1] for overlapping shells, but overlapping shells is O-2 (L397).
- L80 sets the default display unit to inches, then says lengths are shown "mm first".

---

## 🔴 Blocker

### R-B1. The Rotary CAM handoff is assumed, and its axial datum is undefined: a collision risk [design B1]
**Lines:** 74, 140–150, 313, 319, 341, 396–397

**Problem:** Every property of the only output interface is either open or defaulted to "Yes":
- whether Rotary CAM can open a file from the File Manager (O-1)
- whether it reads ASCII STL (O-1)
- whether it accepts overlapping shells (O-2)

The STL puts X = 0 at the first piece's base and leaves out the chuck reservation (L149). The user types the stock and both reservations from `layout.json` into Rotary CAM by hand, for each of 6–10 blanks per job (L74). That data is in mm, while the display defaults to inches.

The spec never says how Rotary CAM positions "Model origin" along X. If the datum is misread or a value is mistyped, the toolpath shifts along the axis and the cutter can run into the chuck jaws or the tailstock centre. R7 (L319) is marked "Mitigated" and lists only "wrong-size pieces". Machine collision appears nowhere in the spec.

**Fix:**
1. Make O-1, O-2 and a new question a go/no-go gate before §5.5 and §5.8 are built. The new question: "How does Rotary CAM place Model origin along the axis, and can it read stock and reservations from a sidecar file?" Change those defaults from "Yes" to "Blocked".
2. Add a risk row: "Chuck or tailstock collision from a wrong axial datum or a mistyped reservation." Mitigations:
   - Rotary CAM reads `layout.json` directly; or
   - the plugin writes the values in Rotary CAM's own job format; or
   - a per-blank card shows the values in both units, plus a required clearance simulation in Rotary CAM.
3. Ask the Rotary CAM author for the datum convention, then pin it into AC-EXP-03/04.

> Elephant note: L5 says the owner checked the ncSender source, and the spec calls Rotary CAM's author "Rotary CAM author", so the owner may have direct access to these answers. If so, this blocker can be closed quickly by recording the facts.

---

## 🟡 Major

### R-M1. The planner isn't deterministic when pieces tie on length [design M1]
**Lines:** 125–128, 334, 373–374

**Problem:** At scale 1.27 the bishop and knight are both 74.93 mm long. That creates ties:
- On a 12 in blank, blank 4 can hold **B N N** or **B B N** (both 244.79 mm long).
- On an 18 in blank, blank 1 can hold **K Q N P P** or **K Q B P P**.

The tie-break rules choose an order *within* a blank, not *which pieces* go in it. So the claim "same every time" (L128) is unsupported, and AC-PLAN-01 depends on the order the search happens to try things.

**Fix:** Add a final tie-break, for example "prefer the blank whose piece list, sorted K, Q, B, N, R, P, is lexicographically smallest". Regenerate §11 under that rule and add a test for the B/N tie.

### R-M2. The scale denominator and number precision are unspecified [design M2]
**Lines:** 60, 103, 105, 196–198, 331

**Problem:**
- Import allows a ±0.1 mm difference between the declared and measured queen base. If scaling uses the declared value, a 38.1 mm request can come out ±0.127 mm off, which breaks the ±0.05 mm export tolerance (L105) and AC-SIZE-01.
- "1.0 mm (source units)" (L60) is ambiguous for packages measured in inches.

**Fix:**
- Always scale using the **measured** queen base diameter.
- Fix the number format for ASCII STL output.
- Define the base-sampling band in mm, after unit conversion.

### R-M3. Memory and responsiveness on the shop client [design M3]
**Lines:** 212, 218, 287, 305, 317, 442

**Problem:**
- The package is stored as ASCII STL: about 34 MB, versus 6.9 MB as binary. It is reparsed every time the dialog opens.
- Export builds about 72 MB of ASCII per side as JavaScript strings, each wrapped in a JSON body.
- The download-ZIP fallback builds the whole zip in memory.
- Nothing puts this work in a Web Worker, although ncCAM uses one.
- §7's reason for rejecting base64 applies only to **exported** files. The stored package is read by this plugin alone.

**Fix:**
- Store the package in binary form (base64, about 9 MB) or as compact arrays.
- Plan from manifest dimensions alone, and load meshes only when needed.
- Do parsing and writing in a Worker, one blank at a time.
- Name the ZIP library and give a memory budget for it.

### R-M4. Untrusted package and job text reaches file paths and the host page [design M4, structural M4]
**Lines:** 154–159, 165–185, 212–217, 226, 280, 309–321

**Problem:**
- The package `version` is only required to be "semver", but it is placed directly in the path `sets/<id>@<version>/`. The job name has no validation.
- Even if the server blocks paths that escape its storage area (L217, unverified), a crafted `version` could still overwrite a G-code program inside that area, and that program might later be run on the machine.
- The manifest's `name`, `author`, `attribution` and `notes` are displayed in a dialog that runs inside the ncSender page. ncCAM renders with `innerHTML`, so script in that text would have full access to ncSender's REST API, including the motion endpoints.
- A `PUT` to settings replaces the whole settings object (L213), so a stale copy could wipe other settings.
- §8 has no security row at all, which the standard requires.

**Fix:**
- Check `version` against a strict semver pattern.
- Restrict the characters allowed in job names.
- Require all displayed text to be escaped (or set with `textContent`).
- Merge with existing settings before each `PUT`.
- Add security rows to §8: untrusted package, path injection, script injection, and settings overwritten.

### R-M5. "Never overwritten" relies on behaviour the spec doesn't define [design M5]
**Lines:** 217, 227, 240, 321

**Problem:**
- It is unverified whether `file/save` overwrites an existing file.
- No method is given for checking whether a folder already exists. ncCAM's probe only checks a single file.
- If an export fails partway, it leaves a half-written folder that looks valid, and a retry creates `<job> (2)`.

**Fix:**
- Name the existence check, for example listing the folder tree or probing `<folder>/layout.json`.
- Confirm whether a save overwrites.
- Write `layout.json` last, so its presence marks a complete job.
- Specify how a retry behaves.

### R-M6. The gap's lower limit is based on the wrong constraint [design M6]
**Lines:** 92, 148, 303

**Problem:**
- L92 says the gap must hold the parting cut. But L148 and L303 say Rotary CAM only parts the two outer ends; the gaps between pieces are separated by hand.
- The real lower limit is room for the cutter to shape each piece's base face, plus saw kerf. The 2 mm minimum is smaller than any router bit.
- L92's "0.3 in neck" doesn't say whether it is a length or a diameter.

**Fix:**
- Require gap ≥ cutter diameter + clearance (+ kerf). Make the cutter diameter an input, or state the assumed value.
- Raise the 2 mm minimum, or warn when the gap is below it.
- Say what the 0.3 in measures.

### R-M7. The connecting-neck rule is wrong and has untested load assumptions [design M7]
**Lines:** 127, 145–147, 315, 399

**Problem:**
- L146 lists only the queen and bishop as pieces whose top is narrower than the neck at scale 1. The pawn's top is 6.38 mm, also narrower than the 7.62 mm neck. At scale 1.27 the affected pieces are the queen (5.27 mm) and bishop (5.04 mm).
- The neck diameter is fixed while the pieces scale, so the affected list must be computed after scaling.
- The weakest point is the ~5 mm finial, not the neck. Under the ordering rule (L127), every piece toward the tailstock hangs off it during roughing. R3 says only "prototype one blank".

**Fix:**
- Correct L146 and compute the list with the rule `scaled top Ø < neck Ø`.
- Check the neck diameter against the smallest scaled top and base.
- Consider putting thin-topped pieces at the tailstock end, or allowing flipped pieces (O-4). Add this choice to §7.

### R-M8. The closed-mesh check may reject the reference package [design M8]
**Lines:** 195, 204, 329, 433–442

**Problem:** "Every edge shared by exactly two triangles" requires vertices to match exactly. STL exported from SolidWorks often contains duplicate or T-junction edges, and Appendix B doesn't record that the six meshes pass this check. If they fail, AC-PKG-02 fails on the only v1 package.

**Fix:**
- Record in Appendix B whether each upstream mesh passes the check.
- Specify a vertex-weld tolerance, for example 1e-4 mm.
- Describe how meshes are repaired during package preparation.

### R-M9. Plugin permissions default to none, unlike the reference plugin [design M9]
**Lines:** 273, 290, 403

**Problem:**
- ncCAM calls the same `file/save` route and declares `"permissions": ["gcode.modify"]`, plus `minAppVersion` and `platforms`.
- This spec's manifest sketch omits all of those, and O-8 defaults to `[]`.
- If ncSender enforces that permission, every save fails.

**Fix:**
- Resolve O-8 before building.
- Until then, copy ncCAM's declarations.
- Add `version`, `minAppVersion`, `configUi` and `platforms` to the manifest sketch.

### R-M10. Status tags contradict each other and break the spec's own rule [structural M1, M2, M3; style M1]
**Lines:** 7–11, 31, 34, 43, 82–106, 124, 150, 154, 254–265, 290–298

**Problem:** L7 says "Every requirement has exactly one tag". The spec breaks that rule:
- Section tags contradict item tags:
  - §5.2 is tagged [C] but contains [P] and [O] items.
  - §5.8 is tagged [C] but contains proposals.
- Exact search is [C] in Goal 3 (L31) but [P] in §5.4 (L124).
- L154 uses an undefined tag, `[C, scope per owner]`.
- Open tags are a mix of bare `[O]` and `[O-n]`.
- Several items have no tag: Goal 6, L99, §5.6, §5.10, the §4 flow, and some §7 rows.
- **Wrong cross-reference:** L150 cites [O-1] for overlapping shells, but that question is **O-2**.
- L106's `[O]` (per-piece overrides) has no entry in §13, and §7 L298 calls the same item "deferred".
- O-5 (default queen base) duplicates a [P] default at L85 and is never referenced.

**Fix:**
- Put tags on items only, not headings.
- Allow exactly these tags: [C], [P], [O-n], [v2].
- Number every open tag.
- Fix L150 to [O-2].
- Add O-10 for per-piece overrides, or retag it [v2] in both places.
- Tag the untagged items, and add a Status column to the §5.1 table.

### R-M11. The Alternatives table has gaps [structural M5; design "Against the standard"]
**Lines:** 287, 294–307, 150

**Problem:**
- §6 chooses "browser dialog only, no server module". That one choice forces the ASCII-only output, the ~72 MB-per-side files and the GitHub download question, yet it isn't weighed in §7. A server module could write binary STL and fetch GitHub releases.
- These choices have no recorded reason:
  - king height rejected only because "the owner chose base diameter"
  - per-piece overrides rejected only as "deferred"
  - "no boolean union" (L150)
  - package storage format (ASCII vs binary vs IndexedDB)

**Fix:** Add rows for runtime (browser-only vs server module), boolean union, and package storage format, each with a technical reason. Example reason for base diameter: it maps directly to the stock-width fit check.

### R-M12. Some requirements have no acceptance criteria [structural M6]
**Lines:** 80, 95, 99, 114, 147, 240, 263–264, 289, 323–342

**Problem:** These requirements have no acceptance criterion (AC):
- the display-unit toggle
- the maple-only option
- blocking out-of-range input
- the stock-too-long error
- the length-fit message
- the list of tips covered by the neck
- the ZIP fallback
- the 2-D preview

ACs also don't say which §5 section each one verifies.

**Fix:**
- Add an AC for each, or tag the item "not verified in v1".
- Add a "Verifies §" column to §9.

### R-M13. Display units, measurement claims and terms [style M2–M6]
**Problem:**
- **L80 contradicts itself:** the inch toggle is the default, but lengths are shown "mm first".
- **Unmeasurable claims:** "instant" (L124, L306) and "ready-to-machine STL" (L24).
- **Terms drift from the glossary's "model package":** "model set", "Staunton set", "set selector", "starter package", "unprepared set", "reference package".
- **Undefined term:** "quarantine risk" (L287).
- **Validation item 4 (L196–201)** mixes checks against the manifest with checks of the coordinate frame.

**Fix:**
- L80: "The display toggle chooses the primary unit (default inches); the other unit appears in parentheses."
- Replace "instant" with a time limit you will test, for example "< 50 ms".
- Use "model package" everywhere.
- Define "quarantine" or drop the sentence.
- Split item 4 into separate manifest checks and frame checks.

---

## 🟢 Nits (grouped)

**Corrections**
- **R5 (L317):** "15–25 MB per blank" is too low. Blanks with knights reach about 31–34 MB as ASCII.
- **L374:** 7.15 is shown as 7.1. State a rounding rule; half-up gives 7.2.
- **§5.10 needs a new error row:** usable length ≤ 0, i.e. the reservations are as long as or longer than the stock.

**Safety**
- Store installed packages in a dot-prefixed folder, so they can't be clicked and loaded as a G-code program (relies on L389, unverified).

**Duplication**
- §5.7 (L216–220) repeats §12 (L382–390). Keep the facts in §12 and point to it from §5.7.

**Structure**
- The §6 file tree (L271–285) has no language tag, and it is unclear whether `src/` ships in the plugin ZIP.
- Non-goals (L43–44) mix in [O] and [v2] items. Rename it "Non-goals (v1)" or move those items to a "Deferred / open" list.
- Add to the glossary: job, used/leftover length, top diameter.
- Unit order is inconsistent in the prose. L92, L332 and L369–380 put inches first.
- Links mix inline and autolink styles. Local files are code spans instead of relative links.
- The §11 table packs several blanks into one cell, separated by em-dashes. Use one row per blank.

**References**
- L5 (revision notes) has no table mapping review findings to sections. Add a short revision-history appendix.
- L292: "AAxis `CLAUDE.md` §15" is item 15 of a list, not a section, and the harness it mentions isn't checked in.
- L411: the FIDE link is never cited in the body.

**Wording**
- Expand contractions throughout.
- Replace second person ("you pick") with "the user".
- L17: "many turning blanks" → "5–10 turning blanks".
- L87: "between centres" → "between chuck and tailstock".
- L204: "prove … usable" → "confirm … closed meshes in the agreed frame".
- L252: remove the filler.
- §7 and §8: replace vague wording, e.g. "Poor finish" → "Surface defects".
- L402: O-7 is an action, not a question. Rephrase it as a question.
- L418: "close to this table" → give the actual difference.

---

## Traceability matrix

| Consolidated | Design | Structural | Style |
|---|---|---|---|
| R-B1 Rotary CAM handoff / datum | B1 | — | — |
| R-M1 Determinism | M1 | — | — |
| R-M2 Scale denominator / precision | M2 | — | — |
| R-M3 Memory / Worker | M3 | — | — |
| R-M4 Security | M4 | M4 | — |
| R-M5 Overwrite / partial export | M5 | — | — |
| R-M6 Gap minimum | M6 | — | — |
| R-M7 Neck / finial | M7 | — | — |
| R-M8 Closed-mesh check | M8 | — | — |
| R-M9 Permissions | M9 | — | — |
| R-M10 Status tags / cross-refs | — | M1, M2, M3, N4 | M1 |
| R-M11 Alternatives gaps | Std note | M5 | Nit 10 |
| R-M12 Missing ACs | — | M6 | — |
| R-M13 Units / claims / terms | N3, N4 | N7, N8 | M2–M6 |
| Nits | N1, N2, N5, N6 | N1–N3, N5, N6, N9–N11 | Nits 1–13 |
