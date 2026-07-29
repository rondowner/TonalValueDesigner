# Changelog

## 1.10.0 - 2026-07-29

- Changed AI feature results to show only individual regions covering at least 2% of the complete image.
- Added Split Feature by Value for intersecting a selected AI feature with the current Painter's Value Map.
- Added independently selectable child divisions labeled with their parent feature and Painter's Value.
- Suppressed value divisions smaller than 2% of their selected parent feature.
- Integrated value divisions with selection highlighting, refinement, Apply Value, and undo.

## 1.9.1 - 2026-07-29

- Added Undo Last to the Select and Adjust Value Mass group.
- Connected the new control to the shared ten-operation value-massing history.
- Made Cancel Selection half-width and placed Undo Last beside it.

## 1.9.0 - 2026-07-29

- Added the experimental Identify Features workflow under Value Massing.
- Added on-device semantic segmentation using a pinned Transformers.js runtime and quantized SegFormer model.
- Added broad feature categories, connected-region separation, feature coverage, and a selectable feature list.
- Integrated AI-proposed features with the existing selection highlight, Add Area, Remove Area, Apply Value, and undo workflows.
- Kept image inference local to the browser; the initial runtime and model download requires internet access.
- Added `js/featureSegmentation.js` to isolate model loading, inference, and region extraction.

## 1.8.2 - 2026-07-29

- Corrected the description of distinct value steps in the About dialog.

## 1.8.1 - 2026-07-29

- Added an About Tonal Value Designer link beside the version information.
- Added a scrollable, mobile-friendly About dialog describing the author, product purpose, and five-step painting workflow.
- Added Close, Escape-key, and backdrop-click dismissal behavior.

## 1.8.0 - 2026-07-29

- Adopted the TonalValueDesigner name throughout the application, documentation, accessibility labels, diagnostics, and JavaScript namespaces.
- Renamed the distributable project folder and release package to TonalValueDesigner.
- Updated browser asset cache keys for the renamed release.

## 1.7.1 - 2026-07-28

- Fixed the collapsed Measurement Tips and Limitations panel being compressed and visually hidden in the independently scrolling controls column.
- Prevented collapsible panels from shrinking below the height of their visible headings.
- Added release-version cache keys to browser assets so GitHub Pages clients receive the corrected files immediately.

## 1.7.0 - 2026-07-28

- Put the Painter's Value result first in the Value Sampling tab.
- Added a readable on-image value badge beside the sampled point.
- Made the badge remain a consistent screen size while zooming and reposition itself near image edges.
- Kept sampling overlays out of saved value-map images.
- Renamed Choose Sample Size to Sampling Options, moved it below the result, and collapsed it by default.
- Collapsed CIELAB, RGB, hexadecimal, sample-size, and coordinate readings under Color Details.
- Replaced Important Limitation with a collapsed Measurement Tips and Limitations section.
- Added practical guidance for comparing paint samples on a palette and an upright canvas.

## 1.6.2 - 2026-07-26

- Renamed Directed Value Massing to Value Massing: By Area.
- Renamed Paint Value to Value Massing: Paint Value.
- Made the Paint Value button a toggle: selecting the pressed button again exits painting mode just like Done Painting.

## 1.6.1 - 2026-07-26

- Added Undo Last directly to the Paint Value button group.
- Removed Pan Image from the Paint Value controls.
- Added Pan Image as a persistent mode button in the image toolbar.
- Made the toolbar button remain visibly pressed while pan mode is active.
- Suppressed sampling and painting taps while persistent pan mode is active.
- Kept the toolbar Pan Image control available for temporarily navigating during value painting.

## 1.6.0 - 2026-07-26

- Replaced Automatic Value Massing with the artist-directed Paint Value tool.
- Added hard-edged Fine, Medium, Broad, and Very Broad brushes.
- Limited brush colors to the Painter's Values retained in the current map.
- Added continuous gap-free strokes for mouse, touch, and stylus input.
- Made each continuous brush stroke one operation in the existing ten-step undo history.
- Added a visible brush-size preview over the image.
- Preserved pinch zoom while painting and added Pan Image for one-finger navigation.
- Ensured painted maps are included in PNG export.
- Changed the initial value-map selection to the three-value preset: Values 2, 5, and 8.
- Removed `js/automaticMassing.js` and added `js/valueBrush.js`.

## 1.5.1 - 2026-07-26

