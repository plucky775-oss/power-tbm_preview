"""Build muted sector footage from the user-supplied KEPCO TBM guide.

Usage: python3 scripts/build-sector-backgrounds.py /path/to/TBM_Guide.mp4
The original source stays outside the repository. TV uses bounded animated
WebP images, preserving the existing single native video decoder design.
"""
from pathlib import Path
import argparse
import hashlib
import json
import subprocess
import tempfile
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
OUTPUT = ROOT / 'assets/background'
TV = ROOT / 'assets/tv-background-v146'
SHOTS = [
    ('kepco-meeting-v146', 412.3, 42, '520:292:30:78', 3, 1.2, 120),
    ('kepco-ppe-v146', 353.4, 6.6, '440:248:180:122', 5, .7, 30.2),
    ('tbm-guide-closing-v146', 541.9, 6.8, '720:404:94:30', 1, 0, 6.8),
]


def run(*args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)], check=True)


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--only', choices=[shot[0] for shot in SHOTS], nargs='+')
    args = parser.parse_args()
    info = json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_streams', '-show_format', '-of', 'json', str(args.source)]))
    video = next(s for s in info['streams'] if s['codec_type'] == 'video')
    if (video['width'], video['height']) != (910, 512):
        raise SystemExit('This crop map requires the inspected 910x512 source.')
    TV.mkdir(parents=True, exist_ok=True)
    codec = ['-an', '-c:v', 'libx264', '-preset', 'medium', '-crf', '23',
             '-profile:v', 'main', '-level', '3.1', '-pix_fmt', 'yuv420p',
             '-g', '60', '-threads', '2', '-movflags', '+faststart']
    with tempfile.TemporaryDirectory(prefix='tbm-sector-') as temporary:
        for name, start, length, crop, repeats, overlap, duration in SHOTS:
            if args.only and name not in args.only:
                continue
            base = Path(temporary) / (name + '.mp4')
            # Burned-in titles, captions and diagrams are outside these crops.
            run('-ss', start, '-i', args.source, '-t', length,
                '-vf', f'crop={crop},scale=960:540:flags=lanczos,fps=30,setsar=1',
                *codec, base)
            target = OUTPUT / (name + '.mp4')
            if repeats == 1:
                target.write_bytes(base.read_bytes())
            else:
                inputs = sum((['-i', str(base)] for _ in range(repeats)), [])
                filters = [f'[{i}:v]settb=AVTB,setpts=PTS-STARTPTS[v{i}]' for i in range(repeats)]
                previous = 'v0'
                for i in range(1, repeats):
                    filters.append(f'[{previous}][v{i}]xfade=transition=fade:duration={overlap}:offset={(length-overlap)*i}[x{i}]')
                    previous = f'x{i}'
                run(*inputs, '-filter_complex_threads', '1', '-filter_complex', ';'.join(filters),
                    '-map', f'[{previous}]', '-t', duration, *codec, target)
            poster = OUTPUT / (name + '-poster.jpg')
            run('-i', target, '-frames:v', '1', '-q:v', '2', poster)
            tv_poster = ROOT / 'assets/tv-v100/images/background' / (name + '-poster.webp')
            with Image.open(poster) as im:
                im.save(tv_poster, 'WEBP', quality=90, method=6)
            # Close the repeated meeting/PPE image smoothly within 64 frames.
            closing = name.startswith('tbm-guide-closing')
            if closing:
                run('-i', target, '-an', '-vf', 'fps=8,scale=320:180:flags=lanczos',
                    '-c:v', 'libwebp_anim', '-quality', '65', '-compression_level', '4',
                    '-loop', '1', TV / (name + '.webp'))
            else:
                # Crossfade the last half-second into the opening frames.
                run('-i', target, '-filter_complex_threads', '1', '-filter_complex',
                    '[0:v]fps=8,scale=320:180:flags=lanczos,split[a][b];'
                    '[a]trim=duration=8,setpts=PTS-STARTPTS[a0];'
                    '[b]trim=duration=0.5,setpts=PTS-STARTPTS[b0];'
                    '[a0][b0]xfade=transition=fade:duration=0.5:offset=7.5[out]',
                    '-map', '[out]', '-t', '8', '-an', '-c:v', 'libwebp_anim',
                    '-quality', '65', '-compression_level', '4', '-loop', '0', TV / (name + '.webp'))
            print(name, target.stat().st_size, flush=True)
    manifest = {'source': args.source.name, 'sha256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
                'source_width': video['width'], 'source_height': video['height'],
                'note': 'User-provided KEPCO TBM guide. Cropped and muted; output scaling is not new source detail.',
                'shots': [dict(zip(['name','start','length','crop','repeats','overlap','output_duration'], shot)) for shot in SHOTS]}
    (OUTPUT / 'sector-backgrounds-v146.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
