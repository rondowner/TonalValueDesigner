"use strict";

import TonalValueDesignerValueMap from "./valueMap.js?v=2.9.1";

const TonalValueDesignerMassing = (() => {
    function cloneImageData(imageData) {
        return new ImageData(
            new Uint8ClampedArray(imageData.data),
            imageData.width,
            imageData.height
        );
    }

    function applyPolygon(imageData, points, painterValue) {
        if (!imageData || !Array.isArray(points) || points.length < 3) {
            throw new Error("Draw a closed area before applying a value.");
        }
        const output = cloneImageData(imageData);
        const gray = TonalValueDesignerValueMap.grayForPainterValue(painterValue);
        let lowestY = points[0].y;
        let highestY = points[0].y;
        for (let index = 1; index < points.length; index += 1) {
            lowestY = Math.min(lowestY, points[index].y);
            highestY = Math.max(highestY, points[index].y);
        }
        const minimumY = Math.max(0, Math.floor(lowestY));
        const maximumY = Math.min(imageData.height - 1, Math.ceil(highestY));
        let changed = 0;

        for (let y = minimumY; y <= maximumY; y += 1) {
            const scanY = y + 0.5;
            const intersections = [];
            for (let index = 0; index < points.length; index += 1) {
                const first = points[index];
                const second = points[(index + 1) % points.length];
                if ((first.y <= scanY && second.y > scanY) ||
                    (second.y <= scanY && first.y > scanY)) {
                    intersections.push(
                        first.x + (scanY - first.y) * (second.x - first.x) / (second.y - first.y)
                    );
                }
            }
            intersections.sort((a, b) => a - b);
            for (let pair = 0; pair + 1 < intersections.length; pair += 2) {
                const startX = Math.max(0, Math.ceil(intersections[pair]));
                const endX = Math.min(imageData.width - 1, Math.floor(intersections[pair + 1]));
                for (let x = startX; x <= endX; x += 1) {
                    const offset = (y * imageData.width + x) * 4;
                    if (output.data[offset] !== gray || output.data[offset + 1] !== gray || output.data[offset + 2] !== gray) {
                        output.data[offset] = gray;
                        output.data[offset + 1] = gray;
                        output.data[offset + 2] = gray;
                        changed += 1;
                    }
                }
            }
        }
        return { imageData: output, changed };
    }

    return Object.freeze({ cloneImageData, applyPolygon });
})();

export default TonalValueDesignerMassing;
