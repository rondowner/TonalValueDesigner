"use strict";

document.addEventListener("DOMContentLoaded", () => {
    const $ = id => document.getElementById(id);
    const canvas = $("imageCanvas");
    const context = canvas.getContext("2d", { willReadFrequently: true });
    if (!window.TonalValueDesignerColor || !window.TonalValueDesignerValueMap ||
        !window.TonalValueDesignerMassing || !window.TonalValueDesignerMassSelection || !window.TonalValueDesignerValueBrush ||
        !window.TonalValueDesignerViewport || !context) {
        document.body.textContent = "TonalValueDesigner could not start. Confirm that all project files are present.";
        return;
    }

    const release = window.TonalValueDesignerVersion || { version: "1.8.2", buildDate: "2026-07-29" };
    $("appVersion").textContent = `v${release.version}`;
    $("footerVersion").textContent = `v${release.version}`;
    $("buildDate").textContent = `Built ${release.buildDate}`;

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

    let selectedPoint = null;
    let measurement = null;
    let lastViewportScale = 1;
    let originalData = null;
    let mapData = null;
    let retainedValues = [];
    let showingMap = false;
    let sourceName = "value-map";
    let drawingMode = false;
    let drawingPointer = null;
    let lassoPoints = [];
    let lassoComplete = false;
    let baseMapData = null;
    let massingHistory = [];
    let massSelectionMode = false;
    let selectedMass = null;
    let selectionHighlightCanvas = null;
    let selectionRefineMode = null;
    let paintMode = false;
    let paintPaused = false;
    let brushPointer = null;
    let brushPoints = [];
    let brushStrokeChanged = 0;
    let brushCursorPoint = null;
    let paintGestureBlocked = false;
    let explicitPanMode = false;
    const paintPointers = new Set();
    const MASSING_UNDO_LIMIT = 10;

    const viewport = TonalValueDesignerViewport({
        container: $("canvasContainer"),
        stage: $("canvasStage"),
        canvas,
        onTap: point => {
            if (point.x >= 0 && point.y >= 0 && point.x < canvas.width && point.y < canvas.height) {
                selectedPoint = point;
                measure();
            }
        },
        onChange: scale => {
            $("zoomLevel").textContent = `${Math.round(scale * 100)}%`;

            // Redraw only when magnification changes. The badge is sized in
            // screen units, so this keeps it readable at every zoom level.
            if (measurement && Math.abs(scale - lastViewportScale) > 0.0001) {
                lastViewportScale = scale;
                redraw();
            } else {
                lastViewportScale = scale;
            }
        }
    });

    $("zoomIn").onclick = viewport.zoomIn;
    $("zoomOut").onclick = viewport.zoomOut;
    $("fitImage").onclick = viewport.fit;
    $("actualSize").onclick = viewport.actual;
    $("sampleSize").onchange = () => selectedPoint && measure();
    $("targetValue").oninput = compare;
    $("targetTolerance").onchange = compare;
    $("clearTargetButton").onclick = () => { $("targetValue").value = ""; compare(); };
    $("generateMap").onclick = generateMap;
    $("showOriginal").onclick = toggleOriginal;
    $("saveMap").onclick = saveMap;
    $("drawArea").onclick = beginDrawing;
    $("applyMassing").onclick = applyMassing;
    $("cancelMassing").onclick = () => cancelDrawing("Drawing cancelled.");
    $("undoMassing").onclick = undoMassing;
    $("undoPaint").onclick = undoMassing;
    $("selectMass").onclick = beginMassSelection;
    $("applyMassValue").onclick = applySelectedMassValue;
    $("addSelectionArea").onclick = () => beginSelectionRefinement("add");
    $("removeSelectionArea").onclick = () => beginSelectionRefinement("remove");
    $("cancelMassSelection").onclick = () => cancelMassSelection("Selection cancelled.");
    $("beginPainting").onclick = beginPainting;
    $("panImage").onclick = togglePanImage;
    $("donePainting").onclick = () => endPainting("Painting finished.");
    document.querySelectorAll("[data-values]").forEach(button => {
        button.onclick = () => { $("mapValues").value = button.dataset.values; };
    });
    setupTabs();
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
        if (paintMode && event.key === "Escape") {
            event.preventDefault();
            endPainting("Painting finished with Escape.");
        } else if (selectionRefineMode && event.key === "Escape") {
            event.preventDefault();
            cancelSelectionRefinement("Refinement cancelled; the selection is unchanged.");
        } else if (drawingMode && event.key === "Escape") {
            event.preventDefault();
            cancelDrawing("Drawing cancelled with Escape.");
        } else if (massSelectionMode && event.key === "Escape") {
            event.preventDefault();
            cancelMassSelection("Selection cancelled with Escape.");
        }
    });

    $("imageFile").addEventListener("change", event => {
        const file = event.target.files?.[0];
        if (!file) return;
        if (!file.type.startsWith("image/")) {
            $("fileName").textContent = "Please choose an image file.";
            return;
        }
        const url = URL.createObjectURL(file);
        const image = new Image();
        $("fileName").textContent = `Loading ${file.name}…`;
        image.onload = () => {
            URL.revokeObjectURL(url);
            canvas.width = image.naturalWidth;
            canvas.height = image.naturalHeight;
            context.drawImage(image, 0, 0);
            originalData = context.getImageData(0, 0, canvas.width, canvas.height);
            mapData = null;
            retainedValues = [];
            showingMap = false;
            selectedPoint = measurement = null;
            sourceName = file.name.replace(/\.[^.]+$/, "") || "value-map";
            resetMassing();
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
        };
        image.onerror = () => {
            URL.revokeObjectURL(url);
            $("fileName").textContent = "TonalValueDesigner could not open that image.";
        };
        image.src = url;
    });

    function activeData() { return showingMap && mapData ? mapData : originalData; }

    function setupTabs() {
        const buttons = [...document.querySelectorAll('[role="tab"]')];
        function activate(button, moveFocus = false) {
            if (drawingMode && button.id !== "massingTabButton") {
                cancelDrawing("Drawing cancelled when switching tools.");
            }
            if (massSelectionMode && button.id !== "massingTabButton") {
                cancelMassSelection("Selection cancelled when switching tools.");
            }
            if (paintMode && button.id !== "massingTabButton") {
                endPainting("Painting finished when switching tools.");
            }
            buttons.forEach(candidate => {
                const selected = candidate === button;
                candidate.setAttribute("aria-selected", String(selected));
                candidate.tabIndex = selected ? 0 : -1;
                $(candidate.getAttribute("aria-controls")).hidden = !selected;
            });
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
    function drawBase() {
        const data = activeData();
        if (data) context.putImageData(data, 0, 0);
    }
    function redraw() {
        drawBase();
        if (selectedMass && selectionHighlightCanvas) context.drawImage(selectionHighlightCanvas, 0, 0);
        if ((drawingMode || selectionRefineMode) && lassoPoints.length) drawLasso();
        else if (!selectedMass && selectedPoint) {
            drawCrosshair(selectedPoint.x, selectedPoint.y);
            if (measurement) drawValueBadge(selectedPoint.x, selectedPoint.y, measurement.value);
        }
        if (paintMode && !paintPaused && brushCursorPoint) drawBrushCursor();
    }

    function generateMap() {
        if (!originalData) { setMapStatus("Open a photograph first.", true); return; }
        let values;
        try { values = TonalValueDesignerValueMap.parseValues($("mapValues").value); }
        catch (error) { setMapStatus(error.message, true); return; }

        $("generateMap").disabled = true;
        setMapStatus("Generating value map…");
        requestAnimationFrame(() => {
            try {
                mapData = TonalValueDesignerValueMap.generate(originalData, values);
                retainedValues = values;
                showingMap = true;
                selectedPoint = measurement = null;
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
        if (!mapData) return;
        if (drawingMode) cancelDrawing("Drawing cancelled when the view changed.");
        if (massSelectionMode) cancelMassSelection("Selection cancelled when the view changed.");
        if (paintMode) endPainting("Painting finished when the view changed.");
        showingMap = !showingMap;
        $("showOriginal").textContent = showingMap ? "Show Original" : "Show Value Map";
        selectedPoint = measurement = null;
        $("emptyResult").hidden = false;
        $("measurementResult").hidden = true;
        redraw();
        updateMode();
    }

    function saveMap() {
        if (!mapData) return;
        const exportCanvas = document.createElement("canvas");
        exportCanvas.width = mapData.width;
        exportCanvas.height = mapData.height;
        exportCanvas.getContext("2d").putImageData(mapData, 0, 0);
        exportCanvas.toBlob(blob => {
            if (!blob) { setMapStatus("The browser could not create the PNG.", true); return; }
            const link = document.createElement("a");
            const values = retainedValues.join("-").replace(/\./g, "_");
            link.download = `${sourceName}-values-${values}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            setTimeout(() => URL.revokeObjectURL(link.href), 1000);
            setMapStatus(`Saved ${link.download}.`);
        }, "image/png");
    }

    function renderLegend() {
        const legend = $("valueLegend");
        legend.textContent = "";
        TonalValueDesignerValueMap.makeLegend(retainedValues).forEach(item => {
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
    function updateMode() { $("modeIndicator").textContent = explicitPanMode ? "Pan Image" : showingMap ? "Painter's Value Map" : "Original"; }

    function resetMassing() {
        clearPaintState();
        clearMassSelectionState();
        drawingMode = false;
        drawingPointer = null;
        lassoPoints = [];
        lassoComplete = false;
        baseMapData = null;
        massingHistory = [];
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
        $("paintValue").disabled = true;
        $("paintValue").innerHTML = "<option>Generate a value map first</option>";
        $("brushSize").disabled = true;
        $("beginPainting").disabled = true;
        $("donePainting").disabled = true;
        setPaintStatus("Generate a value map to enable painting.");
        setMassingStatus("Generate a value map to enable massing.");
        setMassSelectionStatus("Generate a value map to select individual masses.");
    }

    function prepareMassing(values) {
        if (drawingMode) cancelDrawing();
        if (massSelectionMode) cancelMassSelection();
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
        baseMapData = TonalValueDesignerMassing.cloneImageData(mapData);
        massingHistory = [];
        setUndoAvailable(false);
        paintSelect.disabled = false;
        $("brushSize").disabled = false;
        $("beginPainting").disabled = false;
        $("donePainting").disabled = true;
        setPaintStatus("Choose a value and brush size, then select Paint Value.");
        setMassingStatus("Choose a value, then draw a free-form boundary around the area to simplify.");
        setMassSelectionStatus("Choose Select Mass, then tap or click one shape in the value map.");
    }

    function beginDrawing() {
        if (!mapData) return;
        exitExplicitPanMode();
        if (paintMode) endPainting();
        if (massSelectionMode) cancelMassSelection();
        if (!showingMap) {
            showingMap = true;
            $("showOriginal").textContent = "Show Original";
            updateMode();
        }
        drawingMode = true;
        drawingPointer = null;
        lassoPoints = [];
        lassoComplete = false;
        selectedPoint = measurement = null;
        $("emptyResult").hidden = false;
        $("measurementResult").hidden = true;
        viewport.setInteractionEnabled(false);
        drawingSurface.classList.add("drawing-area");
        $("drawArea").disabled = true;
        $("drawArea").classList.add("active-mode");
        $("drawArea").setAttribute("aria-pressed", "true");
        $("applyMassing").disabled = true;
        $("cancelMassing").disabled = false;
        setMassingStatus("Draw around the area. Release to close the boundary.");
        redraw();
    }

    function handleDrawingStart(event) {
        if ((!drawingMode && !selectionRefineMode) || drawingPointer !== null) return;
        event.preventDefault();
        drawingPointer = event.pointerId;
        drawingSurface.setPointerCapture(event.pointerId);
        const point = boundedImagePoint(event);
        lassoPoints = point ? [point] : [];
        lassoComplete = false;
        redraw();
    }

    function handleDrawingMove(event) {
        if ((!drawingMode && !selectionRefineMode) || event.pointerId !== drawingPointer || !lassoPoints.length) return;
        event.preventDefault();
        const point = boundedImagePoint(event);
        if (!point) return;
        const previous = lassoPoints[lassoPoints.length - 1];
        const minimumSpacing = Math.max(1, 2 / viewport.getScale());
        if (Math.hypot(point.x - previous.x, point.y - previous.y) >= minimumSpacing) {
            lassoPoints.push(point);
            redraw();
        }
    }

    function handleDrawingEnd(event) {
        if ((!drawingMode && !selectionRefineMode) || event.pointerId !== drawingPointer) return;
        event.preventDefault();
        drawingPointer = null;
        if (lassoPoints.length < 3) {
            lassoPoints = [];
            if (selectionRefineMode) setMassSelectionStatus("The boundary was too small. Draw a larger enclosed area.", true);
            else setMassingStatus("The boundary was too small. Draw a larger enclosed area.", true);
            redraw();
            return;
        }
        if (selectionRefineMode) {
            applySelectionRefinement();
            return;
        }
        lassoComplete = true;
        $("applyMassing").disabled = false;
        setMassingStatus("Boundary ready. Apply the selected value or cancel and redraw.");
        redraw();
    }

    function handleDrawingCancel(event) {
        if ((drawingMode || selectionRefineMode) && event.pointerId === drawingPointer) {
            drawingPointer = null;
            lassoPoints = [];
            lassoComplete = false;
            if (selectionRefineMode) setMassSelectionStatus("Refinement interrupted. Draw the boundary again.", true);
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
        if (!mapData || !lassoComplete || lassoPoints.length < 3) return;
        const targetValue = Number($("massingValue").value);
        try {
            const operation = {
                type: "directed",
                points: lassoPoints.map(point => ({ x: point.x, y: point.y })),
                value: targetValue
            };
            const result = applyMassingOperation(mapData, operation);
            mapData = result.imageData;
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
        if (!mapData) return;
        exitExplicitPanMode();
        if (paintMode) endPainting();
        if (drawingMode) cancelDrawing();
        if (!showingMap) {
            showingMap = true;
            $("showOriginal").textContent = "Show Original";
            updateMode();
        }
        massSelectionMode = true;
        selectionRefineMode = null;
        selectedMass = null;
        selectionHighlightCanvas = null;
        selectedPoint = measurement = null;
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
        if (!massSelectionMode || selectionRefineMode || event.button > 0) return;
        event.preventDefault();
        const point = boundedImagePoint(event);
        if (!point) {
            setMassSelectionStatus("Tap or click inside the value map.", true);
            return;
        }
        try {
            selectedMass = TonalValueDesignerMassSelection.identify(mapData, point.x, point.y);
            updateSelectionHighlight();
            $("applyMassValue").disabled = false;
            $("addSelectionArea").disabled = false;
            $("removeSelectionArea").disabled = false;
            const sourceValue = retainedValues.reduce((nearest, value) =>
                Math.abs(TonalValueDesignerValueMap.grayForPainterValue(value) - selectedMass.sourceGray) <
                Math.abs(TonalValueDesignerValueMap.grayForPainterValue(nearest) - selectedMass.sourceGray) ? value : nearest
            );
            $("selectedMassValue").value = String(sourceValue);
            setMassSelectionStatus(`Selected one Value ${sourceValue} mass. Choose its new value, then apply.`);
            redraw();
        } catch (error) {
            setMassSelectionStatus(error.message, true);
        }
    }

    function beginSelectionRefinement(mode) {
        if (!selectedMass || selectionRefineMode) return;
        selectionRefineMode = mode;
        drawingPointer = null;
        lassoPoints = [];
        lassoComplete = false;
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
        const mode = selectionRefineMode;
        try {
            const result = TonalValueDesignerMassSelection.refine(selectedMass, lassoPoints, mode);
            selectedMass = result.selection;
            updateSelectionHighlight();
            finishSelectionRefinement();
            $("applyMassValue").disabled = selectedMass.size === 0;
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
        const overlay = TonalValueDesignerMassSelection.createHighlight(selectedMass);
        selectionHighlightCanvas = document.createElement("canvas");
        selectionHighlightCanvas.width = overlay.width;
        selectionHighlightCanvas.height = overlay.height;
        selectionHighlightCanvas.getContext("2d").putImageData(overlay, 0, 0);
    }

    function finishSelectionRefinement() {
        selectionRefineMode = null;
        drawingPointer = null;
        lassoPoints = [];
        lassoComplete = false;
        [$("addSelectionArea"), $("removeSelectionArea")].forEach(button => {
            button.classList.remove("active-mode");
            button.setAttribute("aria-pressed", "false");
            button.disabled = !selectedMass;
        });
    }

    function cancelSelectionRefinement(message = "") {
        finishSelectionRefinement();
        $("applyMassValue").disabled = !selectedMass || selectedMass.size === 0;
        if (message) setMassSelectionStatus(message);
        redraw();
    }

    function applySelectedMassValue() {
        if (!mapData || !selectedMass) return;
        const targetValue = Number($("selectedMassValue").value);
        try {
            const operation = {
                type: "mass-selection",
                spans: selectedMass.spans.map(span => ({ ...span })),
                value: targetValue
            };
            const result = applyMassingOperation(mapData, operation);
            if (result.changed === 0) {
                setMassSelectionStatus(`The selected mass is already Value ${targetValue}.`);
                return;
            }
            mapData = result.imageData;
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
        massSelectionMode = false;
        selectionRefineMode = null;
        selectedMass = null;
        selectionHighlightCanvas = null;
        drawingPointer = null;
        lassoPoints = [];
        lassoComplete = false;
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
        $("selectMass").disabled = !mapData;
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
        if (paintMode) {
            endPainting("Painting finished.");
            return;
        }
        if (!mapData) return;
        exitExplicitPanMode();
        if (drawingMode) cancelDrawing();
        if (massSelectionMode) cancelMassSelection();
        if (!showingMap) {
            showingMap = true;
            $("showOriginal").textContent = "Show Original";
            updateMode();
        }
        paintMode = true;
        paintPaused = false;
        selectedPoint = measurement = null;
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
        if (paintMode) {
            finishBrushStroke();
            paintPaused = !paintPaused;
            paintGestureBlocked = false;
            paintPointers.clear();
            brushCursorPoint = null;
            viewport.setSinglePointerEnabled(paintPaused);
            drawingSurface.classList.toggle("painting-value", !paintPaused);
            drawingSurface.classList.toggle("paint-pan", paintPaused);
            setPanButtonActive(paintPaused);
            setPaintStatus(paintPaused ? "Pan mode: drag the image. Select Pan Image again to resume painting." : "Paint mode resumed.");
            redraw();
            return;
        }

        if (drawingMode) cancelDrawing("Drawing cancelled to pan the image.");
        if (massSelectionMode) cancelMassSelection("Selection cancelled to pan the image.");
        explicitPanMode = !explicitPanMode;
        viewport.setInteractionEnabled(true);
        viewport.setSinglePointerEnabled(true);
        viewport.setTapEnabled(!explicitPanMode);
        drawingSurface.classList.toggle("explicit-pan", explicitPanMode);
        setPanButtonActive(explicitPanMode);
        if (explicitPanMode) $("modeIndicator").textContent = "Pan Image";
        else updateMode();
    }

    function exitExplicitPanMode() {
        explicitPanMode = false;
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
        if (!paintMode || paintPaused || event.button > 0) return;
        event.preventDefault();
        paintPointers.add(event.pointerId);
        if (paintPointers.size > 1) {
            finishBrushStroke();
            brushPointer = null;
            paintGestureBlocked = true;
            brushCursorPoint = null;
            redraw();
            return;
        }
        if (paintGestureBlocked) return;
        const point = boundedImagePoint(event);
        if (!point) return;
        brushPointer = event.pointerId;
        brushPoints = [point];
        brushStrokeChanged = 0;
        brushCursorPoint = point;
        applyBrushSegment([point]);
        redraw();
    }

    function handlePaintMove(event) {
        if (!paintMode || paintPaused) return;
        const point = boundedImagePoint(event);
        if (point && paintPointers.size < 2) brushCursorPoint = point;
        if (event.pointerId === brushPointer && paintPointers.size === 1 && point) {
            const previous = brushPoints[brushPoints.length - 1];
            brushPoints.push(point);
            applyBrushSegment([previous, point]);
        }
        redraw();
    }

    function handlePaintEnd(event) {
        if (!paintMode) return;
        paintPointers.delete(event.pointerId);
        if (event.pointerId === brushPointer) {
            finishBrushStroke();
            brushPointer = null;
        }
        if (paintPointers.size === 0) paintGestureBlocked = false;
        if (event.pointerType !== "mouse") brushCursorPoint = null;
        redraw();
    }

    function handlePaintLeave(event) {
        if (paintMode && event.pointerType === "mouse" && brushPointer === null) {
            brushCursorPoint = null;
            redraw();
        }
    }

    function applyBrushSegment(points) {
        const result = TonalValueDesignerValueBrush.applyStrokeInPlace(mapData, points, Number($("paintValue").value), currentBrushRadius());
        mapData = result.imageData;
        brushStrokeChanged += result.changed;
    }

    function finishBrushStroke() {
        if (!brushPoints.length) return;
        if (brushStrokeChanged > 0) {
            recordMassingOperation({
                type: "paint",
                points: brushPoints.map(point => ({ x: point.x, y: point.y })),
                value: Number($("paintValue").value),
                radius: currentBrushRadius()
            });
            setUndoAvailable(true);
            setPaintStatus(`Painted one stroke (${brushStrokeChanged.toLocaleString()} image locations changed).`);
        }
        brushPoints = [];
        brushStrokeChanged = 0;
    }

    function currentBrushRadius() {
        return TonalValueDesignerValueBrush.radiusForSize(canvas.width, canvas.height, Number($("brushSize").value));
    }

    function drawBrushCursor() {
        context.save();
        context.beginPath();
        context.arc(brushCursorPoint.x, brushCursorPoint.y, currentBrushRadius(), 0, Math.PI * 2);
        context.lineWidth = Math.max(1, 2 / viewport.getScale());
        context.strokeStyle = "rgba(0,0,0,.9)";
        context.stroke();
        context.lineWidth = Math.max(1, 1 / viewport.getScale());
        context.strokeStyle = "white";
        context.stroke();
        context.restore();
    }

    function clearPaintState() {
        paintMode = false;
        paintPaused = false;
        brushPointer = null;
        brushPoints = [];
        brushStrokeChanged = 0;
        brushCursorPoint = null;
        paintGestureBlocked = false;
        paintPointers.clear();
        if (typeof viewport !== "undefined") {
            viewport.setInteractionEnabled(true);
            viewport.setSinglePointerEnabled(true);
            viewport.setTapEnabled(true);
        }
        explicitPanMode = false;
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
        $("beginPainting").disabled = !mapData;
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
            return TonalValueDesignerValueBrush.applyStroke(imageData, operation.points, operation.value, operation.radius);
        }
        if (operation.type === "mass-selection") {
            return TonalValueDesignerMassSelection.apply(imageData, operation.spans, operation.value);
        }
        return TonalValueDesignerMassing.applyPolygon(
            imageData,
            operation.points,
            operation.value
        );
    }

    function recordMassingOperation(operation) {
        massingHistory.push(operation);
        if (massingHistory.length > MASSING_UNDO_LIMIT) {
            const committedOperation = massingHistory.shift();
            baseMapData = applyMassingOperation(baseMapData, committedOperation).imageData;
        }
    }

    function setUndoAvailable(available) {
        $("undoMassing").disabled = !available;
        $("undoPaint").disabled = !available;
    }

    function undoMassing() {
        if (drawingMode) cancelDrawing();
        if (massSelectionMode) cancelMassSelection();
        if (!massingHistory.length || !baseMapData) {
            setUndoAvailable(false);
            setMassingStatus("Undo limit reached. There are no earlier massing changes available.");
            if (paintMode) setPaintStatus("Undo limit reached. There are no earlier strokes available.");
            return;
        }
        massingHistory.pop();
        rebuildMassingHistory();
        if (massingHistory.length === 0) {
            setUndoAvailable(false);
            setMassingStatus("Undo limit reached. There are no earlier massing changes available.");
            if (paintMode) setPaintStatus("The last change was undone. Undo limit reached.");
        } else {
            setUndoAvailable(true);
            setMassingStatus("The last massing change was undone.");
            if (paintMode) setPaintStatus("The last change was undone.");
        }
        redraw();
    }

    function rebuildMassingHistory() {
        let rebuilt = baseMapData;
        for (const operation of massingHistory) {
            rebuilt = applyMassingOperation(rebuilt, operation).imageData;
        }
        mapData = rebuilt;
    }

    function cancelDrawing(message = "") {
        drawingMode = false;
        drawingPointer = null;
        lassoPoints = [];
        lassoComplete = false;
        viewport.setInteractionEnabled(true);
        drawingSurface.classList.remove("drawing-area");
        $("drawArea").classList.remove("active-mode");
        $("drawArea").setAttribute("aria-pressed", "false");
        $("drawArea").disabled = !mapData;
        $("applyMassing").disabled = true;
        $("cancelMassing").disabled = true;
        if (message) setMassingStatus(message);
        redraw();
    }

    function setMassingStatus(message, error = false) {
        $("massingStatus").textContent = message;
        $("massingStatus").className = `massing-status${error ? " error" : ""}`;
    }

    function drawLasso() {
        if (lassoPoints.length < 2) return;
        context.save();
        context.beginPath();
        context.moveTo(lassoPoints[0].x, lassoPoints[0].y);
        for (let index = 1; index < lassoPoints.length; index += 1) {
            context.lineTo(lassoPoints[index].x, lassoPoints[index].y);
        }
        if (lassoComplete) context.closePath();
        context.lineWidth = Math.max(1, 2 / viewport.getScale());
        context.setLineDash([6 / viewport.getScale(), 4 / viewport.getScale()]);
        context.strokeStyle = "#ff3b30";
        context.stroke();
        context.setLineDash([]);
        context.lineWidth = Math.max(1, 1 / viewport.getScale());
        context.strokeStyle = "white";
        context.stroke();
        context.restore();
    }

    function averagePixels(centerX, centerY, requestedSize) {
        const half = Math.floor(requestedSize / 2);
        const left = Math.max(0, centerX - half);
        const top = Math.max(0, centerY - half);
        const right = Math.min(canvas.width - 1, centerX + half);
        const bottom = Math.min(canvas.height - 1, centerY + half);
        const width = right - left + 1;
        const height = bottom - top + 1;
        const pixels = context.getImageData(left, top, width, height).data;
        let red = 0, green = 0, blue = 0, alpha = 0;
        for (let index = 0; index < pixels.length; index += 4) {
            const weight = pixels[index + 3] / 255;
            red += pixels[index] * weight;
            green += pixels[index + 1] * weight;
            blue += pixels[index + 2] * weight;
            alpha += weight;
        }
        return { red: alpha ? Math.round(red / alpha) : 0, green: alpha ? Math.round(green / alpha) : 0, blue: alpha ? Math.round(blue / alpha) : 0, width, height };
    }

    function measure() {
        drawBase();
        const color = averagePixels(selectedPoint.x, selectedPoint.y, Number($("sampleSize").value));
        const lab = TonalValueDesignerColor.rgbToLab(color.red, color.green, color.blue);
        measurement = { ...color, lab, value: TonalValueDesignerColor.labLightnessToRoundedPainterValue(lab.l) };
        displayMeasurement();
        redraw();
    }
    function displayMeasurement() {
        const item = measurement;
        $("emptyResult").hidden = true;
        $("measurementResult").hidden = false;
        $("painterValue").textContent = item.value.toFixed(1);
        $("labL").textContent = item.lab.l.toFixed(1);
        $("labA").textContent = signed(item.lab.a);
        $("labB").textContent = signed(item.lab.b);
        $("rgbR").textContent = item.red;
        $("rgbG").textContent = item.green;
        $("rgbB").textContent = item.blue;
        $("hexValue").textContent = TonalValueDesignerColor.rgbToHex(item.red, item.green, item.blue);
        $("sampleDimensions").textContent = `${item.width} × ${item.height}`;
        $("sampleCoordinates").textContent = `x ${selectedPoint.x}, y ${selectedPoint.y}`;
        $("colorPreview").style.background = TonalValueDesignerColor.rgbToCss(item.red, item.green, item.blue);
        compare();
    }
    function signed(number) {
        const value = TonalValueDesignerColor.roundTo(number, 1);
        return `${value > 0 ? "+" : ""}${value.toFixed(1)}`;
    }
    function compare() {
        const box = $("targetComparison");
        const raw = $("targetValue").value;
        const target = Number(raw);
        const tolerance = Number($("targetTolerance").value);
        if (!measurement || raw.trim() === "" || target < 1 || target > 10) { box.hidden = true; return; }
        const difference = measurement.value - target;
        const absolute = Math.abs(difference);
        box.hidden = false;
        box.className = `target-comparison ${absolute <= tolerance ? "good" : difference > 0 ? "too-light" : "too-dark"}`;
        $("targetMessage").textContent = absolute <= tolerance
            ? `On target: measured ${measurement.value.toFixed(1)}, planned ${target.toFixed(1)}.`
            : `Too ${difference > 0 ? "light" : "dark"} by ${absolute.toFixed(1)} value ${Math.abs(absolute - 1) < .05 ? "step" : "steps"}.`;
    }
    function drawCrosshair(x, y) {
        const radius = TonalValueDesignerColor.clamp(Math.min(canvas.width, canvas.height) * .018, 8, 30);
        const width = TonalValueDesignerColor.clamp(Math.min(canvas.width, canvas.height) * .002, 2, 5);
        context.save();
        [["rgba(0,0,0,.9)", width + 2], ["rgba(255,255,255,.95)", width]].forEach(([stroke, lineWidth]) => {
            context.strokeStyle = stroke; context.lineWidth = lineWidth; context.beginPath();
            context.arc(x, y, radius, 0, Math.PI * 2);
            context.moveTo(x - radius * 1.45, y); context.lineTo(x - radius * .35, y);
            context.moveTo(x + radius * .35, y); context.lineTo(x + radius * 1.45, y);
            context.moveTo(x, y - radius * 1.45); context.lineTo(x, y - radius * .35);
            context.moveTo(x, y + radius * .35); context.lineTo(x, y + radius * 1.45);
            context.stroke();
        });
        context.restore();
    }

    function drawValueBadge(x, y, value) {
        const scale = Math.max(viewport.getScale(), 0.01);
        const text = `Value ${Number(value).toFixed(1)}`;
        const fontSize = 16 / scale;
        const horizontalPadding = 9 / scale;
        const badgeHeight = 32 / scale;
        const gap = 14 / scale;
        const radius = 6 / scale;

        context.save();
        context.font = `700 ${fontSize}px -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`;
        context.textAlign = "left";
        context.textBaseline = "middle";

        const badgeWidth = context.measureText(text).width + horizontalPadding * 2;
        let badgeX = x + gap;
        let badgeY = y - gap - badgeHeight;

        // Flip the badge when the preferred position would cross an image
        // edge, then keep the complete label within the photograph.
        if (badgeX + badgeWidth > canvas.width) badgeX = x - gap - badgeWidth;
        if (badgeY < 0) badgeY = y + gap;
        badgeX = TonalValueDesignerColor.clamp(badgeX, 0, Math.max(0, canvas.width - badgeWidth));
        badgeY = TonalValueDesignerColor.clamp(badgeY, 0, Math.max(0, canvas.height - badgeHeight));

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
        context.lineWidth = 1.5 / scale;
        context.stroke();

        context.fillStyle = "#ffffff";
        context.fillText(text, badgeX + horizontalPadding, badgeY + badgeHeight / 2);
        context.restore();
    }
});
