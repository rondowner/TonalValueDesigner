"""Render a crisp angular mountain range at standard browser icon sizes."""
from pathlib import Path
from PIL import Image, ImageDraw

root = Path(__file__).resolve().parents[1]
source = Image.new("RGBA", (512, 512), (0, 0, 0, 0))
mask = Image.new("L", source.size, 0)
ImageDraw.Draw(mask).rounded_rectangle((0, 0, 511, 511), radius=64, fill=255)
draw = ImageDraw.Draw(source)
draw.rectangle((0, 0, 511, 511), fill="#E7EDF0")
# Two sharply separated peaks avoid a rounded, stacked silhouette at 16px.
draw.polygon([(0, 368), (152, 120), (252, 284), (356, 80), (512, 368), (512, 512), (0, 512)], fill="#8795A0")
draw.polygon([(0, 408), (132, 312), (244, 404), (366, 304), (512, 404), (512, 512), (0, 512)], fill="#293642")
source.putalpha(mask)
assets = root / "assets"
assets.mkdir(exist_ok=True)
source.save(assets / "icon-source.png")
for size, name in [(32, "favicon-32.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
    source.resize((size, size), Image.Resampling.LANCZOS).save(assets / name)
source.resize((256, 256), Image.Resampling.LANCZOS).save(
    root / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (256, 256)]
)
