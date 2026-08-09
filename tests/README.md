# Tonal Value Designer regression tests

These tests freeze the behavior of the JavaScript implementation at the v2.0.0 architectural baseline.

## Core tests

From the project directory, run:

```text
npm test
```

No package installation is required. The suite uses Node.js built-in facilities and tests color conversion, value parsing, value-map generation, polygon massing, mass selection, selection refinement, value painting, and feature splitting.

## Real-image regression tests

Serve the project from a local web server and open:

```text
tests/browser-regression.html
```

The page runs the five supplied QA images through the current 3-value and 5-value map implementations and compares exact decoded-image dimensions, pixel hashes, output hashes, and value distributions with the v2.0.0 baseline.

The AI feature-analysis models are intentionally excluded. Model downloads and model-runtime output are not deterministic enough for byte-for-byte regression testing. Feature analysis remains part of the manual smoke-test checklist.
