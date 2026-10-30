# Chess Set Creator — ncSender plugin feature spec

Owner: Marc Infield · Revision 8 · October 30, 2026 · Status: draft, not implemented

Revision 8 applies the owner decisions of October 30, 2026 and the fixes from the Revision 7 review. The decisions are in `docs/product/decisions/product-decisions.md`; the review is in `docs/designs/egm/reviews/rev7/consolidated_review_report.md`. The history of earlier revisions is in `docs/designs/egm/history/CHANGES.md`, and every review round is indexed in `docs/designs/egm/reviews/INDEX.md`. The woodworking build notes live in `docs/research/domain/wooden-staunton-build-notes.md`.

**File paths** in this document are relative to the project root (`Chess-Set-Creator/`), not to this file.

**Status tags.** Each requirement carries one tag per clause:
- **[C]** Confirmed by the owner.
- **[P]** Proposed default for v1. It can change without reopening the spec.
- **[O-n]** Open. n is the row in [Open questions](#13-open-questions).
- **[v2]** Confirmed intent, scheduled after v1.

In the §5.1 input table, the Status column says whether the input itself is confirmed. Its default and valid range are always [P].

**Rotary CAM facts.** Rotary CAM is unreleased, and its source was not available. Everything this spec says about how Rotary CAM behaves is **owner-reported**, from its demo, unless it says otherwise.

---

## 1. Problem statement

To turn a full chess set on the rotary axis, the user lays 32 pieces out across 5–10 turning blanks by hand in CAD. For every blank the user must:
- scale six models consistently
- check that each piece fits the stock width
- fit pieces end to end within the usable length between chuck and tailstock
- add connecting necks
- export one model to hand to CAM

Any change to piece size or stock length means redoing all of it. Chess Set Creator does this inside ncSender. The user picks a model package, a queen base diameter, and a stock length and width. The plugin reports how many blanks each side (light and dark) needs. It then writes one STL per blank, in the frame Rotary CAM expects, into a File Manager folder. **Rotary CAM** (an ncSender plugin, unreleased) picks that folder up to generate toolpaths.

## 2. Goals and non-goals

### Goals (v1)
1. Scale a prepared six-piece model package uniformly from one control: queen base diameter. [C]
2. Check the stock cross-section and length against the scaled pieces. [C]
3. Compute the fewest blanks per side for 16 pieces (1 K, 1 Q, 2 B, 2 N, 2 R, 8 P). [C]
4. Report blank counts for the light and dark sides separately, plus total stock to buy. [C]
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
| **Side** | One colour's 16 pieces: **light** or **dark**. The plugin doesn't record the wood species; the user chooses it (the owner uses maple for light and walnut for dark). |
| **Blank** | One length of turning stock, held between chuck and tailstock. |
| **Stock length (L)** | The blank's full length before machining. |
| **Chuck reservation / tailstock reservation** | Length at each end of the blank that is not available for pieces. It covers the gripped length plus Rotary CAM's holding tab and parting neck. |
| **Holding tab** | The short section (a tenon) Rotary CAM leaves between the part and the gripped stock at each end. It is parted off after machining. Rotary CAM creates and manages it; the plugin only reserves length for it. |
| **Parting neck** | The narrow neck Rotary CAM cuts at each outer end of the part, where it is later separated from the holding tab. |
| **Machine settings** | Settings that belong to the user's machine, not to a job: the max blank length and the jaw sets. They are entered once, in a first-run setup (§5.1). |
| **Jaw set** | One chuck jaw configuration and the stock widths it grips, stored as a machine setting. The defaults are the owner's Sienci Vortex jaws: standard 0–22.86 mm (0–0.9 in) and alternate 25.4–63.5 mm (1–2.5 in). |
| **Usable length** | `L − chuck reservation − tailstock reservation`. |
| **Used length / leftover length** | For one blank: the length taken by its pieces and gaps, and `usable length − used length`. |
| **Gap** | The axial space between two adjacent pieces in a blank. |
| **Support** | The material that keeps adjacent pieces joined during machining. Under outcome A it is material Rotary CAM leaves in the gap. Under outcome B it is a connecting neck the plugin adds (§5.5). |
| **Connecting neck** | Outcome B only: a cylinder the plugin adds in each gap, so the blank stays one connected body during machining. |
| **Radial allowance** | Material left between the piece's swept diameter and the stock's flat or round surface, on each side. |
| **Axial length** | A piece's length along the rotary axis, from base to top. |
| **Swept diameter** | Twice the largest distance from the rotary axis to any point on the piece. This decides stock fit; it matters for the knight, which is not round. |
| **Base diameter** | Twice the largest distance from the axis to any vertex within 1.0 mm of the base plane. |
| **Top diameter** | The same measurement taken within 1.0 mm of the piece's top. |
| **Model package** | A folder with `chess-set.json`, six STL files and a licence, for one design. |
| **Job** | One export: the folder `chess set/<job>/` with its blank STLs, sidecars, `layout.json` and licence file. |
| **Rotary CAM** | The unreleased ncSender plugin that turns an STL or STEP part into rotary G-code (corners, roughing, finishing, indexed and parting passes). It is the only downstream program in v1. |
| **File Manager** | ncSender's server-side file store, reached through `/api/gcode-files/*`. On the owner's machine it lives at `/root/.config/ncSender/gcode-files`. |

## 4. Users and flow

The owner has decided that the plugin is for other ncSender rotary users, not only his own shop. Who those users are is still open: DISC-1 in `docs/product/decisions/discrepancies.md`, pending product discovery. Until that is decided, this section describes the first user and test site: Marc, on ncSender 2.x Pro (v2.0.271 on October 30, 2026), with a Sienci AltMill, a SuperLongBoard-EXT (grblHAL), and a Vortex rotary on A.

1. Open **Chess Set Creator** from the tool menu. On the first open, confirm or edit the machine settings (§5.1).
2. Pick an installed model package. With none installed, download the package ZIP from its release page (§5.9), unzip it, and import the folder.
3. Enter the queen base diameter, stock length, stock width and shape, and the allowances.
4. Read the plan: the scaled piece sizes, fit checks, blanks per side, and each blank's layout with leftover length.
5. Click **Export to File Manager**. The plugin writes `chess set/<job>/` with all the blank STLs, their sidecars and `layout.json`.
6. In Rotary CAM, open each blank STL from that folder.
7. Enter the stock and reservations shown on the plan's per-blank card, which are also in `layout.json`. Once Rotary CAM reads the sidecar (§5.11), this step is automatic [O-13].
8. Run Rotary CAM's simulation, check clearance to the chuck and tailstock, then generate toolpaths. Rotary CAM places the part on the axis and makes the holding tabs [O-10].

## 5. Requirements

### 5.1 Inputs

Internal unit is mm. The display toggle chooses the primary unit (default: inches); the other unit appears in parentheses. Stored and exported values are always mm. [P]

**Job inputs:**

| Input | Status | Default | Valid range | Notes |
|---|---|---|---|---|
| Model package | [C] | last used | an installed package | |
| Queen base diameter | [C] | 38.1 mm (1.5 in) | 15–100 mm | Main sizing control. The default gives a 99 mm (3.9 in) king with the Staunton package. |
| Stock length | [C] | 457.2 mm (18 in) | 50 mm – max blank length | Examples: 12 in and 18 in. The first job is a 12 in test blank [O-4]. |
| Stock shape | [C] | Square | square / round | |
| Stock width | [C] | 50.8 mm (2 in) | inside one of the configured jaw sets | Side of a square, or diameter of a round. Examples: 2 in and 2½ in. The plan names the jaw set that fits (§5.3). |
| Chuck reservation | [C] | 25.4 mm (1 in) | 0–200 mm | Includes the jaw grip, the holding tab and the parting neck. |
| Tailstock reservation | [C] | 19.05 mm (0.75 in) | 0–200 mm | |
| Gap | [C] | 10.0 mm (0.39 in) | 6.35–50 mm | Must let Rotary CAM's finishing cutter reach the next piece's base face and the previous piece's top: at least the cutter diameter plus clearance. Assumes a 6.35 mm (¼ in) cutter [O-4]. Parting cuts happen only at the two outer ends (§5.5). |
| Connecting-neck diameter | [O-2] | 7.6 mm (0.3 in) | 3 mm – stock width | Exists only under outcome B (§5.5). Matches Rotary CAM's default parting-neck diameter, 0.3 in (owner-reported). |
| Radial allowance | [C] | 1.5 mm (0.06 in) | 0–10 mm | Per side. |
| Sides | [C] | Both | both / light / dark | "Light only" plans and exports the light side only. |

Both sides share one set of stock and allowance settings in v1. [P] Separate settings per side are [v2].

**Machine settings** [C], entered in a first-run setup:

| Setting | Default | Valid range |
|---|---|---|
| Max blank length | 914.4 mm (36 in), the owner's machine | 100–2000 mm |
| Jaw sets | standard 0–22.86 mm (0–0.9 in); alternate 25.4–63.5 mm (1–2.5 in), the owner's Vortex jaws | 1–4 sets. Each has a name and a min–max width, with 0 ≤ min < max ≤ 300 mm |

- **First-run setup:** the first time the plugin opens with no machine settings saved, it shows the setup screen with the defaults filled in. The user confirms or edits them. [C]
- **Gating:** planning waits until machine settings have been saved. [P]
- **Editing later:** machine settings can be changed in the dialog's Machine section. [C]

An input outside its range blocks planning, and the range is shown next to the field. [P]

### 5.2 Sizing

- `scale = requested queen base diameter ÷ measured queen base diameter`. The queen's base diameter is measured at import and stored with the installed package. Every piece gets the same scale, so the design's proportions hold. [C]
- The plan shows each scaled piece's axial length, base diameter and swept diameter. [C]
- Export tolerance: the exported queen's measured base diameter is within ±0.05 mm of the request. [P]
- Individual piece overrides are not in v1. [O-11]

### 5.3 Stock fit

Fit is checked for every piece type, not only the queen. [C]

- **Cross-section:** `swept diameter + 2 × radial allowance ≤ stock width` [C]. This applies to both square and round stock. For square stock, the limit is the inscribed circle, which Rotary CAM's "Corners" pass turns the square down to (owner-reported).
- **Length:** each piece's axial length ≤ usable length. [C]
- **Jaw set:** the stock width must fall inside one of the configured jaw sets (§5.1). The plan and the per-blank card name the jaw set that fits. A width outside every set blocks planning. [C]
- **Square stock in the jaws:** the jaws are assumed to grip square stock across the flats, so the side width is compared with the range [O-12].
- **Neck** (outcome B only): if the connecting-neck diameter is larger than the smallest scaled base diameter, planning is blocked. [O-2]
- If any check fails, planning stops. The message names the piece, its size, the limit, and the smallest stock width or length that would work. The plugin does not shrink pieces. [C]

### 5.4 Stock planning

**Fit rule for one blank.** [C] A blank holding n pieces fits when

`Σ axial length + (n − 1) × gap ≤ usable length`

End reservations are counted once, in the usable length. Gaps appear only between pieces.

**Method.** [P] Exact search, not a heuristic. A side has at most 2 × 2 × 3 × 3 × 3 × 9 = 972 piece-count combinations, so a memoised search over the remaining counts is small. It is expected to take well under 100 ms; the plan's tests time it.
1. Minimise the number of blanks.
2. Tie-break: maximise the used length of blank 1, then blank 2, and so on. With the blank count fixed, total waste is fixed too. This rule puts the waste into the last blank as one offcut instead of spreading it out.
3. Final tie-break: if plans still tie, compare the piece lists. Write each blank's list in K, Q, B, N, R, P order. Compare blank 1's lists piece by piece and take the plan whose list comes first; if they match, compare blank 2, and so on. This settles ties between equal-length pieces, such as the Staunton bishop and knight.
4. Within a blank, place pieces from the chuck end in descending axial length. Equal lengths go in the order K, Q, B, N, R, P.
5. The result is the same every time for the same inputs.

**Per side.** [C] Both sides use the same geometry, so they get the same plan. When both sides are selected, the plan is shown once and labelled "per side × 2".

**Outputs shown:** [C]
- blanks per side
- total blanks
- stock to buy (blanks × stock length)
- for each blank: its pieces in order, used length, and leftover length

**Rounding.** [P]
- Lengths are shown to 0.1 mm or 0.01 in, rounded half up.
- A **minimum** needed (stock width or stock length) is rounded **up**.
- A **maximum** that fits (such as the largest queen base) is rounded **down**.

So a value shown as "needed" or "fits" is always true.

### 5.5 Export geometry

Rotary CAM lets the user choose the turning axis (X/Y/Z) and "On axis: Model origin", which sets where the model sits radially (owner-reported).

**Build gate.** The exporter (plan Phase 5) is built only after Phase 0 has answered O-1 and O-2. Planning, import and preview (§5.1–§5.4, §5.6) don't depend on them. [C]

**Export geometry rules.** `layout.json` and each sidecar record these:
- **Format:** ASCII STL in mm, one file per blank. ASCII is required because the File Manager stores text only (§12). Vertex coordinates have at least 4 decimal places. [P]
- **Frame:**
  - X is the rotary axis, and the axis passes through Y = Z = 0. X = 0 is the chuck end of the first piece, and +X points toward the tailstock. In Rotary CAM: Turning axis **X**, On axis **Model origin**. [P]
  - Rotary CAM places the part on the axis and makes the holding tab and parting neck at each end, so the plugin doesn't model them [O-10].
- **Orientation:** every piece has its base toward the chuck (−X). Each knight's face points +Z. [P]
- **Supports between pieces** [O-2]. The Phase 0 two-pawn test (`test_files/`) decides which of two outcomes applies:
  - **A. Rotary CAM leaves a support between separate bodies,** as it does at the two outer ends. The plugin exports the pieces as separate bodies with empty gaps, and the support is sized in Rotary CAM. There is no connecting-neck input and no covered-top rule.
  - **B. Rotary CAM cuts through empty gaps.** The plugin adds connecting necks (below).

  Only the outcome Phase 0 selects is built. The spec is then revised to keep that outcome and delete the other. [C] Until then, B is the working assumption.
- **Connecting necks (outcome B):** each gap holds a cylinder of the connecting-neck diameter, overlapping each neighbour by 0.5 mm. This keeps the blank one connected body, so roughing cannot cut through a gap and part the blank early. [P]
  - A piece's top is **covered** when `scaled top diameter < neck diameter`. The neck covers the top, which is finished by hand after parting. With the Staunton package at the default 38.1 mm queen base, this affects the queen (5.3 mm top) and the bishop (5.0 mm top).
  - The plan lists the pieces whose top is covered.
- **No neck or holding tab at the outer ends.** Rotary CAM's holding tabs and its "Parting — neck the ends" pass make those (owner-reported). [P]
- **Not in the STL:** the stock and the end reservations. They go in each blank's sidecar (§5.11) and in `layout.json`, and they appear on a per-blank card in the plan in mm and inches. [P]
- **Shells:** pieces (and, under outcome B, necks) are separate closed shells. Necks overlap their neighbours; there is no boolean union. [P]

### 5.6 Model packages

**v1** [C]:
- One prepared package, published as a ZIP on a GitHub release (§5.9).
- The user downloads it, unzips it and imports the folder.
- Multiple packages, a package selector, in-plugin download, update offers and version pinning are [v2].

**Package rules** [P]:
- The package contains `chess-set.json`, the six STL files (binary or ASCII), and `LICENSE`.
- Models are already in the export frame of §5.5: X axis, base plane at X = 0 facing −X, axis through the origin, knight face toward +Z.
- The plugin checks the frame and does not realign models. Alignment is a one-time preparation job done outside the plugin (§10).
- Packages are in mm. Inch packages are [v2]. [C]
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
  "units": "mm",                     // v1 accepts only "mm"
  "frame": "x-axis-base-at-origin-v1", // the only v1 value; means the §5.5 frame
  "pieces": {                        // exactly these six keys
    "king":   { "file": "king.stl",   "axialLength": 78.00, "baseDiameter": 30.00, "sweptDiameter": 30.00, "topDiameter": 10.59 },
    "queen":  { "file": "queen.stl",  "axialLength": 68.00, "baseDiameter": 30.00, "sweptDiameter": 30.00, "topDiameter": 4.15 },
    "bishop": { "file": "bishop.stl", "axialLength": 59.00, "baseDiameter": 30.03, "sweptDiameter": 30.03, "topDiameter": 3.97 },
    "knight": { "file": "knight.stl", "axialLength": 59.00, "baseDiameter": 30.00, "sweptDiameter": 30.00, "topDiameter": 8.15 },
    "rook":   { "file": "rook.stl",   "axialLength": 49.00, "baseDiameter": 30.03, "sweptDiameter": 30.03, "topDiameter": 16.03 },
    "pawn":   { "file": "pawn.stl",   "axialLength": 43.00, "baseDiameter": 24.00, "sweptDiameter": 24.00, "topDiameter": 6.38 }
  },
  "notes": "Knight: Rotary CAM indexed pass reaches part of the jaw/mane only; hand finishing expected." // optional
}
```

- `file` is the only required field per piece.
- The four dimensions are optional and informational. The packaging tool writes them from its own measurements, and v1 ignores them. A `sha256` map is [v2].
- The dimensions above are measured from the upstream Staunton STLs (Appendix B).
- The reference piece is always the queen, so there is no field for it.

**Checks on import** [C], as decided for v1. Every check below blocks import. Each failure message names the file and field, and says what to fix.
1. `chess-set.json` parses; `schema` is 1; `id`, `version` and the file paths follow their rules; and every required field is present with the right type.
2. `units` is `"mm"`.
3. All six files exist inside the package folder, and each parses as an STL with at least one triangle.
4. Each piece is in the frame: its axis lies within 0.1 mm of the X axis, and its base plane is at X = 0 ± 0.1 mm.

**Not checked on import:**
- whether meshes are closed
- whether measured sizes match declared ones

The packaging tool checks both before publishing (§10). These checks confirm the files are usable meshes in the agreed frame. They don't prove that a given cutter can machine every surface; Rotary CAM reports that separately.

The plugin stores each piece's measured dimensions (axial length, base, swept and top diameter, and a radius profile) at import, and uses them for planning.

### 5.7 Storage

All routes and behaviours below were checked in ncSender source at commit `2f8a659`; see §12.

| Data | Where | API | Status |
|---|---|---|---|
| Installed package | File Manager: `.chess-set-creator/sets/<id>@<version>/`, holding the manifest, `LICENSE`, and the six meshes stored as base64-encoded binary STL (`<role>.stl.b64`, about 9 MB in total). The File Manager tree hides folders whose names start with `.` (§12), so a stored mesh can't be clicked and loaded as a program. | `POST /api/gcode-files/file/save {path, content}`; read back with `GET /api/gcode-files/file?path=` | [C] |
| Settings: machine settings, installed-package list (with each package's measured dimensions), last job inputs, display unit | Plugin settings JSON | `GET`/`PUT /api/plugins/com.infield.chessset/settings` (plan P4.7) | [P] |
| Exports | File Manager: `chess set/<job>/` | `POST /api/gcode-files/file/save` | [C] |

The File Manager stores text only. That is why:
- exported blanks are ASCII STL, and whether Rotary CAM reads ASCII STL is [O-1];
- stored package meshes are base64 binary, because only this plugin reads them. [P]

v1 keeps the last job's inputs in settings, so the dialog reopens with them. [P] Completion tracking is [v2].

### 5.8 Export

- **Path:** `chess set/<job name>/`. [C]
- **Default job name:** `<package id> Q<base> <length>x<width>`, for example `staunton-clarkerubber Q38.1 457x51`. [P]
  - The base is rounded half up to 0.1 mm, with a trailing `.0` dropped (`Q40`).
  - Length and width are whole mm.
- **Job name rules:** job names may contain letters, digits, space and `. _ - ( )`. A name containing `/`, `\` or `..`, or starting with `.`, is rejected. [P]
- **Free folder:** the plugin reads the File Manager tree once (`GET /api/gcode-files`). It takes the first of `<name>`, `<name> (2)`, `<name> (3)`, … that doesn't already exist under `chess set/`. This is ncCAM's approach. `file/save` overwrites existing files (§12), so this check is what protects earlier work. [P]
- **Write order:** [P]
  1. `LICENSE-models.txt`, which copies the package licence and attribution.
  2. Each blank STL, followed immediately by its sidecar; the light side first.
  3. `layout.json`, **last**.

  A folder without `layout.json` is an incomplete export. A retry writes to a new free folder and leaves the incomplete one for the user to delete.
- **Folder contents:** [P]
  - `light_blank_01.stl` … and `dark_blank_01.stl` … (two-digit numbers) [C]
  - one `<blank>.rotary.json` sidecar per blank STL (§5.11)
  - `layout.json`
  - `LICENSE-models.txt`
- **`layout.json` contents:** [P]
  - plugin version
  - package id, version and name
  - scale and queen base diameter
  - units (`mm`), frame, turning axis and on-axis mode
  - stock length, width and shape, and the jaw set
  - both reservations, the gap, the radial allowance, and (outcome B) the neck diameter and the pieces whose top is covered
  - one entry per blank per side: side, number, file name, pieces in order with their X ranges, used length and leftover length
- **Download files:** [C] decided by the owner (A2). The plugin can offer each file as a separate browser download: each blank STL, its sidecar, `layout.json` and `LICENSE-models.txt`.
  - It is offered after a failed save, and any files already saved stay in place.
  - It is also always available as a secondary action. [P] This gives users of other CAM programs a way to get the files (DISC-7).
  - There is no ZIP.
- Export is allowed only when the plan has no errors. [P]

### 5.9 Distribution

**v1** [C]:
- **Plugin:** a public repository, `infield/ncsender-plugin-chessset`, under GPL-3.0. Each version is a GitHub release with the plugin ZIP attached, as AAxis does it. The manifest's `repository` field points at the repository, so ncSender's update check finds new releases.
- **Model package:** the prepared Staunton package is published as a ZIP on GitHub releases. Users download it, unzip it and import the folder. It is published from a separate repository, so the plugin repository's latest release is always a plugin build. [P]
- **Approval:** creating either public repository needs the owner's approval at release time. [C]

**v2:**
- a package selector for several installed packages [v2]
- in-plugin download of a model package from a tagged GitHub release, using the same format as local import [v2]
- SHA-256 checksums verified against the release [v2]
- an update offer that never changes an existing job [v2]
- job records that pin the package version [v2]

Before v2 is specified, confirm whether the dialog can fetch GitHub release assets directly. Browser cross-origin rules may require a server-side fetch.

### 5.10 Errors

All rows are [P].

| Condition | Blocks | Message must say |
|---|---|---|
| Machine settings not saved yet | planning | shows the first-run setup |
| No package installed | planning | "Import a model package folder" (v2: or download one) |
| Manifest or schema invalid, or units not mm | import | file, field, and the expected value |
| Missing or unreadable STL | import | role and path |
| Piece not in the frame | import | file, axis offset or base-plane position, and the 0.1 mm limit |
| Input not a number or out of range | planning | field, and the valid range |
| Piece too wide for the stock | planning | piece, swept diameter + 2 × allowance, stock width, the minimum width needed (rounded up) |
| Piece too long for the usable length | planning | piece, axial length, usable length, the minimum stock length needed (rounded up) |
| Usable length ≤ 0 (reservations ≥ stock length) | planning | both reservations and the stock length |
| Stock length > max blank length | planning | both values |
| Stock width outside every jaw set | planning | stock width, each configured jaw set, the nearest width that fits |
| Neck diameter > smallest scaled base diameter (outcome B) | planning | neck diameter, the piece and its base diameter |
| Job name not allowed | export | the allowed characters |
| Installed package files missing | export | the missing path, and "Re-import the package" |
| File Manager save failed | export | path and server reply; offer Download files |

### 5.11 Rotary CAM handoff sidecar

**Current behaviour** [C]: Rotary CAM owns stock size and placement. The user sets them in Rotary CAM, copying the values from the plan's per-blank card.

**Proposed handoff** [P]: next to each blank STL, the plugin writes a small **sidecar** file that tells Rotary CAM how to orient the part and what stock to set up. Reading the sidecar is a proposed Rotary CAM feature [O-13]. Until Rotary CAM supports it, the user enters the values by hand; the sidecar has no other effect.

The format is not chess-specific, so any plugin that writes a rotary part can use it. The owner chose to keep this section as written (decision A5).

**File name.** `<STL file name without .stl>.rotary.json`, in the same folder as its STL. Example: `light_blank_01.stl` → `light_blank_01.rotary.json`.

**Format (version 1).** All lengths are in `units`. Every field is required unless marked optional.

```jsonc
{
  "format": "rotary-setup",          // fixed string
  "formatVersion": 1,                // integer; readers accept 1
  "model": "light_blank_01.stl",     // the STL this file describes, same folder
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
- Tailstock offset: `stock.length − placement.chuckOffset − placement.modelLength`. For the example above it is 19.37 mm: the 19.05 mm reservation plus the blank's 0.32 mm leftover.
- Rotary CAM's holding tabs and parting necks must fit within the two offsets. Rotary CAM checks that.

**Requested reader behaviour (Rotary CAM)** [P]:
1. When opening an STL, look for `<name>.rotary.json` in the same folder.
2. If the file is present, its `format` is `rotary-setup` and its `formatVersion` is 1, apply:
   - the turning axis
   - flip ends, from `chuckEnd`
   - the on-axis mode
   - the angular "Turn" setting, from `upAtZero`
   - the stock shape, width and length
   - the model's axial position, from `placement.chuckOffset`

   Show a one-line notice, e.g. *"Setup from light_blank_01.rotary.json"*.
3. Treat every value as a starting point. The user can change any of them, and the sidecar never touches tools, feeds or operations.
4. Ignore unknown fields. Ignore the whole file, and say so, if `format` is wrong or `formatVersion` is newer than the reader supports.
5. Warn without blocking if any of these is true:
   - `chuckOffset + modelLength > stock.length`
   - the model's swept diameter is larger than `stock.width`
   - `model` names a different file

**Writer rules (this plugin)** [P]:
- Write one sidecar per blank STL.
- These values are fixed. They match the §5.5 frame and the knight-faces-+Z rule:
  - `units`: `"mm"`
  - `turningAxis`: `"X"`
  - `chuckEnd`: `"min"`
  - `onAxis`: `"model-origin"`
  - `upAtZero`: `"+Z"`
- Inputs:
  - `stock` comes from the §5.1 inputs.
  - `chuckOffset` is the chuck reservation.
  - `modelLength` is the blank's used length.
  - `workholding.jawSet` is the name of the jaw set from §5.3.
  - `source.version` is the plugin version, and `source.job` is the export folder's name.
- Numbers are rounded half up to 0.001 mm.
- Write each sidecar right after its STL (see the plan, P4.9). A sidecar never exists without its STL.
- `layout.json` remains the job-level record. The sidecar is the per-blank contract with Rotary CAM.

## 6. Proposed architecture

Everything in this section is [P]. The complete file list is in the plan, P2.

This follows `../AAxis/CLAUDE.md` for the ncSender 2.x plugin model: one tool-menu entry, ncSender CSS variables, no `alert`/`confirm`/`prompt`, and no machine motion. It deliberately departs from AAxis item 1 ("all UI and logic in `config.html`"). Like ncCAM, `config.html` is only a loader, and the logic is bundled into `lib/app.js` from `src/`.

| Component | Role |
|---|---|
| `com.infield.chessset/` (plugin ZIP) | `manifest.json`, `config.html` loader, bundled `lib/app.js`, icon, README, CHANGELOG, LICENSE. No STL files. |
| Core modules (`src/`, pure) | Units, STL read/write, measurement, manifest checks, planner, blank builder, sidecar and layout builders. |
| Host modules (`src/`) | File Manager and settings client, package import, exporter, Worker handlers, UI. |
| Tools (`tools/`, repo only) | Packaging tool, test-fixture generator, mock ncSender server, test harness, headless UI check. |

- **Runs in:** the browser dialog only. There is no server-side module, so `events` is empty and the plugin can't be quarantined by a server-module crash (`../AAxis/CLAUDE.md`).
- **Data flow:** package folder → import checks and measurement → stored package (File Manager) and measurements (settings) → scale → fit checks → plan → preview → export (File Manager, or Download files).
- **Planning** uses the dimensions measured at import (§5.2), stored in settings. Meshes are loaded only for export.
- **STL work** (parsing at import, writing at export) runs in a Web Worker, one blank at a time, and falls back to the page if Workers are blocked.
- **Displayed text** from manifests and job names is set with `textContent`, never `innerHTML`.
- **Preview:** a 2-D SVG side view of each blank, drawn to scale, showing the stock outline, reservations, piece silhouettes and (outcome B) necks. A 3-D view is [v2].
- **Manifest permissions:** `["gcode.modify"]`, for consistency with ncCAM and AAxis. ncSender doesn't read this field (§12).
- **Platforms:** ncSender 2.x, both editions (`v2` and `pro-v2`). Supporting 0.3.x is [O-9], and is tied to DISC-5.
- **Testing:**
  - Pure modules get unit tests built from the worked examples in §11.
  - The dialog is checked headlessly against a mock ncSender. The mock, the harness and the check script are committed under `tools/`.

## 7. Alternatives considered

| Decision | Chosen | Rejected and why |
|---|---|---|
| Sizing control | Queen base diameter [C] | *King height*: the base diameter maps directly to the stock-width fit check (§5.3); king height does not. *Per-piece overrides*: open [O-11]. |
| Package geometry | STL + JSON manifest | *STEP*: carries units and solid geometry, and Rotary CAM reads it (owner-reported), but the plugin would need a STEP kernel (ncCAM ships a 7.6 MB wasm one) just to rescale and lay out pieces. |
| Where models live | Separate package [C] | *Bundled in the plugin* (6.9 MB): simpler, but the owner wants the plugin free of model payload and packages reusable. |
| Package storage | Import once, stored as base64 binary in a hidden File Manager folder [C] | *Re-pick the package folder at each export*: less code, but a step on every export, and the folder must be on that computer. *ASCII STL*: 5× larger (about 34 MB). *IndexedDB* (ncCAM's choice): tied to one browser and lost if browser data is cleared. |
| Import checks | Parse, frame check, units [C] | *Full checks at import* (closed mesh, declared vs measured, SHA-256): these repeat what the packaging tool checks for the one v1 package. SHA-256 comes back in v2 with third-party packages. |
| Distribution | v1: plugin and package as GitHub releases, package imported by hand [C] | *In-plugin download in v1*: adds GitHub fetching (possible cross-origin issues) and update handling now. *Bundling the package*: reverses the separate-package decision. |
| Licence and channel | GPL-3.0, public repo, GitHub releases, `repository` field [C] | *Another licence*: AAxis and ncCAM are GPL-3.0, and this plugin follows their patterns. |
| Runtime | Browser dialog only | *Server module (Jint)*: could write binary STL and fetch GitHub releases, but it has no ES modules or Node APIs, and a crash while loading quarantines the plugin version (`../AAxis/CLAUDE.md`). |
| Export shape | One STL per blank | *One STL per piece plus a layout file*: Rotary CAM machines one part per program (owner-reported), so it would need multi-part placement it doesn't have. |
| Blank connectivity | **Pending O-2.** Outcome A (Rotary CAM leaves the support) if Phase 0 shows it; otherwise B (necks in the STL). Only the selected outcome is built. [C] | Under B, *separate bodies with empty gaps* are rejected because roughing would cut through the gaps toward the axis and part the blank mid-job. Under A, *necks in the STL* are rejected as unnecessary geometry. |
| Neck joins (outcome B) | Overlapping shells | *Boolean union*: needs a mesh kernel such as manifold-3d wasm (about 1 MB) for every blank. Revisit if Phase 0 shows that Rotary CAM rejects overlapping shells. |
| Handoff | Folder in the File Manager [C] | *The plugin generates G-code itself*: duplicates Rotary CAM. |
| Export fallback | Per-file browser downloads [C] | *ZIP download*: adds a library (fflate) and a streaming sequence for a rare failure. *Error and retry only*: leaves no route for users of other CAM programs. |
| STL encoding (exports) | ASCII | *Binary*: the save endpoint is text-only. *Base64 binary*: Rotary CAM would need a custom decoder. |
| Packing | Exact search | *First-fit decreasing*: exact search over at most 972 states is small and gives a provable minimum. |
| Preview | 2-D SVG | *three.js 3-D*: adds a 3-D library dependency, and the layout question is one-dimensional. |

## 8. Risks and mitigations

| # | Risk | Impact | Mitigation | Status |
|---|---|---|---|---|
| R1 | Rotary CAM can't open STL from a File Manager folder, or rejects ASCII or multi-shell STL. | Handoff breaks. | The exporter isn't built until Phase 0 answers O-1 and O-2. Download files gives a local-file route. | Open |
| R2 | A user clicks an exported `.stl` in the File Manager, and it is loaded as a G-code program. Verified: the File Manager calls the load routine with no extension check. | The server runs every installed plugin's program-load transform and its pre-analysis over the file. It writes `current.gcode` and remembers the file as the last loaded program, even across restarts. On a blank of about 38 MB that is heavy work, and the client may freeze while parsing. STL text isn't valid G-code, so machine motion is unlikely but not proven. | Installed packages live in a hidden dot-folder (§5.7). Exports must stay visible for Rotary CAM. Ask ncSender to add an extension check on load [O-7]. Don't load a large STL on purpose to test this. | Open |
| R3 | Thin sections flex or chatter on 18 in blanks. Under outcome B, the weakest point is the thinnest top in the chain (about 5 mm on the queen and bishop at the default size), because every piece toward the tailstock is supported only through it during roughing. | Surface defects or a broken blank. | Neck diameter is a setting; the plan lists covered tops; planning blocks a neck wider than any base. Piece order and direction are [O-4]. Cut one 12 in test blank first. | Open |
| R4 | The knight can't be fully machined. Rotary CAM's demo reaches 43% of the remaining material in the indexed pass (owner-reported). | Hand finishing on 4 knights. | Accept hand finishing in v1. Note it in the package `notes`. | Accepted |
| R5 | Large ASCII export files: about 72 MB per side, and up to about 38.6 MB for a blank with two knights (155,274 triangles). | Slow save and slow Rotary CAM load; client memory. | One file per blank, under the 200 MB request cap. STL writing in a Worker, one blank at a time, with progress shown. Mesh simplification is [v2]. | Accepted |
| R6 | Upstream models are misaligned. Verified: the Staunton queen is offset 66 mm in X from the other pieces, all pieces are Y-up, and the knight is offset 0.75 mm in Z. | Wrong layout or failed fit. | The packaging tool realigns them. Import checks the frame and rejects misaligned packages. | Mitigated |
| R7 | Unit mistakes (inch vs mm, a 25.4× error). | Wrong-size pieces, or a misplaced toolpath (see R10). | Internal and export units are always mm, and packages are mm only in v1. `layout.json` and the sidecar record the units, and the per-blank card shows mm and inches. | Partly mitigated |
| R8 | Licence attribution is lost on exported blanks. | MIT terms not met when shared. | Every export folder gets `LICENSE-models.txt`. | Mitigated |
| R9 | An export overwrites earlier work. | Data loss. | Free-folder check before saving (§5.8), and `layout.json` written last marks a complete job. Two clients exporting the same job name at the same moment could still collide; this is accepted. | Mitigated |
| R10 | Chuck or tailstock collision, from a reservation that doesn't match the holding tab Rotary CAM makes, or a value mistyped into Rotary CAM. | The cutter or spindle strikes the chuck jaws or the tailstock centre. | Rotary CAM places the part and manages the holding tabs. Once Rotary CAM reads the §5.11 sidecar, nothing is retyped. The per-blank card shows stock and reservations in mm and inches. Reservations are checked against Rotary CAM's tab length on the 12 in test blank [O-4, O-10]. The user runs Rotary CAM's simulation and checks clearance before every first cut. | Partly mitigated |
| R11 | An untrusted package injects paths or script, through `version`, file paths or manifest text. | Overwritten G-code programs; script running with access to ncSender's API. | Semver and path rules (§5.6), job-name rules (§5.8), `textContent` for displayed text (§6), and the server's rejection of paths that escape its storage folder (§12). | Mitigated |
| R12 | Other users can't use the export until Rotary CAM is released, and Rotary CAM isn't this project's to control. | A public release is useful for planning only, until Rotary CAM ships. | The planning milestone stands on its own (plan P3). Download files serves other CAM programs. Whether to support other CAM programs is DISC-7. | Open |

## 9. Acceptance criteria

| ID | Criterion | Verifies |
|---|---|---|
| AC-PKG-01 | The plugin ZIP contains no STL files. | §2 goal 6 |
| AC-PKG-02 | The prepared Staunton package, downloaded as its release ZIP and unzipped, imports successfully and then shows as installed. | §5.6, §5.9, §10 |
| AC-PKG-03 | Each of these blocks import with the message from §5.10, with exactly one error each: a missing piece file; `schema: 2`; `units: "in"`; and a piece shifted 0.5 mm off the axis. | §5.6, §5.10 |
| AC-PKG-04 | An installed package still works after a plugin update and with no internet connection. | §5.7 |
| AC-SEC-01 | A manifest with `version: "../x"` is rejected, and a manifest with `<script>` in `name` is shown as plain text. | §5.6, §6 |
| AC-IN-01 | An input that is out of range, or not a number, blocks planning and shows the range. | §5.1 |
| AC-IN-02 | The display toggle switches the primary unit. Stored and exported values stay in mm, and toggling never changes a stored value. | §5.1 |
| AC-IN-03 | "Light only" plans and exports light-side blanks only. | §5.1 |
| AC-IN-04 | On first open with no saved machine settings, the setup screen appears with the defaults filled in. Planning starts after it is saved. A jaw set edited there changes which stock widths are accepted. | §5.1, §5.3 |
| AC-SIZE-01 | With a queen base of 38.1 mm, the exported queen's base diameter measures 38.1 ± 0.05 mm. Every other piece has the same scale factor (1.270). | §5.2 |
| AC-FIT-01 | Stock of 1.5 in (38.1 mm) square, with the defaults, fails. The message names every failing piece (all but the pawn; the widest is the bishop or rook, at 38.14 + 3.0 mm) and gives the minimum width, 41.2 mm, rounded up per §5.4. | §5.3, §5.4 |
| AC-FIT-02 | Fit uses the widest scaled piece, not the queen alone. | §5.3 |
| AC-FIT-03 | With the defaults: 100 mm stock gives five length errors (every piece but the pawn), each with a minimum stock length of 143.6 mm. 1000 mm stock gives the max-blank-length error. Reservations of 200 + 200 mm on 300 mm stock give only the usable-length error. | §5.3, §5.10 |
| AC-FIT-04 | With the default jaw sets: 2 in stock names the alternate jaws, and 0.75 in stock names the standard jaws. 24 mm and 70 mm stock each block planning with the jaw-set message. | §5.3, §5.10 |
| AC-PLAN-01 | The worked examples in §11 reproduce exactly: blank counts, piece lists and order, and used lengths to 0.1 mm. | §5.4, §11 |
| AC-PLAN-02 | Each side's plan contains exactly 1 K, 1 Q, 2 B, 2 N, 2 R and 8 P. | §5.4 |
| AC-PLAN-03 | Changing any input recomputes the plan with no extra click. | §5.4 |
| AC-PLAN-04 | Light and dark blank counts are reported separately and are equal. | §5.4 |
| AC-UI-01 | The 2-D preview draws each blank to scale, with the reservations, the pieces and (outcome B) the necks. | §6 |
| AC-EXP-01 | Export creates `chess set/<job>/` with one STL and one sidecar per blank, `layout.json` and `LICENSE-models.txt`. They are written in the §5.8 order, with `layout.json` last. Other File Manager files are left untouched. | §5.8 |
| AC-EXP-02 | Exporting twice creates `<job> (2)`; nothing is overwritten. Job names containing `/`, `\` or `..`, or starting with `.`, are rejected. | §5.8 |
| AC-EXP-03 | Every exported STL is in mm. Its X axis is the rotary axis through Y = Z = 0, the first piece's base is at X = 0, and its maximum X equals the blank's used length ± 0.05 mm. | §5.5 |
| AC-EXP-04 | Every blank STL loads in Rotary CAM with Turning axis X and On axis Model origin. It shows the expected pieces, with supports per the outcome Phase 0 selected, and Rotary CAM's holding tabs inside the reserved end lengths. Depends on O-1 and O-2. | §5.5 |
| AC-EXP-05 | No plugin action calls a motion, job or program-load endpoint. | §2 |
| AC-EXP-06 | Outcome B only: the plan lists the pieces whose top is covered by the neck. | §5.5 |
| AC-EXP-07 | A forced save failure offers Download files, and the incomplete folder has no `layout.json`. | §5.8 |
| AC-EXP-08 | Every blank STL has a `.rotary.json` sidecar with the same base name. It matches §5.11, and its stock and placement equal the plan's per-blank card. | §5.11 |
| AC-REL-01 | The plugin ZIP installs from its GitHub release URL, and its manifest has the `repository` field. | §5.9 |

## 10. Prepared reference package (v1 deliverable)

- **Source:** [clarkerubber/Staunton-Pieces](https://github.com/clarkerubber/Staunton-Pieces) at commit `cef2c79`, folder `Source/Staunton/<Piece>/<Piece>.STL`. MIT licence, © 2014 clarkerubber.
- **Not used:**
  - the other STL set, `Source/Readymake_Duchamp_Chess_Set/` (a different design, plus `set_6.stl`)
  - the `.SLDPRT` files and the `~$*.SLDPRT` lock files
  - `Thumbs.db`
- **Preparation**, done once with the packaging tool (plan P4.11), outside the plugin:
  1. Rotate Y-up to the X axis.
  2. Centre each piece on its base axis.
  3. Put the base at X = 0.
  4. Turn the knight so its face points +Z.
  5. Name the files in lowercase.
  6. Weld vertices and check that every mesh is closed. A mesh that won't close is repaired in MeshLab and fed back to the tool. If it still won't close, the owner decides.
  7. Write `chess-set.json` and copy `LICENSE`.
  8. Record the results in Appendix B.
- **Publishing:** the package folder is zipped and attached to a GitHub release (§5.9). It is never part of the plugin.

## 11. Worked examples

These use the Staunton package and the §5.1 defaults:
- chuck reservation 25.4 mm
- tailstock reservation 19.05 mm
- gap 10 mm
- radial allowance 1.5 mm

Usable length is therefore 260.35 mm for 12 in stock and 412.75 mm for 18 in stock. Each piece list below runs from the chuck to the tailstock.

**Queen base 38.1 mm (1.5 in), scale 1.270.**
- Scaled axial lengths: K 99.1, Q 86.4, B 74.9, N 74.9, R 62.2, P 54.6 mm.
- Widest swept diameter: 38.14 mm (bishop and rook). Needs stock width ≥ 41.2 mm, so both 2 in and 2½ in pass.

**12 in × 2 in stock:** 5 blanks per side; 10 blanks in total, 120 in of stock.

| Blank | Pieces | Used (mm) | Leftover (mm) |
|---|---|---:|---:|
| 1 | K Q P | 260.0 | 0.3 |
| 2 | R P P P | 256.1 | 4.3 |
| 3 | R P P P | 256.1 | 4.3 |
| 4 | B B N | 244.8 | 15.6 |
| 5 | N P | 139.5 | 120.8 |

**18 in × 2 in stock:** 3 blanks per side; 6 blanks in total, 108 in of stock.

| Blank | Pieces | Used (mm) | Leftover (mm) |
|---|---|---:|---:|
| 1 | K Q B P P | 409.6 | 3.2 |
| 2 | B R P P P P | 405.6 | 7.2 |
| 3 | N N R P P | 361.3 | 51.4 |

Results for 2½ in stock are identical; width affects only fit. A queen base of 36 mm or 40 mm also gives 5 blanks on 12 in stock and 3 on 18 in stock.

**Largest queen base that fits**, with the default allowance, rounded down: **47.7 mm** on 2 in stock and **60.4 mm** on 2½ in stock. With the default jaw sets, 2½ in is also the widest stock the alternate jaws grip, so 60.4 mm is the upper limit for this set on the owner's machine. Both example widths use the alternate jaws.

**Cross-check:** Rotary CAM's demo knight (2.9 in long, 1.48 in diameter) matches the Staunton knight at about 1.25× scale.

## 12. Integration facts verified

All from ncSender source at commit `2f8a659`, checked October 30, 2026:
- **Routes that exist:** `/api/gcode-files/file/save`, `/api/gcode-files/file`, `/api/gcode-files` (tree) and `/api/plugins/{id}/settings`.
- **`file/save`:**
  - accepts any path and extension under the storage folder;
  - creates missing folders;
  - rejects paths that escape the folder (`SafePath`);
  - writes text only (`File.WriteAllTextAsync`), which replaces an existing file of the same name.
- **`GET /api/gcode-files/file?path=`:**
  - returns `200` with JSON `{"content": "…"}` (camelCase), or `404` when the file is missing (`GcodeFileEndpoints.cs:105–112`);
  - neither save nor read filters by extension (`GcodeFileService.cs:134–152`).
- **`GET /api/gcode-files`:**
  - returns `{storagePath, tree:[{id, name, type, path, children?, size?, uploadedAt?}]}` (`GcodeFileService.cs:49–57, 313–353`);
  - the tree skips every **file and folder** whose name starts with `.` (`GcodeFileService.cs:323, 338`).
- **Plugin settings:**
  - `GET /api/plugins/{id}/settings` returns `200 {}` when nothing has been saved (`PluginManager.cs:322–326`);
  - `PUT` replaces the whole object and creates the file (`PluginManager.cs:369–376`).
- **Plugin dialog:** `POST /api/plugins/{id}/config-ui` returns the dialog HTML as `text/html` (`PluginEndpoints.cs:140–146`).
- **Manifest:** ncSender declares `permissions` (`PluginModels.cs:52`) but never reads it.
- **Request size:** the server's request size limit is 200 MB (`ServerBuilder.cs:91`).
- **Persistence:** the File Manager is on the server, so everything stored there survives plugin updates and can be reached from any client.
- **Uploads:** the File Manager's upload picker is limited to `.nc .gcode .gc .ngc .tap .txt`. That limit applies only to browser uploads, not to the save API.
- **Load:** clicking a file in the File Manager calls the load routine with no extension check (R2).

## 13. Open questions

| # | Question | Owner | Default until answered |
|---|---|---|---|
| O-1 | Can Rotary CAM open an STL from a File Manager folder? Does it read ASCII STL? | Marc (Phase 0) / Rotary CAM author | **Blocks the exporter build.** If not: Download files and Rotary CAM's "Open STL…" |
| O-2 | With several separate bodies along the axis, does Rotary CAM leave a support in each gap, as it does at the ends, or does it cut through the gap? If it cuts through, does it accept overlapping shells? Test: load `test_files/test_two_pawns_floating.stl` and `test_two_pawns_necked.stl` (Turning axis X, On axis Model origin), run Simulate, and check what is left between the pawns. | Marc (Phase 0) / Rotary CAM author | **Blocks the exporter build.** Outcome B until tested |
| O-4 | The right neck diameter, gap and finishing-cutter diameter. Should pieces with thin tops go at the tailstock end, or be flipped? Settled by cutting one 12 in test blank [C]. | Marc (12 in test blank) | 7.6 mm neck, 10 mm gap, 6.35 mm cutter, all bases toward the chuck |
| O-6 | Is manual piece-by-piece blank selection wanted? | Marc | No (v1 is full-side automatic) |
| O-7 | Should ncSender block loading non-G-code files from the File Manager? | Marc → ncSender | Request it |
| O-9 | Support ncSender 0.3.x? Tied to DISC-5. | Marc | No |
| O-10 | How long are Rotary CAM's holding tab and parting neck at each end, so the reservation defaults match? The owner understands that Rotary CAM places the part and makes the tabs; this needs confirming. | Rotary CAM author; Marc (12 in test blank) | Reservations 25.4 mm (chuck) and 19.05 mm (tailstock), entered by hand |
| O-11 | Are per-piece size overrides needed? | Marc | No |
| O-12 | Do chucks grip square stock across the flats, with the same range as round stock? | Marc | Yes: the side width is compared with the range |
| O-13 | Will Rotary CAM read the §5.11 `.rotary.json` sidecar, and do its field names and its `upAtZero` / `chuckEnd` meanings match how Rotary CAM sets the turning axis, flip and turn? | Rotary CAM author | The sidecar is written anyway; the user enters stock and placement by hand. Blocks nothing. |

**Closed:**

| # | Closed in | Answer |
|---|---|---|
| O-3 | Rev 4 | The longest blank on the owner's machine is 36 in (914.4 mm). It is now a machine-setting default. |
| O-5 | Rev 3 | The default queen base diameter is the [P] value in §5.1. |
| O-8 | Rev 8 | `permissions` is not read by ncSender (§12). It is kept as `["gcode.modify"]` for consistency. |

The audience questions DISC-1, DISC-5 and DISC-7 are tracked in `docs/product/decisions/discrepancies.md`.

## 14. Test files

`test_files/` holds two ASCII STLs in the §5.5 export frame. Each contains two Staunton pawns at the default scale (1.270; each 54.6 mm long, 30.5 mm across), 10 mm apart, total length 119.2 mm.
- In one, the pawns float with an empty gap.
- In the other, a 7.6 mm neck joins them.

Both are closed meshes with outward-facing normals. They exist to answer O-1 and O-2.

## 15. References

- ncSender: <https://github.com/siganberg/ncSender>. Plugin-model notes: `../AAxis/CLAUDE.md`.
- ncCAM, the reference for the plugin build, free-folder approach and dev tools: <https://github.com/siganberg/ncsender-plugin-nccam>.
- Staunton models: <https://github.com/clarkerubber/Staunton-Pieces> (MIT).
- FIDE equipment rules, effective March 1, 2026: <https://handbook.fide.com/chapter/ChessEquipmentWithoutElectronicComponenets032026>. The misspelling is FIDE's own URL. Background for Appendix A.
- Reviews: every round is listed in `docs/designs/egm/reviews/INDEX.md`.

---

## Appendix A — Shop sizing reference (informative)

These are the proposed workshop piece sizes from the build notes. They are not plugin defaults; the plugin scales the package from the queen base diameter. With the Staunton package, a 38.1 mm queen base gives a 99 mm king, close to this table. Staunton's own proportions differ from the table's graduated bases: every piece but the pawn has the same base.

| Piece | Per side | Height | Base diameter |
|---|---:|---:|---:|
| King | 1 | 95.25 mm (3.75 in) | 43 mm (1.69 in) |
| Queen | 1 | 85 mm (3.35 in) | 40 mm (1.57 in) |
| Bishop | 2 | 70 mm (2.76 in) | 34 mm (1.34 in) |
| Knight | 2 | 60 mm (2.36 in) | 30 mm (1.18 in) |
| Rook | 2 | 55 mm (2.17 in) | 27 mm (1.06 in) |
| Pawn | 8 | 50 mm (1.97 in) | 25 mm (0.98 in) |

## Appendix B — Measured upstream Staunton models

Measured from `Source/Staunton/*/*.STL` at commit `cef2c79` (binary STL, mm). Diameters are taken about the centre of each piece's base. The "Closed after weld" column is filled in by plan Phase 2.

| Piece | Triangles | Axial length | Base Ø | Swept Ø | Top Ø (last 1 mm) | Source frame | Closed after weld |
|---|---:|---:|---:|---:|---:|---|---|
| King | 18,964 | 78.00 | 30.00 | 30.00 | 10.59 | Y-up, axis at (X 15, Z 15) | pending Phase 2 |
| Queen | 23,768 | 68.00 | 30.00 | 30.00 | 4.15 | Y-up, axis at (X 80.9, Z 15) | pending Phase 2 |
| Bishop | 11,898 | 59.00 | 30.03 | 30.03 | 3.97 | Y-up, axis at (X 15, Z 15) | pending Phase 2 |
| Knight | 62,500 | 59.00 | 30.00 | 30.00 | 8.15 | Y-up, axis at (X 15, Z 15.75) | pending Phase 2 |
| Rook | 11,478 | 49.00 | 30.03 | 30.03 | 16.03 | Y-up, axis at (X 15, Z 15) | pending Phase 2 |
| Pawn | 9,398 | 43.00 | 24.00 | 24.00 | 6.38 | Y-up, axis at (X 12, Z 12) | pending Phase 2 |

One side totals 289,668 triangles: about 14.5 MB as binary STL, about 72 MB as ASCII.

---

## Detailed Implementation Plan

**Status:** draft, Revision 8.
- The owner's October 30, 2026 decisions are written in.
- The open findings from Revisions 6 and 7 are resolved in the text below, except where noted.
- It has not been re-reviewed yet. The next step is one EGM re-review of Stages 7 and 9.

**Numbering:** plan sections are P1–P6, kept separate from the spec's § numbers. A bare § always refers to the spec.

**Level of detail** (owner decision A8):
- Modules are specified as **contracts**: exports, inputs, outputs, rules and errors.
- Exact expected values live in the tests (P5).
- Implementation detail not fixed here is the engineer's choice, as long as the contract and the tests hold.

**Units:** the code works in millimetres, and the planner uses integer micrometres internally (D7). Inches exist only at the input and display edge (`src/units.js`).

### P1. Decisions

| # | Decision | Value | Reason |
|---|---|---|---|
| D1 | Piece dimensions for planning | Measured at import and stored in settings. Declared manifest dimensions are ignored in v1. | §5.2, §5.6 |
| D2 | Worker | Detail 1. | ncCAM pattern (`src/index.js:8–66`). No separate worker file and no cross-origin worker URL. |
| D3 | Free folder | One `GET /api/gcode-files`; walk the tree to `chess set/`; take the first unused name of `<name>`, `<name> (2)`, … | ncCAM's `freePath` (`src/ui/app.js:883–895`) does the same and avoids a logged 404 per probe. The tree's shape is verified (§12). |
| D4 | Export write order | `LICENSE-models.txt` → each blank STL followed by its sidecar, light side first → `layout.json`. | §5.8. `layout.json` last marks a complete job. |
| D5 | Support outcome | Phase 0 decides it. Only the selected outcome is built (owner decision A1). Until Phase 5, the planner has no neck input. | §5.5 |
| D6 | Package storage root | `.chess-set-creator/sets` | Dot-folders are hidden from the tree; verified (§12). |
| D7 | Lengths in the planner | Integer micrometres (`Math.round(mm × 1000)`). | Equal-length pieces (the bishop and the knight) must compare exactly equal. |
| D8 | Rounding | **Displays:** half up; mm to 1 decimal, inches to 2. **Minimums:** rounded up. **Maximums:** rounded down. **Input fields:** mm to 2 decimals and inches to 3, trailing zeros trimmed. | §5.4. Input fields are never re-read from their displayed text (P4.10). |
| D9 | Dependencies | `devDependencies`: `esbuild ^0.28.2` and `playwright-core ^1.64.1`. No runtime libraries. STL reading and writing are our own code. | §7 rejects three.js, mesh kernels and fflate. |
| D10 | Tests | `node --test tests/*.test.js`, on Node ≥ 20. | Same as ncCAM. |
| D11 | Plugin licence | GPL-3.0. [C] (DISC-8) | Matches AAxis and ncCAM. |
| D12 | Versioning | The manifest starts at `0.1.0`. `build.sh` bumps the patch number unless given `--no-bump`. The first build uses `--no-bump` and ships 0.1.0. The planning milestone ships as 0.1.x. After the 12 in test blank is cut, set `0.2.0` by hand and build with `--no-bump`. Every build needs a CHANGELOG entry. | AAxis `CLAUDE.md` item 5. |
| D13 | Host version floor and updates | `minAppVersion "2.0.88"`, `platforms {"v2":"2.0.88","pro-v2":"2.0.149"}`. `repository: "https://github.com/infield/ncsender-plugin-chessset"`, so ncSender's update check finds releases. | ncCAM's version values. DISC-5 may change the platforms. DISC-8 for the repository. |
| D14 | Releases | **Plugin:** tag `v<version>`, then a GitHub release with `com.infield.chessset-<version>.zip` attached (the AAxis flow). **Model package:** `<id>-<version>.zip`, holding the package folder, on a release of a separate package repository [P]. Creating either repository needs owner approval. | §5.9 |

**Detail 1 — the Worker (D2).** The same bundle, `lib/app.js`, runs in two places:
- **Inside a Worker** (`typeof document === 'undefined'`): it answers `{id, type, ...args}` messages with `{id, ok:true, result}` or `{id, ok:false, error}`. `ArrayBuffer` results are transferred.
- **In the page:** `window.ChessSet ||= {}`; it sets `build` and `mount`. Mount errors are caught and shown, as in ncCAM `src/index.js:22–28`. The engine is created once and cached.
- **Engine start:** a Worker is started from a Blob of `ChessSet.source`. `call('ping')` races a 5 s timeout. On timeout or error, the Worker is terminated and the same handlers run in the page.
- **Calls:** `call(type, args, transfer?)` returns a Promise. The Worker never fetches; the page reads every file and posts its contents.

**Detail 2 — the loader (`config.html`).** This follows ncCAM `config.html:244–265`. In order:
1. `var BUILD = 'dev';` (`build.mjs` replaces the value).
2. `var RAW_PORT = '__SERVER_PORT__'`, quoted as AAxis does it, so the page still runs when the placeholder is left unreplaced. The port is the number if `RAW_PORT` is all digits, otherwise 8090.
3. `base = window.ncSender?.getApiBaseUrl?.(port) ?? ''`.
4. `file(name) = base + '/api/plugins/com.infield.chessset/icon?file=' + encodeURIComponent(name)`.
5. If `window.ChessSet?.build !== BUILD`, fetch `lib/app.js`, inject it as a script, and store its text in `ChessSet.source`.
6. Call `ChessSet.mount(root, {base, file})`.
7. Show any load error with `textContent`.

### P2. Files

All paths are relative to `Chess-Set-Creator/`. This list is the only file tree; §6 refers to it. **N** = new, **M** = modified.

| File | | Contract |
|---|---|---|
| `.gitignore` | M | Add `node_modules/` and `tests/fixtures/bad-packages/` (generated, about 70 MB). |
| `package.json` | N | `"type":"module"`, `private:true`, `license:"GPL-3.0"`, `devDependencies` per D9. Scripts: `build`, `test`, `fixtures`, `prepare-package`, `mock`, `ui-check`. |
| `build.mjs` | N | Bundles `src/index.js` into `com.infield.chessset/lib/app.js` (IIFE, browser target, minified). Defines `__BUILD__ = <version>-<timestamp>` and writes the same value into `config.html`'s `BUILD` line. Prints the bundle size. |
| `build.sh` | N | Adapted from AAxis. Order: bump the patch number with python3 (skipped with `--no-bump`), run `node build.mjs`, delete old ZIPs, zip `com.infield.chessset/` (excluding `.DS_Store`), print a CHANGELOG reminder. |
| `com.infield.chessset/manifest.json` | N | `id`, `name:"Chess Set Creator"`, `version`, `minAppVersion`, `platforms`, `repository` (D13), `author`, `description`, `configUi:"config.html"`, `icon`, `category:"utility"`, `events:[]`, `permissions:["gcode.modify"]`, and one `toolMenu` entry, `clientOnly:true`. No `entry` field. |
| `com.infield.chessset/config.html` | N | Root `<div class="csc-shell">` plus the Detail 2 loader. `__INITIAL_CONFIG__` is not used. |
| `com.infield.chessset/lib/app.js` | N (built) | Output of `build.mjs`; never edited by hand. |
| `com.infield.chessset/icon.svg`, `README.md`, `CHANGELOG.md`, `LICENSE` | N | The icon is a pawn silhouette with `fill="currentColor"`. The README covers install, getting the package (§5.9), import, export and Download files. CHANGELOG uses the AAxis format. LICENSE is GPL-3.0. |
| `src/config.js` | N | Constants: `PLUGIN_ID`, `EXPORT_ROOT = 'chess set'`, `PACKAGE_ROOT` (D6), `DEFAULT_MACHINE` (§5.1 machine defaults), `NECK_OVERLAP = 0.5`, `NECK_SEGMENTS = 64`, `WELD_TOL = 0.001`, `WELD_RETRY_TOL = 0.01`, `FRAME_TOL = 0.1`, `BAND = 1.0`, `PROFILE_STEP = 0.5`, `MAX_COPIES = 999`. |
| `src/units.js` | N | P4.1 |
| `src/stl.js` | N | P4.2 |
| `src/measure.js` | N | P4.3 |
| `src/manifest.js` | N | P4.4 |
| `src/planner.js` | N | P4.5 |
| `src/blank.js`, `src/sidecar.js`, `src/layout.js` | N | P4.6 |
| `src/fm.js`, `src/settings.js` | N | P4.7 |
| `src/package.js` | N | P4.8 |
| `src/exporter.js` | N | P4.9 |
| `src/worker.js`, `src/index.js` | N | Detail 1. Handlers: `ping`, `measurePackage`, `loadPackage`, `buildBlankText` (P4.8, P4.9). |
| `src/ui/*` | N | P4.10 |
| `tools/prepare-package.mjs` | N | P4.11 |
| `tools/make-fixtures.mjs` | N | P5.0 |
| `tools/mock-ncsender.mjs`, `tools/harness.html`, `tools/ui-check.mjs` | N | P4.12 |
| `packages/staunton-clarkerubber/` | N (generated) | `chess-set.json`, `king.stl` … `pawn.stl` (binary), `LICENSE`. Committed to the repo; never put in the plugin ZIP. |
| `tests/*.test.js`, `tests/fixtures/` | N | P5 |
| `docs/designs/egm/chess-set-creator.md` | M | Phase results: §12, §13, Appendix B, the §5.1 defaults, and the §5.5 outcome. |

### P3. Phases and milestones

From Phase 1 onward, every phase leaves `npm test` passing. From Phase 3 onward, the plugin ZIP installs. P5.7 maps each acceptance criterion to its phase.

**Milestone M1, planning** (owner decision A6): Phases 1–4. A usable blank calculator, with no dependency on Rotary CAM. Ships as 0.1.x.

**Milestone M2, export:** Phases 5–6, after Phase 0. Reaches 0.2.0 when the test blank has been cut.

#### Phase 0 — Rotary CAM handoff test (on the shop machine; no plugin code)

Phase 0 can run at any time before Phase 5. In the ncSender browser console (same origin):
1. Record the ncSender edition and version. If it is below D13, stop and raise it.
2. Save both `test_files/` STLs to `chess set/_test/` with `POST /api/gcode-files/file/save`.
3. **O-1:** in Rotary CAM, open each file from that folder. Record whether File Manager folders are offered and whether ASCII STL loads.
4. **O-2:** with Turning axis X and On axis Model origin, run Simulate on both files. Record what is left between the pawns.
5. Delete `chess set/_test/`.
6. Write the answers into §13. Then revise §5.5 to keep only the selected outcome.

| Result | Next step |
|---|---|
| The floating file keeps a support between the pawns | Outcome A. Phase 5 builds no necks. |
| The floating file is cut through; the necked file is kept | Outcome B. Phase 5 adds the neck input, the neck check, covered tops and necks. |
| Both are cut through, or the necked file is rejected | Stop the export track and revise the spec. M1 is unaffected. |
| O-1 is no (no folder access, or ASCII rejected) | Raise it with the Rotary CAM author. The README tells users to use Download files and Rotary CAM's "Open STL…". Phase 5 is otherwise unchanged. |

#### Phase 1 — Repo skeleton and pure core

Create:
- `package.json`, `build.mjs`, `build.sh`
- `src/config.js`, `units.js`, `stl.js`, `measure.js`, `manifest.js`, `planner.js`
- `tools/make-fixtures.mjs` (mesh fixtures)
- the matching tests

Run `npm install`, then `npm run fixtures`.

**Exit:** `npm test` passes P5.1–P5.4. The `settings` test and the package-dependent cases skip at this point.

#### Phase 2 — Prepared Staunton package

1. Write `tools/prepare-package.mjs`.
2. Run it on a local clone of `clarkerubber/Staunton-Pieces` at `cef2c79`: `npm run prepare-package -- <clone>/Source/Staunton packages/staunton-clarkerubber`.
3. Check the knight's face with `--svg`.
4. Run `npm run fixtures` again, which adds the bad packages.
5. Fill in Appendix B.

**Exit:**
- The package-dependent cases in P5.3 pass.
- The measurements match Appendix B within 0.1 mm.
- Every mesh is closed.

#### Phase 3 — Plugin shell, settings, machine setup and import

Write:
- `com.infield.chessset/*`
- `src/index.js`, `worker.js`, `fm.js`, `settings.js`, `package.js`
- the UI shell, the first-run machine setup, and the Package section
- `tools/harness.html`, `tools/mock-ncsender.mjs`
- `tests/settings.test.js`

**Exit:**
- `./build.sh --no-bump` produces a 0.1.0 ZIP with no `.stl` inside.
- The plugin installs in ncSender.
- The Phase 3 acceptance criteria pass.

#### Phase 4 — Planning UI and preview (completes M1)

Write the rest of the form, the plan view, the preview and `tools/ui-check.mjs`.

**Exit:**
- `npm run ui-check -- --until=plan` passes.
- The Phase 4 acceptance criteria pass.

**M1 release:** with owner approval, create the public plugin repository and publish 0.1.x. Publish the package ZIP on its release (D14).

#### Phase 5 — Export (needs Phase 0)

Write:
- `src/blank.js`, `sidecar.js`, `layout.js`, `exporter.js`
- the `buildBlankText` handler and the export area of the UI
- for outcome B only: the neck input, the neck check and covered tops in the planner and the UI
- the blank, sidecar, layout and exporter tests

**Exit:** `npm test` and `npm run ui-check` pass in full, and the Phase 5 acceptance criteria pass.

#### Phase 6 — Shop validation

1. Export a 12 in × 2 in job with the defaults.
2. Load blank 1 in Rotary CAM, simulate it, check clearance, and cut it.
3. Record the neck, gap and cutter results in O-4, and Rotary CAM's holding-tab and parting-neck lengths in O-10.
4. Update the §5.1 defaults if they changed.
5. Set the version to `0.2.0`, add a CHANGELOG entry, and run `./build.sh --no-bump`.

**Exit:** O-4 and O-10 are closed in the spec.

### P4. Module contracts

#### P4.1 `units.js`

- `MM_PER_IN = 25.4`.
- `roundHalfUp(x, d)`, `ceilTo(x, d)`, `floorTo(x, d)`. Each must give the P5.1 results despite floating-point noise.
- `fmt(mm, primary)` returns the primary unit first, then the other in parentheses:
  - mm to 1 decimal: `"457.2 mm (18.00 in)"`
  - inches to 2 decimals: `"18.00 in (457.2 mm)"`
- `fieldText(mm, unit)` returns the text for an input field: mm to 2 decimals, inches to 3, trailing zeros trimmed.
- `parse(text, unit)` accepts a plain decimal only (optional leading digits, optional `.digits`). It returns mm, or `null`.

#### P4.2 `stl.js`

A triangle list is a `Float64Array` holding 9 numbers per triangle.

- `parseStl(buf)`:
  - The file is binary when `byteLength === 84 + 50 × count`, where count is the uint32 at byte offset 80. Otherwise it is ASCII, and every `vertex x y z` line is read in order.
  - Throws `"not an STL"` when there are no vertices, the vertex count is not a multiple of 3, or any coordinate is not finite.
- `writeAscii(name, tris)`:
  - Uses the layout of `test_files/` (`solid`, `facet normal`, `outer loop`, three `vertex` lines, `endloop`, `endfacet`, `endsolid`).
  - Vertices have 4 decimals.
  - Normals are computed from the winding, and are `0 0 0` when degenerate.
  - The text is built in chunks, so a 38 MB result doesn't come from repeated string concatenation.
- `writeBinary(tris)`: a standard binary STL with computed normals.
- `transform(tris, s, dx)`: returns a new array with `x·s + dx`, `y·s`, `z·s`.
- `toBase64(u8)` and `fromBase64(s)`: round-trip any bytes exactly, without call-stack limits on 10 MB inputs.

#### P4.3 `measure.js`

The axis is X.

- `weld(tris, tol)`: merges vertices within `tol` (Euclidean). Returns `{verts, faces, degenerate}`; faces with a repeated index are dropped and counted.
- `closedCheck(verts, faces)`: returns `{closed, openEdges, volume}`. The mesh is closed when every undirected edge is used exactly twice. The volume is signed.
- `measure(tris)`: returns `{minX, maxX, axialLength, axisOffset, baseDiameter, sweptDiameter, topDiameter}`, with these definitions:
  - The base band is the vertices with `x ≤ minX + BAND`.
  - `axisOffset` is the distance from the origin to the centre of the base band's Y/Z bounding box.
  - The diameters are twice the largest `hypot(y, z)`: over all vertices (swept), over the base band (base), and over `x ≥ maxX − BAND` (top).
- `profile(tris)`: the largest radius in each `PROFILE_STEP` slice from `minX`. An empty slice repeats the previous value.
- `checkPiece(buf)`: pure and synchronous. It runs §5.6 import checks 3 and 4 for one file and returns `{measurements, profile, tris, errors}`.
  - A parse failure gives `["unreadable STL"]`, and nothing else is checked.
  - Otherwise both frame checks run, and every failure is collected:
    - `axisOffset ≤ FRAME_TOL`
    - `|minX| ≤ FRAME_TOL`
  - There is no mesh-closure check, no declared-size comparison and no checksum (owner decision A4).

#### P4.4 `manifest.js`

`validateManifest(json, names)` returns `{errors, manifest}`. `names` is the set of file paths in the folder, relative to the folder root. Each error is `{field, message}`.

**Rules:**
1. `schema` is the integer 1.
2. `id` matches `^[a-z0-9-]+$`.
3. `version` matches `^\d+\.\d+\.\d+$`.
4. `name` is a non-empty string of at most 80 characters.
5. `author`, `source`, `license` and `attribution` are non-empty strings.
6. `licenseFile` passes the path rule, and only then must be present in `names`.
7. `units` is exactly `"mm"`. Anything else gives *"Inch packages are not supported in v1; units must be mm."*
8. `frame` is exactly `"x-axis-base-at-origin-v1"`.
9. `pieces` has exactly the six role keys. Each role's `file` passes the path rule, and only then must be present in `names`. The other fields of a piece are ignored.
10. `notes`, if present, is a string of at most 2000 characters.

Unknown top-level fields, including `sha256`, are ignored.

**Path rule:** a non-empty string with no `\`, not starting with `/`, and with no `.` or `..` segment.

#### P4.5 `planner.js`

`plan(inputs, pieces, machine)` is pure. **Inputs** (all mm):
- `queenBase`, `stockLength`, `stockShape`, `stockWidth`
- `chuckRes`, `tailRes`, `gap`, `radialAllowance`
- `sides`: `'light'`, `'dark'` or `'both'`
- outcome B only: `neckDiameter`

`pieces` holds the installed package's measured dimensions. `machine` is `{maxBlankLength, jaws:[{name, min, max}]}`.

**Errors** are `{code, field?, role?, values}`, with `values` in mm. The UI renders each code with `fmt`:

| Code | Message |
|---|---|
| `RANGE` | `<label>` must be between `<min>` and `<max>` ("must be at least `<min>`" when there is no max); or `<label>` must be a number. |
| `NO_USABLE` | Reservations (chuck `<chuck>` + tailstock `<tail>`) leave no usable length on `<length>` stock. |
| `TOO_LONG_FOR_MACHINE` | Stock length `<length>` is longer than the longest blank the machine holds (`<max>`). |
| `JAW` | Stock width `<width>` is outside every jaw set (`<list of name min–max>`). Nearest width that fits: `<nearest>`. |
| `TOO_WIDE` | `<piece>` needs `<need>` (swept Ø `<swept>` + 2 × `<allowance>`) but the stock is `<width>` wide. Minimum stock width: `<minWidth>`. |
| `TOO_LONG` | `<piece>` is `<length>` long but the usable length is `<usable>`. Minimum stock length: `<minLength>`. |
| `NECK_WIDER_THAN_BASE` | Outcome B only: Neck Ø `<neck>` is wider than the `<piece>` base (`<base>`). |

**Rules, in order:**
1. **Ranges** (§5.1). Any `RANGE` error, including a `null` value, stops here. The output is `{errors}` only.
2. **Scale:** `scale = queenBase / pieces.queen.baseDiameter`. Every scaled dimension is measured × scale.
3. **Checks.** All are collected before stopping:
   - **Usable length:** `usable = stockLength − chuckRes − tailRes`. If `usable ≤ 0`, report `NO_USABLE` and skip the length checks.
   - **Machine length:** report `TOO_LONG_FOR_MACHINE` if `stockLength > maxBlankLength`.
   - **Jaw set:** `jawSet` is the first jaw set whose range contains the stock width. If there is none, report `JAW`. `nearest` is the closest range boundary; a tie goes to the larger value.
   - **Width:** for each role, `need = scaledSwept + 2·radialAllowance`. Report `TOO_WIDE` when `need > stockWidth`. `minWidth = ceilTo(max need, 1)`.
   - **Length:** for each role, when `usable > 0`, report `TOO_LONG` when `scaledAxial > usable`. `minLength = ceilTo(max scaledAxial + chuckRes + tailRes, 1)`.
   - **Neck** (outcome B only): report `NECK_WIDER_THAN_BASE` when `neckDiameter > min scaledBase`.
4. **Covered tops** (outcome B only): the roles whose `scaledTop < neckDiameter`.
5. **Packing** (§5.4). In integer µm, with counts `[1,1,2,2,2,8]` per side in K, Q, B, N, R, P order:
   - Search every count vector that fits one blank.
   - Memoise the best plan for each remaining-count vector.
   - Compare plans by: fewer blanks; then the larger used length at the first blank where they differ; then the piece lists in K, Q, B, N, R, P order, where a list that is a prefix of another comes first.
   - The comparison has optimal substructure, so the memoised search is exact.
6. **Per blank:**
   - Pieces go in descending axial length; equal lengths go K, Q, B, N, R, P.
   - X ranges start at 0 and step by length + gap.
   - `used` is the last end, and `leftover = usable − used`.
7. **Output** (mm):
   - Always: `{errors, scale, jawSet (name or null), pieces (scaled)}`, plus `coveredTops` under outcome B.
   - When there are no errors, also: `blanks:[{index, pieces:[{role, xStart, xEnd}], used, leftover}]` and `summary:{blanksPerSide, sideCount, totalBlanks, stockToBuy}`.

#### P4.6 `blank.js`, `sidecar.js`, `layout.js`

All three are pure.

- **`buildBlank(blank, meshes, scale, neck?)`:** returns a triangle list. Each piece is `transform(meshes[role], scale, xStart)`.
  - Outcome B only, with `neck` given: one closed cylinder per gap, on the X axis, with radius `neck/2` and `NECK_SEGMENTS` segments. It runs from `prevEnd − NECK_OVERLAP` to `nextStart + NECK_OVERLAP`, wound counter-clockwise as seen from outside.
- **`buildSidecar({blank, file, inputs, jawSet, pluginVersion, folder})`:** returns the §5.11 object, following its writer rules.
- **`buildLayout({pluginVersion, pkg, inputs, plan, sides, createdAt, outcome})`:** returns `layout.json`, schema 1:

```jsonc
{
  "format": "chess-set-creator-layout", "formatVersion": 1, "createdAt": "<ISO>",
  "plugin": { "id": "com.infield.chessset", "version": "0.1.0" },
  "package": { "id": "staunton-clarkerubber", "version": "1.0.0", "name": "Staunton (clarkerubber)" },
  "units": "mm", "frame": "x-axis-base-at-origin-v1", "turningAxis": "X", "onAxis": "model-origin",
  "scale": 1.27, "queenBaseDiameter": 38.1,
  "stock": { "length": 304.8, "width": 50.8, "shape": "square", "jawSet": "alternate" },
  "reservations": { "chuck": 25.4, "tailstock": 19.05 },
  "gap": 10, "radialAllowance": 1.5,
  "supportOutcome": "B", "neckDiameter": 7.6, "coveredTops": ["queen", "bishop"],
  "blanks": [
    { "side": "light", "index": 1, "file": "light_blank_01.stl",
      "pieces": [ { "role": "king", "xStart": 0, "xEnd": 99.06 } ],
      "usedLength": 260.03, "leftoverLength": 0.32 }
  ]
}
```

`layout.json` rules:
- There is one `blanks` entry per blank per selected side: all light blanks, then all dark blanks. `index` restarts at 1 for each side.
- Numbers are rounded half up to 0.001 mm, and `scale` to 6 decimals.
- Under outcome A, `supportOutcome` is `"A"`, `neckDiameter` is `null`, and `coveredTops` is `[]`.

#### P4.7 `fm.js` and `settings.js`

**`createFm(base)`** returns these functions:

| Function | Contract |
|---|---|
| `saveText(path, content)` | `POST /api/gcode-files/file/save` with a JSON `{path, content}` body. Throws `{status, body}` when the response isn't OK. |
| `readText(path)` | `GET /api/gcode-files/file?path=<encodeURIComponent(path)>`. Returns `(await res.json()).content`, or `null` on 404. Throws `{status, body}` otherwise. |
| `tree()` | `GET /api/gcode-files`. Returns the parsed JSON (§12). |
| `getSettings()`, `putSettings(obj)` | `GET` / `PUT /api/plugins/com.infield.chessset/settings`. |

**`settings.js` contract:**
- `DEFAULTS = {schema:1, displayUnit:'in', machine:null, packages:{}, lastPackage:null, lastInputs:{...§5.1 defaults, sides:'both'}}`.
- `load(fm)` merges the stored settings over `DEFAULTS`, merging `lastInputs` field by field. On failure it returns `DEFAULTS` and sets `offline = true`.
- `save(fm, patch)` runs these steps:
  1. GET the stored settings.
  2. Merge them as `load` does.
  3. Apply the patch. A `lastInputs` patch is merged into the existing `lastInputs`.
  4. PUT the whole object.

  If the GET fails, it throws `SettingsError(status)` and doesn't PUT. Saves are serialised through one promise chain, so two saves never interleave.
- `machine === null` means the first-run setup is shown (§5.1).

**When settings are saved:**
- `lastInputs`: 1 s after the last input change.
- `displayUnit`: on toggle.
- `machine`: when setup is saved, or when the Machine section is edited.
- `packages` and `lastPackage`: on import.

#### P4.8 `package.js` (import)

**`importPackage({fm, call, settings, fileList, onProgress})`:**
1. The user picks a folder with `<input type="file" webkitdirectory>`. The first segment of `webkitRelativePath` is the root; `names` are the paths with the root removed. If there is no root `chess-set.json`, the error is "No chess-set.json in the selected folder."
2. Parse the JSON (a parse error is reported with `field:"(file)"`), then run `validateManifest`. Stop on any error.
3. Read the six STLs. The Worker handler `measurePackage({files:{role: ArrayBuffer}})` runs `checkPiece` for each role and returns `{role: {measurements, profile, b64, errors}}`, where `b64 = toBase64(writeBinary(tris))`.
4. If any role has errors, show them all as `file — check — value` and store nothing.
5. Save to `dir = PACKAGE_ROOT/<id>@<version>/`: `chess-set.json` (the original text), `LICENSE` (the `licenseFile` text) and the six `<role>.stl.b64` files. If a save fails, stop, write nothing to settings, and show *"Saving <path> failed (<status>). The package is not installed."*
6. Save to settings: `packages["<id>@<version>"] = {id, version, name, author, source, license, attribution, dir, installedAt, pieces:{role:{axialLength, baseDiameter, sweptDiameter, topDiameter, profile}}}` and `lastPackage = "<id>@<version>"`. Re-importing the same key replaces it.

**`loadPackageMeshes({fm, call, key, pkg})`:**
- Reads the six `.b64` files with `readText` and calls `loadPackage({key, b64})`.
- The page records loaded keys in a `Set` and skips keys it has already loaded.
- A missing file (`null`) throws *"The installed package files are missing (<path>). Re-import the package."*

#### P4.9 `exporter.js`

- **`defaultJobName`:** follows §5.8.
- **`validJobName`:** matches `^[A-Za-z0-9 ._()-]+$`, doesn't start with `.`, and doesn't contain `..`. Otherwise the error is *"Job name may use letters, digits, space and . _ - ( ) only."*
- **`freeFolder(tree, name)`:** D3. After `MAX_COPIES` attempts the error is *"Too many copies of <name>; rename the job."*
- **`exportJob({fm, call, plan, pkg, inputs, sides, jobName, onProgress})`**, in order:
  1. Validate the job name.
  2. `loadPackageMeshes`.
  3. Read `LICENSE` from `pkg.dir`.
  4. `freeFolder`.
  5. Save in the D4 order. Each blank's text comes from `call('buildBlankText', {key, blank, scale, neck?, name})` and is released after its save. Each sidecar follows its STL.

  It returns `{folder, files}`. `pluginVersion` is `__BUILD__` up to its first `-`.
- **On a failed save:** stop and throw `ExportError({path, status, body})`. The UI shows *"Saving <path> failed: <status> <body>. Files already written stay in place; this folder has no layout.json, so it is incomplete."* together with **Download files**.
- **`downloadFiles({…same})`:** builds the same files in the same order. Each is offered as a browser download through an object URL and a temporary `<a download>`, one at a time, and each blank is released after it is offered. File names match §5.8.

The exporter never calls `/api/gcode-files/load*`, `/api/gcode-job` or `/api/send-command`.

#### P4.10 UI (`src/ui/`)

- **Shell:** a header (title, unit toggle, build tag) and two columns that stack below 900 px. Text is set only with `textContent`; there is no `innerHTML` anywhere in `src/`. The style element is injected once (`id="csc-style"`) and uses ncSender CSS variables. Selectors use (0,2,1) specificity, e.g. `.csc-shell .csc-main button` (AAxis item 9). No `alert`, `confirm` or `prompt`.
- **First-run setup:** shown when `machine === null`. It holds the max blank length and 1–4 jaw-set rows (name, min, max), filled with `DEFAULT_MACHINE`, and a **Save machine settings** button. Nothing else shows until it is saved.
- **Left column**, in order:
  1. **Package:** a read-only line for the installed package (a selector is v2), the **Import package folder** button, import progress and errors.
  2. **Size:** queen base diameter.
  3. **Stock:** length, shape and width, with a jaw-set readout.
  4. **Allowances:** chuck reservation, tailstock reservation, gap, radial allowance, and, under outcome B, neck diameter.
  5. **Sides:** both / light / dark.
  6. **Machine:** collapsed; the same fields as the setup screen.
- **Input fields:**
  - State holds mm.
  - A field is parsed only on its own `input` event; changing the unit re-renders the fields from state and never re-parses them.
  - Fields show `fieldText`. A small line below each one shows the other unit and the valid range, or the `RANGE` message.
- **Right column** (shown when a package is installed):
  - the error box (only when there are errors)
  - the piece table: role, per side, axial length, base Ø, swept Ø, and under outcome B a "top covered" mark
  - a summary line
  - one card per blank, titled "Blank n · per side × 2", or with the side name when only one side is selected. Each card shows:
    - the piece list
    - used and leftover length
    - stock and reservations in both units
    - the jaw set
    - the preview
  - the export area: the job-name field, **Export to File Manager**, **Download files** (a secondary button), and a progress line
- **Preview:** an SVG with `viewBox="0 0 <stockLength> <stockWidth>"`. It holds:
  - the stock rectangle
  - the reservation areas
  - each piece as its profile mirrored about the centre line `y = stockWidth/2`, offset by `chuckRes + xStart`
  - under outcome B, each neck as a rectangle centred on the same line

  It is built with `createElementNS`, using ncSender CSS colour variables.
- **Closing:** `window.postMessage({type:'close-plugin-dialog'}, '*')`.

#### P4.11 `tools/prepare-package.mjs`

**Usage:**
- `prepare-package <src> <outDir> [--knight-flip] [--replace <Piece>=<file.stl>]`
- `prepare-package --measure <file.stl> [--x0 <a> --x1 <b>]`
- `prepare-package --svg <outDir>`

**For each piece** (`<src>/<Piece>/<Piece>.STL`, or the `--replace` file):
1. Rotate Y-up to the X axis: `(x, y, z) → (y, −x, z)`.
2. Translate so the base-band centre is on the axis and `minX = 0`.
3. **Knight only:** rotate about X so that the mean Y/Z of its top 40% points to +Z. `--knight-flip` adds 180°. The tool prints the angle.
4. Weld at `WELD_TOL` and check closure. If the mesh isn't closed, retry at `WELD_RETRY_TOL`, rebuild from the welded mesh, and check again at `WELD_TOL`. If it is still open, stop with *"<Piece> is not closed (<k> open edges): repair it in MeshLab (Filters → Cleaning and Repairing → Close Holes), then rerun with --replace <Piece>=<repaired.stl>"*, and write nothing. If MeshLab can't close it either, the owner decides.
5. Measure the piece and write `<role>.stl` as binary STL.

**Then:**
- Write `chess-set.json`, with the §5.6 example fields, measured dimensions rounded to 0.01, and the knight note.
- Copy `LICENSE` from the repository root of `<src>`.
- Print an Appendix B table with the weld tolerance used and the closed status.

**Other modes:**
- `--measure` prints the axial length and the base, swept and top diameters. With `--x0` and `--x1`, it keeps only the triangles whose vertices all lie in that range.
- `--svg` writes a side view and an end view of the knight to `<outDir>/knight-check.svg`, for checking the face direction.

#### P4.12 Mock ncSender, harness and UI check

**`tools/mock-ncsender.mjs`** is adapted from ncCAM's `dev/serve.mjs`. It is a Node `http` server on port 8777, and its store is **in memory only**. Routes:
- `/` serves `tools/harness.html`.
- `POST /api/plugins/com.infield.chessset/config-ui` returns `config.html` as `text/html`, with `__SERVER_PORT__` replaced, as the real host does.
- `icon?file=` serves files from `com.infield.chessset/` and rejects `..`.
- Settings `GET` returns `{}` until the first `PUT`.
- `/api/gcode-files` returns a tree in the §12 shape and hides dot-names.
- `file/save` stores the content. For `.stl` and `.b64` files, only the path and size are kept.
- `file?path=` returns `{content}`, or 404. A path containing `..` returns 404 on GET and 500 on save, as the host does.
- `POST /__mock/fail-save {after:n}` makes the n-th following save return 500.
- `GET /__mock/store` returns the store.
- Every call is logged. Calls to `load*`, `gcode-job` and `send-command` are logged as `FORBIDDEN`.

**`tools/harness.html`** is copied from ncCAM's `dev/harness.html`, with these changes:
- it reads the `config-ui` response with `res.text()`
- the title and the plugin id in the URL are changed
- `dropFixture`, `[data-file]` and the `/fixtures/` hooks are removed

**`tools/ui-check.mjs`:** P5.8.

### P5. Test plan

#### P5.0 Fixtures (`tools/make-fixtures.mjs`)

- **Meshes:**
  - `cube.stl`: 10 mm, ASCII, closed, volume 1000.
  - `cube-open.stl`: one face (2 triangles) removed, leaving 4 open edges.
  - `cube-gap.stl`: two shared vertices offset by 0.0005 mm.
  - `cylinder-ascii.stl`: along X from 0 to 20, radius 5, 64 segments, capped ends.
  - `cylinder-binary.stl` = `writeBinary(parseStl(cylinder-ascii))`.
- **Bad packages:** written under `tests/fixtures/bad-packages/` (git-ignored) once `packages/staunton-clarkerubber/` exists. Each is a copy of the prepared package with one change:
  - `missing-file`: `rook.stl` deleted
  - `schema-2`: `schema` set to 2
  - `inch-units`: `units` set to `"in"`
  - `shifted-axis`: the pawn moved +0.5 mm in Y
  - `script-name`: `name` set to `<script>x</script>`

#### P5.1 `units.test.js`

- `roundHalfUp(7.15, 1) === 7.2`
- `roundHalfUp(412.75 − 405.6, 1) === 7.2`
- `roundHalfUp(0.32, 1) === 0.3`
- `ceilTo(41.2, 1) === 41.2`
- `ceilTo(41.138, 1) === 41.2`
- `floorTo(47.75, 1) === 47.7`
- `fmt(457.2, 'in') === '18.00 in (457.2 mm)'`
- `fmt(304.8, 'mm') === '304.8 mm (12.00 in)'`
- `fieldText(10, 'in') === '0.394'`
- `fieldText(7.6, 'mm') === '7.6'`
- `parse('2.5', 'in') === 63.5`
- `parse('abc', 'mm') === null`
- `parse('2.', 'mm') === null`

#### P5.2 `stl.test.js`

- The ASCII and binary cylinders parse to the same triangles within float32 precision.
- `writeBinary` → `parseStl` round-trips at float32 precision.
- `writeAscii` → `parseStl` round-trips within 5e-5.
- Base64 round-trips 100,001 random bytes exactly.
- A file with 0 triangles, and an 83-byte file, both throw.
- `test_files/test_two_pawns_necked.stl` parses.

#### P5.3 `measure.test.js` and `manifest.test.js`

**Meshes:**
- `cube.stl` is closed, with volume 1000.
- `cube-open.stl` is not closed, with 4 open edges.
- `cube-gap.stl` is closed after welding.
- The cylinder measures `swept = base = top = 10` and axial length 20.

**Bad manifests** each give exactly one error, naming the field:
- `schema: 2`
- `version: "../x"`
- `id: "A B"`
- `units: "in"`
- `frame: "y-up"`
- a missing `pawn`
- `file: "../king.stl"` (the path rule only; no presence error)
- `file: "King.stl"` when only `king.stl` exists

**Package cases** (skipped while the package or the fixtures are absent, using `{skip: !existsSync(dir) && 'reason'}`):
- The prepared package passes `validateManifest`, and all six pieces pass `checkPiece`, with measurements matching Appendix B within 0.1 mm.
- Exactly one error each:
  - `missing-file`: presence
  - `schema-2`: schema
  - `inch-units`: units
  - `shifted-axis`: axis offset
- `script-name` passes validation. Its name is shown as text (P5.8).

#### P5.4 `planner.test.js` and `settings.test.js`

The planner tests use the Appendix B dimensions and `DEFAULT_MACHINE`.

**The §11 worked examples, exactly:**
- **12 in × 2 in:**
  - piece lists: K Q P | R P P P | R P P P | B B N | N P
  - used: 260.0 / 256.1 / 256.1 / 244.8 / 139.5
  - leftover: 0.3 / 4.3 / 4.3 / 15.6 / 120.8
- **18 in × 2 in:**
  - piece lists: K Q B P P | B R P P P P | N N R P P
  - used: 409.6 / 405.6 / 361.3
  - leftover: 3.2 / 7.2 / 51.4
- 2½ in stock gives the same plans. Queen bases of 36 mm and 40 mm give 5 blanks per side on 12 in stock and 3 on 18 in stock.

**Acceptance criteria:**
- **AC-PLAN-02:** every plan contains exactly 1 K, 1 Q, 2 B, 2 N, 2 R and 8 P.
- **AC-FIT-01:**
  - 38.1 mm square stock gives 5 `TOO_WIDE` errors (every piece but the pawn), with `minWidth` 41.2.
  - The largest queen base that fits, searched in 0.1 mm steps, is 47.7 on 2 in stock and 60.4 on 2½ in stock.
- **AC-FIT-03:**
  - 100 mm stock gives exactly 5 `TOO_LONG` errors (K, Q, B, N, R), each with `minLength` 143.6. The usable length is 55.55, and the pawn (54.61) fits.
  - 1000 mm stock gives `TOO_LONG_FOR_MACHINE`.
  - Chuck 200 + tail 200 on 300 mm stock gives exactly one error, `NO_USABLE`.
- **AC-FIT-04**, with the default jaws:
  - 50.8 gives `jawSet` "alternate".
  - 19.05 gives "standard" (it is still returned alongside the `TOO_WIDE` errors).
  - 24 gives `JAW` with nearest 22.86, shown as 22.9.
  - 24.5 gives `JAW` with nearest 25.4.
  - 70 gives `JAW` with nearest 63.5.
  - A custom machine with one jaw set of 30–80 mm gives `jawSet` for 70.

**Other planner checks:**
- `RANGE`: a gap of 5 gives one `RANGE` error and nothing else, and a `null` stock width gives one `RANGE` error.
- `plan()` on 18 in stock finishes in under 100 ms on the development Mac.
- **Outcome B** (added in Phase 5, only if selected):
  - a 31 mm neck gives `NECK_WIDER_THAN_BASE` (the pawn base is 30.48)
  - covered tops at the defaults are `['queen', 'bishop']`

**`settings.test.js`:**
- When the fake GET fails, `save` throws `SettingsError` and sends no PUT.
- `save({lastInputs:{gap:12}})` keeps `packages`, `machine` and the other `lastInputs` fields.
- Two `save` calls in a row are applied in order.

#### P5.5 `blank.test.js`, `sidecar.test.js` and `layout.test.js`

- **Two-pawn blank** (pawn, scale 1.27, gap 10): min X is 0 ± 1e-6, and max X is 119.22 ± 0.05.
  - Under outcome B, with a 7.6 mm neck, the welded blank is closed.
  - Under outcome A, the blank has no neck triangles.
- **KQP blank:** the queen slice from x 109.05 to 195.43 (the planner's `xStart − 0.01` to `xEnd + 0.01`) measures a base diameter of 38.1 ± 0.05 (AC-SIZE-01).
- **`layout.test.js`:**
  - Uses the Appendix B dimensions, a fixed `pkg`, plugin version `0.1.0`, a fixed `createdAt`, `sides:'both'` and outcome B.
  - Compares field by field against the hand-written `tests/fixtures/layout-12in.json`, which has 10 `blanks` entries: light 1–5, then dark 1–5, with the x ranges below.
  - Doesn't need the package files.

| Blank | Pieces (x ranges, mm) | Used | Leftover |
|---|---|---|---|
| 1 | K 0–99.06; Q 109.06–195.42; P 205.42–260.03 | 260.03 | 0.32 |
| 2 | R 0–62.23; P 72.23–126.84; P 136.84–191.45; P 201.45–256.06 | 256.06 | 4.29 |
| 3 | same as 2 | 256.06 | 4.29 |
| 4 | B 0–74.93; B 84.93–159.86; N 169.86–244.79 | 244.79 | 15.56 |
| 5 | N 0–74.93; P 84.93–139.54 | 139.54 | 120.81 |

- **`sidecar.test.js`:** for 12 in × 2 in square stock with the defaults, the sidecar of light blank 1 contains:

```json
{ "format": "rotary-setup", "formatVersion": 1, "model": "light_blank_01.stl", "units": "mm",
  "orientation": { "turningAxis": "X", "chuckEnd": "min", "onAxis": "model-origin", "upAtZero": "+Z" },
  "stock": { "shape": "square", "width": 50.8, "length": 304.8 },
  "placement": { "chuckOffset": 25.4, "modelLength": 260.03 },
  "workholding": { "jawSet": "alternate", "tailstock": true } }
```

#### P5.6 `exporter.test.js`

These tests use a fake `fm` (with a fixed tree) and a fake `call`, both of which record their calls.
- **Order of calls:** the `LICENSE` read and the mesh reads come first, then `LICENSE-models.txt`, then light 01 STL, light 01 sidecar, …, dark 05 STL, dark 05 sidecar, then `layout.json`.
- **Free folder:** with `job` present in the tree, the export goes to `job (2)`.
- **Failure:** when save number 3 fails, `ExportError` is thrown, with no further saves and no `layout.json`.
- **Missing meshes:** a `null` `.b64` read gives the "Re-import the package" error, and nothing is saved.
- **Job names:** `../x`, `a/b` and `.hidden` are rejected; `Q38.1 (test)` is accepted.
- **Default name:** at a queen base of 40 it is `staunton-clarkerubber Q40 457x51`.
- **Download files:** offers the same file names in the same order.
- **No forbidden calls:** no recorded path matches `/load|gcode-job|send-command/`.

#### P5.7 Acceptance criteria by phase

| AC | Phase | Method |
|---|---|---|
| AC-PKG-01 | 3 | List the ZIP: no `.stl` inside |
| AC-PKG-02 | 3 (M1 release) | Manual: download the release ZIP, unzip it, import it |
| AC-PKG-03 | 2 / 3 | Unit tests (P5.3); manual import of each bad package |
| AC-PKG-04 | 3 | Manual: rebuild and reinstall the ZIP, disconnect the network, reopen |
| AC-SEC-01 | 3 / 4 | Unit test (P5.3); ui-check step 8 |
| AC-IN-01, AC-IN-02 | 4 | Unit tests (P5.1, P5.4); ui-check steps 4–5 |
| AC-IN-03 | 5 | Manual: "Light only" exports light blanks only |
| AC-IN-04 | 3 | ui-check step 1 |
| AC-SIZE-01 | 5 | Unit test (P5.5); `--measure --x0 --x1` on an exported blank |
| AC-FIT-01 to AC-FIT-04 | 1 / 4 | Unit tests (P5.4); ui-check step 5 |
| AC-PLAN-01 to AC-PLAN-04 | 1 / 4 | Unit tests (P5.4); ui-check step 3 |
| AC-UI-01 | 4 | Manual: the preview is to scale |
| AC-EXP-01, 02, 05, 07 | 5 | Unit tests (P5.6); ui-check steps 9–12 |
| AC-EXP-03 | 5 | Unit test (P5.5) |
| AC-EXP-04 | 5 / 6 | Manual, in Rotary CAM |
| AC-EXP-06 | 5 (outcome B) | Unit test (covered tops); manual check of the piece table |
| AC-EXP-08 | 5 | Unit test (P5.5 sidecar); Rotary CAM applying it is a manual check once O-13 is resolved |
| AC-REL-01 | M1 release | Manual: install from the release URL |

#### P5.8 `tools/ui-check.mjs`

- The script starts a **fresh** mock (in-memory store) for each run.
- It launches Playwright Chromium. `CSC_CHROME` sets the browser path; it is required where Google Chrome isn't installed at its default macOS path.
- It records every `pageerror` and every console error. The run fails if there are any.
- `--until=plan` runs steps 1–8.

**Steps:**
1. Open the dialog. The first-run setup shows; save it with the defaults.
2. Import `packages/staunton-clarkerubber/` through `setInputFiles` on the `webkitdirectory` input. The package shows as installed.
3. Set the stock length to 12 in. Expect 5 cards.
4. Switch the units to mm. The first card shows `304.8 mm (12.00 in)`. The gap field shows `10`, and the plan is unchanged.
5. Type width 38.1 (mm): the error box lists 5 pieces. Set the width back to 50.8.
6. Type gap 5: a `RANGE` message appears. Set the gap back to 10.
7. Close the dialog, reopen it through the harness, and check that the inputs are restored.
8. Import `tests/fixtures/bad-packages/script-name/`. The name shows literally as `<script>x</script>`.
9. *(Phase 5)* Export. `GET /__mock/store` holds 10 STLs, 10 sidecars, `layout.json` and `LICENSE-models.txt`.
10. Export again. The `(2)` folder is used.
11. `POST /__mock/fail-save {after:3}`, then export. **Download files** is offered.
12. The mock log has no `FORBIDDEN` lines.

### P6. Order of work and checkpoints

| Phase | Depends on | Checkpoint |
|---|---|---|
| 0 | the shop machine and Rotary CAM | O-1 and O-2 recorded; §5.5 revised to the selected outcome |
| 1 | — | `npm test` passes P5.1–P5.4 |
| 2 | 1 | Prepared package and bad packages pass; Appendix B filled in |
| 3 | 2 | ZIP installs; first-run setup and import work; Phase 3 ACs pass |
| 4 | 3 | `ui-check --until=plan` passes. **M1 release** (owner approval for the public repository) |
| 5 | 0, 4 | `npm test` and `ui-check` pass in full; Phase 5 ACs pass |
| 6 | 5 | O-4 and O-10 closed; version 0.2.0 |
