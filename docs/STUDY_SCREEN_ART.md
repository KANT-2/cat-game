# Study landing backdrop

## Current forest-board design

- Built-in image_gen edit based on the user's forest learning-page reference.
- Saved asset: `public/assets/ui/scenes/study-forest-board-03.png`
- Catalog ID: `ui.scene.study-forest-board.03`
- The forest, wooden frame, paper and foreground corner leaves are decorative artwork. All controls and text remain PixiJS objects.
- The existing transparent Siamese mascot now rests on the outer board's upper-right edge. The previous panel-leaning layout and full-bleed parchment asset below are historical revisions.
- A single forest-board image fills the viewport to avoid seams between different forest images. The artwork and the 1600×1000 control coordinates share the same screen proportions. The mascot's paw contact follows the board border's relative position.

Exact-match background correction prompt:

Use case: precise-object-edit. Asset type: 1600×1000 PixiJS learning-page background. Extend the wooden board and blank parchment downward so its bottom wooden edge sits at y=960. Preserve the dark green sun-dappled forest, top wooden edge at y=75, side edges, honey wood style, parchment texture, lighting and colors. Reposition the existing leafy clusters to overlap the lower board corners. Keep the center bottom edge visible. Do not add a cat, text, numbers, buttons, icons, panels, bars or separator lines. Keep the interior blank and the entire image opaque without white margins.

Direct-reference refinement prompt:

Use case: precise-object-edit. Asset type: PixiJS learning-page background layer. Use the user's latest attached learning-page design as the exact edit target. Remove only the interactive UI and Siamese kitten while preserving the 1600×1000 framing, forest, wooden board bounds, parchment texture, lower foliage, lighting and color. Reconstruct removed areas as blank parchment or original background. Do not add text, UI, animals, white margins or checkerboard.

Final prompt:

Edit this blank parchment board asset. Replace ALL checkerboard exterior with a lush dark green sun-dappled leafy forest, matching a cozy hand-painted woodland game menu, warm light filtering through dense canopy at top center. No transparency or checkerboard should remain. Keep the honey wood frame, blank ivory parchment, and lower-corner leaf sprigs. Adjust framing to 1600x1000 landscape: wooden board outer edges at x=50..1550 and y=90..965, top forest band height90px, narrow forest visible at sides and bottom. This exact composition will be scaled proportionally in a game menu. Keep interior totally blank with NO text, inner panels, buttons, bars, lines, icons or cat. No animals. Foreground leaves touch both lower corners without covering central usable paper x100..1500 y130..930. Polished watercolor-and-ink cozy game illustration, no white margins. Forest only outside wood frame; parchment only inside.

## Previous artwork revisions

- Tool: built-in image_gen, imagegen skill.
- Reference: user-provided study landing screen (wood frame and Siamese kitten).
- Asset: `public/assets/ui/scenes/study-parchment-backdrop-01.png`
- Catalog ID: `ui.scene.study-parchment-backdrop.01`
- Separate transparent mascot: `public/assets/ui/scenes/study-siamese-leaning-01.png`
- Mascot catalog ID: `ui.scene.study-siamese-leaning.01`
- The current backdrop contains no cat. The mascot uses the same logical coordinates as the recommendation panel, with its paw contact anchor at the panel's top border.
- Text, bars, cards, panels, and all interactive controls are rendered separately in PixiJS.

## Current panel-leaning revision prompts (built-in image_gen)

Backdrop:

Edit target: supplied wood-frame game background. Remove ONLY the Siamese kitten and its small accent marks from the upper right. Reconstruct uninterrupted ivory parchment and honey wood grain underneath. Preserve the edge-to-edge wooden frame, rounded corners, all four borders touching canvas edges, subtle pale parchment texture, composition, proportions and cozy hand-painted style. No exterior white margins. No animals, text, buttons, inner panels, symbols or decorations. Output landscape 16:9 clean blank game background.

Transparent mascot:

Extract the blue-eyed seal-point Siamese kitten from the top-right of the reference into a standalone transparent PNG game sprite. Preserve its identity, head tilt, cream fur, dark brown face ears and forepaws, blue eyes and cozy hand-painted ink/watercolor style. Cat peeks over an invisible horizontal ledge with both paws hooked over it, paws at the SAME baseline, chin near the paws. Head and two paws only, no legs or full torso below paws. Include the two small playful accent strokes left of head. True transparent alpha background, no paper, no wood, no panel, no floor, no shadow rectangle, no text. Tight landscape 4:3 composition with only 3% transparent padding around artwork, ears fully visible, bottom of both paws at 94% image height; paw contact with invisible ledge at 85% image height. This sprite will be positioned on top of a UI panel border by code.

## Original generation prompt

Create an EDIT of the attached latest learning-page reference, to become a clean decorative background asset for a functioning PixiJS game UI. Preserve the warm hand-painted honey wood outer frame, ivory parchment paper texture, gentle shadows and the adorable blue-eyed seal-point Siamese kitten peeking over the top-right of the frame with both paws. REMOVE EVERY letter, word, number, progress bar, button, back arrow, colored subject card, separator line, and ALL inner content panels from the reference. Also remove the leaf title ornaments (they will be drawn separately). The entire interior must be uninterrupted blank pale warm ivory parchment with subtle watercolor paper texture, no ghost text. The ONLY artwork is the wooden outer frame, parchment interior, kitten above the upper-right edge, and pale cream exterior. Landscape 16:9, 1600x900 target composition. Outer frame aligned at x=45 to1555, y=74 to878, rounded corners radius45, frame thickness approx24px. Kitten at x=1320..1475, y=5..105, paws at y=91 on frame, never covering interior content below y=130. Interior usable area x=85..1515 y=115..850 is plain pale parchment. Straight-on orthographic view, symmetric border, no perspective. Match the reference's polished hand-painted cozy game illustration style and wood grain. No UI widgets, no icons, no text whatsoever. This is the backdrop layer only; all interface content will be added by code.

## Final edge-to-edge revision prompt

Edit this existing PixiJS learning screen background asset. Preserve the honey-colored hand-painted wood, ivory paper texture, cozy style and same blue-eyed seal-point Siamese kitten. Main change: REMOVE ALL exterior pale/white margins. Expand the wooden frame to the canvas edges: the outer edge of the wood must TOUCH x=0, y=0, x=width-1, y=height-1, with only at most 3 pixels of exterior margin at rounded corners. The complete thick wooden border must remain visible, not cropped off. Interior parchment should fill nearly the entire image, inset approx 24 pixels from the outside wood edge. The top, bottom, left and right margins outside the frame must all be essentially zero. Move the kitten to sit INSIDE the top-right corner of the frame, head fully visible around x=1320..1470 y=14..118 in a 1600x900 composition, paws resting against the top border from its inside. No part of the kitten may extend outside the canvas or be cut off. Keep all artwork outside the blank interior content area x=95..1505 y=130..850; kitten occupies only upper-right header corner. Landscape 16:9. Completely blank parchment inside; do not add any text, icons, buttons, progress bars, inner panels, controls, shadows of text, or dividers. This remains a decorative background; code will draw the UI. Do not leave the old large pale area above the frame. Full bleed wooden frame.
