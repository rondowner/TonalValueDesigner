"use strict";

/* Generated from the ES modules in js/. Do not edit directly. */

/* ===== version.js ===== */
"use strict";
const TonalValueDesignerVersion=Object.freeze({version:"2.9.6",buildDate:"2026-08-11"});

/* ===== color.js ===== */
"use strict";



/*

    ============================================================

    TonalValueDesigner prototype

    color.js



    This file contains color-conversion and value-estimation

    functions.



    It converts:



        sRGB, using 0–255 channel values

            ↓

        Linear RGB

            ↓

        CIE XYZ, using a D65 white point

            ↓

        CIELAB L*, a*, b*



    It also converts CIELAB L* into an approximate 1–10

    painter's value.



    No third-party libraries are required.

    ============================================================

*/





/*

    Place the public functions inside a single global object.



    app.js will be able to call functions such as:



        TonalValueDesignerColor.rgbToLab(120, 95, 70)

        TonalValueDesignerColor.labLightnessToPainterValue(48.5)



    This avoids scattering many separate function names across

    the browser's global namespace.

*/



const TonalValueDesignerColor = (() => {



    /*

        --------------------------------------------------------

        General utilities

        --------------------------------------------------------

    */





    /**

     * Restrict a number to a minimum and maximum.

     *

     * @param {number} number

     * @param {number} minimum

     * @param {number} maximum

     * @returns {number}

     */

    function clamp(number, minimum, maximum) {

        return Math.min(Math.max(number, minimum), maximum);

    }





    /**

     * Round a number to a specified number of decimal places.

     *

     * @param {number} number

     * @param {number} decimalPlaces

     * @returns {number}

     */

    function roundTo(number, decimalPlaces = 1) {

        const factor = 10 ** decimalPlaces;

        return Math.round((number + Number.EPSILON) * factor) / factor;

    }





    /**

     * Ensure an RGB channel is an integer from 0 through 255.

     *

     * @param {number} channel

     * @returns {number}

     */

    function normalizeRgbChannel(channel) {

        const numericChannel = Number(channel);



        if (!Number.isFinite(numericChannel)) {

            throw new TypeError(

                `RGB channel must be a finite number. Received: ${channel}`

            );

        }



        return Math.round(clamp(numericChannel, 0, 255));

    }





    /*

        --------------------------------------------------------

        sRGB to linear RGB

        --------------------------------------------------------



        Normal sRGB values are gamma-encoded. They cannot be

        converted correctly to XYZ merely by multiplying the

        original 0–255 values by a matrix.



        We first normalize each channel to 0–1, then remove the

        sRGB transfer curve.

    */





    /**

     * Convert one sRGB channel from 0–255 into linear RGB 0–1.

     *

     * @param {number} channel

     * @returns {number}

     */

    function srgbChannelToLinear(channel) {

        const normalizedChannel = normalizeRgbChannel(channel) / 255;



        if (normalizedChannel <= 0.04045) {

            return normalizedChannel / 12.92;

        }



        return (

            (normalizedChannel + 0.055) / 1.055

        ) ** 2.4;

    }





    /**

     * Convert sRGB channels to linear RGB channels.

     *

     * @param {number} red

     * @param {number} green

     * @param {number} blue

     * @returns {{r: number, g: number, b: number}}

     */

    function rgbToLinearRgb(red, green, blue) {

        return {

            r: srgbChannelToLinear(red),

            g: srgbChannelToLinear(green),

            b: srgbChannelToLinear(blue)

        };

    }





    /*

        --------------------------------------------------------

        Linear RGB to CIE XYZ

        --------------------------------------------------------



        The following matrix is for standard sRGB under the

        D65 reference white.



        XYZ values are returned on the conventional 0–100 scale.

    */





    /**

     * Convert sRGB to CIE XYZ using the D65 white point.

     *

     * @param {number} red

     * @param {number} green

     * @param {number} blue

     * @returns {{x: number, y: number, z: number}}

     */

    function rgbToXyz(red, green, blue) {

        const linear = rgbToLinearRgb(red, green, blue);



        const x = (

            linear.r * 0.4124564 +

            linear.g * 0.3575761 +

            linear.b * 0.1804375

        ) * 100;



        const y = (

            linear.r * 0.2126729 +

            linear.g * 0.7151522 +

            linear.b * 0.0721750

        ) * 100;



        const z = (

            linear.r * 0.0193339 +

            linear.g * 0.1191920 +

            linear.b * 0.9503041

        ) * 100;



        return { x, y, z };

    }





    /*

        --------------------------------------------------------

        CIE XYZ to CIELAB

        --------------------------------------------------------



        D65 reference white:



            Xn = 95.047

            Yn = 100.000

            Zn = 108.883



        CIELAB L* is intended to approximate perceived

        lightness:



            L* = 0     black

            L* = 100   reference white



        a* describes roughly green ↔ red.



        b* describes roughly blue ↔ yellow.

    */





    const D65_REFERENCE_WHITE = Object.freeze({

        x: 95.047,

        y: 100.000,

        z: 108.883

    });





    /*

        Constants from the CIELAB definition.



        delta = 6 / 29

    */



    const LAB_DELTA = 6 / 29;

    const LAB_DELTA_CUBED = LAB_DELTA ** 3;

    const LAB_LINEAR_SCALE = 1 / (3 * LAB_DELTA ** 2);





    /**

     * CIELAB helper function, often written as f(t).

     *

     * @param {number} value

     * @returns {number}

     */

    function labTransform(value) {

        if (value > LAB_DELTA_CUBED) {

            return Math.cbrt(value);

        }



        return (

            value * LAB_LINEAR_SCALE +

            4 / 29

        );

    }





    /**

     * Convert CIE XYZ into CIELAB.

     *

     * @param {number} x

     * @param {number} y

     * @param {number} z

     * @returns {{l: number, a: number, b: number}}

     */

    function xyzToLab(x, y, z) {

        const normalizedX = x / D65_REFERENCE_WHITE.x;

        const normalizedY = y / D65_REFERENCE_WHITE.y;

        const normalizedZ = z / D65_REFERENCE_WHITE.z;



        const transformedX = labTransform(normalizedX);

        const transformedY = labTransform(normalizedY);

        const transformedZ = labTransform(normalizedZ);



        const l = 116 * transformedY - 16;

        const a = 500 * (transformedX - transformedY);

        const b = 200 * (transformedY - transformedZ);



        return { l, a, b };

    }





    /**

     * Convert sRGB directly into CIELAB.

     *

     * @param {number} red

     * @param {number} green

     * @param {number} blue

     * @returns {{l: number, a: number, b: number}}

     */

    function rgbToLab(red, green, blue) {

        const xyz = rgbToXyz(red, green, blue);

        return xyzToLab(xyz.x, xyz.y, xyz.z);

    }





    /*

        --------------------------------------------------------

        Painter's value estimate

        --------------------------------------------------------



        This is deliberately labeled an estimate rather than a

        certified Munsell value.



        A simple and understandable prototype mapping is:



            L* 0     → painter's value 1

            L* 100   → painter's value 10



        That gives:



            value = 1 + 9 × (L* / 100)



        Examples:



            L* 0     → 1.0

            L* 25    → 3.3

            L* 50    → 5.5

            L* 75    → 7.8

            L* 100   → 10.0



        This avoids treating black as Value 0, because the user

        requested a 1–10 scale.



        A future calibrated version can replace this function

        with a lookup table derived from a photographed value

        scale.

    */





    /**

     * Convert CIELAB L* into a continuous painter's value

     * from 1.0 through 10.0.

     *

     * @param {number} lightness

     * @returns {number}

     */

    function labLightnessToPainterValue(lightness) {

        const numericLightness = Number(lightness);



        if (!Number.isFinite(numericLightness)) {

            throw new TypeError(

                `CIELAB L* must be a finite number. Received: ${lightness}`

            );

        }



        const clampedLightness = clamp(numericLightness, 0, 100);



        return 1 + 9 * (clampedLightness / 100);

    }





    /**

     * Convert CIELAB L* into a painter's value rounded to one

     * decimal place.

     *

     * @param {number} lightness

     * @returns {number}

     */

    function labLightnessToRoundedPainterValue(lightness) {

        return roundTo(

            labLightnessToPainterValue(lightness),

            1

        );

    }





    /**

     * Convert CIELAB L* into the nearest whole value step.

     *

     * @param {number} lightness

     * @returns {number}

     */

    function labLightnessToValueStep(lightness) {

        return Math.round(

            labLightnessToPainterValue(lightness)

        );

    }





    /*

        --------------------------------------------------------

        RGB display helpers

        --------------------------------------------------------

    */





    /**

     * Convert an RGB color to a six-character hexadecimal

     * string such as "#CA2121".

     *

     * @param {number} red

     * @param {number} green

     * @param {number} blue

     * @returns {string}

     */

    function rgbToHex(red, green, blue) {

        const channels = [red, green, blue].map(channel =>

            normalizeRgbChannel(channel)

                .toString(16)

                .padStart(2, "0")

        );



        return `#${channels.join("").toUpperCase()}`;

    }





    /**

     * Return a valid CSS rgb() color string.

     *

     * @param {number} red

     * @param {number} green

     * @param {number} blue

     * @returns {string}

     */

    function rgbToCss(red, green, blue) {

        const r = normalizeRgbChannel(red);

        const g = normalizeRgbChannel(green);

        const b = normalizeRgbChannel(blue);



        return `rgb(${r}, ${g}, ${b})`;

    }





    /*

        --------------------------------------------------------

        Optional diagnostic function

        --------------------------------------------------------



        This function runs a few basic sanity checks. It is not

        required by the app, but it can help verify that color.js

        loaded and that the conversion behaves sensibly.



        To use it, open the browser's developer console and type:



            TonalValueDesignerColor.runSelfTest()

    */





    /**

     * Run basic conversion tests and print them to the console.

     *

     * @returns {boolean}

     */

    function runSelfTest() {

        const testColors = [

            {

                name: "Black",

                rgb: [0, 0, 0],

                expectedLightness: 0

            },

            {

                name: "White",

                rgb: [255, 255, 255],

                expectedLightness: 100

            },

            {

                name: "Middle gray",

                rgb: [128, 128, 128],

                expectedLightness: 53.6

            },

            {

                name: "Red",

                rgb: [255, 0, 0],

                expectedLightness: 53.2

            }

        ];



        let passed = true;



        console.group("TonalValueDesigner color conversion self-test");



        for (const testColor of testColors) {

            const [red, green, blue] = testColor.rgb;

            const lab = rgbToLab(red, green, blue);

            const difference = Math.abs(

                lab.l - testColor.expectedLightness

            );



            const testPassed = difference < 0.2;



            if (!testPassed) {

                passed = false;

            }



            console.log(

                `${testColor.name}:`,

                {

                    rgb: testColor.rgb,

                    calculatedL: roundTo(lab.l, 2),

                    expectedL: testColor.expectedLightness,

                    passed: testPassed

                }

            );

        }



        console.log(

            passed

                ? "All TonalValueDesigner color tests passed."

                : "One or more TonalValueDesigner color tests failed."

        );



        console.groupEnd();



        return passed;

    }





    /*

        Expose only the functions that app.js or a user might

        reasonably need.

    */



    return Object.freeze({

        clamp,

        roundTo,

        rgbToLinearRgb,

        rgbToXyz,

        xyzToLab,

        rgbToLab,

        labLightnessToPainterValue,

        labLightnessToRoundedPainterValue,

        labLightnessToValueStep,

        rgbToHex,

        rgbToCss,

        runSelfTest

    });



})();

/* ===== valueMap.js ===== */
"use strict";


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

/* ===== massing.js ===== */
"use strict";


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

/* ===== massSelection.js ===== */
"use strict";



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

/* ===== valueBrush.js ===== */
"use strict";



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

/* ===== measurement.js ===== */
"use strict";


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

/* ===== coreEngine.js ===== */
"use strict";







/*
 * Stable boundary between the application controller and TonalValueDesigner's
 * image-processing algorithms. A future JavaScript, WebAssembly, or Tauri
 * implementation can satisfy this same contract without changing app.js.
 */
