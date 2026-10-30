# Stage 7 — Critic Review Report

- **Target:** `Chess_Set_Creator.md`, FeatureRange lines 1–349 (the whole file).
- **Reviewers:** three fresh-context reviewers, run in parallel:
  - egm-design (Feature Spec Standard)
  - egm-structural (Feature Spec Standard)
  - egm-style (persona rules)
- **Context supplied:** local copies of `siganberg/ncsender-plugin-nccam` and `clarkerubber/Staunton-Pieces`.
- **Date:** 2026-10-30

| Reviewer | Verdict | 🔴 | 🟡 | 🟢 |
|---|---|---|---|---|
| Design | FAIL | 4 | 6 | 5 |
| Structural | FAIL | 2 | 8 | 7 |
| Style | Approve with revisions | 0 | 6 | 25 |

After removing duplicates: **5 🔴 · 9 🟡 · grouped 🟢**. The ID in brackets after each finding (e.g. [D-B1]) is the source reviewer finding: D = design, S = structural, W = style.

Orchestrator spot checks:
- ncCAM does read STEP files (README L3–5, L34).
- Staunton-Pieces holds 13 STL files across two sets.
- Line 219 lists byte sizes consistent with binary STL.

---

## 🔴 Blockers

### C-B1. No "Alternatives Considered" section [D-B1, S-B1]
**Lines:** whole spec (1–219)

**Problem:** The Feature Spec Standard fails any spec that proposes a single path without showing which other options were rejected. Every major decision here has only one path:

