# Canvas Renderer Contract

Version: 1  
Introduced: TonalValueDesigner 2.7.0

## Purpose

`js/canvasRenderer.js` is the presentation boundary between the UI controller and the image canvas. The controller supplies the layers that should be visible; the renderer performs the low-level canvas drawing.

## Factory

`createCanvasRenderer({ canvas, context, getScale, createLayerCanvas })` requires a target canvas, its two-dimensional drawing context, a function that reports the current viewport scale, and an injected factory that converts host-neutral overlay `ImageData` into a browser display canvas. It returns a frozen interface.

## Public interface

- `drawSourceImage(image)`: draws a newly decoded browser image into the target canvas so the controller can capture its full-resolution `ImageData`.
- `render(description)`: composes a frame from the supplied layer description.

The render description may contain:

- `baseData`: the original photograph or current value-map `ImageData`.
- `selectionOverlayData`: host-neutral `ImageData` for the temporary selection-highlight layer.
- `lasso`: the current free-form or straight-segment area boundary.
- `sample`: the sampled point and optional Painter's Value badge.
- `brush`: the current paint-brush cursor point and radius.

## Boundary rules

- The renderer must not read HTML controls, subscribe to events, select tools, change application state, or invoke image-processing algorithms.
- The controller decides which layers are active and requests a complete redraw.
- Image and map content belong to `documentState.js`; transient tool state belongs to `interactionState.js`.
- Renderer scale affects only overlay presentation. It must not alter full-resolution image or map data.
- Saved value maps are produced from document image data through `browserPlatform.js`, not by capturing the presentation canvas; interface overlays must never appear in exported maps.
- Selection-overlay conversion is cached by `ImageData` identity so ordinary redraws do not repeatedly rebuild the browser layer.
- The current implementation is browser Canvas 2D specific. A Tauri host may retain it in the web view or replace it with an equivalent renderer without changing core algorithms or application state.

## Future migration

Rust/WebAssembly may later generate or transform the selection mask and overlay buffer. This renderer—or its host-specific replacement—remains responsible for presenting that buffer; the controller and interaction state do not store browser canvases.