const CoreEngine = Object.freeze({
    contractVersion: 2,

    averagePixels: TonalValueDesignerMeasurement.averagePixels,
    measureValue: TonalValueDesignerMeasurement.measureValue,

    clamp: TonalValueDesignerColor.clamp,
    roundTo: TonalValueDesignerColor.roundTo,
    rgbToLab: TonalValueDesignerColor.rgbToLab,
    rgbToHex: TonalValueDesignerColor.rgbToHex,
    rgbToCss: TonalValueDesignerColor.rgbToCss,
    labLightnessToRoundedPainterValue: TonalValueDesignerColor.labLightnessToRoundedPainterValue,

    parseValues: TonalValueDesignerValueMap.parseValues,
    generateValueMap: TonalValueDesignerValueMap.generate,
    grayForPainterValue: TonalValueDesignerValueMap.grayForPainterValue,
    makeValueLegend: TonalValueDesignerValueMap.makeLegend,

    cloneImageData: TonalValueDesignerMassing.cloneImageData,
    applyPolygon: TonalValueDesignerMassing.applyPolygon,

    identifyMass: TonalValueDesignerMassSelection.identify,
    refineMassSelection: TonalValueDesignerMassSelection.refine,
    createMassHighlight: TonalValueDesignerMassSelection.createHighlight,
    applyMassValue: TonalValueDesignerMassSelection.apply,

    brushRadiusForSize: TonalValueDesignerValueBrush.radiusForSize,
    applyBrushStroke: TonalValueDesignerValueBrush.applyStroke,
    applyBrushStrokeInPlace: TonalValueDesignerValueBrush.applyStrokeInPlace
});

/* ===== browserPlatform.js ===== */
"use strict";

/* Browser-host services. A PWA or Tauri host can replace this contract. */
const BrowserPlatform = Object.freeze({
    contractVersion: 1,

    isPhone() {
        const shortestScreenSide = Math.min(
            Number(window.screen?.width) || window.innerWidth,
            Number(window.screen?.height) || window.innerHeight
        );
        return navigator.userAgentData?.mobile === true ||
            /iPhone|iPod|Android.*Mobile|Windows Phone/i.test(navigator.userAgent) ||
            (navigator.maxTouchPoints > 0 && shortestScreenSide <= 500);
    },

    loadImageFile(file) {
        return new Promise((resolve, reject) => {
            const url = URL.createObjectURL(file);
            const image = new Image();
            const releaseUrl = () => URL.revokeObjectURL(url);
            image.onload = () => { releaseUrl(); resolve(image); };
            image.onerror = () => {
                releaseUrl();
                reject(new Error("TonalValueDesigner could not open that image."));
            };
            image.src = url;
        });
    },

    canvasFromImageData(imageData) {
        const result = document.createElement("canvas");
        result.width = imageData.width;
        result.height = imageData.height;
        const context = result.getContext("2d");
        if (!context) throw new Error("The browser could not create an image canvas.");
        context.putImageData(imageData, 0, 0);
        return result;
    },

    savePng(imageData, fileName) {
        return new Promise((resolve, reject) => {
            const exportCanvas = this.canvasFromImageData(imageData);
            exportCanvas.toBlob(blob => {
                if (!blob) {
                    reject(new Error("The browser could not create the PNG."));
                    return;
                }
                const link = document.createElement("a");
                link.download = fileName;
                link.href = URL.createObjectURL(blob);
                link.click();
                setTimeout(() => URL.revokeObjectURL(link.href), 1000);
                resolve(fileName);
            }, "image/png");
        });
    }
});

/* ===== editHistory.js ===== */
"use strict";

function createEditHistory({ limit = 10, applyOperation }) {
    if (!Number.isInteger(limit) || limit < 1) throw new Error("Undo limit must be a positive integer.");
    if (typeof applyOperation !== "function") throw new Error("Edit history requires an operation function.");

    let baseImageData = null;
    let operations = [];

    function rebuild() {
        if (!baseImageData) return null;
        let rebuilt = baseImageData;
        for (const operation of operations) {
            rebuilt = applyOperation(rebuilt, operation).imageData;
        }
        return rebuilt;
    }

    return Object.freeze({
        contractVersion: 1,

        clear() {
            baseImageData = null;
            operations = [];
        },

        reset(imageData) {
            baseImageData = imageData;
            operations = [];
        },

        record(operation) {
            if (!baseImageData) throw new Error("Edit history has not been initialized.");
            operations.push(operation);
            if (operations.length > limit) {
                const committedOperation = operations.shift();
                baseImageData = applyOperation(baseImageData, committedOperation).imageData;
            }
            return operations.length;
        },

        undo() {
            if (!baseImageData || operations.length === 0) {
                return { undone: false, imageData: rebuild(), remaining: 0 };
            }
            operations.pop();
            return { undone: true, imageData: rebuild(), remaining: operations.length };
        },

        rebuild,

        get size() { return operations.length; },
        get canUndo() { return Boolean(baseImageData) && operations.length > 0; }
    });
}

/* ===== documentState.js ===== */
"use strict";

function createDocumentState() {
    const state = {
        selectedPoint: null,
        measurement: null,
        lastViewportScale: 1,
        originalData: null,
        mapData: null,
        retainedValues: [],
        showingMap: false,
        sourceName: "value-map"
    };

    return Object.seal(state);
}

/* ===== interactionState.js ===== */
"use strict";

function createInteractionState() {
    const state = {
        drawingMode: false,
        drawingPointer: null,
        straightSegmentAnchorIndex: null,
        lassoPoints: [],
        lassoComplete: false,
        massSelectionMode: false,
        selectedMass: null,
        selectionHighlightData: null,
        selectionRefineMode: null,
        paintMode: false,
        paintPaused: false,
        brushPointer: null,
        brushPoints: [],
        brushStrokeChanged: 0,
        brushCursorPoint: null,
        paintGestureBlocked: false,
        explicitPanMode: false,
        detectedFeatures: [],
        featureSelectionActive: false,
        paintPointers: new Set()
    };

    return Object.seal(state);
}

/* ===== canvasRenderer.js ===== */
"use strict";

function clamp(number, minimum, maximum) {
    return Math.min(Math.max(number, minimum), maximum);
}

function createCanvasRenderer({ canvas, context, getScale, createLayerCanvas }) {
    if (!canvas || !context || typeof getScale !== "function" || typeof createLayerCanvas !== "function") {
        throw new TypeError("Canvas renderer requires a canvas, drawing context, scale provider, and layer-canvas factory.");
    }

    let cachedSelectionData = null;
    let cachedSelectionCanvas = null;

    function scale() {
        return Math.max(Number(getScale()) || 1, 0.01);
    }

    function drawSourceImage(image) {
        context.drawImage(image, 0, 0);
    }

    function drawLasso(points, complete) {
        if (!points || points.length < 2) return;
        const currentScale = scale();
        context.save();
        context.beginPath();
        context.moveTo(points[0].x, points[0].y);
        for (let index = 1; index < points.length; index += 1) {
            context.lineTo(points[index].x, points[index].y);
        }
        if (complete) context.closePath();
        context.lineWidth = Math.max(1, 2 / currentScale);
        context.setLineDash([6 / currentScale, 4 / currentScale]);
        context.strokeStyle = "#ff3b30";
        context.stroke();
        context.setLineDash([]);
        context.lineWidth = Math.max(1, 1 / currentScale);
        context.strokeStyle = "white";
        context.stroke();
        context.restore();
    }

    function drawCrosshair(x, y) {
        const shortestSide = Math.min(canvas.width, canvas.height);
        const radius = clamp(shortestSide * 0.018, 8, 30);
        const width = clamp(shortestSide * 0.002, 2, 5);
        context.save();
        [["rgba(0,0,0,.9)", width + 2], ["rgba(255,255,255,.95)", width]].forEach(([stroke, lineWidth]) => {
            context.strokeStyle = stroke;
            context.lineWidth = lineWidth;
            context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.moveTo(x - radius * 1.45, y);
            context.lineTo(x - radius * 0.35, y);
            context.moveTo(x + radius * 0.35, y);
            context.lineTo(x + radius * 1.45, y);
            context.moveTo(x, y - radius * 1.45);
            context.lineTo(x, y - radius * 0.35);
            context.moveTo(x, y + radius * 0.35);
            context.lineTo(x, y + radius * 1.45);
            context.stroke();
        });
        context.restore();
    }

    function drawValueBadge(x, y, value) {
        const currentScale = scale();
        const text = `Value ${Number(value).toFixed(1)}`;
        const fontSize = 16 / currentScale;
        const horizontalPadding = 9 / currentScale;
        const badgeHeight = 32 / currentScale;
        const gap = 14 / currentScale;
        const radius = 6 / currentScale;

        context.save();
        context.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        context.textAlign = "left";
        context.textBaseline = "middle";
        const badgeWidth = context.measureText(text).width + horizontalPadding * 2;
        let badgeX = x + gap;
        let badgeY = y - gap - badgeHeight;
        if (badgeX + badgeWidth > canvas.width) badgeX = x - gap - badgeWidth;
        if (badgeY < 0) badgeY = y + gap;
        badgeX = clamp(badgeX, 0, Math.max(0, canvas.width - badgeWidth));
        badgeY = clamp(badgeY, 0, Math.max(0, canvas.height - badgeHeight));

        context.beginPath();
        context.moveTo(badgeX + radius, badgeY);
        context.lineTo(badgeX + badgeWidth - radius, badgeY);
        context.quadraticCurveTo(badgeX + badgeWidth, badgeY, badgeX + badgeWidth, badgeY + radius);
        context.lineTo(badgeX + badgeWidth, badgeY + badgeHeight - radius);
        context.quadraticCurveTo(badgeX + badgeWidth, badgeY + badgeHeight, badgeX + badgeWidth - radius, badgeY + badgeHeight);
        context.lineTo(badgeX + radius, badgeY + badgeHeight);
        context.quadraticCurveTo(badgeX, badgeY + badgeHeight, badgeX, badgeY + badgeHeight - radius);
        context.lineTo(badgeX, badgeY + radius);
        context.quadraticCurveTo(badgeX, badgeY, badgeX + radius, badgeY);
        context.closePath();
        context.fillStyle = "rgba(24, 28, 34, 0.94)";
        context.fill();
        context.strokeStyle = "rgba(255, 255,255, 0.95)";
        context.lineWidth = 1.5 / currentScale;
        context.stroke();
        context.fillStyle = "#ffffff";
        context.fillText(text, badgeX + horizontalPadding, badgeY + badgeHeight / 2);
        context.restore();
    }

    function drawBrushCursor(point, radius) {
        if (!point) return;
        const currentScale = scale();
        context.save();
        context.beginPath();
        context.arc(point.x, point.y, radius, 0, Math.PI * 2);
        context.lineWidth = Math.max(1, 2 / currentScale);
        context.strokeStyle = "rgba(0,0,0,.9)";
        context.stroke();
        context.lineWidth = Math.max(1, 1 / currentScale);
        context.strokeStyle = "white";
        context.stroke();
        context.restore();
    }

    function selectionCanvasFor(selectionOverlayData) {
        if (!selectionOverlayData) {
            cachedSelectionData = null;
            cachedSelectionCanvas = null;
            return null;
        }
        if (selectionOverlayData !== cachedSelectionData) {
            cachedSelectionData = selectionOverlayData;
            cachedSelectionCanvas = createLayerCanvas(selectionOverlayData);
        }
        return cachedSelectionCanvas;
    }

    function render({ baseData, selectionOverlayData = null, lasso = null, sample = null, brush = null }) {
        if (baseData) context.putImageData(baseData, 0, 0);
        const selectionCanvas = selectionCanvasFor(selectionOverlayData);
        if (selectionCanvas) context.drawImage(selectionCanvas, 0, 0);
        if (lasso) drawLasso(lasso.points, lasso.complete);
        else if (sample) {
            drawCrosshair(sample.point.x, sample.point.y);
            if (sample.value !== null && sample.value !== undefined) {
                drawValueBadge(sample.point.x, sample.point.y, sample.value);
            }
        }
        if (brush) drawBrushCursor(brush.point, brush.radius);
    }

    return Object.freeze({ drawSourceImage, render });
}

