"""Verify the actual TV file, including uninterrupted timestamps and the full ending."""
import hashlib
import json
from pathlib import Path
import re
import subprocess

ROOT = Path(__file__).resolve().parents[1]
timeline = json.loads((ROOT / 'tv-media-timeline.js').read_text().split(' = ', 1)[1].rstrip(';\n'))
movie = ROOT / timeline['src']
original = ROOT / 'assets/safety4cut/09-ai-example-v84.mp4'

def probe(*args):
    return json.loads(subprocess.check_output(['ffprobe', '-v', 'error', *args, '-of', 'json', str(movie)]))

info = probe('-show_streams')
video, audio = info['streams']
assert (video['codec_name'], video['profile'], video['width'], video['height']) == ('h264', 'Main', 480, 1040)
assert audio['codec_name'] == 'aac' and audio['sample_rate'] == '48000'
assert abs(float(video['duration']) - timeline['duration']) < .001
assert abs(float(audio['duration']) - timeline['duration']) < .001
assert int(video['nb_frames']) == round(timeline['duration'] * 30)
for stream, step in [('v:0', 1 / 30), ('a:0', 1024 / 48000)]:
    packets = probe('-select_streams', stream, '-show_packets', '-show_entries', 'packet=pts_time')['packets']
    times = sorted(float(packet['pts_time']) for packet in packets)
    assert all(abs(b - a - step) < .001 for a, b in zip(times, times[1:])), stream + ' has timestamp gaps'
print('PASS one H.264/AAC stream; all video/audio timestamps are continuous; duration 280.867s')

# The splash must stay light enough to start over a modest TV connection while
# preserving every frame. Checking the whole-file average hid its old 2 Mbps burst.
opening = timeline['segments'][0]
packets = probe('-select_streams', 'v:0', '-read_intervals', '%+9', '-show_packets',
                '-show_entries', 'packet=pts_time,size')['packets']
opening_packets = [packet for packet in packets if float(packet['pts_time']) < opening['end']]
assert len(opening_packets) == 245, 'opening must retain its 30 fps frame count'
per_second = {}
for packet in opening_packets:
    second = int(float(packet['pts_time']))
    per_second[second] = per_second.get(second, 0) + int(packet['size'])
assert max(per_second.values()) * 8 < 1_200_000, 'opening bitrate burst exceeds its startup budget'
print(f'PASS opening retains 245 frames; largest one-second video payload {max(per_second.values()) * 8 / 1000:.0f} kbps')

# This release changes only the opening. Protect later clips, their precomposed
# Korean labels, and the continuous audio against accidental rebuild changes.
base = ROOT / 'assets/tv-v104/tour.mp4'
for stream in ['v:0', 'a:0']:
    tracks = []
    for file in [base, movie]:
        packets = json.loads(subprocess.check_output([
            'ffprobe', '-v', 'error', '-select_streams', stream, '-show_packets',
            '-show_data_hash', 'sha256', '-show_entries', 'packet=pts_time,data_hash',
            '-of', 'json', str(file)]))['packets']
        if stream == 'v:0':
            packets = [packet for packet in packets if float(packet['pts_time']) >= opening['end']]
        tracks.append(packets)
    assert len(tracks[0]) == len(tracks[1]), stream + ' lost packets'
    assert all(a['data_hash'] == b['data_hash'] and abs(float(a['pts_time']) - float(b['pts_time'])) < .001
               for a, b in zip(*tracks)), stream + ' changed outside the opening'
print('PASS every later video packet and the complete AAC track are unchanged')

assert hashlib.sha256(original.read_bytes()).hexdigest() == '981c8cf85a52abab0bc976528c7675026582762f506d0e4aa2cd0740a5c05509'
example = next(entry for entry in timeline['segments'] if entry['id'] == '08-safety4cut-example')
start, end = round(example['start'] * 30), round(example['end'] * 30)
assert end - start == 1937, 'the complete original must occupy 1937 frames'
# Compare every decoded frame, including the final frame, against the original.
result = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(movie), '-i', str(original),
    '-filter_complex', f'[0:v]trim=start_frame={start}:end_frame={end},crop=480:480:0:250,settb=1/30,setpts=N[a];'
    '[1:v]scale=480:480,settb=1/30,setpts=N[b];[a][b]ssim', '-an', '-f', 'null', '-'], capture_output=True, text=True, check=True)
score = float(re.search(r'All:([0-9.]+)', result.stderr)[1])
assert score > .98, f'original safety content differs: SSIM {score}'
assert re.search(r'frame=\s*1937\b', result.stderr), 'comparison did not reach the original final frame'
print(f'PASS original file unchanged; all 1937 safety frames retained, SSIM {score:.6f}')
