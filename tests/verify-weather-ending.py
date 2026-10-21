"""Verify shipped phoneme tails, chapter level and unchanged TV packet clocks."""
import importlib.util
import json
from pathlib import Path
import subprocess

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('weather_packets', ROOT / 'scripts/build-weather-narration.py')
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)
report = json.loads((ROOT / 'assets/audio/weather-v129/repair.json').read_text())
original = media.decode(ROOT / report['source'])[:, 0]
fixed = media.decode(ROOT / report['desktop'])[:, 0]

# These complete phonemes were missing or cut in v128; test the encoded output.
for name, start, end, delivered in [('한', 24.96, 25.12, 25.31),
                                   ('서', 25.49, 25.60, 25.84),
                                   ('다', 16.26, 16.44, 26.91)]:
    reference = original[round(start * 48000):round(end * 48000)]
    actual = fixed[round(delivered * 48000):round(delivered * 48000) + len(reference)]
    correlation = float(np.corrcoef(reference, actual)[0, 1])
    assert correlation > .98, (name, 'phoneme missing or clipped', correlation)
    print(f'PASS complete {name} phoneme: correlation {correlation:.5f}')

base, current = ROOT / report['tvBase'], ROOT / report['tv']
def packets(path, stream):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', stream,
        '-show_entries', 'packet=pts,dts,duration', '-of', 'json', str(path)]))['packets']

for stream in ['v:0', 'a:0']:
    assert packets(base, stream) == packets(current, stream), (stream, 'packet clock changed')
old = media.adts_frames(media.ffmpeg('-i', base, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'))
new = media.adts_frames(media.ffmpeg('-i', current, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'))
first, last = report['replacedAACFrames']
assert len(old) == len(new) == report['aacFrameCount']
assert old[:first] == new[:first] and old[last:] == new[last:]
video_hash = media.ffmpeg('-i', current, '-map', '0:v:0', '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-')
assert video_hash.decode().strip() == report['preservedVideoSHA256']
print('PASS all TV video packets, unaffected AAC packets and every audio/video packet clock')

for label, path, trim in [('Desktop', ROOT / report['desktop'], []),
                          ('TV', current, ['-ss', str(11 + 2 / 3), '-t', str(29 + 22 / 30)])]:
    result = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', *trim, '-i', str(path),
        '-vn', '-af', 'loudnorm=I=-16:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'],
        capture_output=True, text=True, check=True)
    levels = json.loads(result.stderr[result.stderr.rfind('{'):])
    level, peak = float(levels['input_i']), float(levels['input_tp'])
    assert abs(level + 16) < .65 and peak < -1.3, (label, levels)
    print(f'PASS {label}: {level} LUFS, {peak} dBTP')
