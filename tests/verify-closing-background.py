"""The greeting keeps every preceding shot, excludes the brief final cut and holds."""
from pathlib import Path
import json
import re
import subprocess
from PIL import Image

root = Path(__file__).resolve().parents[1]
video = root / 'assets/background/tbm-guide-closing-v138.mp4'
source = root / 'assets/background/tbm-guide-closing-v69.mp4'
info = json.loads(subprocess.check_output([
    'ffprobe', '-v', 'error', '-show_streams', '-of', 'json', str(video)
]))['streams']
assert len(info) == 1 and info[0]['codec_type'] == 'video'
assert int(info[0]['nb_frames']) == 185, 'the six-frame final shot must be excluded'
assert abs(float(info[0]['duration']) - 185 / 30) < .001
result = subprocess.run([
    'ffmpeg', '-hide_banner', '-nostats', '-i', str(video), '-i', str(source),
    '-filter_complex', '[1:v]trim=end_frame=185,setpts=PTS-STARTPTS[original];[0:v][original]ssim',
    '-an', '-f', 'null', '-'
], capture_output=True, text=True, check=True)
score = float(re.search(r'All:([0-9.]+)', result.stderr)[1])
assert score > .99, score
with Image.open(root / 'assets/tv-background-v138/tbm-guide-closing-v138.webp') as image:
    assert image.is_animated and image.info['loop'] == 1, 'play once, then hold the last frame'
    duration = 0
    for frame in range(image.n_frames):
        image.seek(frame)
        image.load()
        duration += image.info['duration']
    assert 6000 <= duration <= 6250
print(f'PASS closing: 185 retained frames, SSIM {score:.6f}, TV animation plays once ({duration} ms)')
