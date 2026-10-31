# Chess Set Creator — ncSender plugin

*This plugin started as a joke posted on the ncSender Discord channel.*

Plans a turned chess set onto rotary blanks. You pick the queen's base diameter, your stock length and width, and the end allowances; the plugin scales a model package, checks that every piece fits your stock and chuck jaws, and packs the sixteen pieces of each side onto the fewest blanks.

Status: 0.1.x beta. The plugin sets up your machine, imports the model package, plans the blanks and exports one STL per blank. The files haven't been tested in Rotary CAM yet.

The plugin never moves the machine: it doesn't load programs, start jobs or send commands.

## Install

1. Download `com.infield.chessset-<version>.zip` from the [plugin's latest release](https://github.com/infield/ncsender-plugin-chessset/releases/latest).
2. In ncSender, open **Settings → Plugins** and install the ZIP.
3. Open **Chess Set Creator** from the tool menu.

Supported on the latest ncSender 2.x release (standard or Pro). For advanced hobbyists running a rotary axis, with Rotary CAM for toolpaths.

## First run: machine setup

The first time it opens, the plugin asks for:
- **Max blank length**: the longest blank your machine holds between chuck and tailstock.
- **Jaw sets**: the stock widths each set of chuck jaws can grip (1 to 4 sets).

The values shown are an example machine. Edit them to match yours. You can change them later in the **Machine** section.

## Get a chess set

The chess-piece models are not inside the plugin. They come from the [chess-set library](https://github.com/infield/chessset-library), one package per set style. It has five sets so far: Staunton, Dubrovnik I 1950, Minimal Look, Minimalist contemporary and Gothic. Check each set's licence; some are for non-commercial use only.

**From the library (easiest):** in the **Chess set** section, click **Browse library**, then **Install** next to a set. If you install several, pick the one in use from the same section.

**By hand** (offline, or your own set):

1. In the library's list of sets, open the set's release and download its ZIP (for example `staunton-clarkerubber-0.1.0.zip`).
2. Unzip it. You get a folder holding `chess-set.json`, six `.stl` files and `LICENSE`.
3. In the plugin, click **Import package folder** and pick that folder.

The plugin checks the package and stores it in a hidden folder in ncSender's File Manager, so it works from every client and survives plugin updates. Import it once.

## Plan a set

Enter the queen's base diameter, the stock length, shape and width, the chuck and tailstock reservations, the gap between pieces and the radial allowance, and choose both sides or one. Lengths are shown in ncSender's units (set in ncSender's toolbar), with the other unit below. Everything is stored in millimetres. The plan updates as you type:
- the scaled size of every piece;
- any piece that doesn't fit, with the smallest stock width or length that would work;
- blanks per side and the stock to buy;
- one card per blank, with its pieces from chuck to tailstock, used and leftover length, the jaw set, and a to-scale side view.

## Export and Download files

**Export to File Manager** writes the job into `chess set/<job name>/`: one STL per blank (light and dark), a `.rotary.json` setup file next to each, `layout.json` and the model licence. An earlier export is never overwritten; a second export of the same name goes to `<job name> (2)`.

**Download files** lists the same files; each click downloads one.

The gaps between pieces are left empty; Rotary CAM supplies the support between them.

Files are ASCII STL in mm. X is the rotary axis, and the first piece's base is at X = 0. Export is unavailable while a job is running.

## Licence

Chess Set Creator is © 2026 Marc Infield, licensed under GPL-3.0. See `LICENSE`.

The chess-piece models are a separate package with their own licence (the Staunton set is MIT, © 2014 clarkerubber).
