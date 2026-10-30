# Changelog — Chess Set Creator

Versioning: `0.1.x` while planning is built and tested. **Every build that gets zipped increments the patch number** (0.1.0 → 0.1.1 → …), and the ZIP is named with the version. Set `0.2.0` by hand once the 12 in test blank has been cut.

## 0.1.0 — 2026-10-30 (internal build)
First installable build (implementation plan Phase 3). Not a public release.
- Tool-menu entry "Chess Set Creator" opening a dialog; inch/mm display toggle
- First-run machine setup: max blank length and 1–4 jaw sets, checked before saving
- Machine section to edit those settings later
- Import a model package folder: checks `chess-set.json`, the six piece files and that each piece sits on the X axis with its base at X = 0; stores the meshes in a hidden File Manager folder and the measured sizes in plugin settings
- Measured piece sizes shown after import. Sizing, fit checks and blank planning come in 0.1.x (Phase 4)
- No machine motion: the plugin never loads programs, starts jobs or sends commands
