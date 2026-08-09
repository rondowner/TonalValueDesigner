# Platform Contract

`js/browserPlatform.js` is the boundary between the main UI controller and browser-specific host services. Its `contractVersion` is `1`.

## Services

- Detect whether phone-only feature restrictions should apply.
- Decode a locally selected image file.
- Create a drawable canvas from `ImageData`.
- Save `ImageData` as a local PNG file.

## Replacement rule

A future PWA or Tauri host may replace this implementation, but it must retain the method names, inputs, outputs, errors, and asynchronous behavior defined here. The controller should not directly create object URLs, decode image files, or implement file downloads.

Ordinary DOM rendering and event handling remain UI-controller responsibilities. Deterministic value processing remains in `js/coreEngine.js`.
