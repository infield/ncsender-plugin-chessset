# Chess Set Creator — ncSender plugin feature spec

Owner: Marc Infield · Revision 3 · October 30, 2026 · Status: draft, not implemented

Revision 2 restructured the spec by topic. It answered the Stage 5–7 reviews and added facts checked against the ncSender source and the Staunton model files. Revision 3 applies the fixes from the Stage 7 re-audit (`critic_report.md`, resolved in `goldfish_review_report.md`). Earlier revisions are in `_archive/`. The woodworking build notes live in `Wooden_Staunton_Build_Notes.md`.

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
| **Chuck reservation / tailstock reservation** | Length at each end of the blank that is not available for pieces: the gripped length plus Rotary CAM's end tenon and parting neck. |
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
6. In Rotary CAM, open each blank STL from that folder, set the stock and reservations shown on the plan's per-blank card (and listed in `layout.json`), and generate toolpaths. Run Rotary CAM's simulation and check clearance to the chuck and tailstock before the first cut. How Rotary CAM places the model along the axis is [O-10].

## 5. Requirements

### 5.1 Inputs

Internal unit is mm. The display toggle chooses the primary unit (default: inches); the other unit appears in parentheses. Stored and exported values are always mm. [P]

All defaults and valid ranges below are [P].

| Input | Status | Default | Valid range | Notes |
|---|---|---|---|---|
| Model package | [C] | last used | an installed package | |
| Queen base diameter | [C] | 38.1 mm (1.5 in) | 15–100 mm | Main sizing control. The default gives a 99 mm (3.9 in) king with the Staunton package. |
| Stock length | [C] | 457.2 mm (18 in) | 50 mm – max blank length | Examples 12 in and 18 in. |
| Max blank length | [P] | 810 mm (31.9 in) | — | The Vortex standard track length. Setting only; real capacity between chuck and tailstock is [O-3]. |
| Stock shape | [C] | Square | square / round | |
| Stock width | [C] | 50.8 mm (2 in) | 10–200 mm | Side of a square, or diameter of a round. Examples 2 in and 2½ in. |
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

- **Gate:** `exporter.js` (§5.5, §5.8) is not built until O-1, O-2 and O-10 are answered. Planning, import and preview (§5.1–§5.4, §5.6) do not depend on them. [C]
- **Format:** ASCII STL in mm, one file per blank. ASCII is required because the File Manager stores text (§12). Vertex coordinates are written with at least 4 decimal places in mm. [P]
- **Frame:** X is the rotary axis, and the axis passes through Y = Z = 0. X = 0 is the chuck end of the first piece, and +X points toward the tailstock. In Rotary CAM: Turning axis **X**, On axis **Model origin**. Axial placement relative to the chuck is [O-10]. [P]
- **Orientation:** every piece has its base toward the chuck (−X). Each knight's face points +Z. [P]
- **Connecting necks:** each gap holds a cylinder of the connecting-neck diameter that overlaps each neighbour by 0.5 mm. This keeps the blank one connected body, so roughing cannot cut through a gap and part the blank early. [P]
  - A piece is affected when `scaled top Ø < neck Ø`. That tip is covered by the neck and finished by hand after parting. With the Staunton package at the default 38.1 mm queen base, this affects the queen (5.3 mm top) and bishop (5.0 mm top).
  - The plan lists the affected pieces.
