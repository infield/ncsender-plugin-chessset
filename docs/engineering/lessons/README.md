# Lessons learned

Things that cost time while building 0.1.x (October 30, 2026), and what to do instead. The Compound Engineering conventions are still unverified; check this folder against the plugin once it's installed.

| Lesson | What happened | Do this |
|---|---|---|
| A plugin update doesn't reload the page | After updating 0.1.0 → 0.1.1 without a reload, the dialog kept the old build's `<style>`, so previews showed as black boxes | Tag injected styles (and anything else cached on `window`) with the build, and replace them when it changes. ui-check step 3b covers it |
| ncSender's update check is cached | A new release didn't show as an update for several minutes | The server caches GitHub answers for 15 minutes, and the page checks once per session. Wait, then reload |
| Beta releases must not be GitHub pre-releases | GitHub's `releases/latest`, which ncSender's update check reads, skips pre-releases | Title releases "… - Beta" instead |
| `gh release create --target` can fail | It asked for the `workflow` scope | Create and push the tag locally, then `gh release create … --verify-tag` |
| GitHub release ZIPs can't be read from the dialog | The release-asset download sends no cross-origin header; `raw.githubusercontent.com` and `api.github.com` do | The library picker downloads each set's files from the raw repository at the set's tag |
| Headless checks start from a clean page | The stale-style bug only appears in a long-lived page | Add checks that simulate an update without a reload |
| Inch input picks up float noise | 12 in × 25.4 stored 304.79999999999995 | Round inch conversions (to 0.0001 mm) at parse time; a test checks stored inputs are clean mm |
| Vertex-only radius profiles understate | Long triangle edges spanning a slice made the side views jagged and would understate the smallest section | Sample edge crossings at slice boundaries too (`profile`, `sideProfile`) |
| A mirrored radius isn't a side view | The knight drew as a round blob | Draw the real side view (highest and lowest Z per slice) |
| The greedy weld can regroup points after a move | A watertight joined bishop gained "holes" once rotated | Weld once in source coordinates before moving; then the later weld can't split shared points |
| "Closed" depends on the definition | Pieces made of touching parts have edges shared by four faces | The packaging tool accepts even edge counts as watertight and reports them; odd counts are holes |
| Thingiverse blocks automated downloads | Cloudflare returns 403 to scripts and fetch tools | Ask the owner to download "Download All Files" ZIPs into `sources/thingiverse/` |
| Check a model's provenance, not only its licence | The Duchamp models carry an MIT or CC licence, but reproduce a design whose estate objected | Record the risk and let the owner decide before publishing |
