"use strict";

// Guidance preferences belong to this browser; no account or server is needed.
export default function setupGuidance() {
    const key = "tvd-guidance-v1";
    const $ = id => document.getElementById(id);
    let preferences = { seen: [], skip: false };
    try {
        const saved = JSON.parse(localStorage.getItem(key) || "null");
        if (saved && Array.isArray(saved.seen)) preferences = { seen: saved.seen, skip: Boolean(saved.skip) };
    } catch { /* Guidance remains usable when storage is unavailable. */ }
    const dialog = $("guidanceDialog");
    let currentId = "welcome";
    const introductions = {
        welcome: ["Welcome to TonalValueDesigner", "Explore and simplify a reference image to develop a value plan for your painting.", [
            "Open a photograph from your device.",
            "Create a value map using your chosen values.",
            "Simplify and adjust value shapes to explore your composition.",
            "Save your study, then use Value Sampling to check your painted values.",
            "The Eye Trainer helps you practice judging values and colors with greater confidence."
        ]],
        samplingTabButton: ["Value Sampling", "Select a representative area of the image to estimate its Painter's Value.", ["Tap or click the image; the value appears beside your selection.", "Expand Sampling Options to change the averaging area. Photograph painted swatches in the same lighting and orientation as your painting."]],
        mapTabButton: ["Create a Value Map", "Reduce the reference to a few intentional value groups to explore its design.", ["Choose a preset or enter the values you want, then select Generate Map.", "Select the value labels to isolate groups. Continuous B&W and Side-by-Side Compare help you compare the study with the reference.", "Save PNG exports the complete value map."]],
        massingTabButton: ["Value Massing", "Simplified, connected value shapes give you control.", ["Use Squint to explore larger shapes, By Area to assign a value inside a boundary, or Paint Value to paint over distracting detail.", "Select and Adjust Value Mass changes an individual connected shape. Undo Last lets you step back through edits."]],
        eyeTrainerTabButton: ["Eye Trainer", "Practice making your own assessment, then compare it with the feedback.", ["Value Comparison asks whether the second swatch is lighter, darker, or the same.", "Value Identification asks you to estimate a swatch's value. Hold Peek to check its grayscale appearance."]],
        drawArea: ["Draw an Area", "Choose a value, then draw a boundary around the area you want to simplify.", ["Hold Shift to draw straight segments on a keyboard-equipped device.", "Select Apply Value to fill the area, or Cancel Drawing to discard the boundary."]],
        beginPainting: ["Paint Value", "Choose a value and brush size, then paint over detail to simplify the map.", ["Click Paint Value again or Done Painting to stop.", "Use Undo Last to reverse an edit. Pan Image is available above the image."]],
        selectMass: ["Select and Adjust Value Mass", "Tap a shape to select its connected area, then choose a new value and Apply Value.", ["Touching areas of the same value can be selected together. Add (Drawn) Area and Remove (Drawn) Area let you refine the boundary.", "Click Select Mass again or Cancel Selection to exit."]],
        addSelectionArea: ["Add (Drawn) Area", "Draw around an area to include it in the current selection.", ["Release to update the selection. Its value changes only when you select Apply Value.", "Click this button again to cancel an unfinished boundary."]],
        removeSelectionArea: ["Remove (Drawn) Area", "Draw around an unwanted part of the selected shape to exclude it.", ["Release to update the selection. This refines the selection without erasing the image.", "Click this button again to cancel an unfinished boundary."]],
        previewSquint: ["Squint", "Reduce minor value variations while protecting important boundaries.", ["Adjust Squint and Protect Major Edges, then Preview.", "Apply keeps the result. Reset discards the preview; Undo Last reverses an applied edit."]],
        showBw: ["Continuous B&W", "View the image's lightness without color or discrete value steps.", ["Use Save B&W PNG to export it. Click Show B&W again to return to the original view."]],
        toggleComparison: ["Compare Images", "Choose the image shown in each pane: Original Color, Continuous B&W, or Value Map.", ["Pan or zoom either pane to move both views together.", "Return to Single Image to sample or edit. Comparison is available on computers and tablets."]]
    };
    function save() { try { localStorage.setItem(key, JSON.stringify(preferences)); } catch {} }
    function close() { if (typeof dialog.close === "function") dialog.close(); else dialog.removeAttribute("open"); }
    function show(id, force = false) {
        if (!force && (preferences.skip || preferences.seen.includes(id) || dialog.open)) return;
        const content = introductions[id];
        if (!content) return;
        currentId = id;
        $("guidanceTitle").textContent = content[0];
        $("guidanceIntro").textContent = content[1];
        $("guidanceSteps").replaceChildren(...content[2].map(text => {
            const item = document.createElement("li"); item.textContent = text; return item;
        }));
        $("guidanceContinue").textContent = id === "welcome" ? "Get Started" : "Got It";
        if (typeof dialog.showModal === "function") dialog.showModal(); else dialog.setAttribute("open", "");
    }
    function acknowledge() {
        if (!preferences.seen.includes(currentId)) preferences.seen.push(currentId);
        save();
    }
    $("guidanceContinue").onclick = () => { acknowledge(); close(); };
    $("guidanceSkip").onclick = () => { preferences.skip = true; save(); close(); };
    $("guidanceAbout").onclick = () => { acknowledge(); close(); $("openAbout").click(); };
    $("guidanceReset").onclick = () => { preferences = { seen: [], skip: false }; save(); close(); show("welcome", true); };
    $("openGuidance").onclick = () => {
        const active = document.querySelector('[role="tab"][aria-selected="true"]');
        show(active?.id || "welcome", true);
    };
    dialog.addEventListener("cancel", acknowledge);
    for (const id of Object.keys(introductions)) {
        if (id === "welcome") continue;
        $(id)?.addEventListener("click", () => show(id));
    }
    $("imageCanvas")?.addEventListener("click", () => show("samplingTabButton"));
    show("welcome");
}
