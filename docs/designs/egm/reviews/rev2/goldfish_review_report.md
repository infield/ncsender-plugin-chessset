# Goldfish Annotated Review Report — Revision 2

**Status: resolved.** The owner chose "Auto accept", and all 14 PROPOSE FIX items were applied, producing Revision 3 of `Chess_Set_Creator.md`. The Revision 2 file is archived as `_archive/Chess_Set_Creator_2026-10-30_rev2.md`.

| Outcome | Count |
|---|---|
| Fixes accepted and applied | 14 |
| Contested | 1, partial: Issue 7, no cutter-diameter input. The assumption is recorded under O-4. |
| Escalated | 0 |
| Declined | 5 nits |
| Left unaddressed | 0 |

**Verification:**
- The headings and code fences are intact.
- No untagged `[O]` remains.
- The §11 figures were recomputed from the Appendix B dimensions and match.

**Target:** `Chess_Set_Creator.md` (Revision 2, lines 1–442)
**Source findings:** `critic_report.md` (Stage 7 re-audit)
**Earlier round:** `goldfish_review_report_rev1.md` (superseded, never applied)

**Evidence I checked beyond the reviewers' context:**
- `../AAxis/CLAUDE.md`:
  - Item 45 defines quarantine: a server-module crash quarantines plugin@version.
  - Item 13 covers the settings merge.
  - Item 15 covers the test harness.
- `../AAxis/com.infield.aaxis/manifest.json`: the owner's own file-only plugin declares `"permissions": ["gcode.modify"]`, `minAppVersion` and `platforms`.
- Appendix B dimensions. I used them to recompute the tie cases.

**Summary:**

| Category | Count |
|---|---|
| PROPOSE FIX | 14 |
| CONTEST (partial) | 1 (inside Issue 7) |
| ESCALATE | 0 |
| DECLINE | 5 nits |

Three fixes add **[O-n]** gates or **[TBD]** markers rather than inventing facts about Rotary CAM: Issues 1, 7 and 8.

---

## Prioritized Findings & AI Suggestions

