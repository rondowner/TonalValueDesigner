# Changelog

## 2.10.1 - 2026-08-12

- Fixed the production bundle so `js/squint.js` loads before `coreEngine.js`.
- Restored application startup and JPEG/PNG image loading in the packaged and deployed build.
- Added a regression check that verifies the Squint module exists and is defined before use in `app.bundle.js`.
- Left Value Eye Trainer at v1.0 because its implementation did not change.

## 2.10.0 - 2026-08-12

- Added the conceptual **Value Massing: Squint** prototype.
- Added Squint and Protect Major Edges controls using painter-oriented terminology.
- Added non-destructive Preview and Reset actions plus Apply and Undo Last.
- Added deterministic, local edge-aware smoothing that resists mixing across strong full-color boundaries before assigning retained Painter's Values.
- Integrated applied Squint results into the shared ten-operation massing undo history.
- Added a host-neutral `js/squint.js` processing module behind the core-engine boundary for later Rust/WebAssembly or Tauri migration.
- Added deterministic regression coverage for Squint output and boundary preservation.
- Left Value Eye Trainer at v1.0 because its implementation did not change.

## 2.9.6 - 2026-08-11

- Corrected **greyscale** to **grayscale** in About section 6.
- Corrected **before guess** to **before guessing** in About section 6.
- Changed **assuring your painting** to **ensuring your painting** in About section 5.
- Left Value Eye Trainer at v1.0 because its implementation did not change.

## 2.9.5 - 2026-08-11

- Added the copyright symbol after **TonalValueDesigner** in the main header.
- Reorganized the right side of the header into three lines: release/build information, the copyright notice, and the About link.
- Added **Copyright © 2026 Ron Downer. All Rights Reserved.** to the header.
- Promoted Value Eye Trainer to v1.0 in both its embedded and standalone forms.
- Updated the Eye Trainer cache name and asset versions so deployed clients receive v1.0.
- Documented independent versioning: TVD advances when the main tool changes; Eye Trainer advances only when its own embedded or standalone implementation changes.

## 2.9.4 - 2026-08-10

- Reduced the size of tab-introduction text and instructional links.
- Added compact introductory guidance to **Value Sampling** without an additional learning panel.
- Added compact introductory guidance and a persistent **Learn more about value studies** panel to **Create Value Map**.
- Preserved the supplied value-study wording and formatted its five key components as readable bullets.
- Generalized the persistent learning-panel behavior for Value Map and Value Massing instruction.
- Left Eye Trainer unchanged.

## 2.9.3 - 2026-08-10

- Replaced the Value Massing hover card with a discoverable, persistent in-tool learning panel.
- Added a concise Value Massing purpose statement and **Learn about value massing** control at the top of the tab.
- Preserved the original Value Massing instructional wording.
- Made the explanation follow the resizable control-column width and reflow automatically.
- Added explicit hide and close controls that work with mouse, keyboard, stylus, and touch.

## 2.9.2 - 2026-08-10

- Added a rich mouse-over help card to the **Value Massing** tab explaining the purpose and benefit of value massing.
- Made the help card available when the tab receives keyboard focus, not only when a mouse hovers over it.
- Added reusable tab-help hooks to all four tool tabs so explanatory text can be supplied for the remaining tabs later.

## 2.9.1 - 2026-08-09

- Changed the header tagline to emphasize value maps, value studies, and value-based design decisions.
- Changed unsuccessful Value Eye Trainer feedback from **Keep looking** to **Try Again**.
- Changed Value Comparison so a correct lighter/darker answer earns full credit for any measured directional difference, including 0.1 within the same whole-number value group.
- Retained half credit for an otherwise incorrect answer when the two measured values are no more than 0.4 apart.
- Updated the embedded and standalone trainer cache versions and scoring documentation.

## 2.9.0 - 2026-08-09

- Extracted sample-area averaging and complete Painter's Value measurement into `js/measurement.js`.
- Added `averagePixels` and `measureValue` to core-engine contract version 2.
- Changed the controller to sample active document `ImageData` directly rather than reading pixels from the presentation canvas.
- Added deterministic coverage for single-point measurement, area averaging, edge clipping, and controller delegation.
- No intentional measurement result, sampling UI, visual, value-map, massing, or saved-output changes.

