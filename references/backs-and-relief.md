# Theme backs and relief

## Back artwork

Use an opaque portrait PNG on the same canvas as the front. Design a central theme emblem, supporting patterns and edge ornament: koi and ink currents, a playful companion/doodle badge, or whale constellations are examples, not fixed subjects. Keep the top 15 percent and bottom 20 percent quiet for browser typography; do not bake title/edition into an image that will receive those labels again. Preserve supplied text when requested and remove the corresponding canvas labels instead.

Save `assets/back.png`. `backDesign.primary` and `secondary` select text colors with adequate contrast. The pipeline copies it to web/assets and packs it in card.blend. Browser canvas overlays exact title, collection, subtitle and edition. Blender uses the same illustration, while the browser adds typography and GLSL foil; these outputs are not pixel-identical. When no back is supplied, the initial placeholder remains a compatibility fallback; do not deliver it unnoticed.

## Pop-out relief

Choose `sourceMode: "relief"` for a reference with artwork extending past the card. `layers.subject` and `layers.effects` accept width, height, depth, offset [x,z], and optional pixel crop [left,top,right,bottom]. Card dimensions are 6.3 by 9.45. Start around subject 6.9 by 10.35 and effects 7.5 by 11.25, then judge clipping and balance.

`layers.text.depth` determines the offline typography depth. `layers.text.crop` can reserve the header portion of text.png; `layers.textTitle` adds an independent plaque with width, height, offset and crop. Keep header and plaque surfaces slightly separated to avoid coincident transparent planes in Cycles. Subject scaling must not scale the plaque. The web effects slider controls actual effects-plane depth, independent of the subject slider; typography stays ahead of both.

## Viewer UI and verification

The template ships ui.css: neutral branding, clear information/save controls, segmented front/back buttons, named finish swatches, a floating parameter panel and mobile stacking. `ui.brandName` and `brandEnglish` change branding; `ui.palette` allows ink, muted, accent, focus, control and line CSS tokens. `ui.fonts.display` and `body` set CSS font-family stacks for viewer and back labels. Follow [style-matching.md](style-matching.md) to author these fields from the actual artwork. Write artwork descriptions for a viewer, placing technical notes and full source credits in project documentation.

Run the pipeline into a new project to verify copying and packing, then run verify_web.mjs. Inspect the actual back screenshot for orientation, legibility, texture load, theme identity and the foil at tilted views. Inspect both relief tilts and mobile layout too. A green control report does not establish attractive art. Rebuild app.bundle.js after JavaScript edits. Keep generated illustrations and existing card projects outside the skill package.