### [Issue 1] [`design`] — Severity: High (R-B1) — Rotary CAM handoff and axial datum
- **Affected scope:** [Lines 74, 140–150, 313, 319, 341, 396–397](Chess_Set_Creator.md#L140-L150) (§4, §5.5, §8, §9, §13)
- **Discrepancy:**
  - O-1 and O-2 default to "Yes".
  - The spec never says how Rotary CAM places the model along X relative to the chuck.
  - The user re-types the reservations by hand for each blank, in mm, while the display defaults to inches.
  - The collision risk is missing from §8.
- **Rationale:** No one can write the exporter correctly without the datum convention. A wrong datum or a mistyped reservation moves the toolpath along the axis, toward the chuck or the tailstock.
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** L140's "On axis: Model origin" sets where the model sits *radially*. Nothing in the spec covers *axial* placement. This is a gap, not a misunderstanding by the reviewer.
- ***Proposed Edit:***
  - **§13:**
    - Add a new row. O-10: "How does Rotary CAM position Model origin along the rotary axis relative to the chuck face or stock end? Can it read stock size and reservations from a sidecar file?" Owner: Rotary CAM author. Default: **Blocks exporter build.**
    - Change the O-1 and O-2 defaults to "**Blocks exporter build**". Keep the Download ZIP fallback note in O-1.
  - **§5.5:** add a bullet. "**Gate:** `exporter.js` (§5.5, §5.8) is not built until O-1, O-2 and O-10 are answered. Planning, import and preview (§5.1–§5.4, §5.6) do not depend on them."
  - **§8:** add risk R10.
    - Risk: Chuck or tailstock collision from a wrong axial datum, or a reservation mistyped into Rotary CAM.
    - Impact: Cutter or spindle strikes the chuck jaws or tailstock centre.
    - Mitigation:
      - Preferred: Rotary CAM reads `layout.json` (O-10).
      - Otherwise: the plan shows a per-blank card with the stock and reservations in mm and inches. Run Rotary CAM's simulation and check clearance before every first cut.
    - Status: Open.
  - **§8 R7:** change the Impact to "Wrong-size pieces, or a misplaced toolpath (see R10)". Change the Status to "Partly mitigated".

### [Issue 2] [`design`] — Severity: Medium (R-M1) — Planner determinism
- **Affected scope:** [Lines 125–128](Chess_Set_Creator.md#L125-L128), [373–374](Chess_Set_Creator.md#L373-L374)
- **Discrepancy:** The bishop and knight have equal axial length, so equal-length blanks can hold different pieces. The tie-break rules don't choose between them.
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** Appendix B lists both at 59.00 mm, which is 74.93 mm at scale 1.270. Swapping a B for an N leaves every used length unchanged, so §11 can be regenerated without recomputing lengths.
- ***Proposed Edit:***
  - **L126 to L127:** insert a new rule 3, and renumber the old rules 3 and 4.
    > 3. Final tie-break: among blanks with equal used length, choose the piece list that comes first when written in K, Q, B, N, R, P order and compared piece by piece.
  - **§11 L373 (12 in):** blank 4 becomes `B B N · 244.8 / 15.6` and blank 5 becomes `N P · 139.5 / 120.8`.
  - **§11 L374 (18 in):**
    - blank 1 becomes `K Q B P P · 409.6 / 3.2`
    - blank 2 becomes `B R P P P P · 405.6 / 7.2` (see Issue 14 for the rounding of 7.15)
    - blank 3 becomes `N N R P P · 361.3 / 51.4`
  - **§6 Testing:** add "a unit test for the bishop/knight tie."

### [Issue 3] [`design`] — Severity: Medium (R-M2) — Scale denominator and precision
- **Affected scope:** [L60](Chess_Set_Creator.md#L60), [L103](Chess_Set_Creator.md#L103), [L196](Chess_Set_Creator.md#L196)
- **Discrepancy:** The spec doesn't say whether the scale uses the declared or the measured queen base. Import allows ±0.1 mm between the two, which can break the ±0.05 mm export tolerance. "1.0 mm (source units)" is also ambiguous.
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **L103:** "`scale = requested queen base diameter ÷ measured queen base diameter`. The value is measured at import and stored with the installed package. Declared manifest values are used only for validation."
  - **L60:** change "within 1.0 mm (source units) of the base plane" to "within 1.0 mm of the base plane, after conversion to mm".
  - **§5.5 Format:** add "Vertex coordinates are written with at least 4 decimal places in mm."

### [Issue 4] [`design`] — Severity: Medium (R-M3) — Memory and responsiveness
- **Affected scope:** [L212](Chess_Set_Creator.md#L212), [L218](Chess_Set_Creator.md#L218), L287, [L305](Chess_Set_Creator.md#L305), L317
- **Discrepancy:**
  - The stored package is about 34 MB of ASCII STL, and it is reparsed each time the dialog opens.
  - Export builds about 72 MB per side on the main thread.
  - §7's reason for rejecting base64 is about Rotary CAM reading exported files. It doesn't apply to the stored package, which only the plugin reads.
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **L212:** "…six STL files stored as base64-encoded binary STL (`<role>.stl.b64`, about 9 MB in total)…"
  - **L218:** "It writes text only (`File.WriteAllTextAsync`). Exported blanks are therefore ASCII STL. Stored package meshes are base64 binary, because only this plugin reads them."
  - **§6:** add these bullets:
    - "**Planning uses manifest dimensions only.** Meshes are loaded only for export."
    - "**STL parsing and writing run in a Web Worker**, one blank at a time. Each blank's text is released after its save completes."
    - "**Download ZIP** uses a named library, e.g. fflate **[P]**, and builds one side at a time."
  - **§7:** add a row.
    - Decision: Package storage
    - Chosen: base64 binary in the File Manager
    - Rejected: *ASCII*: 5× larger and slow to reparse. *IndexedDB* (ncCAM's choice): tied to one browser, and lost if browser data is cleared.

### [Issue 5] [`design`, `structural`] — Severity: Medium (R-M4) — Untrusted text and security risks
- **Affected scope:** [L159](Chess_Set_Creator.md#L159), [L166–167](Chess_Set_Creator.md#L166-L167), [L213](Chess_Set_Creator.md#L213), [L226](Chess_Set_Creator.md#L226), §8
- **Discrepancy:**
  - `version` and the job name go into File Manager paths without validation.
  - Manifest text is displayed inside the host page.
  - §8 has no security risk.
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** The fixes are cheap now and become necessary once v2 GitHub download arrives. For the settings point, L213 already follows the AAxis rule (item 13), so the only change is to say that the merge starts from the *current* saved settings.
- ***Proposed Edit:***
  - **L167 comment:** `// semver: ^\d+\.\d+\.\d+$`
  - **L226:** add "Job names may contain letters, digits, space, `. _ - ( ) x`. `/`, `\`, `..` and a leading `.` are rejected."
  - **§6:** add "**Displayed text** from manifests and job names is set with `textContent`, never `innerHTML`."
  - **L213:** change "merge with `DEFAULTS` first" to "read the current settings, spread them over `DEFAULTS`, change the field, then PUT".
  - **§8:** add risk R11.
    - Risk: An untrusted package injects paths or script, through `version`, file paths or manifest text.
    - Impact: Overwritten G-code programs; script running with access to ncSender's API.
    - Mitigation: the regexes above (§5.6, §5.8), `textContent`, and the server's rejection of paths that escape its storage folder (§12).
    - Status: Mitigated.

### [Issue 6] [`design`] — Severity: Medium (R-M5) — Overwrite and partial export
- **Affected scope:** [L227](Chess_Set_Creator.md#L227), [L240](Chess_Set_Creator.md#L240), L321
- **Discrepancy:** The spec has no method for checking whether a folder exists, and it doesn't define what a half-written job looks like.
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** `File.WriteAllTextAsync` overwrites an existing file (standard .NET behaviour), so the folder check is what prevents overwrites. §12 confirms the tree route `GET /api/gcode-files` exists.
- ***Proposed Edit:***
  - **L227:** "The plugin lists `chess set/` with `GET /api/gcode-files`. If the job folder already exists, it appends ` (2)`, ` (3)`, … to the name. `file/save` overwrites existing files, so this check is what protects earlier work."
  - **§5.8:** add "`layout.json` is written **last**. A folder without it is an incomplete export. A retry writes to a new free folder and leaves the incomplete one for the user to delete."
  - **R9:** Mitigation becomes "Free-folder check (§5.8); `layout.json` written last". Status stays Mitigated.

### [Issue 7] [`design`] — Severity: Medium (R-M6) — Gap minimum
- **Affected scope:** [L92](Chess_Set_Creator.md#L92), L148, L303
- **Discrepancy:** L92 says the gap holds the parting cut, but parting happens only at the outer ends (L148). The 2 mm minimum is smaller than any router bit. The "0.3 in neck" doesn't say what it measures.
- ***AI Suggestion:*** PROPOSE FIX, with a partial CONTEST
- ***Justification:*** The contradiction with L148 is real. I contest one part: requiring a cutter-diameter input. The spec doesn't need Rotary CAM's tool list. A stated assumption plus O-4, which already asks for the right gap, covers it.
- ***Proposed Edit:***
  - **L92 Notes:** "Must let Rotary CAM's finishing cutter reach the next piece's base face and the previous piece's top: at least the cutter diameter plus clearance. Assumes a 6.35 mm (¼ in) cutter **[O-4]**. The parting cut only happens at the two outer ends (§5.5)."
  - **L92 Valid range:** change `2–50 mm` to `6.35–50 mm` **[P]**.
  - **L93 Notes:** "Neck **diameter**. Rotary CAM's demo neck is 0.3 in in diameter."

### [Issue 8] [`design`] — Severity: Medium (R-M7) — Neck and finial rule
- **Affected scope:** [L146](Chess_Set_Creator.md#L146), L127, L315, L399
- **Discrepancy:** L146 leaves out the pawn at scale 1. The list of affected pieces is fixed in the text, although the neck size is fixed while the pieces scale. The ~5 mm finial is the weak link in the chain.
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** At scale 1 the pawn top (6.38 mm) is smaller than the neck (7.6 mm). At the default scale of 1.270, the queen top is 5.27 mm and the bishop top is 5.04 mm, while the pawn is 8.10 mm and no longer affected.
- ***Proposed Edit:***
  - **L146:** "A piece is affected when `scaled top Ø < neck Ø`. That tip is covered by the neck and finished by hand after parting. With the Staunton package at the default 38.1 mm queen base, this affects the queen (5.3 mm top) and bishop (5.0 mm top)."
  - **§5.3:** add "If the neck diameter exceeds the smallest scaled base diameter, planning is blocked."
  - **R3:** "The weakest point is the thinnest finial in the chain (about 5 mm on the queen and bishop at the default size), because every piece toward the tailstock hangs off it during roughing."
  - **O-4:** extend it to "…and whether thin-topped pieces should go at the tailstock end, or pieces be flipped."

### [Issue 9] [`design`] — Severity: Medium (R-M8) — Closed-mesh check on the reference package
- **Affected scope:** [L195](Chess_Set_Creator.md#L195), §10, Appendix B
- **Discrepancy:** The check needs exact vertex matches. Nothing records whether the six upstream meshes pass it.
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **L195:** "Each mesh is closed after welding vertices within 0.001 mm: every edge is shared by exactly two triangles, and volume is above 0."
  - **§10 Preparation:** add step 7: "Weld vertices, then run the §5.6 closed-mesh check. Repair any mesh that fails, and record the result in Appendix B."
  - **Appendix B:** add a column "Closed after weld" with **[TBD]** in every row.

### [Issue 10] [`design`] — Severity: Medium (R-M9) — Manifest permissions
- **Affected scope:** [L273](Chess_Set_Creator.md#L273), L290, L403
- **Discrepancy:** O-8 defaults to `[]`, but both reference plugins declare `gcode.modify`.
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** Both ncCAM's `manifest.json` and the owner's own `com.infield.aaxis/manifest.json` declare `"permissions": ["gcode.modify"]`, plus `minAppVersion` and `platforms`.
- ***Proposed Edit:***
  - **L273:** add `version 0.1.0 · minAppVersion 2.0.0 · platforms {"pro-v2":"2.0.0"} · configUi config.html · permissions ["gcode.modify"]`.
  - **O-8 default:** "`["gcode.modify"]`, matching ncCAM and AAxis".
  - **L290:** "**Manifest permissions:** `["gcode.modify"]` until O-8 is answered. No motion permissions."

### [Issue 11] [`structural`, `style`] — Severity: Medium (R-M10) — Status tags and cross-references
- **Affected scope:** [L7–11](Chess_Set_Creator.md#L7-L11), L31, L34, L43, L82–106, L124, L150, L154, L254, L290–298, L400
- **Discrepancy:** Section tags contradict item tags. Some tags are outside the defined set, some items are untagged, L150 cites the wrong open question, and L106 has no matching row in §13.
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:***
  - **L7–11:**
    - Change the tag rule to "Tags go on items, not headings. Allowed tags: [C], [P], [O-n], [v2]."
    - Change "[O] Open" to "[O-n] Open; n is the row in §13."
  - **Headings:** remove the tags from the headings of §5.2, §5.3, §5.5, §5.7, §5.8, §5.9 and §6.
  - **Body:**
    - L31: remove "with an exact search". The method stays [P] at L124.
    - L34 (Goal 6): add [C].
    - L43: [O] → [O-6].
    - L87: [O] → [O-3].
    - L291: [O] → [O-9].
    - L150: [O-1] → **[O-2]**.
    - L154: `[C, scope per owner]` → [C].
    - L99: add [P].
    - §5.10 rows: add a Status column, [P].
  - **§5.1:** change the header from "Default [P]" to "Default" and add a Status column.
  - **Per-piece overrides:**
    - Add O-11: "Are per-piece size overrides needed?" Owner: Marc. Default: No.
    - L106: [O] → [O-11].
    - L298: "deferred" → "open (O-11)".
  - **O-5:** delete it; it duplicates the [P] default at L85.

### [Issue 12] [`structural`, `design`] — Severity: Medium (R-M11) — Alternatives gaps
- **Affected scope:** [L287](Chess_Set_Creator.md#L287), [L294–307](Chess_Set_Creator.md#L294-L307), L150
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** `../AAxis/CLAUDE.md` item 45 gives the reason against a server module: a crash while loading it quarantines the plugin@version. The server side also runs in Jint, which has no ES modules and no Node APIs.
- ***Proposed Edit:*** add §7 rows.
  - **Runtime** | Browser dialog only | *Server module (Jint)*: it could write binary STL and fetch GitHub releases. But it has no ES modules or Node APIs, and a crash while loading quarantines the plugin@version (`../AAxis/CLAUDE.md`).
  - **Neck joins** | Overlapping shells | *Boolean union*: needs a mesh kernel such as manifold-3d wasm, about 1 MB, for every blank. Revisit if O-2 is "No".
  - **L298:** replace "the owner chose base diameter, which ties straight to stock width" with "base diameter maps directly to the stock-width fit check (§5.3); king height does not".
  - The package storage row is added in Issue 4.

### [Issue 13] [`structural`] — Severity: Medium (R-M12) — Missing acceptance criteria
- **Affected scope:** [§9, L323–342](Chess_Set_Creator.md#L323-L342)
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:*** add a "Verifies" column to §9, citing §5.x for each row, then add these criteria:
  - **AC-IN-01:** Out-of-range input blocks planning and shows the range (§5.1).
  - **AC-IN-02:** The display toggle switches the primary unit; stored and exported values stay in mm (§5.1).
  - **AC-IN-03:** "Maple only" exports maple blanks only (§5.1).
  - **AC-FIT-03:** Stock length below the longest piece plus reservations gives the length message with the minimum length. Stock longer than the max blank length gives its own error (§5.3, §5.10).
  - **AC-EXP-06:** The plan lists the pieces whose top is covered by the neck (§5.5).
  - **AC-EXP-07:** A forced save failure offers Download ZIP, and the incomplete folder has no `layout.json` (§5.8).
  - **AC-UI-01:** The 2-D preview draws each blank to scale with the reservations, pieces and necks (§6).
  - **AC-SEC-01:** A manifest with `version: "../x"` or `<script>` in `name` is rejected or shown as plain text (§5.6, §6).

### [Issue 14] [`style`, `structural`, `design`] — Severity: Medium/Low (R-M13 and nits)
- ***AI Suggestion:*** PROPOSE FIX for the items listed; DECLINE the rest.
- **PROPOSE FIX:**
  - **L80:** "Internal unit is mm. The display toggle chooses the primary unit (default inches); the other unit appears in parentheses. [P]" Apply the same order wherever the plugin displays a length. The prose in the spec may give inches first.
  - **Claims:**
    - L124 and L306: "instant" → "completes in under 100 ms [P]".
    - L24: "ready-to-machine STL" → "one STL per blank, in the frame Rotary CAM expects".
  - **Terms:** use "model package" and "package selector" in place of "model set", "Staunton set", "set selector", "starter package", "unprepared set" and "reference package".
  - **L287:** "There is no server-side module, so `events` is empty. A server-module crash while loading would quarantine the plugin@version (`../AAxis/CLAUDE.md`); that cannot happen here."
  - **L196–201:** split into:
    - item 4: "Measured axial, base and swept diameters match the manifest within ±0.1 mm"
    - item 5: "The piece axis lies within 0.1 mm of the X axis, and the base plane is at X = 0 ± 0.1 mm"
    - item 6: the units rule.
  - **R5 (L317):** "15–25 MB per blank" → "up to about 34 MB per blank (blanks with knights)".
  - **Rounding:** add to §5.4 "Lengths shown to 0.1 mm round half up". Then L374's 7.1 → 7.2 (folded into Issue 2's table).
  - **§5.10:** add an error row: "Usable length ≤ 0 (reservations ≥ stock length) | planning | both reservations and stock length".
  - **Package location:** `Chess Set Creator/sets/` → `.chess-set-creator/sets/`. The tree hides dot-files (§12), so installed packages can't be clicked and loaded as programs. This also updates R2.
  - **Duplicated text:** §5.7 L216–220 → "Route behaviour: see §12." Move the "survives plugin updates" sentence into §12.
  - **§6 tree:** add the `text` language tag to the code fence. Label `src/` as "(repo only; not in plugin ZIP)".
  - **§2:** rename the heading to "Non-goals (v1)". Move L43 and L44 under a "Deferred / open" sub-list.
  - **Glossary:** add Job, Used length / leftover length, and Top diameter.
  - **L292:** "AAxis `CLAUDE.md` item 15 (Verify before delivering); the harness script is not checked in".
  - **Contractions:** expand them. Change "you" to "the user" in §1 and §4.
  - **Wording:**
    - L17: "many" → "5–10".
    - L87: "between centres" → "between chuck and tailstock".
    - L204: "prove … usable" → "confirm … closed meshes in the agreed frame".
    - L402: O-7 → "Should ncSender block loading non-G-code files from the File Manager? Default: request it."
- **DECLINE:**
  - Link style unification. Mixed link styles don't affect the meaning.
  - A revision-history appendix. L5 already says what changed, and the reports are linked.
  - Removing the FIDE reference. It is relevant background for Appendix A.
  - Splitting the §11 table cells into one row per blank. The cells are readable as they are, and Issue 2 already rewrites them.
  - The style reviewer's alternative wordings for §7 and §8 cells, apart from those included above. They are cosmetic.

---

**Apply order if accepted:** 11 (tags) → 1 → 2 → 3 → 4 → 5 → 6 → 7 → 8 → 9 → 10 → 12 → 13 → 14. Before editing, I check the file's modification time, so I won't overwrite another revision again.
