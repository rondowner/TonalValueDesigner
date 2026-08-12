"use strict";

/*
 * Experimental edge-aware simplification for painter-oriented "squinting".
 * The algorithm smooths within similar neighborhoods while resisting color
 * boundaries, then delegates final discrete-value assignment to valueMap.js.
 */
function createSquintEngine({ generateValueMap }) {
    if (typeof generateValueMap !== "function") {
        throw new Error("Squint requires a value-map generator.");
    }

    function simplify(sourceImageData, retainedValues, options = {}) {
        if (!sourceImageData?.data || !sourceImageData.width || !sourceImageData.height) {
            throw new Error("Squint requires valid source image data.");
        }
        const amount = Math.max(1, Math.min(5, Math.round(Number(options.amount) || 3)));
        const edgeProtection = Math.max(1, Math.min(5, Math.round(Number(options.edgeProtection) || 4)));
        const threshold = 132 - edgeProtection * 22;
        const { width, height } = sourceImageData;
        const guidance = sourceImageData.data;
        let current = new Uint8ClampedArray(guidance);

        for (let pass = 0; pass < amount; pass += 1) {
            const next = new Uint8ClampedArray(current.length);
            for (let y = 0; y < height; y += 1) {
                for (let x = 0; x < width; x += 1) {
                    const center = (y * width + x) * 4;
                    let red = current[center] * 2;
                    let green = current[center + 1] * 2;
                    let blue = current[center + 2] * 2;
                    let weight = 2;

                    for (let offsetY = -1; offsetY <= 1; offsetY += 1) {
                        const neighborY = y + offsetY;
                        if (neighborY < 0 || neighborY >= height) continue;
                        for (let offsetX = -1; offsetX <= 1; offsetX += 1) {
                            if (offsetX === 0 && offsetY === 0) continue;
                            const neighborX = x + offsetX;
                            if (neighborX < 0 || neighborX >= width) continue;
                            const neighbor = (neighborY * width + neighborX) * 4;
                            const difference = (
                                Math.abs(guidance[center] - guidance[neighbor]) +
                                Math.abs(guidance[center + 1] - guidance[neighbor + 1]) +
                                Math.abs(guidance[center + 2] - guidance[neighbor + 2])
                            ) / 3;
                            if (difference > threshold) continue;
                            red += current[neighbor];
                            green += current[neighbor + 1];
                            blue += current[neighbor + 2];
                            weight += 1;
                        }
                    }
                    next[center] = Math.round(red / weight);
                    next[center + 1] = Math.round(green / weight);
                    next[center + 2] = Math.round(blue / weight);
                    next[center + 3] = guidance[center + 3];
                }
            }
            current = next;
        }

        const softened = new ImageData(current, width, height);
        return generateValueMap(softened, retainedValues);
    }

    return Object.freeze({ contractVersion: 1, simplify });
}

export default createSquintEngine;
