# Chess Set Creator — ncSender plugin

Plans a turned chess set onto rotary blanks. You pick the queen's base diameter, your stock length and width, and the end allowances; the plugin scales a model package, checks that every piece fits your stock and chuck jaws, and packs the sixteen pieces of each side onto the fewest blanks.

Status: early test build (0.1.x). This build installs, sets up your machine and imports the model package. Planning arrives in the next 0.1.x build. Export of blank STL files for Rotary CAM comes after that (0.2).

The plugin never moves the machine: it doesn't load programs, start jobs or send commands.

## Install

1. Download `com.infield.chessset-<version>.zip` from the plugin's GitHub releases.
2. In ncSender, open **Settings → Plugins** and install the ZIP.
3. Open **Chess Set Creator** from the tool menu.

Requires ncSender 2.0.88 or later (Pro 2.0.149 or later).

## First run: machine setup

The first time it opens, the plugin asks for:
- **Max blank length**: the longest blank your machine holds between chuck and tailstock.
- **Jaw sets**: the stock widths each set of chuck jaws can grip (1 to 4 sets).

The values shown are an example machine. Edit them to match yours. You can change them later in the **Machine** section.

## Get and import the model package

The chess-piece models are not inside the plugin. They come as a separate package:

1. Download the package ZIP (for example `staunton-clarkerubber-1.0.0.zip`) from the package's GitHub release page.
2. Unzip it. You get a folder holding `chess-set.json`, six `.stl` files and `LICENSE`.
3. In the plugin, click **Import package folder** and pick that folder.

The plugin checks the package and stores it in a hidden folder in ncSender's File Manager, so it works from every client and survives plugin updates. Import it once.

## Export and Download files (coming in 0.2)

Export will write one STL per blank, a setup file for Rotary CAM, a `layout.json` and the model licence into `chess set/<job name>/` in the File Manager. **Download files** will offer the same files as separate downloads, for other CAM programs.

## Licence

Chess Set Creator is © 2026 Marc Infield, licensed under GPL-3.0. See `LICENSE`.

The chess-piece models are a separate package with their own licence (the Staunton set is MIT, © 2014 clarkerubber).
