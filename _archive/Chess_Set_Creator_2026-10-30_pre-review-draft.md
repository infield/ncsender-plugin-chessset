# Chess Set Creator

## ncSender plugin specification — working draft

Owner: Marc Infield · Updated October 30, 2026

This is an evolving requirements document. The plugin has not been implemented. User requirements below are distinguished from proposed design details and unresolved integration questions.

## Confirmed requirements

- Build a plugin for **ncSender** named **Chess Set Creator**.
- Generate chess-piece model files and place them in the ncSender file system in a folder named **chess set**.
- Prepare the models for use in a subsequent turning/rotary machining program.
- Use **maple for the light side** and **walnut for the dark side**, with separate material batches.
- Let the user enter stock length.
- Based on available stock length, generate an STL containing multiple chess pieces arranged along the stock so material is used efficiently.
- Retain the earlier sizing, weighting, and open-source model references as design background.

## Confirmed stock-planning requirements — added October 30, 2026

The user enters available turning-stock dimensions, such as **12-inch or 18-inch lengths**, with **2-inch or 2½-inch width/diameter**. These examples are editable inputs, not fixed limits. The plugin calculates **how many stock lengths are needed for each side**, then lays out the corresponding multi-piece STL blanks.

### Inputs

- Stock length, with inch/mm units.
- Stock cross-section size and whether the blank is square or round. For square stock, width is not its diagonal; a complete round piece must fit the usable width after machining allowance.
- Desired chess-piece diameter. The exact control needs confirmation: confirmed reference is **queen base diameter**, scaling all six designs proportionally while displaying resulting heights and diameters. Do not assume every piece has the same diameter.
- Workholding reservations at both ends, spacing/separation allowance, and radial machining allowance.
- Maple/light side, walnut/dark side, or both. Proposed default uses matching dimensions for both sides, with optional independent stock settings later.

### Outputs

- Number of maple blanks needed for the 16 light pieces.
- Number of walnut blanks needed for the 16 dark pieces.
- Combined blank count and purchased stock length.
- Per-blank layout and piece list, used length, and unused length.
- Matching multi-piece STL files in the **chess set** folder.

Each side requires 1 king, 1 queen, 2 bishops, 2 knights, 2 rooks, and 8 pawns. Identical stock dimensions and piece geometry should produce identical blank counts for both sides; species alone does not change the geometry calculation.

### Calculation behavior

1. Apply the chosen piece-size setting and derive actual axial lengths and maximum diameters from the scaled models.
2. Verify stock cross-section can contain each piece with the configured radial allowance.
3. Subtract chuck and tailstock reservations from each blank length.
4. Pack the complete side's piece quantities into usable blank lengths, including spacing and support/separation allowances.
5. Minimize the number of blanks first; use the remaining layout choices to reduce avoidable waste and show the resulting arrangement. Do not claim a mathematically minimum count unless the packing method establishes it.
6. Report the number of blanks required for each material separately. If a required piece cannot fit any blank, report the incompatible dimensions rather than giving a misleading count.

Total piece length divided by usable blank length is only a lower bound: discrete pieces and required gaps can require additional blanks. Scaling diameter proportionally also changes height, so the planner must recompute stock counts after size changes.

### Acceptance examples (no numerical blank counts agreed yet)

- A user can compare 12-inch and 18-inch blanks without manually arranging every piece.
- A user can compare 2-inch and 2½-inch stock and see whether the selected piece diameter fits.
- Changing piece diameter recalculates layouts and blank counts.
- The stock plan accounts for exactly 16 pieces per side and identifies each piece in the exported blank layouts.

## Confirmed sizing reference and reusable design packages

**Sizing reference: queen base diameter.** The user confirmed base diameter and selected the queen as the reference piece. Label the main control “Queen base diameter.” Scale every piece uniformly by the ratio of requested queen base diameter to the package’s reference queen base diameter. Preserve the design’s relative proportions, including a king that may have a wider base. Recompute stock fit, piece heights, and blank counts after scaling.