/* ===== viewport.js ===== */
"use strict";
function TonalValueDesignerViewport({container,stage,canvas,onTap,onChange}){
 const MIN=.1,MAX=8,SLOP=7;let scale=1,x=0,y=0,start=null,moved=false,pinch=null,interactionEnabled=true,singlePointerEnabled=true,tapEnabled=true;const pointers=new Map();
 const size=()=>({w:container.clientWidth,h:container.clientHeight});
 function clampPan(){const{w,h}=size(),cw=canvas.width*scale,ch=canvas.height*scale,m=48;x=cw<=w?(w-cw)/2:Math.min(m,Math.max(w-cw-m,x));y=ch<=h?(h-ch)/2:Math.min(m,Math.max(h-ch-m,y));}
 function render(){clampPan();stage.style.width=`${canvas.width}px`;stage.style.height=`${canvas.height}px`;stage.style.transform=`translate(${x}px,${y}px) scale(${scale})`;onChange?.(scale);}
 function setScale(next,cx,cy){next=Math.min(MAX,Math.max(MIN,next));const r=container.getBoundingClientRect();cx??=r.left+r.width/2;cy??=r.top+r.height/2;const lx=cx-r.left,ly=cy-r.top,ix=(lx-x)/scale,iy=(ly-y)/scale;scale=next;x=lx-ix*scale;y=ly-iy*scale;render();}
 function fit(){const{w,h}=size();scale=Math.min(MAX,w/canvas.width,h/canvas.height);x=(w-canvas.width*scale)/2;y=(h-canvas.height*scale)/2;render();}
 function imagePoint(cx,cy){const r=container.getBoundingClientRect();return{x:Math.floor((cx-r.left-x)/scale),y:Math.floor((cy-r.top-y)/scale)};}
 container.addEventListener("wheel",e=>{if(!interactionEnabled)return;e.preventDefault();setScale(scale*Math.exp(-e.deltaY*.0015),e.clientX,e.clientY);},{passive:false});
 container.addEventListener("pointerdown",e=>{if(!interactionEnabled)return;e.preventDefault();container.setPointerCapture(e.pointerId);pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});start=singlePointerEnabled?{x:e.clientX,y:e.clientY,panX:x,panY:y}:null;moved=false;if(pointers.size===2){const p=[...pointers.values()];pinch={d:Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y),scale};}if(singlePointerEnabled)container.classList.add("is-panning");});
 container.addEventListener("pointermove",e=>{if(!interactionEnabled||!pointers.has(e.pointerId))return;pointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(pointers.size===2){const p=[...pointers.values()],d=Math.hypot(p[1].x-p[0].x,p[1].y-p[0].y);moved=true;setScale(pinch.scale*d/pinch.d,(p[0].x+p[1].x)/2,(p[0].y+p[1].y)/2);}else if(start){const dx=e.clientX-start.x,dy=e.clientY-start.y;if(Math.hypot(dx,dy)>SLOP)moved=true;if(moved){x=start.panX+dx;y=start.panY+dy;render();}}});
 function end(e){if(!interactionEnabled)return;const tap=tapEnabled&&singlePointerEnabled&&!moved&&pointers.size===1;pointers.delete(e.pointerId);container.classList.remove("is-panning");if(tap)onTap?.(imagePoint(e.clientX,e.clientY));start=null;pinch=null;}
 container.addEventListener("pointerup",end);container.addEventListener("pointercancel",end);container.addEventListener("lostpointercapture",()=>{pointers.clear();start=null;pinch=null;moved=false;container.classList.remove("is-panning");});window.addEventListener("resize",()=>canvas.width&&render());
 function setInteractionEnabled(enabled){interactionEnabled=Boolean(enabled);if(!interactionEnabled){pointers.clear();start=null;pinch=null;moved=false;container.classList.remove("is-panning");}}
 function setSinglePointerEnabled(enabled){singlePointerEnabled=Boolean(enabled);pointers.clear();start=null;pinch=null;moved=false;container.classList.remove("is-panning");}
 function setTapEnabled(enabled){tapEnabled=Boolean(enabled);}
 return{fit,actual:()=>setScale(1),zoomIn:()=>setScale(scale*1.25),zoomOut:()=>setScale(scale/1.25),getScale:()=>scale,imagePoint,setInteractionEnabled,setSinglePointerEnabled,setTapEnabled,refresh:render};}

/* ===== featureSegmentation.js ===== */
"use strict";

