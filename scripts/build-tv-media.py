"""Build webOS single-player media from the current narration and video assets."""
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets' / 'tv-v99'
OUT.mkdir(parents=True, exist_ok=True)
TRACKS = [
    ('00-opening', '00-opening-taehyung.mp3', 8.150204, .12),
    ('01-weather', '01-weather-jisoo.mp3', 29.701224, .065),
    ('02-tbm-basic', '02-tbm-basic-taehyung.mp3', 34.29875, .065),
    ('03-ai-pdf', '03-ai-pdf-jisoo.mp3', 40.646531, .065),
    ('04-safety-tools', '04-safety-tools-taehyung.mp3', 31.84325, .065),
    ('05-emergency', '05-emergency-jisoo.mp3', 21.995102, .065),
    ('07-safety4cut-intro', '07-safety4cut-intro-v97.m4a', 38.037, .065),
    ('06-closing', '06-closing-jisoo.mp3', 11.493878, .13),
]
offset = 0
for key, source, duration, volume in TRACKS:
    temporary = OUT / f'.{key}.building.mp4'
    cmd = ['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', '-filter_complex_threads', '1']
    cmd += ['-i', str(ROOT / 'assets/audio' / source)]
    cmd += ['-stream_loop', '-1', '-ss', str(offset), '-i', str(ROOT / 'assets/audio/bgm-starcourt-mall-cc0.mp3')]
    if key == '00-opening':
        cmd += ['-i', str(ROOT / 'assets/video/power-tbm-opening-ansan-v77.mp4')]
        video = '[2:v]tpad=stop_mode=clone:stop_duration=1,fps=30,format=yuv420p[v]'
    elif key == '04-safety-tools':
        cmd += ['-i', str(ROOT / 'assets/video/golden-rules-11-rule-1-muted.mp4')]
        # Match app.js's narration-to-visual cues and the existing 1.08x clip.
        start = 16.12 + (26100 - 25950) / (32600 - 25950) * (22.25 - 16.12)
        video = (f'[2:v]setpts=PTS/1.08,fps=30,trim=duration={22.25-start},'
                 f'tpad=start_mode=add:start_duration={start}:stop_mode=add:stop_duration={duration},'
                 'format=yuv420p[v]')
    else:
        cmd += ['-f', 'lavfi', '-i', 'color=c=black:s=64x64:r=30']
        video = '[2:v]format=yuv420p[v]'
    fade = f',afade=t=out:st={duration-2.35}:d=2.35' if key == '06-closing' else ''
    filters = (
        f'[0:a]aresample=48000,apad=whole_dur={duration},atrim=duration={duration}[voice];'
        f'[1:a]aresample=48000,volume={volume},afade=t=in:d=0.4{fade}[music];'
        '[voice][music]amix=inputs=2:duration=first:normalize=0,'
        'alimiter=limit=0.97:level=0:latency=1[a];' + video
    )
    cmd += ['-filter_complex', filters, '-map', '[v]', '-map', '[a]', '-t', str(duration),
            '-c:v', 'libx264', '-preset', 'fast', '-crf', '22', '-profile:v', 'main', '-level:v', '3.1',
            '-threads', '2', '-pix_fmt', 'yuv420p', '-g', '60', '-c:a', 'aac', '-b:a', '128k',
            '-ar', '48000', '-ac', '2', '-movflags', '+faststart', str(temporary)]
    subprocess.run(cmd, check=True)
    temporary.replace(OUT / f'{key}.mp4')
    print(f'{key}: {(OUT / (key + ".mp4")).stat().st_size:,} bytes', flush=True)
    offset += duration

(OUT / 'README.txt').write_text(
    'webOS: current narration + music, opening and Golden Rules video in one player.\n'
    'Safety example uses unchanged assets/safety4cut/09-ai-example-v84.mp4.\n'
    'Music license: ../audio/BGM_CREDITS.txt\n'
    'Rebuild: python3 scripts/build-tv-media.py (ffmpeg required).\n', encoding='utf-8')