**Support multiple reusable reference chess sets.** The user wants a separately installable or locally stored set definition whose pieces have already been checked, aligned, and named consistently. Keep the generator independent of any one bundled design. A set package is data and geometry; whether it also needs an ncSender extension mechanism remains an integration decision. Initial proposal: a folder or archive containing a manifest and six model files, without executable code.

### Proposed package contract

- Stable set identifier, display name, package/schema version, author, source, license, and required attribution.
- Explicit source units and a declared common coordinate convention.
- Six canonical piece identifiers: `king`, `queen`, `bishop`, `knight`, `rook`, `pawn`.
- Consistent model filenames, proposed as `king.stl`, `queen.stl`, `bishop.stl`, `knight.stl`, `rook.stl`, and `pawn.stl`.
- Models centered on the same longitudinal axis, with a defined base plane, orientation, and measured axial length and maximum radial extent.
- Reference queen base diameter, distinct from the model’s overall bounding-box width; record each piece’s base diameter and overall dimensions.
- Validation status tied to the exact model version or checksum, plus notes on tool access, undercuts, and required support geometry.

The exact axis convention is to be chosen to match the downstream CAM workflow. An STL does not embed units or a reliable piece name, so the manifest must supply that information.

### Package loading and validation

1. Discover installed set definitions and let the user select a design by name.
2. Validate manifest compatibility, required model files, positive dimensions, units, and the queen reference measurement.
3. Check mesh readability and agreed geometry checks, including closure/manifold status where required by the downstream CAM program.
4. Confirm declared alignment and dimensions against model geometry within defined tolerances.
5. Identify missing, altered, or invalid assets with an actionable message. Do not silently substitute a different piece.
6. Apply queen-based uniform scaling, then perform stock planning and export.

“Validated” must state what was checked. File/mesh validation alone does not establish that a particular cutter can machine the model without inaccessible regions. Machine-specific tool-access checks remain separate.

### Additional acceptance criteria

- Switching design packages changes all six source models without changing planner code.
- A package is reusable after initial preparation; users do not need to rename and realign each piece for each job.
- A requested queen base diameter is reproduced within the agreed export tolerance; all other pieces receive the identical scale factor.
- Stock validation considers the widest scaled piece, not only the queen.
- Missing files, ambiguous units, or incompatible package versions prevent export and identify the correction needed.

## Confirmed separation of plugin and model payload

The plugin installation must not need to contain the reference chess-model payload. Define a standard **Chess Set Creator model-package format** so independently prepared sets can be mapped into the generator. This is an application-specific interchange contract, not a claim of an existing industry standard.

### Proposed v1 format

Use a directory containing `chess-set.json` plus six STL assets, or an archive of the same directory structure. The manifest maps canonical piece roles to relative file paths; source filenames need not be manually renamed when the manifest provides an explicit mapping. Canonical names remain recommended for newly prepared packages.

Required manifest information:

- Schema version and set identifier/version/display name.
- Author, source URL, license, and attribution text or license-file reference.
- Explicit units and coordinate/alignment convention.
- Queen base diameter used as the reference measurement.
- One mapping for each of king, queen, bishop, knight, rook, and pawn, including its model path, dimensions, and asset checksum.
- Validation information and known machining limitations.

### Loading and storage

- Let the user register or import a prepared model-package folder/archive and select it by display name.
- Store model assets separately from plugin code. Exact storage location depends on verified ncSender storage APIs.
- Retain package identity/version with a saved job so it can be reproduced; detect missing or changed assets before regenerating exports.
- Validate relative paths and prevent archive extraction or model references from escaping the package directory.
- Work offline after the package is installed. In-plugin download of a prepared starter set from GitHub is now required; see the distribution requirements below.
- Keep generated jobs in the requested **chess set** output folder; manage reference packages separately from generated blank STLs.
- Plugin updates must preserve installed model packages and job references.

