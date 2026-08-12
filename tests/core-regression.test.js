"use strict";

import assert from "node:assert/strict";
import TonalValueDesignerColor from "../js/color.js";
import TonalValueDesignerValueMap from "../js/valueMap.js";
import TonalValueDesignerMassing from "../js/massing.js";
import TonalValueDesignerMassSelection from "../js/massSelection.js";
import TonalValueDesignerValueBrush from "../js/valueBrush.js";
import TonalValueDesignerFeatureSegmentation from "../js/featureSegmentation.js";
import TonalValueDesignerCoreEngine from "../js/coreEngine.js";
import TonalValueDesignerBrowserPlatform from "../js/browserPlatform.js";
import createEditHistory from "../js/editHistory.js";
import createDocumentState from "../js/documentState.js";
import createInteractionState from "../js/interactionState.js";
import createCanvasRenderer from "../js/canvasRenderer.js";
import TonalValueDesignerMeasurement from "../js/measurement.js";
import createSquintEngine from "../js/squint.js";
import { readFile } from "node:fs/promises";

globalThis.ImageData = class ImageData {
    constructor(dataOrWidth, widthOrHeight, optionalHeight) {
        if (typeof dataOrWidth === "number") {
            this.width = dataOrWidth;
            this.height = widthOrHeight;
            this.data = new Uint8ClampedArray(this.width * this.height * 4);
        } else {
            this.data = dataOrWidth;
            this.width = widthOrHeight;
            this.height = optionalHeight;
        }
    }
};

function image(width, height, pixelAt) {
    const data = new Uint8ClampedArray(width * height * 4);
    for (let y = 0; y < height; y += 1) {
        for (let x = 0; x < width; x += 1) {
            const pixel = pixelAt(x, y);
            const offset = (y * width + x) * 4;
            data[offset] = pixel[0];
            data[offset + 1] = pixel[1];
            data[offset + 2] = pixel[2];
            data[offset + 3] = pixel[3] ?? 255;
        }
    }
    return new ImageData(data, width, height);
}

function hash(bytes) {
    let value = 0x811c9dc5;
    for (const byte of bytes) {
        value ^= byte;
        value = Math.imul(value, 0x01000193);
    }
    return (value >>> 0).toString(16).padStart(8, "0");
}

const tests = [];
const test = (name, action) => tests.push({ name, action });

test("Core ES modules do not publish legacy window globals", () => {
    assert.equal(globalThis.TonalValueDesignerColor, undefined);
    assert.equal(globalThis.TonalValueDesignerValueMap, undefined);
    assert.equal(globalThis.TonalValueDesignerMassing, undefined);
    assert.equal(globalThis.TonalValueDesignerMassSelection, undefined);
    assert.equal(globalThis.TonalValueDesignerValueBrush, undefined);
    assert.equal(globalThis.TonalValueDesignerFeatureSegmentation, undefined);
});

test("Core engine exposes the stable controller contract", () => {
    assert.equal(TonalValueDesignerCoreEngine.contractVersion, 2);
    assert.equal(Object.isFrozen(TonalValueDesignerCoreEngine), true);
    assert.deepEqual(TonalValueDesignerCoreEngine.parseValues("2, 5, 8"), [2, 5, 8]);
    assert.deepEqual(TonalValueDesignerCoreEngine.rgbToLab(128, 128, 128), TonalValueDesignerColor.rgbToLab(128, 128, 128));

    const source = image(3, 1, x => x === 0 ? [0, 0, 0] : x === 1 ? [128, 128, 128] : [255, 255, 255]);
    const throughFacade = TonalValueDesignerCoreEngine.generateValueMap(source, [2, 5, 8]);
    const direct = TonalValueDesignerValueMap.generate(source, [2, 5, 8]);
    assert.deepEqual(Array.from(throughFacade.data), Array.from(direct.data));
});

test("Production bundle includes every core engine dependency", async () => {
    const bundle = await readFile(new URL("../js/app.bundle.js", import.meta.url), "utf8");
    assert.ok(bundle.includes("/* ===== squint.js ===== */"));
    assert.ok(bundle.indexOf("function createSquintEngine") < bundle.indexOf("const SquintEngine = createSquintEngine"));
});

