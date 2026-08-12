# TonalValueDesigner 2.10.1

TonalValueDesigner is a browser-based studio tool that samples a photograph, reports CIELAB color, estimates Painter's Value on a 1-10 scale, and creates simplified value maps.

## Run

Open `index.html` in a modern browser or publish the project with GitHub Pages. No compilation or installation is required.

## Workspace and tool tabs

The photograph chooser remains visible while the remaining controls are organized into three tabs:

- **Value Sampling:** measured value, optional target comparison, and sampling options.
- **Create Value Map:** retained values, presets, map generation, comparison, and PNG export.
- **Value Massing:** directed massing, value painting, and selection-based adjustment.
- **Eye Trainer:** an embedded Painter's Value recognition exercise that also runs from its own URL.

The **Value Sampling** tab begins with a compact instruction explaining where to select an image to measure its value.

The **Create Value Map** tab begins with a compact purpose statement and **Learn more about value studies** control. Its persistent learning panel explains value studies, value sampling, value massing, simplification, design testing, and light logic.

The **Value Massing** tab begins with a compact purpose statement and **Learn about value massing** control. It opens a persistent explanation using the original instructional wording. Both learning panels remain available until dismissed, follow the width of the resizable control column, and work with mouse, keyboard, stylus, and touch.

### Value Massing: Squint prototype

Squint is an experimental global value-massing tool. It softens minor variations in the original full-color image while resisting strong color boundaries, then converts the result into the currently retained Painter's Values. **Squint** controls the degree of simplification; **Protect Major Edges** controls how strongly unlike neighboring colors resist mixing.

Select **Preview** to inspect the result without changing the editable map. **Apply** commits the preview and adds it to the shared undo history. **Reset** discards only the preview. This deterministic prototype runs locally and uses no AI model.

## Value Eye Trainer

Select the **Eye Trainer** tab to use the exercise inside TonalValueDesigner. The same shared application can be opened independently at `value-eye-trainer/index.html`. Score history is stored locally by the browser.

The Eye Trainer provides two modes: **Value Identification** for estimating one swatch's value, and **Value Comparison** for deciding whether a second swatch is lighter, darker, or the same measured value as the first. **Value Comparison is the default mode.** Comparison range is configurable from 1 through 5 value steps. A correct directional answer earns 10 points for any measured difference, including 0.1; an otherwise incorrect answer earns 5 when the measured values are no more than 0.4 apart.

The embedded presentation uses a reduced color swatch, one row of ten answer buttons, and compact typography, spacing, feedback, comparison, and navigation controls. These compact-layout changes do not affect the standalone trainer.

Embedded Eye Trainer typography and controls are moderately enlarged for readability while retaining the compact swatch dimensions.

The trainer's temporary ten-step QA reference strip is retained in the source but hidden by default through the internal `SHOW_QA_REFERENCE_SCALE` setting.

The embedded and standalone presentations load the same trainer files, so they do not require separate development branches or synchronized copies.

On desktop, drag the vertical divider between the controls and image to redistribute the workspace. The divider also accepts Left Arrow, Right Arrow, Home, and End when focused; double-clicking restores the default width. On narrow phone layouts the divider is hidden and TonalValueDesigner uses its stacked layout.

## Measure a color

1. Choose a browser-supported image.
2. Tap or click a representative area. The Painter's Value appears beside the sampled point and in the results panel.
3. Open **Sampling Options** only when you want to change the averaging size; 5 x 5 or 9 x 9 is usually stable.
4. Open **Color Details** when you need CIELAB, RGB, hexadecimal, sample-size, or image-position data.
5. Optionally enter a planned value and tolerance.

The on-image value label remains readable while zooming, moves to stay inside the photograph near an edge, and is replaced by the next sample. It is an interface aid and is not included in saved value maps.

## Pan and zoom

- Mouse wheel: zoom around the pointer.
- Pinch: zoom around the midpoint of two touches.
- Drag: pan with mouse, touch, or stylus.
- **Fit Image**: fit and center the whole image, enlarging it beyond 100% when needed.
- **100%**: show one image pixel at one CSS pixel.
- **+ / -**: zoom around the viewport center.
- **Pan Image**: switch to a persistent navigation mode; select it again to return to the active sampling or painting tool.

A short tap or click samples the image. Dragging navigates without changing the sample.

## Create a Painter's Value Map

1. Enter the exact Painter's Values to retain, such as `1, 3, 5, 7, 9`, or choose a preset. On a phone, use the comma button beside the field to separate custom values while retaining the numeric keypad.
2. Select **Generate Map**. Each part of the photograph is assigned to the nearest retained value.
3. Use **Show Original** and **Show Value Map** to compare them.
4. Select **Save PNG** to download a clean, full-resolution map.

The saved PNG does not contain the sampling crosshair or interface controls. The on-screen legend identifies every gray by its Painter's Value number.

The presets include **Notan** (Values 1 and 10) plus three-, five-, and seven-value studies. The three-value preset (`2, 5, 8`) is initially selected. On desktop, the controls and image workspace scroll independently so the reference remains in view while using controls farther down the page.

