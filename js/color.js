"use strict";



/*

    ============================================================

    TonalValueDesigner prototype

    color.js



    This file contains color-conversion and value-estimation

    functions.



    It converts:



        sRGB, using 0â€“255 channel values

            â†“

        Linear RGB

            â†“

        CIE XYZ, using a D65 white point

            â†“

        CIELAB L*, a*, b*



    It also converts CIELAB L* into an approximate 1â€“10

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

        original 0â€“255 values by a matrix.



        We first normalize each channel to 0â€“1, then remove the

        sRGB transfer curve.

    */





    /**

     * Convert one sRGB channel from 0â€“255 into linear RGB 0â€“1.

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



        XYZ values are returned on the conventional 0â€“100 scale.

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



        a* describes roughly green â†” red.



        b* describes roughly blue â†” yellow.

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



            L* 0     â†’ painter's value 1

            L* 100   â†’ painter's value 10



        That gives:



            value = 1 + 9 Ã— (L* / 100)



        Examples:



            L* 0     â†’ 1.0

            L* 25    â†’ 3.3

            L* 50    â†’ 5.5

            L* 75    â†’ 7.8

            L* 100   â†’ 10.0



        This avoids treating black as Value 0, because the user

        requested a 1â€“10 scale.



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

export default TonalValueDesignerColor;
