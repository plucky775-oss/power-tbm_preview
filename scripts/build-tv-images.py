"""Create scaled copies of the existing artwork; keep desktop originals intact.

Requires Pillow. Run from any directory with python3 scripts/build-tv-images.py.
"""
from pathlib import Path
from io import BytesIO
import re
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
sources = sorted(set(re.findall(
    r"\./(assets/(?:screens/guide|safety4cut|background|video|closing)/[^'\s]+\.(?:png|jpe?g|webp))",
    (ROOT / 'sw.js').read_text(), re.I)))
for source in sources:
    target = ROOT / source.replace('assets/', 'assets/tv-v100/images/', 1)
    target = target.with_suffix('.webp')
    target.parent.mkdir(parents=True, exist_ok=True)
    with Image.open(ROOT / source) as image:
        image = image.convert('RGBA' if 'A' in image.getbands() else 'RGB')
        # Phone screenshots render at about 300–400px wide on a 1080p TV.
        # Preserve long scrolling screenshots and every original aspect ratio.
        width = 1280 if '/background/' in source else 640
        if image.width > width:
            image = image.resize((width, round(image.height * width / image.width)), Image.Resampling.LANCZOS)
        output = BytesIO()
        image.save(output, 'WEBP', quality=90, method=6)
        data = output.getvalue()
        with Image.open(BytesIO(data)) as check:
            check.load()
            assert check.size == image.size
        target.write_bytes(data)
print(f'Created {len(sources)} TV image copies.')
