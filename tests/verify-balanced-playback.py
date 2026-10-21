"""Verify the shipped v128 media: decoded frames, clocks and actual loudness."""
import concurrent.futures
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
DATA = ROOT / 'assets/audio/balanced-v128'
report = json.loads((DATA / 'playback.json').read_text())
sources = json.loads((DATA / 'sources.json').read_text())


def decoded_hashes(path):
    result = subprocess.run(['ffmpeg', '-v', 'error', '-i', str(path),
        '-map', '0:v:0', '-an', '-f', 'framemd5', '-'], capture_output=True, text=True, check=True)
    assert not result.stderr.strip(), result.stderr
    return [line.split(',')[-1].strip() for line in result.stdout.splitlines() if not line.startswith('#')]


def verify_compressed_video(original, output, prefix=0):
    """Check every frame's presentation time and full-stream visual similarity."""
    timestamps = []
    for path in [original, output]:
        probe = json.loads(subprocess.check_output(['ffprobe', '-v', 'error',
            '-select_streams', 'v:0', '-show_entries',
            'frame=best_effort_timestamp_time:stream=width,height,r_frame_rate',
            '-of', 'json', str(path)]))
        timestamps.append(([float(frame['best_effort_timestamp_time']) for frame in probe['frames']],
                           probe['streams'][0]))
    (before, before_format), (after, after_format) = timestamps
    assert before_format == after_format, (before_format, after_format)
    assert len(after) == len(before) + prefix, (len(before), len(after), prefix)
    assert all(abs(new - old - prefix / 30) < 0.000002
               for old, new in zip(before, after[prefix:])), 'frame timing changed'
    filters = (f'[0:v]settb=AVTB,setpts=PTS-STARTPTS[ref];'
               f'[1:v]trim=start_frame={prefix},settb=AVTB,setpts=PTS-STARTPTS[out];'
               '[ref][out]ssim')
    result = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-threads', '2',
        '-i', str(original), '-threads', '2', '-i', str(output), '-filter_complex_threads', '1',
        '-filter_complex', filters, '-an', '-f', 'null', '-'],
        capture_output=True, text=True, check=True)
    similarity = float(re.search(r'All:([0-9.]+)', result.stderr).group(1))
    assert similarity >= 0.99, ('video quality', similarity)
    assert 4 * ((output.stat().st_size + 2) // 3) + 16_384 < 16 * 1024 * 1024, 'delivery file too large'
    print(f'PASS {output.relative_to(ROOT)}: {len(after)} frame times, SSIM {similarity:.6f}', flush=True)


def measure(job):
    label, path, start, duration = job
    args = ['ffmpeg', '-hide_banner', '-nostats', '-ss', str(start), '-i', str(ROOT / path)]
    if duration is not None:
        args += ['-t', str(duration)]
    result = subprocess.run(args + ['-vn', '-af', 'loudnorm=I=-16:TP=-2:LRA=11:print_format=json',
        '-f', 'null', '-'], capture_output=True, text=True, check=True)
    value = json.loads(result.stderr[result.stderr.rfind('{'):])
    level, peak = float(value['input_i']), float(value['input_tp'])
    assert abs(level + 16) < .65, (label, 'LUFS', level)
    assert peak <= -1.3, (label, 'true peak', peak)
    return label, level, peak


jobs = []
for lang in ['ko', 'en']:
    timeline, original = report['timelines'][lang], sources[lang + 'TV']
    assert timeline['preludeDuration'] == 3.5
    assert abs(timeline['duration'] - original['duration'] - 3.5) < 1e-6
    for index, chapter in enumerate(timeline['segments']):
        before = original['segments'][index]
        assert chapter['id'] == before['id'] and chapter['duration'] == before['duration']
        assert abs(chapter['start'] - before['start'] - 3.5) < 1e-6
        assert abs(chapter['end'] - before['end'] - 3.5) < 1e-6
        jobs.append((f'TV {lang} {chapter["id"]}', timeline['src'], chapter['start'], chapter['duration']))
    if lang == 'ko':
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as pool:
            old, new = list(pool.map(decoded_hashes, [ROOT / original['src'], ROOT / timeline['src']]))
        assert new[105:] == old, (lang, 'decoded frames changed', len(old), len(new))
        print(f'PASS {lang}: 105 launch frames followed by {len(old)} unchanged decoded frames', flush=True)
        verify_compressed_video(ROOT / sources[lang]['08-safety4cut-example']['src'],
                                ROOT / report['tracks'][lang]['08-safety4cut-example'])
    else:
        verify_compressed_video(ROOT / original['src'], ROOT / timeline['src'], prefix=105)
    for key, path in report['tracks'][lang].items():
        jobs.append((f'Desktop {lang} {key}', path, 0, None))

with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
    levels = list(pool.map(measure, jobs))
for label, level, peak in levels:
    print(f'PASS {label}: {level:.2f} LUFS / {peak:.2f} dBTP')
print(f'PASS all {len(levels)} encoded chapter audio measurements')
