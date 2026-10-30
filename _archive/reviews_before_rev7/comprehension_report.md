# Stage 6 — Comprehension Test Report

- **Target:** `Chess_Set_Creator.md`. FeatureRange: lines 1–349. DetailedRange: N/A, since the document has no implementation plan.
- **Reviewer:** egm-comprehension (fresh context), applying the Re-Implementation Standard
- **Context supplied:** local copies of `siganberg/ncsender-plugin-nccam` and `clarkerubber/Staunton-Pieces`
- **Date:** 2026-10-30

**Verdict: not ready to re-implement.** A developer reading this spec with no other background would have to make their own design choices on seven things:
- the plugin entry point
- the export location
- the package manifest format
- the packing method
- the exported geometry
- GitHub distribution
- storage

As a requirements draft, the document is clear and open about what it doesn't know. But many of its "to be verified/decided" items are exactly the contracts a builder needs.

Orchestrator spot check: the contradictions in M1 are confirmed by the text. L26 has the user choose square or round, while L198 still asks the question. L27 says the size control "needs confirmation", while L61 and L203 say it is confirmed.

---

## 🔴 Blockers

### B1. The ncSender plugin contract is never defined or linked (L3, L11, L189–193)
**Gap:** "ncSender" and "ncSender plugin" have no definition or link, and L193 says the plugin API still needs verification. The ncCAM example shows a concrete contract:
- `manifest.json` with `id`, `version`, `minAppVersion`, `configUi`, `category`, `platforms`, `permissions` and `toolMenu`
- a `config.html` dialog that loads a bundled JS file via `/api/plugins/<id>/icon?file=…`
- the dialog closes by sending `postMessage({type:'close-plugin-dialog'})`

**A builder must guess:** the plugin id, category, permissions, minimum versions, how the UI opens, and whether the plugin runs only in the browser client.

**Recommendation:** Add an "ncSender integration" section with a draft `manifest.json` modelled on ncCAM. It should state the UI entry point (`toolMenu` → `configUi`) and list the host APIs the plugin calls.

### B2. "ncSender file system" and the *chess set* output folder are undefined (L12, L37, L175, L193, L214)
**Gap:** ncCAM saves files with `POST /api/gcode-files/file/save {path, content}` into a folder prefix (`ncCAM/…`). It finds a free filename by requesting `GET /api/gcode-files/file?path=`; a "not found" (404) reply means the name is free. That endpoint is built for G-code text, and it is unknown whether it accepts STL.

**A builder must guess:** the endpoint, the exact folder name and its capitalization, binary vs ASCII STL, and what to do if STL is rejected.

**Recommendation:**
- Name the save API and the exact path.
- Choose binary or ASCII STL.
- Define a fallback, such as a browser download.
- Resolve L205 using ncCAM's `name (n)` convention.

### B3. There is no schema for `chess-set.json` (L65–75, L100–111)
**Gap:** The two prose lists of manifest contents don't match. L71/L73 list axial length, maximum radial extent, and notes on tool access and support. L106–111 list "dimensions" and "known machining limitations". The spec also never gives:
- field names, types, or which fields are required
- the allowed units
- how the axis convention is encoded
- the checksum algorithm
- the schema-version format and compatibility rule (L94)

**Recommendation:** Add a JSON Schema, or an annotated example manifest, that covers every field. State SHA-256, units ∈ {mm, in}, how axis, up direction and base plane are encoded, and the semver compatibility rule.

### B4. The packing method and the length arithmetic are unspecified (L43–50, L172–173, L181–185)
**Gap:** "Minimize blanks, then reduce avoidable waste" is a goal, not a method. These questions are unanswered:
- What counts as waste when two layouts use the same number of blanks?
- How are ties broken, and must results be repeatable (the same inputs always give the same layout)?
- How many gaps are counted: n−1 between pieces, or n+1 including the ends?
- Is the separation allowance counted per piece, per gap, or per blank?

Three overlapping terms appear (L28, L46, L172) and may or may not mean the same thing. The spec also doesn't say which way pieces face along the blank: base toward the chuck, base toward the tailstock, or alternating.

**Recommendation:**
- Write the fit formula. For example: `usable = L − chuckRes − tailRes`; a set of pieces fits when `Σ axialLen + (n−1)·gap ≤ usable`.
- Give each allowance one named parameter.
- Choose a method, such as first-fit decreasing (place the longest pieces first), with an exhaustive search for 16 pieces or fewer.
- Define a repeatable tie-break rule.
- Fix the piece orientation along the blank.

### B5. The exported STL geometry is undefined (L75, L172, L175–177, L202)
**Gap:**
- The axis convention is deferred to an unnamed CAM program (L75, L197).
- The export origin is not given.
- It is unclear whether the stock cylinder or the end reservations appear in the STL.
- Support geometry is still an open question (L202).
- The knight's rotation about the turning axis is not given.

