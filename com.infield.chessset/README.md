# Chess Set Creator — ncSender plugin

Plans a turned chess set onto rotary blanks. You pick the queen's base diameter, your stock length and width, and the end allowances; the plugin scales a model package, checks that every piece fits your stock and chuck jaws, and packs the sixteen pieces of each side onto the fewest blanks.

Status: 0.1.x, planning. The plugin sets up your machine, imports the model package and plans the blanks. Export of blank STL files for Rotary CAM comes in 0.2.

The plugin never moves the machine: it doesn't load programs, start jobs or send commands.

## Install

1. Download `com.infield.chessset-<version>.zip` from the [plugin's latest release](https://github.com/infield/ncsender-plugin-chessset/releases/latest).
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

1. Download the package ZIP (for example `staunton-clarkerubber-1.0.0.zip`) from the [Staunton package's latest release](https://github.com/infield/chessset-staunton-package/releases/latest).
2. Unzip it. You get a folder holding `chess-set.json`, six `.stl` files and `LICENSE`.
3. In the plugin, click **Import package folder** and pick that folder.

The plugin checks the package and stores it in a hidden folder in ncSender's File Manager, so it works from every client and survives plugin updates. Import it once.

## Plan a set

Enter the queen's base diameter, the stock length, shape and width, the chuck and tailstock reservations, the gap between pieces and the radial allowance, and choose both sides or one. Lengths are shown in ncSender's units (set in ncSender's toolbar), with the other unit below. Everything is stored in millimetres. The plan updates as you type:
- the scaled size of every piece;
- any piece that doesn't fit, with the smallest stock width or length that would work;
- blanks per side and the stock to buy;
- one card per blank, with its pieces from chuck to tailstock, used and leftover length, the jaw set, and a to-scale side view.

## Export and Download files (coming in 0.2)

Export will write one STL per blank, a setup file for Rotary CAM, a `layout.json` and the model licence into `chess set/<job name>/` in the File Manager. **Download files** will offer the same files as separate downloads, for other CAM programs.

## Licence

Chess Set Creator is © 2026 Marc Infield, licensed under GPL-3.0. See `LICENSE`.

The chess-piece models are a separate package with their own licence (the Staunton set is MIT, © 2014 clarkerubber).
