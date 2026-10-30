# Wooden Staunton Chess Set — Build Notes

> Moved out of `Chess_Set_Creator.md` on October 30, 2026. These are shop notes for building the physical set (sizing, weights, finishing). They don't define plugin behaviour; the plugin spec keeps only the sizing table, in its Appendix A.


Prepared for Marc Infield · October 30, 2026

## Project direction

Make a recognizable Staunton-style wooden chess set using rotary CNC machining, with concealed steel weights and felt bases. Aim for a substantial, stable feel. Prototype one pawn and one king before committing to the whole set.

Staunton describes the familiar family of shapes: a horse-headed knight, castle-like rook, slotted bishop, crowned queen, and distinct king. It is a style rather than one mandatory CAD pattern.

## Size recommendations

Our practical starting point is a king approximately **3¾ inches (95.25 mm)** tall, with a **1½–1¾-inch (38.1–44.45 mm)** base, and **2¼-inch (57.15 mm)** board squares. An 8-by-8 playing field at that square size is **18 inches (457.2 mm)** across, excluding the border.

The table below is a proposed workshop starting point, not a claim of mandatory tournament dimensions. Heights for the smaller pieces follow familiar traditional proportions; base diameters are selected within 40–50% of height.

| Piece | Quantity for full set | Suggested height | Suggested base diameter |
| --- | ---: | ---: | ---: |
| King | 2 | 95.25 mm / 3.75 in | 43 mm / 1.69 in |
| Queen | 2 | 85 mm / 3.35 in | 40 mm / 1.57 in |
| Bishop | 4 | 70 mm / 2.76 in | 34 mm / 1.34 in |
| Knight | 4 | 60 mm / 2.36 in | 30 mm / 1.18 in |
| Rook | 4 | 55 mm / 2.17 in | 27 mm / 1.06 in |
| Pawn | 16 | 50 mm / 1.97 in | 25 mm / 0.98 in |

Allow additional stock length for workholding, support, and parting off. Check the complete silhouettes together before cutting: visual balance matters as well as numerical proportions.

### Tournament guidance versus personal preference

FIDE's equipment chapter effective March 1, 2026 specifies a descending height order of king, queen, bishop, knight, rook, pawn; recommends bases between 40% and 50% of piece height; and gives board squares of 50–60 mm. Our proposed dimensions use those proportions as a design reference. They are not a certification of tournament compliance; check the intended event's requirements if that becomes a goal.

The earlier FIDE chapter listed nominal heights of 95, 85, 70, 60, 55, and 50 mm respectively. Those traditional reference heights inform the table above. The earlier chapter has been superseded, so do not treat it as the current regulation.

“Tournament heavy” is not a universal target weight in grams. Consistency, stability, comfortable handling, and recognizable pieces are more useful goals for this project. Added weight can improve feel, but excessive weight adds no automatic tournament benefit and increases the impact if a piece falls.

## Weight material

**Recommended: ordinary steel fender washers secured with two-part epoxy.** They are easy to purchase, stack, and adjust during prototyping. Choose by actual outside diameter, inside diameter, thickness, and measured mass. A washer sold as “¼ inch” commonly refers to its hole size, not its outside diameter.

- Steel is the economical default; keep it enclosed and dry to limit corrosion.
- Brass is an alternative when a non-ferromagnetic material is specifically desired. It is somewhat denser than steel but generally costs more.
- A solid steel disk or short steel round-bar slug can provide more mass in the same cavity than a washer with a large center hole, but may require cutting or a more specific purchase.
- Lead is unnecessary for this project and was rejected because of toxicity concerns.

Magnetic steel has no inherent disadvantage on an ordinary wooden board. If using magnets for storage or a travel board, steel can be useful because it is attracted to them. Choose nonmagnetic material only if that attraction would interfere with a planned feature. Steel inserts are not themselves necessarily permanent magnets.

## Washer sizes and counts

In conversation we suggested 2–3 washers about 1 inch outside diameter for a pawn, and 3–5 washers about 1¼ inches outside diameter for larger pieces. **These were rough trial counts, not a verified weight specification.** Washer thickness and hole size change the mass considerably.

**Important fit correction:** a 1-inch washer cannot fit inside the proposed 25 mm pawn base with adequate wood surrounding it. Likewise a 1¼-inch washer is too large for the proposed rook and knight bases. Match washers to each finished base rather than applying those original sizes to every piece.

| Piece | Suggested trial washer outside diameter | Initial trial stack |
| --- | ---: | ---: |
| Pawn | About 16–18 mm | 2–3 |
| Rook | About 18–20 mm | 3–5, if base depth permits |
| Knight | About 20–22 mm | 3–5, if base depth permits |
| Bishop | About 24–25 mm | 3–5, if base depth permits |
| Queen and king | About 30–32 mm / roughly 1¼ in | 3–5, if base depth permits |

