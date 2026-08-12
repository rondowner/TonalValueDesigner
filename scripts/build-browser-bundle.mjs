import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const sourceDirectory = path.join(projectRoot, "js");
const outputFile = path.join(sourceDirectory, "app.bundle.js");
const sourceFiles = [
    "version.js", "color.js", "valueMap.js", "massing.js",
    "massSelection.js", "valueBrush.js", "measurement.js", "squint.js", "coreEngine.js", "browserPlatform.js",
    "editHistory.js", "documentState.js", "interactionState.js", "canvasRenderer.js", "viewport.js", "featureSegmentation.js", "app.js"
];

function convertModule(source) {
    return source
        .replace(/^import\s+[^;]+;\s*$/gm, "")
        .replace(/^export default function\s+/gm, "function ")
        .replace(/^export default\s+[^;]+;\s*$/gm, "")
        .trim();
}

const banner = `"use strict";

/* Generated from the ES modules in js/. Do not edit directly. */`;
const sections = sourceFiles.map(fileName => {
    const source = fs.readFileSync(path.join(sourceDirectory, fileName), "utf8");
    return `\n\n/* ===== ${fileName} ===== */\n${convertModule(source)}`;
});

fs.writeFileSync(outputFile, `${banner}${sections.join("")}\n`, "utf8");
console.log(`Built ${path.relative(projectRoot, outputFile)}`);
