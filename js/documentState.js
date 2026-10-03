"use strict";

function createDocumentState() {
    const state = {
        selectedPoint: null,
        measurement: null,
        lastViewportScale: 1,
        originalData: null,
        bwData: null,
        mapData: null,
        retainedValues: [],
        visibleValues: [],
        showingMap: false,
        showingBw: false,
        sourceName: "value-map"
    };

    return Object.seal(state);
}

export default createDocumentState;