## Select and Adjust Value Mass

1. Generate a Painter's Value Map and open the **Value Massing** tab.
2. Select **Select Mass**, then tap or click inside one shape.
3. Confirm the blue highlight covers the intended mass.
4. If necessary, use **Remove Area** and draw around an unwanted part of the selection, or use **Add Area** to extend it.
5. Choose a retained Painter's Value and select **Apply Value**.

Add Area and Remove Area change only the blue selection mask; they do not alter the value map. Escape cancels the current refinement boundary while retaining the selected mass. **Cancel Selection** clears the whole selection. The adjacent **Undo Last** button restores the most recent applied massing or value change.

## Identify Features — AI prototype

After generating a value map, open the **Value Massing** tab and select **Analyze Image**. Two complementary models run in the browser. The first proposes broad features such as sky, mountains, trees, roads, buildings, fields, and water. The second recognizes individual subjects such as people, birds, animals, vehicles, and furnishings and returns an approximate localized region for each subject.

Feature identification is available on tablets and computers, not phones. On a phone the analysis controls are replaced by an explanatory note, and an execution guard prevents either AI model from being initialized or downloaded. Opening and using Tonal Value Designer for phone value sampling therefore does not incur the AI-model download.

- The first analysis downloads and caches the browser runtime and two quantized models. The object-recognition model is substantially larger, so first use may take several minutes depending on the device and connection.
- The reference photograph is processed on the device and is not uploaded for inference.
- Analysis intentionally favors broad, thumbnail-scale regions over photographic boundary precision.
- Broad regions must cover at least 2% of the complete image. Recognized objects must cover at least 0.5%, allowing meaningful smaller subjects while suppressing tiny detections.
- Recognized objects are labeled in the list with `(recognized object)`. Their initial selection is an approximate rectangular region; use Add Area and Remove Area to refine the subject boundary before changing its value.
- While analysis runs, a blocking progress overlay identifies the current phase and prevents accidental interaction. It closes automatically when analysis succeeds or fails.
- If analysis fails, the displayed message accepts browser errors, download events, and runtime failures instead of displaying an undefined message.
- To reduce peak memory, the broad-scene model is disposed before object recognition begins. The object model is also disposed after its masks are converted into selectable features. Downloaded files remain in the browser cache.
- Failure messages identify whether the broad-scene or object-recognition phase failed.
- Disconnected regions within one category are offered as separate features when each is large enough to matter.
- Choose a detected feature and select **Select Feature** to highlight it in the value map.
- Select **Split Feature by Value** to divide the highlighted parent feature using the current Painter's Value Map. Divisions smaller than 2% of the selected feature are suppressed.
- Value divisions appear beneath their parent in the feature list with names such as `Sky — Value 5` and `Sky — Value 9`, and can be selected independently.
- Use the existing Add Area, Remove Area, and Apply Value controls to correct or redesign the proposed feature.

Feature identification is advisory. The artist remains responsible for deciding which real-world features should be joined or separated as compositional value masses. Internet access is required the first time the AI runtime and model are downloaded.

The prototype pins Transformers.js 3.8.1 and uses the quantized `Xenova/segformer-b0-finetuned-ade-512-512` broad-scene model plus the quantized `Xenova/detr-resnet-50` object-detection model. Review both upstream model cards and license metadata before treating these prototype dependencies as a final production distribution choice.

## Value Massing: By Area

1. Generate a Painter's Value Map.
2. In **Value Massing: By Area**, choose the value that should fill the area.
3. Select **Draw Area** and trace a boundary directly over the map. Draw free-form normally, or hold Shift temporarily to draw a straight segment. Release Shift to continue free-form drawing. Release the pointer to close the boundary.
4. Select **Apply Value** to normalize everything inside the boundary.
5. Use **Undo Last** repeatedly for up to ten recent changes, or **Save PNG** to export the edited map.

Pan and sampling are suspended while drawing so the gesture cannot move the image accidentally. While drawing is enabled, **Draw Area** remains visibly pressed. **Apply Value**, **Cancel Drawing**, **Undo Last**, or the Escape key exits drawing mode. When no earlier operation remains available, TonalValueDesigner displays **Undo limit reached** and disables the Undo button.

## Value Massing: Paint Value

1. Generate a Painter's Value Map.
2. Choose a retained Painter's Value and a **Fine**, **Medium**, **Broad**, or **Very Broad** brush.
3. Select **Paint Value**, then paint directly over unwanted interruptions.
4. Use **Undo Last** to remove recent strokes. Select **Done Painting** or select the pressed **Paint Value** button again to leave painting mode.

Each continuous gesture is one undoable stroke. Fast strokes are filled continuously without gaps. On iPhone, one finger paints and two fingers pinch to zoom. The persistent **Pan Image** button in the image toolbar temporarily changes one-finger movement from painting to navigation; select it again to resume painting. The hard-edged brush uses only values retained in the current map.

## Structure

