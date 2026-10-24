"""Verify whole-utterance provenance, media isolation, clocks and loudness."""
import hashlib
import importlib.util
import json
from pathlib import Path
import subprocess
import numpy as np
ROOT = Path(__file__).resolve().parents[1]
spec = importlib.util.spec_from_file_location('sentence', ROOT / 'scripts/build-weather-sentence.py')
sentence = importlib.util.module_from_spec(spec); spec.loader.exec_module(sentence)
media = sentence.media
report = json.loads((ROOT / 'assets/audio/weather-v139/repair.json').read_text())
source = ROOT / 'assets/audio/weather-v139/daily-sentence-jisoo.mp3'
assert hashlib.sha256(source.read_bytes()).hexdigest() == report['sourceSHA256']
assert report['text'] == sentence.TEXT and report['voiceId'] == sentence.VOICE_ID
assert report['synthesisUnit'] == 'complete sentence' and report['timeStretch'] == 1
assert 'sourceRanges' not in report
reference = media.decode(source, 2)
a, b = report['sourceTrimSamples']; reference = reference[a:b]
fixed = media.decode(ROOT / report['desktop'], 2)
first = round(report['phraseStart'] * 48000)
actual = fixed[first:first + len(reference)]
margin = 1024
correlation = float(np.corrcoef(reference[margin:-margin].ravel(), actual[margin:-margin].ravel())[0,1])
assert correlation > .98, correlation
assert first + len(reference) <= round(report['patch'][1] * 48000)
print('PASS unspliced complete utterance, original pace, correlation', correlation)

def packets(path, stream):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', '-select_streams', stream,
        '-show_entries', 'packet=pts,dts,duration', '-of', 'json', str(path)]))['packets']

for label in ['desktop', 'tv']:
    base, current = ROOT / report[label + 'Base'], ROOT / report[label]
    for stream in (['v:0', 'a:0'] if label == 'tv' else ['a:0']):
        assert packets(base, stream) == packets(current, stream), (label, stream, 'clock changed')
    before = media.adts_frames(media.ffmpeg('-i', base, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'))
    after = media.adts_frames(media.ffmpeg('-i', current, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'))
    a, b = report[label + 'Packets']['replacedAACFrames']
    assert len(before) == len(after) == report[label + 'Packets']['aacFrameCount']
    assert before[:a] == after[:a] and before[b:] == after[b:]
    trim = ['-ss', str(11 + 2/3), '-t', str(29 + 22/30)] if label == 'tv' else []
    result = subprocess.run(['ffmpeg','-hide_banner','-nostats',*trim,'-i',str(current),'-vn',
        '-af','loudnorm=I=-16:TP=-2:LRA=11:print_format=json','-f','null','-'],capture_output=True,text=True,check=True)
    levels = json.JSONDecoder().raw_decode(result.stderr[result.stderr.rfind('{'):])[0]
    level, peak = float(levels['input_i']), float(levels['input_tp'])
    assert abs(level + 16) < .65 and peak < -1.3, (label,levels)
    print(f'PASS {label}: unchanged outside AAC packets/all clocks; {level} LUFS, {peak} dBTP')
old_hash = media.ffmpeg('-i', ROOT / report['tvBase'], '-map','0:v:0','-c:v','copy','-f','hash','-hash','sha256','-')
new_hash = media.ffmpeg('-i', ROOT / report['tv'], '-map','0:v:0','-c:v','copy','-f','hash','-hash','sha256','-')
assert old_hash == new_hash
subprocess.run(['ffmpeg','-v','error','-i',str(ROOT / report['tv']),'-f','null','-'],check=True)
print('PASS every video packet unchanged; full output decode passed')
# Fail-safe preparation must not stretch or clip a too-long new sentence.
try:
    sentence.prepare_sentence(np.ones((4 * 48000, 2), dtype=np.float32) * .1, .1)
except ValueError as error:
    assert 'NOT accelerated or cut' in str(error)
else:
    raise AssertionError('Overlong phrase accepted')
print('PASS overlong-utterance refusal')
