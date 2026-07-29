# TonalValueDesigner 1.8.2

TonalValueDesigner is a browser-based studio tool that samples a photograph, reports CIELAB color, estimates Painter's Value on a 1-10 scale, and creates simplified value maps.

## Run

Open `index.html` in a modern browser or publish the project with GitHub Pages. No compilation or installation is required.

## Workspace and tool tabs

The photograph chooser remains visible while the remaining controls are organized into three tabs:

- **Value Sampling:** measured value, optional target comparison, and sampling options.
- **Create Value Map:** retained values, presets, map generation, comparison, and PNG export.
- **Value Massing:** directed massing, value painting, and selection-based adjustment.

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

1. Enter the exact Painter's Values to retain, such as `1, 3, 5, 7, 9`, or choose a preset.
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

Add Area and Remove Area change only the blue selection mask; they do not alter the value map. Escape cancels the current refinement boundary while retaining the selected mass. **Cancel Selection** clears the whole selection, and **Undo Last** restores an applied value change.

## Value Massing: By Area

1. Generate a Painter's Value Map.
2. In **Directed Value Massing**, choose the value that should fill the area.
3. Select **Draw Area** and trace a free-form boundary directly over the map. Release to close it.
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
|   |-- color.js
|   |-- valueMap.js
|   |-- massing.js
|   |-- massSelection.js
|   |-- valueBrush.js
|   |-- version.js
|   `-- viewport.js
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

The header and footer display the running version. Version 1.8.2 was built on 2026-07-29. Select **About Tonal Value Designer** beside the header version to read the product purpose and supported painting workflow.
