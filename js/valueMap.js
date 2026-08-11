"use strict";

import TonalValueDesignerColor from "./color.js?v=2.9.5";

const TonalValueDesignerValueMap = (() => {
    const linearChannels = new Float64Array(256);
    for (let channel = 0; channel < 256; channel += 1) {
        const normalized = channel / 255;
        linearChannels[channel] = normalized <= 0.04045
            ? normalized / 12.92
            : ((normalized + 0.055) / 1.055) ** 2.4;
    }

    function lightnessFromRgb(red, green, blue) {
        const relativeY =
            linearChannels[red] * 0.2126729 +
            linearChannels[green] * 0.7151522 +
            linearChannels[blue] * 0.0721750;
        const delta = 6 / 29;
        const transformed = relativeY > delta ** 3
            ? Math.cbrt(relativeY)
            : relativeY / (3 * delta ** 2) + 4 / 29;
        return 116 * transformed - 16;
    }

    function parseValues(text) {
        const values = String(text)
            .split(/[\s,;]+/)
            .filter(Boolean)
            .map(Number);

        if (values.length < 2) {
            throw new Error("Enter at least two Painter's Values.");
        }
        if (values.some(value => !Number.isFinite(value) || value < 1 || value > 10)) {
            throw new Error("Every Painter's Value must be between 1 and 10.");
        }

        const unique = [...new Set(values.map(value => Math.round(value * 10) / 10))]
            .sort((a, b) => a - b);
        if (unique.length < 2) {
            throw new Error("Enter at least two different Painter's Values.");
        }
        return unique;
    }

    function nearestValue(value, retainedValues) {
        let nearest = retainedValues[0];
        let distance = Math.abs(value - nearest);
        for (let index = 1; index < retainedValues.length; index += 1) {
            const candidateDistance = Math.abs(value - retainedValues[index]);
            if (candidateDistance < distance) {
                nearest = retainedValues[index];
                distance = candidateDistance;
            }
        }
        return nearest;
    }

    function grayForPainterValue(value) {
        const targetLightness = (value - 1) * 100 / 9;
        let low = 0;
        let high = 255;
        for (let count = 0; count < 10; count += 1) {
            const middle = Math.round((low + high) / 2);
            const lightness = TonalValueDesignerColor.rgbToLab(middle, middle, middle).l;
            if (lightness < targetLightness) low = middle + 1;
            else high = middle;
        }
        return Math.max(0, Math.min(255, Math.round((low + high) / 2)));
    }

    function generate(sourceImageData, retainedValues) {
        const output = new ImageData(
            new Uint8ClampedArray(sourceImageData.data.length),
            sourceImageData.width,
            sourceImageData.height
        );
        const grayByValue = new Map(
            retainedValues.map(value => [value, grayForPainterValue(value)])
        );

        for (let index = 0; index < sourceImageData.data.length; index += 4) {
            const red = sourceImageData.data[index];
            const green = sourceImageData.data[index + 1];
            const blue = sourceImageData.data[index + 2];
            const lightness = lightnessFromRgb(red, green, blue);
            const painterValue = TonalValueDesignerColor.labLightnessToPainterValue(lightness);
            const assignedValue = nearestValue(painterValue, retainedValues);
            const gray = grayByValue.get(assignedValue);
            output.data[index] = gray;
            output.data[index + 1] = gray;
            output.data[index + 2] = gray;
            output.data[index + 3] = sourceImageData.data[index + 3];
        }
        return output;
    }

    function makeLegend(retainedValues) {
        return retainedValues
            .slice()
            .reverse()
            .map(value => ({ value, gray: grayForPainterValue(value) }));
    }

    return Object.freeze({ parseValues, generate, makeLegend, grayForPainterValue });
})();

export default TonalValueDesignerValueMap;
