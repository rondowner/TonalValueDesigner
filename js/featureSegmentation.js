"use strict";

window.TonalValueDesignerFeatureSegmentation = (() => {
    const LIBRARY_URL = "https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/+esm";
    const MODEL_ID = "Xenova/segformer-b0-finetuned-ade-512-512";
    const ANALYSIS_LIMIT = 768;
    const MINIMUM_REGION_FRACTION = 0.001;
    const MINIMUM_FEATURE_FRACTION = 0.02;
    let segmenterPromise = null;

    function titleCase(label) {
        return String(label).trim().replace(/\b\w/g, letter => letter.toUpperCase());
    }

    function report(callback, message) {
        if (typeof callback === "function") callback(message);
    }

    async function loadSegmenter(onProgress) {
        if (!segmenterPromise) {
            segmenterPromise = (async () => {
                report(onProgress, "Loading the local AI engine…");
                const { pipeline } = await import(LIBRARY_URL);
                return pipeline("image-segmentation", MODEL_ID, {
                    dtype: "q8",
                    progress_callback: progress => {
                        if (!progress || !progress.status) return;
                        if (progress.status === "progress" && Number.isFinite(progress.progress)) {
                            report(onProgress, `Downloading the AI model… ${Math.round(progress.progress)}%`);
                        } else if (progress.status === "ready") {
                            report(onProgress, "AI model ready. Analyzing broad features…");
                        }
                    }
                });
            })().catch(error => {
                segmenterPromise = null;
                throw error;
            });
        } else report(onProgress, "Using the cached AI model. Analyzing broad features…");
        return segmenterPromise;
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
        return analysis.toDataURL("image/jpeg", 0.9);
    }

    function maskValue(mask, index, channels) {
        if (channels === 1) return mask.data[index];
        const offset = index * channels;
        if (channels >= 4 && mask.data[offset + 3] > 0) return mask.data[offset + 3];
        return Math.max(mask.data[offset], mask.data[offset + 1] || 0, mask.data[offset + 2] || 0);
    }

    function connectedRegions(mask) {
        const width = mask.width;
        const height = mask.height;
        const pixelCount = width * height;
        const channels = Math.max(1, Math.round(mask.data.length / pixelCount));
        const componentAt = new Int32Array(pixelCount);
        componentAt.fill(-1);
        const sizes = [];
        const stack = [];

        function active(index) {
            return maskValue(mask, index, channels) > 127;
        }

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
                const neighbors = [];
                if (x > 0) neighbors.push(index - 1);
                if (x + 1 < width) neighbors.push(index + 1);
                if (index >= width) neighbors.push(index - width);
                if (index + width < pixelCount) neighbors.push(index + width);
                for (const neighbor of neighbors) {
                    if (componentAt[neighbor] === -1 && active(neighbor)) {
                        componentAt[neighbor] = component;
                        stack.push(neighbor);
                    }
                }
            }
            sizes.push(size);
        }
        return { componentAt, sizes, width, height };
    }

    function regionsToFeatures(label, regions, targetWidth, targetHeight) {
        const minimumSize = Math.max(8, Math.round(regions.width * regions.height * MINIMUM_REGION_FRACTION));
        let retainedIds = regions.sizes
            .map((size, id) => ({ id, size }))
            .filter(item => item.size >= minimumSize)
            .sort((first, second) => second.size - first.size);
        if (!retainedIds.length && regions.sizes.length) {
            const largest = regions.sizes.reduce((best, size, id) => size > best.size ? { id, size } : best, { id: 0, size: -1 });
            retainedIds = [largest];
        }
        const featureById = new Map(retainedIds.map(item => [item.id, {
            label: String(label).trim(),
            name: "",
            spans: [],
            size: 0,
            width: targetWidth,
            height: targetHeight,
            sourceGray: 0
        }]));

        for (let y = 0; y < targetHeight; y += 1) {
            const sourceY = Math.min(regions.height - 1, Math.floor(y * regions.height / targetHeight));
            let sourceX = 0;
            while (sourceX < regions.width) {
                const id = regions.componentAt[sourceY * regions.width + sourceX];
                const runStart = sourceX;
                while (sourceX + 1 < regions.width && regions.componentAt[sourceY * regions.width + sourceX + 1] === id) sourceX += 1;
                const feature = featureById.get(id);
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

        const features = retainedIds.map(item => featureById.get(item.id)).filter(feature => feature.size > 0);
        features.forEach((feature, index) => {
            feature.name = features.length === 1 ? titleCase(label) : `${titleCase(label)} ${index + 1}`;
        });
        return features;
    }

    function extractFeatures(output, width, height) {
        const features = [];
        for (const result of output || []) {
            if (!result?.mask?.data || !result.mask.width || !result.mask.height) continue;
            const regions = connectedRegions(result.mask);
            features.push(...regionsToFeatures(result.label, regions, width, height));
        }
        return features
            .filter(feature => feature.size >= width * height * MINIMUM_FEATURE_FRACTION)
            .sort((first, second) => second.size - first.size)
            .slice(0, 40);
    }

    function splitByValue(feature, mapData, retainedValues, grayForPainterValue) {
        if (!feature?.spans?.length || !mapData || !retainedValues?.length || typeof grayForPainterValue !== "function") {
            throw new Error("Select an analyzed feature and generate a value map before splitting.");
        }
        function painterValueForGray(gray) {
            return retainedValues.reduce((nearest, value) =>
                Math.abs(grayForPainterValue(value) - gray) < Math.abs(grayForPainterValue(nearest) - gray) ? value : nearest
            );
        }
        const divisions = new Map(retainedValues.map(value => [value, {
            label: feature.label,
            name: `${feature.name} — Value ${value}`,
            spans: [],
            size: 0,
            width: feature.width,
            height: feature.height,
            sourceGray: grayForPainterValue(value),
            parentFeature: feature,
            painterValue: value
        }]));

        for (const span of feature.spans) {
            let x = span.startX;
            while (x <= span.endX) {
                const value = painterValueForGray(mapData.data[(span.y * mapData.width + x) * 4]);
                const runStart = x;
                while (x + 1 <= span.endX &&
                    painterValueForGray(mapData.data[(span.y * mapData.width + x + 1) * 4]) === value) x += 1;
                const division = divisions.get(value);
                division.spans.push({ y: span.y, startX: runStart, endX: x });
                division.size += x - runStart + 1;
                x += 1;
            }
        }

        const minimumDivisionSize = Math.max(1, Math.round(feature.size * 0.02));
        return [...divisions.values()]
            .filter(division => division.size >= minimumDivisionSize)
            .sort((first, second) => second.size - first.size);
    }

    async function analyze(imageData, onProgress) {
        if (!imageData) throw new Error("Open a reference image first.");
        const segmenter = await loadSegmenter(onProgress);
        report(onProgress, "Analyzing broad features on this device…");
        const output = await segmenter(makeAnalysisImage(imageData));
        const features = extractFeatures(output, imageData.width, imageData.height);
        if (!features.length) throw new Error("The AI did not find any sufficiently large features in this image.");
        return features;
    }

    return Object.freeze({ analyze, extractFeatures, splitByValue, modelId: MODEL_ID });
})();