## 2.8.0 - 2026-08-09

- Replaced the browser-canvas selection highlight stored in interaction state with host-neutral engine-produced `ImageData`.
- Moved selection-overlay canvas creation and caching behind `canvasRenderer.js`.
- Removed direct selection-overlay conversion from the mass-selection controller workflow.
- Updated renderer and interaction-state contracts and regression coverage for the new data boundary.
- No intentional selection, refinement, visual, sampling, algorithm, UI, or saved-output changes.

## 2.7.1 - 2026-08-09

- Fixed value sampling after the v2.7.0 renderer extraction.
- Replaced a stale call to the removed `drawBase()` controller helper with a base-only canvas-renderer pass before pixel averaging.
- Added a regression guard that verifies sampling clears presentation overlays through the renderer before reading image pixels.
- No other intentional behavior changes.

## 2.7.0 - 2026-08-09

- Extracted canvas presentation from the UI controller into `js/canvasRenderer.js`.
- Moved rendering of the source/value image, selection overlay, area boundary, sample crosshair and value badge, and painting cursor behind one renderer contract.
- Changed `app.js` to submit a compact layer description instead of issuing low-level drawing commands.
- Added a renderer contract and mock-canvas regression coverage for layer composition and the public renderer interface.
- Preserved the existing interaction-state, document-state, edit-history, platform, core-engine, and local-file-compatible production boundaries.
- No intentional visual, algorithm, UI, zoom, sampling, drawing, painting, selection, or saved-output changes.

## 2.6.0 - 2026-08-09

- Extracted transient drawing, painting, mass-selection, feature-selection, pointer, and explicit-pan state from the UI controller into `js/interactionState.js`.
- Consolidated twenty mutable interaction fields behind one sealed, host-neutral state boundary.
- Added an interaction-state contract and regression coverage for its idle defaults, pointer collection, mutability, and stable field structure.
- Preserved the existing document-state, edit-history, platform, core-engine, and local-file-compatible production boundaries.
- No intentional algorithm, UI, gesture, tool-mode, feature-analysis, undo, or saved-output changes.

## 2.5.0 - 2026-08-09

- Extracted active image and value-map document state from the UI controller into `js/documentState.js`.
- Consolidated source image data, generated map data, retained values, sampling state, display mode, viewport scale, and export name behind one host-neutral state boundary.
- Sealed the document-state structure and added regression coverage for its initial state and stable field contract.
- Added a document-state contract for future controller, PWA, Rust/WebAssembly, and Tauri work.
- No intentional algorithm, UI, image-loading, sampling, massing, or saved-output changes.

## 2.4.0 - 2026-08-09

- Extracted the shared massing, painting, and mass-adjustment undo history from the UI controller into a standalone application-state service.
- Isolated bounded-history commits and deterministic map reconstruction from buttons and status messages.
- Added an edit-history contract and regression coverage for operation ordering, history limits, reconstruction, and repeated undo.
- Retained the core-engine, platform, and local-file-compatible production boundaries.
- No intentional algorithm, UI, undo-limit, or saved-output changes.

## 2.3.0 - 2026-08-09

- Added a versioned browser-platform contract for device detection, image decoding, image-data canvas creation, and PNG saving.
- Removed direct object-URL, image-decoding, export-canvas, and download-link responsibilities from the main UI controller.
- Documented the replacement rules for future PWA and Tauri host implementations.
- Added a platform-contract regression test.
- Retained the core-engine boundary and local-file-compatible production bundle.
- No intentional algorithm, UI, supported-image, or saved-output changes.

## 2.2.0 - 2026-08-09

- Added a versioned core-engine contract as the sole controller-facing boundary for color conversion, value maps, directed massing, mass selection, and value painting.
- Removed direct algorithm-module dependencies from the main UI controller.
- Preserved the individual JavaScript algorithm modules behind the engine for focused testing and eventual incremental replacement.
- Added a contract regression test proving the engine facade produces the same value-map output as the underlying implementation.
- Retained the local-file-compatible production bundle introduced in v2.1.1.
- No intentional algorithm, UI, image-type, or saved-output changes.

