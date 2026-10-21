"""Restore the Korean daily-forecast phrase from the existing Jisoo recording.

Requires numpy, ffmpeg and ffprobe. Keep every unaffected AAC packet, all
packet clocks and all TV video packets. No speech service or credentials.
"""
import importlib.util
import json
from pathlib import Path
import tempfile
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
RATE = 48000
OUT = ROOT / 'assets/audio/weather-v132'
TV = ROOT / 'assets/tv-ko-v132/tour.mp4'
PATCH = (13.75, 16.72)
START = 13.78
RANGES = [(20.27, 20.49), (8.765, 9.385), (14.465, 16.50)]
spec = importlib.util.spec_from_file_location('weather_packets', ROOT / 'scripts/build-weather-narration.py')
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)


def rms(samples):
    return float(np.sqrt(np.mean(samples ** 2)))


def patch_packets(base, output, samples, start, end, duration, work, video=False):
    encoded = work / 'new.aac'
    media.encode_raw(samples, encoded, '-c:a', 'aac', '-b:a', '192k', '-f', 'adts')
    old = media.adts_frames(media.ffmpeg('-i', base, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'))
    new = media.adts_frames(encoded.read_bytes())
    assert len(old) == len(new), (len(old), len(new))
    first = max(0, start // 1024 - 2)
    last = min(len(old), int(np.ceil(end / 1024)) + 3)
    frames = old[:first] + new[first:last] + old[last:]
    stitched = work / 'patched.aac'
    stitched.write_bytes(b''.join(frames))
    args = ['-i', base, '-itsoffset', -1024 / RATE, '-i', stitched]
    if video:
        args += ['-map', '0:v:0']
    args += ['-map', '1:a:0', '-c', 'copy', '-t', duration]
    if video:
        args += ['-video_track_timescale', 15360]
    media.ffmpeg(*args, '-movflags', '+faststart', output)
    media.restore_audio_timestamps(base, output)
    shipped = media.adts_frames(media.ffmpeg('-i', output, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'))
    assert shipped == frames
    return {'replacedAACFrames': [first, last], 'aacFrameCount': len(frames)}


def main():
    OUT.mkdir(exist_ok=True)
    TV.parent.mkdir(exist_ok=True)
    source = ROOT / 'assets/audio/01-weather-jisoo.mp3'
    base_voice = ROOT / 'assets/audio/weather-v129/01-weather.m4a'
    base_tv = ROOT / 'assets/tv-ko-v129/tour.mp4'
    original = media.decode(source, 2)
    previous = media.decode(base_voice, 2)
    gain = rms(previous[:10 * RATE]) / rms(original[:10 * RATE])
    parts = []
    for start, end in RANGES:
        part = original[round(start * RATE):round(end * RATE)].copy()
        fade = round(.003 * RATE)
        part[:fade] *= np.linspace(0, 1, fade)[:, None]
        part[-fade:] *= np.linspace(1, 0, fade)[:, None]
        parts.append(part)
    phrase = np.concatenate(parts) * gain
    voice = previous.copy()
    local_start, local_end = [round(t * RATE) for t in PATCH]
    voice[local_start:local_end] = 0
    first = round(START * RATE)
    voice[first:first + len(phrase)] = phrase
    assert first + len(phrase) <= local_end
    media.encode_raw(phrase, OUT / 'corrected-phrase.wav', '-c:a', 'pcm_s16le')
    timeline = json.loads((ROOT / 'assets/audio/balanced-v128/playback.json').read_text())['timelines']['ko']
    weather = next(item for item in timeline['segments'] if item['id'] == '01-weather')
    weather_start = round(weather['start'] * RATE)
    weather_count = round(weather['duration'] * RATE)
    with tempfile.TemporaryDirectory(prefix='weather-daily-') as folder:
        work = Path(folder)
        desktop = patch_packets(base_voice, OUT / '01-weather.m4a', voice,
            local_start, local_end, 29.701224, work)
        tour = media.decode(base_tv, 2)
        music = media.decode(ROOT / 'assets/audio/bgm-starcourt-mall-cc0.mp3', 2)
        offset = round(8.150204 * RATE)
        music = music[(np.arange(weather_count) + offset) % len(music)]
        count = 10 * RATE
        x = np.stack([previous[:count:8].ravel(), music[:count:8].ravel()], axis=1)
        y = tour[weather_start:weather_start + count:8].ravel()
        gains = np.linalg.lstsq(x, y, rcond=None)[0]
        residual = rms(x @ gains - y) / rms(y)
        assert residual < .02, ('unexpected TV source alignment', residual)
        replacement = voice[local_start:local_end] * gains[0] + music[local_start:local_end] * gains[1]
        start, end = weather_start + local_start, weather_start + local_end
        weights = np.ones((len(replacement), 1), dtype=np.float32)
        fade = round(.015 * RATE)
        weights[:fade] = np.linspace(0, 1, fade)[:, None]
        weights[-fade:] = np.linspace(1, 0, fade)[:, None]
        tour[start:end] = tour[start:end] * (1 - weights) + replacement * weights
        tv = patch_packets(base_tv, TV, tour, start, end, timeline['duration'], work, video=True)
        old_video = media.ffmpeg('-i', base_tv, '-map', '0:v:0', '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-')
        new_video = media.ffmpeg('-i', TV, '-map', '0:v:0', '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-')
        assert old_video == new_video
    report = {'text': '일별예보도 함께 확인할 수 있습니다.', 'voice': 'Jisoo',
        'source': source.relative_to(ROOT).as_posix(), 'sourceRanges': RANGES,
        'phraseStart': START, 'phraseDuration': len(phrase) / RATE, 'patch': PATCH,
        'gain': gain, 'edgeFade': .003, 'tvSourceResidual': residual,
        'desktopBase': base_voice.relative_to(ROOT).as_posix(),
        'desktop': (OUT / '01-weather.m4a').relative_to(ROOT).as_posix(),
        'desktopPackets': desktop, 'tvBase': base_tv.relative_to(ROOT).as_posix(),
        'tv': TV.relative_to(ROOT).as_posix(), 'tvPackets': tv,
        'preservedVideoSHA256': old_video.decode().strip()}
    (OUT / 'repair.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
