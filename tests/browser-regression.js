"use strict";

import TonalValueDesignerValueMap from "../js/valueMap.js?v=2.10.1";
import TonalValueDesignerBrowserPlatform from "../js/browserPlatform.js?v=2.10.1";
import TVD_REAL_IMAGE_BASELINE from "./real-image-baseline.js?v=2.10.1";

const output = document.getElementById("results");
const summary = document.getElementById("summary");
window.__TVD_REGRESSION__ = { done: false, passed: false, results: [] };

function hash(bytes) {
    let value = 0x811c9dc5;
    for (const byte of bytes) {
        value ^= byte;
        value = Math.imul(value, 0x01000193);
    }
    return (value >>> 0).toString(16).padStart(8, "0");
}

function histogram(imageData) {
    const counts = new Map();
    for (let index = 0; index < imageData.data.length; index += 4) {
        const gray = imageData.data[index];
        counts.set(gray, (counts.get(gray) || 0) + 1);
    }
    return [...counts.entries()].sort((a, b) => a[0] - b[0]);
}

async function loadFixtureFile(fileName) {
    const response = await fetch(`fixtures/${fileName}`);
    if (!response.ok) throw new Error(`Could not load fixtures/${fileName}`);
    const blob = await response.blob();
    const file = new File([blob], fileName, { type: blob.type });
    return TonalValueDesignerBrowserPlatform.loadImageFile(file);
}

async function analyzeFixture(fixture) {
    const image = await loadFixtureFile(fixture.file);
    const canvas = document.createElement("canvas");
    canvas.width = image.naturalWidth;
    canvas.height = image.naturalHeight;
    const context = canvas.getContext("2d", { willReadFrequently: true });
    context.drawImage(image, 0, 0);
    const source = context.getImageData(0, 0, canvas.width, canvas.height);
    const maps = TVD_REAL_IMAGE_BASELINE.valueSets.map(values => {
        const result = TonalValueDesignerValueMap.generate(source, values);
        const roundTripCanvas = TonalValueDesignerBrowserPlatform.canvasFromImageData(result);
        if (roundTripCanvas.width !== result.width || roundTripCanvas.height !== result.height) {
            throw new Error(`Platform canvas dimensions changed for ${fixture.file}`);
        }
        return { values: values.join(","), hash: hash(result.data), histogram: histogram(result) };
    });
    return {
        file: fixture.file,
        width: canvas.width,
        height: canvas.height,
        sourceHash: hash(source.data),
        maps
    };
}

function same(actual, expected) {
    return JSON.stringify(actual) === JSON.stringify(expected);
}

async function run() {
    const results = [];
    let failures = 0;
    for (const fixture of TVD_REAL_IMAGE_BASELINE.fixtures) {
        const actual = await analyzeFixture(fixture);
        const passed = fixture.expected !== null && same(actual, fixture.expected);
        if (!passed) failures += 1;
        results.push({ actual, expected: fixture.expected, passed });
        const row = document.createElement("tr");
        row.innerHTML = `<td>${fixture.file}</td><td>${actual.width} Ã— ${actual.height}</td><td>${passed ? "PASS" : fixture.expected ? "FAIL" : "BASELINE NEEDED"}</td><td><code>${actual.maps.map(map => map.hash).join(" / ")}</code></td>`;
        row.className = passed ? "pass" : "fail";
        output.append(row);
    }
    summary.textContent = failures === 0
        ? `${results.length}/${results.length} real-image regressions passed.`
        : `${failures} real-image regression${failures === 1 ? "" : "s"} require attention.`;
    window.__TVD_REGRESSION__ = { done: true, passed: failures === 0, results };
    document.getElementById("capture").textContent = JSON.stringify(results.map(result => result.actual), null, 2);
}

run().catch(error => {
    summary.textContent = `Regression runner failed: ${error.message}`;
    document.getElementById("capture").textContent = error.stack || error.message;
    window.__TVD_REGRESSION__ = { done: true, passed: false, error: error.message, results: [] };
});
