"use strict";

import TonalValueDesignerColor from "./color.js?v=2.10.1";

function validateImageData(imageData) {
    if (!imageData || !Number.isInteger(imageData.width) || !Number.isInteger(imageData.height) || !imageData.data) {
        throw new TypeError("Value measurement requires valid image data.");
    }
}

function averagePixels(imageData, centerX, centerY, requestedSize) {
    validateImageData(imageData);
    const x = Math.max(0, Math.min(imageData.width - 1, Math.floor(Number(centerX))));
    const y = Math.max(0, Math.min(imageData.height - 1, Math.floor(Number(centerY))));
    const size = Math.max(1, Math.floor(Number(requestedSize) || 1));
    const half = Math.floor(size / 2);
    const left = Math.max(0, x - half);
    const top = Math.max(0, y - half);
    const right = Math.min(imageData.width - 1, x + half);
    const bottom = Math.min(imageData.height - 1, y + half);
    const width = right - left + 1;
    const height = bottom - top + 1;

    let red = 0;
    let green = 0;
    let blue = 0;
    let alpha = 0;
    for (let row = top; row <= bottom; row += 1) {
        for (let column = left; column <= right; column += 1) {
            const index = (row * imageData.width + column) * 4;
            const weight = imageData.data[index + 3] / 255;
            red += imageData.data[index] * weight;
            green += imageData.data[index + 1] * weight;
            blue += imageData.data[index + 2] * weight;
            alpha += weight;
        }
    }

    return {
        red: alpha ? Math.round(red / alpha) : 0,
        green: alpha ? Math.round(green / alpha) : 0,
        blue: alpha ? Math.round(blue / alpha) : 0,
        width,
        height
    };
}

function measureValue(imageData, centerX, centerY, requestedSize) {
    const color = averagePixels(imageData, centerX, centerY, requestedSize);
    const lab = TonalValueDesignerColor.rgbToLab(color.red, color.green, color.blue);
    return {
        ...color,
        lab,
        value: TonalValueDesignerColor.labLightnessToRoundedPainterValue(lab.l)
    };
}

const TonalValueDesignerMeasurement = Object.freeze({ averagePixels, measureValue });

export default TonalValueDesignerMeasurement;
