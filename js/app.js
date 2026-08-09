"use strict";

import TonalValueDesignerVersion from "./version.js?v=2.9.1";
import CoreEngine from "./coreEngine.js?v=2.9.1";
import TonalValueDesignerViewport from "./viewport.js?v=2.9.1";
import TonalValueDesignerFeatureSegmentation from "./featureSegmentation.js?v=2.9.1";
import BrowserPlatform from "./browserPlatform.js?v=2.9.1";
import createEditHistory from "./editHistory.js?v=2.9.1";
import createDocumentState from "./documentState.js?v=2.9.1";
import createInteractionState from "./interactionState.js?v=2.9.1";
import createCanvasRenderer from "./canvasRenderer.js?v=2.9.1";

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
    $("buildDate").textContent = `Built ${release.buildDate}`;

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
