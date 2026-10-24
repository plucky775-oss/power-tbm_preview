"""Replace the complete daily-forecast sentence, never individual syllables.

Input must be one newly generated, unedited ElevenLabs Jisoo utterance of TEXT.
No provider calls or credentials. This script does NOT publish or change runtime
references. It refuses to speed up speech or overwrite neighboring narration.
Requires numpy, ffmpeg and ffprobe. Run from a complete pinned v138 checkout.
"""
import argparse
import hashlib
import importlib.util
import json
from pathlib import Path
import tempfile
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
TEXT = '일별 예보도 함께 확인할 수 있습니다.'
VOICE_ID = 'iWLjl1zCuqXRkW6494ve'
RATE = 48000
PATCH = (13.75, 16.72)
START = 13.78
OUT = ROOT / 'assets/audio/weather-v139'
TV = ROOT / 'assets/tv-ko-v139/tour.mp4'
BASE_VOICE = ROOT / 'assets/audio/weather-v132/01-weather.m4a'
BASE_TV = ROOT / 'assets/tv-ko-v136/tour.mp4'
spec = importlib.util.spec_from_file_location('daily_packets', ROOT / 'scripts/build-weather-daily.py')
daily = importlib.util.module_from_spec(spec)
spec.loader.exec_module(daily)
media = daily.media


def prepare_sentence(samples, target_rms):
    """Trim only quiet outer padding; preserve every interior sample and pace."""
    step = RATE // 200
    envelope = np.array([daily.rms(samples[i:i + step]) for i in range(0, len(samples), step)])
    if not len(envelope) or np.max(envelope) < .002:
        raise ValueError('Input contains no usable speech')
    active = np.flatnonzero(envelope > max(.001, float(np.max(envelope)) * .01))
    begin = max(0, int(active[0]) * step - round(.04 * RATE))
    finish = min(len(samples), (int(active[-1]) + 1) * step + round(.08 * RATE))
    phrase = samples[begin:finish].copy()
    if len(phrase) > round((PATCH[1] - START) * RATE):
        raise ValueError(f'Natural sentence is {len(phrase) / RATE:.3f}s; slot is {PATCH[1] - START:.3f}s. '
                         'Retiming review required; speech was NOT accelerated or cut.')
    gain = target_rms / daily.rms(phrase)
    if np.max(np.abs(phrase)) * gain > .88:
        raise ValueError('Required loudness gain would exceed safe headroom; review required')
    phrase *= gain
    fade = min(round(.005 * RATE), len(phrase) // 2)
    phrase[:fade] *= np.linspace(0, 1, fade)[:, None]
    phrase[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return phrase, {'sourceTrimSamples': [begin, finish], 'gain': gain, 'edgeFade': .005,
                    'timeStretch': 1.0, 'phraseDuration': len(phrase) / RATE}


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--provenance', required=True, type=Path,
                        help='JSON with provider, voiceId, text, model; no credentials')
    args = parser.parse_args()
    provenance = json.loads(args.provenance.read_text())
    assert provenance['provider'] == 'ElevenLabs'
    assert provenance['voiceId'] == VOICE_ID
    assert provenance['text'] == TEXT
    assert provenance.get('model'), 'Record the actual synthesis model'
    original = media.decode(BASE_VOICE, 2)
    source = media.decode(args.source, 2)
    first, end = [round(t * RATE) for t in (START, PATCH[1])]
    local_start, local_end = [round(t * RATE) for t in PATCH]
    phrase, processing = prepare_sentence(source, daily.rms(original[first:round(16.655 * RATE)]))
    voice = original.copy()
    voice[local_start:local_end] = 0
    voice[first:first + len(phrase)] = phrase
    timeline = json.loads((ROOT / 'tv-media-timeline.js').read_text().split(' = ', 1)[1].rstrip().rstrip(';'))
    weather = next(s for s in timeline['segments'] if s['id'] == '01-weather')
    weather_start, count = round(weather['start'] * RATE), round(weather['duration'] * RATE)
    tour = media.decode(BASE_TV, 2)
    music = media.decode(ROOT / 'assets/audio/bgm-starcourt-mall-cc0.mp3', 2)
    music = music[(np.arange(count) + round(8.150204 * RATE)) % len(music)]
    x = np.stack([original[:10 * RATE:8].ravel(), music[:10 * RATE:8].ravel()], axis=1)
    y = tour[weather_start:weather_start + 10 * RATE:8].ravel()
    gains = np.linalg.lstsq(x, y, rcond=None)[0]
    residual = daily.rms(x @ gains - y) / daily.rms(y)
    assert residual < .02, ('unexpected TV alignment', residual)
    replacement = voice[local_start:local_end] * gains[0] + music[local_start:local_end] * gains[1]
    start, end = weather_start + local_start, weather_start + local_end
    weights = np.ones((end - start, 1), dtype=np.float32)
    fade = round(.015 * RATE)
    weights[:fade] = np.linspace(0, 1, fade)[:, None]
    weights[-fade:] = np.linspace(1, 0, fade)[:, None]
    tour[start:end] = tour[start:end] * (1 - weights) + replacement * weights
    OUT.mkdir(parents=True, exist_ok=True)
    TV.parent.mkdir(parents=True, exist_ok=True)
    with tempfile.TemporaryDirectory(prefix='weather-sentence-') as temp:
        work = Path(temp)
        desktop = daily.patch_packets(BASE_VOICE, OUT / '01-weather.m4a', voice,
            local_start, local_end, 29.701224, work)
        tv = daily.patch_packets(BASE_TV, TV, tour, start, end, timeline['duration'], work, video=True)
    media.encode_raw(phrase, OUT / 'corrected-phrase.wav', '-c:a', 'pcm_s16le')
    report = {'text': TEXT, 'voice': 'Jisoo', 'voiceId': VOICE_ID,
        'provider': provenance['provider'], 'model': provenance['model'],
        'sourceSHA256': hashlib.sha256(args.source.read_bytes()).hexdigest(),
        'synthesisUnit': 'complete sentence', 'phraseStart': START, 'patch': PATCH,
        **processing, 'tvSourceResidual': residual,
        'desktopBase': str(BASE_VOICE.relative_to(ROOT)), 'desktop': str((OUT / '01-weather.m4a').relative_to(ROOT)),
        'desktopPackets': desktop, 'tvBase': str(BASE_TV.relative_to(ROOT)),
        'tv': str(TV.relative_to(ROOT)), 'tvPackets': tv}
    (OUT / 'repair.json').write_text(json.dumps(report, ensure_ascii=False, indent=2) + '\n')
    print(json.dumps(report, ensure_ascii=False, indent=2))


if __name__ == '__main__':
    main()
