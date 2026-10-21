"""Check both delivered recordings, ordering and the continuous Korean TV clock."""
import importlib.util
import json
from pathlib import Path
import subprocess

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('builder', ROOT / 'scripts/build-english-narration.py')
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)
RATE = media.RATE


def js_data(name):
    return json.loads((ROOT / name).read_text().split(' = ', 1)[1].strip().rstrip(';'))


source = json.loads((ROOT / 'assets/audio/meeting-v126/source.json').read_text())
timing = json.loads((ROOT / 'assets/audio/meeting-v126/timing.json').read_text())
for language in ['ko', 'en']:
    entry = timing[language]
    track = entry['track']
    old = media.read_audio(ROOT / source[language]['src'])
    new = media.read_audio(ROOT / track['src'])
    assert abs(len(new) / RATE - track['duration']) < .03
    assert abs(track['duration'] - source[language]['duration'] - entry['bridgeSpeechDuration'] - .35) < .001
    intervals = sorted(span for span in entry['sourceSpans'] if span)
    assert intervals[0][0] == 0
    for left, right in zip(intervals, intervals[1:]):
        assert abs(left[1] - right[0]) < 1 / RATE
    assert abs(intervals[-1][1] - source[language]['duration']) < .001
    # Compare decoded signals, not just declarations: every unchanged spoken
    # passage must survive reordering at natural speed, with no missing words.
    for destination, span in zip(entry['boundaries'], entry['sourceSpans']):
        if span is None:
            continue
        start, end = [round(t * RATE) for t in span]
        actual = new[round(destination * RATE):round(destination * RATE) + end - start]
        expected = old[start:end]
        correlation = np.corrcoef(actual[480:-480, 0], expected[480:-480, 0])[0, 1]
        assert correlation > .98, (language, span, correlation)
    filename = 'subtitle-data.js' if language == 'ko' else 'subtitle-data.en.js'
    subtitles = js_data(filename)
    captions = [' '.join(w['text'] for w in c['words']) for c in subtitles['02-tbm-basic']]
    starts = ['가공,', '공종 선택을', '회의진행 시작을', '작업자 명단', '당일 투입되는', '회의를 진행하며'] if language == 'ko' else [
        'Select the work types:', 'After selecting', 'and tap Start Briefing', 'to open the worker list.', "For today's temporary", 'During the briefing,']
    indices = [next(i for i, text in enumerate(captions) if text.startswith(prefix)) for prefix in starts]
    assert indices == sorted(indices), (language, captions)
    baseline = subprocess.check_output(['git', 'show', source['baseCommit'] + ':' + filename], cwd=ROOT, text=True)
    baseline = json.loads(baseline.split(' = ', 1)[1].strip().rstrip(';'))
    for key in subtitles:
        if key != '02-tbm-basic':
            assert subtitles[key] == baseline[key], key
    assert track['cues'][-1][1] == 55296
    print(f'PASS: {language} work types → swipe/start → workers → health; all original speech retained at natural speed')

tv = js_data('tv-media-timeline.js')
info = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(ROOT / tv['src'])]))
video, audio = info['streams']
assert (video['codec_name'], video['profile'], video['width'], video['height']) == ('h264', 'Main', 480, 1040)
assert audio['codec_name'] == 'aac'
assert abs(float(video['duration']) - tv['duration']) < .002
assert abs(float(audio['duration']) - tv['duration']) < .002
assert int(video['nb_frames']) == round(tv['duration'] * 30)
for left, right in zip(tv['segments'], tv['segments'][1:]):
    assert abs(left['end'] - right['start']) < 1e-6
for stream, step in [('v:0', 1 / 30), ('a:0', 1024 / RATE)]:
    data = json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', stream,
        '-show_packets', '-show_entries', 'packet=pts_time', '-of', 'json', str(ROOT / tv['src'])]))
    times = sorted(float(p['pts_time']) for p in data['packets'])
    assert all(abs(b - a - step) < .001 for a, b in zip(times, times[1:]))
print('PASS: Korean TV has continuous audio/video timestamps, complete frames and aligned chapters')