- Added Refine Selection controls to the Select and Adjust Value Mass tool.
- Added free-form Add Area and Remove Area operations that modify only the blue selection mask.
- Kept the value map unchanged until Apply Value is selected.
- Added visible pressed states while drawing a refinement boundary.
- Added Escape support for cancelling the current refinement while retaining the selected mass.
- Moved Select and Adjust Value Mass to the bottom of the Value Massing tab.

## 1.5.0 - 2026-07-26

- Added Select and Adjust Value Mass under the Value Massing tab.
- Made each contiguous value mass independently selectable, even when other masses share its Painter's Value.
- Added a blue selection overlay and outline so the chosen shape is clear before applying a change.
- Added reassignment of only the selected mass to any retained Painter's Value.
- Integrated selected-mass adjustments into the existing ten-operation undo history.
- Added Escape and Cancel Selection support without changing the map.
- Added `js/massSelection.js` for connected-mass identification, highlighting, and reassignment.

## 1.4.2 - 2026-07-26

- Added a draggable divider for resizing the controls and image workspace on desktop.
- Added keyboard-accessible divider resizing and double-click reset.
- Added Value Sampling, Create Value Map, and Value Massing tabs.
- Kept Open a Photograph and the measurement limitation visible across all tabs.
- Grouped sample size, measured results, and target comparison under Value Sampling.
- Grouped map generation and export under Create Value Map.
- Grouped directed and automatic tools under Value Massing.
- Preserved the stacked interface on narrow phone layouts.

## 1.4.1 - 2026-07-26

- Added a persistent pressed-state indicator to Draw Area while free-form drawing is enabled.
- Added Escape as a keyboard shortcut to cancel drawing mode.
- Made Apply Value, Cancel Drawing, and Undo Last exit drawing mode.
- Added `aria-pressed` state for accessibility.
- Moved Automatic Value Massing below Directed Value Massing.

## 1.4.0 - 2026-07-25

- Added Automatic Value Massing for Use Case I.4A.
- Added five painter-oriented simplification settings from retained detail to bold masses.
- Removed minor interruptions while preserving the map's selected Painter's Values.
- Integrated automatic and directed changes into the same ten-operation undo history.
- Ensured PNG export includes the current automatically simplified state.
- Added `js/automaticMassing.js` with an image-size-aware majority-massing algorithm.

## 1.3.1 - 2026-07-22

- Expanded Directed Value Massing undo history to ten operations.
- Kept the button label as `Undo Last` without displaying a count.
- Added an `Undo limit reached` message when no earlier operation is available.
- Stored compact massing commands instead of ten full-resolution image copies.

## 1.3.0 - 2026-07-22

- Added Directed Value Massing with user-drawn free-form boundaries.
- Added assignment of any retained Painter's Value to the drawn area.
- Added a visible closed-boundary preview before applying a change.
- Added cancellation and one-step undo.
- Ensured edited value maps are used by PNG export.
- Suspended pan and sampling gestures while drawing.
- Added `js/massing.js` for value-mass editing logic.

## 1.2.3 - 2026-07-22

- Corrected Fit Image so smaller images can be enlarged beyond 100% to fill the available workspace while remaining completely visible.

## 1.2.2 - 2026-07-22

- Simplified all value-map preset buttons to single-line labels.
- Removed the redundant value lists beneath the preset names.

## 1.2.1 - 2026-07-22

- Added a Notan preset using Painter's Values 1 and 10.
- Reformatted preset buttons with compact two-line labels.
- Added independent vertical scrolling for the controls and image workspace on desktop.
- Preserved natural page scrolling on narrow phone layouts.

## 1.2.0 - 2026-07-21

- Added user-defined Painter's Value maps.
- Added convenient 3-value, 5-value, and 7-value presets.
- Added a numbered gray-value legend.
- Added switching between original and value-map views.
- Added full-resolution PNG export without the sampling crosshair.
- Added `js/valueMap.js` as a separate image-processing module.

## 1.1.1 - 2026-07-21

- Restored the crosshair cursor whenever the image is ready for sampling.
- Kept the hand cursor only while a drag-to-pan gesture is active.
- Added cleanup for interrupted pointer gestures.

## 1.1.0 - 2026-07-21

- Added mouse-wheel and pinch zoom.
- Added mouse, touch, and stylus panning.
- Added Fit Image, 100%, zoom-in, and zoom-out controls.
- Added visible version and build date.

## 1.0.0

- Initial image loading and sampling prototype.
- Added RGB, Hex, CIELAB, and estimated Painter's Value.
- Added configurable averaging and optional target comparison.
