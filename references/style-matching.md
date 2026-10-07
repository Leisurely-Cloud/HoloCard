# Design from the artwork

Read this for every new card and when restyling an existing card. Style matching happens during the skill's multimodal design workflow. The static viewer reads the resulting project configuration; it does not perform semantic image recognition or switch between generic themes.

## Inspect before choosing

Open the user's reference and the actual prepared subject/background layers. Identify the medium (photography, ink painting, flat cartoon, rendered illustration, etc.), the main/supporting colors, lightness, saturation, contour character, texture, mood and where the focal subject and quiet text areas sit. A prominent color is evidence, not the complete design: skin tones, a small logo or a temporary highlight should not automatically become the page accent. Preserve explicit user style instructions; if they deliberately request a contrasting treatment, make that decision visible.

Record a short `artDirection` object in the output project's `card-config.json`: `medium`, `observations`, `designIntent` and `reviewNotes`. Use concrete observations about the supplied image and describe how the border, typography, back and material relate to it. This is project metadata, not a rigid list of supported themes. Do not claim a semantic analysis from a color histogram alone.

## Carry the direction through the entire card

- Front furniture: follow the image's line weight, textures, ornament density and negative space. Keep faces and identifying details unobscured. A fine ink contour and a chunky cartoon outline need different frames.
- Typography: use a readable type family that suits the medium and mood. The project's `font` chooses a local font for baked front typography; `ui.fonts.display` and `ui.fonts.body` choose CSS family stacks for viewer titles and controls. Supply fallbacks and check actual CJK glyphs. Existing baked text must be regenerated if its typography changes.
- Back: derive motifs, edge treatment and texture from the same artwork. Keep sufficient quiet space for labels and choose `backDesign.primary`/`secondary` against the actual back image. Avoid an unrelated generic emblem or a one-letter back unless specifically requested.
- Viewer: set all six `ui.palette` tokens (`ink`, `muted`, `accent`, `focus`, `control`, `line`) and `appearance.background` for that image. Use subdued surrounding surfaces so the art remains the focal point; choose readable foregrounds and visible focus/selected states. Do not carry a previous card's brand or blue/silver palette into another project.
- Finish: choose `appearance.finish` and `parameters.foil` by observing a rendered card. Ink texture and photographic skin detail usually need restraint; reflective illustrations can tolerate a stronger finish. Preserve a requested holographic effect and reduce its intensity if it obscures the image. No fixed gloss or finish is correct for every artwork.
- Depth: base scale and layer separation on the actual silhouette and composition. Check both tilt directions for clipping and foreground text collisions.

There are no built-in style presets. Each project starts with its own authored settings; material buttons and sliders are optional user adjustments. Export/import retains project metadata and fonts while importing only supported presentation fields.

## Visual acceptance

Inspect front, back, both tilts and a narrow-screen capture beside the source image. Look for consistency of colors, stroke weight, typography, texture, ornament and mood, rather than only a matching dominant hue. Check that text remains readable, the subject is intact, the back belongs to the same collection and glare does not wash out defining details. Correct inconsistent choices and record actual findings in `artDirection.reviewNotes` before delivery. Automated interaction tests support this review but cannot certify aesthetic matching.

When refreshing existing viewers, preserve their artwork/model and project-specific configuration. Update source project settings as well as the built viewer so a pipeline rebuild retains the art direction. Use `assemble_viewer` rather than copying a template's example `card-config.json` into a finished work.
