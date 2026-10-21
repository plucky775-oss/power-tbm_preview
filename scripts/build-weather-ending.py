"""Repair the clipped Korean weather ending using complete existing phonemes.

Keep the rest of the narration, all TV video packets and unaffected TV AAC
packets. Requires numpy, ffmpeg and ffprobe; no external speech service.
"""
import importlib.util
import json
from pathlib import Path
import tempfile

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio/weather-v129'
TV = ROOT / 'assets/tv-ko-v129/tour.mp4'
RATE = 48000
START = 25.15
SHIFT = .15
spec = importlib.util.spec_from_file_location('weather_packets', ROOT / 'scripts/build-weather-narration.py')
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)


def main():
    OUT.mkdir(exist_ok=True)
    TV.parent.mkdir(exist_ok=True)
    original = media.decode(ROOT / 'assets/audio/01-weather-jisoo.mp3', 2)
    previous = media.decode(ROOT / 'assets/audio/balanced-v128/ko-01-weather.m4a', 2)
    voice = previous.copy()

    def cut(audio, start, end):
        return audio[round(start * RATE):round(end * RATE)].copy()

    def rms(audio):
        return float(np.sqrt(np.mean(audio ** 2)))

    # ASR word times landed inside 를/서/께 and before the final 다 in v128.
    # Use the quiet phoneme boundaries, retaining the full natural word tails.
    prefix = cut(original, 24.82, 25.65)
    ending = cut(original, 15.35, 16.50)
    gain = rms(previous[:10 * RATE]) / rms(original[:10 * RATE])
    ending_gain = 1.24
    ending *= ending_gain
    for phrase in [prefix, ending]:
        count = round(.008 * RATE)
        phrase[:count] *= np.linspace(0, 1, count)[:, None]
        phrase[-count:] *= np.linspace(1, 0, count)[:, None]
    sentence = np.concatenate([prefix, ending]) * gain
    voice[round(START * RATE):] = 0
    first = round(25.17 * RATE)
    voice[first:first + len(sentence)] = sentence
    closing = cut(previous, 27.08, len(previous) / RATE - SHIFT)
    first = round((27.08 + SHIFT) * RATE)
    voice[first:first + len(closing)] = closing
    assert np.array_equal(voice[:round(START * RATE)], previous[:round(START * RATE)])
    media.encode_raw(voice, OUT / '01-weather.m4a', '-c:a', 'aac', '-b:a', '192k',
                     '-t', 29.701224, '-movflags', '+faststart')
    media.encode_raw(sentence, OUT / 'corrected-phrase.wav', '-c:a', 'pcm_s16le')

    with tempfile.TemporaryDirectory(prefix='weather-ending-') as folder:
        work = Path(folder)
        base = ROOT / 'assets/tv-ko-v128/tour.mp4'
        tour = media.decode(base, 2)
        timeline = json.loads((ROOT / 'assets/audio/balanced-v128/playback.json').read_text())['timelines']['ko']
        weather = next(item for item in timeline['segments'] if item['id'] == '01-weather')
        weather_start = round(weather['start'] * RATE)
        weather_count = round(weather['duration'] * RATE)
        music = media.decode(ROOT / 'assets/audio/bgm-starcourt-mall-cc0.mp3', 2)
        offset = round(8.150204 * RATE)
        music = music[(np.arange(weather_count) + offset) % len(music)]
        # Recover the existing linear voice/music gains from the unchanged
        # opening of the chapter, avoiding a level jump at the patch boundary.
        count = 24 * RATE
        x = np.stack([previous[:count:8].ravel(), music[:count:8].ravel()], axis=1)
        y = tour[weather_start:weather_start + count:8].ravel()
        gains = np.linalg.lstsq(x, y, rcond=None)[0]
        residual = rms(x @ gains - y) / rms(y)
        assert residual < .02, ('unexpected TV source alignment', residual)
        voice = np.pad(voice[:weather_count], ((0, max(0, weather_count - len(voice))), (0, 0)))
        mixed = voice * gains[0] + music * gains[1]
        local_start = round(START * RATE)
        start, end = weather_start + local_start, weather_start + weather_count
        replacement = mixed[local_start:weather_count]
        weights = np.ones((len(replacement), 1), dtype=np.float32)
        fade = round(.015 * RATE)
        weights[:fade] = np.linspace(0, 1, fade)[:, None]
        weights[-fade:] = np.linspace(1, 0, fade)[:, None]
        tour[start:end] = tour[start:end] * (1 - weights) + replacement * weights
        media.encode_raw(tour, work / 'new.aac', '-c:a', 'aac', '-b:a', '192k', '-f', 'adts')
        old_frames = media.adts_frames(media.ffmpeg('-i', base, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'))
        new_frames = media.adts_frames((work / 'new.aac').read_bytes())
        assert len(old_frames) == len(new_frames), (len(old_frames), len(new_frames))
        first = max(0, start // 1024 - 2)
        last = min(len(old_frames), int(np.ceil(end / 1024)) + 3)
        frames = old_frames[:first] + new_frames[first:last] + old_frames[last:]
        (work / 'patched.aac').write_bytes(b''.join(frames))
        media.ffmpeg('-i', base, '-itsoffset', -1024 / RATE, '-i', work / 'patched.aac',
            '-map', '0:v:0', '-map', '1:a:0', '-c', 'copy', '-t', timeline['duration'],
            '-video_track_timescale', 15360, '-movflags', '+faststart', TV)
        media.restore_audio_timestamps(base, TV)
        # Check preservation at the encoded-packet level after the final remux.
        shipped = media.adts_frames(media.ffmpeg('-i', TV, '-map', '0:a:0', '-c:a', 'copy', '-f', 'adts', '-'))
        assert shipped == frames
        old_video = media.ffmpeg('-i', base, '-map', '0:v:0', '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-')
        new_video = media.ffmpeg('-i', TV, '-map', '0:v:0', '-c:v', 'copy', '-f', 'hash', '-hash', 'sha256', '-')
        assert old_video == new_video
        report = {'text': '한 곳에서 확인할 수 있습니다.', 'voice': 'Jisoo',
            'source': 'assets/audio/01-weather-jisoo.mp3',
            'sourceRanges': [[24.82, 25.65], [15.35, 16.50]],
            'phraseStart': 25.17, 'phraseDuration': len(sentence) / RATE,
            'closingShift': SHIFT, 'endingGain': ending_gain,
            'tvBase': base.relative_to(ROOT).as_posix(), 'tvSourceResidual': residual,
            'replacedAACFrames': [first, last], 'aacFrameCount': len(frames),
            'preservedVideoSHA256': old_video.decode().strip(),
            'desktop': (OUT / '01-weather.m4a').relative_to(ROOT).as_posix(),
            'tv': TV.relative_to(ROOT).as_posix()}
        (OUT / 'repair.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
        print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
