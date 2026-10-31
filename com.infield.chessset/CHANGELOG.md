# Changelog — Chess Set Creator

Versioning: `0.1.x` while planning is built and tested. **Every build that gets zipped increments the patch number** (0.1.0 → 0.1.1 → …), and the ZIP is named with the version. Set `0.2.0` by hand once the 12 in test blank has been cut.

## 0.1.6 — 2026-10-30
- Model packages now come from the chess-set library (github.com/infield/chessset-library), one package per set style; the README and the "no package" hint point there
- The Staunton set is now version 0.1.0 (beta), like the plugin. If you imported 1.0.0, import the new ZIP once; it replaces it as the set in use

## 0.1.5 — 2026-10-30 (first public release)
- First public release: planning (M1). Export for Rotary CAM comes in 0.2
- README links to the plugin's releases and to the Staunton model package release

## 0.1.4 — 2026-10-30
- The side views show each piece as seen from the side, so the knight shows its head instead of a round blob; outlines are smoother
- **Re-import the package once** to get the new knight view (older imports still draw, with the round outline)

## 0.1.3 — 2026-10-30
- Units now follow ncSender's own setting (metric or imperial) and switch when you change it there; the plugin's in/mm toggle is gone
- The other unit is shown below each length: inches below mm, or mm below inches
- Values typed in inches are stored as clean millimetres (12 in is exactly 304.8 mm)

## 0.1.2 — 2026-10-30
- Fix: after updating the plugin without reloading ncSender, the dialog kept the previous version's styles, so the side views showed as black boxes and the blank cards lost their layout. The styles are now replaced when the version changes
- The dialog's header (unit toggle and Close) stays visible while scrolling

## 0.1.1 — 2026-10-30 (planning)
Completes the planning milestone (implementation plan Phase 4).
- Size, Stock, Allowances and Sides inputs, in inches or mm; each shows the other unit and its valid range, or what's wrong
- The plan updates as you type: scaled piece sizes, fit checks with the smallest stock that would work, blanks per side (light and dark), stock to buy
- One card per blank: pieces from chuck to tailstock, used and leftover length, stock, reservations and jaw set, and a to-scale side view
- Inputs are kept between sessions
- Piece outlines are measured more accurately. **Re-import the package once** after updating from 0.1.0, or the side views stay jagged

## 0.1.0 — 2026-10-30 (internal build)
First installable build (implementation plan Phase 3). Not a public release.
- Tool-menu entry "Chess Set Creator" opening a dialog; inch/mm display toggle
- First-run machine setup: max blank length and 1–4 jaw sets, checked before saving
- Machine section to edit those settings later
- Import a model package folder: checks `chess-set.json`, the six piece files and that each piece sits on the X axis with its base at X = 0; stores the meshes in a hidden File Manager folder and the measured sizes in plugin settings
- Measured piece sizes shown after import. Sizing, fit checks and blank planning come in 0.1.x (Phase 4)
- No machine motion: the plugin never loads programs, starts jobs or sends commands
