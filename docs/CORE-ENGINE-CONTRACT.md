# Core Engine Contract

`js/coreEngine.js` is the only deterministic image-processing interface used by the main UI controller. Its `contractVersion` is `2`.

## Data boundary

- Image operations receive and return browser `ImageData` objects unless explicitly documented as in-place operations.
- Coordinates, radii, and Painter's Values are plain JavaScript numbers.
- Value sets are sorted arrays of numbers from 1 through 10.
- Mass selections remain plain objects containing spans and source-value metadata.

## Capability groups

- Sample-area pixel averaging and complete Painter's Value measurement
- Color and Painter's Value conversion
- Value-set parsing, value-map generation, and legends
- Polygon-based value massing
- Connected-mass identification, refinement, highlighting, and reassignment
- Brush sizing and value-painting strokes

## Replacement rule

A future Rust/WebAssembly or Tauri engine must preserve the method names, inputs, outputs, mutation behavior, and `contractVersion` exposed by `coreEngine.js`. The UI controller must not import the underlying algorithm modules directly.

Feature recognition remains outside this contract because it is an optional browser AI service rather than a deterministic core image-processing algorithm.

## Measurement methods

- `averagePixels(imageData, x, y, sampleSize)` returns alpha-weighted RGB channels plus the actual clipped sample width and height.
- `measureValue(imageData, x, y, sampleSize)` returns those averaged fields together with CIELAB data and the continuous Painter's Value estimate used by the application.

Sampling is performed against active document image data, never against the presentation canvas. Crosshairs, badges, selection overlays, and brush cursors therefore cannot contaminate a measurement.
