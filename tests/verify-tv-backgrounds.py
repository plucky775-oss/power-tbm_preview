"""Verify the actual moving TV assets and their bounded decode/download cost."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
folder = root / 'assets/tv-background-v137'
expected = {
    'weather-powerlines-v60.webp', 'tablet-review-v63.webp',
    'field-tools-kepco-v68.webp', 'emergency-response-changwon119-v66.webp',
    'tbm-guide-closing-v69.webp',
}
assert {p.name for p in folder.iterdir()} == expected
total_bytes = 0
for name in sorted(expected):
    path = folder / name
    total_bytes += path.stat().st_size
    with Image.open(path) as image:
        assert image.format == 'WEBP' and image.is_animated, name
        assert image.size == (320, 180), name
        assert 2 <= image.n_frames <= 64, name
        assert image.info['loop'] == 0, name
        frames, duration = set(), 0
        for i in range(image.n_frames):
            image.seek(i)
            frames.add(image.convert('RGB').tobytes())
            assert image.info['duration'] >= 125, name
            duration += image.info['duration']
        assert len(frames) > 1, f'{name} must visibly move'
        assert duration <= 8000, (name, duration)
        assert image.n_frames * 320 * 180 * 4 < 15 * 1024 * 1024
        print(f'PASS {name}: {image.n_frames} frames, {duration} ms, {path.stat().st_size:,} bytes')
assert total_bytes < 2 * 1024 * 1024, total_bytes
print(f'PASS all five TV backgrounds: {total_bytes:,} bytes')
