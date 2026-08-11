"use strict";

import TonalValueDesignerMassing from "./massing.js?v=2.9.5";
import TonalValueDesignerValueMap from "./valueMap.js?v=2.9.5";

const TonalValueDesignerMassSelection = (() => {
    function identify(imageData, startX, startY) {
        if (!imageData) throw new Error("Generate a value map first.");
        const width = imageData.width;
        const height = imageData.height;
        const x = Math.floor(startX);
        const y = Math.floor(startY);
        if (x < 0 || y < 0 || x >= width || y >= height) throw new Error("Select a point inside the value map.");

        const data = imageData.data;
        const seed = y * width + x;
        const seedOffset = seed * 4;
        const target = [data[seedOffset], data[seedOffset + 1], data[seedOffset + 2], data[seedOffset + 3]];
        const visited = new Uint8Array(width * height);
        const stack = [seed];
        const spans = [];
        let size = 0;

        function matches(index) {
            const offset = index * 4;
            return !visited[index] && data[offset] === target[0] && data[offset + 1] === target[1] &&
                data[offset + 2] === target[2] && data[offset + 3] === target[3];
        }

        while (stack.length) {
            const index = stack.pop();
            if (!matches(index)) continue;
            const row = Math.floor(index / width);
            const column = index - row * width;
            let start = column;
            let end = column;
            while (start > 0 && matches(row * width + start - 1)) start -= 1;
            while (end + 1 < width && matches(row * width + end + 1)) end += 1;

            for (let currentX = start; currentX <= end; currentX += 1) {
                visited[row * width + currentX] = 1;
                size += 1;
            }
            spans.push({ y: row, startX: start, endX: end });

            for (const neighboringRow of [row - 1, row + 1]) {
                if (neighboringRow < 0 || neighboringRow >= height) continue;
                let currentX = start;
                while (currentX <= end) {
                    const neighbor = neighboringRow * width + currentX;
                    if (matches(neighbor)) {
                        stack.push(neighbor);
                        currentX += 1;
                        while (currentX <= end && matches(neighboringRow * width + currentX)) currentX += 1;
                    } else currentX += 1;
                }
            }
        }

        return { spans, size, sourceGray: target[0], width, height };
    }

    function apply(imageData, spans, painterValue) {
        if (!imageData || !Array.isArray(spans) || !spans.length) throw new Error("Select a value mass before applying a value.");
        const output = TonalValueDesignerMassing.cloneImageData(imageData);
        const gray = TonalValueDesignerValueMap.grayForPainterValue(painterValue);
        let changed = 0;
        for (const span of spans) {
            for (let x = span.startX; x <= span.endX; x += 1) {
                const offset = (span.y * output.width + x) * 4;
                if (output.data[offset] !== gray || output.data[offset + 1] !== gray || output.data[offset + 2] !== gray) {
                    output.data[offset] = output.data[offset + 1] = output.data[offset + 2] = gray;
                    changed += 1;
                }
            }
        }
        return { imageData: output, changed };
    }

    function createHighlight(selection) {
        const overlay = new ImageData(selection.width, selection.height);
        const selected = new Uint8Array(selection.width * selection.height);
        for (const span of selection.spans) {
            selected.fill(1, span.y * selection.width + span.startX, span.y * selection.width + span.endX + 1);
        }
        for (const span of selection.spans) {
            for (let x = span.startX; x <= span.endX; x += 1) {
                const index = span.y * selection.width + x;
                const offset = index * 4;
                overlay.data[offset] = 0;
                overlay.data[offset + 1] = 170;
                overlay.data[offset + 2] = 255;
                overlay.data[offset + 3] = 55;
                const boundary = x === 0 || x + 1 === selection.width || span.y === 0 || span.y + 1 === selection.height ||
                    !selected[index - 1] || !selected[index + 1] || !selected[index - selection.width] || !selected[index + selection.width];
                if (boundary) {
                    overlay.data[offset + 3] = 255;
                }
            }
        }
        return overlay;
    }

    function refine(selection, points, mode) {
        if (!selection || !Array.isArray(selection.spans)) throw new Error("Select a value mass first.");
        if (!Array.isArray(points) || points.length < 3) throw new Error("Draw a closed area to refine the selection.");
        if (mode !== "add" && mode !== "remove") throw new Error("Choose Add Area or Remove Area.");

        const selected = new Uint8Array(selection.width * selection.height);
        for (const span of selection.spans) {
            selected.fill(1, span.y * selection.width + span.startX, span.y * selection.width + span.endX + 1);
        }

        let lowestY = points[0].y;
        let highestY = points[0].y;
        for (let index = 1; index < points.length; index += 1) {
            lowestY = Math.min(lowestY, points[index].y);
            highestY = Math.max(highestY, points[index].y);
        }
        const minimumY = Math.max(0, Math.floor(lowestY));
        const maximumY = Math.min(selection.height - 1, Math.ceil(highestY));
        const replacement = mode === "add" ? 1 : 0;
        let changed = 0;

        for (let y = minimumY; y <= maximumY; y += 1) {
            const scanY = y + 0.5;
            const intersections = [];
            for (let index = 0; index < points.length; index += 1) {
                const first = points[index];
                const second = points[(index + 1) % points.length];
                if ((first.y <= scanY && second.y > scanY) || (second.y <= scanY && first.y > scanY)) {
                    intersections.push(first.x + (scanY - first.y) * (second.x - first.x) / (second.y - first.y));
                }
            }
            intersections.sort((a, b) => a - b);
            for (let pair = 0; pair + 1 < intersections.length; pair += 2) {
                const startX = Math.max(0, Math.ceil(intersections[pair]));
                const endX = Math.min(selection.width - 1, Math.floor(intersections[pair + 1]));
                for (let x = startX; x <= endX; x += 1) {
                    const index = y * selection.width + x;
                    if (selected[index] !== replacement) {
                        selected[index] = replacement;
                        changed += 1;
                    }
                }
            }
        }

        const spans = [];
        let size = 0;
        for (let y = 0; y < selection.height; y += 1) {
            let x = 0;
            while (x < selection.width) {
                while (x < selection.width && !selected[y * selection.width + x]) x += 1;
                if (x >= selection.width) break;
                const startX = x;
                while (x + 1 < selection.width && selected[y * selection.width + x + 1]) x += 1;
                spans.push({ y, startX, endX: x });
                size += x - startX + 1;
                x += 1;
            }
        }

        return { selection: { ...selection, spans, size }, changed };
    }

    return Object.freeze({ identify, apply, createHighlight, refine });
})();

export default TonalValueDesignerMassSelection;
