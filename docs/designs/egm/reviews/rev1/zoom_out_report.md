# Stage 5 — Initial Zoom Out Report

- **Target:** `Chess_Set_Creator.md` (full file, lines 1–349; feature spec only, no implementation plan)
- **Reviewer:** egm-zoom-out (fresh context)
- **Context supplied:** local copies of `siganberg/ncsender-plugin-nccam` and `clarkerubber/Staunton-Pieces`
- **Date:** 2026-10-30

**Verdict: NEEDS REVISION.** The goal is clear: plan where chess pieces go on maple and walnut turning blanks, then export one STL per blank. The architecture is not settled, for two reasons. First, it depends on a downstream turning/CAM program that has not been named. Second, about half of the spec describes package and distribution machinery for a single model set that has not been prepared yet.

Orchestrator spot checks (verified against the context repos): ncCAM's only file APIs are `/api/gcode-files/load-temp` and `/api/gcode-files/file/save` (`src/ui/app.js:832,845,858`). Its only persistence is browser IndexedDB (`src/ui/store.js:7`). Staunton-Pieces contains two STL sets: `Source/Staunton/` and `Source/Readymake_Duchamp_Chess_Set/`.

---

## 🔴 Blocker

### B1. The output's consumer, and whether ncSender can store STL, are both unknown, and the architecture depends on them
**Scope:** L13, L75, L191–193, L197, L202

**Problem:** These choices all depend on the turning/rotary CAM program:
- the axis convention (L75)
- the support or bridge geometry (L202)
- whether one combined STL per blank (L175–177) is acceptable at all

That program is still an open question (L197). The ncSender evidence also argues against assuming ncSender can store or pass along STL:
- The only file API ncCAM uses is the **G-code** File Manager: `POST /api/gcode-files/file/save` with a JSON `{path, content}` string body, and `/api/gcode-files/load-temp`. A binary STL would have to be written as ASCII STL or encoded first. It is unverified whether this store accepts files that aren't `.nc` at all.
- ncCAM's manifest category is `"gcode-generator"`, with permission `gcode.modify`. Nothing in the ecosystem shows a program that consumes STL or does rotary work.
- ncCAM itself is limited to 2.5D cutting from the top (README L16–17), so it cannot be the downstream turning CAM.

**Recommendation:**
1. Name the CAM program. Confirm that it imports STL, and confirm its axis and multi-body conventions.
2. Prove that ncSender's File Manager will store an STL under a `chess set/` path.
3. If either check fails, reconsider whether this belongs in ncSender. A standalone planner that writes STLs to disk is simpler. Alternatively, retarget the output to something ncSender consumes.

---

## 🟡 Major

### M1. YAGNI: package format, GitHub distribution, versioning and updates outweigh the core feature
**Scope:** L59–166 (about 110 lines), compared with the stock planner (L19–57, L168–187)

**Problem:** There is one design, it is not validated, and no repository exists yet (L141). Even so, the spec defines all of the following:
- a schema-versioned manifest
- checksums
- archive import with path-escape protection
- download from tagged releases
- an update-offer flow
- pinning a job to a package version
- rollback on failure
- a multi-set selector

That is infrastructure for a set ecosystem that doesn't exist yet. Several of these items are marked "Confirmed" (L96–98, L134–139). This finding challenges those requirements; overriding them is your decision.

**Recommendation:** Phase the work.
- **v1:** one prepared set plus a small JSON metadata file (units, axis, queen base diameter, per-piece dimensions, license), loaded from one location.
- **v2:** multi-set selection, in-plugin GitHub download, updates, checksums and version pinning.
- Keep the model data out of the plugin code (a data file, not hard-coded geometry), so v2 stays open. There is precedent for shipping the meshes inside the plugin: ncCAM bundles a 7.6 MB wasm file and serves it through its plugin file route (`src/index.js:31-36`). That is comparable to the 6.9 MB of meshes (L219).

### M2. The storage design relies on an unverified API
**Scope:** L116, L117, L121, L148

