"use strict";

import TonalValueDesignerColor from "./color.js?v=2.9.5";
import TonalValueDesignerValueMap from "./valueMap.js?v=2.9.5";
import TonalValueDesignerMassing from "./massing.js?v=2.9.5";
import TonalValueDesignerMassSelection from "./massSelection.js?v=2.9.5";
import TonalValueDesignerValueBrush from "./valueBrush.js?v=2.9.5";
import TonalValueDesignerMeasurement from "./measurement.js?v=2.9.5";

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

export default CoreEngine;
