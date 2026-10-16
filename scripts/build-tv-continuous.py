"""One constant-size H.264/AAC stream: no decoder restart at chapter boundaries.

Requires ffmpeg, Pillow, and a Korean TrueType font (TV_KOREAN_FONT or fc-match).
Uses the existing v99 narration/music mixes; the original safety MP4 is untouched.
The phone UI surrounding embedded clips is composed into the video because webOS
does not reliably apply object-fit or clipping to its native video plane.
"""
import json
import math
import os
from pathlib import Path
import subprocess
import tempfile
from PIL import Image, ImageDraw, ImageFont

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/tv-v104'
OUT.mkdir(parents=True, exist_ok=True)
WIDTH, HEIGHT, FPS = 480, 1040, 30
TRACKS = [
    ('00-opening', 'intro', 0), ('01-weather', 'weather', 0),
    ('02-tbm-basic', 'meeting', 0), ('03-ai-pdf', 'meeting', 1),
    ('04-safety-tools', 'support', 0), ('05-emergency', 'support', 1),
    ('07-safety4cut-intro', 'safety', 0), ('08-safety4cut-example', 'safety', 1),
    ('06-closing', 'closing', 0),
]


def run(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    '-filter_complex_threads', '1', *args], check=True)


def probe(source):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', '-show_format', '-show_streams', '-of', 'json', str(source)
    ]))


with tempfile.TemporaryDirectory(prefix='power-tbm-tv-') as directory:
    work = Path(directory)
    # Preserve the existing Golden Rules screen and the safety video's labels.
    with Image.open(ROOT / 'assets/screens/guide/stage3-golden-rules.jpeg') as picture:
        picture.resize((WIDTH, HEIGHT), Image.Resampling.LANCZOS).save(work / 'golden.png')
    font_path = os.environ.get('TV_KOREAN_FONT') or subprocess.check_output(
        ['fc-match', '-f', '%{file}', ':lang=ko'], text=True).strip()
    safety = Image.new('RGB', (WIDTH, HEIGHT), '#081d37')
    draw = ImageDraw.Draw(safety)
    def label(text, y, size, color='white'):
        for line_index, line in enumerate(text.splitlines()):
            draw.text((WIDTH / 2, (y + line_index * size * 1.6) * HEIGHT / 1110), line,
                      font=ImageFont.truetype(font_path, round(size * WIDTH / 512)), fill=color, anchor='mt')
    label('AI 추천 컷 · 위험 찾아보기', 214, 19, '#ffd65a')
    label('지상변압기 전원측 엘보 분리 작업 중\n감전 예방', 817, 23)
    label('AI 추천 컷으로 만든 교육영상 재생 중', 1026, 18)
    safety.save(work / 'safety.png')
    timeline, concat, offset = [], [], 0
    for key, page, index in TRACKS:
        source = ROOT / ('assets/safety4cut/09-ai-example-v84.mp4' if index == 1 and page == 'safety'
                         else f'assets/tv-v99/{key}.mp4')
        data = probe(source)
        frames = math.ceil(float(data['format']['duration']) * FPS - .0001)
        duration = frames / FPS
        timeline.append(dict(id=key, page=page, index=index, start=offset / FPS,
                             duration=duration, end=(offset + frames) / FPS))
        offset += frames
        args = ['-i', str(source)]
        common = f'fps={FPS},tpad=stop_mode=clone:stop_duration=1,trim=duration={duration},setpts=PTS-STARTPTS'
        if page == 'intro':
            video = f'[0:v]{common},scale={WIDTH}:{HEIGHT}:force_original_aspect_ratio=increase,crop={WIDTH}:{HEIGHT},setsar=1[v]'
        elif key == '04-safety-tools':
            args += ['-framerate', str(FPS), '-loop', '1', '-i', str(work / 'golden.png')]
            # Same 6.6% / 25.45% / 86.9% rectangle as support-golden-video-shell.
            video = (f'[0:v]{common},scale=416:234,setsar=1[clip];'
                     '[1:v][clip]overlay=32:264:shortest=1,setsar=1[v]')
        elif key == '08-safety4cut-example':
            args += ['-framerate', str(FPS), '-loop', '1', '-i', str(work / 'safety.png')]
            video = (f'[0:v]{common},scale=480:480,setsar=1[clip];'
                     '[1:v][clip]overlay=0:250:shortest=1,setsar=1[v]')
        else:
            video = f'[0:v]{common},scale={WIDTH}:{HEIGHT},setsar=1[v]'
        filters = video + f';[0:a]aresample=48000,apad,atrim=duration={duration},asetpts=PTS-STARTPTS[a]'
        output = work / f'{key}.mkv'
        run(args + ['-filter_complex', filters, '-map', '[v]', '-map', '[a]',
                    '-t', str(duration), '-r', str(FPS), '-c:v', 'libx264', '-preset', 'fast',
                    '-crf', '21', '-profile:v', 'main', '-level:v', '3.1', '-pix_fmt', 'yuv420p',
                    '-g', '60', '-threads', '2', '-c:a', 'pcm_s16le', '-ar', '48000', '-ac', '2', str(output)])
        concat += [f"file '{output}'", f'duration {duration:.9f}']
        print(f'{key}: {frames} frames, start={timeline[-1]["start"]:.3f}s', flush=True)
    (work / 'concat.txt').write_text('\n'.join(concat), encoding='utf-8')
    # Encode audio ONCE across every boundary. Per-file AAC priming must not
    # become a fresh hardware-decoder startup gap at each male/female change.
    run(['-f', 'concat', '-safe', '0', '-i', str(work / 'concat.txt'), '-c:v', 'copy',
         '-c:a', 'aac', '-b:a', '160k', '-ar', '48000', '-ac', '2',
         '-movflags', '+faststart', str(OUT / 'tour.mp4')])
    manifest = dict(src='assets/tv-v104/tour.mp4', width=WIDTH, height=HEIGHT,
                    duration=offset / FPS, segments=timeline)
    (ROOT / 'tv-media-timeline.js').write_text(
        '// Generated by scripts/build-tv-continuous.py; times are in seconds.\n'
        'window.PowerTBMTVTimeline = ' + json.dumps(manifest, indent=2) + ';\n', encoding='utf-8')
    (OUT / 'README.txt').write_text(
        'One continuous TV H.264 Main 3.1 / AAC stream, 480x1040, 30 fps.\n'
        'Includes all current narration, music, opening, Golden Rules and the complete safety example.\n'
        'The original assets/safety4cut/09-ai-example-v84.mp4 is unchanged.\n'
        'Phone surroundings are precomposed to avoid native TV object-fit/resize failures.\n'
        'Rebuild: python3 scripts/build-tv-continuous.py\n'
        'Prerequisites: v99 mixes (build-tv-media.py), ffmpeg, Pillow, Korean TTF/fontconfig.\n'
        'Music license: ../audio/BGM_CREDITS.txt\n', encoding='utf-8')
    print(f'Continuous tour: {offset / FPS:.3f}s, {(OUT / "tour.mp4").stat().st_size:,} bytes', flush=True)
