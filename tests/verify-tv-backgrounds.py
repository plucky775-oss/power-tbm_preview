"""Verify the actual moving TV assets and their bounded decode/download cost."""
from pathlib import Path
from PIL import Image

root = Path(__file__).resolve().parents[1]
names = {
    'weather-powerlines-v60.webp', 'tablet-review-v63.webp',
    'field-tools-kepco-v68.webp', 'emergency-response-changwon119-v66.webp',
}
paths = [root / 'assets/tv-background-v137' / name for name in names]
paths.append(root / 'assets/tv-background-v146/tbm-guide-closing-v146.webp')
paths.extend((root / 'assets/tv-background-v147').glob('*.webp'))
assert len(paths) == 7
total_bytes = 0
for path in sorted(paths):
    name = path.name
    total_bytes += path.stat().st_size
    with Image.open(path) as image:
        assert image.format == 'WEBP' and image.is_animated, name
        assert image.size == (320, 180), name
        long_loop = 'v147' in name
        assert 2 <= image.n_frames <= (120 if long_loop else 64), name
        assert image.info['loop'] == (1 if 'closing' in name else 0), name
        frames, duration = set(), 0
        for i in range(image.n_frames):
            image.seek(i)
            frames.add(image.convert('RGB').tobytes())
            assert image.info['duration'] >= 125, name
            duration += image.info['duration']
        assert len(frames) > 1, f'{name} must visibly move'
        assert (19998 <= duration <= 20001) if long_loop else duration <= 8000, (name, duration)
        assert image.n_frames * 320 * 180 * 4 < (27 if long_loop else 15) * 1024 * 1024
        print(f'PASS {name}: {image.n_frames} frames, {duration} ms, {path.stat().st_size:,} bytes')
assert total_bytes < 4 * 1024 * 1024, total_bytes
print(f'PASS all seven TV backgrounds: {total_bytes:,} bytes')
