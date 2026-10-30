# EGM review context

Reviewers ran with copies of the repositories below as baseline context. The copies were temporary, so this file records the exact commits. To reproduce a review, clone each repo at its commit and pass the clone paths as `GoldfishContext`. Pass `../AAxis/` as well.

| Repository | Commit | Used for |
|---|---|---|
| [siganberg/ncSender](https://github.com/siganberg/ncSender) | `2f8a659` (Oct 30, 2026) | Host API facts (spec §12): File Manager routes, plugin manifest, settings |
| [siganberg/ncsender-plugin-nccam](https://github.com/siganberg/ncsender-plugin-nccam) | `68a5ed8` | Reference plugin: loader, Worker, build, dev harness and mock |
| [clarkerubber/Staunton-Pieces](https://github.com/clarkerubber/Staunton-Pieces) | `cef2c79` | Upstream chess models (spec §10, Appendix B) |
| `../AAxis/` (local sibling repo) | as of the review date | ncSender 2.x plugin conventions (`../AAxis/CLAUDE.md`) |

Rounds rev1 to rev6 used ncCAM and Staunton-Pieces. The ncSender source copy was also used from rev7 onward.
