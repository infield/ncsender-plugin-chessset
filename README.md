# Chess Set Creator (ncSender plugin)

*This plugin started as a joke posted on the ncSender Discord channel.*

**Status: public beta, 0.1.x.** Planning works and is released. Export works, but its files haven't been tested in Rotary CAM yet, because Rotary CAM isn't released. Latest release: [GitHub releases](https://github.com/infield/ncsender-plugin-chessset/releases/latest).

## What it does

A rotary-turning helper for ncSender 2.x, for advanced hobbyists with a rotary axis:
1. Installs a chess set from the [chess-set library](https://github.com/infield/chessset-library) in one click (or imports a set folder).
2. Scales the set from one setting, the queen's base diameter.
3. Checks every piece against the stock width, the usable length and your chuck's jaw sets.
4. Packs each side (light and dark) onto the fewest turning blanks, and shows each blank to scale.
5. Exports one STL per blank, with a setup file for Rotary CAM, into ncSender's File Manager, or as separate downloads.

The plugin never moves the machine. Lengths follow ncSender's units setting, with the other unit shown below, and everything is stored in mm.

## Install and use

See the plugin's own README, [`com.infield.chessset/README.md`](com.infield.chessset/README.md), which ships inside the ZIP. Release notes are in [`com.infield.chessset/CHANGELOG.md`](com.infield.chessset/CHANGELOG.md).

## Chess sets

The models are not part of the plugin. They live in a separate repository, [infield/chessset-library](https://github.com/infield/chessset-library), one package per set style, each with its own licence and releases: Staunton, Dubrovnik I 1950, Minimal Look, Minimalist contemporary and Gothic. Some are non-commercial only. All are 0.1.0 beta.

Sets are prepared with `tools/prepare-package.mjs`: the Staunton set from its source repository, the others from a recipe in [`packages/recipes/`](packages/recipes/) (spec §10, plan P4.11). The source downloads go in `sources/`, which git ignores.

## Development

Needs Node 22 (`.nvmrc`: 22.22.0, the version in ncSender 2.0.27x).

| Command | What it does |
|---|---|
| `npm install` | Installs esbuild and playwright-core (the only dependencies; dev only) |
| `npm test` | Unit tests (`node --test tests/*.test.js`) |
| `npm run ui-check` | Drives the dialog in headless Chrome against a mock ncSender, including import, planning and export |
| `npm run mock` | The mock ncSender on http://localhost:8777/, for trying the dialog in a browser |
| `npm run fixtures` | Rebuilds the test meshes and the bad packages |
| `./build.sh` | Bumps the patch version, bundles `src/` into `com.infield.chessset/lib/app.js` and zips the plugin (`--no-bump` keeps the version) |
| `npm run prepare-package -- …` | Prepares a set package (see above) |

| Folder | Holds |
|---|---|
| `src/` | The plugin code: pure core (units, STL, measurement, planner, blank, sidecar, layout) and host modules (File Manager, settings, import, library, exporter, UI) |
| `com.infield.chessset/` | The plugin as installed: manifest, `config.html` loader, built `lib/app.js`, README, CHANGELOG, licence |
| `tests/`, `tools/` | Unit tests and fixtures; packaging tool, mock ncSender, test harness, UI check |
| `packages/` | The prepared Staunton package (used by the tests) and the set recipes |
| `test_files/` | The two-pawn files for the Rotary CAM test (Phase 0) |

## Documents

| | |
|---|---|
| Spec: requirements, design and implementation plan (the only spec) | [`docs/designs/egm/chess-set-creator.md`](docs/designs/egm/chess-set-creator.md) |
| Feature status | [`docs/product/requirements/feature-index.md`](docs/product/requirements/feature-index.md) |
| Owner decisions | [`docs/product/decisions/product-decisions.md`](docs/product/decisions/product-decisions.md) |
| Product summary | [`PRODUCT.md`](PRODUCT.md) |
| Roadmap and phase status | [`ROADMAP.md`](ROADMAP.md) |
| How work moves from product → design → engineering | [`WORKFLOW.md`](WORKFLOW.md) |
| Review history | [`docs/designs/egm/reviews/INDEX.md`](docs/designs/egm/reviews/INDEX.md) |
| Engineering lessons | [`docs/engineering/lessons/README.md`](docs/engineering/lessons/README.md) |
| Shop build notes (weights, felt, sizing) | [`docs/research/domain/wooden-staunton-build-notes.md`](docs/research/domain/wooden-staunton-build-notes.md) |
| Agent instructions | [`CLAUDE.md`](CLAUDE.md) |

Related: [`../AAxis/`](../AAxis/), the A-Axis Tools plugin, whose conventions this project follows.

## Licence

GPL-3.0. See [`LICENSE`](LICENSE). This matches AAxis and ncCAM (spec decision D11).

The chess models are not covered by this licence. Each set in the chess-set library has its own (MIT, CC BY or CC BY-NC), and every export carries the set's licence and credits in `LICENSE-models.txt` (spec §5.8).
