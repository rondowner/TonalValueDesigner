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

export default BrowserPlatform;
