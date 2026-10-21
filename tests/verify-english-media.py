"""Inspect encoded English media against its playback and caption manifests."""
import json
from pathlib import Path
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def js_data(name):
    return json.loads((ROOT / name).read_text().split(' = ', 1)[1].strip().rstrip(';'))


def probe(path, *args):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', *args,
        '-of', 'json', str(ROOT / path)]))


manifest = js_data('english-narration.js')
subtitles = js_data('subtitle-data.en.js')
script = json.loads((ROOT / 'assets/audio/en-v119/script.json').read_text())
assert set(script['voices']) == {'will', 'sarah'}
assert len(manifest['tracks']) == 9
assert set(manifest['tracks']) == set(subtitles)
assert sum(len(cues) for cues in subtitles.values()) == 82
for track in script['tracks']:
    key = track['id']
    item = manifest['tracks'][key]
    assert all(c['voice'] in {'will', 'sarah'} for c in track['chunks'])
    assert all((ROOT / c['file']).stat().st_size > 1000 for c in track['chunks'])
    info = probe(item['src'], '-show_streams', '-show_format')
    assert abs(float(info['format']['duration']) - item['duration']) < .04, key
    assert any(s['codec_name'] == 'aac' for s in info['streams'])
    assert item['duration'] >= track['originalDuration'], 'English speech must not force Korean pacing'
    assert item['cues'][0] == track['originalCues'][0]
    assert item['cues'][-1][1] == track['originalCues'][-1][1]
    clock = item['clock']
    for (new0, old0), (new1, old1) in zip(clock, clock[1:]):
        assert new1 > new0 and old1 > old0
        assert new1 - new0 >= old1 - old0 - 2e-6, 'English must not drop original video time'
    assert all(0 <= c['start'] < c['end'] <= item['duration'] for c in subtitles[key])
    assert all(b['start'] >= a['end'] - 1e-6 for a, b in zip(subtitles[key], subtitles[key][1:]))
    for cue in subtitles[key]:
        assert all(cue['start'] <= w['start'] < w['end'] <= cue['end'] for w in cue['words'])
    audio = next(s for s in info['streams'] if s['codec_type'] == 'audio')
    assert audio['sample_rate'] == '48000'
print('PASS: all 9 English audio/video files, Will/Sarah source passages, 82 captions, independent clocks and intact visual endings')

tv = manifest['tv']
info = probe(tv['src'], '-show_streams')
video, audio = info['streams']
assert (video['codec_name'], video['profile'], video['width'], video['height']) == ('h264', 'Main', 480, 1040)
assert audio['codec_name'] == 'aac' and audio['sample_rate'] == '48000'
assert abs(float(video['duration']) - tv['duration']) < .002
assert abs(float(audio['duration']) - tv['duration']) < .002
assert int(video['nb_frames']) == round(tv['duration'] * 30)
assert len(tv['segments']) == 9
for previous, following in zip(tv['segments'], tv['segments'][1:]):
    assert abs(previous['end'] - following['start']) < 1e-6
for stream, step in [('v:0', 1 / 30), ('a:0', 1024 / 48000)]:
    packets = probe(tv['src'], '-select_streams', stream, '-show_packets', '-show_entries', 'packet=pts_time')['packets']
    times = sorted(float(p['pts_time']) for p in packets)
    assert all(abs(b - a - step) < .001 for a, b in zip(times, times[1:])), 'English TV packet gap: ' + stream
assert tv['src'] != js_data('tv-media-timeline.js')['src']
print('PASS: English TV is one continuous H.264/AAC stream with exact chapter boundaries and no timestamp gaps')

# Language-specific media must not overwrite any Korean source or its subtitles.
for path in ['subtitle-data.js', 'tv-media-timeline.js', 'assets/tv-v118/tour.mp4',
             'assets/safety4cut/09-ai-example-v84.mp4', 'assets/audio/01-weather-jisoo-v118.m4a']:
    result = subprocess.run(['git', 'diff', '--quiet', '6a3fb005606cfed28f2284d3185c8cdfbca5f572', '--', path], cwd=ROOT)
    assert result.returncode == 0, 'Korean media changed: ' + path
print('PASS: deployed Korean narration, subtitles, TV timeline/video and original safety example remain unchanged')