### Scope boundary

V1 proposes STL geometry plus a JSON manifest. Editable CAD sources may accompany a package, but automatic conversion from arbitrary CAD formats is not required. Bundling model files, generating toolpaths, and executing machine motion are separate concerns.

### Acceptance criteria

- The plugin can be installed without any reference mesh payload.
- A separately installed package provides all six pieces through manifest mappings.
- A second compliant package can be selected without a plugin code change.
- Missing files, changed checksums, or unsupported schemas produce actionable errors before export.

## Confirmed model selection and GitHub distribution

- Provide a **set selector inside the plugin** for choosing an installed chess design.
- Provide at least one **downloadable starter set**, distributed separately from the plugin.
- Host the properly prepared models and manifest in a **GitHub repository** using the agreed package format.
- Make downloading/installing that starter set available from within the plugin.

No new repository has been created and no existing upstream models have yet been repackaged or validated. Repository owner/name and the initial design remain implementation decisions; the earlier Staunton repository is a candidate source, not an already prepared compatible package.

### Proposed distribution workflow

1. Show installed designs in the set selector and offer a Download starter set action when needed.
2. Download a versioned package from a tagged GitHub release, rather than depending on a moving default branch.
3. Display package identity, version, source, and license; validate the package schema, asset checksums, and model requirements before installation.
4. Install model assets separately from plugin code and add the set to the selector.
5. Use installed assets offline for sizing, stock planning, and STL export.

Prefer a release archive containing the manifest, six prepared models, and license/attribution files. The models must meet the declared units, orientation, naming/mapping, and validation requirements. An asset checksum detects corruption or changes; it does not by itself prove publisher authenticity.

### Updates and failure handling (proposed)

- Offer version updates explicitly rather than silently changing a saved job's models.
- Record the selected package version with each job and preserve the version needed to reproduce it.
- On failed download or validation, preserve existing installed sets and provide a retryable error.
- If offline with no installed sets, explain that a download or local package import is required.
- Keep local folder/archive import available for custom sets.

### Acceptance criteria

- A user can download the starter set through the plugin, select it, and generate a stock plan without manually renaming or aligning models.
- The plugin installation remains independent of the mesh payload.
- The GitHub release package conforms to the same format accepted for local imports.
- An installed set remains usable without an internet connection.

## Proposed initial behavior

1. Select a material batch and enter stock length with explicit units.
2. Determine usable length after reserving workholding space at the chuck and tailstock ends.
3. Arrange piece models along the rotary axis, accounting for gaps, support material, and separation cuts.
4. Allocate the required piece quantities across as many blanks as necessary. A full side contains one king, one queen, two bishops, two knights, two rooks, and eight pawns.
5. Preview the arrangement, pieces included, used length, remaining length, and pieces still to make.
6. Export one combined STL per stock blank into the **chess set** folder, with names that identify material and blank number; for example, `maple_blank_01.stl` and `walnut_blank_01.stl`.

The export naming, preview, and packing strategy above are proposals to refine as requirements develop. A combined STL may contain separate piece shells and any explicitly designed support geometry; it need not merge all pieces into one solid.

## Stock and layout constraints to specify

Length alone is insufficient to establish a machinable layout. The design also needs stock diameter or cross-section, end allowances, minimum spacing, and a support/separation strategy. Expose these as settings or documented machine presets; defaults are not yet agreed.

Define usable length as total stock length minus both end allowances. A layout fits only when the sum of piece axial lengths plus spacing and required support/separation allowances does not exceed usable length. Account for each allowance once.

Optimize waste across the required set quantities, rather than simply repeating one piece until a blank is full. Do not shrink pieces automatically to make them fit. If a piece cannot fit the usable length or stock cross-section, identify the problem and request a larger blank or an explicit size change.

Keep maple and walnut counts separate and track completion per side. Extra promotion queens are optional future scope, not part of the initial 32-piece requirement.

## Output boundary and ncSender integration