1. **Sizing reference:** queen base diameter, compared with king height (the appendix's own method, L239/L317) or per-piece overrides.
2. **Package geometry format:** STL plus a JSON manifest, compared with **STEP**. ncCAM already ships a STEP reader (`occt-import-js`), and STEP carries the units and solid shapes that L75 has to patch in through the manifest.
3. **Packaging:** a separate model package, compared with bundling the meshes in the plugin (about 6.9 MB).
4. **Distribution:** GitHub release download, compared with local import only or the ncSender plugin channel.
5. **Export shape:** one combined STL per blank, compared with one STL per piece plus a layout file.
6. **Handoff:** STL handoff, compared with generating G-code directly, which is what ncCAM does (category `gcode-generator`).
7. **Packing method:** a heuristic, compared with an exact search.

**Fix:** Add `## Alternatives Considered`. For each decision, list the options, their pros and cons, and the reason for the choice.

### C-B2. No Proposed Architecture section [D-B2, S-B2]
**Lines:** 41–48, 77–84, 113–121, 143–149, 168–175, 189–193

**Problem:** The plugin has at least seven parts, but they appear only as behaviour lists spread across four H2s:
- package loader
- validator
- scaler
- packer
- preview
- STL writer
- GitHub downloader

The spec never says:
- where the code runs (in the browser dialog with a Web Worker, as ncCAM does, or on the server)
- how data flows: package → validate → scale → plan → preview → export
- what manifest `category` and `permissions` the plugin needs (ncCAM's `gcode.modify` doesn't fit a plugin that writes no G-code)
- what a "saved job" is

**Fix:** Add `## Proposed Architecture` covering the components, data flow, persistent state (packages, jobs, output folder) and ncSender integration. Use ncCAM's `manifest.json` / `config.html` / `src/core` / `src/ui` layout as the known pattern.

### C-B3. The storage and export requirements depend on host APIs that are unverified or don't fit [D-B3, D-M2; also Stage 5 B1/M2 and Stage 6 B2/B6/B7]
**Lines:** 116–121, 158, 166, 175, 193, 214

**Problem:** ncCAM uses two storage mechanisms, and neither fits these requirements.

1. **Browser IndexedDB.** It belongs to one browser profile, and the browser can clear it. That conflicts with "plugin updates must preserve installed packages" (L121) and "installed set remains usable" (L166).
2. **The G-code File Manager** (`/api/gcode-files/file/save`, which takes a JSON body with a text string). There is no evidence it accepts binary data, `.stl` files or large files.
   - One full side is about 14.5 MB of binary STL, about 29 MB for both sides.
   - ASCII STL is about 5× larger, and base64 encoding adds about 33%.
   - STLs stored there might also be loadable as G-code programs. That undercuts the rule that the plugin never causes machine motion (L192, L215).

**Fix:**
- Make a host-capability check a prerequisite before building. It should cover writing non-G-code files, size limits, plugin-private persistent storage, and whether data survives plugin updates.
- Specify a fallback, such as a browser download.
- Require that exported STLs cannot be loaded as programs.

The same check should cover in-plugin GitHub download. It may be blocked by the browser's cross-site (CORS) rules and need a server proxy. Downloads also need archive size limits and a trusted source for checksums: checksums shipped inside the same download prove nothing. Until this is verified, consider "local import required; download if feasible."

### C-B4. A combined STL of separate piece bodies may not machine safely [D-B4]
**Lines:** 172, 177, 183, 202

**Problem:** Rotary CAM cuts what the model describes. If pieces are separate bodies with empty space between them, the roughing pass will cut through that gap toward the axis. That can part the blank mid-job and leave the pieces further out unsupported. Support webs are still an open question (L202), yet the length math (L183) and the acceptance criteria assume a layout without them. Joining pieces at thin finials on an 18″ blank also invites flex and chatter. The spec doesn't say which way pieces face.

**Fix:**
- Make the connecting geometry a required, parameterized part of the export: minimum connecting diameter, web length and orientation rules.
- Include it in the length math.
- Add an acceptance criterion that every blank is one connected solid from chuck to tailstock, or that the support strategy is explicitly stated otherwise.

> Elephant note: this finding depends on how the chosen turning CAM program treats gaps between bodies (Stage 5 B1). It may be partly mitigated by CAM settings, but the spec must still say what the export contains.

### C-B5. The document is organized by decision history instead of by topic [S-M3, S-M4, W-M3; also Stage 5 M4]
**Lines:** H2s at 9, 19, 59, 96, 134, 168, 179, 207

**Problem:** Headings read like a changelog ("Confirmed…", "added October 30, 2026"), so the same subject is specified several times, and the copies conflict:
- **Package format** appears at L65–75 and L100–111. L70 proposes fixed filenames, while L102 says the manifest maps names. Only the mapping approach works with the real repository, which uses names like `Source/Staunton/King/King.STL`.
- **Loading** appears at L77–84, L113–121 and L143–149.
- **Planning** appears at L41–48, L168–175 and L179–187. L170 leaves out the cross-section input that L26 requires.
- **Acceptance criteria** are split across five blocks (L52, L88, L127, L161, L207), two with the same heading. Some criteria are duplicates: L129 ≈ L164, and L94 ≈ L132.

Other style-reviewer examples of the same rule stated more than once: L45/L183, L185/L211, L119/L149/L166.

**Fix:** Restructure by topic, keeping one copy of each rule:
- Problem Statement
- Goals & Non-Goals
- Glossary
- Requirements (Inputs, Sizing, Stock planning, Model packages, Distribution, Export)
- Proposed Architecture
- Alternatives Considered
- Risks & Mitigations
- Acceptance Criteria, with stable IDs such as AC-PLAN-01
- Open Questions
- References
- Appendix

> Elephant note: S-M3/S-M4 were rated Major by their reviewer. They are raised to Blocker here because the conflicting duplicate copies make it impossible to tell which requirement is the real one.

---

## 🟡 Major

### C-M1. Status labels contradict the content [S-M5, W-M2, D-N1; also Stage 6 M1]
- L27 says the control "needs confirmation" while also calling it confirmed. L61 confirms it again.
- Sections headed "Confirmed …" contain "Proposed …" subsections (L65, L100, L143).
- L198 asks "round or square?" although L26 already makes it an input.
- L200 and L203 are confirmed facts phrased as open questions.
- L29 conflicts with L201.

**Fix:** Name headings by topic only, and give every item exactly one status: **[Confirmed]**, **[Proposed]** or **[Open]**. Keep only items that are still undecided in Open Questions, each with an owner and a default assumption.

### C-M2. No Risks & Mitigations section [D-M1, S-M1]
Risks are scattered across L86, L118, L151 and L193. Some are missing entirely:
- C-B3 and C-B4
- browser preview load (about 290k triangles per side)
- license propagation (C-M9)
- overwriting existing exports

**Fix:** Add a table with these columns: Risk, Category, Impact, Mitigation, Status.

### C-M3. No Problem Statement or Goals & Non-Goals [D-M6, S-M2]
L7 describes the document, not the problem. L9–17 starts with the solution. Non-goals are scattered across L125, L177, L187, L191, L211 and L215. L17 is an editing instruction, not a requirement [W-M5].

**Fix:** Add a short Problem Statement saying why a plugin beats manual layout in CAD/CAM. Collect the non-goals in one list. Delete L17.

### C-M4. The packing method and the length formula are unspecified [D-M4, W-M4; also Stage 6 B4]
Lines 46–50, 173 and 183 hedge about whether the result is optimal. The problem is small, though: at most 16 pieces of 6 types per side, about 972 possible piece-count combinations. An exact minimum-blank search is cheap.

**Fix:**
- Specify an exact search with a fixed tie-break: fewest blanks, then least waste, then a stable order.
- Define the length formula: end reservations + Σ piece lengths + (n−1)·gap + kerfs + support webs.
- Add numeric worked examples (12″/18″ × 2″/2½″) as acceptance tests.

### C-M5. Output units and coordinate frame are unspecified [D-M3; also Stage 6 B5]
Input packages must declare units and axis (L75), but the exported blank STLs have no fixed unit, axis or origin. Inputs accept both inch and mm, so getting this wrong in CAM causes a 25.4× scale error.

**Fix:** Always export in mm. Fix the rotary axis and the origin, for example the chuck face. Record them in a small JSON file next to each export, and add an acceptance criterion.

### C-M6. "Queen base diameter" and tolerances have no definition [D-M5; also Stage 6 B8]
The spec doesn't say how base diameter is measured from a mesh. The tolerances are given only as "defined" or "agreed" (L82, L92). The spec also doesn't define the knight's "maximum radial extent".

**Fix:**
- Define the measurement method and numeric tolerances.
- State that stock fit uses the swept radius about the rotary axis: the furthest any point on the piece reaches from that axis.
- Mark any values that aren't set yet as **[TBD]**.

### C-M7. Terminology drifts [S-M8, W-M1, W-M6]
The model bundle has six names: "set definition", "set package", "design package", "model package", "installed chess design" and "starter set". "Side", "batch" and "material" are used interchangeably. The downstream program is called "turning/rotary machining program", "downstream CAM", "rotary CAM" and "turning program".

Slash terms leave the count of inputs unclear. "spacing/separation allowance" (L28) and "support/separation allowances" (L46) could mean one, two or three inputs.

**Fix:** Add a Glossary with these terms: model package, side, blank, usable length, downstream CAM. Name each allowance as its own parameter: chuck reservation, tailstock reservation, inter-piece gap, support-web length, radial allowance.

### C-M8. Vague criteria and placeholder thresholds [W-M4]
Undefined phrases:
- "used efficiently" (L16)
- "reduce avoidable waste" (L47)
- "agreed geometry checks" (L81)
- "defined tolerances" (L82)
- "actionable message" (L83, L94, L132, L213)
- "agreed export tolerance" (L92)
- "clear before export" (L212)

**Fix:** Replace each with a testable statement or a **[TBD]** marker. Define "actionable error" once: it names the failing item and the required correction.

### C-M9. The reference model source is unclear and incomplete [S-M7, D-N2]
L219 says "six Staunton STL models", but the repository has two STL sets:
- `Source/Staunton/<Piece>/<Piece>.STL`
- `Source/Readymake_Duchamp_Chess_Set/*.stl`, plus `set_6.stl`

There are also SLDPRT variants and stray `~$*.SLDPRT` lock files. The spec body (L1–219) contains no links at all.

**Fix:** Name the repository with a link, the commit or tag, and exact folder paths. Add a References section. Also decide whether exported blanks need an MIT attribution file [D-N4].

---

## 🟢 Nits (grouped)

**Headings and layout:**
- L3 is a subtitle written as an H2 heading.
- L19 has the date in the heading.
- Status suffixes are used inconsistently (L52, L153, L207).
- The appendix has three H1s (L223, L227), which breaks the hierarchy. Demote it to `## Appendix A` [S-M6].
- The L335–341 "Next-session checklist" is working notes.
- The model inventory (L217–219) belongs in the appendix.

**Stale appendix content:**
- L326 says "species still to be chosen", but L14 confirms maple and walnut.
- L331 and L317 are also stale.
- Add "(superseded)" markers or strike these through.

**Wording:**
- L39 says "should"; use "must".
- Remove filler: "simply", "merely" (L185, L193, L211), "properly prepared" (L138), and the hedges at L98 and L177.
- L61 and L63 use narrative phrasing ("The user confirmed…"). Write them as direct requirements.
- L75 and L125 use passive or odd constructions.
- L267, L287, L289 and L295 use vague quantities. Give numbers, e.g. "brass ~8.5 g/cm³ vs steel ~7.85".
- L316 and L322 use an inconsistent voice.

**Links:**
- The FIDE URL at L345 contains "Componenets". Check whether that is FIDE's own spelling before changing it.

**Overwrite policy (L205):**
- Adopt ncCAM's `freePath()` convention, which appends ` (n)` instead of overwriting [D-N3].

Full Nit list with suggested rewrites: see the style reviewer table, available on request.

---

## Traceability matrix

| Consolidated | Design | Structural | Style | Earlier stages |
|---|---|---|---|---|
| C-B1 Alternatives | B1 | B1 | — | — |
| C-B2 Architecture | B2 | B2 | — | S6-B1 |
| C-B3 Host storage/export/download | B3, M2 | — | — | S5-B1, S5-M2, S6-B2, S6-B6, S6-B7 |
| C-B4 Blank connectivity | B4 | — | — | S6-B5 |
| C-B5 Topic structure / duplicates | — | M3, M4 | M3 | S5-M4 |
| C-M1 Status contradictions | N1 | M5 | M2 | S5-M5, S6-M1 |
| C-M2 Risks | M1 | M1 | — | — |
| C-M3 Problem/Goals | M6 | M2 | M5 | S5-N4 |
| C-M4 Packing | M4 | — | M4 (L47) | S5-N2, S6-B4 |
| C-M5 Output frame | M3 | — | — | S6-B5, S6-M4 |
| C-M6 Measurement/tolerances | M5 | — | M4 (L82, L92) | S6-B8, S6-M2 |
| C-M7 Terminology | — | M8 | M1, M6 | S6-M3 |
| C-M8 Vague criteria | — | — | M4 | S6-M5 |
| C-M9 Model source | N2, N4 | M7 | Nit L217 | S5-N3, S6-M6 |
| Nits | N3, N5 | M6, Nits 1–7 | 25 Nits | S5-N5, S6-N2 |