```text
TonalValueDesigner/
|-- index.html
|-- README.md
|-- CHANGELOG.md
|-- js/
|   |-- app.js
|   |-- app.bundle.js
|   |-- browserPlatform.js
|   |-- canvasRenderer.js
|   |-- color.js
|   |-- coreEngine.js
|   |-- documentState.js
|   |-- editHistory.js
|   |-- interactionState.js
|   |-- valueMap.js
|   |-- massing.js
|   |-- massSelection.js
|   |-- measurement.js
|   |-- valueBrush.js
|   |-- featureSegmentation.js
|   |-- version.js
|   `-- viewport.js
|-- value-eye-trainer/
|   |-- index.html
|   |-- app.js
|   |-- styles.css
|   |-- manifest.webmanifest
|   |-- sw.js
|   `-- icon.svg
`-- styles/
    `-- styles.css
```

## Measurement tips and limitations

- TonalValueDesigner measures appearance in a photograph, not an intrinsic paint property.
- Exposure, white balance, glare, shadows, and room lighting affect the estimate.
- When checking mixed paint:
  - Photograph comparisons in the same frame, lighting, and orientation.
  - Sample a swatch applied on or next to the upright canvas rather than a pile on a horizontal palette.
  - Avoid glare and sample a representative flat area, not a highlight or texture shadow.
- Thin or transparent paint can be influenced by the underlying ground.

These notes are available in the application under the collapsed **Measurement Tips and Limitations** section.

## Version

The product header displays **TonalValueDesigner ©**. Its right side contains three lines: the current TVD version and build date, **Copyright © 2026 Ron Downer. All Rights Reserved.**, and the **About Tonal Value Designer** link. Version 2.10.1 was built on 2026-08-12.

TonalValueDesigner and Value Eye Trainer use independent release numbers. Advance the TVD version whenever the main tool changes. Advance the Eye Trainer version whenever its embedded or standalone files change. Value Eye Trainer is currently v1.0.

## Regression testing

Version 2.0.0 establishes the regression baseline for the staged architectural refactor. It intentionally preserves the v1.14.2 production behavior.

- Run `npm test` from the project folder for deterministic core-algorithm tests. No package installation is required.
- Serve the project and open `tests/browser-regression.html` for the five supplied real-image tests.
- Follow `tests/MANUAL-QA.md` before approving a refactoring release.

## Architecture

Beginning with version 2.1.0, the source uses standard JavaScript ES modules. Core components communicate through explicit `import` and `export` declarations rather than properties attached to the browser's `window` object. Version 2.1.1 adds the generated `js/app.bundle.js` production entry so the application works both through GitHub Pages and when `index.html` is opened directly from a local folder. Run `npm run build` after changing a production module.

Version 2.2.0 adds `js/coreEngine.js`, the stable contract between the UI controller and the image-processing implementation. `app.js` now calls this engine instead of importing the color, value-map, massing, mass-selection, and value-brush modules directly. A future Rust/WebAssembly or Tauri implementation can replace the engine implementation while preserving the controller-facing contract.

The contract and replacement rules are documented in `docs/CORE-ENGINE-CONTRACT.md`.

Version 2.3.0 adds `js/browserPlatform.js`, which isolates device detection, local-image decoding, image-data canvas creation, and PNG saving from the UI controller. This provides a replaceable host boundary for future PWA and Tauri packaging. Its contract is documented in `docs/PLATFORM-CONTRACT.md`.

Version 2.4.0 begins controller-state separation with `js/editHistory.js`. The bounded undo baseline and operation list shared by area massing, value painting, and selected-mass adjustments are now independent of DOM controls and status messages. See `docs/EDIT-HISTORY-CONTRACT.md`.

Version 2.5.0 continues controller-state separation with `js/documentState.js`. The active source image, generated map, retained values, current sample, display mode, viewport scale, and export name are now stored in one host-neutral document-state object rather than eight independent variables in `app.js`. See `docs/DOCUMENT-STATE-CONTRACT.md`.

Version 2.6.0 completes the current controller-state extraction with `js/interactionState.js`. Drawing, painting, selection refinement, feature-selection, pointer, and explicit-pan state now share one sealed interaction record rather than twenty independent variables in `app.js`. See `docs/INTERACTION-STATE-CONTRACT.md`.

Version 2.7.0 adds `js/canvasRenderer.js`, the presentation boundary for the source/value image, selection overlay, area boundary, sampling marker and value badge, and painting cursor. The controller now describes the layers to display rather than issuing low-level canvas drawing commands. See `docs/CANVAS-RENDERER-CONTRACT.md`.

Version 2.8.0 removes the remaining browser-canvas object from interaction state. Mass-selection highlighting is stored as engine-produced `ImageData`, while `canvasRenderer.js` owns and caches its conversion into a browser display layer. This keeps the selection result host-neutral for future Rust/WebAssembly or Tauri integration.

Version 2.9.0 moves pixel averaging and complete Painter's Value measurement into `js/measurement.js` behind core-engine contract version 2. Sampling now consumes active document `ImageData` directly instead of reading pixels back from the presentation canvas, making the result deterministic and host-neutral.

This is an internal architecture change only. Algorithms, browser image types, UI behavior, and saved output remain unchanged from the v2.0.0 regression baseline.
