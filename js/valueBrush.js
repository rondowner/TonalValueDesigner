"use strict";

import TonalValueDesignerMassing from "./massing.js?v=2.10.1";
import TonalValueDesignerValueMap from "./valueMap.js?v=2.10.1";

const TonalValueDesignerValueBrush = (() => {
    const SIZE_FRACTIONS = Object.freeze({
        1: 0.005,
        2: 0.012,
        3: 0.025,
        4: 0.05
    });

    function radiusForSize(width, height, size) {
        const fraction = SIZE_FRACTIONS[size] || SIZE_FRACTIONS[2];
        return Math.max(2, Math.round(Math.min(width, height) * fraction));
    }

    function paintStroke(imageData, points, painterValue, radius, clone) {
        if (!imageData || !Array.isArray(points) || !points.length) {
            throw new Error("Paint a stroke on the value map first.");
        }
        const output = clone ? TonalValueDesignerMassing.cloneImageData(imageData) : imageData;
        const gray = TonalValueDesignerValueMap.grayForPainterValue(painterValue);
        const brushRadius = Math.max(1, Math.round(radius));
        let changed = 0;

        function stamp(centerX, centerY) {
            const left = Math.max(0, Math.floor(centerX - brushRadius));
            const right = Math.min(output.width - 1, Math.ceil(centerX + brushRadius));
            const top = Math.max(0, Math.floor(centerY - brushRadius));
            const bottom = Math.min(output.height - 1, Math.ceil(centerY + brushRadius));
            const radiusSquared = brushRadius * brushRadius;
            for (let y = top; y <= bottom; y += 1) {
                for (let x = left; x <= right; x += 1) {
                    const dx = x + 0.5 - centerX;
                    const dy = y + 0.5 - centerY;
                    if (dx * dx + dy * dy > radiusSquared) continue;
                    const offset = (y * output.width + x) * 4;
                    if (output.data[offset] !== gray || output.data[offset + 1] !== gray || output.data[offset + 2] !== gray) {
                        output.data[offset] = output.data[offset + 1] = output.data[offset + 2] = gray;
                        changed += 1;
                    }
                }
            }
        }

        stamp(points[0].x, points[0].y);
        for (let index = 1; index < points.length; index += 1) {
            const first = points[index - 1];
            const second = points[index];
            const distance = Math.hypot(second.x - first.x, second.y - first.y);
            const steps = Math.max(1, Math.ceil(distance / Math.max(1, brushRadius * 0.45)));
            for (let step = 1; step <= steps; step += 1) {
                const amount = step / steps;
                stamp(first.x + (second.x - first.x) * amount, first.y + (second.y - first.y) * amount);
            }
        }
        return { imageData: output, changed };
    }

    function applyStroke(imageData, points, painterValue, radius) {
        return paintStroke(imageData, points, painterValue, radius, true);
    }

    function applyStrokeInPlace(imageData, points, painterValue, radius) {
        return paintStroke(imageData, points, painterValue, radius, false);
    }

    return Object.freeze({ radiusForSize, applyStroke, applyStrokeInPlace });
})();

export default TonalValueDesignerValueBrush;