These are starting suggestions for the proposed base diameters, not shopping specifications or guaranteed final weights. Check availability and actual dimensions before machining pockets. Larger pieces do not all need the same stack; test and adjust each type. Thin washers may add only modest heft even in a stack.

Buy a small sample first. Weigh one washer on a gram scale, multiply by the count, and record the finished piece's total mass. Match corresponding black and white pieces; all pawns should feel alike. Larger pieces can reasonably weigh more than smaller ones.

## Pocket and assembly method

1. Finish the prototype's exterior sufficiently to judge its shape and base thickness.
2. Measure the actual washers. Make a flat-bottomed recess in the underside using a suitable drill or CNC pocket operation.
3. As a preliminary wood-design allowance, leave about 3 mm of sound wood radially around the pocket, and at least about 3 mm above it; increase this around delicate grain or thin profiles. These are workshop starting allowances, not structural guarantees.
4. Make the cavity slightly wider than the measured washer to permit an epoxy bond line. Cut a test pocket in scrap to establish fit.
5. Set cavity depth from the measured stack height plus the adhesive allowance. Keep the stack recessed beneath the finished bottom so no metal touches the board. Reduce the stack if it would weaken the base.
6. Temporarily secure the weights and test the pawn and king on the intended board. Compare pickup feel, stability, and sliding.
7. Degrease and lightly abrade the washers as appropriate for the epoxy manufacturer's instructions. Bond the washers together and into the pocket so they cannot rattle.
8. Cure fully, then attach felt to the underside. Check that every piece sits flat.

Keep added mass low in the base. Avoid unnecessary deep cavities up into narrow stems. If more weight is needed than the available base depth permits, reconsider the base shape or use a solid disk rather than weakening the piece.

## Open-source Staunton reference

- **Project:** [clarkerubber / Staunton-Pieces](https://github.com/clarkerubber/Staunton-Pieces)
- **Description:** Open-source 3D Staunton chess pieces; repository includes Source and Renders folders.
- **License:** [MIT license](https://github.com/clarkerubber/Staunton-Pieces/blob/master/LICENSE). Retain the applicable copyright and permission notices when distributing covered source or derivatives.
- **Status:** The repository and its stated license were checked. Individual model formats, physical scale, mesh quality, and suitability for machining have **not** yet been validated. Do not assume the files are ready-to-machine STL or STEP models.

This is a design starting point, not a prepared CNC toolpath package.

## Rotary CNC preparation

1. Download and inspect the source files and previews.
2. Confirm units, available export formats, mesh quality, and how the models can enter your CAD/CAM workflow.
3. Set the king height and then evaluate the entire set's proportions. Check each base against the intended board and washers.
4. Plan the weight pockets as a separate underside operation unless workholding permits safe integrated machining.
5. Most piece bodies are largely rotational shapes; special features such as the bishop slot, rook crenellations, king's top, and knight head require additional tool-access planning.
6. Inspect the knight especially for undercuts beneath the jaw, around the ears, and through the mane. Continuous rotary machining alone may not reach every surface. Indexed setups, modified geometry, smaller tools, or hand finishing may be needed.
7. Simulate roughing and finishing with the actual cutter geometry and workholding. Check clearance to chuck, tailstock, and stock before cutting.
8. Cut one pawn and one king, refine the process, then tackle the knight before committing to production.

## Initial materials and decisions

- Maple (light side) and walnut (dark side).
- Sample steel fender washers in sizes appropriate to the actual bases.
- Two-part epoxy suitable for bonding metal to wood.
- Felt and compatible adhesive.
- Calipers and gram scale for recording dimensions and mass.
- Final CAD/CAM route, cutter selection, stock size, and workholding remain to be chosen after model inspection.

## Next-session checklist

- [ ] Open the repository and inspect the six piece designs.
- [ ] Confirm model format and import path into CAD/CAM.
- [ ] Decide whether to use the proposed dimensions or enlarge the smaller bases for a broader commercial-set appearance.
- [ ] Obtain sample washers and measure diameter, thickness, and mass.
- [ ] Design and cut prototype pawn and king; test weights before bonding.
- [ ] Prove a machining strategy for the knight.
- [ ] Record the approved dimensions, pocket sizes, and total weights for repeatable production.

## Sources

- [FIDE equipment rules effective March 1, 2026](https://handbook.fide.com/chapter/ChessEquipmentWithoutElectronicComponenets032026): current reference for board-square dimensions, height ordering, and base-to-height proportions.
- [Earlier FIDE equipment standards, effective through February 28, 2026](https://handbook.fide.com/chapter/StandardsOfChessEquipment2022): historical reference for the traditional nominal piece heights used above.
- [Staunton-Pieces repository](https://github.com/clarkerubber/Staunton-Pieces): open-source design reference and license.

Build dimensions, washer counts, pocket allowances, and machining sequence above are recommendations for this project rather than statements from the sources.
