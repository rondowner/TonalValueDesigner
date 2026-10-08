# Manual QA checklist

Use this checklist after the automated suites pass and before publishing an architectural release.

## Application startup

- Confirm the displayed release and build date.
- Open JPEG and PNG images.
- Confirm there are no visible startup errors.

## Value Sampling

- Sample several locations and confirm the on-image value badge follows the selected point.
- Change the sample size and confirm the reading updates.
- Expand the technical details and verify CIELAB, RGB, and Additional fields.
- Enter a target and verify on-target, too-light, and too-dark messages.

## Viewport

- Test mouse-wheel zoom, pinch zoom, dragging, Pan Image, Fit Image, 100%, zoom in, and zoom out.
- Confirm sampling remains aligned after zooming and panning.

## Create Value Map

- Generate Notan, 3-value, 5-value, 7-value, and custom maps.
- Switch between the original and map.
- Save a PNG and inspect the saved result.

## Value Massing

- Draw and apply a free-form area.
- Combine free-form and Shift-controlled straight segments in one boundary.
- Paint a value with every brush size.
- Select one mass, refine it with Add Area and Remove Area, and change only that mass.
- Exercise Undo Last repeatedly until the undo-limit message appears.

## Feature analysis

- On a desktop-class device, analyze `blue-jay.png` and verify that progress remains visible.
- Confirm detected features can be selected, split by value, and refined.
- On a phone, confirm the AI controls remain unavailable and no models are downloaded.

## Value Eye Trainer

- Confirm Value Comparison opens by default.
- Complete at least one Value Comparison answer, one Value Identification answer, one Color Difference answer, and one Correct the Color challenge.
- In Color Difference, verify both swatches remain at the same displayed Painter's Value and that Redder, Yellower, Greener, and Bluer challenges appear over several rounds.
- Hold the reveal control and verify it names the correct color direction.
- In Correct the Color, verify two directions are initially valid. Choose either one, confirm only that component changes, then choose the remaining direction and confirm the swatches match.
- Choose an incorrect correction and verify the swatch does not change and the exercise permits another attempt.
- Verify Peek, score history, embedded mode, and the standalone URL.

## Responsive smoke tests

- Test the complete workflow on Windows or another desktop platform.
- Test Value Sampling on an iPhone-sized device.
- Test drawing and massing on a tablet or stylus-capable device when available.
# TVD 2.13.6 B&W and Comparison Checks

1. Open a test image and choose **Create Value Map**.
2. Select **Show B&W**. Confirm that the image becomes continuous grayscale and can still be sampled.
3. Select **Save B&W PNG** and confirm that the exported image matches the displayed B&W image.
4. On a computer or tablet, select **Compare Side by Side**. Confirm the default view shows Original Color at left and Continuous B&W at right.
5. Change either source to Painter's Value Map after generating a map.
6. Pan, wheel-zoom, and use Fit Image/100%. Confirm both panes remain aligned.
7. Return to Single Image and confirm sampling, value mapping, massing, and the crisp value label still work.
8. On a phone, confirm the side-by-side controls are replaced by the phone notice and no comparison workspace opens.
# TVD 2.13.6 Guidance and Eye Trainer Checks

1. Open TVD. Dismiss the welcome with Get Started. Reload and confirm it does not reappear.
2. Enter each tool tab for the first time. Confirm its introduction appears once and subsequent visits retain normal tab scrolling.
3. Use Help for this tool to reopen the active tab's explanation. Read the Full Introduction should open About.
4. Choose Skip Introductions, then visit another tool. Automatic introductions should stay hidden; Help should remain available.
5. Choose Reset Introductions from Help. Confirm the welcome and first-use guidance become available again.
6. Generate a value map and exercise Select Mass, Add (Drawn) Area, and Remove (Drawn) Area. Confirm introductions explain the controls and dismissing them allows the active action to continue.
7. In embedded and standalone Eye Trainer, verify revealed Value Comparison values end in .0 or .5. Correct direction earns 10, Same at a half-step difference earns 5, and opposite direction earns 0.
8. Confirm the Eye Trainer header shows v1.4 and TVD shows v2.13.6.