test("Browser host exposes the stable platform contract", () => {
    assert.equal(TonalValueDesignerBrowserPlatform.contractVersion, 1);
    assert.equal(Object.isFrozen(TonalValueDesignerBrowserPlatform), true);
    assert.equal(typeof TonalValueDesignerBrowserPlatform.isPhone, "function");
    assert.equal(typeof TonalValueDesignerBrowserPlatform.loadImageFile, "function");
    assert.equal(typeof TonalValueDesignerBrowserPlatform.canvasFromImageData, "function");
    assert.equal(typeof TonalValueDesignerBrowserPlatform.savePng, "function");
});

test("Edit history preserves the undo limit and rebuild order", () => {
    const history = createEditHistory({
        limit: 2,
        applyOperation: (imageData, operation) => ({
            imageData: { value: imageData.value + operation.delta },
            changed: 1
        })
    });
    assert.equal(history.contractVersion, 1);
    history.reset({ value: 0 });
    history.record({ delta: 1 });
    history.record({ delta: 2 });
    history.record({ delta: 3 });
    assert.equal(history.size, 2);
    assert.equal(history.rebuild().value, 6);

    const firstUndo = history.undo();
    assert.equal(firstUndo.undone, true);
    assert.equal(firstUndo.remaining, 1);
    assert.equal(firstUndo.imageData.value, 3);

    const secondUndo = history.undo();
    assert.equal(secondUndo.imageData.value, 1);
    assert.equal(history.canUndo, false);
    assert.equal(history.undo().undone, false);
});

test("Document state starts clean and remains structurally stable", () => {
    const state = createDocumentState();
    assert.equal(Object.isSealed(state), true);
    assert.equal(state.originalData, null);
    assert.equal(state.mapData, null);
    assert.deepEqual(state.retainedValues, []);
    assert.equal(state.showingMap, false);
    assert.equal(state.sourceName, "value-map");
    state.sourceName = "study";
    state.showingMap = true;
    assert.equal(state.sourceName, "study");
    assert.equal(state.showingMap, true);
    assert.throws(() => { state.unexpectedProperty = true; });
});

test("Interaction state starts idle and remains structurally stable", () => {
    const state = createInteractionState();
    assert.equal(Object.isSealed(state), true);
    assert.equal(state.drawingMode, false);
    assert.equal(state.massSelectionMode, false);
    assert.equal(state.selectionHighlightData, null);
    assert.equal(state.paintMode, false);
    assert.equal(state.explicitPanMode, false);
    assert.deepEqual(state.lassoPoints, []);
    assert.deepEqual(state.detectedFeatures, []);
    assert.equal(state.paintPointers instanceof Set, true);
    assert.equal(state.paintPointers.size, 0);
    state.paintMode = true;
    state.paintPointers.add(7);
    assert.equal(state.paintMode, true);
    assert.equal(state.paintPointers.has(7), true);
    assert.throws(() => { state.unexpectedProperty = true; });
});

test("Canvas renderer exposes a host boundary and draws supplied layers", () => {
    const calls = [];
    let layerCanvasCreations = 0;
    const context = {
        save: () => calls.push("save"),
        restore: () => calls.push("restore"),
        beginPath: () => calls.push("beginPath"),
        closePath: () => calls.push("closePath"),
        moveTo: () => calls.push("moveTo"),
        lineTo: () => calls.push("lineTo"),
        quadraticCurveTo: () => calls.push("quadraticCurveTo"),
        arc: () => calls.push("arc"),
        stroke: () => calls.push("stroke"),
        fill: () => calls.push("fill"),
        fillText: () => calls.push("fillText"),
        setLineDash: () => calls.push("setLineDash"),
        putImageData: () => calls.push("putImageData"),
        drawImage: () => calls.push("drawImage"),
        measureText: () => ({ width: 64 })
    };
    const renderer = createCanvasRenderer({
        canvas: { width: 400, height: 300 },
        context,
        getScale: () => 2,
        createLayerCanvas: () => {
            layerCanvasCreations += 1;
            return {};
        }
    });
    assert.deepEqual(Object.keys(renderer).sort(), ["drawSourceImage", "render"]);
    renderer.drawSourceImage({});
    renderer.render({
        baseData: {},
        selectionOverlayData: {},
        lasso: { points: [{ x: 1, y: 1 }, { x: 20, y: 20 }], complete: true },
        brush: { point: { x: 12, y: 12 }, radius: 5 }
    });
    renderer.render({
        baseData: {},
        sample: { point: { x: 30, y: 40 }, value: 5.4 }
    });
    assert.ok(calls.includes("putImageData"));
    assert.ok(calls.filter(call => call === "drawImage").length >= 2);
    assert.ok(calls.includes("arc"));
    assert.ok(calls.includes("fillText"));
    assert.ok(calls.includes("setLineDash"));
    assert.equal(layerCanvasCreations, 1);
    assert.throws(() => createCanvasRenderer({ canvas: null, context, getScale: () => 1, createLayerCanvas: () => ({}) }));
});

