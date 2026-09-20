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
        }
        if (brush) drawBrushCursor(brush.point, brush.radius);
    }

    return Object.freeze({ drawSourceImage, render });
}

export default createCanvasRenderer;
