"""Update the weather wording while preserving every TV video packet.

The three checked-in phrases use the existing ElevenLabs Jisoo voice. No keys
are needed to rebuild. Only AAC frames around the corrected sentence are
replaced; all other TV audio packets and chapter timestamps remain unchanged.
Requires Python, numpy, ffmpeg and ffprobe.
"""
import json
from pathlib import Path
import subprocess
import struct
import tempfile
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
SOURCES = ROOT / 'assets/audio/weather-v118'
RATE = 48000
DURATION = 29.701224
WEATHER_START = 8.166666666666666
TOUR_DURATION = 280.8666666666667
PATCH_START, PATCH_END = 16.66, 27.08
PHRASES = [
    ('countries', 16.78, 6.03, 5.45),
    ('korea', 22.32, 2.76, 2.85),
    ('view', 25.27, 1.55, 1.65),
]


def ffmpeg(*args):
    return subprocess.check_output(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y', *map(str, args)])


def decode(file, channels=1, filters=None):
    args = ['-i', file]
    if filters:
        args += ['-af', filters]
    data = ffmpeg(*args, '-f', 'f32le', '-ar', RATE, '-ac', channels, '-')
    return np.frombuffer(data, dtype='<f4').copy().reshape(-1, channels)


def encode_raw(samples, output, *options):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    '-f', 'f32le', '-ar', str(RATE), '-ac', str(samples.shape[1]),
                    '-i', 'pipe:0', *map(str, options), str(output)],
                   input=samples.astype('<f4').tobytes(), check=True)


def adts_frames(data):
    frames, offset = [], 0
    while offset < len(data):
        assert data[offset] == 255 and data[offset + 1] & 0xf6 == 0xf0
        size = ((data[offset + 3] & 3) << 11) | (data[offset + 4] << 3) | (data[offset + 5] >> 5)
        assert size >= 7 and offset + size <= len(data)
        frames.append(data[offset:offset + size])
        offset += size
    return frames


def atoms(data):
    offset = 0
    while offset < len(data):
        size, kind = struct.unpack_from('>I4s', data, offset)
        assert 8 <= size <= len(data) - offset
        yield kind, data[offset + 8:offset + size]
        offset += size


def box(kind, payload):
    return struct.pack('>I4s', len(payload) + 8, kind) + payload


def child(data, kind):
    return next(payload for name, payload in atoms(data) if name == kind)


def audio_trak(moov):
    return next(payload for name, payload in atoms(moov) if name == b'trak'
                and child(child(payload, b'mdia'), b'hdlr')[8:12] == b'soun')


def restore_audio_timestamps(base, output):
    # ADTS has no timestamps. Restore the original MP4 sample durations and
    # priming edit after remuxing, including its final partial AAC frame.
    old_moov = child(base.read_bytes(), b'moov')
    old_audio = audio_trak(old_moov)
    replacements = {}
    for path in [(b'tkhd',), (b'edts',), (b'mdia', b'mdhd'),
                 (b'mdia', b'minf', b'stbl', b'stts')]:
        payload = old_audio
        for kind in path:
            payload = child(payload, kind)
        replacements[path] = payload
    containers = {b'moov', b'trak', b'mdia', b'minf', b'stbl'}

    def rewrite(data, path=(), shift=0):
        result = []
        for kind, payload in atoms(data):
            route = path + (kind,)
            if not shift and route in replacements:
                payload = replacements[route]
            elif kind in containers:
                payload = rewrite(payload, route, shift)
            elif shift and kind in {b'stco', b'co64'}:
                width, fmt = (4, '>I') if kind == b'stco' else (8, '>Q')
                count = struct.unpack_from('>I', payload, 4)[0]
                payload = payload[:8] + b''.join(struct.pack(fmt,
                    struct.unpack_from(fmt, payload, 8 + i * width)[0] + shift)
                    for i in range(count))
            result.append(box(kind, payload))
        return b''.join(result)

    content = output.read_bytes()
    moov = child(content, b'moov')
    current_audio = audio_trak(moov)
    updated = b''.join(box(kind,
        rewrite(payload) if kind == b'trak' and payload == current_audio else
        child(old_moov, b'mvhd') if kind == b'mvhd' else payload)
        for kind, payload in atoms(moov))
    shift = len(updated) - len(moov)
    if shift:
        updated = rewrite(updated, shift=shift)
    # Both files were faststart-muxed, so every media chunk follows moov.
    assert content.index(b'moov') < content.index(b'mdat')
    output.write_bytes(b''.join(box(kind, updated if kind == b'moov' else payload)
                               for kind, payload in atoms(content)))