The requested initial output is **STL geometry for downstream rotary CAM**. STL does not itself contain feeds, speeds, toolpaths, or executable turning instructions. Toolpath generation, post-processing, and sending motion to the machine are not yet specified.

The plugin must not start machine motion merely by generating or saving files. The ncSender plugin API, writable file location, accepted file types, and handoff to the turning program still require verification before implementation. No support for directly loading STL in ncSender is assumed here.

## Questions for subsequent specification

- Which turning/rotary CAM program receives the exported STL?
- Is the stock round or square? Length and width/diameter will be user inputs, with 12/18 inches and 2/2½ inches as examples.
- What are the chuck and tailstock allowances and minimum separation gaps?
- Automatic full-side stock planning is required; is manual piece selection also wanted?
- Should the two wood batches share a stock length or allow independent lengths?
- What support webs or bridges remain until pieces are separated?
- Queen base diameter with proportional whole-set scaling is confirmed; decide whether advanced individual overrides are needed.
- Should weight pockets be included in models or documented for a separate underside operation?
- How should existing exports be handled without unintended replacement?

## Initial acceptance criteria (proposed)

- Given a stock length and explicit layout allowances, every exported blank fits the calculated usable length.
- Generated piece quantities match the selected side or set without silently dropping or duplicating pieces.
- No piece is rescaled merely to fill stock.
- Material, units, piece list, and unused length are clear before export.
- Insufficient stock produces an actionable message.
- Export creates the **chess set** folder if absent and preserves unrelated files.
- Export produces geometry only; it does not execute machine motion.

## Reference model inventory

The repository file listing confirms six Staunton STL models totaling **6,900,804 bytes (about 6.9 MB)**. Individual sizes: bishop 594,984; king 948,284; knight 3,125,084; pawn 469,984; queen 1,188,484; rook 573,984 bytes. Source folders also list SolidWorks SLDPRT, DWG, and 3DXML files. Geometry, units, and machining suitability remain unvalidated.

---

# Appendix: Earlier chess-set build notes

The following preserves the initial discussion. The plugin requirements above supersede any earlier unresolved material choice: maple and walnut are now the assumed woods. Earlier CAD/CAM preparation and sizing suggestions remain reference material, not finalized plugin behavior.

# Wooden Staunton Chess Set — Build Notes

Prepared for Marc Infield · October 30, 2026

## Project direction

Make a recognizable Staunton-style wooden chess set using rotary CNC machining, with concealed steel weights and felt bases. Aim for a substantial, stable feel. Prototype one pawn and one king before committing to the whole set.

Staunton describes the familiar family of shapes: a horse-headed knight, castle-like rook, slotted bishop, crowned queen, and distinct king. It is a style rather than one mandatory CAD pattern.

## Size recommendations

Our practical starting point is a king approximately **3¾ inches (95.25 mm)** tall, with a **1½–1¾-inch (38.1–44.45 mm)** base, and **2¼-inch (57.15 mm)** board squares. An 8-by-8 playing field at that square size is **18 inches (457.2 mm)** across, excluding the border.

The table below is a proposed workshop starting point, not a claim of mandatory tournament dimensions. Heights for the smaller pieces follow familiar traditional proportions; base diameters are selected within 40–50% of height.

| Piece | Quantity for full set | Suggested height | Suggested base diameter |
| --- | ---: | ---: | ---: |
| King | 2 | 95.25 mm / 3.75 in | 43 mm / 1.69 in |
| Queen | 2 | 85 mm / 3.35 in | 40 mm / 1.57 in |
| Bishop | 4 | 70 mm / 2.76 in | 34 mm / 1.34 in |
| Knight | 4 | 60 mm / 2.36 in | 30 mm / 1.18 in |
| Rook | 4 | 55 mm / 2.17 in | 27 mm / 1.06 in |
| Pawn | 16 | 50 mm / 1.97 in | 25 mm / 0.98 in |