## 2.1.1 - 2026-08-09

- Fixed application startup and image loading when `index.html` is opened directly from a local folder.
- Retained the ES-module source architecture introduced in v2.1.0.
- Added a generated, browser-compatible production bundle for both local and hosted use.
- Added an explicit build command to regenerate the production bundle after module changes.

## 2.1.0 - 2026-08-09

- Converted the main application, color engine, value-map engine, massing tools, mass-selection tools, value brush, viewport, feature analysis, and version metadata from browser globals to standard ES modules.
- Replaced nine separately ordered production script tags with one `type="module"` application entry point.
- Added explicit module dependency declarations and versioned dependency URLs to prevent stale pre-module files from being reused after deployment.
- Converted the Node and browser regression harnesses to consume the same ES modules as production.
- Added a module-isolation regression test confirming core modules no longer publish legacy `window` globals.
- Passed 9/9 deterministic tests and 5/5 supplied real-image regression tests with unchanged output hashes.
- Confirmed the Blue Jay 3-value workflow in the browser with no console errors.
- No intentional algorithm, UI, image-type, or output changes from v2.0.0.

## 2.0.0 - 2026-08-09

- Established the regression-test foundation for the staged architectural refactor.
- Added eight deterministic tests covering color conversion, Painter's Value parsing, value-map generation, polygon massing, connected-mass selection, selection refinement, value painting, and feature splitting.
- Added five owner-supplied real-image fixtures spanning portrait, bird, detailed landscape, broad landscape, and sunset use cases.
- Captured exact 3-value and 5-value map baselines for all five QA images; all five browser regressions pass.
- Added a repeatable manual QA checklist for desktop, tablet/phone sampling, Value Massing, AI feature analysis, and the embedded/standalone Eye Trainer.
- No intentional production behavior changes from v1.14.2.

## 1.14.2 - 2026-08-09

- Refined the section 5 heading in the About dialog.
- Clarified the Value Eye Training introduction and explicitly labeled both training games.

## 1.14.1 - 2026-08-09

- Added Shift-controlled straight segments to **Value Massing: By Area** drawing on keyboard-equipped computers and tablets.
- Free-form drawing resumes as soon as Shift is released, allowing curved and straight segments in one boundary.
- Updated the Value Massing guidance and About dialog to explain the mixed free-form and straight-line workflow.

## 1.14.0 - 2026-08-08

- Replaced the About dialog wording with the supplied `AboutTextWording.docx` content.
- Expanded About to describe the complete six-part workflow, both Value Eye Training games, scoring behavior, and the proprietary notice.
- Made Value Comparison the default Value Eye Trainer game in both embedded and standalone use.
- Updated the Eye Trainer service-worker cache so deployed browsers receive the new default reliably.

## 1.13.3 - 2026-08-05

- Reduced peak AI memory by running the two models sequentially and disposing each live pipeline after its masks have been converted into Tonal Value Designer features.
- Kept downloaded model files in the browser cache, so disposal does not require downloading them again for later analyses.
- Added phase-specific errors identifying broad-scene failures separately from object-recognition failures.
- Added model-memory release phases to the blocking progress overlay.
- Corrected RGBA mask interpretation so the opaque alpha channel is not mistaken for feature membership.
- Replaced the unreliable quantized panoptic masks with the lighter DETR object detector.
- Converted detected-object boxes into localized selectable regions, rejected oversized detections, and suppressed nested duplicates by preferring tighter boxes.
- Clearly identified detected-object boundaries as approximate and directed users to Add Area and Remove Area for refinement.
- Validated the complete workflow against `Blue-Jay-cherry-blossoms2.png`; it returned Sky, Tree, and a localized Bird object region covering approximately 17% of the image.

## 1.13.2 - 2026-08-05