**Problem:** The spec says the storage location "depends on verified ncSender storage APIs". The only persistence ncCAM uses is browser IndexedDB, which belongs to one browser profile. That conflicts with two requirements: that plugin updates preserve installed packages, and that packages can be reused from other clients. The context shows no API for storing plugin data.

**Recommendation:** List storage as an explicit open question alongside B1. If the File Manager accepts arbitrary files, a subfolder there is the simplest shared store, following ncCAM's `ncCAM/…` convention (`app.js:857`). Otherwise, accept per-browser storage for v1 and say so in the spec.

### M3. ncCAM already solves several integration questions
**Scope:** L193, L205, L214; the spec has no section on plugin structure or build

**Problem:** The spec leaves these integration questions open, but ncCAM already answers them:
- **Plugin shell:** `manifest.json` with a `toolMenu` entry marked `clientOnly`; a `config.html` loader that loads a bundled `lib/*.js` via `getApiBaseUrl` (`config.html:244-265`); an esbuild build (`build.mjs`).
- **Saving without overwriting** (open question L205, criterion L214): `freePath()` checks the File Manager for an existing file and appends ` (n)` to the name (`app.js:854-863`).
- **Mesh handling and preview:** `meshBounds` and `meshVolume` (`src/core/mesh.js`), plus a three.js `Viewer`. three.js also includes STL loaders and exporters.
- **Development and release:** a fake-ncSender dev harness (`dev/serve.mjs`) and release scripts.

**Recommendation:** Add a short "Integration baseline" section stating that the plugin follows ncCAM's structure and reuses these patterns. That also closes L205.

### M4. The same contract is written three times, and the copies have drifted apart
**Scope:**
- package contract: L59–94, L96–132, L134–166
- planner: L41–50, L168–187
- acceptance criteria: L52–57, L88–94, L127–132, L161–166, L207–215

**Problem:**
- L70 proposes fixed filenames, but L102 says filenames don't need to match because the manifest maps them.
- "Calculation behavior" and "Proposed initial behavior" describe the same pipeline with different steps.
- With five acceptance lists, it is unclear what "done" means.

**Recommendation:** Merge them into one package contract, one planner pipeline and one numbered acceptance list. Tag each item Confirmed, Proposed or Deferred.

### M5. Some confirmed items contradict unresolved ones
**Scope:** L119 vs L141; L13 vs L193

**Problem:**
- L119 says in-plugin GitHub download is "now required", but L141 says no repository or prepared package exists yet.
- L13 lists "prepare for the turning program" as confirmed, but L193 says the handoff is unverified.

**Recommendation:** Mark these as confirmed intent with named dependencies that block them. This ties back to B1 and M1.

---

## 🟢 Nit

- **N1. Implementation detail in a feature spec** (L118, L151, L175). Path-traversal protection, notes on what checksums can and can't prove, and example filenames belong in a later implementation plan.
- **N2. Hedging about packing optimality** (L47, L50, L185). Packing 16 pieces of 6 types into a few blanks is a small problem. State a simple v1 method, such as largest-piece-first ("first-fit decreasing"), or trying every arrangement.
- **N3. Unclear source for the models** (L219, L141). The Staunton repo has two STL sets:
  - `Source/Staunton/<Piece>/<Piece>.STL`
  - `Source/Readymake_Duchamp_Chess_Set/*.stl`, which already uses the lowercase names proposed at L70

  Name the exact one. Leave out SolidWorks lock files (`~$*.SLDPRT`) and `Thumbs.db` when repackaging. The license is MIT, © 2014 clarkerubber.
- **N4. Deferred items are scattered through the spec** (L29, L187, L203, L204). Collect them in one "Out of scope for v1" list. Also state that weight pockets are a separate underside operation (L318), not part of the plugin.
- **N5. The appendix is half the document** (L223–349). The washer, epoxy and felt notes have nothing to do with the plugin, and some are out of date (L326 says "species still to be chosen"). Move them to a separate file and keep only the sizing table (L243–250).