- **No neck at the outer ends.** Rotary CAM's "Parting — neck the ends" pass makes those. [P]
- **Not in the STL:** the stock and the end reservations. They are recorded in `layout.json`, and shown on a per-blank card in the plan in mm and inches, so the user can enter them in Rotary CAM. [P]
- **Shells:** pieces and necks are separate closed shells that overlap. There is no boolean union. Whether Rotary CAM accepts this is [O-2].

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
- The default job name is `<package id> Q<base> <length>x<width>`, for example `staunton-clarkerubber Q38.1 457x51`. Job names may contain letters, digits, space and `. _ - ( ) x`. `/`, `\`, `..` and a leading `.` are rejected. [P]
- The plugin lists `chess set/` with `GET /api/gcode-files`. If the job folder already exists, it appends ` (2)`, ` (3)`, … to the folder name. `file/save` overwrites existing files (§12), so this check is what protects earlier work. [P]
- Folder contents: [P]
  - `maple_blank_01.stl` … and `walnut_blank_01.stl` … (two-digit numbers)
  - `layout.json`
  - `LICENSE-models.txt`, which copies the package licence and attribution
- `layout.json` contains: [P]
  - plugin version
  - package id, version and name
  - scale and queen base diameter
  - units (`mm`) and frame
  - stock length, width and shape
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
| Stock length > max blank length | planning | both values | [P] |
| File Manager save failed | export | path and server reply; offer Download ZIP | [P] |

## 6. Proposed architecture

This follows the conventions in `../AAxis/CLAUDE.md`: ncSender 2.x plugin model, all UI and logic in `config.html`, one tool-menu entry, and ncSender CSS variables. Everything in this section is [P].

```text
com.infield.chessset/          (plugin ZIP)
├── manifest.json     id com.infield.chessset · version 0.1.0 · minAppVersion 2.0.0
│                     platforms {"pro-v2":"2.0.0"} · category "utility" · configUi config.html
│                     permissions ["gcode.modify"] · events []
│                     toolMenu [{label:"Chess Set Creator", clientOnly:true}]
├── config.html       dialog shell; loads lib/app.js via /api/plugins/com.infield.chessset/icon?file=lib/app.js
├── lib/app.js        bundled (esbuild) from src/
├── lib/worker.js     bundled Web Worker for STL parsing and writing
├── icon.svg · README.md · CHANGELOG.md · LICENSE
src/                           (repo only; not in plugin ZIP)
├── stl.js            parse binary/ASCII STL; write ASCII STL; transform (scale, translate)
├── measure.js        bounds, axial length, base/swept/top diameter, weld + closed-mesh check
├── package.js        manifest validation, import from <input webkitdirectory>, save to File Manager
├── planner.js        fit checks + exact packing (pure; no DOM, no network)
├── exporter.js       build each blank mesh (pieces + necks), layout.json, free folder name, save
├── fm.js             File Manager + settings REST client (2.x routes)
└── ui.js             form, plan table, per-blank cards, 2-D side-view preview (SVG)
```

- **Runs in:** the browser dialog only. There is no server-side module, so `events` is empty. A server-module crash while loading would quarantine the plugin@version (`../AAxis/CLAUDE.md`, item 45); that cannot happen here.
- **Data flow:** package (File Manager) → validate → scale → fit checks → plan → preview → export (File Manager).
- **Planning uses manifest dimensions only** (scaled by the measured queen base). Meshes are loaded only for export.
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
| R10 | Chuck or tailstock collision from a wrong axial datum, or a reservation mistyped into Rotary CAM. | Cutter or spindle strikes the chuck jaws or tailstock centre. | Preferred: Rotary CAM reads `layout.json` (O-10). Otherwise: the per-blank card shows stock and reservations in mm and inches, and the user runs Rotary CAM's simulation and checks clearance before every first cut. | Open |
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
| AC-PLAN-01 | The worked examples in §11 reproduce exactly: blank counts, piece lists and order, and used lengths to 0.1 mm. | §5.4, §11 |
| AC-PLAN-02 | Each side's plan contains exactly 1 K, 1 Q, 2 B, 2 N, 2 R and 8 P. | §5.4 |
| AC-PLAN-03 | Changing any input recomputes the plan with no extra click. | §5.4 |
| AC-PLAN-04 | Maple and walnut blank counts are reported separately and are equal. | §5.4 |
| AC-UI-01 | The 2-D preview draws each blank to scale with the reservations, pieces and necks. | §6 |
| AC-EXP-01 | Export creates `chess set/<job>/` with one STL per blank, `layout.json` and `LICENSE-models.txt`. It leaves other File Manager files untouched. | §5.8 |
| AC-EXP-02 | Exporting twice creates `<job> (2)`; nothing is overwritten. | §5.8 |
| AC-EXP-03 | Every exported STL is in mm. Its X axis is the rotary axis through Y = Z = 0, the first piece's base is at X = 0, and its maximum X equals the blank's used length ± 0.05 mm. | §5.5 |
| AC-EXP-04 | Every blank STL loads in Rotary CAM with Turning axis X and On axis Model origin, sits at the expected axial position, and shows the expected pieces joined by necks. Depends on O-1, O-2 and O-10. | §5.5 |
| AC-EXP-05 | No plugin action calls a motion, job or program-load endpoint. | §2 |
| AC-EXP-06 | The plan lists the pieces whose top is covered by the neck. | §5.5 |
| AC-EXP-07 | A forced save failure offers Download ZIP, and the incomplete folder has no `layout.json`. | §5.8 |

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

Largest queen base that fits, with the default allowance: **47.7 mm** on 2 in stock and **60.4 mm** on 2½ in stock.

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
| O-2 | Does Rotary CAM accept overlapping closed shells (pieces + necks) as one part? | Rotary CAM author | **Blocks exporter build.** |
| O-3 | The real maximum blank length between chuck and tailstock on the Vortex. | Marc (measure) | 810 mm setting |
| O-4 | Right neck diameter, gap and finishing-cutter diameter for an 18 in blank. Should thin-topped pieces go at the tailstock end, or pieces be flipped? | Marc (prototype) | 7.6 mm neck, 10 mm gap, 6.35 mm cutter, all bases toward the chuck |
| O-5 | Closed in Revision 3: the default queen base diameter is the [P] value in §5.1. | — | — |
| O-6 | Is manual piece-by-piece blank selection wanted? | Marc | No (v1 is full-side automatic) |
| O-7 | Should ncSender block loading non-G-code files from the File Manager? | Marc → ncSender | Request it |
| O-8 | Which manifest `permissions` does a file-only plugin need? | Implementer (read `PluginModels.cs`) | `["gcode.modify"]`, matching ncCAM and AAxis |
| O-9 | Support ncSender 0.3.x? | Marc | No |
| O-10 | How does Rotary CAM position Model origin along the rotary axis, relative to the chuck face or stock end? Can it read stock size and reservations from a sidecar file? | Rotary CAM author | **Blocks exporter build.** |
| O-11 | Are per-piece size overrides needed? | Marc | No |

## 14. References

- ncSender: <https://github.com/siganberg/ncSender>. Plugin model notes: `../AAxis/CLAUDE.md`.
- ncCAM, a reference for the plugin build and the free-path convention: <https://github.com/siganberg/ncsender-plugin-nccam>.
- Staunton models: <https://github.com/clarkerubber/Staunton-Pieces> (MIT).
- FIDE equipment rules, effective March 1, 2026: <https://handbook.fide.com/chapter/ChessEquipmentWithoutElectronicComponenets032026>. The misspelling is FIDE's own URL.
- Reviews: `zoom_out_report.md`, `comprehension_report.md`, `critic_report_rev1.md`, `critic_report.md`, `goldfish_review_report.md`.

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
