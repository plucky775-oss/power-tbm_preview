"""Check actual H.264 configuration, clocks, complete frames and unchanged AAC."""
import argparse
import json
from pathlib import Path
import re
import struct
import subprocess

ROOT = Path(__file__).resolve().parents[1]


def probe(path, *args):
    return json.loads(subprocess.check_output([
        'ffprobe', '-v', 'error', *args, '-of', 'json', str(path)
    ]))


def parameter_sets(path):
    stream = subprocess.check_output([
        'ffmpeg', '-v', 'error', '-i', str(path), '-map', '0:v:0', '-c:v', 'copy',
        '-bsf:v', 'h264_mp4toannexb', '-f', 'h264', '-'
    ])
    units = re.split(b'\x00\x00\x00?\x01', stream)
    return {kind: {unit for unit in units if unit and unit[0] & 31 == kind}
            for kind in (7, 8)}


def verify(movie):
    timeline = json.loads((ROOT / 'tv-media-timeline.js').read_text().split(' = ', 1)[1].rstrip(';\n'))
    params = parameter_sets(movie)
    assert len(params[7]) == len(params[8]) == 1, (
        f'Changing H.264 decoder configuration: SPS={len(params[7])}, PPS={len(params[8])}')
    print('PASS one SPS and one PPS across the complete Korean tour')

    reference = ROOT / 'assets/tv-ko-v132/tour.mp4'
    streams = probe(movie, '-show_streams')['streams']
    video, audio = streams
    assert (video['codec_name'], video['profile'], video['level'], video['width'], video['height']) == (
        'h264', 'Main', 31, 480, 1040)
    assert video['pix_fmt'] == 'yuv420p' and video['avg_frame_rate'] == '30/1'
    assert audio['codec_name'] == 'aac' and audio['sample_rate'] == '48000'
    assert int(video['nb_frames']) == round(timeline['duration'] * 30)
    for stream in streams:
        assert abs(float(stream['duration']) - timeline['duration']) < .001

    args = ('-select_streams', 'a:0', '-show_packets', '-show_data_hash', 'sha256',
            '-show_entries', 'packet=pts,dts,duration,data_hash')
    assert probe(movie, *args) == probe(reference, *args), 'AAC audio or timestamps changed'
    print('PASS every corrected voice/music AAC packet and timestamp unchanged')

    args = ('-select_streams', 'v:0', '-show_packets', '-show_entries', 'packet=pts_time,dts_time,flags')
    packets = probe(movie, *args)['packets']
    original = probe(reference, *args)['packets']
    pts = sorted(float(p['pts_time']) for p in packets)
    assert pts == sorted(float(p['pts_time']) for p in original), 'video frames/times changed'
    dts = [float(p['dts_time']) for p in packets]
    for clock in [pts, dts]:
        assert all(abs(b - a - 1 / 30) < .00001 for a, b in zip(clock, clock[1:])), 'clock gap'
    keys = [float(p['pts_time']) for p in packets if 'K' in p['flags']]
    assert keys[0] == 0 and max(b - a for a, b in zip(keys, keys[1:])) <= 2.001
    print(f'PASS all {len(pts)} frames, chapter times and final frame retained; keyframes <=2s apart')

    atoms = []
    with movie.open('rb') as file:
        while header := file.read(8):
            size, kind = struct.unpack('>I4s', header)
            assert size >= 8, 'unexpected top-level MP4 atom'
            atoms.append(kind)
            file.seek(size - 8, 1)
    assert atoms.index(b'moov') < atoms.index(b'mdat'), 'faststart metadata missing'
    decoded = subprocess.run(['ffmpeg', '-v', 'error', '-xerror', '-i', str(movie),
                              '-f', 'null', '-'], capture_output=True, text=True)
    assert decoded.returncode == 0 and not decoded.stderr, decoded.stderr
    print('PASS faststart MP4; entire Korean audio/video decodes without errors')


if __name__ == '__main__':
    parser = argparse.ArgumentParser()
    parser.add_argument('--file', type=Path, default=ROOT / 'assets/tv-ko-v136/tour.mp4')
    verify(parser.parse_args().file)
