"""Remove the six-frame final shot and let the TV greeting finish without a loop."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
SOURCE = ROOT / 'assets/background/tbm-guide-closing-v69.mp4'
VIDEO = ROOT / 'assets/background/tbm-guide-closing-v138.mp4'
IMAGE = ROOT / 'assets/tv-background-v138/tbm-guide-closing-v138.webp'
KEEP_FRAMES = 185  # At 30 fps, the unrelated group shot starts at frame 185 (6.1667s).


def main():
    IMAGE.parent.mkdir(parents=True, exist_ok=True)
    temporary_video = VIDEO.with_suffix('.tmp.mp4')
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-i', str(SOURCE), '-an',
        '-vf', f'trim=end_frame={KEEP_FRAMES},setpts=PTS-STARTPTS',
        '-c:v', 'libx264', '-preset', 'slow', '-crf', '20', '-pix_fmt', 'yuv420p',
        '-movflags', '+faststart', str(temporary_video)
    ], check=True)
    temporary_video.replace(VIDEO)
    temporary_image = IMAGE.with_suffix('.tmp.webp')
    subprocess.run([
        'ffmpeg', '-v', 'error', '-y', '-i', str(VIDEO), '-an',
        '-vf', 'fps=8,scale=320:180:flags=lanczos', '-c:v', 'libwebp_anim',
        '-quality', '65', '-compression_level', '4', '-loop', '1', str(temporary_image)
    ], check=True)
    temporary_image.replace(IMAGE)
    for path in [VIDEO, IMAGE]:
        print(f'{path.relative_to(ROOT)}: {path.stat().st_size:,} bytes')


if __name__ == '__main__':
    main()
