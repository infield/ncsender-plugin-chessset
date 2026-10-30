# Chess Set Creator — ncSender plugin feature spec

Owner: Marc Infield · Revision 7 · October 30, 2026 · Status: draft, not implemented

Revision 2 restructured the spec by topic. It answered the Stage 5–7 reviews and added facts checked against the ncSender source and the Staunton model files. Revision 3 applies the fixes from the Stage 7 re-audit (`docs/designs/egm/reviews/rev2/critic_report.md`, resolved in `docs/designs/egm/reviews/rev2/goldfish_review_report.md`). Revision 4 records the owner's answers of October 30: Rotary CAM places the part on the axis and makes the holding tab; the longest blank between chuck and tailstock is 36 in; the jaw-set grip ranges; and neck size and gap are settled on a 12 in test blank. Revision 5 adds the approved Detailed Implementation Plan at the end, with matching edits to §5.1, §5.8 and §6. Revision 6 revises that plan after the Stage 9 review (`docs/designs/egm/reviews/rev5/implementation_readiness_report.md`). Revision 7 adds the Rotary CAM handoff sidecar (§5.11) from owner input; for now stock size and placement stay in Rotary CAM. Earlier revisions are in `docs/designs/egm/history/`, and every review round is indexed in `docs/designs/egm/reviews/INDEX.md`. The woodworking build notes live in `docs/research/domain/wooden-staunton-build-notes.md`.

**File paths** in this document are relative to the project root (`Chess-Set-Creator/`), not to this file.

