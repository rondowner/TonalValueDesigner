# Interaction State Contract

Version: 1  
Introduced: TonalValueDesigner 2.6.0

## Purpose

`js/interactionState.js` owns the temporary state of the tool or gesture currently active in TonalValueDesigner. It keeps interaction state separate from HTML controls, the active image document, edit history, browser services, and image-processing algorithms.

## Factory

`createInteractionState()` returns a new sealed state object in a fully idle condition. Sealing prevents accidental addition or removal of fields while allowing the UI controller to update the defined interaction fields.

## State groups

- Area drawing: `drawingMode`, `drawingPointer`, `straightSegmentAnchorIndex`, `lassoPoints`, and `lassoComplete`.
- Mass selection and refinement: `massSelectionMode`, `selectedMass`, `selectionHighlightData`, and `selectionRefineMode`.
- Value painting: `paintMode`, `paintPaused`, `brushPointer`, `brushPoints`, `brushStrokeChanged`, `brushCursorPoint`, `paintGestureBlocked`, and `paintPointers`.
- Navigation: `explicitPanMode`.
- Feature analysis selection: `detectedFeatures` and `featureSelectionActive`.

## Boundary rules

- The module must remain independent of the DOM and must not read or change controls, CSS classes, cursors, dialogs, canvases, or status messages.
- The controller remains responsible for translating pointer, keyboard, and button events into state transitions and visual updates.
- Photograph and value-map data belong to `documentState.js`.
- Reversible edit operations belong to `editHistory.js`.
- Color conversion and image edits belong behind `coreEngine.js`.
- Image decoding, device detection, and file saving belong to `browserPlatform.js`.
- `selectionHighlightData` contains the host-neutral `ImageData` overlay produced by the core engine. The renderer alone converts it into a browser display layer.

## Replacement guidance

A future PWA or Tauri controller may replace the event and rendering implementation while preserving one coherent interaction record with equivalent idle defaults and tool-mode semantics. Rust/WebAssembly algorithms should receive only the image data, masks, paths, and numeric parameters required for an operation; they should not depend directly on this controller state object.
