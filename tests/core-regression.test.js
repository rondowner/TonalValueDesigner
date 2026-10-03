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

test("Continuous B&W preserves perceptual lightness, dimensions, and alpha", () => {
    const source = image(3, 1, x => x === 0
        ? [255, 0, 0, 80]
        : x === 1 ? [0, 255, 0, 160] : [0, 0, 255, 240]);
    const result = TonalValueDesignerCoreEngine.generateGrayscale(source);
    assert.equal(result.width, 3);
    assert.equal(result.height, 1);
    for (let index = 0; index < result.data.length; index += 4) {
        assert.equal(result.data[index], result.data[index + 1]);
        assert.equal(result.data[index], result.data[index + 2]);
        assert.equal(result.data[index + 3], source.data[index + 3]);
    }
    assert.ok(result.data[4] > result.data[0]);
    assert.ok(result.data[0] > result.data[8]);
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
    assert.deepEqual(state.visibleValues, []);
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
    assert.equal(calls.includes("fillText"), false);
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

test("Sample labels use a crisp screen-space overlay", async () => {
    const appSource = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
    const rendererSource = await readFile(new URL("../js/canvasRenderer.js", import.meta.url), "utf8");
    const viewportSource = await readFile(new URL("../js/viewport.js", import.meta.url), "utf8");
    const pageSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
    assert.ok(pageSource.includes('id="sampleValueOverlay"'));
    assert.ok(appSource.includes("function updateSampleOverlay()"));
    assert.ok(appSource.includes("viewport.imageToContainer("));
    assert.ok(viewportSource.includes("function imageToContainer("));
    assert.equal(rendererSource.includes("function drawValueBadge("), false);
});

test("Tabs preserve independent control-panel scroll positions", async () => {
    const appSource = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
    assert.ok(appSource.includes("const scrollPositions = new Map"));
    assert.ok(appSource.includes("scrollPositions.set(previous.id, previousHost.scrollTop)"));
    assert.ok(appSource.includes("destinationHost.scrollTop = scrollPositions.get(button.id) || 0"));
});

test("Side-by-side comparison provides selectable sources and synchronized viewports", async () => {
    const appSource = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
    const viewportSource = await readFile(new URL("../js/viewport.js", import.meta.url), "utf8");
    const pageSource = await readFile(new URL("../index.html", import.meta.url), "utf8");
    assert.ok(pageSource.includes('id="comparisonWorkspace"'));
    assert.ok(pageSource.includes('id="compareLeftSource"'));
    assert.ok(pageSource.includes('id="compareRightSource"'));
    assert.ok(appSource.includes("function synchronizeComparison("));
    assert.ok(appSource.includes("target.setView(state, false)"));
    assert.ok(viewportSource.includes("function setView("));
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

test("Eye Trainer includes same-value Color Difference training", async () => {
    const trainerSource = await readFile(new URL("../value-eye-trainer/app.js", import.meta.url), "utf8");
    const trainerHtml = await readFile(new URL("../value-eye-trainer/index.html", import.meta.url), "utf8");
    assert.ok(trainerHtml.includes('id="colorDifferenceMode"'));
    assert.ok(trainerHtml.includes("TONAL VALUE DESIGNER · v1.4"));
    assert.ok(trainerHtml.includes("Value Eye Trainer (working prototype)"));
    assert.ok(trainerHtml.indexOf('id="comparisonMode"') < trainerHtml.indexOf('id="identificationMode"'));
    assert.ok(trainerSource.includes("mode==='colorDifference'"));
    assert.ok(trainerSource.includes("Math.abs(second.value-first.value)>.1"));
    for (const direction of ["redder", "yellower", "greener", "bluer"]) {
        assert.ok(trainerSource.includes(`relation:'${direction}'`));
    }
});

test("Eye Trainer includes stepwise Correct the Color training", async () => {
    const trainerSource = await readFile(new URL("../value-eye-trainer/app.js", import.meta.url), "utf8");
    const trainerHtml = await readFile(new URL("../value-eye-trainer/index.html", import.meta.url), "utf8");
    assert.ok(trainerHtml.includes('id="colorCorrectionMode"'));
    assert.ok(trainerSource.includes("function makeColorCorrection()"));
    assert.ok(trainerSource.includes("function correctionDirections(challenge)"));
    assert.ok(trainerSource.includes("function answerColorCorrection(guess)"));
    assert.ok(trainerSource.includes("current.currentA=current.target.a"));
    assert.ok(trainerSource.includes("current.currentB=current.target.b"));
    assert.ok(trainerSource.includes("current.earned+=5;points+=5"));
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

test("Generated maps preserve exact categorical Painter's Values", () => {
    const retained = [1, 2, 4, 5, 6, 8, 9];
    const dark = TonalValueDesignerValueMap.grayForPainterValue(4);
    const light = TonalValueDesignerValueMap.grayForPainterValue(5);
    const map = image(4, 1, x => x < 2 ? [dark, dark, dark, 255] : [light, light, light, 255]);
    assert.equal(TonalValueDesignerValueMap.valueAt(map, 0, 0, retained), 4);
    assert.equal(TonalValueDesignerValueMap.valueAt(map, 3, 0, retained), 5);
    assert.equal(TonalValueDesignerCoreEngine.valueAt(map, 0, 0, retained), 4);
});

test("Value isolation masks hidden values without changing the map", () => {
    const retained = [2, 4, 5, 8];
    const gray4 = TonalValueDesignerValueMap.grayForPainterValue(4);
    const gray5 = TonalValueDesignerValueMap.grayForPainterValue(5);
    const gray8 = TonalValueDesignerValueMap.grayForPainterValue(8);
    const map = image(3, 1, x => {
        const gray = x === 0 ? gray4 : x === 1 ? gray5 : gray8;
        return [gray, gray, gray, 255];
    });
    const original = Array.from(map.data);
    const isolated = TonalValueDesignerCoreEngine.isolateValueMap(map, retained, [4, 5]);
    assert.deepEqual(Array.from(isolated.data.slice(0, 8)), original.slice(0, 8));
    assert.deepEqual(Array.from(isolated.data.slice(8, 12)), [190, 222, 242, 255]);
    assert.deepEqual(Array.from(map.data), original);
});

test("Controller uses exact categories and interactive value isolation", async () => {
    const appSource = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
    assert.ok(appSource.includes("CoreEngine.valueAt("));
    assert.ok(appSource.includes("CoreEngine.isolateValueMap("));
    assert.ok(appSource.includes('entry.setAttribute("aria-pressed"'));
    assert.ok(appSource.includes("Hidden values appear light blue"));
    assert.ok(appSource.includes("BrowserPlatform.savePng(documentState.mapData"));
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

test("Mass selection and refinement buttons toggle off and restore interaction", async () => {
    const source = await readFile(new URL("../js/app.js", import.meta.url), "utf8");
    const names = ["beginMassSelection", "beginSelectionRefinement", "finishSelectionRefinement", "cancelSelectionRefinement", "clearMassSelectionState", "cancelMassSelection"];
    const functions = names.map(name => {
        const match = source.match(new RegExp(`    function ${name}\\([^]*?\\n    \\}`));
        assert.ok(match, `Missing controller function ${name}`);
        return match[0];
    }).join("\n");
    const elements = new Map();
    const element = id => {
        if (!elements.has(id)) elements.set(id, {
            disabled: false, hidden: false, attributes: {}, classes: new Set(),
            setAttribute(name, value) { this.attributes[name] = value; },
            classList: { add(value) { elements.get(id).classes.add(value); }, remove(value) { elements.get(id).classes.delete(value); } }
        });
        return elements.get(id);
    };
    const state = createInteractionState();
    const documentState = { mapData: {}, showingMap: true };
    let interactionEnabled = true;
    const viewport = { setInteractionEnabled(value) { interactionEnabled = value; } };
    const factory = new Function("interactionState", "documentState", "$", "viewport", "drawingSurface", `
        let squintPreviewData = null;
        const redraw = () => {}, setMassSelectionStatus = () => {}, exitExplicitPanMode = () => {};
        ${functions}
        return { beginMassSelection, beginSelectionRefinement };
    `);
    const controls = factory(state, documentState, element, viewport, element("surface"));
    controls.beginMassSelection();
    assert.equal(state.massSelectionMode, true);
    assert.equal(element("selectMass").disabled, false);
    assert.equal(interactionEnabled, false);
    const selection = { size: 12 };
    state.selectedMass = selection;
    controls.beginSelectionRefinement("remove");
    assert.equal(element("removeSelectionArea").disabled, false);
    assert.equal(element("removeSelectionArea").attributes["aria-pressed"], "true");
    controls.beginSelectionRefinement("remove");
    assert.equal(state.selectionRefineMode, null);
    assert.equal(state.selectedMass, selection);
    assert.equal(element("removeSelectionArea").attributes["aria-pressed"], "false");
    controls.beginSelectionRefinement("add");
    controls.beginSelectionRefinement("remove");
    assert.equal(state.selectionRefineMode, "remove");
    assert.equal(element("addSelectionArea").attributes["aria-pressed"], "false");
    controls.beginMassSelection();
    assert.equal(state.massSelectionMode, false);
    assert.equal(state.selectionRefineMode, null);
    assert.equal(state.selectedMass, null);
    assert.equal(interactionEnabled, true);
    assert.equal(element("selectMass").attributes["aria-pressed"], "false");
});

test("Trainer half-step challenges respect range and comparison credit", async () => {
    const source = await readFile(new URL("../value-eye-trainer/app.js", import.meta.url), "utf8");
    const math = source.slice(source.indexOf("const clamp="), source.indexOf("function initializeQaScale"));
    const generation = source.slice(source.indexOf("function randomTenth"), source.indexOf("const COLOR_DIRECTIONS"));
    const trainer = new Function("els", `${math}\n${generation}\nreturn {makeComparison,comparisonCredit,rgbToLab};`)({ comparisonRange: { value: "1" } });
    for (let attempt = 0; attempt < 500; attempt += 1) {
        const challenge = trainer.makeComparison();
        for (const swatch of [challenge.first, challenge.second]) {
            assert.equal(Number.isInteger(swatch.value * 2), true);
            assert.ok(Math.abs(1 + 9 * trainer.rgbToLab(swatch.rgb) / 100 - swatch.value) < .1);
        }
        assert.ok(challenge.difference <= 1);
        assert.equal(trainer.comparisonCredit(challenge.relation, challenge.relation, challenge.difference), 10);
    }
    assert.equal(trainer.comparisonCredit("same", "lighter", .5), 5);
    assert.equal(trainer.comparisonCredit("same", "darker", .5), 5);
    assert.equal(trainer.comparisonCredit("same", "lighter", 1), 0);
    assert.equal(trainer.comparisonCredit("darker", "lighter", .5), 0);
    assert.equal(trainer.comparisonCredit("same", "same", 0), 10);
});

test("Guidance remembers dismissals and supports skip, help, and reset", async () => {
    const source = await readFile(new URL("../js/guidance.js", import.meta.url), "utf8");
    const nodes = new Map();
    const node = id => {
        if (!nodes.has(id)) nodes.set(id, {
            id, open: false, textContent: "", handlers: {},
            addEventListener(type, action) { this.handlers[type] = action; },
            replaceChildren(...items) { this.items = items; },
            showModal() { this.open = true; }, close() { this.open = false; },
            click() { this.onclick?.(); this.handlers.click?.(); }
        });
        return nodes.get(id);
    };
    const stored = new Map();
    const storage = { getItem: key => stored.get(key), setItem: (key, value) => stored.set(key, value) };
    const document = { getElementById: node, createElement: () => ({}), querySelector: () => node("mapTabButton") };
    const setup = new Function("document", "localStorage", source.replace("export default function", "function") + "\nreturn setupGuidance;")(document, storage);
    setup();
    assert.equal(node("guidanceDialog").open, true);
    node("guidanceContinue").click();
    setup();
    assert.equal(node("guidanceDialog").open, false);
    node("mapTabButton").click();
    assert.equal(node("guidanceTitle").textContent, "Create a Value Map");
    node("guidanceSkip").click();
    node("massingTabButton").click();
    assert.equal(node("guidanceDialog").open, false);
    node("openGuidance").click();
    assert.equal(node("guidanceDialog").open, true);
    node("guidanceReset").click();
    assert.equal(node("guidanceTitle").textContent, "Welcome to TonalValueDesigner");
    assert.equal(JSON.parse(stored.get("tvd-guidance-v1")).skip, false);
});

let failed = 0;
for (const { name, action } of tests) {
    try {
        await action();
        console.log(`PASS  ${name}`);
    } catch (error) {
        failed += 1;
        console.error(`FAIL  ${name}`);
        console.error(error.message);
    }
}
console.log(`\n${tests.length - failed}/${tests.length} tests passed.`);
if (failed) process.exitCode = 1;
