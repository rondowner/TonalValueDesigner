"use strict";

function createInteractionState() {
    const state = {
        drawingMode: false,
        drawingPointer: null,
        straightSegmentAnchorIndex: null,
        lassoPoints: [],
        lassoComplete: false,
        massSelectionMode: false,
        selectedMass: null,
        selectionHighlightData: null,
        selectionRefineMode: null,
        paintMode: false,
        paintPaused: false,
        brushPointer: null,
        brushPoints: [],
        brushStrokeChanged: 0,
        brushCursorPoint: null,
        paintGestureBlocked: false,
        explicitPanMode: false,
        detectedFeatures: [],
        featureSelectionActive: false,
        paintPointers: new Set()
    };

    return Object.seal(state);
}

export default createInteractionState;
