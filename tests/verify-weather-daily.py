"""Check restored phrase tails, untouched media, packet clocks and levels."""
import importlib.util
import json
from pathlib import Path
import subprocess
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('weather_packets', ROOT / 'scripts/build-weather-narration.py')
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)
report = json.loads((ROOT / 'assets/audio/weather-v132/repair.json').read_text())
original = media.decode(ROOT / report['source'])[:, 0]
fixed = media.decode(ROOT / report['desktop'])[:, 0]
old = media.decode(ROOT / report['desktopBase'])[:, 0]

# Check interiors of all three source pieces, including the previously cut 다.
offset = report['phraseStart']
for start, end in report['sourceRanges']:
    reference = original[round((start + .03) * 48000):round((end - .03) * 48000)]
    first = round((offset + .03) * 48000)
    actual = fixed[first:first + len(reference)]
    correlation = float(np.corrcoef(reference, actual)[0, 1])
    assert correlation > .98, (start, end, correlation)
    print(f'PASS complete source segment {start}–{end}: correlation {correlation:.5f}')
    offset += end - start

tail = original[round(16.26 * 48000):round(16.44 * 48000)]
delivered = report['phraseStart'] + .22 + .62 + 16.26 - 14.465
first = round(delivered * 48000)
new_corr = float(np.corrcoef(tail, fixed[first:first + len(tail)])[0, 1])
old_corr = float(np.corrcoef(tail, old[first:first + len(tail)])[0, 1])
assert new_corr > .98 and old_corr < .2, (new_corr, old_corr)
print(f'PASS restored final 다: new={new_corr:.5f}, old={old_corr:.5f}')

def packets(path, stream):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', stream,
        '-show_entries', 'packet=pts,dts,duration', '-of', 'json', str(path)]))['packets']

for label in ['desktop', 'tv']:
    base, current = ROOT / report[label + 'Base'], ROOT / report[label]
    for stream in (['v:0', 'a:0'] if label == 'tv' else ['a:0']):
        assert packets(base, stream) == packets(current, stream), (label, stream, 'clock changed')
    before = media.adts_frames(media.ffmpeg('-i', base, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'))
    after = media.adts_frames(media.ffmpeg('-i', current, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'))
    first, last = report[label + 'Packets']['replacedAACFrames']
    assert len(before) == len(after) == report[label + 'Packets']['aacFrameCount']
    assert before[:first] == after[:first] and before[last:] == after[last:]
    print(f'PASS {label}: untouched AAC packets and all packet clocks preserved')
    trim = ['-ss', str(11 + 2 / 3), '-t', str(29 + 22 / 30)] if label == 'tv' else []
    result = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', *trim, '-i', str(current),
        '-vn', '-af', 'loudnorm=I=-16:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'],
        capture_output=True, text=True, check=True)
    levels = json.loads(result.stderr[result.stderr.rfind('{'):])
    level, peak = float(levels['input_i']), float(levels['input_tp'])
    assert abs(level + 16) < .65 and peak < -1.3, (label, levels)
    print(f'PASS {label}: {level} LUFS, {peak} dBTP')

video_hash = media.ffmpeg('-i', ROOT / report['tv'], '-map', '0:v:0', '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-')
assert video_hash.decode().strip() == report['preservedVideoSHA256']
print('PASS all TV video packets preserved')