- Added a blocking feature-analysis overlay with an animated progress indicator and live phase descriptions.
- Prevented accidental interaction with other controls while AI analysis is running.
- Replaced the assumption that every failure has an `error.message` with robust handling for errors, strings, events, nested reasons, and browser-runtime failures.
- Added actionable fallback guidance when a browser supplies no failure details.
- Confirmed the two-model analysis path against the blue-jay test image; it returned a selectable Bird object mask.

## 1.13.1 - 2026-08-05

- Restricted AI feature identification to tablets and computers.
- Replaced the feature-analysis controls on phones with a concise availability and value-sampling message.
- Added an execution guard that prevents phones from initializing or downloading either AI model.
- Kept the shared responsive application and all non-AI phone functionality unchanged.

## 1.13.0 - 2026-08-05

- Added a second, instance-aware AI pass for recognizable subjects such as birds, people, animals, vehicles, and furnishings.
- Added free-form panoptic masks for recognized objects rather than detection rectangles.
- Merged recognized objects with the existing broad scene features in one selectable list.
- Marked recognized-object entries clearly and preferred their instance masks when both models report the same category.
- Retained the 2% threshold for broad scene regions while allowing recognized objects covering at least 0.5% of the image.
- Kept all inference in the browser; first use now downloads both quantized models and can take several minutes.

## 1.12.2 - 2026-08-05

- Increased embedded Eye Trainer typography for improved readability.
- Increased embedded mode, answer, range, hold, feedback, and navigation control sizes.
- Retained the compact embedded swatch dimensions and unchanged standalone layout.

## 1.12.1 - 2026-08-05

- Defined Value Comparison's official answer by whole-number Painter's Value groups.
- Awarded 10 points for the correct Same, Lighter, or Darker group-based answer.
- Awarded 5 points for an otherwise incorrect answer when the measured values are no more than 0.4 apart.
- Added measured values, value groups, and their difference to comparison feedback.

## 1.12.0 - 2026-08-05

- Added Value Identification and Value Comparison training-mode controls.
- Added two-swatch comparison challenges with Lighter, Same Value, and Darker answers.
- Added a configurable maximum comparison difference from 1 through 5 value steps, defaulting to 5.
- Based comparison answers on measured displayed values at tenth-of-a-value precision.
- Added comparison-mode scoring, feedback, grayscale peek, round history labels, and embedded compact styling.

## 1.11.4 - 2026-08-04

- Hid the temporary ten-step QA reference strip on the Eye Trainer color swatch.
- Retained the complete QA scale markup, styling, and initialization code.
- Added one internal `SHOW_QA_REFERENCE_SCALE` flag for restoring the strip later.

## 1.11.3 - 2026-08-04

- Reduced the embedded Eye Trainer swatch by another 25%.
- Reduced embedded typography, margins, padding, and vertical spacing.
- Shortened answer, hold, feedback, comparison, and navigation controls.
- Kept all ten answer choices on one row and left the standalone trainer unchanged.

## 1.11.2 - 2026-08-04

- Reduced the embedded Eye Trainer swatch dimensions by 25%.
- Reduced embedded answer-button sizing and placed all ten choices on one row.
- Kept the standalone Eye Trainer layout unchanged.

## 1.11.1 - 2026-08-04

- Corrected the embedded and standalone Eye Trainer references to load `value-eye-trainer/index.html` explicitly.
- Restored Eye Trainer operation when TonalValueDesigner is opened directly from an extracted local folder.
- Limited service-worker registration to HTTP and HTTPS so local-file testing does not produce a registration failure.

## 1.11.0 - 2026-08-04

- Embedded the Value Eye Trainer in a new TonalValueDesigner tool tab.
- Added a standalone trainer entry point at `value-eye-trainer/`.
- Used one shared trainer implementation for both embedded and standalone operation.
- Added a direct link from the embedded tool to the standalone trainer.

## 1.10.1 - 2026-08-04

- Added a dedicated comma button beside the custom Painter's Values field.
- Kept the phone's numeric keypad available while making comma-separated custom value sets practical on iPhone.
- The comma is inserted at the current cursor position and followed by a space for readability.

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