test("Sampling delegates host-neutral image data to the core engine", async () => {
    const appSource = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
    const measureBody = appSource.match(/function measure\(\) \{([\s\S]*?)\n    \}/)?.[1] || "";
    assert.ok(measureBody.includes("CoreEngine.measureValue("));
    assert.ok(measureBody.includes("activeData()"));
    assert.equal(measureBody.includes("context.getImageData"), false);
});

test("Value measurement averages image data and reports Painter's Value", () => {
    const source = image(3, 3, (x, y) => {
        if (x === 1 && y === 1) return [255, 255, 255, 255];
        return [0, 0, 0, 255];
    });
    const center = TonalValueDesignerMeasurement.measureValue(source, 1, 1, 1);
    assert.deepEqual(
        { red: center.red, green: center.green, blue: center.blue, width: center.width, height: center.height, value: center.value },
        { red: 255, green: 255, blue: 255, width: 1, height: 1, value: 10 }
    );
    const averaged = TonalValueDesignerCoreEngine.measureValue(source, 1, 1, 3);
    assert.deepEqual(
        { red: averaged.red, green: averaged.green, blue: averaged.blue, width: averaged.width, height: averaged.height },
        { red: 28, green: 28, blue: 28, width: 3, height: 3 }
    );
    const edge = TonalValueDesignerMeasurement.averagePixels(source, 0, 0, 3);
    assert.deepEqual({ width: edge.width, height: edge.height }, { width: 2, height: 2 });
});

test("Eye Trainer comparison uses decimal direction and updated retry wording", async () => {
    const trainerSource = await readFile(new URL("../value-eye-trainer/app.js", import.meta.url), "utf8");
    assert.ok(trainerSource.includes("second.value===first.value?'same':second.value>first.value?'lighter':'darker'"));
    assert.ok(trainerSource.includes("'Try Again · +0'"));
    assert.equal(trainerSource.includes("'Keep looking · +0'"), false);
    assert.equal(trainerSource.includes("secondGroup===firstGroup?'same'"), false);
});

test("CIELAB reference colors and Painter's Value mapping", () => {
    assert.ok(Math.abs(TonalValueDesignerColor.rgbToLab(0, 0, 0).l) < 0.001);
    assert.ok(Math.abs(TonalValueDesignerColor.rgbToLab(255, 255, 255).l - 100) < 0.01);
    assert.ok(Math.abs(TonalValueDesignerColor.rgbToLab(128, 128, 128).l - 53.585) < 0.01);
    assert.equal(TonalValueDesignerColor.labLightnessToRoundedPainterValue(0), 1);
    assert.equal(TonalValueDesignerColor.labLightnessToRoundedPainterValue(50), 5.5);
    assert.equal(TonalValueDesignerColor.labLightnessToRoundedPainterValue(100), 10);
});

test("Painter's Value input parsing", () => {
    assert.deepEqual(TonalValueDesignerValueMap.parseValues("8, 2, 5, 5"), [2, 5, 8]);
    assert.deepEqual(TonalValueDesignerValueMap.parseValues("1; 3 7,9"), [1, 3, 7, 9]);
    assert.throws(() => TonalValueDesignerValueMap.parseValues("5"));
    assert.throws(() => TonalValueDesignerValueMap.parseValues("0, 5"));
});

