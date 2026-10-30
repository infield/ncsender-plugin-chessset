# Goldfish Annotated Review Report

**Status: superseded.** All 14 items were accepted in the interactive breakdown, but the fixes were **not applied**: the spec was replaced by Revision 2 (archived Revision 1: `_archive/Chess_Set_Creator_2026-10-30_pre-review-draft.md`) before the edit pass. The owner chose to re-run Stage 7 on Revision 2 instead (the stage's one re-audit).

**Target:** `Chess_Set_Creator.md` (lines 1–219 for the spec body; lines 221–349 for the appendix)
**Source findings:** `critic_report.md` (Stage 7)
**Resolver note:** I did not write this document in this session, so I have no record of why earlier decisions were made. Where a fix needs a decision only you can make, the proposed text uses a visible **[Owner input needed]** or **[TBD]** marker instead of inventing a reason or a value.

**Summary:** 14 findings plus 1 grouped nit entry:

| Category | Count |
|---|---|
| PROPOSE FIX | 13 |
| PROPOSE FIX, with owner input needed | 1 (Issue 4) |
| CONTEST | 0 |
| ESCALATE | 0 |
| DECLINE | most appendix wording nits |

## How the fixes fit together

Issue 1 (restructure) is the main edit. Most other fixes add or rewrite sections inside the new structure. If you accept Issue 1, I apply it first and fold in the other accepted fixes. If you reject it, I apply the other fixes in place under the current headings.

---

## Prioritized Findings & AI Suggestions

### [Issue 1] [`structural`, `style`] - Severity: High (C-B5)
- **Affected scope:** Lines 9–219 (all spec H2s)
- **Discrepancy:** Headings follow the decision history ("Confirmed…", "added October 30"), so the same topics are specified 2–3 times, and the copies conflict:
  - L70 vs L102: filenames
  - L41–50 vs L168–177 vs L179–187: planning
  - five separate acceptance-criteria blocks
- **Rationale:** With conflicting copies, a reader can't tell which requirement is authoritative.
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** Confirmed against the text. L70 proposes fixed filenames, while L102 makes them optional through manifest mapping. L170 has only stock length, while L26 also requires the cross-section. Line 129 and line 164 state the same criterion.
- ***Proposed Edit:*** Rewrite lines 1–219 into the outline below. No requirement is dropped, and each rule appears once.

  Each requirement gets one inline tag: **[Confirmed]**, **[Proposed]**, **[Open]** or **[Deferred]**. "Confirmed" comes only from the current "Confirmed" text. Anything in a "Proposed" subsection keeps the "Proposed" tag.

  The new outline:

  ```
  # Chess Set Creator
  (preface: owner, date, status legend)
  ## Problem Statement
  ## Goals & Non-Goals
  ## Glossary
  ## Requirements
  ### Inputs                 ← L21–29, L181, L198–199
  ### Sizing                 ← L27, L61, L72, L92–93
  ### Stock planning         ← L33–39, L41–50, L170–174, L183–187
  ### Model packages         ← L63–75, L98–111, L123–125   (one format; the manifest mapping from L102 wins, canonical names recommended)
  ### Loading and validation ← L77–86, L113–121
  ### Distribution           ← L134–159
  ### Export and ncSender integration ← L175–177, L189–193
  ## Proposed Architecture
  ## Alternatives Considered
  ## Risks & Mitigations
  ## Acceptance Criteria      ← all 5 blocks merged, IDs AC-PLAN-xx / AC-PKG-xx / AC-DIST-xx / AC-EXP-xx, duplicates removed
  ## Open Questions           ← L195–205, with resolved items removed
  ## References               ← Staunton repo, FIDE, ncCAM
  ## Appendix A: Earlier build notes (historical)   ← L223–349, headings demoted one level
  ```

### [Issue 2] [`design`, `structural`] - Severity: High (C-B1)
- **Affected scope:** Whole spec. The section is missing.
- **Discrepancy:** The spec has no Alternatives Considered section. Each major decision lists only one path.
- **Rationale:** The Feature Spec Standard requires rejected alternatives to be recorded.
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** This is a valid gap. Some reasons can be cited from the document, for example that L98 makes a separate payload a user requirement. Others are not recorded anywhere, so I mark them for owner input rather than inventing them.
- ***Proposed Edit:*** Add `## Alternatives Considered` as a table:

  | Decision | Chosen | Alternatives | Reason |
  |---|---|---|---|
  | Sizing reference | Queen base diameter | King height (appendix L317); overall height; per-piece overrides | Confirmed by owner (L61). Per-piece overrides are an Open question. **[Owner input needed: why queen rather than king]** |
  | Package geometry format | STL + JSON manifest | STEP (ncCAM already ships a STEP reader); CAD sources | STL is what the upstream repo provides as mesh. STEP would carry units and solids. **[Owner input needed]** |
  | Payload packaging | Separate model package | Bundle ~6.9 MB of meshes in the plugin | Owner requirement (L98) |
  | Distribution | GitHub tagged release + local import | Local import only; ncSender plugin channel | Owner requirement (L134–139). Feasibility depends on Issue 4. |
  | Export shape | One combined STL per blank | One STL per piece plus a layout file | **[Owner input needed: depends on what the CAM program accepts]** |
  | Handoff | STL to downstream rotary CAM | Plugin generates G-code itself (as ncCAM does) | Owner requirement (L13, L191). Toolpaths are out of scope. |
  | Packing method | Exact minimum-blank search | First-fit-decreasing heuristic | Problem size is tiny (≤16 pieces, 6 types); exact search is cheap. See Issue 7. |

### [Issue 3] [`design`, `structural`] - Severity: High (C-B2)
- **Affected scope:** L41–48, L77–84, L113–121, L143–149, L168–175, L189–193
- **Discrepancy:** The spec never defines the components, where the code runs, the data flow, the manifest permissions, or the saved-job record.
- **Rationale:** The Feature Spec Standard requires a component layout and an account of how the plugin fits into ncSender.
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** This is a valid gap. The ncCAM example gives a known pattern to cite.
- ***Proposed Edit:*** Add `## Proposed Architecture` **[Proposed]** with four parts.
  - **Runtime:** a client-side plugin dialog, following ncCAM. `manifest.json` has a `toolMenu` entry, and `configUi` loads a bundled `lib/chess-set-creator.js`. Heavy work (mesh parsing, packing, STL writing) runs in a Web Worker.
    - Manifest `category` is **[TBD]**.
    - `permissions` is **[TBD after host check]**; `gcode.modify` is not needed.
  - **Components**, in data-flow order:
    1. Package store
    2. Package validator
    3. Scaler
    4. Stock planner
    5. Preview (three.js, following ncCAM's viewer)
    6. STL writer
    7. Exporter
    8. GitHub downloader
  - **Persistent state:**
    - installed packages (location: **[TBD after host check]**)
    - job records
    - the `chess set` output folder
  - **Job record:**
    - package id, version and checksums
    - all inputs
    - computed layout
    - export paths
    - completion state per side **[Proposed]**

### [Issue 4] [`design`] - Severity: High (C-B3)
- **Affected scope:** L116–121, L158, L166, L175, L193, L214
- **Discrepancy:** Storage, export and download all depend on ncSender capabilities that are unverified. The only example plugin stores data in browser IndexedDB and writes files only through the G-code file API.
- **Rationale:** Acceptance criteria L166 and L214 are written as commitments but rest on unverified host features.
- ***AI Suggestion:*** PROPOSE FIX (owner input needed)
- ***Justification:*** Confirmed against ncCAM:
  - `src/ui/store.js` uses IndexedDB.
  - `src/ui/app.js` L832–858 uses only `/api/gcode-files/*` with a JSON text body.

  The spec itself says these APIs are unverified (L116, L193). I don't know whether you already know ncSender's real file API. If you do, that fact should go into the document.
- ***Proposed Edit:*** Add `### Host capability check (prerequisite)` **[Open — must close before implementation]**.

  The check must answer five questions:
  - (a) Can a plugin write non-G-code files (binary or ASCII `.stl`) to the File Manager, and what is the size limit? One side is about 14.5 MB of binary STL.
  - (b) Will ncSender refuse to load `.stl` files as programs?
  - (c) Is there plugin-private persistent storage that survives plugin updates and is shared across clients?
  - (d) Can the plugin fetch GitHub release assets directly (CORS), or does it need a host proxy?
  - (e) Does it need archive extraction, with size limits?

  Fallbacks, tagged **[Proposed]**:
  - If (a) fails, offer a browser download of the blank STLs.
  - If (c) fails, keep packages in browser storage and state that each browser needs its own install.
  - If (d) fails, require local import and keep download as a later goal.

  Add to Risks: checksums shipped in the same download don't prove the publisher. Either pin expected digests or release tags in the plugin, or state that authenticity is out of scope.

  Mark AC L166 and L214 as dependent on this check.

### [Issue 5] [`design`] - Severity: High (C-B4)
- **Affected scope:** L172, L177, L183, L202
- **Discrepancy:** Support geometry between pieces is optional and unspecified. Separate piece bodies with gaps between them may lead the CAM program to cut through the blank mid-job. The length math also ignores support webs.
- **Rationale:** This is a machining safety and correctness risk.
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** The finding is valid as a missing requirement. The exact failure depends on the CAM program, which is still Open (L197), so the requirement is tagged Open/Proposed rather than Confirmed.
- ***Proposed Edit:***
  - Replace the last sentence of L177 with: "**[Open, blocks export design]** The blank STL must define how pieces stay connected to each other and to the stock ends until parting off. Proposed: a cylindrical web of configurable minimum diameter and length between adjacent pieces and at each end, so each blank exports as one connected solid. Final form depends on the chosen CAM program."
  - Add `support-web length` and `minimum web diameter` as inputs.
  - Add piece orientation (base toward chuck) as **[Proposed]**.
  - Add AC-EXP: "Each exported blank is one connected solid from chuck end to tailstock end, unless a different support strategy is explicitly selected."

### [Issue 6] [`structural`, `style`, `design`] - Severity: Medium (C-M1)
- **Affected scope:** L27, L29, L59/65, L96/100, L134/143, L198, L200, L201, L203
- **Discrepancy:** Some items carry the wrong status. Items marked confirmed are still listed as open questions, and the reverse.
- **Rationale:** A reader can't tell what is decided.
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:*** Apply the per-item status tags from Issue 1, plus these specific changes:
  - **L27:** "Queen base diameter **[Confirmed]** (see Sizing). All pieces scale by the same factor; the UI shows resulting heights and diameters."
  - **L198:** delete; it is already an input (L26).
  - **L200:** "Is manual piece selection wanted in addition to automatic full-side planning?"
  - **L203:** "Are per-piece size overrides needed?"
  - **L29 and L201:** keep one Open question with the default "both sides share stock settings" **[Proposed]**.

### [Issue 7] [`design`, `style`] - Severity: Medium (C-M4)
- **Affected scope:** L46–50, L173, L183, L185
- **Discrepancy:** The spec has no packing method and no exact length formula, and it hedges about whether the result is optimal.
- **Rationale:** Without a method and formula, the planner can't be tested, and two implementations could give different counts.
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:*** Replace L46–47 and L183 with this text, tagged **[Proposed]**:
  - **Formula:** `usable = L − chuckReservation − tailstockReservation`. A blank fits pieces p₁…pₙ when `Σ axialLength(pᵢ) + (n−1)·gap + (n+1)·webLength ≤ usable`.
  - **Method:** exact minimum-blank search over the side's piece counts. The tie-break order is:
    1. fewest blanks
    2. least total unused length
    3. pieces ordered king → pawn
  - **Repeatability:** the same inputs always give the same layout.
  - **L47:** remove the second sentence. Since the search is exact, the count can be reported as the minimum.
  - **L52:** add one worked example with **[TBD]** values, to fill in once defaults exist.

### [Issue 8] [`design`] - Severity: Medium (C-M5)
- **Affected scope:** L25, L75, L175
- **Discrepancy:** The export unit, axis and origin of the exported STL files are undefined.
- **Rationale:** If the CAM program assumes the wrong unit, every part comes out 25.4× too big or too small.
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:*** In Export, add this text tagged **[Proposed]**: "Blank STLs are always exported in millimetres, binary STL. The X axis is the rotary axis. The origin is on the axis at the chuck-side end of the usable length, and +X points toward the tailstock. Each export also writes `<blank>.json` recording the unit, axis, origin, stock size, reservations and piece positions. Revisit once the CAM program is chosen." Add a matching acceptance criterion.

### [Issue 9] [`design`] - Severity: Medium (C-M6)
- **Affected scope:** L71, L72, L82, L92
- **Discrepancy:** The spec doesn't say how base diameter or radial extent are measured, and it gives no tolerance values.
- **Rationale:** Without these, validation results can't be reproduced.
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:*** Add these definitions:
  - **Base diameter:** twice the largest distance from the axis of any mesh vertex within the bottom **[TBD, proposed 1 mm]** of the piece.
  - **Radial extent:** the largest distance from the axis of any vertex. This is the swept radius, which matters for the knight.
  - **Stock fit:** `2·(radialExtent + radialAllowance) ≤ usable width`.
  - **Tolerances:** dimensions **[TBD, proposed ±0.1 mm]**; axis alignment **[TBD, proposed ±0.5°]**.
  - Replace "agreed" and "defined" at L82 and L92 with references to these values.

### [Issue 10] [`design`, `structural`] - Severity: Medium (C-M2)
- **Affected scope:** The section is missing. The risk notes are scattered across L86, L118, L151 and L193.
- **Discrepancy / Rationale:** The Feature Spec Standard requires a dedicated risk section.
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:*** Add `## Risks & Mitigations` as a table (Risk | Category | Impact | Mitigation | Status) with these rows:
  - unverified host APIs (Issue 4)
  - download authenticity
  - archive traversal and size
  - blank connectivity (Issue 5)
  - unmachinable geometry and knight undercuts (L86, L320)
  - wrong export units (Issue 8)
  - overwriting existing exports: adopt ncCAM's `name (n)` suffix (resolves L205)
  - browser preview load (~290k triangles per side)
  - MIT attribution in exported files

### [Issue 11] [`design`, `structural`, `style`] - Severity: Medium (C-M3)
- **Affected scope:** L7–17, L125, L177, L187, L191, L211, L215
- **Discrepancy:** There is no Problem Statement, the non-goals are scattered, and L17 is an editing instruction rather than a requirement.
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:*** Add a Problem Statement: "Turning a 32-piece Staunton set means fitting pieces of six sizes onto stock blanks of a few standard lengths, for two woods. Doing that layout by hand in CAD/CAM for each size change is slow and wastes stock. The plugin takes stock sizes and a queen base diameter, computes the fewest blanks per side, and exports ready-to-turn blank models." **[Owner to confirm wording]**

  Collect the non-goals into one list:
  - toolpaths and G-code
  - machine motion
  - CAD format conversion
  - tool-access checks
  - promotion queens
  - weight pockets (these are a separate underside operation, per L318; weight pockets is also an Open question at L204)

  Delete L17.

### [Issue 12] [`structural`, `style`] - Severity: Medium (C-M7, C-M8)
- **Affected scope:** L13–16, L28, L46, L63, L81–83, L90–98, L136–137, L170, L201, L212–213
- **Discrepancy:** Several names are used for the same concept, and several criteria are vague.
- ***AI Suggestion:*** PROPOSE FIX
- ***Proposed Edit:*** Add a `## Glossary` and use only these terms throughout:
  - **Model package:** manifest + six STL files defining one design.
  - **Side:** the 16 pieces of one colour (light = maple, dark = walnut).
  - **Blank:** one length of turning stock.
  - **Usable length:** blank length minus both end reservations.
  - **Downstream CAM:** the rotary CAM program that imports the blank STLs.

  Name the allowances separately:
  - chuck reservation
  - tailstock reservation
  - inter-piece gap
  - support-web length
  - radial allowance

  Replace the vague phrases:
  - "used efficiently" → refer to the packing method.
  - "actionable message" → define once: "names the failing item and the required correction".
  - "clear before export" (L212) → "The preview shows material, units, piece list and unused length per blank before export."

### [Issue 13] [`structural`, `design`] - Severity: Medium (C-M9)
- **Affected scope:** L141, L217–219
- **Discrepancy:** The spec doesn't say which upstream folder the model inventory refers to, and the spec body has no links.
- ***AI Suggestion:*** PROPOSE FIX
- ***Justification:*** I matched the byte sizes in L219 exactly to `Source/Staunton/<Piece>/<Piece>.STL` at upstream commit `cef2c79`. The second set, `Source/Readymake_Duchamp_Chess_Set/`, has different sizes.
- ***Proposed Edit:*** Rewrite L219 as: "Starter candidate: `Source/Staunton/{King,Queen,Bishop,Knight,Rook,Pawn}/<Piece>.STL` in [clarkerubber/Staunton-Pieces](https://github.com/clarkerubber/Staunton-Pieces) at commit `cef2c79` (MIT, © 2014 clarkerubber). Six files, 6,900,804 bytes. The repository also contains a second STL set (`Source/Readymake_Duchamp_Chess_Set/`), a possible second package. Exclude `~$*.SLDPRT` lock files and `Thumbs.db` when repackaging. Units, geometry and machinability are unvalidated."

  Move this block to the Model packages section and add a References section.

### [Issue 14] [`structural`, `style`, `design`] - Severity: Low (grouped nits)
- ***AI Suggestion:*** PROPOSE FIX for the items below; DECLINE the rest.
- **PROPOSE FIX:**
  - Make the L3 subtitle italic text.
  - Remove the date from the L19 heading.
  - Merge the H1s at L223/L227 into `## Appendix A`.
  - Add "(superseded)" notes at L326, L331 and L317.
  - Label L333 "Next-session checklist (historical)".
  - Change "should" to "must" at L39.
  - Remove "simply"/"merely" at L185, L193 and L211.
  - Rewrite L61 and L63 as direct requirements.
  - Adopt ncCAM's `name (n)` convention at L205 (covered in Issue 10).
- **DECLINE:**
  - Appendix wording nits: L233, L239, L260, L264, L267, L271, L275, L277, L287, L289, L295, L316, L319, L322, L337.
  - The FIDE URL spelling at L345.
  - The MIT attribution sidecar (kept as a risk row in Issue 10).

  Reason for declining: the appendix is historical build notes and isn't normative. Its tone doesn't affect what gets built. The FIDE URL probably uses FIDE's own spelling; the reviewer couldn't check it, and I didn't change it.
