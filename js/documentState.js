"use strict";

function createDocumentState() {
    const state = {
        selectedPoint: null,
        measurement: null,
        lastViewportScale: 1,
        originalData: null,
        mapData: null,
        retainedValues: [],
        showingMap: false,
        sourceName: "value-map"
    };

    return Object.seal(state);
}

export default createDocumentState;