test("Synthetic value-map output remains byte-for-byte stable", () => {
    const source = image(4, 3, (x, y) => [
        (x * 67 + y * 29) % 256,
        (x * 31 + y * 83) % 256,
        (x * 113 + y * 17) % 256,
        255
    ]);
    const result = TonalValueDesignerValueMap.generate(source, [2, 5, 8]);
    assert.equal(hash(result.data), "3219279a");
});

test("Squint preserves a strong boundary while simplifying neighborhoods", () => {
    const source = image(8, 4, (x, y) => x < 4
        ? [35 + ((x + y) % 2) * 18, 70, 120, 255]
        : [225, 210 - ((x + y) % 2) * 18, 165, 255]);
    const engine = createSquintEngine({ generateValueMap: TonalValueDesignerValueMap.generate });
    const result = engine.simplify(source, [2, 5, 8], { amount: 3, edgeProtection: 5 });
    assert.equal(result.width, source.width);
    assert.equal(result.height, source.height);
    assert.notEqual(result.data[(1 * 8 + 3) * 4], result.data[(1 * 8 + 4) * 4]);
    assert.equal(hash(result.data), "a4080a45");
});

test("Polygon value massing remains stable", () => {
    const source = image(10, 10, () => [90, 90, 90, 255]);
    const result = TonalValueDesignerMassing.applyPolygon(source, [
        { x: 2, y: 2 }, { x: 7, y: 2 }, { x: 7, y: 7 }, { x: 2, y: 7 }
    ], 8);
    assert.equal(result.changed, 30);
    assert.equal(hash(result.imageData.data), "e732f3d5");
});

test("Connected value-mass identification and replacement", () => {
    const source = image(5, 4, x => x < 2 ? [30, 30, 30, 255] : [200, 200, 200, 255]);
    const selection = TonalValueDesignerMassSelection.identify(source, 0, 0);
    assert.equal(selection.size, 8);
    assert.equal(selection.spans.length, 4);
    const result = TonalValueDesignerMassSelection.apply(source, selection.spans, 8);
    assert.equal(result.changed, 8);
    assert.equal(hash(result.imageData.data), "b3977345");
});

test("Selection refinement removes an enclosed portion", () => {
    const source = image(8, 8, () => [70, 70, 70, 255]);
    const selection = TonalValueDesignerMassSelection.identify(source, 2, 2);
    const result = TonalValueDesignerMassSelection.refine(selection, [
        { x: 2, y: 2 }, { x: 6, y: 2 }, { x: 6, y: 6 }, { x: 2, y: 6 }
    ], "remove");
    assert.equal(result.changed, 20);
    assert.equal(result.selection.size, 44);
});

test("Paint Value stroke remains stable", () => {
    const source = image(20, 20, () => [40, 40, 40, 255]);
    const result = TonalValueDesignerValueBrush.applyStroke(source, [
        { x: 4, y: 10 }, { x: 10, y: 10 }, { x: 16, y: 10 }
    ], 8, 2);
    assert.equal(result.changed, 60);
    assert.equal(hash(result.imageData.data), "fc3ea295");
});

test("Feature splitting assigns pixels to retained Painter's Values", () => {
    const dark = TonalValueDesignerValueMap.grayForPainterValue(2);
    const light = TonalValueDesignerValueMap.grayForPainterValue(8);
    const map = image(10, 2, x => x < 6 ? [dark, dark, dark, 255] : [light, light, light, 255]);
    const feature = {
        label: "test", name: "Test", width: 10, height: 2, size: 20, source: "test",
        spans: [{ y: 0, startX: 0, endX: 9 }, { y: 1, startX: 0, endX: 9 }]
    };
    const divisions = TonalValueDesignerFeatureSegmentation.splitByValue(
        feature, map, [2, 8], TonalValueDesignerValueMap.grayForPainterValue
    );
    assert.deepEqual(divisions.map(item => [item.painterValue, item.size]), [[2, 12], [8, 8]]);
});

let failed = 0;
for (const { name, action } of tests) {
    try {
        action();
        console.log(`PASS  ${name}`);
    } catch (error) {
        failed += 1;
        console.error(`FAIL  ${name}`);
        console.error(error.message);
    }
}
console.log(`\n${tests.length - failed}/${tests.length} tests passed.`);
if (failed) process.exitCode = 1;
