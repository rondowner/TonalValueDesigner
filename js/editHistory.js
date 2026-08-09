"use strict";

function createEditHistory({ limit = 10, applyOperation }) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error("Undo limit must be a positive integer.");
    if (typeof applyOperation !== "function") throw new Error("Edit history requires an operation function.");

    let baseImageData = null;
    let operations = [];

    function rebuild() {
        if (!baseImageData) return null;
        let rebuilt = baseImageData;
        for (const operation of operations) {
            rebuilt = applyOperation(rebuilt, operation).imageData;
        }
        return rebuilt;
    }

    return Object.freeze({
        contractVersion: 1,

        clear() {
            baseImageData = null;
            operations = [];
        },

        reset(imageData) {
            baseImageData = imageData;
            operations = [];
        },

        record(operation) {
            if (!baseImageData) throw new Error("Edit history has not been initialized.");
            operations.push(operation);
            if (operations.length > limit) {
                const committedOperation = operations.shift();
                baseImageData = applyOperation(baseImageData, committedOperation).imageData;
            }
            return operations.length;
        },

        undo() {
            if (!baseImageData || operations.length === 0) {
                return { undone: false, imageData: rebuild(), remaining: 0 };
            }
            operations.pop();
            return { undone: true, imageData: rebuild(), remaining: operations.length };
        },

        rebuild,

        get size() { return operations.length; },
        get canUndo() { return Boolean(baseImageData) && operations.length > 0; }
    });
}

export default createEditHistory;