with tempfile.TemporaryDirectory(prefix='weather-narration-') as folder:
    work = Path(folder)
    old_voice = decode(ROOT / 'assets/audio/01-weather-jisoo.mp3')
    voice = np.zeros((round(DURATION * RATE), 1), dtype=np.float32)
    voice[:len(old_voice)] = old_voice
    voice[round(PATCH_START * RATE):round(PATCH_END * RATE)] = 0
    target_rms = np.sqrt(np.mean(old_voice[round(16.8 * RATE):round(27.0 * RATE)] ** 2))
    for name, start, trim, length in PHRASES:
        phrase = decode(SOURCES / f'{name}.mp3', filters=f'atrim=end={trim},atempo={trim / length:.9f}')
        phrase *= target_rms / max(1e-6, np.sqrt(np.mean(phrase ** 2)))
        # Limit the synthesized peaks without changing unrelated narration.
        raw = work / f'{name}.wav'
        encode_raw(phrase, raw, '-af', 'alimiter=limit=0.68:level=0:latency=1', '-c:a', 'pcm_f32le')
        phrase = decode(raw)
        count = round(length * RATE)
        phrase = np.pad(phrase[:count], ((0, max(0, count - len(phrase))), (0, 0)))
        fade = round(.005 * RATE)
        phrase[:fade] *= np.linspace(0, 1, fade).reshape(-1, 1)
        phrase[-fade:] *= np.linspace(1, 0, fade).reshape(-1, 1)
        first = round(start * RATE)
        voice[first:first + count] = phrase
    voice_file = ROOT / 'assets/audio/01-weather-jisoo-v118.m4a'
    encode_raw(voice, voice_file, '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart')

    # Reproduce the existing weather music offset and mix. The rest of the tour
    # uses the original PCM and, after encoding, its original AAC packet bytes.
    music = decode(ROOT / 'assets/audio/bgm-starcourt-mall-cc0.mp3', 2,
                   f'atrim=start=8.150204:duration={DURATION},asetpts=PTS-STARTPTS')
    music = music[:len(voice)] * .065
    mixed = music + np.repeat(voice[:len(music)], 2, axis=1)
    base = ROOT / 'assets/tv-v112/tour.mp4'
    tour = decode(base, 2)
    start = round((WEATHER_START + PATCH_START) * RATE)
    end = round((WEATHER_START + PATCH_END) * RATE)
    replacement = mixed[round(PATCH_START * RATE):round(PATCH_START * RATE) + end - start]
    weight = np.ones((end - start, 1), dtype=np.float32)
    fade = round(.03 * RATE)
    weight[:fade] = np.linspace(0, 1, fade).reshape(-1, 1)
    weight[-fade:] = np.linspace(1, 0, fade).reshape(-1, 1)
    tour[start:end] = tour[start:end] * (1 - weight) + replacement * weight
    encode_raw(tour, work / 'new.aac', '-c:a', 'aac', '-b:a', '160k', '-f', 'adts')
    original_frames = adts_frames(ffmpeg('-i', base, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'))
    new_frames = adts_frames((work / 'new.aac').read_bytes())
    assert len(original_frames) == len(new_frames), (len(original_frames), len(new_frames))
    # Include two overlap frames on either side for AAC's transform window.
    first = max(0, int(start / 1024) - 2)
    last = min(len(original_frames), int(np.ceil(end / 1024)) + 3)
    stitched = original_frames[:first] + new_frames[first:last] + original_frames[last:]
    (work / 'stitched.aac').write_bytes(b''.join(stitched))
    output = ROOT / 'assets/tv-v118'
    output.mkdir(exist_ok=True)
    ffmpeg('-i', base, '-itsoffset', -1024 / RATE, '-i', work / 'stitched.aac',
           '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-t', TOUR_DURATION,
           '-video_track_timescale', 16000, '-movflags', '+faststart', output / 'tour.mp4')
    restore_audio_timestamps(base, output / 'tour.mp4')
    manifest = {
        'voice': 'Jisoo', 'voiceId': 'iWLjl1zCuqXRkW6494ve',
        'text': '한국 기상청, 미국 합동태풍경보센터, 일본 기상청의 태풍 경로와 한국의 레이더 영상 및 기상특보를 한곳에서 확인하세요.',
        'weatherPatch': [PATCH_START, PATCH_END],
        'replacedAACFrames': [first, last],
        'base': 'assets/tv-v112/tour.mp4', 'duration': TOUR_DURATION,
    }
    (output / 'narration-update.json').write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + '\n')
    print(f'Updated weather voice and TV AAC frames {first}..{last - 1}; all video packets copied.')
