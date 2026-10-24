"""Encode one consistent Korean TV video stream; copy the corrected AAC intact.

The v132 file inherited concatenated H.264 with two PPS values using id 0.
English v128 already has a single encoder configuration across the whole tour.
Requires ffmpeg. Keeps all 30 fps frames, chapter times, voices and music.
"""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/tv-ko-v132/tour.mp4'
OUTPUT = ROOT / 'assets/tv-ko-v136/tour.mp4'


def main():
    OUTPUT.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run([
        'ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-i', str(SOURCE),
        '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264',
        '-preset', 'slow', '-crf', '20', '-profile:v', 'main', '-level:v', '3.1',
        '-pix_fmt', 'yuv420p', '-refs', '3', '-bf', '2', '-g', '60',
        '-maxrate', '900k', '-bufsize', '1800k', '-threads', '2',
        '-video_track_timescale', '15360', '-c:a', 'copy',
        '-movflags', '+faststart', str(OUTPUT)
    ], check=True)
    print(f'{OUTPUT.relative_to(ROOT)}: {OUTPUT.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
