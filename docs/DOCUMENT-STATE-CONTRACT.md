# Document State Contract

Version: 1  
Introduced: TonalValueDesigner 2.5.0

## Purpose

`js/documentState.js` owns the mutable state of the photograph and value study currently open in TonalValueDesigner. It keeps document data separate from HTML elements, browser services, and image-processing algorithms.

The UI controller may read or replace these fields as the user loads an image, samples it, creates a value map, changes the view, or saves the result. The state module does not perform those operations itself.

## Factory

`createDocumentState()` returns a new sealed state object. A new application session receives its own state object. Sealing prevents accidental addition or removal of fields while allowing the controller to update the defined fields.

## Fields

- `selectedPoint`: the current sampled image coordinate, or `null`.
- `measurement`: the current sampled color and Painter's Value result, or `null`.
- `lastViewportScale`: the most recently observed viewport scale.
- `originalData`: full-resolution `ImageData` for the loaded source photograph, or `null`.
- `mapData`: full-resolution `ImageData` for the generated and edited value map, or `null`.
- `retainedValues`: the Painter's Values used to generate the current map.
- `showingMap`: whether the image workspace currently displays `mapData` rather than `originalData`.
- `sourceName`: the filename stem used when exporting a value map.

## Boundary rules

- The module must remain independent of the DOM, canvas elements, dialogs, and status messages.
- The module must not decode images, save files, or detect devices; those responsibilities belong to `browserPlatform.js`.
- The module must not calculate color, generate value maps, or edit image data; those responsibilities belong behind `coreEngine.js`.
- Edit-operation history remains owned by `editHistory.js`. The current rendered map belongs to document state.
- Pointer gestures, active drawing modes, temporary selection outlines, and similar transient state belong to the interaction-state boundary defined in `INTERACTION-STATE-CONTRACT.md`.
- Image data remains in the existing browser `ImageData` representation in this step. A future engine or host adapter may introduce a portable buffer representation behind an explicit conversion boundary.

## Replacement guidance

A future PWA, Rust/WebAssembly, or Tauri implementation may replace the storage mechanism, but the controller must continue to have one coherent active-document record with equivalent fields and reset semantics. UI code should not recreate independent shadow copies of these fields.