const TonalValueDesignerFeatureSegmentation = (() => {
    const LIBRARY_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
    const SCENE_MODEL_ID = "Xenova/segformer-b0-finetuned-ade-512-512";
    const OBJECT_MODEL_ID = "Xenova/detr-resnet-50";
    const ANALYSIS_LIMIT = 768;
    const MINIMUM_REGION_FRACTION = 0.001;
    const MINIMUM_FEATURE_FRACTION = 0.02;
    const MINIMUM_OBJECT_FRACTION = 0.005;
    let transformersPromise = null;
    let sceneSegmenterPromise = null;
    let objectSegmenterPromise = null;

    const OBJECT_LABELS = new Set([
        "person", "bicycle", "car", "motorcycle", "airplane", "bus", "train", "truck", "boat",
        "bird", "cat", "dog", "horse", "sheep", "cow", "elephant", "bear", "zebra", "giraffe",
        "backpack", "umbrella", "handbag", "tie", "suitcase", "frisbee", "skis", "snowboard",
        "sports ball", "kite", "baseball bat", "baseball glove", "skateboard", "surfboard", "tennis racket",
        "bottle", "wine glass", "cup", "fork", "knife", "spoon", "bowl", "banana", "apple", "sandwich",
        "orange", "broccoli", "carrot", "hot dog", "pizza", "donut", "cake", "chair", "couch",
        "potted plant", "bed", "dining table", "toilet", "tv", "laptop", "mouse", "remote", "keyboard",
        "cell phone", "microwave", "oven", "toaster", "sink", "refrigerator", "book", "clock", "vase",
        "scissors", "teddy bear", "hair drier", "toothbrush"
    ]);

    function titleCase(label) {
        return String(label).trim().replace(/\b\w/g, letter => letter.toUpperCase());
    }

    function report(callback, message) {
        if (typeof callback === "function") callback(message);
    }

    function describeThrownValue(error) {
        if (typeof error === "string" && error.trim()) return error.trim();
        const candidates = [
            error?.message,
            error?.error?.message,
            error?.reason?.message,
            typeof error?.reason === "string" ? error.reason : "",
            typeof error?.detail === "string" ? error.detail : ""
        ];
        return candidates.find(value => typeof value === "string" && value.trim())?.trim() ||
            "the browser stopped this model without providing details";
    }

    function loadTransformers() {
        if (!transformersPromise) transformersPromise = import(LIBRARY_URL);
        return transformersPromise;
    }

    async function loadModel(modelId, kind, onProgress) {
        const isObjectModel = kind === "object";
        const existing = isObjectModel ? objectSegmenterPromise : sceneSegmenterPromise;
        if (existing) {
            report(onProgress, `Using the cached ${isObjectModel ? "object-recognition" : "broad-scene"} model...`);
            return existing;
        }

        const loading = (async () => {
            const { pipeline } = await loadTransformers();
            return pipeline(isObjectModel ? "object-detection" : "image-segmentation", modelId, {
                dtype: "q8",
                progress_callback: progress => {
                    if (!progress?.status) return;
                    const description = isObjectModel ? "object-recognition" : "broad-scene";
                    if (progress.status === "progress" && Number.isFinite(progress.progress)) {
                        report(onProgress, `Downloading the ${description} model... ${Math.round(progress.progress)}%`);
                    } else if (progress.status === "ready") {
                        report(onProgress, `${titleCase(description)} model ready...`);
                    }
                }
            });
        })().catch(error => {
            if (isObjectModel) objectSegmenterPromise = null;
            else sceneSegmenterPromise = null;
            throw error;
        });

        if (isObjectModel) objectSegmenterPromise = loading;
        else sceneSegmenterPromise = loading;
        return loading;
    }

    async function disposeModel(kind, model, onProgress) {
        if (!model) return;
        report(onProgress, `Releasing ${kind === "object" ? "object-recognition" : "broad-scene"} model memory...`);
        try {
            if (typeof model.dispose === "function") await model.dispose();
        } catch (error) {
            // Disposal is a memory optimization. A disposal warning should not
            // discard otherwise successful analysis results.
            console.warn(`Could not completely release the ${kind} model.`, error);
        } finally {
            if (kind === "object") objectSegmenterPromise = null;
            else sceneSegmenterPromise = null;
        }
    }

    function makeAnalysisImage(imageData) {
        const source = document.createElement("canvas");
        source.width = imageData.width;
        source.height = imageData.height;
        source.getContext("2d").putImageData(imageData, 0, 0);
        const scale = Math.min(1, ANALYSIS_LIMIT / Math.max(source.width, source.height));
        const analysis = document.createElement("canvas");
        analysis.width = Math.max(1, Math.round(source.width * scale));
        analysis.height = Math.max(1, Math.round(source.height * scale));
        analysis.getContext("2d", { alpha: false }).drawImage(source, 0, 0, analysis.width, analysis.height);
        return {
            url: analysis.toDataURL("image/jpeg", 0.9),
            width: analysis.width,
            height: analysis.height
        };
    }

    function maskValue(mask, index, channels) {
        if (channels === 1) return mask.data[index];
        const offset = index * channels;
        // Transformer masks may be returned as opaque RGBA images. Alpha is
        // then 255 for every image location and describes opacity, not feature
        // membership. Membership is encoded by the grayscale/RGB channels.
        return channels >= 3
            ? Math.max(mask.data[offset] || 0, mask.data[offset + 1] || 0, mask.data[offset + 2] || 0)
            : Math.max(mask.data[offset] || 0, mask.data[offset + 1] || 0);
    }

    function connectedRegions(mask) {
        const { width, height } = mask;
        const pixelCount = width * height;
        const channels = Math.max(1, Math.round(mask.data.length / pixelCount));
        const componentAt = new Int32Array(pixelCount);
        componentAt.fill(-1);
        const sizes = [];
        const stack = [];
        const active = index => maskValue(mask, index, channels) > 127;

        for (let seed = 0; seed < pixelCount; seed += 1) {
            if (componentAt[seed] !== -1 || !active(seed)) continue;
            const component = sizes.length;
            let size = 0;
            stack.push(seed);
            componentAt[seed] = component;
            while (stack.length) {
                const index = stack.pop();
                size += 1;
                const x = index % width;
                if (x > 0 && componentAt[index - 1] === -1 && active(index - 1)) {
                    componentAt[index - 1] = component; stack.push(index - 1);
                }
                if (x + 1 < width && componentAt[index + 1] === -1 && active(index + 1)) {
                    componentAt[index + 1] = component; stack.push(index + 1);
                }
                if (index >= width && componentAt[index - width] === -1 && active(index - width)) {
                    componentAt[index - width] = component; stack.push(index - width);
                }
                if (index + width < pixelCount && componentAt[index + width] === -1 && active(index + width)) {
                    componentAt[index + width] = component; stack.push(index + width);
                }
            }
            sizes.push(size);
        }
        return { componentAt, sizes, width, height };
    }

    function regionsToFeatures(label, regions, targetWidth, targetHeight, source) {
        const minimumSize = Math.max(8, Math.round(regions.width * regions.height * MINIMUM_REGION_FRACTION));
        let retained = regions.sizes.map((size, id) => ({ id, size }))
            .filter(item => item.size >= minimumSize)
            .sort((a, b) => b.size - a.size);
        if (!retained.length && regions.sizes.length) {
            retained = [regions.sizes.reduce((best, size, id) => size > best.size ? { id, size } : best, { id: 0, size: -1 })];
        }
        const byId = new Map(retained.map(item => [item.id, {
            label, name: "", spans: [], size: 0, width: targetWidth, height: targetHeight, sourceGray: 0, source
        }]));

        for (let y = 0; y < targetHeight; y += 1) {
            const sourceY = Math.min(regions.height - 1, Math.floor(y * regions.height / targetHeight));
            let sourceX = 0;
            while (sourceX < regions.width) {
                const id = regions.componentAt[sourceY * regions.width + sourceX];
                const runStart = sourceX;
                while (sourceX + 1 < regions.width && regions.componentAt[sourceY * regions.width + sourceX + 1] === id) sourceX += 1;
                const feature = byId.get(id);
                if (feature) {
                    const startX = Math.floor(runStart * targetWidth / regions.width);
                    const endX = Math.floor((sourceX + 1) * targetWidth / regions.width) - 1;
                    if (endX >= startX) {
                        feature.spans.push({ y, startX, endX });
                        feature.size += endX - startX + 1;
                    }
                }
                sourceX += 1;
            }
        }
        return retained.map(item => byId.get(item.id)).filter(feature => feature.size > 0);
    }

    function extractFeatures(output, width, height, options = {}) {
        const source = options.source || "scene";
        const minimumFraction = options.minimumFraction ?? MINIMUM_FEATURE_FRACTION;
        const allowedLabels = options.allowedLabels || null;
        const features = [];
        for (const result of output || []) {
            if (!result?.mask?.data || !result.mask.width || !result.mask.height) continue;
            const label = String(result.label || "").trim().toLowerCase();
            if (!label || (allowedLabels && !allowedLabels.has(label))) continue;
            features.push(...regionsToFeatures(label, connectedRegions(result.mask), width, height, source));
        }
        return features.filter(feature => feature.size >= width * height * minimumFraction)
            .sort((a, b) => b.size - a.size).slice(0, 40);
    }

    function boxIntersection(first, second) {
        const width = Math.max(0, Math.min(first.xmax, second.xmax) - Math.max(first.xmin, second.xmin));
        const height = Math.max(0, Math.min(first.ymax, second.ymax) - Math.max(first.ymin, second.ymin));
        return width * height;
    }

    function boxesToFeatures(output, sourceWidth, sourceHeight, targetWidth, targetHeight) {
        const candidates = (output || []).map(result => {
            const label = String(result.label || "").trim().toLowerCase();
            const box = {
                xmin: Math.max(0, Math.min(sourceWidth - 1, Number(result.box?.xmin) || 0)),
                ymin: Math.max(0, Math.min(sourceHeight - 1, Number(result.box?.ymin) || 0)),
                xmax: Math.max(0, Math.min(sourceWidth, Number(result.box?.xmax) || 0)),
                ymax: Math.max(0, Math.min(sourceHeight, Number(result.box?.ymax) || 0))
            };
            const area = Math.max(0, box.xmax - box.xmin) * Math.max(0, box.ymax - box.ymin);
            return { label, box, area, score: Number(result.score) || 0 };
        }).filter(item => OBJECT_LABELS.has(item.label) &&
            item.area >= sourceWidth * sourceHeight * MINIMUM_OBJECT_FRACTION &&
            item.area <= sourceWidth * sourceHeight * 0.6);

        // DETR may propose nested boxes for the same subject. Prefer the
        // tighter box when at least 80% of it is contained in another box.
        candidates.sort((first, second) => first.area - second.area);
        const retained = [];
        for (const candidate of candidates) {
            const duplicate = retained.some(existing => existing.label === candidate.label &&
                boxIntersection(existing.box, candidate.box) / Math.min(existing.area, candidate.area) >= 0.8);
            if (!duplicate) retained.push(candidate);
        }

        return retained.map(candidate => {
            const startX = Math.max(0, Math.floor(candidate.box.xmin * targetWidth / sourceWidth));
            const endX = Math.min(targetWidth - 1, Math.ceil(candidate.box.xmax * targetWidth / sourceWidth) - 1);
            const startY = Math.max(0, Math.floor(candidate.box.ymin * targetHeight / sourceHeight));
            const endY = Math.min(targetHeight - 1, Math.ceil(candidate.box.ymax * targetHeight / sourceHeight) - 1);
            const spans = [];
            for (let y = startY; y <= endY; y += 1) spans.push({ y, startX, endX });
            return {
                label: candidate.label,
                name: "",
                spans,
                size: Math.max(0, endX - startX + 1) * Math.max(0, endY - startY + 1),
                width: targetWidth,
                height: targetHeight,
                sourceGray: 0,
                source: "object",
                approximateBoundary: true,
                confidence: candidate.score
            };
        }).sort((first, second) => second.size - first.size).slice(0, 20);
    }

    function mergeFeatures(sceneFeatures, objectFeatures) {
        const recognizedLabels = new Set(objectFeatures.map(feature => feature.label));
        const merged = [...objectFeatures, ...sceneFeatures.filter(feature => !recognizedLabels.has(feature.label))]
            .sort((a, b) => b.size - a.size).slice(0, 50);
        const totals = new Map();
        const seen = new Map();
        for (const feature of merged) totals.set(feature.label, (totals.get(feature.label) || 0) + 1);
        for (const feature of merged) {
            const number = (seen.get(feature.label) || 0) + 1;
            seen.set(feature.label, number);
            feature.name = `${titleCase(feature.label)}${totals.get(feature.label) > 1 ? ` ${number}` : ""}${feature.source === "object" ? " (recognized object)" : ""}`;
        }
        return merged;
    }

    function splitByValue(feature, mapData, retainedValues, grayForPainterValue) {
        if (!feature?.spans?.length || !mapData || !retainedValues?.length || typeof grayForPainterValue !== "function") {
            throw new Error("Select an analyzed feature and generate a value map before splitting.");
        }
        const painterValueForGray = gray => retainedValues.reduce((nearest, value) =>
            Math.abs(grayForPainterValue(value) - gray) < Math.abs(grayForPainterValue(nearest) - gray) ? value : nearest
        );
        const divisions = new Map(retainedValues.map(value => [value, {
            label: feature.label, name: `${feature.name} - Value ${value}`, spans: [], size: 0,
            width: feature.width, height: feature.height, sourceGray: grayForPainterValue(value),
            parentFeature: feature, painterValue: value, source: feature.source
        }]));
        for (const span of feature.spans) {
            let x = span.startX;
            while (x <= span.endX) {
                const value = painterValueForGray(mapData.data[(span.y * mapData.width + x) * 4]);
                const startX = x;
                while (x + 1 <= span.endX && painterValueForGray(mapData.data[(span.y * mapData.width + x + 1) * 4]) === value) x += 1;
                const division = divisions.get(value);
                division.spans.push({ y: span.y, startX, endX: x });
                division.size += x - startX + 1;
                x += 1;
            }
        }
        const minimumSize = Math.max(1, Math.round(feature.size * 0.02));
        return [...divisions.values()].filter(division => division.size >= minimumSize).sort((a, b) => b.size - a.size);
    }

    async function analyze(imageData, onProgress) {
        if (!imageData) throw new Error("Open a reference image first.");
        const analysisImage = makeAnalysisImage(imageData);
        report(onProgress, "Loading the local AI engine...");
        let sceneSegmenter = null;
        let sceneFeatures = [];
        try {
            sceneSegmenter = await loadModel(SCENE_MODEL_ID, "scene", onProgress);
            report(onProgress, "Analyzing broad scene features on this device...");
            const sceneOutput = await sceneSegmenter(analysisImage.url);
            sceneFeatures = extractFeatures(sceneOutput, imageData.width, imageData.height, {
                source: "scene", minimumFraction: MINIMUM_FEATURE_FRACTION
            });
        } catch (error) {
            throw new Error(`Broad-scene analysis failed: ${describeThrownValue(error)}.`);
        } finally {
            await disposeModel("scene", sceneSegmenter, onProgress);
            sceneSegmenter = null;
        }

        let objectSegmenter = null;
        let objectFeatures = [];
        try {
            objectSegmenter = await loadModel(OBJECT_MODEL_ID, "object", onProgress);
            report(onProgress, "Recognizing individual subjects and their boundaries...");
            const objectOutput = await objectSegmenter(analysisImage.url, { threshold: 0.6 });
            objectFeatures = boxesToFeatures(
                objectOutput,
                analysisImage.width,
                analysisImage.height,
                imageData.width,
                imageData.height
            );
        } catch (error) {
            throw new Error(`Object-recognition analysis failed: ${describeThrownValue(error)}.`);
        } finally {
            await disposeModel("object", objectSegmenter, onProgress);
            objectSegmenter = null;
        }
        const features = mergeFeatures(sceneFeatures, objectFeatures);
        if (!features.length) throw new Error("The AI did not find any sufficiently large features in this image.");
        return features;
    }

    return Object.freeze({
        analyze, extractFeatures, boxesToFeatures, splitByValue,
        sceneModelId: SCENE_MODEL_ID, objectModelId: OBJECT_MODEL_ID
    });
})();

/* ===== app.js ===== */
"use strict";