**Recommendation:** Fix one convention for v1, for example:
- X is the rotary axis.
- The origin is at the chuck end of the usable length, and +X points toward the tailstock.
- Units are mm, and the file is binary STL.
- Each piece is one separate body.
- There is no support geometry.

Revisit once the CAM program is chosen.

### B6. GitHub distribution is required but has no contract (L119, L134–151)
**Gap:** The spec gives none of these:
- the repository
- the release lookup method (`releases/latest` or a pinned tag)
- asset naming
- archive format
- how extraction works
- whether the plugin UI can fetch GitHub assets directly; browsers block many cross-site downloads (CORS), so it may need a server to fetch them
- how and when updates are checked

**Recommendation:** Specify the repository, the asset pattern (e.g. `chess-set-<id>-<version>.zip`), the API call, the archive format, how the network fetch works, and whether update checks are manual only.

### B7. Storage and the "saved job" are undefined (L116–121, L156, L174, L187)
**Gap:** A "saved job" has no format, location or lifecycle. "Pieces still to make" and "track completion per side" imply progress that has to be saved somewhere, but no data model for it exists.

**Recommendation:** Define what a job record contains:
- package id and version
- checksums
- inputs
- the plan
- export paths
- completion state, if it is in scope

Then name where jobs are stored, or move completion tracking out of v1.

### B8. Base-diameter measurement and tolerances are undefined (L72, L82, L92)
**Gap:** "Within defined tolerances" and "agreed export tolerance" have no values. The spec also doesn't say how the queen base diameter is measured on the mesh.

**Recommendation:** Give numeric tolerances (e.g. ±0.1 mm, ±0.5°) and an exact measuring procedure (e.g. maximum radius within the bottom N mm).

### B9. No input has a default or a valid range (L28, L181, L199)
**Gap:** "Defaults are not yet agreed". Chuck and tailstock reservations, spacing, separation and radial allowance have no defaults or limits. The 40 mm queen base in the appendix (L246) is never named as the default.

**Recommendation:** Add an input table: name, unit, default, min, max and validation message.

---

## 🟡 Major

- **M1. Confirmed, proposed and open items contradict each other.**
  - L27 says the size control "needs confirmation", while L61 and L203 say it is confirmed.
  - L26 has the user choose square or round, while L198 still asks the question.
  - L29 says independent stock settings come "later", while L201 leaves it open.

  Mark every bullet with exactly one status: Confirmed, Proposed-v1 or Deferred.
- **M2. The cross-section fit rule has no formula (L26, L44, L93).** State the inequality for each stock shape, e.g. round stock: `2·(maxRadial + radialAllowance) ≤ D`. Define radial extent as the largest distance of any point on the mesh from the axis; this matters for the knight, which isn't round.
- **M3. Material and side meaning is unclear (L14, L29, L170).**
  - Are the species names fixed or editable labels?
  - Does "maple only" skip walnut entirely?
  - Is "material batch" the same as "side"?
  - How is "purchased stock length" (L35) calculated?
- **M4. Units handling is unspecified (L25).** The spec gives none of: the internal unit, display precision and rounding, the STL output units, and how inch packages are converted.
- **M5. There is no list of errors (L48, L83, L94, L132, L157–158, L213).** Add a table with each condition, its message, and whether it blocks the preview or only the export.
- **M6. It is unclear which reference model set to use (L141, L219, L306–309).** The Staunton repo contains:
  - `Source/Staunton/*/X.STL`
  - `Source/Readymake_Duchamp_Chess_Set/*.stl`, plus `set_6.stl`
  - `Source/Traditional Pieces/*.SLDPRT`
  - `Source/Experimental/*`

  Name the exact upstream paths, and say whether filename matching is case-sensitive.
- **M7. Mesh validation depends on the unknown CAM program (L81).** Fix v1 checks that don't depend on it: the STL is readable, the mesh is closed (watertight), surface normals are consistent, and volume is above zero.
- **M8. Preview requirements are vague (L36, L174).** The spec doesn't say whether the preview is 2D or 3D, what it shows, or whether preview is required before export. ncCAM uses a three.js viewport.
- **M9. The appendix's role is unclear (L17, L204, L225).** State that the appendix doesn't affect v1 behaviour, or list the items it does affect.

---

## 🟢 Nits

- **N1.** Add a one-line glossary: STL, CAM, chuck, tailstock, rotary/4th axis, blank, manifold, undercut, SLDPRT/DWG/3DXML, FIDE, Staunton.
- **N2.** The appendix has its own top-level `#` heading, which breaks the document's heading hierarchy. Also, L326 ("species still to be chosen") contradicts L14.
- **N3.** The byte counts at L219 can't be checked from the spec. Replace them with paths and checksums.
- **N4.** Link ncCAM as the reference plugin structure.
- **N5.** The acceptance examples (L52–57) have no numbers. Add one worked example so the packing can be tested, e.g. 40 mm queen base, 18″ × 2″ round stock, given allowances → N blanks with the layout listed.
