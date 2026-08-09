# Tonal Value Designer — Value Eye Trainer v0.9

A standalone, mobile-first progressive web app for practicing painter-value recognition. It has no dependencies, accounts, analytics, or network services.

## Training modes

- **Value Identification:** Estimate the Painter's Value of one color swatch from 1 through 10.
- **Value Comparison:** Compare two differently colored swatches and decide whether the second is lighter, darker, or the same value as the first.

Value Comparison includes a configurable maximum difference of 1 through 5 value steps, defaulting to 5. Values sharing the same whole-number group, such as 5.1 and 5.8, have the official answer **Same value**. Values in different groups have the official answer **Lighter** or **Darker** according to the second swatch.

Value Comparison is selected when the trainer first opens. You can switch to Value Identification at any time.

The official answer earns 10 points. When the measured values are no more than 0.4 apart, either incorrect answer still earns 5 points to recognize the perceptual ambiguity. Beyond 0.4, an incorrect answer earns no points.

When embedded within TonalValueDesigner, the shared trainer automatically uses a compact layout with a substantially smaller swatch, one row of ten answer buttons, and reduced typography, spacing, feedback, and controls. Its standalone layout is unchanged.

The embedded interface uses moderately enlarged text and controls for readability while retaining the compact 124-pixel desktop swatch.

The temporary ten-step QA reference strip remains implemented but is hidden by default. Set `SHOW_QA_REFERENCE_SCALE` to `true` near the top of `app.js` to display it again.

On desktop, the value-choice scale is labeled to remind learners that Value 1 is black and Value 10 is white.

## Run locally

Service workers require a web server (opening `index.html` directly is not enough for offline installation). In this folder, run either:

```sh
python -m http.server 8000
```

Then open `http://localhost:8000`.

## Deploy to GitHub Pages

1. Create a GitHub repository and copy all files in this folder to its root.
2. In the repository, open **Settings → Pages**.
3. Under **Build and deployment**, choose **Deploy from a branch**.
4. Select the `main` branch and `/ (root)`, then save.
5. Open the Pages URL shown by GitHub. Use the browser's **Add to Home Screen** or **Install** command for the standalone experience.

## Scoring

- Values are generated in tenths from 1.0 through 10.0.
- Guess `N` is correct for the entire `N.0–N.9` block.
- At an exact `.9` boundary, the adjacent higher guess is also correct (for example, both 4 and 5 are correct for 4.9).
- Correct: 10 points. One whole-number step from any accepted answer: 5 points. Otherwise: 0 points.
- Each round contains 10 swatches. Round history and the best score are stored only in the browser.

Press and hold **Hold to peek** to see the current swatch in grayscale. Peek remains available after answering until the next swatch is shown.

Press and hold **Hold to show scale** to temporarily shade the answer buttons from Value 1 (black) through Value 10 (white). Releasing the button restores the normal answer controls.

## Temporary QA display

A permanent ten-step grayscale strip is superimposed along the bottom of the color swatch. It is included for visual QA of the assigned value, grayscale Peek result, and reported correct answer, and can be removed after calibration is accepted.

## Unified value engine

Version 0.3 uses CIELAB L* under a D65 white point as its single lightness measurement. Random colors are generated at a target L*, measured again after conversion to display RGB, and assigned their displayed decimal from that measurement. Peek gray, the answer-button scale, the permanent QA strip, scoring, and the comparison marker all derive from the same measured L* value. Peek does not use the browser's CSS grayscale filter.
