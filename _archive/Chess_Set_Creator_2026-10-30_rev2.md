# Chess Set Creator — ncSender plugin feature spec

Owner: Marc Infield · Revision 2 · October 30, 2026 · Status: draft, not implemented

Revision 2 restructures the spec by topic. It answers the Stage 5–7 reviews (`zoom_out_report.md`, `comprehension_report.md`, `critic_report.md`) and adds facts checked against the ncSender source and the Staunton model files. Revision 1 is in `_archive/`. The woodworking build notes now live in `Wooden_Staunton_Build_Notes.md`.

**Status tags.** Every requirement has exactly one tag:
- **[C]** Confirmed by the owner.
- **[P]** Proposed default for v1. It can change without reopening the spec.
- **[O]** Open. See [Open questions](#13-open-questions).
- **[v2]** Confirmed intent, scheduled after v1.

---

## 1. Problem statement

Turning a full chess set on the rotary axis means laying 32 pieces out across many turning blanks by hand in CAD. For every blank you have to:
- scale six models consistently
- check that each piece fits the stock width
- fit pieces end to end within the usable length between chuck and tailstock
- add connecting necks
- export one model to hand to CAM

Any change to piece size or stock length means redoing all of it. Chess Set Creator does this inside ncSender. You pick a model set, a queen base diameter and a stock size. It reports how many maple and walnut blanks you need, then writes one ready-to-machine STL per blank into a File Manager folder. **Rotary CAM** (an ncSender plugin, unreleased) picks that folder up to generate toolpaths.

## 2. Goals and non-goals

### Goals (v1)
1. Scale a prepared six-piece model set uniformly from one control: queen base diameter. [C]
2. Check the stock cross-section and length against the scaled pieces. [C]
3. Compute the fewest blanks per side for 16 pieces (1 K, 1 Q, 2 B, 2 N, 2 R, 8 P), with an exact search. [C]
4. Report blank counts for maple (light) and walnut (dark) separately, plus total stock to buy. [C]
5. Write one STL per blank, plus a layout file, into a **chess set** folder in the ncSender File Manager, ready for Rotary CAM. [C]
6. Load model geometry from a separate model package, not from plugin code. [C]

### Non-goals
- Generating toolpaths or G-code. Rotary CAM does that. [C]
- Starting machine motion. The plugin never calls `/api/gcode-job`, `/api/send-command` or `/api/gcode-files/load*`. [C]
- Shrinking pieces automatically to fit stock. [C]
- Weight pockets and felt recesses. These are a separate underside operation; see the build notes. [C]
- Extra promotion queens. [C]
- Converting from CAD formats (SLDPRT, STEP, DWG). Packages ship STL. [P]
- Manual piece-by-piece blank selection. [O]
- Tracking which pieces have been cut. [v2]

## 3. Glossary

| Term | Meaning |
|---|---|
| **Side** | One colour's 16 pieces. The light side is maple; the dark side is walnut. "Batch" and "material" are not used. |
| **Blank** | One length of turning stock, held between chuck and tailstock. |
| **Stock length (L)** | The blank's full length before machining. |
| **Chuck reservation / tailstock reservation** | Length at each end of the blank that is not available for pieces: the gripped length plus Rotary CAM's end tenon and parting neck. |
| **Usable length** | `L − chuck reservation − tailstock reservation`. |
| **Gap** | The axial space between two adjacent pieces in a blank. It is filled by a connecting neck. |
| **Connecting neck** | A cylinder joining adjacent pieces, so the blank stays one connected body during machining. |
| **Radial allowance** | Material left between the piece's swept diameter and the stock's flat or round surface, on each side. |
| **Axial length** | A piece's length along the rotary axis, from base to top. |
| **Swept diameter** | Twice the largest distance from the rotary axis to any point on the piece. This decides stock fit; it matters for the knight, which isn't round. |
| **Base diameter** | Twice the largest distance from the axis to any vertex within 1.0 mm (source units) of the base plane. |
| **Model package** | A folder with `chess-set.json` and six STL files for one design. Other names used in revision 1 (set definition, design package, starter set) all mean this. |
| **Rotary CAM** | The unreleased ncSender plugin that turns an STL or STEP part into rotary G-code (corners, roughing, finishing, indexed, parting). It is the only downstream consumer. |
| **File Manager** | ncSender's server-side file store (`/root/.config/ncSender/gcode-files` on the shop machine), reached through `/api/gcode-files/*`. |

## 4. Users and flow

One user: Marc, on ncSender 2.x Pro (v2.0.271 at time of writing), working at the shop machine. The machine is a Sienci AltMill with a SuperLongBoard-EXT (grblHAL) and a Vortex rotary on A.

1. Open **Chess Set Creator** from the tool menu.
2. Pick an installed model package. With none installed, import one from a local folder.
3. Enter the queen base diameter, stock length, stock width and shape, and the allowances.
4. Read the plan: pieces' scaled sizes, fit checks, blanks per side, and each blank's layout with leftover length.
5. Click **Export to File Manager**. The plugin writes `chess set/<job>/` with all the blank STLs and `layout.json`.
6. In Rotary CAM, open each blank STL from that folder, set the stock and reservations listed in `layout.json`, and generate toolpaths.

## 5. Requirements

### 5.1 Inputs

Internal unit is mm. The display unit is a toggle (default: inches). Lengths are shown mm first with inches in parentheses, following shop convention. [P]

| Input | Default [P] | Valid range | Notes |
|---|---|---|---|
| Model package | last used | an installed package | [C] |
| Queen base diameter | 38.1 mm (1.5 in) | 15–100 mm | Main sizing control [C]. The default gives a 99 mm (3.9 in) king with the Staunton set. |
| Stock length | 457.2 mm (18 in) | 50 mm – max blank length | Examples 12 in and 18 in [C]. |
| Max blank length | 810 mm (31.9 in) | — | The Vortex standard track length. Setting only; real capacity between centres is [O]. |
| Stock shape | Square | square / round | [C] |
| Stock width | 50.8 mm (2 in) | 10–200 mm | Side of a square, or diameter of a round. Examples 2 in and 2½ in [C]. |
| Chuck reservation | 25.4 mm (1 in) | 0–200 mm | Includes jaw grip, tenon and end neck. |
| Tailstock reservation | 19.05 mm (0.75 in) | 0–200 mm | |
| Gap | 10.0 mm (0.39 in) | 2–50 mm | Must hold Rotary CAM's parting cut (its demo uses a 0.3 in neck plus 0.02 in clearance each side). |
| Connecting-neck diameter | 7.6 mm (0.3 in) | 3 mm – stock width | Matches Rotary CAM's default parting neck. |
| Radial allowance | 1.5 mm (0.06 in) | 0–10 mm | Per side. |
| Sides | Both | maple / walnut / both | "Maple only" plans and exports maple only. Side names are fixed labels in v1 [P]. |

Both sides share one set of stock and allowance settings in v1. Separate settings per side are [v2].

An input outside its range blocks planning and shows the range next to the field.

### 5.2 Sizing [C]

- `scale = requested queen base diameter ÷ package queen base diameter`. Every piece gets that same scale, so the design's proportions hold.
- The plan shows each scaled piece's axial length, base diameter and swept diameter.
- Export tolerance: the exported queen's measured base diameter is within ±0.05 mm of the request. [P]
- Individual piece overrides are not in v1. [O]

### 5.3 Stock fit [C]

Fit is checked for every piece type, not only the queen.

- **Cross-section:** `swept diameter + 2 × radial allowance ≤ stock width`. This applies to both square and round stock: for square stock the limit is the inscribed circle, which Rotary CAM's "Corners" pass turns the square down to.
- **Length:** each piece's axial length ≤ usable length.
- If any piece fails, planning stops. The message names the piece, its size, the limit, and the smallest stock width or length that would work. The plugin doesn't shrink pieces.

### 5.4 Stock planning

**Fit rule for one blank.** [C] A blank holding n pieces fits when

`Σ axial length + (n − 1) × gap ≤ usable length`

End reservations are counted once, in usable length. Gaps appear only between pieces.

**Method.** [P] Exact search, not a heuristic. A side has at most 2 × 2 × 3 × 3 × 3 × 9 = 972 piece-count combinations, so a memoised search over the remaining counts is instant.
1. Minimise the number of blanks.
2. Tie-break: maximise the used length of blank 1, then blank 2, and so on. With the blank count fixed, total waste is fixed too. This rule puts the waste into the last blank as one useful offcut instead of spreading it out.
3. Within a blank, place pieces from the chuck end in descending axial length. Equal lengths go in the order K, Q, B, N, R, P.
4. The result is the same every time for the same inputs.

**Per side.** Both sides use the same geometry, so they get the same plan [C]. The plan is shown once and labelled "per side × 2" when both sides are selected.

**Outputs shown:** [C]
- blanks per side
- total blanks
- stock to buy (blanks × stock length)
- for each blank: its pieces in order, used length, and leftover length

### 5.5 Export geometry [P]

Rotary CAM lets the user choose the turning axis (X/Y/Z) and "On axis: Model origin". The export fixes one convention, which `layout.json` records:

- **Format:** ASCII STL in mm, one file per blank. ASCII is required because the File Manager stores text (§5.7).
- **Frame:** X is the rotary axis, and the axis passes through Y = Z = 0. X = 0 is the chuck end of the first piece, and +X points toward the tailstock. In Rotary CAM: Turning axis **X**, On axis **Model origin**.
- **Orientation:** every piece has its base toward the chuck (−X). Each knight's face points +Z.
- **Connecting necks:** each gap holds a cylinder of the connecting-neck diameter that overlaps each neighbour by 0.5 mm. This keeps the blank one connected body, so roughing can't cut through a gap and part the blank early.
  - Where a piece's top is narrower than the neck, the neck covers the tip. That tip is finished by hand after parting. With the Staunton set this affects the queen (4.2 mm top) and bishop (4.0 mm top) at scale 1.
  - The plan lists the affected pieces.
- **No neck at the outer ends.** Rotary CAM's "Parting — neck the ends" pass makes those.
- **Not in the STL:** the stock and the end reservations. They are recorded in `layout.json` so the user can enter them in Rotary CAM.
- **Shells:** pieces and necks are separate closed shells that overlap. There is no boolean union. Whether Rotary CAM accepts this is [O-1].

### 5.6 Model packages

**v1** [C, scope per owner]: one prepared package, imported from a local folder, with a small manifest. Multiple packages, a set selector, GitHub download, update offers and version pinning are [v2] (§5.9).

**Package rules** [P]:
- The package contains `chess-set.json`, the six STL files (binary or ASCII), and `LICENSE`.
- Models are already in the export frame of §5.5: X axis, base plane at X = 0 facing −X, axis through the origin, knight face toward +Z. The plugin checks this and does not realign models. Alignment is a one-time preparation job done outside the plugin.
- The manifest maps piece roles to file paths. Paths are relative, may not contain `..` or start with `/`, and are case-sensitive.

**Manifest, annotated example (schema 1).** All fields are required unless marked optional.

```jsonc
{
  "schema": 1,                       // integer; v1 accepts exactly 1
  "id": "staunton-clarkerubber",     // [a-z0-9-]+
  "version": "1.0.0",                // package version, semver
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

1. `chess-set.json` parses, `schema` is 1, and every required field is present with the right type.
2. All six files exist inside the package folder, and each parses as an STL with at least one triangle.
3. Each mesh is closed: every edge is shared by exactly two triangles, and volume is above 0.
4. Measured values agree with the manifest within ±0.1 mm:
   - axial length
   - base diameter
   - swept diameter
   - axis offset from the origin, ≤ 0.1 mm
   - base plane, at X = 0 ± 0.1 mm
5. Units are `mm` or `in`; inch packages are converted to mm on import.

These checks prove the files are usable meshes in the agreed frame. They do not prove a given cutter can machine every surface. Rotary CAM reports that separately.

### 5.7 Storage [P]

All of these routes were checked in ncSender source at commit `2f8a659` (October 30, 2026).

| Data | Where | API |
|---|---|---|
| Installed package | File Manager: `Chess Set Creator/sets/<id>@<version>/` (manifest, LICENSE, six ASCII STLs) | `POST /api/gcode-files/file/save {path, content}`; read back with `GET /api/gcode-files/file?path=` |
| Settings, installed-package list, last job | Plugin settings JSON | `GET`/`PUT /api/plugins/com.infield.chessset/settings`. PUT replaces the whole object, so merge with `DEFAULTS` first. |
| Exports | File Manager: `chess set/<job>/` | `POST /api/gcode-files/file/save` |

Behaviour of these routes, from the source:
- `file/save` accepts any path and extension under the storage folder, creates missing folders, and rejects paths that escape the folder.
- It writes text only (`File.WriteAllTextAsync`), so binary STL is converted to ASCII before saving.
- Requests are capped at 200 MB.
- The File Manager is on the server, so everything stored there survives plugin updates and can be reached from any client.

A **job** is the export folder plus its `layout.json`. v1 keeps the last job's inputs in settings so the dialog reopens with them. Completion tracking is [v2].

### 5.8 Export [C]

- Path: `chess set/<job name>/`. The default job name is `<package id> Q<base> <length>x<width>`, for example `staunton-clarkerubber Q38.1 457x51`.
- If that folder already exists, append ` (2)`, ` (3)`, … to the folder name. Existing files are never overwritten.
- Folder contents:
  - `maple_blank_01.stl` … and `walnut_blank_01.stl` … (two-digit numbers)
  - `layout.json`
  - `LICENSE-models.txt`, which copies the package licence and attribution
- `layout.json` contains:
  - plugin version
  - package id, version and name
  - scale and queen base diameter
  - units (`mm`) and frame
  - stock length, width and shape
  - both reservations, gap, neck diameter and radial allowance
  - for each blank: side, file name, pieces in order with their X ranges, used length and leftover length
- **Fallback:** if a save fails, the plugin offers **Download ZIP** of the same folder and leaves any files already written in place.
- Export is allowed only when the plan has no errors.

### 5.9 Distribution [v2]

Confirmed intent, scheduled after v1:
- a set selector for several installed packages
- in-plugin download of a starter package from a tagged GitHub release, using the same format as local import
- SHA-256 checksums verified against the release
- an update offer that never changes an existing job
- job records that pin the package version

Before v2 is specified, check one thing: whether the dialog can fetch GitHub release assets directly. Browser cross-origin rules may require a server-side fetch.

### 5.10 Errors

| Condition | Blocks | Message must say |
|---|---|---|
| No package installed | planning | "Import a model package folder" (v2: or download one) |
| Manifest or schema invalid | import | file, field, and the expected value |
| Missing or unreadable STL | import | role and path |
| Mesh not closed, or measurements disagree with the manifest | import | file, the check, measured vs declared |
| Piece too wide for the stock | planning | piece, swept diameter + 2 × allowance, stock width, the minimum width needed |
| Piece too long for the usable length | planning | piece, axial length, usable length, the minimum stock length needed |
| Stock length > max blank length | planning | both values |
| File Manager save failed | export | path and server reply; offer Download ZIP |

## 6. Proposed architecture [P]

This follows the conventions in `../AAxis/CLAUDE.md`: ncSender 2.x plugin model, all UI and logic in `config.html`, one tool-menu entry, and ncSender CSS variables.

```
com.infield.chessset/
├── manifest.json     id com.infield.chessset · category "utility" · events [] · toolMenu [{label:"Chess Set Creator", clientOnly:true}]
├── config.html       dialog shell; loads lib/app.js via /api/plugins/com.infield.chessset/icon?file=lib/app.js
├── lib/app.js        bundled (esbuild) from src/
├── icon.svg · README.md · CHANGELOG.md · LICENSE
src/
├── stl.js            parse binary/ASCII STL; write ASCII STL; transform (scale, translate)
├── measure.js        bounds, axial length, base/swept/top diameter, closed-mesh check
├── package.js        manifest validation, import from <input webkitdirectory>, save to File Manager
├── planner.js        fit checks + exact packing (pure; no DOM, no network)
├── exporter.js       build each blank mesh (pieces + necks), layout.json, free folder name, save
├── fm.js             File Manager + settings REST client (2.x routes)
└── ui.js             form, plan table, 2-D side-view preview (SVG)
```

- **Runs in:** the browser dialog only. There is no server-side module, so `events` is empty and there's no quarantine risk.
- **Data flow:** package (File Manager) → validate → scale → fit checks → plan → preview → export (File Manager).
- **Preview:** a 2-D SVG side view of each blank, drawn to scale, showing the stock outline, reservations, piece silhouettes and necks. A 3-D view is [v2].
- **Manifest permissions:** [O-8]. The plugin needs no motion permissions.
- **Platforms:** ncSender 2.x (`pro-v2`) only. Support for 0.3.x is [O].
- **Testing:** `planner.js` and `measure.js` are pure, so they get unit tests built from the worked examples in §11. The dialog is checked in the headless harness described in AAxis `CLAUDE.md` §15.

## 7. Alternatives considered

| Decision | Chosen | Rejected and why |
|---|---|---|
| Sizing control | Queen base diameter [C] | *King height*: the owner chose base diameter, which ties straight to stock width. *Per-piece overrides*: deferred. |
| Package geometry | STL + JSON manifest | *STEP*: carries units and solids, and Rotary CAM reads it, but the plugin would need a STEP kernel (ncCAM ships a 7.6 MB wasm one) just to rescale and lay out. The manifest's `units` field closes STL's gap. |
| Where models live | Separate package [C] | *Bundled in the plugin* (6.9 MB): simpler, but the owner wants the plugin free of model payload and packages reusable. |
| Distribution | Local import in v1, GitHub in v2 [C] | *Everything in v1*: builds infrastructure for one unprepared set. |
| Export shape | One STL per blank | *One STL per piece plus a layout file*: Rotary CAM machines one part per program, so it would need multi-part placement it doesn't have. |
| Blank connectivity | Necks in the STL | *Separate bodies with empty gaps*: roughing cuts through the gaps toward the axis and can part the blank mid-job. *Rotary CAM adds the necks*: its parting pass only necks the two ends. |
| Handoff | Folder in File Manager [C] | *Plugin generates G-code itself*: duplicates Rotary CAM. *Browser download only*: loses the shared server-side store; kept as the fallback. |
| STL encoding | ASCII | *Binary*: the save endpoint is text-only. *Base64 binary*: Rotary CAM would need a custom decoder. |
| Packing | Exact search | *First-fit decreasing*: at 972 states exact is instant, and it gives a provable minimum. |
| Preview | 2-D SVG | *three.js 3-D*: heavier, and the layout question is one-dimensional. |

## 8. Risks and mitigations

| # | Risk | Impact | Mitigation | Status |
|---|---|---|---|---|
| R1 | Rotary CAM can't open STL from a File Manager folder, or rejects ASCII or multi-shell STL. | Handoff breaks. | Confirm with the Rotary CAM author before building the exporter (O-1, O-2). Download ZIP covers a local-file workflow. | Open |
| R2 | A user clicks a stored `.stl` in the File Manager, and it is loaded as a G-code program. Verified: the File Manager calls load without an extension check. | Program load error. STL text isn't valid G-code, so motion is unlikely but not proven. | Keep stored files in clearly named folders. Ask ncSender to add an extension check on load (O-7). Test once by loading a small STL with the spindle off and the machine in check mode. | Open |
| R3 | Thin connecting necks flex or chatter on 18 in blanks, or the neck covers queen and bishop finials. | Poor finish or a broken blank. | Neck diameter is a setting, and the plan lists affected finials. Prototype one 12 in blank first. | Open |
| R4 | The knight can't be fully machined. Rotary CAM's demo reaches 43% of the remaining material in the indexed pass. | Hand finishing on 4 knights. | Accept hand finishing in v1. Note it in the package `notes`. | Accepted |
| R5 | Large ASCII files (~72 MB per side; 15–25 MB per blank) | Slow save and slow Rotary CAM load. | One file per blank, well under the 200 MB request cap. Show progress. Decimation is [v2]. | Accepted |
| R6 | Upstream models are misaligned. Verified: the Staunton queen is offset 66 mm in X, all pieces are Y-up, and the knight is offset 0.75 mm in Z. | Wrong layout or failed fit. | Package preparation realigns them. Import validation rejects misaligned packages. | Mitigated |
| R7 | Unit mistakes (inch vs mm, a 25.4× error). | Wrong-size pieces. | Internal and export units are always mm. `layout.json` records the units. Rotary CAM shows dimensions for a visual check. | Mitigated |
| R8 | Licence attribution is lost on exported blanks. | MIT terms not met when shared. | Every export folder gets `LICENSE-models.txt`. | Mitigated |
| R9 | An export overwrites earlier work. | Data loss. | Free-folder naming with ` (n)`; files are never overwritten. | Mitigated |

## 9. Acceptance criteria

| ID | Criterion |
|---|---|
| AC-PKG-01 | The plugin ZIP contains no STL files. |
| AC-PKG-02 | Importing the prepared Staunton package succeeds, and it then appears as installed. |
| AC-PKG-03 | Each of these blocks import with the message from §5.10: a missing file, `schema: 2`, a shifted axis (0.5 mm), and a mesh that isn't closed. |
| AC-PKG-04 | An installed package still works after a plugin update and with no internet connection. |
| AC-SIZE-01 | With a queen base of 38.1 mm, the exported queen's base diameter measures 38.1 ± 0.05 mm. Every other piece has the same scale factor (1.270). |
| AC-FIT-01 | Stock of 1.5 in (38.1 mm) square with defaults fails. The message names every failing piece (all but the pawn; widest is bishop/rook at 38.14 + 3.0 mm) and gives the minimum width, 41.2 mm. |
| AC-FIT-02 | Fit uses the widest scaled piece, not the queen alone. |
| AC-PLAN-01 | The worked examples in §11 reproduce exactly: blank counts, piece order and used lengths to 0.1 mm. |
| AC-PLAN-02 | Each side's plan contains exactly 1 K, 1 Q, 2 B, 2 N, 2 R and 8 P. |
| AC-PLAN-03 | Changing any input recomputes the plan with no extra click. |
| AC-PLAN-04 | Maple and walnut blank counts are reported separately and are equal. |
| AC-EXP-01 | Export creates `chess set/<job>/` with one STL per blank, `layout.json` and `LICENSE-models.txt`. It leaves other File Manager files untouched. |
| AC-EXP-02 | Exporting twice creates `<job> (2)`; nothing is overwritten. |
| AC-EXP-03 | Every exported STL is in mm. Its X axis is the rotary axis through Y = Z = 0, the first piece's base is at X = 0, and its maximum X equals the blank's used length ± 0.05 mm. |
| AC-EXP-04 | Every blank STL loads in Rotary CAM with Turning axis X and On axis Model origin, and shows the expected pieces joined by necks. Depends on O-1 and O-2. |
| AC-EXP-05 | No plugin action calls a motion, job or program-load endpoint. |

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
- **Where it lives:** the prepared package is kept in its own folder or repo, not in the plugin. A GitHub repo and release come with v2.

## 11. Worked examples

These use the Staunton package and the §5.1 defaults:
- chuck reservation 25.4 mm
- tailstock reservation 19.05 mm
- gap 10 mm
- radial allowance 1.5 mm

So usable length is 260.35 mm for 12 in stock and 412.75 mm for 18 in stock. Each piece list below is in chuck-to-tailstock order.

**Queen base 38.1 mm (1.5 in), scale 1.270.**
- Scaled axial lengths: K 99.1, Q 86.4, B 74.9, N 74.9, R 62.2, P 54.6 mm.
- Widest swept diameter: 38.14 mm (bishop and rook). Needs stock width ≥ 41.2 mm, so both 2 in and 2½ in pass.

| Stock | Blanks per side | Blanks (pieces · used / leftover mm) | Total blanks · stock to buy |
|---|---|---|---|
| 12 in × 2 in | 5 | K Q P · 260.0 / 0.3 — R P P P · 256.1 / 4.3 — R P P P · 256.1 / 4.3 — B N N · 244.8 / 15.6 — B P · 139.5 / 120.8 | 10 · 120 in |
| 18 in × 2 in | 3 | K Q N P P · 409.6 / 3.2 — N R P P P P · 405.6 / 7.1 — B B R P P · 361.3 / 51.4 | 6 · 108 in |

Results for 2½ in stock are identical; width affects only fit. A queen base of 36 mm or 40 mm also gives 5 blanks (12 in) and 3 blanks (18 in).

Largest queen base that fits, with the default allowance: **47.7 mm** on 2 in stock and **60.4 mm** on 2½ in stock.

Cross-check: Rotary CAM's demo knight (2.9 in long, Ø1.48 in) matches the Staunton knight at about 1.25× scale.

## 12. Integration facts verified

All from ncSender source at commit `2f8a659`, checked October 30, 2026:
- Routes `/api/gcode-files/file/save`, `/api/gcode-files/file`, `/api/gcode-files` (tree), and `/api/plugins/{id}/settings` exist.
- `file/save` has no extension filter, creates folders, and stores text only.
- The server's request size limit (Kestrel) is 200 MB.
- The File Manager tree lists every file except dot-files.
- The File Manager upload picker is limited to `.nc .gcode .gc .ngc .tap .txt`. That limit applies only to browser uploads, not to the save API.
- Clicking a file in the File Manager calls the load routine with no extension check (R2).

## 13. Open questions

| # | Question | Owner | Default until answered |
|---|---|---|---|
| O-1 | Can Rotary CAM open an STL from a File Manager folder? Does it read ASCII STL? | Rotary CAM author | Yes; fall back to Download ZIP and "Open STL…" |
| O-2 | Does Rotary CAM accept overlapping closed shells (pieces + necks) as one part? | Rotary CAM author | Yes |
| O-3 | The real maximum blank length between chuck and tailstock on the Vortex. | Marc (measure) | 810 mm setting |
| O-4 | Right neck diameter and gap for an 18 in blank, and whether alternating piece direction is better. | Marc (prototype) | 7.6 mm neck, 10 mm gap, all bases toward the chuck |
| O-5 | Default queen base diameter. | Marc | 38.1 mm (1.5 in) |
| O-6 | Is manual piece-by-piece blank selection wanted? | Marc | No (v1 is full-side automatic) |
| O-7 | Ask ncSender to block loading non-G-code files from the File Manager? | Marc → ncSender | Raise it |
| O-8 | Which manifest `permissions` does a file-only plugin need? | Implementer (read `PluginModels.cs`) | `[]` |
| O-9 | Support ncSender 0.3.x? | Marc | No |

## 14. References

- ncSender: <https://github.com/siganberg/ncSender>. Plugin model notes: `../AAxis/CLAUDE.md`.
- ncCAM, a reference for the plugin build and the free-path convention: <https://github.com/siganberg/ncsender-plugin-nccam>.
- Staunton models: <https://github.com/clarkerubber/Staunton-Pieces> (MIT).
- FIDE equipment rules, effective March 1, 2026: <https://handbook.fide.com/chapter/ChessEquipmentWithoutElectronicComponenets032026>. The misspelling is FIDE's own URL.
- Reviews: `zoom_out_report.md`, `comprehension_report.md`, `critic_report.md`.

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

| Piece | Triangles | Axial length | Base Ø | Swept Ø | Top Ø (last 1 mm) | Source frame |
|---|---:|---:|---:|---:|---:|---|
| King | 18,964 | 78.00 | 30.00 | 30.00 | 10.59 | Y-up, axis at (X 15, Z 15) |
| Queen | 23,768 | 68.00 | 30.00 | 30.00 | 4.15 | Y-up, axis at (X 80.9, Z 15) |
| Bishop | 11,898 | 59.00 | 30.03 | 30.03 | 3.97 | Y-up, axis at (X 15, Z 15) |
| Knight | 62,500 | 59.00 | 30.00 | 30.00 | 8.15 | Y-up, axis at (X 15, Z 15.75) |
| Rook | 11,478 | 49.00 | 30.03 | 30.03 | 16.03 | Y-up, axis at (X 15, Z 15) |
| Pawn | 9,398 | 43.00 | 24.00 | 24.00 | 6.38 | Y-up, axis at (X 12, Z 12) |

One side totals 289,668 triangles: about 14.5 MB as binary STL, about 72 MB as ASCII.