document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const canvas = $("imageCanvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!context) {
        document.body.textContent = "TonalValueDesigner could not start. Confirm that all project files are present.";
        return;
    }

    const release = TonalValueDesignerVersion;
    $("appVersion").textContent = `v${release.version}`;
    $("footerVersion").textContent = `v${release.version}`;
    $("buildDate").textContent = `built ${release.buildDate}`;

    const phoneFeatureRestricted = BrowserPlatform.isPhone();
    $("featurePhoneNotice").hidden = !phoneFeatureRestricted;
    $("featureDesktopControls").hidden = phoneFeatureRestricted;

    const aboutDialog = $("aboutDialog");
    $("openAbout").onclick = () => {
        if (typeof aboutDialog.showModal === "function") aboutDialog.showModal();
        else aboutDialog.setAttribute("open", "");
    };
    $("closeAbout").onclick = () => {
        if (typeof aboutDialog.close === "function") aboutDialog.close();
        else aboutDialog.removeAttribute("open");
    };
    aboutDialog.addEventListener("click", event => {
        if (event.target === aboutDialog) $("closeAbout").click();
    });

    const documentState = createDocumentState();
    const interactionState = createInteractionState();
    const editHistory = createEditHistory({ limit: 10, applyOperation: applyMassingOperation });

    const viewport = TonalValueDesignerViewport({
        container: $("canvasContainer"),
        stage: $("canvasStage"),
        canvas,
        onTap: point => {
            if (point.x >= 0 && point.y >= 0 && point.x < canvas.width && point.y < canvas.height) {
                documentState.selectedPoint = point;
                measure();
            }
        },
        onChange: scale => {
            $("zoomLevel").textContent = `${Math.round(scale * 100)}%`;

            // Redraw only when magnification changes. The badge is sized in
            // screen units, so this keeps it readable at every zoom level.
            if (documentState.measurement && Math.abs(scale - documentState.lastViewportScale) > 0.0001) {
                documentState.lastViewportScale = scale;
                redraw();
            } else {
                documentState.lastViewportScale = scale;
            }
        }
    });
    const canvasRenderer = createCanvasRenderer({
        canvas,
        context,
        getScale: viewport.getScale,
        createLayerCanvas: imageData => BrowserPlatform.canvasFromImageData(imageData)
    });

    $("zoomIn").onclick = viewport.zoomIn;
    $("zoomOut").onclick = viewport.zoomOut;
    $("fitImage").onclick = viewport.fit;
    $("actualSize").onclick = viewport.actual;
    $("sampleSize").onchange = () => documentState.selectedPoint && measure();
    $("targetValue").oninput = compare;
    $("targetTolerance").onchange = compare;
    $("clearTargetButton").onclick = () => { $("targetValue").value = ""; compare(); };
    $("generateMap").onclick = generateMap;
    $("showOriginal").onclick = toggleOriginal;
    $("saveMap").onclick = saveMap;
    $("insertValueComma").onclick = insertValueComma;
    $("drawArea").onclick = beginDrawing;
    $("applyMassing").onclick = applyMassing;
    $("cancelMassing").onclick = () => cancelDrawing("Drawing cancelled.");
    $("undoMassing").onclick = undoMassing;
    $("undoPaint").onclick = undoMassing;
    $("undoSelection").onclick = undoMassing;
    $("selectMass").onclick = beginMassSelection;
    $("applyMassValue").onclick = applySelectedMassValue;
    $("addSelectionArea").onclick = () => beginSelectionRefinement("add");
    $("removeSelectionArea").onclick = () => beginSelectionRefinement("remove");
    $("cancelMassSelection").onclick = () => cancelMassSelection("Selection cancelled.");
    $("beginPainting").onclick = beginPainting;
    $("panImage").onclick = togglePanImage;
    $("donePainting").onclick = () => endPainting("Painting finished.");
    $("analyzeFeatures").onclick = analyzeFeatures;
    $("selectFeature").onclick = selectDetectedFeature;
    $("splitFeatureByValue").onclick = splitSelectedFeatureByValue;
    $("detectedFeature").onchange = () => {
        $("splitFeatureByValue").disabled = true;
        setFeatureStatus("Choose Select Feature to highlight this item before splitting or editing it.");
    };
    document.querySelectorAll("[data-values]").forEach(button => {
        button.onclick = () => { $("mapValues").value = button.dataset.values; };
    });

    function insertValueComma() {
        const input = $("mapValues");
        const start = Number.isInteger(input.selectionStart) ? input.selectionStart : input.value.length;
        const end = Number.isInteger(input.selectionEnd) ? input.selectionEnd : start;
        input.setRangeText(", ", start, end, "end");
        input.focus();
    }
    setupTabs();
    setupLearningPanels();
    setupSplitter();
    const drawingSurface = $("canvasContainer");
    drawingSurface.addEventListener("pointerdown", handleDrawingStart);
    drawingSurface.addEventListener("pointerdown", handleMassSelection);
    drawingSurface.addEventListener("pointermove", handleDrawingMove);
    drawingSurface.addEventListener("pointerup", handleDrawingEnd);
    drawingSurface.addEventListener("pointercancel", handleDrawingCancel);
    drawingSurface.addEventListener("pointerdown", handlePaintStart);
    drawingSurface.addEventListener("pointermove", handlePaintMove);
    drawingSurface.addEventListener("pointerup", handlePaintEnd);
    drawingSurface.addEventListener("pointercancel", handlePaintEnd);
    drawingSurface.addEventListener("pointerleave", handlePaintLeave);
    document.addEventListener("keydown", event => {
        if (interactionState.paintMode && event.key === "Escape") {
            event.preventDefault();
            endPainting("Painting finished with Escape.");
        } else if (interactionState.selectionRefineMode && event.key === "Escape") {
            event.preventDefault();
            cancelSelectionRefinement("Refinement cancelled; the selection is unchanged.");
        } else if (interactionState.drawingMode && event.key === "Escape") {
            event.preventDefault();
            cancelDrawing("Drawing cancelled with Escape.");
        } else if (interactionState.massSelectionMode && event.key === "Escape") {
            event.preventDefault();
            cancelMassSelection("Selection cancelled with Escape.");
        }
    });
    document.addEventListener("keyup", event => {
        if (interactionState.drawingMode && event.key === "Shift") {
            interactionState.straightSegmentAnchorIndex = null;
        }
    });

    $("imageFile").addEventListener("change", async event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            $("fileName").textContent = "Please choose an image file.";
            return;
        }
        $("fileName").textContent = `Loading ${file.name}…`;
        try {
            const image = await BrowserPlatform.loadImageFile(file);
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            canvasRenderer.drawSourceImage(image);
            documentState.originalData = context.getImageData(0, 0, canvas.width, canvas.height);
            documentState.mapData = null;
            documentState.retainedValues = [];
            documentState.showingMap = false;
            documentState.selectedPoint = documentState.measurement = null;
            documentState.sourceName = file.name.replace(/\.[^.]+$/, "") || "value-map";
            resetMassing();
            resetFeatureAnalysis();
            $("panImage").disabled = false;
            $("fileName").textContent = `${file.name} — ${canvas.width} × ${canvas.height}`;
            $("imagePlaceholder").hidden = true;
            $("canvasContainer").hidden = false;
            $("viewportToolbar").hidden = false;
            $("emptyResult").hidden = false;
            $("measurementResult").hidden = true;
            $("showOriginal").disabled = true;
            $("saveMap").disabled = true;
            $("valueLegend").hidden = true;
            setMapStatus("Choose the Painter's Values you want to retain.");
            updateMode();
            requestAnimationFrame(viewport.fit);
        } catch (error) {
            $("fileName").textContent = error.message || "TonalValueDesigner could not open that image.";
        }
    });

    function activeData() { return documentState.showingMap && documentState.mapData ? documentState.mapData : documentState.originalData; }

    function setupTabs() {
        const buttons = [...document.querySelectorAll('[role="tab"]')];
        function activate(button, moveFocus = false) {
            if (interactionState.drawingMode && button.id !== "massingTabButton") {
                cancelDrawing("Drawing cancelled when switching tools.");
            }
            if (interactionState.massSelectionMode && button.id !== "massingTabButton") {
                cancelMassSelection("Selection cancelled when switching tools.");
            }
            if (interactionState.paintMode && button.id !== "massingTabButton") {
                endPainting("Painting finished when switching tools.");
            }
            buttons.forEach(candidate => {
                const selected = candidate === button;
                candidate.setAttribute("aria-selected", String(selected));
                candidate.tabIndex = selected ? 0 : -1;
                $(candidate.getAttribute("aria-controls")).hidden = !selected;
            });
            const trainerActive = button.id === "eyeTrainerTabButton";
            $("imageWorkspace").hidden = trainerActive;
            $("eyeTrainerWorkspace").hidden = !trainerActive;
            $("layoutSplitter").hidden = trainerActive;
            $("appLayout").classList.toggle("eye-trainer-active", trainerActive);
            if (!trainerActive) viewport.refresh();
            if (moveFocus) button.focus();
        }
        buttons.forEach((button, index) => {
            button.addEventListener("click", () => activate(button));
            button.addEventListener("keydown", event => {
                let nextIndex = null;
                if (event.key === "ArrowRight") nextIndex = (index + 1) % buttons.length;
                if (event.key === "ArrowLeft") nextIndex = (index - 1 + buttons.length) % buttons.length;
                if (event.key === "Home") nextIndex = 0;
                if (event.key === "End") nextIndex = buttons.length - 1;
                if (nextIndex !== null) {
                    event.preventDefault();
                    activate(buttons[nextIndex], true);
                }
            });
        });
    }

    function setupLearningPanels() {
        const definitions = [
            {
                toggleId: "toggleValueStudyHelp",
                panelId: "valueStudyLearning",
                closeId: "closeValueStudyHelp",
                closedLabel: "Learn more about value studies",
                openLabel: "Hide value studies explanation"
            },
            {
                toggleId: "toggleMassingHelp",
                panelId: "valueMassingLearning",
                closeId: "closeMassingHelp",
                closedLabel: "Learn about value massing",
                openLabel: "Hide value massing explanation"
            }
        ];

        definitions.forEach(definition => {
            const toggle = $(definition.toggleId);
            const close = $(definition.closeId);
            const panel = $(definition.panelId);

            function setOpen(open, returnFocus = false) {
                panel.hidden = !open;
                toggle.setAttribute("aria-expanded", String(open));
                toggle.textContent = open ? definition.openLabel : definition.closedLabel;
                if (returnFocus) toggle.focus();
            }

            toggle.addEventListener("click", () => setOpen(panel.hidden));
            close.addEventListener("click", () => setOpen(false, true));
        });
    }

    function setupSplitter() {
        const layout = $("appLayout");
        const splitter = $("layoutSplitter");
        let activePointer = null;

        function limits() {
            const width = layout.clientWidth;
            return { minimum: 288, maximum: Math.max(288, width - 360) };
        }
        function setWidth(width) {
            const { minimum, maximum } = limits();
            const adjusted = Math.round(Math.min(maximum, Math.max(minimum, width)));
            layout.style.setProperty("--control-width", `${adjusted}px`);
            splitter.setAttribute("aria-valuemin", minimum);
            splitter.setAttribute("aria-valuemax", maximum);
            splitter.setAttribute("aria-valuenow", adjusted);
            viewport.refresh();
        }
        splitter.addEventListener("pointerdown", event => {
            if (window.innerWidth <= 900) return;
            event.preventDefault();
            activePointer = event.pointerId;
            splitter.setPointerCapture(event.pointerId);
            splitter.classList.add("is-resizing");
        });
        splitter.addEventListener("pointermove", event => {
            if (event.pointerId !== activePointer) return;
            event.preventDefault();
            const bounds = layout.getBoundingClientRect();
            setWidth(event.clientX - bounds.left);
        });
        function finishResize(event) {
            if (event.pointerId !== activePointer) return;
            activePointer = null;
            splitter.classList.remove("is-resizing");
        }
        splitter.addEventListener("pointerup", finishResize);
        splitter.addEventListener("pointercancel", finishResize);
        splitter.addEventListener("lostpointercapture", () => {
            activePointer = null;
            splitter.classList.remove("is-resizing");
        });
        splitter.addEventListener("keydown", event => {
            const current = Number(splitter.getAttribute("aria-valuenow")) || 384;
            if (event.key === "ArrowLeft") { event.preventDefault(); setWidth(current - 24); }
            if (event.key === "ArrowRight") { event.preventDefault(); setWidth(current + 24); }
            if (event.key === "Home") { event.preventDefault(); setWidth(limits().minimum); }
            if (event.key === "End") { event.preventDefault(); setWidth(limits().maximum); }
        });
        splitter.addEventListener("dblclick", () => setWidth(384));
        setWidth(384);
        window.addEventListener("resize", () => {
            if (window.innerWidth > 900) {
                setWidth(Number(splitter.getAttribute("aria-valuenow")) || 384);
            }
        });
    }
    function redraw() {
        canvasRenderer.render({
            baseData: activeData(),
            selectionOverlayData: interactionState.selectedMass ? interactionState.selectionHighlightData : null,
            lasso: (interactionState.drawingMode || interactionState.selectionRefineMode) && interactionState.lassoPoints.length
                ? { points: interactionState.lassoPoints, complete: interactionState.lassoComplete }
                : null,
            sample: !interactionState.selectedMass && documentState.selectedPoint
                ? { point: documentState.selectedPoint, value: documentState.measurement?.value }
                : null,
            brush: interactionState.paintMode && !interactionState.paintPaused && interactionState.brushCursorPoint
                ? { point: interactionState.brushCursorPoint, radius: currentBrushRadius() }
                : null
        });
    }

    function generateMap() {
        if (!documentState.originalData) { setMapStatus("Open a photograph first.", true); return; }
        let values;
        try { values = CoreEngine.parseValues($("mapValues").value); }
        catch (error) { setMapStatus(error.message, true); return; }

        $("generateMap").disabled = true;
        setMapStatus("Generating value map…");
        requestAnimationFrame(() => {
            try {
                documentState.mapData = CoreEngine.generateValueMap(documentState.originalData, values);
                documentState.retainedValues = values;
                documentState.showingMap = true;
                documentState.selectedPoint = documentState.measurement = null;
                $("emptyResult").hidden = false;
                $("measurementResult").hidden = true;
                $("showOriginal").disabled = false;
                $("showOriginal").textContent = "Show Original";
                $("saveMap").disabled = false;
                prepareMassing(values);
                renderLegend();
                redraw();
                updateMode();
                setMapStatus(`Map generated using Painter's Values ${values.join(", ")}.`);
            } catch (error) {
                setMapStatus(`The value map could not be generated: ${error.message}`, true);
            } finally {
                $("generateMap").disabled = false;
            }
        });
    }

    function toggleOriginal() {
        if (!documentState.mapData) return;
        if (interactionState.drawingMode) cancelDrawing("Drawing cancelled when the view changed.");
        if (interactionState.massSelectionMode) cancelMassSelection("Selection cancelled when the view changed.");
        if (interactionState.paintMode) endPainting("Painting finished when the view changed.");
        documentState.showingMap = !documentState.showingMap;
        $("showOriginal").textContent = documentState.showingMap ? "Show Original" : "Show Value Map";
        documentState.selectedPoint = documentState.measurement = null;
        $("emptyResult").hidden = false;
        $("measurementResult").hidden = true;
        redraw();
        updateMode();
    }

    async function saveMap() {
        if (!documentState.mapData) return;
        try {
            const values = documentState.retainedValues.join("-").replace(/\./g, "_");
            const fileName = `${documentState.sourceName}-values-${values}.png`;
            await BrowserPlatform.savePng(documentState.mapData, fileName);
            setMapStatus(`Saved ${fileName}.`);
        } catch (error) {
            setMapStatus(error.message || "The browser could not create the PNG.", true);
        }
    }

    function renderLegend() {
        const legend = $("valueLegend");
        legend.textContent = "";
        CoreEngine.makeValueLegend(documentState.retainedValues).forEach(item => {
            const entry = document.createElement("div");
            entry.className = "legend-item";
            const swatch = document.createElement("span");
            swatch.className = "legend-swatch";
            swatch.style.background = `rgb(${item.gray},${item.gray},${item.gray})`;
            const label = document.createElement("span");
            label.textContent = `Value ${item.value}`;
            entry.append(swatch, label);
            legend.append(entry);
        });
        legend.hidden = false;
    }

    function setMapStatus(message, error = false) {
        $("mapStatus").textContent = message;
        $("mapStatus").className = `map-status${error ? " error" : ""}`;
    }

    function setFeatureStatus(message, error = false) {
        $("featureStatus").textContent = message;
        $("featureStatus").className = `feature-status${error ? " error" : ""}`;
    }

    function setAnalysisBusy(busy, message = "Preparing feature analysis...") {
        const overlay = $("analysisOverlay");
        $("analysisOverlayStatus").textContent = message;
        overlay.hidden = !busy;
        document.body.setAttribute("aria-busy", String(busy));
    }

    function reportAnalysisProgress(message) {
        setFeatureStatus(message);
        $("analysisOverlayStatus").textContent = message;
    }

    function describeAnalysisError(error) {
        if (typeof error === "string" && error.trim()) return error.trim();
        const candidates = [
            error?.message,
            error?.error?.message,
            error?.reason?.message,
            typeof error?.reason === "string" ? error.reason : "",
            typeof error?.detail === "string" ? error.detail : "",
            typeof error?.type === "string" && error.type !== "error" ? error.type : ""
        ];
        const description = candidates.find(value => typeof value === "string" && value.trim());
        if (description) return description.trim();
        return "The browser stopped the AI model without providing details. The model download may have been interrupted, its cached copy may be incomplete, or the device may not have had enough available memory.";
    }

    function resetFeatureAnalysis() {
        interactionState.detectedFeatures = [];
        interactionState.featureSelectionActive = false;
        const select = $("detectedFeature");
        select.disabled = true;
        select.innerHTML = "<option>Generate a value map first</option>";
        $("analyzeFeatures").disabled = true;
        $("selectFeature").disabled = true;
        $("splitFeatureByValue").disabled = true;
        setFeatureStatus("Generate a value map to enable feature analysis.");
    }

    function renderDetectedFeatures() {
        const select = $("detectedFeature");
        select.textContent = "";
        interactionState.detectedFeatures.forEach((feature, index) => {
            const option = document.createElement("option");
            option.value = String(index);
            const coverage = Math.max(1, Math.round(feature.size * 100 / (canvas.width * canvas.height)));
            option.textContent = `${feature.name} (${coverage}% of image)`;
            select.append(option);
        });
        select.disabled = interactionState.detectedFeatures.length === 0;
        $("selectFeature").disabled = interactionState.detectedFeatures.length === 0;
        $("splitFeatureByValue").disabled = true;
    }

    async function analyzeFeatures() {
        if (phoneFeatureRestricted) {
            // This is an execution guard as well as a UI restriction. It
            // guarantees that a phone cannot initialize or download either
            // AI model, even if this function is invoked indirectly.
            setFeatureStatus("Feature identification is available on tablets and computers.", true);
            return;
        }
        if (!documentState.originalData || !documentState.mapData) {
            setFeatureStatus("Generate a Painter's Value Map before analyzing features.", true);
            return;
        }
        if (interactionState.drawingMode) cancelDrawing();
        if (interactionState.paintMode) endPainting();
        if (interactionState.massSelectionMode) cancelMassSelection();
        const button = $("analyzeFeatures");
        button.disabled = true;
        button.textContent = "Analyzing...";
        $("selectFeature").disabled = true;
        $("splitFeatureByValue").disabled = true;
        $("detectedFeature").disabled = true;
        setAnalysisBusy(true);
        try {
            interactionState.detectedFeatures = await TonalValueDesignerFeatureSegmentation.analyze(
                documentState.originalData,
                reportAnalysisProgress
            );
            renderDetectedFeatures();
            const labels = new Set(interactionState.detectedFeatures.map(feature => feature.label));
            const recognizedObjects = interactionState.detectedFeatures.filter(feature => feature.source === "object").length;
            setFeatureStatus(`Found ${interactionState.detectedFeatures.length} selectable features in ${labels.size} categories, including ${recognizedObjects} recognized ${recognizedObjects === 1 ? "object" : "objects"}. Choose one and select it.`);
        } catch (error) {
            console.error("Feature analysis failed", error);
            interactionState.detectedFeatures = [];
            renderDetectedFeatures();
            setFeatureStatus(`Feature analysis was not completed: ${describeAnalysisError(error)}`, true);
        } finally {
            setAnalysisBusy(false);
            button.disabled = phoneFeatureRestricted || !documentState.mapData;
            button.textContent = "Analyze Image";
        }
    }

    function dominantSelectionGray(spans) {
        const counts = new Uint32Array(256);
        for (const span of spans) {
            for (let x = span.startX; x <= span.endX; x += 1) {
                counts[documentState.mapData.data[(span.y * documentState.mapData.width + x) * 4]] += 1;
            }
        }
        let gray = 0;
        for (let value = 1; value < counts.length; value += 1) {
            if (counts[value] > counts[gray]) gray = value;
        }
        return gray;
    }

    function selectDetectedFeature() {
        if (!documentState.mapData || !interactionState.detectedFeatures.length) return;
        const feature = interactionState.detectedFeatures[Number($("detectedFeature").value)];
        if (!feature) return;
        exitExplicitPanMode();
        if (interactionState.drawingMode) cancelDrawing();
        if (interactionState.paintMode) endPainting();
        if (interactionState.massSelectionMode) cancelMassSelection();
        if (!documentState.showingMap) {
            documentState.showingMap = true;
            $("showOriginal").textContent = "Show Original";
            updateMode();
        }
        interactionState.massSelectionMode = true;
        interactionState.featureSelectionActive = true;
        interactionState.selectedMass = {
            spans: feature.spans.map(span => ({ ...span })),
            size: feature.size,
            sourceGray: dominantSelectionGray(feature.spans),
            width: feature.width,
            height: feature.height
        };
        documentState.selectedPoint = documentState.measurement = null;
        $("emptyResult").hidden = false;
        $("measurementResult").hidden = true;
        viewport.setInteractionEnabled(false);
        drawingSurface.classList.add("selecting-mass");
        updateSelectionHighlight();
        $("applyMassValue").disabled = false;
        $("addSelectionArea").disabled = false;
        $("removeSelectionArea").disabled = false;
        $("cancelMassSelection").disabled = false;
        const sourceValue = documentState.retainedValues.reduce((nearest, value) =>
            Math.abs(CoreEngine.grayForPainterValue(value) - interactionState.selectedMass.sourceGray) <
            Math.abs(CoreEngine.grayForPainterValue(nearest) - interactionState.selectedMass.sourceGray) ? value : nearest
        );
        $("selectedMassValue").value = String(sourceValue);
        $("splitFeatureByValue").disabled = Boolean(feature.parentFeature);
        const boundaryNote = feature.approximateBoundary ? " This recognized object has an approximate rectangular boundary." : "";
        setFeatureStatus(`${feature.name} is highlighted.${boundaryNote} Refine it below or assign it a new value.`);
        setMassSelectionStatus(`AI-selected ${feature.name}.${boundaryNote} Use Add Area or Remove Area as needed, then choose and apply a new value.`);
        redraw();
    }

    function splitSelectedFeatureByValue() {
        if (!interactionState.featureSelectionActive || !interactionState.selectedMass || !documentState.mapData) return;
        const feature = interactionState.detectedFeatures[Number($("detectedFeature").value)];
        if (!feature || feature.parentFeature) return;
        const divisions = TonalValueDesignerFeatureSegmentation.splitByValue(
            feature,
            documentState.mapData,
            documentState.retainedValues,
            CoreEngine.grayForPainterValue
        );
        if (divisions.length < 2) {
            setFeatureStatus(`${feature.name} contains only one substantial Painter's Value division.`);
            return;
        }

        interactionState.detectedFeatures = interactionState.detectedFeatures.filter(candidate => candidate.parentFeature !== feature);
        const parentIndex = interactionState.detectedFeatures.indexOf(feature);
        interactionState.detectedFeatures.splice(parentIndex + 1, 0, ...divisions);
        renderDetectedFeatures();
        $("detectedFeature").value = String(parentIndex + 1);
        selectDetectedFeature();
        setFeatureStatus(`${feature.name} was split into ${divisions.length} substantial value divisions. The largest division is highlighted.`);
    }

    function updateMode() { $("modeIndicator").textContent = interactionState.explicitPanMode ? "Pan Image" : documentState.showingMap ? "Painter's Value Map" : "Original"; }

    function resetMassing() {
        clearPaintState();
        clearMassSelectionState();
        interactionState.drawingMode = false;
        interactionState.drawingPointer = null;
        interactionState.lassoPoints = [];
        interactionState.lassoComplete = false;
        editHistory.clear();
        viewport.setInteractionEnabled(true);
        drawingSurface.classList.remove("drawing-area");
        $("drawArea").classList.remove("active-mode");
        $("drawArea").setAttribute("aria-pressed", "false");
        $("massingValue").disabled = true;
        $("massingValue").innerHTML = "<option>Generate a value map first</option>";
        $("drawArea").disabled = true;
        $("applyMassing").disabled = true;
        $("cancelMassing").disabled = true;
        setUndoAvailable(false);
        $("selectedMassValue").disabled = true;
        $("selectedMassValue").innerHTML = "<option>Generate a value map first</option>";
        $("selectMass").disabled = true;
        $("applyMassValue").disabled = true;
        $("addSelectionArea").disabled = true;
        $("removeSelectionArea").disabled = true;
        $("cancelMassSelection").disabled = true;
        $("splitFeatureByValue").disabled = true;
        $("paintValue").disabled = true;
        $("paintValue").innerHTML = "<option>Generate a value map first</option>";
        $("brushSize").disabled = true;
        $("beginPainting").disabled = true;
        $("donePainting").disabled = true;
        setPaintStatus("Generate a value map to enable painting.");
        setMassingStatus("Generate a value map to enable massing.");
        setMassSelectionStatus("Generate a value map to select individual masses.");
        $("analyzeFeatures").disabled = true;
        $("selectFeature").disabled = true;
    }

    function prepareMassing(values) {
        if (interactionState.drawingMode) cancelDrawing();
        if (interactionState.massSelectionMode) cancelMassSelection();
        const select = $("massingValue");
        const massSelect = $("selectedMassValue");
        const paintSelect = $("paintValue");
        select.textContent = "";
        massSelect.textContent = "";
        paintSelect.textContent = "";
        values.slice().reverse().forEach(value => {
            const option = document.createElement("option");
            option.value = value;
            option.textContent = `Value ${value}`;
            select.append(option);
            massSelect.append(option.cloneNode(true));
            paintSelect.append(option.cloneNode(true));
        });
        select.disabled = false;
        massSelect.disabled = false;
        $("selectMass").disabled = false;
        $("applyMassValue").disabled = true;
        $("addSelectionArea").disabled = true;
        $("removeSelectionArea").disabled = true;
        $("cancelMassSelection").disabled = true;
        $("drawArea").disabled = false;
        $("applyMassing").disabled = true;
        $("cancelMassing").disabled = true;
        editHistory.reset(CoreEngine.cloneImageData(documentState.mapData));
        setUndoAvailable(false);
        paintSelect.disabled = false;
        $("brushSize").disabled = false;
        $("beginPainting").disabled = false;
        $("donePainting").disabled = true;
        setPaintStatus("Choose a value and brush size, then select Paint Value.");
        setMassingStatus("Choose a value, then draw a free-form boundary around the area to simplify. Hold shift key to draw a straight line.");
        setMassSelectionStatus("Choose Select Mass, then tap or click one shape in the value map.");
        $("analyzeFeatures").disabled = phoneFeatureRestricted;
        $("selectFeature").disabled = interactionState.detectedFeatures.length === 0;
        $("splitFeatureByValue").disabled = true;
        setFeatureStatus(interactionState.detectedFeatures.length
            ? `${interactionState.detectedFeatures.length} broad features are available for this image.`
            : "Select Analyze Image to identify broad features on this device.");
    }

    function beginDrawing() {
        if (!documentState.mapData) return;
        exitExplicitPanMode();
        if (interactionState.paintMode) endPainting();
        if (interactionState.massSelectionMode) cancelMassSelection();
        if (!documentState.showingMap) {
            documentState.showingMap = true;
            $("showOriginal").textContent = "Show Original";
            updateMode();
        }
        interactionState.drawingMode = true;
        interactionState.drawingPointer = null;
        interactionState.straightSegmentAnchorIndex = null;
        interactionState.lassoPoints = [];
        interactionState.lassoComplete = false;
        documentState.selectedPoint = documentState.measurement = null;
        $("emptyResult").hidden = false;
        $("measurementResult").hidden = true;
        viewport.setInteractionEnabled(false);
        drawingSurface.classList.add("drawing-area");
        $("drawArea").disabled = true;
        $("drawArea").classList.add("active-mode");
        $("drawArea").setAttribute("aria-pressed", "true");
        $("applyMassing").disabled = true;
        $("cancelMassing").disabled = false;
        setMassingStatus("Draw around the area. Hold shift key for a straight line. Release to close the boundary.");
        redraw();
    }

    function handleDrawingStart(event) {
        if ((!interactionState.drawingMode && !interactionState.selectionRefineMode) || interactionState.drawingPointer !== null) return;
        event.preventDefault();
        interactionState.drawingPointer = event.pointerId;
        interactionState.straightSegmentAnchorIndex = null;
        drawingSurface.setPointerCapture(event.pointerId);
        const point = boundedImagePoint(event);
        interactionState.lassoPoints = point ? [point] : [];
        interactionState.lassoComplete = false;
        redraw();
    }

    function handleDrawingMove(event) {
        if ((!interactionState.drawingMode && !interactionState.selectionRefineMode) || event.pointerId !== interactionState.drawingPointer || !interactionState.lassoPoints.length) return;
        event.preventDefault();
        const point = boundedImagePoint(event);
        if (!point) return;

        if (interactionState.drawingMode && event.shiftKey) {
            if (interactionState.straightSegmentAnchorIndex === null) {
                interactionState.straightSegmentAnchorIndex = interactionState.lassoPoints.length - 1;
                interactionState.lassoPoints.push(point);
            } else {
                interactionState.lassoPoints.length = interactionState.straightSegmentAnchorIndex + 1;
                interactionState.lassoPoints.push(point);
            }
            redraw();
            return;
        }

        if (interactionState.drawingMode && interactionState.straightSegmentAnchorIndex !== null) {
            interactionState.straightSegmentAnchorIndex = null;
        }
        const previous = interactionState.lassoPoints[interactionState.lassoPoints.length - 1];
        const minimumSpacing = Math.max(1, 2 / viewport.getScale());
        if (Math.hypot(point.x - previous.x, point.y - previous.y) >= minimumSpacing) {
            interactionState.lassoPoints.push(point);
            redraw();
        }
    }

    function handleDrawingEnd(event) {
        if ((!interactionState.drawingMode && !interactionState.selectionRefineMode) || event.pointerId !== interactionState.drawingPointer) return;
        event.preventDefault();
        interactionState.drawingPointer = null;
        interactionState.straightSegmentAnchorIndex = null;
        if (interactionState.lassoPoints.length < 3) {
            interactionState.lassoPoints = [];
            if (interactionState.selectionRefineMode) setMassSelectionStatus("The boundary was too small. Draw a larger enclosed area.", true);
            else setMassingStatus("The boundary was too small. Draw a larger enclosed area.", true);
            redraw();
            return;
        }
        if (interactionState.selectionRefineMode) {
            applySelectionRefinement();
            return;
        }
        interactionState.lassoComplete = true;
        $("applyMassing").disabled = false;
        setMassingStatus("Boundary ready. Apply the selected value or cancel and redraw.");
        redraw();
    }

    function handleDrawingCancel(event) {
        if ((interactionState.drawingMode || interactionState.selectionRefineMode) && event.pointerId === interactionState.drawingPointer) {
            interactionState.drawingPointer = null;
            interactionState.straightSegmentAnchorIndex = null;
            interactionState.lassoPoints = [];
            interactionState.lassoComplete = false;
            if (interactionState.selectionRefineMode) setMassSelectionStatus("Refinement interrupted. Draw the boundary again.", true);
            else {
                $("applyMassing").disabled = true;
                setMassingStatus("Drawing interrupted. Draw the boundary again.", true);
            }
            redraw();
        }
    }

    function boundedImagePoint(event) {
        const point = viewport.imagePoint(event.clientX, event.clientY);
        if (point.x < 0 || point.y < 0 || point.x >= canvas.width || point.y >= canvas.height) return null;
        return point;
    }

    function applyMassing() {
        if (!documentState.mapData || !interactionState.lassoComplete || interactionState.lassoPoints.length < 3) return;
        const targetValue = Number($("massingValue").value);
        try {
            const operation = {
                type: "directed",
                points: interactionState.lassoPoints.map(point => ({ x: point.x, y: point.y })),
                value: targetValue
            };
            const result = applyMassingOperation(documentState.mapData, operation);
            documentState.mapData = result.imageData;
            recordMassingOperation(operation);
            cancelDrawing();
            setUndoAvailable(true);
            setMassingStatus(`Assigned Value ${targetValue} to the drawn area (${result.changed.toLocaleString()} image locations changed).`);
            redraw();
        } catch (error) {
            setMassingStatus(error.message, true);
        }
    }

    function beginMassSelection() {
        if (!documentState.mapData) return;
        exitExplicitPanMode();
        if (interactionState.paintMode) endPainting();
        if (interactionState.drawingMode) cancelDrawing();
        if (!documentState.showingMap) {
            documentState.showingMap = true;
            $("showOriginal").textContent = "Show Original";
            updateMode();
        }
        interactionState.massSelectionMode = true;
        interactionState.selectionRefineMode = null;
        interactionState.selectedMass = null;
        interactionState.selectionHighlightData = null;
        documentState.selectedPoint = documentState.measurement = null;
        $("emptyResult").hidden = false;
        $("measurementResult").hidden = true;
        viewport.setInteractionEnabled(false);
        drawingSurface.classList.add("selecting-mass");
        $("selectMass").disabled = true;
        $("selectMass").classList.add("active-mode");
        $("selectMass").setAttribute("aria-pressed", "true");
        $("applyMassValue").disabled = true;
        $("addSelectionArea").disabled = true;
        $("removeSelectionArea").disabled = true;
        $("cancelMassSelection").disabled = false;
        setMassSelectionStatus("Tap or click inside the individual value mass you want to change.");
        redraw();
    }

    function handleMassSelection(event) {
        if (!interactionState.massSelectionMode || interactionState.featureSelectionActive || interactionState.selectionRefineMode || event.button > 0) return;
        event.preventDefault();
        const point = boundedImagePoint(event);
        if (!point) {
            setMassSelectionStatus("Tap or click inside the value map.", true);
            return;
        }
        try {
            interactionState.selectedMass = CoreEngine.identifyMass(documentState.mapData, point.x, point.y);
            updateSelectionHighlight();
            $("applyMassValue").disabled = false;
            $("addSelectionArea").disabled = false;
            $("removeSelectionArea").disabled = false;
            const sourceValue = documentState.retainedValues.reduce((nearest, value) =>
                Math.abs(CoreEngine.grayForPainterValue(value) - interactionState.selectedMass.sourceGray) <
                Math.abs(CoreEngine.grayForPainterValue(nearest) - interactionState.selectedMass.sourceGray) ? value : nearest
            );
            $("selectedMassValue").value = String(sourceValue);
            setMassSelectionStatus(`Selected one Value ${sourceValue} mass. Choose its new value, then apply.`);
            redraw();
        } catch (error) {
            setMassSelectionStatus(error.message, true);
        }
    }

    function beginSelectionRefinement(mode) {
        if (!interactionState.selectedMass || interactionState.selectionRefineMode) return;
        interactionState.selectionRefineMode = mode;
        interactionState.drawingPointer = null;
        interactionState.lassoPoints = [];
        interactionState.lassoComplete = false;
        $("applyMassValue").disabled = true;
        $("addSelectionArea").disabled = true;
        $("removeSelectionArea").disabled = true;
        const activeButton = mode === "add" ? $("addSelectionArea") : $("removeSelectionArea");
        activeButton.classList.add("active-mode");
        activeButton.setAttribute("aria-pressed", "true");
        setMassSelectionStatus(`${mode === "add" ? "Draw around the area to add" : "Draw around the unwanted area"}. Release to update the selection.`);
        redraw();
    }

    function applySelectionRefinement() {
        const mode = interactionState.selectionRefineMode;
        try {
            const result = CoreEngine.refineMassSelection(interactionState.selectedMass, interactionState.lassoPoints, mode);
            interactionState.selectedMass = result.selection;
            updateSelectionHighlight();
            finishSelectionRefinement();
            $("applyMassValue").disabled = interactionState.selectedMass.size === 0;
            const action = mode === "add" ? "Added" : "Removed";
            setMassSelectionStatus(`${action} ${result.changed.toLocaleString()} image locations. Refine again or apply a new value.`);
            redraw();
        } catch (error) {
            finishSelectionRefinement();
            setMassSelectionStatus(error.message, true);
            redraw();
        }
    }

    function updateSelectionHighlight() {
        interactionState.selectionHighlightData = CoreEngine.createMassHighlight(interactionState.selectedMass);
    }

    function finishSelectionRefinement() {
        interactionState.selectionRefineMode = null;
        interactionState.drawingPointer = null;
        interactionState.lassoPoints = [];
        interactionState.lassoComplete = false;
        [$("addSelectionArea"), $("removeSelectionArea")].forEach(button => {
            button.classList.remove("active-mode");
            button.setAttribute("aria-pressed", "false");
            button.disabled = !interactionState.selectedMass;
        });
    }

    function cancelSelectionRefinement(message = "") {
        finishSelectionRefinement();
        $("applyMassValue").disabled = !interactionState.selectedMass || interactionState.selectedMass.size === 0;
        if (message) setMassSelectionStatus(message);
        redraw();
    }

    function applySelectedMassValue() {
        if (!documentState.mapData || !interactionState.selectedMass) return;
        const targetValue = Number($("selectedMassValue").value);
        try {
            const operation = {
                type: "mass-selection",
                spans: interactionState.selectedMass.spans.map(span => ({ ...span })),
                value: targetValue
            };
            const result = applyMassingOperation(documentState.mapData, operation);
            if (result.changed === 0) {
                setMassSelectionStatus(`The selected mass is already Value ${targetValue}.`);
                return;
            }
            documentState.mapData = result.imageData;
            recordMassingOperation(operation);
            cancelMassSelection();
            setUndoAvailable(true);
            setMassSelectionStatus(`Changed only the selected mass to Value ${targetValue}.`);
            setMassingStatus("The selected-mass change can be undone with Undo Last.");
            redraw();
        } catch (error) {
            setMassSelectionStatus(error.message, true);
        }
    }

    function clearMassSelectionState() {
        interactionState.massSelectionMode = false;
        interactionState.selectionRefineMode = null;
        interactionState.selectedMass = null;
        interactionState.featureSelectionActive = false;
        $("splitFeatureByValue").disabled = true;
        interactionState.selectionHighlightData = null;
        interactionState.drawingPointer = null;
        interactionState.lassoPoints = [];
        interactionState.lassoComplete = false;
        if (typeof viewport !== "undefined") viewport.setInteractionEnabled(true);
        if (typeof drawingSurface !== "undefined") drawingSurface.classList.remove("selecting-mass");
        const button = $("selectMass");
        if (button) {
            button.classList.remove("active-mode");
            button.setAttribute("aria-pressed", "false");
        }
        [$("addSelectionArea"), $("removeSelectionArea")].forEach(refineButton => {
            if (!refineButton) return;
            refineButton.classList.remove("active-mode");
            refineButton.setAttribute("aria-pressed", "false");
        });
    }

    function cancelMassSelection(message = "") {
        clearMassSelectionState();
        $("selectMass").disabled = !documentState.mapData;
        $("applyMassValue").disabled = true;
        $("addSelectionArea").disabled = true;
        $("removeSelectionArea").disabled = true;
        $("cancelMassSelection").disabled = true;
        if (message) setMassSelectionStatus(message);
        redraw();
    }

    function setMassSelectionStatus(message, error = false) {
        $("massSelectionStatus").textContent = message;
        $("massSelectionStatus").className = `mass-selection-status${error ? " error" : ""}`;
    }

    function beginPainting() {
        if (interactionState.paintMode) {
            endPainting("Painting finished.");
            return;
        }
        if (!documentState.mapData) return;
        exitExplicitPanMode();
        if (interactionState.drawingMode) cancelDrawing();
        if (interactionState.massSelectionMode) cancelMassSelection();
        if (!documentState.showingMap) {
            documentState.showingMap = true;
            $("showOriginal").textContent = "Show Original";
            updateMode();
        }
        interactionState.paintMode = true;
        interactionState.paintPaused = false;
        documentState.selectedPoint = documentState.measurement = null;
        $("emptyResult").hidden = false;
        $("measurementResult").hidden = true;
        viewport.setInteractionEnabled(true);
        viewport.setSinglePointerEnabled(false);
        drawingSurface.classList.add("painting-value");
        $("beginPainting").disabled = false;
        $("beginPainting").classList.add("active-mode");
        $("beginPainting").setAttribute("aria-pressed", "true");
        $("donePainting").disabled = false;
        setPaintStatus("Paint with one finger, mouse, or stylus. Pinch to zoom, or choose Pan Image to drag.");
        redraw();
    }

    function togglePanImage() {
        if (interactionState.paintMode) {
            finishBrushStroke();
            interactionState.paintPaused = !interactionState.paintPaused;
            interactionState.paintGestureBlocked = false;
            interactionState.paintPointers.clear();
            interactionState.brushCursorPoint = null;
            viewport.setSinglePointerEnabled(interactionState.paintPaused);
            drawingSurface.classList.toggle("painting-value", !interactionState.paintPaused);
            drawingSurface.classList.toggle("paint-pan", interactionState.paintPaused);
            setPanButtonActive(interactionState.paintPaused);
            setPaintStatus(interactionState.paintPaused ? "Pan mode: drag the image. Select Pan Image again to resume painting." : "Paint mode resumed.");
            redraw();
            return;
        }

        if (interactionState.drawingMode) cancelDrawing("Drawing cancelled to pan the image.");
        if (interactionState.massSelectionMode) cancelMassSelection("Selection cancelled to pan the image.");
        interactionState.explicitPanMode = !interactionState.explicitPanMode;
        viewport.setInteractionEnabled(true);
        viewport.setSinglePointerEnabled(true);
        viewport.setTapEnabled(!interactionState.explicitPanMode);
        drawingSurface.classList.toggle("explicit-pan", interactionState.explicitPanMode);
        setPanButtonActive(interactionState.explicitPanMode);
        if (interactionState.explicitPanMode) $("modeIndicator").textContent = "Pan Image";
        else updateMode();
    }

    function exitExplicitPanMode() {
        interactionState.explicitPanMode = false;
        if (typeof viewport !== "undefined") viewport.setTapEnabled(true);
        if (typeof drawingSurface !== "undefined") drawingSurface.classList.remove("explicit-pan");
        setPanButtonActive(false);
        updateMode();
    }

    function setPanButtonActive(active) {
        const button = $("panImage");
        if (!button) return;
        button.classList.toggle("active-mode", active);
        button.setAttribute("aria-pressed", String(active));
    }

    function handlePaintStart(event) {
        if (!interactionState.paintMode || interactionState.paintPaused || event.button > 0) return;
        event.preventDefault();
        interactionState.paintPointers.add(event.pointerId);
        if (interactionState.paintPointers.size > 1) {
            finishBrushStroke();
            interactionState.brushPointer = null;
            interactionState.paintGestureBlocked = true;
            interactionState.brushCursorPoint = null;
            redraw();
            return;
        }
        if (interactionState.paintGestureBlocked) return;
        const point = boundedImagePoint(event);
        if (!point) return;
        interactionState.brushPointer = event.pointerId;
        interactionState.brushPoints = [point];
        interactionState.brushStrokeChanged = 0;
        interactionState.brushCursorPoint = point;
        applyBrushSegment([point]);
        redraw();
    }

    function handlePaintMove(event) {
        if (!interactionState.paintMode || interactionState.paintPaused) return;
        const point = boundedImagePoint(event);
        if (point && interactionState.paintPointers.size < 2) interactionState.brushCursorPoint = point;
        if (event.pointerId === interactionState.brushPointer && interactionState.paintPointers.size === 1 && point) {
            const previous = interactionState.brushPoints[interactionState.brushPoints.length - 1];
            interactionState.brushPoints.push(point);
            applyBrushSegment([previous, point]);
        }
        redraw();
    }

    function handlePaintEnd(event) {
        if (!interactionState.paintMode) return;
        interactionState.paintPointers.delete(event.pointerId);
        if (event.pointerId === interactionState.brushPointer) {
            finishBrushStroke();
            interactionState.brushPointer = null;
        }
        if (interactionState.paintPointers.size === 0) interactionState.paintGestureBlocked = false;
        if (event.pointerType !== "mouse") interactionState.brushCursorPoint = null;
        redraw();
    }

    function handlePaintLeave(event) {
        if (interactionState.paintMode && event.pointerType === "mouse" && interactionState.brushPointer === null) {
            interactionState.brushCursorPoint = null;
            redraw();
        }
    }

    function applyBrushSegment(points) {
        const result = CoreEngine.applyBrushStrokeInPlace(documentState.mapData, points, Number($("paintValue").value), currentBrushRadius());
        documentState.mapData = result.imageData;
        interactionState.brushStrokeChanged += result.changed;
    }

    function finishBrushStroke() {
        if (!interactionState.brushPoints.length) return;
        if (interactionState.brushStrokeChanged > 0) {
            recordMassingOperation({
                type: "paint",
                points: interactionState.brushPoints.map(point => ({ x: point.x, y: point.y })),
                value: Number($("paintValue").value),
                radius: currentBrushRadius()
            });
            setUndoAvailable(true);
            setPaintStatus(`Painted one stroke (${interactionState.brushStrokeChanged.toLocaleString()} image locations changed).`);
        }
        interactionState.brushPoints = [];
        interactionState.brushStrokeChanged = 0;
    }

    function currentBrushRadius() {
        return CoreEngine.brushRadiusForSize(canvas.width, canvas.height, Number($("brushSize").value));
    }

    function clearPaintState() {
        interactionState.paintMode = false;
        interactionState.paintPaused = false;
        interactionState.brushPointer = null;
        interactionState.brushPoints = [];
        interactionState.brushStrokeChanged = 0;
        interactionState.brushCursorPoint = null;
        interactionState.paintGestureBlocked = false;
        interactionState.paintPointers.clear();
        if (typeof viewport !== "undefined") {
            viewport.setInteractionEnabled(true);
            viewport.setSinglePointerEnabled(true);
            viewport.setTapEnabled(true);
        }
        interactionState.explicitPanMode = false;
        if (typeof drawingSurface !== "undefined") drawingSurface.classList.remove("painting-value", "paint-pan", "explicit-pan");
        const paintButton = $("beginPainting");
        if (paintButton) {
            paintButton.classList.remove("active-mode");
            paintButton.setAttribute("aria-pressed", "false");
        }
        setPanButtonActive(false);
    }

    function endPainting(message = "") {
        finishBrushStroke();
        clearPaintState();
        $("beginPainting").disabled = !documentState.mapData;
        $("donePainting").disabled = true;
        if (message) setPaintStatus(message);
        redraw();
    }

    function setPaintStatus(message, error = false) {
        $("paintStatus").textContent = message;
        $("paintStatus").className = `paint-status${error ? " error" : ""}`;
    }

    function applyMassingOperation(imageData, operation) {
        if (operation.type === "paint") {
            return CoreEngine.applyBrushStroke(imageData, operation.points, operation.value, operation.radius);
        }
        if (operation.type === "mass-selection") {
            return CoreEngine.applyMassValue(imageData, operation.spans, operation.value);
        }
        return CoreEngine.applyPolygon(
            imageData,
            operation.points,
            operation.value
        );
    }

    function recordMassingOperation(operation) {
        editHistory.record(operation);
    }

    function setUndoAvailable(available) {
        $("undoMassing").disabled = !available;
        $("undoPaint").disabled = !available;
        $("undoSelection").disabled = !available;
    }

    function undoMassing() {
        if (interactionState.drawingMode) cancelDrawing();
        if (interactionState.massSelectionMode) cancelMassSelection();
        if (!editHistory.canUndo) {
            setUndoAvailable(false);
            setMassingStatus("Undo limit reached. There are no earlier massing changes available.");
            if (interactionState.paintMode) setPaintStatus("Undo limit reached. There are no earlier strokes available.");
            return;
        }
        const result = editHistory.undo();
        documentState.mapData = result.imageData;
        if (result.remaining === 0) {
            setUndoAvailable(false);
            setMassingStatus("Undo limit reached. There are no earlier massing changes available.");
            if (interactionState.paintMode) setPaintStatus("The last change was undone. Undo limit reached.");
        } else {
            setUndoAvailable(true);
            setMassingStatus("The last massing change was undone.");
            if (interactionState.paintMode) setPaintStatus("The last change was undone.");
        }
        redraw();
    }

    function cancelDrawing(message = "") {
        interactionState.drawingMode = false;
        interactionState.drawingPointer = null;
        interactionState.straightSegmentAnchorIndex = null;
        interactionState.lassoPoints = [];
        interactionState.lassoComplete = false;
        viewport.setInteractionEnabled(true);
        drawingSurface.classList.remove("drawing-area");
        $("drawArea").classList.remove("active-mode");
        $("drawArea").setAttribute("aria-pressed", "false");
        $("drawArea").disabled = !documentState.mapData;
        $("applyMassing").disabled = true;
        $("cancelMassing").disabled = true;
        if (message) setMassingStatus(message);
        redraw();
    }

    function setMassingStatus(message, error = false) {
        $("massingStatus").textContent = message;
        $("massingStatus").className = `massing-status${error ? " error" : ""}`;
    }

    function measure() {
        documentState.measurement = CoreEngine.measureValue(
            activeData(),
            documentState.selectedPoint.x,
            documentState.selectedPoint.y,
            Number($("sampleSize").value)
        );
        displayMeasurement();
        redraw();
    }
    function displayMeasurement() {
        const item = documentState.measurement;
        $("emptyResult").hidden = true;
        $("measurementResult").hidden = false;
        $("painterValue").textContent = item.value.toFixed(1);
        $("labL").textContent = item.lab.l.toFixed(1);
        $("labA").textContent = signed(item.lab.a);
        $("labB").textContent = signed(item.lab.b);
        $("rgbR").textContent = item.red;
        $("rgbG").textContent = item.green;
        $("rgbB").textContent = item.blue;
        $("hexValue").textContent = CoreEngine.rgbToHex(item.red, item.green, item.blue);
        $("sampleDimensions").textContent = `${item.width} × ${item.height}`;
        $("sampleCoordinates").textContent = `x ${documentState.selectedPoint.x}, y ${documentState.selectedPoint.y}`;
        $("colorPreview").style.background = CoreEngine.rgbToCss(item.red, item.green, item.blue);
        compare();
    }
    function signed(number) {
        const value = CoreEngine.roundTo(number, 1);
        return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
    }
    function compare() {
        const box = $("targetComparison");
        const raw = $("targetValue").value;
        const target = Number(raw);
        const tolerance = Number($("targetTolerance").value);
        if (!documentState.measurement || raw.trim() === "" || target < 1 || target > 10) { box.hidden = true; return; }
        const difference = documentState.measurement.value - target;
        const absolute = Math.abs(difference);
        box.hidden = false;
        box.className = `target-comparison ${absolute <= tolerance ? "good" : difference > 0 ? "too-light" : "too-dark"}`;
        $("targetMessage").textContent = absolute <= tolerance
            ? `On target: measured ${documentState.measurement.value.toFixed(1)}, planned ${target.toFixed(1)}.`
            : `Too ${difference > 0 ? "light" : "dark"} by ${absolute.toFixed(1)} value ${Math.abs(absolute - 1) < .05 ? "step" : "steps"}.`;
    }
});
