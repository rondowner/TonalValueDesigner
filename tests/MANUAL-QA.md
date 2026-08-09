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
- Complete at least one Comparison answer and one Identification answer.
- Verify Peek, score history, embedded mode, and the standalone URL.

## Responsive smoke tests

- Test the complete workflow on Windows or another desktop platform.
- Test Value Sampling on an iPhone-sized device.
- Test drawing and massing on a tablet or stylus-capable device when available.
