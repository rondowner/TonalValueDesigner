"use strict";

window.TonalValueDesignerFeatureSegmentation = (() => {
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