**Status tags.** Tags go on items, not headings. Every requirement has exactly one of these:
- **[C]** Confirmed by the owner.
- **[P]** Proposed default for v1. It can change without reopening the spec.
- **[O-n]** Open. n is the row in [Open questions](#13-open-questions).
- **[v2]** Confirmed intent, scheduled after v1.

---

## 1. Problem statement

To turn a full chess set on the rotary axis, the user lays 32 pieces out across 5–10 turning blanks by hand in CAD. For every blank the user must:
- scale six models consistently
- check that each piece fits the stock width
- fit pieces end to end within the usable length between chuck and tailstock
- add connecting necks
- export one model to hand to CAM

Any change to piece size or stock length means redoing all of it. Chess Set Creator does this inside ncSender. The user picks a model package, a queen base diameter, and a stock length and width. The plugin reports how many maple and walnut blanks are needed, then writes one STL per blank, in the frame Rotary CAM expects, into a File Manager folder. **Rotary CAM** (an ncSender plugin, unreleased) picks that folder up to generate toolpaths.

## 2. Goals and non-goals

### Goals (v1)
1. Scale a prepared six-piece model package uniformly from one control: queen base diameter. [C]
2. Check the stock cross-section and length against the scaled pieces. [C]
3. Compute the fewest blanks per side for 16 pieces (1 K, 1 Q, 2 B, 2 N, 2 R, 8 P). [C]
4. Report blank counts for maple (light) and walnut (dark) separately, plus total stock to buy. [C]
5. Write one STL per blank, plus a layout file, into a **chess set** folder in the ncSender File Manager, for Rotary CAM. [C]
6. Load model geometry from a separate model package, not from plugin code. [C]

### Non-goals (v1)
- Generating toolpaths or G-code. Rotary CAM does that. [C]
- Starting machine motion. The plugin never calls `/api/gcode-job`, `/api/send-command` or `/api/gcode-files/load*`. [C]
- Shrinking pieces automatically to fit stock. [C]
- Weight pockets and felt recesses. These are a separate underside operation; see the build notes. [C]
- Extra promotion queens. [C]
- Converting from CAD formats (SLDPRT, STEP, DWG). Packages ship STL. [P]

**Deferred or open:**
- Manual piece-by-piece blank selection. [O-6]
- Tracking which pieces have been cut. [v2]

## 3. Glossary

| Term | Meaning |
|---|---|
| **Side** | One colour's 16 pieces. The light side is maple; the dark side is walnut. "Batch" and "material" are not used. |
| **Blank** | One length of turning stock, held between chuck and tailstock. |
| **Stock length (L)** | The blank's full length before machining. |
| **Chuck reservation / tailstock reservation** | Length at each end of the blank that is not available for pieces: the gripped length plus Rotary CAM's holding tab (tenon) and parting neck. |
| **Holding tab** | The tenon Rotary CAM leaves between the part and the gripped stock at each end, parted off after machining. Rotary CAM creates and manages it; the plugin only reserves length for it. |
| **Jaw set** | The chuck jaws fitted to the Vortex. Standard jaws grip 0–0.9 in (0–22.9 mm); alternate jaws grip 1–2.5 in (25.4–63.5 mm). |
| **Usable length** | `L − chuck reservation − tailstock reservation`. |
| **Used length / leftover length** | For one blank: the length taken by its pieces and gaps, and `usable length − used length`. |
| **Gap** | The axial space between two adjacent pieces in a blank. It is filled by a connecting neck. |
| **Connecting neck** | A cylinder joining adjacent pieces, so the blank stays one connected body during machining. |
| **Radial allowance** | Material left between the piece's swept diameter and the stock's flat or round surface, on each side. |
| **Axial length** | A piece's length along the rotary axis, from base to top. |
| **Swept diameter** | Twice the largest distance from the rotary axis to any point on the piece. This decides stock fit; it matters for the knight, which is not round. |
| **Base diameter** | Twice the largest distance from the axis to any vertex within 1.0 mm of the base plane, after conversion to mm. |
| **Top diameter** | The same measurement taken within 1.0 mm of the piece's top. |
| **Model package** | A folder with `chess-set.json` and six STL files for one design. Other names used in revision 1 (set definition, design package, starter set) all mean this. |
| **Job** | One export: the folder `chess set/<job>/` with its blank STLs, `layout.json` and licence file. |
| **Rotary CAM** | The unreleased ncSender plugin that turns an STL or STEP part into rotary G-code (corners, roughing, finishing, indexed, parting). It is the only downstream consumer. |
| **File Manager** | ncSender's server-side file store (`/root/.config/ncSender/gcode-files` on the shop machine), reached through `/api/gcode-files/*`. |

## 4. Users and flow

One user: Marc, on ncSender 2.x Pro (v2.0.271 at time of writing), working at the shop machine. The machine is a Sienci AltMill with a SuperLongBoard-EXT (grblHAL) and a Vortex rotary on A.

1. Open **Chess Set Creator** from the tool menu.
2. Pick an installed model package. With none installed, import one from a local folder.
3. Enter the queen base diameter, stock length, stock width and shape, and the allowances.
4. Read the plan: the scaled piece sizes, fit checks, blanks per side, and each blank's layout with leftover length.
5. Click **Export to File Manager**. The plugin writes `chess set/<job>/` with all the blank STLs and `layout.json`.
6. In Rotary CAM, open each blank STL from that folder, set the stock and reservations shown on the plan's per-blank card (and listed in `layout.json`), and generate toolpaths. Rotary CAM places the part on the axis and makes the holding tabs. Each blank's `.rotary.json` sidecar (§5.11) carries orientation and stock size for Rotary CAM to apply once it supports it (O-13); until then the user enters them by hand. Run Rotary CAM's simulation and check clearance to the chuck and tailstock before the first cut.

## 5. Requirements

### 5.1 Inputs

Internal unit is mm. The display toggle chooses the primary unit (default: inches); the other unit appears in parentheses. Stored and exported values are always mm. [P]

All defaults and valid ranges below are [P].

| Input | Status | Default | Valid range | Notes |
|---|---|---|---|---|
| Model package | [C] | last used | an installed package | |
| Queen base diameter | [C] | 38.1 mm (1.5 in) | 15–100 mm | Main sizing control. The default gives a 99 mm (3.9 in) king with the Staunton package. |
| Stock length | [C] | 457.2 mm (18 in) | 50 mm – max blank length | Examples 12 in and 18 in. The first job is a 12 in test blank (O-4). |
| Max blank length | [C] | 914.4 mm (36 in) | — | Longest blank that fits between chuck and tailstock on the shop machine. Machine setting, not a per-job input; edited in the dialog's collapsed Machine row (valid 100–2000 mm). |
| Stock shape | [C] | Square | square / round | |
| Stock width | [C] | 50.8 mm (2 in) | within a jaw-set range: 0–22.9 mm or 25.4–63.5 mm | Side of a square, or diameter of a round. Examples 2 in and 2½ in. The plan names the jaw set to fit (§5.3). |
| Chuck reservation | [C] | 25.4 mm (1 in) | 0–200 mm | Includes jaw grip, tenon and end neck. |
| Tailstock reservation | [C] | 19.05 mm (0.75 in) | 0–200 mm | |
| Gap | [C] | 10.0 mm (0.39 in) | 6.35–50 mm | Must let Rotary CAM's finishing cutter reach the next piece's base face and the previous piece's top: at least the cutter diameter plus clearance. Assumes a 6.35 mm (¼ in) cutter [O-4]. The parting cut only happens at the two outer ends (§5.5). |
| Connecting-neck diameter | [C] | 7.6 mm (0.3 in) | 3 mm – stock width | Neck **diameter**. Matches Rotary CAM's default parting neck, which is 0.3 in in diameter. |
| Radial allowance | [C] | 1.5 mm (0.06 in) | 0–10 mm | Per side. |
| Sides | [C] | Both | maple / walnut / both | "Maple only" plans and exports maple only. Side names are fixed labels in v1. |

Both sides share one set of stock and allowance settings in v1. [P] Separate settings per side are [v2].

An input outside its range blocks planning and shows the range next to the field. [P]

### 5.2 Sizing

- `scale = requested queen base diameter ÷ measured queen base diameter`. The queen base is measured at import and stored with the installed package; declared manifest values are used only for validation. Every piece gets the same scale, so the design's proportions hold. [C]
- The plan shows each scaled piece's axial length, base diameter and swept diameter. [C]
- Export tolerance: the exported queen's measured base diameter is within ±0.05 mm of the request. [P]
- Individual piece overrides are not in v1. [O-11]

### 5.3 Stock fit

Fit is checked for every piece type, not only the queen. [C]

- **Cross-section:** `swept diameter + 2 × radial allowance ≤ stock width`. This applies to both square and round stock: for square stock the limit is the inscribed circle, which Rotary CAM's "Corners" pass turns the square down to. [C]
- **Length:** each piece's axial length ≤ usable length. [C]
- **Jaw set:** the stock width must fall inside a jaw-set range: standard jaws 0–22.9 mm (0–0.9 in), alternate jaws 25.4–63.5 mm (1–2.5 in). [C] The plan and the per-blank card name the jaw set to fit. Widths between 22.9 and 25.4 mm, or above 63.5 mm, block planning. For square stock the jaws are assumed to grip across the flats, so the side width is compared with the range [O-12].
- **Neck:** if the connecting-neck diameter exceeds the smallest scaled base diameter, planning is blocked. [P]
- If any check fails, planning stops. The message names the piece, its size, the limit, and the smallest stock width or length that would work. The plugin does not shrink pieces. [C]

### 5.4 Stock planning

**Fit rule for one blank.** [C] A blank holding n pieces fits when

`Σ axial length + (n − 1) × gap ≤ usable length`

End reservations are counted once, in usable length. Gaps appear only between pieces.

**Method.** [P] Exact search, not a heuristic. A side has at most 2 × 2 × 3 × 3 × 3 × 9 = 972 piece-count combinations, so a memoised search over the remaining counts completes in under 100 ms.
1. Minimise the number of blanks.
2. Tie-break: maximise the used length of blank 1, then blank 2, and so on. With the blank count fixed, total waste is fixed too. This rule puts the waste into the last blank as one useful offcut instead of spreading it out.
3. Final tie-break: if plans still tie, compare blank 1's piece list, written in K, Q, B, N, R, P order, piece by piece, and take the earlier one; then blank 2, and so on. This settles ties between equal-length pieces such as the Staunton bishop and knight.
4. Within a blank, place pieces from the chuck end in descending axial length. Equal lengths go in the order K, Q, B, N, R, P.
5. The result is the same every time for the same inputs.

**Per side.** [C] Both sides use the same geometry, so they get the same plan. The plan is shown once and labelled "per side × 2" when both sides are selected.

**Outputs shown:** [C]
- blanks per side
- total blanks
- stock to buy (blanks × stock length)
- for each blank: its pieces in order, used length, and leftover length

Lengths are shown to 0.1 mm, rounded half up. [P]

### 5.5 Export geometry

Rotary CAM lets the user choose the turning axis (X/Y/Z) and "On axis: Model origin", which sets where the model sits radially. The export fixes one convention, which `layout.json` records:

- **Gate:** `exporter.js` (§5.5, §5.8) is not built until O-1 and O-2 are answered. Planning, import and preview (§5.1–§5.4, §5.6) do not depend on them. [C]
- **Format:** ASCII STL in mm, one file per blank. ASCII is required because the File Manager stores text (§12). Vertex coordinates are written with at least 4 decimal places in mm. [P]
- **Frame:** X is the rotary axis, and the axis passes through Y = Z = 0. X = 0 is the chuck end of the first piece, and +X points toward the tailstock. In Rotary CAM: Turning axis **X**, On axis **Model origin**. [P] Rotary CAM places the part on the axis and makes the holding tab at each end, so the plugin does not model tabs or the chuck datum. [C, owner's understanding; confirm with the Rotary CAM author]
- **Orientation:** every piece has its base toward the chuck (−X). Each knight's face points +Z. [P]
- **Who makes the supports between pieces [O-2]:** two outcomes, decided by the two-pawn test in `test_files/`:
  - **A. Rotary CAM leaves a support between separate bodies** (as it already necks the two ends). The plugin exports the pieces as separate bodies with empty gaps, and the neck diameter is set in Rotary CAM. The connecting-neck input and the covered-tip rule below are dropped. Preferred if available: simpler export, and Rotary CAM sizes the support with the cutter it actually uses.
  - **B. Rotary CAM cuts through empty gaps.** The plugin adds connecting necks as below.
- **Connecting necks (outcome B):** each gap holds a cylinder of the connecting-neck diameter that overlaps each neighbour by 0.5 mm. This keeps the blank one connected body, so roughing cannot cut through a gap and part the blank early. [P]
  - A piece is affected when `scaled top Ø < neck Ø`. That tip is covered by the neck and finished by hand after parting. With the Staunton package at the default 38.1 mm queen base, this affects the queen (5.3 mm top) and bishop (5.0 mm top).
  - The plan lists the affected pieces.
- **No neck or tab at the outer ends.** Rotary CAM's holding tabs and "Parting — neck the ends" pass make those. [P]
- **Not in the STL:** the stock and the end reservations. They go in each blank's sidecar (§5.11) and in `layout.json`, and are shown on a per-blank card in the plan in mm and inches, so the user can enter them in Rotary CAM. [P]
- **Shells:** pieces (and, in outcome B, necks) are separate closed shells. Necks overlap their neighbours; there is no boolean union. [P]

### 5.6 Model packages

**v1** [C]: one prepared package, imported from a local folder, with a small manifest. Multiple packages, a package selector, GitHub download, update offers and version pinning are [v2] (§5.9).

**Package rules** [P]:
- The package contains `chess-set.json`, the six STL files (binary or ASCII), and `LICENSE`.
- Models are already in the export frame of §5.5: X axis, base plane at X = 0 facing −X, axis through the origin, knight face toward +Z. The plugin checks this and does not realign models. Alignment is a one-time preparation job done outside the plugin.
- The manifest maps piece roles to file paths. Paths are relative, may not contain `..` or start with `/`, and are case-sensitive.

**Manifest, annotated example (schema 1).** All fields are required unless marked optional.

```jsonc
{
  "schema": 1,                       // integer; v1 accepts exactly 1
  "id": "staunton-clarkerubber",     // [a-z0-9-]+
  "version": "1.0.0",                // package version, semver: ^\d+\.\d+\.\d+$
  "name": "Staunton (clarkerubber)", // display name
  "author": "clarkerubber; prepared by Marc Infield",
  "source": "https://github.com/clarkerubber/Staunton-Pieces/tree/cef2c79/Source/Staunton",
  "license": "MIT",
  "licenseFile": "LICENSE",
  "attribution": "Copyright (c) 2014 clarkerubber",
  "units": "mm",                     // "mm" | "in"
  "frame": "x-axis-base-at-origin-v1", // the only v1 value; means the §5.5 frame
  "pieces": {                        // exactly these six keys
    "king":   { "file": "king.stl",   "axialLength": 78.00, "baseDiameter": 30.00, "sweptDiameter": 30.00, "topDiameter": 10.59 },
    "queen":  { "file": "queen.stl",  "axialLength": 68.00, "baseDiameter": 30.00, "sweptDiameter": 30.00, "topDiameter": 4.15 },
    "bishop": { "file": "bishop.stl", "axialLength": 59.00, "baseDiameter": 30.03, "sweptDiameter": 30.03, "topDiameter": 3.97 },
    "knight": { "file": "knight.stl", "axialLength": 59.00, "baseDiameter": 30.00, "sweptDiameter": 30.00, "topDiameter": 8.15 },
    "rook":   { "file": "rook.stl",   "axialLength": 49.00, "baseDiameter": 30.03, "sweptDiameter": 30.03, "topDiameter": 16.03 },
    "pawn":   { "file": "pawn.stl",   "axialLength": 43.00, "baseDiameter": 24.00, "sweptDiameter": 24.00, "topDiameter": 6.38 }
  },
  "sha256": { "king.stl": "…" },     // optional in v1; required in v2
  "notes": "Knight: Rotary CAM indexed pass reaches part of the jaw/mane only; hand finishing expected." // optional
}
```

The dimensions above are measured from the upstream Staunton STLs (Appendix B). The reference piece is always the queen, so there is no field for it.

**Validation on import** [P]. Every check below blocks import. Each failure message names the file and field, and says what to fix.

1. `chess-set.json` parses, `schema` is 1, `version` matches the semver pattern, and every required field is present with the right type.
2. All six files exist inside the package folder, and each parses as an STL with at least one triangle.
3. Each mesh is closed after welding vertices within 0.001 mm: every edge is shared by exactly two triangles, and volume is above 0.
4. Measured axial length, base diameter and swept diameter each match the manifest within ±0.1 mm.
5. The piece axis lies within 0.1 mm of the X axis, and the base plane is at X = 0 ± 0.1 mm.
6. Units are `mm` or `in`; inch packages are converted to mm on import.

These checks confirm the files are closed meshes in the agreed frame. They do not prove a given cutter can machine every surface. Rotary CAM reports that separately.

### 5.7 Storage

All of these routes were checked in ncSender source at commit `2f8a659` (October 30, 2026). Route behaviour: see §12.

| Data | Where | API | Status |
|---|---|---|---|
| Installed package | File Manager: `.chess-set-creator/sets/<id>@<version>/` (manifest, LICENSE, and the six meshes stored as base64-encoded binary STL, `<role>.stl.b64`, about 9 MB in total). The leading dot hides the folder from the File Manager tree (§12), so a stored mesh cannot be clicked and loaded as a program. Confirm that the tree also hides dot-folders; if not, use `Chess Set Creator/sets/`. | `POST /api/gcode-files/file/save {path, content}`; read back with `GET /api/gcode-files/file?path=` | [P] |
| Settings, installed-package list (with each package's measured queen base), last job | Plugin settings JSON | `GET`/`PUT /api/plugins/com.infield.chessset/settings`. PUT replaces the whole object, so read the current settings, spread them over `DEFAULTS`, change the field, then PUT. | [P] |
| Exports | File Manager: `chess set/<job>/` | `POST /api/gcode-files/file/save` | [C] |

The File Manager stores text only. Exported blanks are therefore ASCII STL (Rotary CAM reads them). Stored package meshes are base64 binary, because only this plugin reads them. [P]

v1 keeps the last job's inputs in settings so the dialog reopens with them. [P] Completion tracking is [v2].

### 5.8 Export

- Path: `chess set/<job name>/`. [C]
- The default job name is `<package id> Q<base> <length>x<width>`, for example `staunton-clarkerubber Q38.1 457x51`. The base is rounded half up to 0.1 mm with a trailing `.0` dropped (`Q40`); length and width are whole mm. Job names may contain letters, digits, space and `. _ - ( ) x`. `/`, `\`, `..` and a leading `.` are rejected. [P]
- Every export writes `LICENSE-models.txt` first. A folder is taken when `GET /api/gcode-files/file?path=chess set/<folder>/LICENSE-models.txt` does not return 404 (ncCAM's free-path probe). If the job folder is taken, the plugin appends ` (2)`, ` (3)`, … to the folder name. `file/save` overwrites existing files (§12), so this check is what protects earlier work. [P]
- Folder contents: [P]
  - `maple_blank_01.stl` … and `walnut_blank_01.stl` … (two-digit numbers)
  - one `<blank>.rotary.json` sidecar per blank STL (§5.11)
  - `layout.json`
  - `LICENSE-models.txt`, which copies the package licence and attribution
- `layout.json` contains: [P]
  - plugin version
  - package id, version and name
  - scale and queen base diameter
  - units (`mm`) and frame
  - stock length, width and shape, and the jaw set
  - both reservations, gap, neck diameter and radial allowance
  - for each blank: side, file name, pieces in order with their X ranges, used length and leftover length
- `layout.json` is written **last**. A folder without it is an incomplete export. A retry writes to a new free folder and leaves the incomplete one for the user to delete. [P]
- **Fallback:** if a save fails, the plugin offers **Download ZIP** of the same files and leaves any files already written in place. [P]
- Export is allowed only when the plan has no errors. [P]

### 5.9 Distribution

Confirmed intent, scheduled after v1:
- a package selector for several installed packages [v2]
- in-plugin download of a model package from a tagged GitHub release, using the same format as local import [v2]
- SHA-256 checksums verified against the release [v2]
- an update offer that never changes an existing job [v2]
- job records that pin the package version [v2]

Before v2 is specified, confirm whether the dialog can fetch GitHub release assets directly; browser cross-origin rules may require a server-side fetch.

### 5.10 Errors

| Condition | Blocks | Message must say | Status |
|---|---|---|---|
| No package installed | planning | "Import a model package folder" (v2: or download one) | [P] |
| Manifest or schema invalid | import | file, field, and the expected value | [P] |
| Missing or unreadable STL | import | role and path | [P] |
| Mesh not closed, or measurements disagree with the manifest | import | file, the check, measured vs declared | [P] |
| Piece too wide for the stock | planning | piece, swept diameter + 2 × allowance, stock width, the minimum width needed | [P] |
| Piece too long for the usable length | planning | piece, axial length, usable length, the minimum stock length needed | [P] |
| Usable length ≤ 0 (reservations ≥ stock length) | planning | both reservations and the stock length | [P] |
| Neck diameter > smallest scaled base diameter | planning | neck diameter, the piece and its base diameter | [P] |
| Stock length > max blank length | planning | both values (max 914.4 mm / 36 in) | [P] |
| Stock width outside both jaw-set ranges | planning | stock width, both jaw-set ranges, the nearest width that fits | [P] |
| File Manager save failed | export | path and server reply; offer Download ZIP | [P] |

### 5.11 Rotary CAM handoff sidecar

**Current behaviour** [C]: Rotary CAM owns stock size and placement. The user sets them in Rotary CAM, copying the values from the plan's per-blank card.

**Proposed handoff** [P]: next to each blank STL, the plugin writes a small **sidecar** file that tells Rotary CAM how to orient the part and what stock to set up. Reading the sidecar is a proposed Rotary CAM feature [O-13]. Until Rotary CAM supports it, the file is harmless and the user keeps entering values by hand.

The format is not chess-specific, so any plugin that writes a rotary part can use it.

**File name.** `<STL file name without .stl>.rotary.json`, in the same folder as its STL. Example: `maple_blank_01.stl` → `maple_blank_01.rotary.json`.

**Format (version 1).** All lengths are in `units`. Every field is required unless marked optional.

```jsonc
{
  "format": "rotary-setup",          // fixed string
  "formatVersion": 1,                // integer; readers accept 1
  "model": "maple_blank_01.stl",     // the STL this file describes, same folder
  "units": "mm",                     // "mm" | "in"

  "orientation": {
    "turningAxis": "X",              // model axis that becomes the rotary axis: "X" | "Y" | "Z"
    "chuckEnd": "min",               // end of that axis facing the chuck: "min" | "max"
    "onAxis": "model-origin",        // the rotary axis passes through the model origin
                                     //   ("model-origin" | "bounding-box-center")
    "upAtZero": "+Z"                 // model direction that faces the spindle at A = 0;
                                     //   must be perpendicular to turningAxis
  },

  "stock": {
    "shape": "square",               // "square" | "round"
    "width": 50.8,                   // side of a square, or diameter of a round
    "length": 304.8                  // full blank length, chuck end to tailstock end
  },

  "placement": {
    "chuckOffset": 25.4,             // stock chuck end → model's chuck-end face, along the axis
    "modelLength": 260.03            // model extent along turningAxis (lets the reader check fit)
  },

  "workholding": {                   // optional; informational
    "jawSet": "alternate",           // free text shown to the user
    "tailstock": true
  },

  "source": {                        // optional; informational
    "plugin": "com.infield.chessset",
    "version": "0.1.0",
    "job": "staunton-clarkerubber Q38.1 305x51"
  }
}
```

**Derived values, not stored.**
- Tailstock offset: `stock.length − placement.chuckOffset − placement.modelLength`. For the example above, that is 19.37 mm: the 19.05 mm reservation plus the blank's 0.32 mm leftover.
- Rotary CAM's holding tabs and end parting necks must fit within the two offsets. Rotary CAM checks that.

**Requested reader behaviour (Rotary CAM)** [P, for the Rotary CAM author]:
1. When opening an STL, look for `<name>.rotary.json` in the same folder.
2. If the file is present, has `format` = `rotary-setup` and `formatVersion` = 1, apply it:
   - turning axis
   - flip ends, from `chuckEnd`
   - on-axis mode
   - the angular "Turn" setting, from `upAtZero`
   - stock shape, width and length
   - the model's axial position from `placement.chuckOffset`

   Show a one-line notice, e.g. *"Setup from maple_blank_01.rotary.json"*.
3. Treat every value as a starting point. The user can change any of them, and the sidecar never touches tools, feeds or operations.
4. Ignore unknown fields. Ignore the whole file if `format` is wrong, or `formatVersion` is newer than the reader supports, and say so.
5. Warn without blocking if:
   - `chuckOffset + modelLength > stock.length`, or
   - the model's swept diameter is larger than `stock.width`, or
   - `model` names a different file.

**Writer rules (this plugin)** [P]:
- Write one sidecar per blank STL.
- Fixed values: `units` `"mm"`, `turningAxis` `"X"`, `chuckEnd` `"min"`, `onAxis` `"model-origin"`, `upAtZero` `"+Z"`. These match the §5.5 frame and the knight-faces-+Z rule.
- Inputs: `stock` comes from the §5.1 inputs; `chuckOffset` is the chuck reservation; `modelLength` is the blank's used length.
- `workholding.jawSet` comes from the §5.3 jaw-set check.
- Numbers are rounded half up to 0.001 mm.
- Write each sidecar right after its STL (P4.8). A sidecar never exists without its STL.
- `layout.json` remains the job-level record. The sidecar is the per-blank contract with Rotary CAM.

## 6. Proposed architecture

This follows the conventions in `../AAxis/CLAUDE.md`: ncSender 2.x plugin model, all UI and logic in `config.html`, one tool-menu entry, and ncSender CSS variables. Everything in this section is [P].

```text
com.infield.chessset/          (plugin ZIP)
├── manifest.json     id com.infield.chessset · version 0.1.0 · minAppVersion 2.0.88
│                     platforms {"v2":"2.0.88","pro-v2":"2.0.149"} · category "utility" · configUi config.html
│                     permissions ["gcode.modify"] · events []
│                     toolMenu [{label:"Chess Set Creator", clientOnly:true}]
├── config.html       dialog shell; loads lib/app.js via /api/plugins/com.infield.chessset/icon?file=lib/app.js
├── lib/app.js        bundled (esbuild) from src/; also started as the Web Worker from a Blob of its own source (ncCAM pattern)
├── icon.svg · README.md · CHANGELOG.md · LICENSE
src/                           (repo only; not in plugin ZIP)
├── config.js         constants: SUPPORT_MODE, PACKAGE_ROOT, jaw ranges, tolerances
├── units.js          mm/in parsing, display and half-up rounding
├── stl.js            parse binary/ASCII STL; write ASCII and binary STL; transform (scale, translate); base64
├── measure.js        weld, closed-mesh check, axial length, base/swept/top diameter, profile
├── manifest.js       chess-set.json validation (pure)
├── package.js        import from <input webkitdirectory>, measure, store in the File Manager
├── planner.js        fit checks + exact packing (pure; no DOM, no network)
├── blank.js          build each blank mesh (pieces + necks) (pure)
├── layout.js         layout.json builder (pure)
├── exporter.js       job name, free folder, ordered saves, ZIP fallback
├── fm.js             File Manager + settings REST client (2.x routes)
├── settings.js       DEFAULTS, load, merge-and-PUT save
├── worker.js         Worker message handlers (also run in the page if Workers are blocked)
├── index.js          entry: page → mount UI; Worker → handlers
└── ui/               app, dom helper, form, plan view, SVG preview, styles
tests/ · tools/ · packages/ · build.mjs · build.sh · package.json   (repo only; see Detailed Implementation Plan)
```

- **Runs in:** the browser dialog only. There is no server-side module, so `events` is empty. A server-module crash while loading would quarantine the plugin@version (`../AAxis/CLAUDE.md`, item 45); that cannot happen here.
- **Data flow:** package (File Manager) → validate → scale → fit checks → plan → preview → export (File Manager).
- **Planning uses the dimensions measured at import** (§5.2), stored in settings. Meshes are loaded only for export.
- **STL parsing and writing run in a Web Worker**, one blank at a time. Each blank's text is released after its save completes.
- **Download ZIP** uses a named library (fflate) and builds one side at a time.
- **Displayed text** from manifests and job names is set with `textContent`, never `innerHTML`.
- **Preview:** a 2-D SVG side view of each blank, drawn to scale, showing the stock outline, reservations, piece silhouettes and necks. A 3-D view is [v2].
- **Manifest permissions:** `["gcode.modify"]` until O-8 is answered, matching ncCAM and AAxis. No motion permissions.
- **Platforms:** ncSender 2.x (`pro-v2`) only. Support for 0.3.x is [O-9].
- **Testing:** `planner.js` and `measure.js` are pure, so they get unit tests built from the worked examples in §11, including a test for the bishop/knight tie. The dialog is checked in the headless harness described in AAxis `CLAUDE.md` item 15 (Verify before delivering); the harness script is not checked in.

## 7. Alternatives considered

| Decision | Chosen | Rejected and why |
|---|---|---|
| Sizing control | Queen base diameter [C] | *King height*: base diameter maps directly to the stock-width fit check (§5.3); king height does not. *Per-piece overrides*: open (O-11). |
| Package geometry | STL + JSON manifest | *STEP*: carries units and solids, and Rotary CAM reads it, but the plugin would need a STEP kernel (ncCAM ships a 7.6 MB wasm one) just to rescale and lay out. The manifest's `units` field supplies the units STL lacks. |
| Where models live | Separate package [C] | *Bundled in the plugin* (6.9 MB): simpler, but the owner wants the plugin free of model payload and packages reusable. |
| Package storage | Base64 binary in the File Manager | *ASCII STL*: 5× larger (about 34 MB) and slow to reparse. *IndexedDB* (ncCAM's choice): tied to one browser and lost if browser data is cleared. |
| Distribution | Local import in v1, GitHub in v2 [C] | *Everything in v1*: builds download and update infrastructure before any package is prepared. |
| Runtime | Browser dialog only | *Server module (Jint)*: could write binary STL and fetch GitHub releases, but it has no ES modules or Node APIs, and a crash while loading quarantines the plugin@version (`../AAxis/CLAUDE.md`). |
| Export shape | One STL per blank | *One STL per piece plus a layout file*: Rotary CAM machines one part per program, so it would need multi-part placement it does not have. |
| Blank connectivity | Necks in the STL | *Separate bodies with empty gaps*: roughing cuts through the gaps toward the axis and can part the blank mid-job. *Rotary CAM adds the necks*: its parting pass only necks the two ends. |
| Neck joins | Overlapping shells | *Boolean union*: needs a mesh kernel such as manifold-3d wasm (about 1 MB) for every blank. Revisit if O-2 is "No". |
| Handoff | Folder in File Manager [C] | *Plugin generates G-code itself*: duplicates Rotary CAM. *Browser download only*: loses the shared server-side store; kept as the fallback. |
| STL encoding (exports) | ASCII | *Binary*: the save endpoint is text-only. *Base64 binary*: Rotary CAM would need a custom decoder. |
| Packing | Exact search | *First-fit decreasing*: exact search over at most 972 states runs within the same time budget and gives a provable minimum. |
| Preview | 2-D SVG | *three.js 3-D*: adds a 3-D library dependency, and the layout question is one-dimensional. |

## 8. Risks and mitigations

| # | Risk | Impact | Mitigation | Status |
|---|---|---|---|---|
| R1 | Rotary CAM cannot open STL from a File Manager folder, or rejects ASCII or multi-shell STL. | Handoff breaks. | The exporter is not built until O-1 and O-2 are answered (§5.5 gate). Download ZIP covers a local-file workflow. | Open |
| R2 | A user clicks a stored `.stl` in the File Manager, and it is loaded as a G-code program. Verified: the File Manager calls load without an extension check. | Program load error, and a large file may freeze the client's parser. STL text is not valid G-code, so motion is unlikely but not proven. | Installed packages live in a dot-folder hidden from the tree (§5.7). Exports must stay visible for Rotary CAM. Ask ncSender to add an extension check on load (O-7). Test once by loading a small STL with the spindle off and the machine in check mode. | Open |
| R3 | Thin sections flex or chatter on 18 in blanks. The weakest point is the thinnest finial in the chain (about 5 mm on the queen and bishop at the default size), because every piece toward the tailstock hangs off it during roughing. | Surface defects or a broken blank. | Neck diameter is a setting, the plan lists covered finials, and planning blocks a neck wider than any base. Piece order and direction are [O-4]. Prototype one 12 in blank first. | Open |
| R4 | The knight cannot be fully machined. Rotary CAM's demo reaches 43% of the remaining material in the indexed pass. | Hand finishing on 4 knights. | Accept hand finishing in v1. Note it in the package `notes`. | Accepted |
| R5 | Large ASCII export files (~72 MB per side; up to about 34 MB per blank for blanks with knights). | Slow save and slow Rotary CAM load; client memory. | One file per blank, under the 200 MB request cap. STL writing in a Worker, one blank at a time. Show progress. Decimation is [v2]. | Accepted |
| R6 | Upstream models are misaligned. Verified: the Staunton queen is offset 66 mm in X, all pieces are Y-up, and the knight is offset 0.75 mm in Z. | Wrong layout or failed fit. | Package preparation realigns them. Import validation rejects misaligned packages. | Mitigated |
| R7 | Unit mistakes (inch vs mm, a 25.4× error). | Wrong-size pieces, or a misplaced toolpath (see R10). | Internal and export units are always mm. `layout.json` records the units. The per-blank card shows mm and inches. Rotary CAM shows dimensions for a visual check. | Partly mitigated |
| R8 | Licence attribution is lost on exported blanks. | MIT terms not met when shared. | Every export folder gets `LICENSE-models.txt`. | Mitigated |
| R9 | An export overwrites earlier work. | Data loss. | Free-folder check before saving (§5.8); `layout.json` written last marks a complete job. | Mitigated |
| R10 | Chuck or tailstock collision from a reservation that doesn't match the holding tab Rotary CAM makes, or a value mistyped into Rotary CAM. | Cutter or spindle strikes the chuck jaws or tailstock centre. | Rotary CAM places the part and manages the holding tabs. Once Rotary CAM reads the §5.11 sidecar, nothing is retyped. The per-blank card shows stock and reservations in mm and inches. Reservations are checked against Rotary CAM's tab length on the 12 in test blank (O-4, O-10). The user runs Rotary CAM's simulation and checks clearance before every first cut. | Partly mitigated |
| R11 | An untrusted package injects paths or script, through `version`, file paths or manifest text. | Overwritten G-code programs; script running with access to ncSender's API. | Semver and path rules (§5.6), job-name rules (§5.8), `textContent` for displayed text (§6), and the server's rejection of paths that escape its storage folder (§12). | Mitigated |

## 9. Acceptance criteria

| ID | Criterion | Verifies |
|---|---|---|
| AC-PKG-01 | The plugin ZIP contains no STL files. | §2 goal 6 |
| AC-PKG-02 | Importing the prepared Staunton package succeeds, and it then appears as installed. | §5.6, §10 |
| AC-PKG-03 | Each of these blocks import with the message from §5.10: a missing file, `schema: 2`, a shifted axis (0.5 mm), and a mesh that is not closed. | §5.6, §5.10 |
| AC-PKG-04 | An installed package still works after a plugin update and with no internet connection. | §5.7 |
| AC-SEC-01 | A manifest with `version: "../x"` is rejected, and a manifest with `<script>` in `name` is shown as plain text. | §5.6, §6 |
| AC-IN-01 | An input outside its range blocks planning and shows the range. | §5.1 |
| AC-IN-02 | The display toggle switches the primary unit; stored and exported values stay in mm. | §5.1 |
| AC-IN-03 | "Maple only" plans and exports maple blanks only. | §5.1 |
| AC-SIZE-01 | With a queen base of 38.1 mm, the exported queen's base diameter measures 38.1 ± 0.05 mm. Every other piece has the same scale factor (1.270). | §5.2 |
| AC-FIT-01 | Stock of 1.5 in (38.1 mm) square with defaults fails. The message names every failing piece (all but the pawn; widest is bishop/rook at 38.14 + 3.0 mm) and gives the minimum width, 41.2 mm. | §5.3 |
| AC-FIT-02 | Fit uses the widest scaled piece, not the queen alone. | §5.3 |
| AC-FIT-03 | Stock shorter than the longest scaled piece plus both reservations gives the length message with the minimum stock length. Stock longer than the max blank length gives its own error. | §5.3, §5.10 |
| AC-FIT-04 | 2 in stock names the alternate jaws; 0.75 in stock names the standard jaws; 24 mm stock and 70 mm stock each block planning with the jaw-set message. | §5.3, §5.10 |
| AC-PLAN-01 | The worked examples in §11 reproduce exactly: blank counts, piece lists and order, and used lengths to 0.1 mm. | §5.4, §11 |
| AC-PLAN-02 | Each side's plan contains exactly 1 K, 1 Q, 2 B, 2 N, 2 R and 8 P. | §5.4 |
| AC-PLAN-03 | Changing any input recomputes the plan with no extra click. | §5.4 |
| AC-PLAN-04 | Maple and walnut blank counts are reported separately and are equal. | §5.4 |
| AC-UI-01 | The 2-D preview draws each blank to scale with the reservations, pieces and necks. | §6 |
| AC-EXP-01 | Export creates `chess set/<job>/` with one STL per blank, `layout.json` and `LICENSE-models.txt`. It leaves other File Manager files untouched. | §5.8 |
| AC-EXP-02 | Exporting twice creates `<job> (2)`; nothing is overwritten. | §5.8 |
| AC-EXP-03 | Every exported STL is in mm. Its X axis is the rotary axis through Y = Z = 0, the first piece's base is at X = 0, and its maximum X equals the blank's used length ± 0.05 mm. | §5.5 |
| AC-EXP-04 | Every blank STL loads in Rotary CAM with Turning axis X and On axis Model origin, and shows the expected pieces joined by necks, with Rotary CAM's holding tabs inside the reserved end lengths. Depends on O-1 and O-2. | §5.5 |
| AC-EXP-05 | No plugin action calls a motion, job or program-load endpoint. | §2 |
| AC-EXP-06 | The plan lists the pieces whose top is covered by the neck. | §5.5 |
| AC-EXP-07 | A forced save failure offers Download ZIP, and the incomplete folder has no `layout.json`. | §5.8 |
| AC-EXP-08 | Every blank STL has a `.rotary.json` sidecar with the same base name, matching §5.11, whose stock and placement equal the plan's per-blank card. | §5.11 |

## 10. Prepared reference package (v1 deliverable)

- **Source:** [clarkerubber/Staunton-Pieces](https://github.com/clarkerubber/Staunton-Pieces) at commit `cef2c79`, folder `Source/Staunton/<Piece>/<Piece>.STL`. MIT licence, © 2014 clarkerubber.
- **Not used:** the other STL set, `Source/Readymake_Duchamp_Chess_Set/` (a different design, plus `set_6.stl`); the `.SLDPRT` and `~$*.SLDPRT` lock files; and `Thumbs.db`.
- **Preparation**, done once, outside the plugin:
  1. Rotate Y-up to X-axis.
  2. Centre each piece on its base axis.
  3. Put the base at X = 0.
  4. Turn the knight so its face points +Z.
  5. Rename the files to lowercase.
  6. Write `chess-set.json` and copy `LICENSE`.
  7. Weld vertices, then run the §5.6 closed-mesh check. Repair any mesh that fails, and record the result in Appendix B.
- **Where it lives:** the prepared package is kept in its own folder or repo, not in the plugin. A GitHub repo and release come with v2.

## 11. Worked examples

These use the Staunton package and the §5.1 defaults:
- chuck reservation 25.4 mm
- tailstock reservation 19.05 mm
- gap 10 mm
- radial allowance 1.5 mm

Usable length is therefore 260.35 mm for 12 in stock and 412.75 mm for 18 in stock. Each piece list below is in chuck-to-tailstock order.

**Queen base 38.1 mm (1.5 in), scale 1.270.**
- Scaled axial lengths: K 99.1, Q 86.4, B 74.9, N 74.9, R 62.2, P 54.6 mm.
- Widest swept diameter: 38.14 mm (bishop and rook). Needs stock width ≥ 41.2 mm, so both 2 in and 2½ in pass.

| Stock | Blanks per side | Blanks (pieces · used / leftover mm) | Total blanks · stock to buy |
|---|---|---|---|
| 12 in × 2 in | 5 | K Q P · 260.0 / 0.3 — R P P P · 256.1 / 4.3 — R P P P · 256.1 / 4.3 — B B N · 244.8 / 15.6 — N P · 139.5 / 120.8 | 10 · 120 in |
| 18 in × 2 in | 3 | K Q B P P · 409.6 / 3.2 — B R P P P P · 405.6 / 7.2 — N N R P P · 361.3 / 51.4 | 6 · 108 in |

Results for 2½ in stock are identical; width affects only fit. A queen base of 36 mm or 40 mm also gives 5 blanks (12 in) and 3 blanks (18 in).

Largest queen base that fits, with the default allowance: **47.7 mm** on 2 in stock and **60.4 mm** on 2½ in stock. 2½ in is also the largest stock the alternate jaws grip, so 60.4 mm is the machine's upper limit for this set. Both example widths use the alternate jaws.

Cross-check: Rotary CAM's demo knight (2.9 in long, Ø1.48 in) matches the Staunton knight at about 1.25× scale.

## 12. Integration facts verified

All from ncSender source at commit `2f8a659`, checked October 30, 2026, unless marked otherwise:
- Routes `/api/gcode-files/file/save`, `/api/gcode-files/file`, `/api/gcode-files` (tree), and `/api/plugins/{id}/settings` exist.
- `file/save` accepts any path and extension under the storage folder, creates missing folders, and rejects paths that escape the folder.
- `file/save` writes text only (`File.WriteAllTextAsync`). That call replaces an existing file of the same name (standard .NET behaviour; not separately tested).
- The server's request size limit (Kestrel) is 200 MB.
- The File Manager is on the server, so everything stored there survives plugin updates and can be reached from any client.
- The File Manager tree lists every file except dot-files.
- The File Manager upload picker is limited to `.nc .gcode .gc .ngc .tap .txt`. That limit applies only to browser uploads, not to the save API.
- Clicking a file in the File Manager calls the load routine with no extension check (R2).

## 13. Open questions

| # | Question | Owner | Default until answered |
|---|---|---|---|
| O-1 | Can Rotary CAM open an STL from a File Manager folder? Does it read ASCII STL? | Rotary CAM author | **Blocks exporter build.** Fallback if no: Download ZIP and "Open STL…" |
| O-2 | With several separate bodies along the axis, does Rotary CAM leave a support (neck) in each gap, like its end necks, or cut through the gap? If it needs connecting geometry, does it accept overlapping shells? Test: load `test_files/test_two_pawns_floating.stl` and `test_two_pawns_necked.stl` (Turning axis X, On axis Model origin), run Simulate, and check what is left between the pawns. | Marc (test) / Rotary CAM author | **Blocks exporter build.** Outcome B (plugin adds necks) until tested. |
| O-3 | Closed in Revision 4: the longest blank between chuck and tailstock is 36 in (914.4 mm). | — | — |
| O-4 | Right neck diameter, gap and finishing-cutter diameter. Should thin-topped pieces go at the tailstock end, or pieces be flipped? Settled by cutting one 12 in test blank. [C: method] | Marc (12 in test blank) | 7.6 mm neck, 10 mm gap, 6.35 mm cutter, all bases toward the chuck |
| O-5 | Closed in Revision 3: the default queen base diameter is the [P] value in §5.1. | — | — |
| O-6 | Is manual piece-by-piece blank selection wanted? | Marc | No (v1 is full-side automatic) |
| O-7 | Should ncSender block loading non-G-code files from the File Manager? | Marc → ncSender | Request it |
| O-8 | Which manifest `permissions` does a file-only plugin need? | Implementer (read `PluginModels.cs`) | `["gcode.modify"]`, matching ncCAM and AAxis |
| O-9 | Support ncSender 0.3.x? | Marc | No |
| O-10 | Partly answered (owner): Rotary CAM places the part on the axis and manages the holding tab. Still open: how long are its tab and parting neck at each end, so the reservation defaults match? Can it apply stock size and placement from a sidecar? Now proposed as §5.11 (O-13). | Rotary CAM author; Marc (12 in test blank) | Reservations 25.4 mm chuck, 19.05 mm tailstock; values entered by hand. No longer blocks the exporter. |
| O-11 | Are per-piece size overrides needed? | Marc | No |
| O-12 | Does the chuck grip square stock across the flats, with the same 1–2.5 in range as round stock? | Marc | Yes, side width compared with the range |
| O-13 | Will Rotary CAM read the §5.11 `.rotary.json` sidecar, and do its field names and `upAtZero` / `chuckEnd` semantics match how Rotary CAM sets turning axis, flip and turn? | Rotary CAM author | Sidecar written anyway; user enters stock and placement by hand. Does not block any phase. |

## 14. Test files

`test_files/` holds two ASCII STLs in the §5.5 export frame: two Staunton pawns at the default scale (1.270; each 54.6 mm long, Ø30.5 mm), 10 mm apart, total length 119.2 mm. One has the pawns floating with an empty gap; the other joins them with a 7.6 mm neck. Both are closed meshes with outward-facing normals. They exist to answer O-1 and O-2.

## 15. References

- ncSender: <https://github.com/siganberg/ncSender>. Plugin model notes: `../AAxis/CLAUDE.md`.
- ncCAM, a reference for the plugin build and the free-path convention: <https://github.com/siganberg/ncsender-plugin-nccam>.
- Staunton models: <https://github.com/clarkerubber/Staunton-Pieces> (MIT).
- FIDE equipment rules, effective March 1, 2026: <https://handbook.fide.com/chapter/ChessEquipmentWithoutElectronicComponenets032026>. The misspelling is FIDE's own URL.
- Reviews: every round is listed in `docs/designs/egm/reviews/INDEX.md`.

---

## Appendix A — Shop sizing reference (informative)

These are the proposed workshop piece sizes from the build notes. They are not plugin defaults; the plugin scales the package from the queen base diameter. With the Staunton package, a 38.1 mm queen base gives a 99 mm king, close to this table. Staunton's own proportions (every piece but the pawn on the same base) differ from the table's graduated bases.

| Piece | Per side | Height | Base diameter |
|---|---:|---:|---:|
| King | 1 | 95.25 mm (3.75 in) | 43 mm (1.69 in) |
| Queen | 1 | 85 mm (3.35 in) | 40 mm (1.57 in) |
| Bishop | 2 | 70 mm (2.76 in) | 34 mm (1.34 in) |
| Knight | 2 | 60 mm (2.36 in) | 30 mm (1.18 in) |
| Rook | 2 | 55 mm (2.17 in) | 27 mm (1.06 in) |
| Pawn | 8 | 50 mm (1.97 in) | 25 mm (0.98 in) |

## Appendix B — Measured upstream Staunton models

Measured from `Source/Staunton/*/*.STL` at commit `cef2c79` (binary STL, mm). Diameters are taken about the centre of each piece's base.

| Piece | Triangles | Axial length | Base Ø | Swept Ø | Top Ø (last 1 mm) | Source frame | Closed after weld |
|---|---:|---:|---:|---:|---:|---|---|
| King | 18,964 | 78.00 | 30.00 | 30.00 | 10.59 | Y-up, axis at (X 15, Z 15) | [TBD] |
| Queen | 23,768 | 68.00 | 30.00 | 30.00 | 4.15 | Y-up, axis at (X 80.9, Z 15) | [TBD] |
| Bishop | 11,898 | 59.00 | 30.03 | 30.03 | 3.97 | Y-up, axis at (X 15, Z 15) | [TBD] |
| Knight | 62,500 | 59.00 | 30.00 | 30.00 | 8.15 | Y-up, axis at (X 15, Z 15.75) | [TBD] |
| Rook | 11,478 | 49.00 | 30.03 | 30.03 | 16.03 | Y-up, axis at (X 15, Z 15) | [TBD] |
| Pawn | 9,398 | 43.00 | 24.00 | 24.00 | 6.38 | Y-up, axis at (X 12, Z 12) | [TBD] |

One side totals 289,668 triangles: about 14.5 MB as binary STL, about 72 MB as ASCII.

---

---

## Detailed Implementation Plan

**Status:** approved by the owner on 2026-10-30, except D11 (licence), which is pending the owner. Revised the same day after the Stage 9 review (`docs/designs/egm/reviews/rev5/implementation_readiness_report.md`, resolved in `docs/designs/egm/reviews/rev5/goldfish_review_report.md`).

**Open review findings (accepted, not yet fixed):** the Stage 9 re-audit of this revision found no blockers and 11 Major findings (R-M1 to R-M11 in `docs/designs/egm/reviews/rev6/implementation_readiness_report.md`). Among them: Phase 0 outcomes with no handling; settings that cannot be saved on a fresh install; the shape of the mock's `config-ui` response; ui-check runs that are not repeatable; an incomplete fflate ZIP sequence; an async SHA-256 check; `build.sh` version bumping; and wrong test expectations (AC-FIT-03 gives 5 errors; `shifted-axis` gives 3). The review was concluded with these open. Fix each one before or during the phase it affects. The plan below has not been re-reviewed since.

**Numbering:** plan sections are numbered P1–P6 so they stay apart from the spec's § numbers. A bare § always refers to the spec.

**Units:** every length inside the code is in millimetres. Inches exist only at the input and display edge (`src/units.js`).

### P1. Decisions fixed by this plan

This table fixes every implementation decision except four:
- **D5, D6 and `FM_HANDOFF`** are set from the Phase 0 results.
- **D11** waits for the owner.

| # | Decision | Value | Reason |
|---|---|---|---|
| D1 | Source of piece dimensions for planning | **Measured** values, taken at import and stored in settings. Declared manifest values are used only for import check 4. | Per §5.2 and §6. |
| D2 | Worker | See detail 1. | Same pattern as ncCAM `src/index.js:8–66`. Needs no separate `lib/worker.js` and no cross-origin worker URL. |
| D3 | Free-folder check | Probe `GET /api/gcode-files/file?path=<encoded "chess set/<folder>/LICENSE-models.txt">`. A 404 means the folder is free. | Same probe as ncCAM `app.js:854–862`. The tree route's response shape is unverified; this check does not depend on it. |
| D4 | Export write order | `LICENSE-models.txt` → maple blanks → walnut blanks → `layout.json`. Each blank STL is followed immediately by its `.rotary.json` sidecar. | D3 needs the licence file first; §5.8 needs `layout.json` last. |
| D5 | Support mode | Constant `SUPPORT_MODE` in `src/config.js`: `'necks'` (outcome B) or `'cam'` (outcome A). Set from Phase 0. Default `'necks'`. | O-2 has two outcomes. Both code paths are built; the constant selects one. |
| D6 | Package storage root | Constant `PACKAGE_ROOT`: `.chess-set-creator/sets` if Phase 0 shows the tree hides dot-folders, else `Chess Set Creator/sets`. A second constant, `STORE_SUFFIX`, is `''`, or `'.txt'` if Phase 0 step 6 fails. | Per §5.7. |
| D7 | Lengths in the planner | Integer micrometres (`Math.round(mm × 1000)`). | Equal-length pieces (bishop and knight) must compare exactly equal. |
| D8 | Display rounding | `roundHalfUp(x, d) = sign(x) × floor(abs(x) × 10^d + 0.5 + 1e-9) / 10^d`. Minimum sizes use `ceilTo(x, d) = ceil(x × 10^d − 1e-9) / 10^d`. mm shows 1 decimal; inches show 2. | Per §5.4 ("rounded half up"). The `1e-9` terms absorb floating-point noise. |
| D9 | Dependencies | `devDependencies`, as ncCAM lists its bundled libraries: `esbuild ^0.28.2`, `playwright-core ^1.64.1`, `fflate ^0.8.2`. STL parsing and writing are our own code. | §6 and §7 reject three.js and mesh kernels. ncCAM's `src/core/mesh.js` works on indexed meshes, has no STL I/O, and returns an unsigned volume, so it cannot be reused here. |
| D10 | Tests | `node --test tests/*.test.js`. | Same as ncCAM `package.json`. |
| D11 | Plugin licence | **GPL-3.0, pending owner.** | Matches AAxis and ncCAM. If the owner picks another licence, change this row, `com.infield.chessset/LICENSE` and `package.json`. |
| D12 | Versioning | Start at `0.1.0`. Every `build.sh` run bumps the patch number and needs a CHANGELOG entry. Move to `0.2.0` once a 12 in blank has been cut end to end. | AAxis `CLAUDE.md` item 5. |
| D13 | Host version floor | `minAppVersion "2.0.88"`, `platforms {"v2":"2.0.88","pro-v2":"2.0.149"}`. No `repository` field in v1, so there is no update check. | These are ncCAM's values. ncCAM is the only reference plugin that uses the `gcode-files` routes. The shop runs v2.0.271. |

**Detail 1, the Worker (D2).** The same bundle `lib/app.js` runs in two places.

- **Inside a Worker** (`typeof document === 'undefined'`):
  - `self.onmessage` dispatches `{id, type, ...args}` to the handlers in `src/worker.js`.
  - It replies `{id, ok:true, result}` or `{id, ok:false, error}`.
  - Results that hold `ArrayBuffer`s are transferred.
- **In the page:**
  - `window.ChessSet = {build, mount}`.
  - `mount` loads the UI with a dynamic `import('./ui/app.js')`. No UI module is evaluated inside the Worker.
  - The engine is created once and cached: `ChessSet.engine ||= startEngine()`.
- **`startEngine`:**
  1. Creates `new Worker(URL.createObjectURL(new Blob([ChessSet.source], {type:'text/javascript'})))`.
  2. Races `call('ping')` against a 5 s timeout.
  3. On timeout or a thrown error, calls `terminate()` and runs the same handlers in the page.
- **The Worker never fetches.** The page reads every file and posts its content.

### P2. Files

All paths are relative to `Chess-Set-Creator/`. **N** = new, **M** = modified. No existing file is deleted.

| File | | What and why |
|---|---|---|
| `.gitignore` | N | `node_modules/`, `*.zip`, `.mock-store.json`, `.DS_Store`. |
| `package.json` | N | `"type":"module"`, `private:true`, `license` per D11. Scripts: `build` (`node build.mjs`), `test` (`node --test tests/*.test.js`), `fixtures` (`node tools/make-fixtures.mjs`), `prepare-package` (`node tools/prepare-package.mjs`), `mock` (`node tools/mock-ncsender.mjs`), `ui-check` (`node tools/ui-check.mjs`). `devDependencies` per D9. |
| `build.mjs` | N | Reads `version` from `com.infield.chessset/manifest.json`; `tag = version + '-' + Date.now().toString(36)`. Runs esbuild with `{entryPoints:['src/index.js'], bundle:true, format:'iife', platform:'browser', target:['chrome110'], minify:true, legalComments:'eof', define:{__BUILD__: JSON.stringify(tag)}, outfile:'com.infield.chessset/lib/app.js'}`. Then replaces `/var BUILD = '[^']*';/` in `com.infield.chessset/config.html`. Prints the bundle size. |
| `build.sh` | N | Adapted from AAxis `build.sh`. Order: bump the patch number in `com.infield.chessset/manifest.json` → `node build.mjs` → `zip -qr com.infield.chessset-<v>.zip com.infield.chessset -x '*.DS_Store'` (old ZIPs are deleted first). Prints the CHANGELOG reminder. |
| `com.infield.chessset/manifest.json` | N | `id`, `name:"Chess Set Creator"`, `version`, `minAppVersion` and `platforms` per D13, `author:"Marc Infield"`, `description`, `configUi:"config.html"`, `icon:"icon.svg"`, `category:"utility"`, `events:[]`, `permissions:["gcode.modify"]`, `toolMenu:[{id:"chess-set-creator",label:"Chess Set Creator",icon:"icon.svg",clientOnly:true}]`. No `entry` field (there is no server module) and no `repository` field (D13). |
| `com.infield.chessset/config.html` | N | The dialog shell: a root `<div class="csc-shell">` and the loader script. The loader follows ncCAM `config.html:244–265`, with one deliberate change: the port placeholder is quoted, as AAxis does it (`config.html:97–101`): `var RAW_PORT = '__SERVER_PORT__'; var PORT = /^\d+$/.test(RAW_PORT) ? parseInt(RAW_PORT, 10) : 8090;`. This lets it run when Settings → Plugins serves the file unreplaced. Then: `base = ncSender.getApiBaseUrl(PORT)` if present, else `''`. `file(name)` = `base + '/api/plugins/com.infield.chessset/icon?file=' + encodeURIComponent(name)`. It fetches `lib/app.js` unless `window.ChessSet.build === BUILD`, injects the script, stores the code in `ChessSet.source`, and calls `ChessSet.mount(root, {base, file})`. A load error is shown with `textContent`. `__INITIAL_CONFIG__` is not used; settings come from the GET in `settings.js`. |
| `com.infield.chessset/lib/app.js` | N (built) | Output of `build.mjs`. Included in the ZIP; never edited by hand. |
| `com.infield.chessset/icon.svg` | N | A 24×24 single-path pawn silhouette with `fill="currentColor"`. |
| `com.infield.chessset/README.md` | N | What the plugin does, how to import a package, how to export, and where the files go. Links the spec. |
| `com.infield.chessset/CHANGELOG.md` | N | AAxis format. First entry `0.1.0`. |
| `com.infield.chessset/LICENSE` | N | The licence text per D11. |
| `src/config.js` | N | All lengths in mm. `SUPPORT_MODE`, `FM_HANDOFF = true`, `PACKAGE_ROOT`, `STORE_SUFFIX = ''`, `EXPORT_ROOT = 'chess set'`, `PLUGIN_ID = 'com.infield.chessset'`, `JAWS = [{name:'standard', min:0, max:22.86}, {name:'alternate', min:25.4, max:63.5}]`, `NECK_OVERLAP = 0.5`, `NECK_SEGMENTS = 64`, `WELD_TOL = 0.001`, `WELD_RETRY_TOL = 0.01`, `MEASURE_TOL = 0.1`, `BAND = 1.0`, `PROFILE_STEP = 0.5`, `MAX_COPIES = 999`. |
| `src/units.js` | N | `MM_PER_IN = 25.4`, `roundHalfUp`, `ceilTo` (D8). `fmt(mm, primary)` returns e.g. `"18.00 in (457.2 mm)"` or `"457.2 mm (18.00 in)"`. `parse(text, primary)` returns mm, or `null`. |
| `src/stl.js` | N | `parseStl`, `writeAscii`, `writeBinary`, `transform`, `toBase64`, `fromBase64`. See P4.1. |
| `src/measure.js` | N | `weld`, `closedCheck`, `measure`, `profile`, `checkPiece`. See P4.2. |
| `src/manifest.js` | N | `validateManifest(json, names) → {errors[], manifest}`. See P4.3. |
| `src/package.js` | N | `importPackage({fm, call, settings, fileList, onProgress})` and `loadPackageMeshes({fm, call, pkg})`. See P4.4. |
| `src/planner.js` | N | `plan(inputs, pieces, mode)` → `{errors, scale, jawSet, pieces, coveredTips, blanks?, summary?}`. Pure. See P4.5. |
| `src/blank.js` | N | `buildBlank(blank, meshes, scale, inputs, mode)` → `Float64Array`. Pure. See P4.6. |
| `src/sidecar.js` | N | `buildSidecar({blank, side, file, inputs, jawSet, pluginVersion, jobName})` → the §5.11 object. Pure. |
| `src/layout.js` | N | `buildLayout({pluginVersion, pkg, inputs, plan, sides, mode, createdAt})` → an object (P4.7). Pure. |
| `src/exporter.js` | N | `defaultJobName`, `validJobName`, `freeFolder`, `exportJob({fm, call, plan, pkg, inputs, sides, jobName, onProgress})` → `{folder, files}`, and `downloadZips({...same, folder})`. See P4.8. `call` is the Worker client from Detail 1. |
| `src/fm.js` | N | `createFm(base)` returns `{saveText(path, content), probe(path) → status, readText(path), getSettings(), putSettings(obj)}`. Every `?path=` value is built with `encodeURIComponent(path)` (ncCAM `app.js:858`). `file/save` sends the raw path in its JSON body (`app.js:845`). `readText` handles the response format recorded in Phase 0 step 5. |
| `src/settings.js` | N | `DEFAULTS`, `load(fm)`, `save(fm, patch)`. See P4.9. |
| `src/worker.js` | N | The handlers, with their payloads:<br>• `ping() → true`<br>• `measurePackage({units, files:{role:ArrayBuffer}, declared:{role:{…}}, sha256}) → {role:{measurements, profile, b64, errors}}` (buffers are transferred)<br>• `loadPackage({key, b64:{role:string}}) → true` (meshes cached by `key`)<br>• `buildBlankText({key, blank, scale, inputs, mode, name}) → string`<br>The same handlers run in the page as the fallback. |
| `src/index.js` | N | Entry point, as in Detail 1. |
| `src/ui/app.js` | N | `mountApp(root, host, call)`. Holds the state object, `render()`, a 150 ms debounced recompute on every `input` event, and the no-package state. |
| `src/ui/dom.js` | N | `el(tag, attrs, ...children)`. Text is set only with `textContent`. There is no `innerHTML` anywhere in `src/` (AC-SEC-01). |
| `src/ui/form.js` | N | The Package, Size, Stock, Allowances, Sides and Machine sections. See P4.10. |
| `src/ui/planview.js` | N | Error box (with one message template per error code, P4.5), piece table, summary, per-blank cards, and the export area. |
| `src/ui/preview.js` | N | SVG side view of one blank. See P4.10. |
| `src/ui/style.css.js` | N | Exports `injectStyle()`, which `mountApp` calls once. Uses ncSender CSS variables (`--color-accent`, `--color-surface`, `--color-surface-muted`, `--color-border`, `--color-text-primary`, `--color-text-secondary`, `--color-danger`, `--color-success`). Selectors use (0,2,1) specificity, e.g. `.csc-shell .csc-main button` (AAxis item 9). |
| `tools/make-fixtures.mjs` | N | Writes `tests/fixtures/` (P5.0). |
| `tools/prepare-package.mjs` | N | One-time Staunton preparation (P4.11). |
| `tools/harness.html` | N | Copied from ncCAM `dev/harness.html`, with the plugin id and the root id changed. It provides `window.ncSender.getApiBaseUrl`, the host CSS variables, `v-html`-style script re-execution, and the `close-plugin-dialog` listener. |
| `tools/mock-ncsender.mjs` | N | Dev server on port 8777 (P4.12). |
| `tools/ui-check.mjs` | N | Headless Playwright check (P5.8). |
| `packages/staunton-clarkerubber/` | N (generated) | `chess-set.json`, `king.stl` … `pawn.stl` (binary), `LICENSE`. Kept outside the plugin (§10). Not ignored by `.gitignore`. |
| `tests/*.test.js` | N | `units`, `stl`, `measure`, `manifest`, `settings`, `planner`, `blank`, `layout`, `exporter` (P5). |
| `tests/fixtures/` | N (generated + one hand-written file) | Generated by `make-fixtures.mjs`, plus the hand-written `layout-12in.json` (P5.5). |
| `Chess_Set_Creator.md` | M | Spec edits made with this plan: the §6 file tree, planning line and manifest line; the §5.1 Machine note; the §5.8 free-folder and job-name notes. Later: the Phase 0, 2 and 6 results (§12, §13, Appendix B, §5.1 defaults). |

### P3. Phases

From Phase 1 on, every phase leaves `npm test` passing. From Phase 3 on, the plugin ZIP installs. Each phase's acceptance criteria are listed in P5.7.

#### Phase 0 — Handoff and host facts (no plugin code)

On the shop machine's ncSender, in the browser console, with `base = ''` (same origin):

0. Record the ncSender edition and version (Settings → About). Check them against D13.
1. Save both `test_files/` STLs. For each file, read it through a file input, then call `fetch('/api/gcode-files/file/save', {method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({path:'chess set/_test/<name>.stl', content:text})})`.
2. **O-1:** in Rotary CAM, open each file from `chess set/_test/`. Record whether File Manager folders are offered and whether ASCII STL loads. If either answer is no, set `FM_HANDOFF = false`.
3. **O-2:** with Turning axis X and On axis Model origin, run Simulate on both files.
   - The floating file keeps a support → `SUPPORT_MODE = 'cam'`.
   - The floating file is cut through and the necked file is kept → `'necks'`.
   - Both are cut through → stop and add an open question.
4. **Overwrite:** save `chess set/_test/x.txt` twice with different content, read it back, and confirm §12's "replaces an existing file".
5. **Read-back format:** `GET /api/gcode-files/file?path=` + `encodeURIComponent('chess set/_test/x.txt')`. Record the `content-type` and the body shape. This fixes `fm.readText`:
   - for `text/*`, use the body;
   - for JSON, use the field that holds the text.
6. **Stored file types:** save `.chess-set-creator/probe/x.stl.b64`, `x.json` and `LICENSE` with known text. Read each back and compare. If any differs or fails, set `STORE_SUFFIX = '.txt'`.
7. **Dot-folders:** check whether `.chess-set-creator` shows in the File Manager tree, and set `PACKAGE_ROOT` (D6).
8. Delete `chess set/_test/` in the File Manager. Leave `.chess-set-creator/probe/`; it is hidden or harmless.
9. Write the results into the spec: §12 facts, the O-1 and O-2 answers, and `SUPPORT_MODE`, `FM_HANDOFF`, `PACKAGE_ROOT` and `STORE_SUFFIX`.

**If `FM_HANDOFF = false`:** Phase 5 still builds the exporter, but **Download ZIP** becomes the main button and **Export to File Manager** is hidden.

**Exit:** steps 0 and 2–7 are recorded in the spec.

#### Phase 1 — Repo skeleton and pure core

Create these, then run `npm install` and `npm run fixtures`:
- `.gitignore`, `package.json`, `build.mjs`, `build.sh`
- `src/config.js`, `units.js`, `stl.js`, `measure.js` (including `checkPiece`), `manifest.js`, `planner.js`
- `tools/make-fixtures.mjs` (mesh fixtures only)
- `tests/units`, `stl`, `measure`, `manifest` and `planner` tests

**Exit:** `npm test` passes P5.1–P5.4. The prepared-package and bad-package cases skip at this point.

#### Phase 2 — Prepared Staunton package

Write `tools/prepare-package.mjs`. Run it on a local clone of `clarkerubber/Staunton-Pieces` at `cef2c79`:

`npm run prepare-package -- <clone>/Source/Staunton packages/staunton-clarkerubber`

Then run `npm run fixtures` again, which adds the bad packages. Fill in Appendix B's "Closed after weld" column, and confirm the knight's face direction in a quick SVG export (P4.11 step 3).

**Exit:**
- The "prepared package validates" and "bad packages" cases in P5.3 pass.
- The measurements match Appendix B within 0.1 mm.

#### Phase 3 — Plugin shell, settings and import

Write:
- `com.infield.chessset/*`
- `src/index.js`, `fm.js`, `settings.js`, `package.js`, `worker.js`
- `ui/app.js`, `ui/dom.js`, `ui/style.css.js`, and the Package section of `ui/form.js`
- `tools/harness.html`, `tools/mock-ncsender.mjs`
- `tests/settings.test.js`

**Exit:**
- `./build.sh` produces a ZIP with no `.stl` inside.
- The plugin installs in ncSender.
- The Phase 3 ACs in P5.7 pass.

#### Phase 4 — Planning UI and preview

Write the rest of `ui/form.js`, plus `ui/planview.js`, `ui/preview.js` and `tools/ui-check.mjs`.

**Exit:**
- `npm run ui-check -- --until=plan` passes (P5.8 steps 1–5, 9 and 11).
- The Phase 4 ACs in P5.7 pass.

#### Phase 5 — Export (needs Phase 0 recorded)

Write:
- `src/blank.js`, `layout.js`, `exporter.js`
- the `buildBlankText` handler
- the export area of `ui/planview.js`, including Download ZIP
- `tests/blank`, `layout` and `exporter` tests, plus `tests/fixtures/layout-12in.json`

**Exit:**
- `npm test` passes in full.
- `npm run ui-check` passes in full.
- The Phase 5 ACs in P5.7 pass.

#### Phase 6 — Shop validation

1. Export a 12 in × 2 in job with the defaults.
2. Load blank 1 in Rotary CAM, simulate, check clearance, and cut it.
3. Record:
   - neck diameter, gap and cutter diameter → O-4;
   - Rotary CAM's tab and parting-neck lengths → O-10.
4. Update the §5.1 defaults if they changed.
5. Add a CHANGELOG entry, set the version to `0.2.0` (D12), and run `./build.sh`.

**Exit:** O-4 and O-10 are closed in the spec.

### P4. Module details

#### P4.1 `stl.js`

A triangle list is a `Float64Array` holding 9 numbers per triangle (x1, y1, z1, x2, …).

**`parseStl(buf)`**
- Binary when `buf.byteLength >= 84` and `byteLength === 84 + 50 × uint32LE(80)`. Each 50-byte record holds 12 float32 values: discard the first 3 (the normal) and keep the 9 vertex coordinates.
- Otherwise ASCII: decode as UTF-8 and take every `vertex x y z` line in order.
- Throws `"not an STL"` when:
  - the vertex count is 0;
  - the vertex count is not a multiple of 3;
  - any coordinate is not finite.

**`writeAscii(name, tris)`** uses the line layout of `test_files/`:
- `solid <name>`
- ` facet normal nx ny nz`
- `  outer loop`
- `   vertex x y z` (×3)
- `  endloop`
- ` endfacet`
- `endsolid <name>`

Formatting:
- Vertices use `toFixed(4)`.
- Normals use `toExponential(6)`, which prints `e+0` where `test_files` has `e+00`. Both parse the same.
- A normal is the normalised `(v2−v1)×(v3−v1)`. If its length is below 1e-12, the normal is `0 0 0`.
- Lines are built in chunks of 10,000 facets, and the chunks are joined once with `''`. This avoids repeatedly concatenating one growing string.

**`writeBinary(tris)`**
- an 80-byte header holding `"chess-set-creator"`;
- a uint32 triangle count;
- then for each triangle: the computed normal, three vertices as float32, and a uint16 of 0.

**`transform(tris, s, dx)`** returns a new array with `x' = x·s + dx`, `y' = y·s`, `z' = z·s`.

**`toBase64(u8)`** builds the binary string from 32,768-byte slices with `String.fromCharCode.apply(null, slice)`, joins them, and calls `btoa` once.

**`fromBase64(s)`** calls `atob` once on the whole string and copies the character codes into a `Uint8Array`.

#### P4.2 `measure.js`

**`weld(tris, tol)`**
- A spatial hash with cell size `tol`.
- Each vertex searches the 3×3×3 block of cells centred on its own cell for an existing vertex within Euclidean distance `tol`. If none is found, it gets a new index.
- Returns `{verts, faces, degenerate}`. Faces with a repeated index are dropped and counted in `degenerate`.

**`closedCheck(verts, faces)`**
- Counts each undirected edge. The mesh is closed when every count is exactly 2.
- `volume = Σ v1·(v2×v3) / 6` (signed).
- Returns `{closed, openEdges, volume}`.

**`measure(tris)`** (the axis is X):
- `minX`, `maxX`, `axialLength = maxX − minX`.
- **Base band:** vertices with `x ≤ minX + BAND`.
  - `baseCentre = ((minY+maxY)/2, (minZ+maxZ)/2)`, taken over the band.
  - `axisOffset = hypot(baseCentre)`.
- For each vertex, `r = hypot(y, z)`. Then:
  - `sweptDiameter = 2·max r`
  - `baseDiameter = 2·max r` over the base band
  - `topDiameter = 2·max r` over `x ≥ maxX − BAND`

**`profile(tris)`**
- Returns `ceil(axialLength / PROFILE_STEP)` radii: the largest `r` in each `PROFILE_STEP` slice, counted from `minX`.
- An empty slice takes the previous slice's value.

**`checkPiece(buf, declared, units, digest)`** runs §5.6 checks 2–6 for one file. It is pure; `digest` is injected and may be `undefined`.

1. `parseStl`. On failure, the error is `"unreadable STL"`.
2. If `units` is `"in"`, multiply every coordinate by 25.4.
3. `weld` at `WELD_TOL`, then `closedCheck`. Fails on `!closed` (giving `openEdges`) or `volume ≤ 0`.
4. `measure`. For each of `axialLength`, `baseDiameter` and `sweptDiameter`: `abs(measured − declared × (units === 'in' ? 25.4 : 1)) ≤ MEASURE_TOL`.
5. `axisOffset ≤ MEASURE_TOL` and `abs(minX) ≤ MEASURE_TOL`.
6. If `declared.sha256` is given:
   - if `digest` is available, compare;
   - otherwise add the note `"sha256 not checked: this connection is not secure"`. This is not an error.

Returns `{measurements, profile, tris, errors, notes}`.

#### P4.3 `manifest.js`

**`validateManifest(json, names)`**. `names` is the set of file paths in the folder, relative to its root. Each error is `{file:'chess-set.json', field, message}`.

1. `schema` is the integer 1.
2. `id` matches `^[a-z0-9-]+$`.
3. `version` matches `^\d+\.\d+\.\d+$`.
4. `name` is a non-empty string, at most 80 characters.
5. `author`, `source`, `license` and `attribution` are non-empty strings.
6. `licenseFile` passes the path rule. **Only if it does**, it must be present in `names`.
7. `units` is `"mm"` or `"in"`.
8. `frame` is exactly `"x-axis-base-at-origin-v1"`.
9. `pieces` has exactly the keys king, queen, bishop, knight, rook and pawn. Each piece has:
   - a `file` that passes the path rule, and only then is present in `names`;
   - `axialLength`, `baseDiameter`, `sweptDiameter` and `topDiameter` as finite numbers > 0.
10. `sha256`, if present, maps file names to `^[0-9a-f]{64}$`. The `"…"` placeholder in the §5.6 example fails this check, so fixtures and `prepare-package` leave `sha256` out.
11. `notes`, if present, is a string of at most 2000 characters.

**Path rule:** a non-empty string with no `\`, not starting with `/`, and with no segment equal to `..` or `.`.

Unknown top-level fields are ignored.

#### P4.4 `package.js`

**`importPackage`:**

1. The file input is `<input type="file" webkitdirectory>`.
   - **Root** = the first segment of `webkitRelativePath`.
   - **`names`** = the paths with the root removed.
   - If there is no root `chess-set.json`, the error is "No chess-set.json in the selected folder".
2. Parse the JSON (a parse error is reported with `field:"(file)"`), then run `validateManifest`. Stop on errors.
3. Read the six STLs as `ArrayBuffer`s.
4. Call `measurePackage`. The Worker runs `checkPiece` per role, with `digest` set to `crypto.subtle?.digest` bound to `'SHA-256'`, and returns `b64 = toBase64(writeBinary(tris))`.
5. If there are any errors, show the full list as `file — check — measured vs declared`. Nothing is stored. Notes are shown as information.
6. Save the files under `dir = PACKAGE_ROOT/<id>@<version>/`, appending `STORE_SUFFIX` to each name:
   - `chess-set.json` (the original text);
   - `LICENSE` (the text of `licenseFile`);
   - the six `<role>.stl.b64` files.

   If any save fails, stop, write nothing to settings, and show *"Saving <path> failed (<status>). The package is not installed."*
7. `settings.save` with:

   ```js
   packages[`${id}@${version}`] = {
     id, version, name, author, source, license, attribution, dir,
     installedAt: ISO,
     pieces: {role: {axialLength, baseDiameter, sweptDiameter, topDiameter, profile}}
   }
   lastPackage = `${id}@${version}`
   ```

   Re-importing the same `id@version` overwrites it.

**`loadPackageMeshes({fm, call, pkg})`:** the page reads the six `<role>.stl.b64` files (plus suffix) with `fm.readText`, then calls `loadPackage({key, b64})`.

#### P4.5 `planner.js`

**Inputs** (all mm):
- `queenBase`, `stockLength`, `stockShape`, `stockWidth`
- `chuckRes`, `tailRes`, `gap`, `neckDiameter`, `radialAllowance`
- `sides` (`'maple'`, `'walnut'` or `'both'`)
- `maxBlankLength`

`pieces` = the installed package's measured dimensions. `mode` = `SUPPORT_MODE`.

**Errors** are `{code, field?, role?, values}`, with `values` in mm. `planview.js` turns each code into the message below and formats the values with `fmt(v, primary)`. Placeholders are written `<name>`.

| Code | Message |
|---|---|
| `NO_PACKAGE` | Import a model package folder. |
| `RANGE` | `<label>` must be between `<min>` and `<max>`. (With no max: "must be at least `<min>`".) |
| `NO_USABLE` | Reservations (chuck `<chuck>` + tailstock `<tail>`) leave no usable length on `<length>` stock. |
| `TOO_LONG_FOR_MACHINE` | Stock length `<length>` is longer than the longest blank the machine holds (`<max>`). |
| `JAW` | Stock width `<width>` is outside both jaw sets (standard 0–22.9 mm, alternate 25.4–63.5 mm). Nearest width that fits: `<nearest>`. |
| `TOO_WIDE` | `<piece>` needs `<need>` (swept Ø `<swept>` + 2 × `<allowance>`) but the stock is `<width>` wide. Minimum stock width: `<minWidth>`. |
| `TOO_LONG` | `<piece>` is `<length>` long but the usable length is `<usable>`. Minimum stock length: `<minLength>`. |
| `NECK_WIDER_THAN_BASE` | Neck Ø `<neck>` is wider than the `<piece>` base (`<base>`). |

**Step 1 — ranges.** Any `RANGE` error stops planning here.

| Field | Label | Min | Max |
|---|---|---|---|
| `queenBase` | Queen base diameter | 15 | 100 |
| `stockLength` | Stock length | 50 | — |
| `stockWidth` | Stock width | 0.1 | — |
| `chuckRes` | Chuck reservation | 0 | 200 |
| `tailRes` | Tailstock reservation | 0 | 200 |
| `gap` | Gap | 6.35 | 50 |
| `neckDiameter` | Neck diameter | 3 | `stockWidth` |
| `radialAllowance` | Radial allowance | 0 | 10 |
| `maxBlankLength` | Max blank length | 100 | 2000 |

- `neckDiameter` is not checked when `mode === 'cam'`.
- The upper stock-length limit and the jaw ranges are checked only in step 3, so they get their own messages.

**Step 2 — scale.** `scale = queenBase / pieces.queen.baseDiameter`. Every scaled dimension = measured × scale.

**Step 3 — checks.** Collect every failure. Then stop if there are any.
- **Usable length:** `usable = stockLength − chuckRes − tailRes`. If `usable ≤ 0`, report `NO_USABLE`, and skip the length checks below.
- **Machine length:** if `stockLength > maxBlankLength`, report `TOO_LONG_FOR_MACHINE`.
- **Jaw set:** `jawSet` = the name of the `JAWS` range that contains `stockWidth`. If there is none, report `JAW`, with `nearest`:
  - between 22.86 and 25.4: the closer boundary (a tie goes to 25.4);
  - above 63.5: 63.5.
- **Cross-section,** per role: `need = scaledSwept + 2·radialAllowance`. If `need > stockWidth`, report `TOO_WIDE`. `minWidth = ceilTo(max need, 1)`.
- **Length,** per role (only when `usable > 0`): if `scaledAxial > usable`, report `TOO_LONG`. `minLength = ceilTo(max scaledAxial + chuckRes + tailRes, 1)`.
- **Neck** (only when `mode === 'necks'`): if `neckDiameter > min scaled baseDiameter`, report `NECK_WIDER_THAN_BASE`.

**Step 4 — covered tips** (only when `mode === 'necks'`): the roles whose scaled `topDiameter < neckDiameter`.

**Step 5 — packing,** in integer µm (D7). The counts per side are `[1,1,2,2,2,8]`, in K, Q, B, N, R, P order.
- `patterns(rem)`: every count vector `c ≤ rem` with `Σc ≥ 1` and `Σ cᵢ·lenᵢ + (Σc − 1)·gap ≤ usable`.
- `best(rem)` is memoised by `rem.join(',')`:
  - `[]` for the empty vector;
  - otherwise, the lowest-comparing candidate `[p, ...best(rem − p)]` over all patterns `p`.
- **Comparing two plans a and b:**
  1. fewer blanks wins;
  2. else, at the first index i where `used(aᵢ)` differs, the larger wins;
  3. else, compare piece lists element by element, each written in K, Q, B, N, R, P order. The earlier role wins, and a list that is a prefix of the other comes first.
- This key has optimal substructure: with the first blank fixed, the rest compares by the same key. At most 972 states, each with at most 972 patterns.

**Step 6 — per blank:**
- Pieces in descending axial length; equal lengths go K, Q, B, N, R, P.
- x ranges: `[0, len₀]`, then `[prevEnd + gap, …]`.
- `used = lastEnd`; `leftover = usable − used`.

**Step 7 — output** (converted back to mm):
- **On errors:** `{errors, scale, jawSet, pieces, coveredTips}`. No `blanks`.
- **Otherwise also:**
  - `blanks: [{index, pieces:[{role, xStart, xEnd}], used, leftover}]`
  - `summary: {blanksPerSide, sides: n, totalBlanks, stockToBuy}`

#### P4.6 `blank.js`

`buildBlank(blank, meshes, scale, inputs, mode)`:
- For each piece, add `transform(meshes[role], scale, xStart)`.
- If `mode === 'necks'`, also add one closed cylinder per gap:
  - axis X, radius `neckDiameter/2`, `NECK_SEGMENTS` segments;
  - running from `prevEnd − NECK_OVERLAP` to `nextStart + NECK_OVERLAP`;
  - side quads as two triangles each, plus two end-cap fans;
  - windings counter-clockwise seen from outside.

#### P4.7 `layout.json` (schema 1)

```jsonc
{
  "format": "chess-set-creator-layout", "formatVersion": 1,
  "createdAt": "2026-11-02T14:05:00Z",
  "plugin": { "id": "com.infield.chessset", "version": "0.1.0" },
  "package": { "id": "staunton-clarkerubber", "version": "1.0.0", "name": "Staunton (clarkerubber)" },
  "units": "mm", "frame": "x-axis-base-at-origin-v1", "turningAxis": "X", "onAxis": "Model origin",
  "scale": 1.27, "queenBaseDiameter": 38.1,
  "stock": { "length": 304.8, "width": 50.8, "shape": "square", "jawSet": "alternate" },
  "reservations": { "chuck": 25.4, "tailstock": 19.05 },
  "gap": 10, "supportMode": "necks", "neckDiameter": 7.6, "radialAllowance": 1.5,
  "coveredTips": ["queen", "bishop"],
  "blanks": [
    { "side": "maple", "index": 1, "file": "maple_blank_01.stl",
      "pieces": [ { "role": "king", "xStart": 0, "xEnd": 99.06 }, "…" ],
      "usedLength": 260.03, "leftoverLength": 0.32 }
  ]
}
```

- Numbers are rounded half up to 0.001 mm.
- When `supportMode` is `"cam"`: `neckDiameter` is `null` and `coveredTips` is `[]`.

#### P4.8 `exporter.js`

**1. Job name.**
- `defaultJobName = pkg.id + ' Q' + trim(roundHalfUp(queenBase, 1)) + ' ' + Math.round(stockLength) + 'x' + Math.round(stockWidth)`.
- `trim` drops a trailing `.0`, so 40 gives `Q40` and 38.1 gives `Q38.1`.
- `validJobName`:
  - matches `^[A-Za-z0-9 ._()x-]+$`;
  - does not start with `.`;
  - does not contain `..`.

  Otherwise the error is *"Job name may use letters, digits, space and . _ - ( ) only."*

**2. Free folder (D3).** For n = 1…`MAX_COPIES`: the folder is `name` when n is 1, otherwise `name (n)`. Probe `chess set/<folder>/LICENSE-models.txt`:
- 404 → use this folder;
- 200 → try the next n;
- any other status → *"Could not check the File Manager (<status>)."*

After `MAX_COPIES`: *"Too many copies of <name>; rename the job."*

**3. Write order (D4).** Each file is saved with `fm.saveText`, and `onProgress({file, i, n})` is called.
1. `LICENSE-models.txt` = the package `LICENSE` text + `\n\nAttribution: <attribution>\nSource: <source>\n`.
2. For each selected side, maple first, then for each blank i: `call('buildBlankText', {key, blank, scale, inputs, mode, name: '<side>_blank_<ii>'})`, then save. The page releases the string after the save completes. Then save `<side>_blank_<ii>.rotary.json` = `JSON.stringify(buildSidecar(...), null, 2)`.
3. `layout.json` (`JSON.stringify(obj, null, 2)`).

**4. On a failed save:** stop, then throw `ExportError({path, status, body: first 200 chars})`. The UI shows *"Saving <path> failed: <status> <body>. Files already written stay in place; this folder has no layout.json, so it is incomplete."* It also shows **Download ZIP**.

**5. `downloadZips`** creates one ZIP per selected side, named `<folder> <side>.zip`. `<folder>` is the default job name when no File Manager export ran.
- Uses fflate's streaming `Zip` with `ZipDeflate` at level 6.
- Text goes in through `strToU8`, with `push(u8, true)`.
- Each ZIP contains `LICENSE-models.txt`, that side's blanks (generated one at a time, then released) with their sidecars, and the full `layout.json`.
- Downloaded through an object URL and a temporary `<a download>`.

**6. On success:** *"Exported <n> blanks to chess set/<folder>/."*

The exporter never calls `/api/gcode-files/load*`, `/api/gcode-job` or `/api/send-command` (AC-EXP-05).

#### P4.9 `settings.js`

```js
DEFAULTS = {
  schema: 1, displayUnit: 'in', maxBlankLength: 914.4,
  packages: {}, lastPackage: null,
  lastInputs: { queenBase: 38.1, stockLength: 457.2, stockShape: 'square', stockWidth: 50.8,
    chuckRes: 25.4, tailRes: 19.05, gap: 10, neckDiameter: 7.6, radialAllowance: 1.5, sides: 'both' }
}
```

**`load(fm)`** (for display):
- `GET`, then `Object.assign({}, DEFAULTS, s, { lastInputs: {...DEFAULTS.lastInputs, ...(s.lastInputs || {})}, packages: s.packages || {} })`.
- On failure, it returns `DEFAULTS` and sets `offline = true`.

**`save(fm, patch)`:**
1. `GET`. If the response is not OK, throw `SettingsError(status)` and **do not PUT**.
2. Merge the response over `DEFAULTS` as `load` does.
3. Apply the patch at the top level. If the patch has `lastInputs`, merge it into the existing `lastInputs`.
4. `PUT` the whole object.

The UI catches `SettingsError` and shows *"Settings not saved (<status>). Your changes stay in this dialog."*

**When it saves:**
- `lastInputs`: 1 s after the last input change;
- `displayUnit`: on toggle;
- `maxBlankLength`: on change;
- `packages` and `lastPackage`: on import.

#### P4.10 UI

**Layout.** `.csc-shell` holds a header and two columns. Below 900 px the columns stack.

**Header:**
- the title;
- the units toggle (`in` / `mm`), which changes the primary unit only;
- the build tag, in small text.

**No-package state.** When `lastPackage` is null or not installed, only the Package section shows, with the error box *"Import a model package folder."* The plan and the export area are hidden.

**Left column, in this order:**
1. **Package:** a select of installed packages; the **Import package folder** button; the selected package's name, author and licence; import progress, errors and notes.
2. **Size:** queen base diameter.
3. **Stock:** length; shape (radio: square / round); width; a jaw-set readout.
4. **Allowances:** chuck reservation, tailstock reservation, gap, neck diameter (hidden when `mode === 'cam'`), radial allowance.
5. **Sides:** radio (both / maple / walnut).
6. **Machine:** a collapsed row with max blank length (100–2000 mm), saved to settings.

**Each input:**
- shows its value in the primary unit;
- has a small line below with the other unit and the valid range;
- on a `RANGE` error, gets the class `bad`, and the small line shows the message.

**Right column:**
- **Error box:** every error, only when there are errors.
- **Piece table:** role, per side, axial length, base Ø, swept Ø, and a "tip covered by neck" mark.
- **Summary line:** e.g. "Blanks per side: 5 (× 2 sides) · Total: 10 · Stock to buy: 120.00 in (3048.0 mm)".
- **One card per blank,** titled "Blank 2 — per side × 2", or "maple" / "walnut" for a single side. Each card shows:
  - the piece list in order;
  - used / leftover length;
  - stock and reservations in both units;
  - the jaw set;
  - the preview.
- **Export area:**
  - the job name field;
  - **Export to File Manager** (only when `FM_HANDOFF`);
  - a progress line;
  - **Download ZIP**, shown after a failed save, or as the main button when `!FM_HANDOFF`.

**Preview** (`preview.js`):
- Shown only when the plan has no errors.
- An SVG with `viewBox="0 0 <stockLength> <stockWidth>"` and width 100%. It contains:
  - the stock rectangle (`stroke: var(--color-border)`);
  - the reservations, filled `color-mix(in srgb, var(--color-text-secondary) 15%, transparent)`;
  - each piece as a mirrored polygon from its scaled profile, offset by `chuckRes + xStart`, filled `color-mix(in srgb, var(--color-accent) 35%, transparent)`;
  - each neck as a rectangle of the neck diameter.
- Built with `createElementNS` and attributes only.

**Closing:** `window.postMessage({type:'close-plugin-dialog'}, '*')`. The dialog never uses `alert`, `confirm` or `prompt` (AAxis item 10).

#### P4.11 `tools/prepare-package.mjs`

**Usage:**
- `prepare-package <clone>/Source/Staunton <outDir>`
- `prepare-package --measure <file.stl> [--x0 <a> --x1 <b>]`

For each of King, Queen, Bishop, Knight, Rook and Pawn, it reads `<src>/<Piece>/<Piece>.STL`, then:

1. **Rotate Y-up to the X axis:** `(x, y, z) → (y, −x, z)`.
2. **Centre:** measure the base-band centre, then translate by `(−minX, −cy, −cz)`.
3. **Knight only — face to +Z:**
   - Over the vertices with `x ≥ minX + 0.6·axialLength`, take the mean `(ȳ, z̄)` and `θ = atan2(ȳ, z̄)`.
   - Rotate every vertex by +θ: `y' = y·cosθ − z·sinθ`, `z' = y·sinθ + z·cosθ`.
   - Assert that the new top-40% mean has `|ȳ| < 0.01` and `z̄ > 0`.
   - Print θ. In Phase 2, check once in an SVG side view that +Z is the face and not the mane. If it is the mane, rerun with `--knight-flip`, which uses θ + π.
4. **Close the mesh:**
   - `weld` at `WELD_TOL`, then `closedCheck`. If the mesh is not closed, retry at `WELD_RETRY_TOL`.
   - Whichever tolerance closes it, rebuild the triangles from the welded `verts` and `faces`, with degenerate faces dropped.
   - Re-run `weld` + `closedCheck` at `WELD_TOL` on the rebuilt mesh.
   - If it is still not closed, stop with *"<piece> is not closed (<k> open edges) — repair needed"* and write nothing.
5. **Write:** measure, then write `<role>.stl` as binary STL.

Then it:
- writes `chess-set.json` with the measured values rounded to 0.01, the §5.6 example fields, no `sha256`, and the knight `notes`;
- copies `LICENSE` from `path.join(src, '..', '..', 'LICENSE')`;
- prints an Appendix B–format table with the weld tolerance used and the closed status.

**`--measure`** prints the axial length and the base, swept and top diameters. With `--x0` and `--x1`, it keeps only the triangles whose three vertices lie in `[x0, x1]`. AC-SIZE-01 uses this with the queen's range from `layout.json`.

#### P4.12 `tools/mock-ncsender.mjs`

A Node `http` server on port **8777**. ncSender itself uses 8090.

**Routes** (paths and queries are parsed with `URL`/`URLSearchParams`; any path containing `..` is rejected):
- `/` serves `tools/harness.html`.
- `/api/plugins/com.infield.chessset/config-ui` serves `config.html` with `__SERVER_PORT__` replaced by 8777.
- `/api/plugins/com.infield.chessset/icon?file=` serves files from `com.infield.chessset/`.
- `/api/plugins/com.infield.chessset/settings`: GET and PUT.
- `/api/gcode-files/file/save` (POST) stores the file:
  - `.stl` → path and size only;
  - anything else → full content.
- `/api/gcode-files/file?path=` (GET): 404 when missing; otherwise the Phase 0 format, using stored content or `"(stl omitted)"`.
- `POST /__mock/fail-save {after:n}` makes the n-th next save return 500.
- `GET /__mock/store` returns the store as JSON, for `ui-check`.

**Logging:** every call is logged. Any call to a `load*`, `gcode-job` or `send-command` path is logged as `FORBIDDEN`.

**Persistence:** the store is saved to `.mock-store.json` on exit.

### P5. Test plan

#### P5.0 Fixtures (`tools/make-fixtures.mjs`)

**Meshes, written in Phase 1:**
- `cube.stl`: 10 mm, ASCII, closed, volume 1000.
- `cube-open.stl`: the same cube with one face (2 triangles) removed, leaving 4 open edges.
- `cube-gap.stl`: the cube with two shared vertices offset by 0.0005 mm.
- `cylinder-ascii.stl` and `cylinder-binary.stl`: r 5, length 20, along X, 64 segments.

**Bad packages, written once `packages/staunton-clarkerubber/` exists.** Each is a copy of the prepared package with one change:
- `missing-file`: `rook.stl` deleted.
- `schema-2`: `schema` set to 2.
- `shifted-axis`: the pawn translated by +0.5 mm in Y.
- `open-mesh`: one triangle of the pawn deleted.
- `script-name`: `name` set to `<script>x</script>`.

**Hand-written:** `tests/fixtures/layout-12in.json` (P5.5).

#### P5.1 `units.test.js`
- `roundHalfUp(7.15, 1) === 7.2`
- `roundHalfUp(412.75 − 405.6, 1) === 7.2`
- `roundHalfUp(0.32, 1) === 0.3`
- `ceilTo(41.2, 1) === 41.2`
- `ceilTo(41.14, 1) === 41.2`
- `fmt(457.2, 'in') === '18.00 in (457.2 mm)'`
- `fmt(304.8, 'mm') === '304.8 mm (12.00 in)'`
- `parse('2.5', 'in') === 63.5`
- `parse('abc', 'mm') === null`

#### P5.2 `stl.test.js`
- The ASCII and binary cylinders parse to the same triangles within 1e-6.
- `writeBinary` → `parseStl` round-trips exactly at float32 precision.
- `writeAscii` → `parseStl` round-trips within 5e-5.
- Base64 round-trips 100,001 random bytes exactly.
- A 0-triangle file and an 83-byte file both throw.
- `test_files/test_two_pawns_necked.stl` parses.

#### P5.3 `measure.test.js` and `manifest.test.js`

**Mesh checks:**
- `cube.stl`: closed, volume 1000.
- `cube-open.stl`: not closed, 4 open edges.
- `cube-gap.stl`: welds closed.
- The cylinder: `swept = base = top = 10`, axial length 20.
- `checkPiece` with `digest` undefined and a `sha256` present returns one note and no error.

**Bad manifests** each give exactly one error, naming the field:
- `schema: 2`
- `version: "../x"`
- `id: "A B"`
- missing `pawn`
- `file: "../king.stl"` (path rule only; no presence error)
- `file: "King.stl"` when only `king.stl` exists
- `units: "cm"`
- `frame: "y-up"`

**Prepared package validates.** Skipped when `packages/staunton-clarkerubber/` is absent. It must pass `validateManifest` and `checkPiece` for all six pieces, and the measurements must match Appendix B within 0.1 mm.

**Bad packages.** Skipped when they are absent. Each fails with the expected check:
- `missing-file`: presence;
- `schema-2`: schema;
- `shifted-axis`: axis offset;
- `open-mesh`: closed;
- `script-name`: passes validation (the name is shown as text; see P5.8).

#### P5.4 `planner.test.js` and `settings.test.js`

The planner tests use the Appendix B dimensions.

**§11 at 12 in × 2 in:**
- exactly: K Q P | R P P P | R P P P | **B B N** | **N P**;
- used: 260.0 / 256.1 / 256.1 / 244.8 / 139.5;
- leftover: 0.3 / 4.3 / 4.3 / 15.6 / 120.8.

**§11 at 18 in × 2 in:**
- exactly: **K Q B P P** | **B R P P P P** | N N R P P;
- used: 409.6 / 405.6 / 361.3;
- leftover: 3.2 / 7.2 / 51.4.

**Equivalent cases:**
- 2½ in stock gives the same plans.
- Queen base 36 mm and 40 mm each give 5 blanks per side on 12 in stock and 3 on 18 in stock.

**AC-PLAN-02:** every plan contains exactly 1 K, 1 Q, 2 B, 2 N, 2 R and 8 P.

**AC-FIT-01:**
- 38.1 mm square stock gives 5 `TOO_WIDE` errors (every piece but the pawn), with `minWidth` 41.2.
- The largest queen base that fits is 47.7 on 2 in stock and 60.4 on 2½ in stock (searched in 0.1 mm steps).

**AC-FIT-03:**
- 100 mm stock gives `TOO_LONG` for the king, with `minLength` **143.6** (king 99.06 + reservations 44.45 = 143.51, rounded up to 0.1).
- 1000 mm stock gives `TOO_LONG_FOR_MACHINE`.

**AC-FIT-04:**
- 50.8 → `jawSet` `alternate`
- 19.05 → `jawSet` `standard` (returned even though `TOO_WIDE` errors are present)
- 24 → `JAW`, nearest **22.86** (shown as 22.9)
- 24.5 → `JAW`, nearest 25.4
- 70 → `JAW`, nearest 63.5

**Other planner checks:**
- **`NO_USABLE`:** chuck 200 + tail 200 on 300 mm stock gives exactly one error, `NO_USABLE`. Length checks are skipped.
- **`RANGE`:** gap 5 gives a `RANGE` error and no other errors.
- **Neck:** neck 31 mm gives `NECK_WIDER_THAN_BASE` (pawn base 30.48).
- **Covered tips** at the defaults: `['queen', 'bishop']`.
- **Timing:** `plan()` on 18 in stock completes in under 100 ms (`performance.now`).

**`settings.test.js`:**
- When the fake GET fails, `save` throws `SettingsError` and sends no PUT.
- `save({lastInputs:{gap:12}})` keeps `packages` and the other `lastInputs` fields.

#### P5.5 `blank.test.js` and `layout.test.js`

Skipped when `packages/staunton-clarkerubber/` is absent.

- **Two-pawn blank** (`pawn.stl`, scale 1.27, gap 10, necks mode):
  - welded and closed-checked, it is closed;
  - min X is 0 ± 1e-6;
  - max X is 119.22 ± 0.05.

  The 119.22 figure assumes the Appendix B pawn length of 43.00.
- **`cam` mode:** the same blank has no neck triangles.
- **KQP blank:** the queen slice from x 109.06 to 195.42 measures a base diameter of 38.1 ± 0.05 (AC-SIZE-01).
- **`layout-12in.json`** is written by hand from §11. `layout.test.js` compares `buildLayout(...)` (with `createdAt` fixed) against it field by field.

| Blank | Pieces (x ranges, mm) | Used | Leftover |
|---|---|---|---|
| 1 | K 0–99.06; Q 109.06–195.42; P 205.42–260.03 | 260.03 | 0.32 |
| 2 | R 0–62.23; P 72.23–126.84; P 136.84–191.45; P 201.45–256.06 | 256.06 | 4.29 |
| 3 | same as 2 | 256.06 | 4.29 |
| 4 | B 0–74.93; B 84.93–159.86; N 169.86–244.79 | 244.79 | 15.56 |
| 5 | N 0–74.93; P 84.93–139.54 | 139.54 | 120.81 |

#### P5.6 `exporter.test.js`

Uses a fake `fm` and a fake `call` that both record their calls.

- **Write order:** `LICENSE-models.txt` → maple 01 STL, maple 01 sidecar … → walnut 05 STL, walnut 05 sidecar → `layout.json`.
- **Sidecar:** for 12 in × 2 in square defaults, `maple_blank_01.rotary.json` has `turningAxis` X, `chuckEnd` min, `onAxis` model-origin, `upAtZero` +Z, stock {square, 50.8, 304.8}, `chuckOffset` 25.4, `modelLength` 260.03, `jawSet` alternate.
- **Free folder:** with the probe answering 200 for `job/` and 404 for `job (2)/`, the export goes to `job (2)`.
- **Encoding:** the probe URL for `chess set/job (2)/LICENSE-models.txt` is encoded (`chess%20set%2Fjob%20(2)%2F…`).
- **Failure:** when save #3 fails, `ExportError` is thrown, and there are no further saves and no `layout.json`.
- **Job names:** `../x` and `.hidden` are rejected.
- **Default name:** at queen base 40 it is `staunton-clarkerubber Q40 457x51`.
- **No forbidden calls:** no call path matches `/load|gcode-job|send-command/`.

#### P5.7 Acceptance criteria by phase

| AC | Phase | Method |
|---|---|---|
| AC-PKG-01 | 3 | List the ZIP; no `.stl` inside |
| AC-PKG-02 | 3 | Manual in ncSender: import the prepared package |
| AC-PKG-03 | 2 / 3 | Unit test (P5.3 bad packages); manual import of each bad package |
| AC-PKG-04 | 3 | Manual: rebuild and reinstall the ZIP; disconnect the network; reopen |
| AC-SEC-01 | 3 / 4 | Unit test (P5.3); ui-check step 9 |
| AC-IN-01 | 4 | Unit test (`RANGE`); ui-check step 5 |
| AC-IN-02 | 4 | ui-check step 4 |
| AC-IN-03 | 5 | Manual: "Maple only" exports maple blanks only |
| AC-SIZE-01 | 5 | Unit test (P5.5 KQP queen slice); `--measure --x0 --x1` on an exported blank |
| AC-FIT-01 to AC-FIT-04 | 1 / 4 | Unit tests (P5.4); ui-check step 5 |
| AC-PLAN-01 to AC-PLAN-04 | 1 / 4 | Unit tests (P5.4); ui-check step 3 (AC-PLAN-03) |
| AC-UI-01 | 4 | Manual: preview to scale |
| AC-EXP-01 / 02 / 05 | 5 | Unit tests (P5.6); ui-check steps 6, 7 and 10 |
| AC-EXP-03 | 5 | Unit test (P5.5) |
| AC-EXP-04 | 5 / 6 | Manual in Rotary CAM |
| AC-EXP-06 | 5 | Unit test (covered tips); manual check of the plan table |
| AC-EXP-07 | 5 | ui-check step 8 |
| AC-EXP-08 | 5 | Unit test (P5.6 sidecar case); Rotary CAM applying it is a manual check once O-13 is done |

#### P5.8 `tools/ui-check.mjs`

The script starts the mock itself. It launches Playwright with `chromium.launch({executablePath: process.env.CSC_CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'})`, then opens `http://localhost:8777/`.

`--until=plan` runs steps 1–5, 9 and 11.

1. Open the dialog. Zero page errors.
2. `page.setInputFiles('input[webkitdirectory]', <absolute path of packages/staunton-clarkerubber>)`. The package shows as installed.
3. Set stock length to 12 in. Expect 5 cards.
4. Toggle units to mm. The first card shows `304.8 mm (12.00 in)`.
5. Type width 38.1 (mm). The error box lists 5 pieces. Then set the width back to 50.8 and type gap 5: a `RANGE` message appears. Then set the gap back to 10.
6. Export. `GET /__mock/store` holds 10 STLs, `layout.json` and `LICENSE-models.txt`.
7. Export again. The `(2)` folder is used.
8. `POST /__mock/fail-save {after:3}`, then export. The Download ZIP button appears.
9. Import `tests/fixtures/bad-packages/script-name/`. The name shows literally as `<script>x</script>`.
10. The mock log has zero `FORBIDDEN` lines.
11. Close the dialog (the `close-plugin-dialog` message), reopen it through the harness, and check zero page errors.

### P6. Order of work and checkpoints

| Phase | Depends on | Checkpoint |
|---|---|---|
| 0 | — | Facts recorded in the spec; `SUPPORT_MODE`, `FM_HANDOFF`, `PACKAGE_ROOT` and `STORE_SUFFIX` set |
| 1 | — (can run alongside Phase 0) | `npm test` passes (P5.1–P5.4) |
| 2 | 1 | Prepared package and bad packages pass; Appendix B "Closed after weld" filled in |
| 3 | 0 (read-back format, file types), 2 | ZIP installs; Phase 3 ACs pass |
| 4 | 3 | `ui-check --until=plan` passes |
| 5 | 0, 4 | `npm test` and `ui-check` pass in full; Phase 5 ACs pass |
| 6 | 5 | O-4 and O-10 closed; version 0.2.0 |
