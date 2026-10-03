"""Package the approved artwork at standard browser icon sizes."""
from pathlib import Path
import sys
from PIL import Image

root = Path(__file__).resolve().parents[1]
source = Image.open(sys.argv[1]).convert("RGBA")
assets = root / "assets"
assets.mkdir(exist_ok=True)
for size, name in [(32, "favicon-32.png"), (192, "icon-192.png"), (180, "apple-touch-icon.png")]:
    source.resize((size, size), Image.Resampling.LANCZOS).save(assets / name)
source.resize((256, 256), Image.Resampling.LANCZOS).save(
    root / "favicon.ico", sizes=[(16, 16), (32, 32), (48, 48), (64, 64), (256, 256)]
)
