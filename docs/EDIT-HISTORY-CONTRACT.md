# Edit History Contract

`js/editHistory.js` owns the bounded undo history shared by area massing, value painting, and selected-mass adjustments. Its `contractVersion` is `1`.

## Responsibilities

- Retain a configurable number of reversible editing operations.
- Commit the oldest operation into the baseline when the limit is exceeded.
- Rebuild the current value map deterministically from the baseline and retained operations.
- Return the rebuilt image and remaining undo count after an undo.
- Keep history state independent of buttons, status messages, and other DOM elements.

## Boundary

The UI controller decides when to record or undo an operation and how to present its status. The core engine applies each operation. Edit history owns only operation ordering, the bounded baseline, and reconstruction state.
