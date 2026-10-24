"""Small moving TV backgrounds without allocating a second video decoder.

Requires ffmpeg with libwebp_anim. The main tour/audio is never re-encoded.
Use at most eight seconds of each decorative clip at 320x180 / 8 fps.
The active animation has at most 64 frames (14.1 MiB if all frames decode).
"""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
NAMES = [
    'weather-powerlines-v60', 'tablet-review-v63', 'field-tools-kepco-v68',
    'emergency-response-changwon119-v66', 'tbm-guide-closing-v69',
]


def main():
    output = ROOT / 'assets/tv-background-v137'
    output.mkdir(parents=True, exist_ok=True)
    for name in NAMES:
        destination = output / (name + '.webp')
        temporary = output / (name + '.tmp.webp')
        subprocess.run([
            'ffmpeg', '-v', 'error', '-y', '-i', str(ROOT / 'assets/background' / (name + '.mp4')),
            '-t', '8', '-an', '-vf', 'fps=8,scale=320:180:flags=lanczos',
            '-c:v', 'libwebp_anim', '-quality', '65', '-compression_level', '4',
            '-loop', '0', str(temporary)
        ], check=True)
        temporary.replace(destination)
        print(f'{destination.relative_to(ROOT)}: {destination.stat().st_size:,} bytes', flush=True)


if __name__ == '__main__':
    main()