Allow additional stock length for workholding, support, and parting off. Check the complete silhouettes together before cutting: visual balance matters as well as numerical proportions.

### Tournament guidance versus personal preference

FIDE's equipment chapter effective March 1, 2026 specifies a descending height order of king, queen, bishop, knight, rook, pawn; recommends bases between 40% and 50% of piece height; and gives board squares of 50–60 mm. Our proposed dimensions use those proportions as a design reference. They are not a certification of tournament compliance; check the intended event's requirements if that becomes a goal.

The earlier FIDE chapter listed nominal heights of 95, 85, 70, 60, 55, and 50 mm respectively. Those traditional reference heights inform the table above. The earlier chapter has been superseded, so do not treat it as the current regulation.

“Tournament heavy” is not a universal target weight in grams. Consistency, stability, comfortable handling, and recognizable pieces are more useful goals for this project. Added weight can improve feel, but excessive weight adds no automatic tournament benefit and increases the impact if a piece falls.

## Weight material

**Recommended: ordinary steel fender washers secured with two-part epoxy.** They are easy to purchase, stack, and adjust during prototyping. Choose by actual outside diameter, inside diameter, thickness, and measured mass. A washer sold as “¼ inch” commonly refers to its hole size, not its outside diameter.

- Steel is the economical default; keep it enclosed and dry to limit corrosion.
- Brass is an alternative when a non-ferromagnetic material is specifically desired. It is somewhat denser than steel but generally costs more.
- A solid steel disk or short steel round-bar slug can provide more mass in the same cavity than a washer with a large center hole, but may require cutting or a more specific purchase.
- Lead is unnecessary for this project and was rejected because of toxicity concerns.

Magnetic steel has no inherent disadvantage on an ordinary wooden board. If using magnets for storage or a travel board, steel can be useful because it is attracted to them. Choose nonmagnetic material only if that attraction would interfere with a planned feature. Steel inserts are not themselves necessarily permanent magnets.

## Washer sizes and counts

In conversation we suggested 2–3 washers about 1 inch outside diameter for a pawn, and 3–5 washers about 1¼ inches outside diameter for larger pieces. **These were rough trial counts, not a verified weight specification.** Washer thickness and hole size change the mass considerably.

**Important fit correction:** a 1-inch washer cannot fit inside the proposed 25 mm pawn base with adequate wood surrounding it. Likewise a 1¼-inch washer is too large for the proposed rook and knight bases. Match washers to each finished base rather than applying those original sizes to every piece.

| Piece | Suggested trial washer outside diameter | Initial trial stack |
| --- | ---: | ---: |
| Pawn | About 16–18 mm | 2–3 |
| Rook | About 18–20 mm | 3–5, if base depth permits |
| Knight | About 20–22 mm | 3–5, if base depth permits |
| Bishop | About 24–25 mm | 3–5, if base depth permits |
| Queen and king | About 30–32 mm / roughly 1¼ in | 3–5, if base depth permits |

These are starting suggestions for the proposed base diameters, not shopping specifications or guaranteed final weights. Check availability and actual dimensions before machining pockets. Larger pieces do not all need the same stack; test and adjust each type. Thin washers may add only modest heft even in a stack.

Buy a small sample first. Weigh one washer on a gram scale, multiply by the count, and record the finished piece's total mass. Match corresponding black and white pieces; all pawns should feel alike. Larger pieces can reasonably weigh more than smaller ones.

## Pocket and assembly method

1. Finish the prototype's exterior sufficiently to judge its shape and base thickness.
2. Measure the actual washers. Make a flat-bottomed recess in the underside using a suitable drill or CNC pocket operation.
3. As a preliminary wood-design allowance, leave about 3 mm of sound wood radially around the pocket, and at least about 3 mm above it; increase this around delicate grain or thin profiles. These are workshop starting allowances, not structural guarantees.
4. Make the cavity slightly wider than the measured washer to permit an epoxy bond line. Cut a test pocket in scrap to establish fit.
5. Set cavity depth from the measured stack height plus the adhesive allowance. Keep the stack recessed beneath the finished bottom so no metal touches the board. Reduce the stack if it would weaken the base.
6. Temporarily secure the weights and test the pawn and king on the intended board. Compare pickup feel, stability, and sliding.
7. Degrease and lightly abrade the washers as appropriate for the epoxy manufacturer's instructions. Bond the washers together and into the pocket so they cannot rattle.
8. Cure fully, then attach felt to the underside. Check that every piece sits flat.

Keep added mass low in the base. Avoid unnecessary deep cavities up into narrow stems. If more weight is needed than the available base depth permits, reconsider the base shape or use a solid disk rather than weakening the piece.

## Open-source Staunton reference

- **Project:** [clarkerubber / Staunton-Pieces](https://github.com/clarkerubber/Staunton-Pieces)
- **Description:** Open-source 3D Staunton chess pieces; repository includes Source and Renders folders.
- **License:** [MIT license](https://github.com/clarkerubber/Staunton-Pieces/blob/master/LICENSE). Retain the applicable copyright and permission notices when distributing covered source or derivatives.
- **Status:** The repository and its stated license were checked. Individual model formats, physical scale, mesh quality, and suitability for machining have **not** yet been validated. Do not assume the files are ready-to-machine STL or STEP models.

This is a design starting point, not a prepared CNC toolpath package.

## Rotary CNC preparation

1. Download and inspect the source files and previews.
2. Confirm units, available export formats, mesh quality, and how the models can enter your CAD/CAM workflow.
3. Set the king height and then evaluate the entire set's proportions. Check each base against the intended board and washers.
4. Plan the weight pockets as a separate underside operation unless workholding permits safe integrated machining.
5. Most piece bodies are largely rotational shapes; special features such as the bishop slot, rook crenellations, king's top, and knight head require additional tool-access planning.
6. Inspect the knight especially for undercuts beneath the jaw, around the ears, and through the mane. Continuous rotary machining alone may not reach every surface. Indexed setups, modified geometry, smaller tools, or hand finishing may be needed.
7. Simulate roughing and finishing with the actual cutter geometry and workholding. Check clearance to chuck, tailstock, and stock before cutting.
8. Cut one pawn and one king, refine the process, then tackle the knight before committing to production.

## Initial materials and decisions

- Contrasting light and dark wood; species still to be chosen.
- Sample steel fender washers in sizes appropriate to the actual bases.
- Two-part epoxy suitable for bonding metal to wood.
- Felt and compatible adhesive.
- Calipers and gram scale for recording dimensions and mass.
- Final CAD/CAM route, cutter selection, stock size, and workholding remain to be chosen after model inspection.

## Next-session checklist

- [ ] Open the repository and inspect the six piece designs.
- [ ] Confirm model format and import path into CAD/CAM.
- [ ] Decide whether to use the proposed dimensions or enlarge the smaller bases for a broader commercial-set appearance.
- [ ] Obtain sample washers and measure diameter, thickness, and mass.
- [ ] Design and cut prototype pawn and king; test weights before bonding.
- [ ] Prove a machining strategy for the knight.
- [ ] Record the approved dimensions, pocket sizes, and total weights for repeatable production.

## Sources

- [FIDE equipment rules effective March 1, 2026](https://handbook.fide.com/chapter/ChessEquipmentWithoutElectronicComponenets032026): current reference for board-square dimensions, height ordering, and base-to-height proportions.
- [Earlier FIDE equipment standards, effective through February 28, 2026](https://handbook.fide.com/chapter/StandardsOfChessEquipment2022): historical reference for the traditional nominal piece heights used above.
- [Staunton-Pieces repository](https://github.com/clarkerubber/Staunton-Pieces): open-source design reference and license.

Build dimensions, washer counts, pocket allowances, and machining sequence above are recommendations for this project rather than statements from the sources.
