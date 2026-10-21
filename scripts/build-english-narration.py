"""Build the English narration, subtitle clock and single-decoder video assets.

Uses the checked-in English source recordings; no service or API key is needed.
Requires Python, numpy, ffmpeg and ffprobe. Korean assets are never rewritten.
"""
import argparse
import json
import math
from pathlib import Path
import subprocess
import tempfile
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio/en-v119'
TV = ROOT / 'assets/tv-en-v119'
RATE, FPS = 48000, 30


def run(args):
    subprocess.run(['ffmpeg', '-hide_banner', '-loglevel', 'error', '-y',
                    '-filter_complex_threads', '1', *map(str, args)], check=True)


def read_audio(path):
    raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
        '-f', 'f32le', '-ar', str(RATE), '-ac', '2', '-'])
    return np.frombuffer(raw, dtype='<f4').reshape(-1, 2).copy()


def wav(path, audio):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE),
        '-ac', '2', '-i', '-', '-c:a', 'pcm_s16le', str(path)],
        input=audio.astype('<f4').tobytes(), check=True)


def interpolate(points, value):
    return float(np.interp(value, [p[0] for p in points], [p[1] for p in points]))


def trim_voice(audio):
    window = RATE // 100
    windows = len(audio) // window
    rms = np.sqrt(np.mean(audio[:windows * window].reshape(windows, window, 2) ** 2, axis=(1, 2)))
    active = np.flatnonzero(rms > max(.002, float(rms.max()) * .015))
    if not len(active):
        raise ValueError('Recording contains no speech')
    start = max(0, int(active[0]) * window - int(.04 * RATE))
    end = min(len(audio), (int(active[-1]) + 1) * window + int(.10 * RATE))
    voice = audio[start:end].copy()
    # Match the existing narration level without clipping or time-compressing speech.
    gain = min(.13 / max(.001, float(np.sqrt(np.mean(voice ** 2)))),
               .85 / max(.001, float(np.max(np.abs(voice)))))
    voice *= gain
    fade = min(240, len(voice) // 2)
    voice[:fade] *= np.linspace(0, 1, fade)[:, None]
    voice[-fade:] *= np.linspace(1, 0, fade)[:, None]
    return voice


def time_expression(clock):
    """Inverse clock: original video seconds -> extended English seconds."""
    terms = []
    for (new0, old0), (new1, old1) in zip(clock, clock[1:]):
        if old1 <= old0:
            continue
        terms.append(f'clip(T-{old0:.9f},0,{old1-old0:.9f})*{(new1-new0)/(old1-old0):.9f}')
    return '+'.join(terms)


def weight(word):
    return max(2, len(word.strip('.,—?!’')) ** .72)


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--audio-only', action='store_true')
    args = parser.parse_args()
    script = json.loads((OUT / 'script.json').read_text())
    TV.mkdir(exist_ok=True)
    base_tv = json.loads((ROOT / 'tv-media-timeline.js').read_text().split(' = ', 1)[1].strip().rstrip(';'))
    runtime = {'version': 119, 'tracks': {}, 'tv': {'src': 'assets/tv-en-v119/tour.mp4',
               'width': 480, 'height': 1040, 'segments': []}}
    subtitles = {}
    music = read_audio(ROOT / 'assets/audio/bgm-starcourt-mall-cc0.mp3')
    tv_audio, tv_clock, global_original, global_english = [], [[0, 0]], 0., 0.
    with tempfile.TemporaryDirectory(prefix='tbm-english-') as temp:
        work = Path(temp)
        for track in script['tracks']:
            key = track['id']
            original_duration = track['originalDuration']
            clock, offset, voices, cues = [[0., 0.]], 0., [], []
            for chunk in track['chunks']:
                voice = trim_voice(read_audio(ROOT / chunk['file']))
                speech_length = len(voice) / RATE
                start, end = chunk['start'], chunk['end']
                span = max(end - start, math.ceil((speech_length + .22) * FPS) / FPS)
                new_start = start + offset
                if start > clock[-1][1] + .000001:
                    clock.append([new_start, start])
                new_end = new_start + span
                clock.append([new_end, end])
                offset += span - (end - start)
                voices.append((round((new_start + .06) * RATE), voice))
                # Split the approved display captions over each complete spoken
                # passage. Highlights indicate reading progress within the passage.
                indices = chunk['cueIndices']
                words = [word for i in indices for word in track['originalSubtitles'][i]['words']]
                weights = [weight(word['text']) for word in words]
                unit = speech_length / sum(weights)
                cursor = new_start + .06
                wi = 0
                for ci in indices:
                    displayed = []
                    for word in track['originalSubtitles'][ci]['words']:
                        finish = cursor + weights[wi] * unit
                        displayed.append({'text': word['text'], 'start': round(cursor, 6), 'end': round(finish, 6)})
                        cursor = finish
                        wi += 1
                    cues.append({'start': displayed[0]['start'], 'end': displayed[-1]['end'], 'words': displayed})
                cues[-1]['end'] = round(min(new_end, cursor + .15), 6)
            duration = math.ceil((original_duration + offset) * FPS) / FPS
            if original_duration > clock[-1][1]:
                clock.append([duration, original_duration])
            else:
                clock[-1][0] = duration
            audio = np.zeros((round(duration * RATE), 2), dtype=np.float32)
            for start, voice in voices:
                audio[start:start + len(voice)] += voice
            spoken = work / (key + '.wav')
            wav(spoken, audio)
            if key != '08-safety4cut-example':
                encoded = work / (key + '.m4a')
                run(['-i', spoken, '-c:a', 'aac', '-b:a', '160k', '-movflags', '+faststart', encoded])
                encoded.replace(OUT / encoded.name)
            src = f'assets/audio/en-v119/{key}.m4a'
            if key == '08-safety4cut-example':
                src = 'assets/safety4cut/09-ai-example-en-v119.mp4'
            # Compose the English media clock with the untouched Korean visual
            # animation clock, including every knot from both mappings.
            original_cues = track['originalCues']
            old_times = sorted(set([p[1] for p in clock] + [p[0] for p in original_cues]))
            inverse = [[old, new] for new, old in clock]
            visual = [[round(interpolate(inverse, old), 6), round(interpolate(original_cues, old), 6)] for old in old_times]
            runtime['tracks'][key] = {'src': src, 'duration': duration, 'cues': visual,
                                      'clock': [[round(a, 6), round(b, 6)] for a, b in clock]}
            subtitles[key] = cues
            # Pre-mix speech and the existing licensed music for the TV's one
            # foreground decoder and for the English Safety 4-Cut example.
            gain = .12 if key == '00-opening' else .13 if key == '06-closing' else .065
            music_start = round(global_english * RATE)
            bed = music[(np.arange(len(audio)) + music_start) % len(music)].copy() * gain
            if key == '06-closing':
                n = min(len(bed), round(2.35 * RATE))
                bed[-n:] *= np.linspace(1, 0, n)[:, None]
            mix = audio + bed
            if key == '08-safety4cut-example':
                # The original arc-effect interval contains no spoken Korean.
                # Preserve it at its mapped time instead of mixing both voices.
                source_audio = read_audio(ROOT / 'assets/safety4cut/09-ai-example-v84.mp4')
                effect_start, effect_end = 33.8, 37.3
                at = round(interpolate(inverse, effect_start) * RATE)
                effect = source_audio[round(effect_start * RATE):round(effect_end * RATE)]
                fade = round(.08 * RATE)
                effect[:fade] *= np.linspace(0, 1, fade)[:, None]
                effect[-fade:] *= np.linspace(1, 0, fade)[:, None]
                mix[at:at + len(effect)] += effect
                wav(work / 'safety-en.wav', np.clip(mix, -.98, .98))
                if not args.audio_only:
                    expression = time_expression(clock)
                    run(['-i', ROOT / 'assets/safety4cut/09-ai-example-v84.mp4', '-i', work / 'safety-en.wav',
                        '-vf', f"setpts='({expression})/TB',fps=30,tpad=stop_mode=clone:stop_duration=1,trim=duration={duration}",
                        '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'fast', '-crf', '20',
                        '-profile:v', 'main', '-level:v', '3.1', '-pix_fmt', 'yuv420p', '-threads', '2',
                        '-c:a', 'aac', '-b:a', '160k', '-t', duration, '-movflags', '+faststart', work / 'safety-final.mp4'])
                    (work / 'safety-final.mp4').replace(ROOT / src)
            tv_audio.append(np.clip(mix, -.98, .98))
            runtime['tv']['segments'].append({'id': key, 'page': track['page'], 'index': track['index'],
                'start': round(global_english, 6), 'duration': duration, 'end': round(global_english + duration, 6)})
            tv_original_duration = next(x['duration'] for x in base_tv['segments'] if x['id'] == key)
            # The base TV video rounds chapters to complete frames. Convert its
            # local timestamps before applying the same English passage clock.
            for new, old in clock[1:]:
                tv_clock.append([global_english + new,
                                 global_original + old * tv_original_duration / original_duration])
            global_english += duration
            global_original += tv_original_duration
            print(f'{key}: {original_duration:.2f}s -> {duration:.2f}s', flush=True)
        runtime['tv']['duration'] = round(global_english, 6)
        (ROOT / 'english-narration.js').write_text('// Generated by scripts/build-english-narration.py. Seconds unless noted.\n'
            'window.PowerTBMEnglishNarration = ' + json.dumps(runtime, indent=2) + ';\n')
        (ROOT / 'subtitle-data.en.js').write_text('// English captions timed to the recorded English narration.\n'
            '// Word fill is a passage-based reading guide, not forced word alignment.\n'
            'window.PowerTBMSubtitleDataEn = ' + json.dumps(dict(sorted(subtitles.items())), ensure_ascii=False, separators=(',', ':')) + ';\n')
        if not args.audio_only:
            wav(work / 'tv-en.wav', np.concatenate(tv_audio))
            expression = time_expression(tv_clock)
            run(['-i', ROOT / base_tv['src'], '-i', work / 'tv-en.wav',
                '-vf', f"setpts='({expression})/TB',fps=30,tpad=stop_mode=clone:stop_duration=1,trim=duration={global_english}",
                '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                '-maxrate', '900k', '-bufsize', '900k', '-profile:v', 'main', '-level:v', '3.1',
                '-pix_fmt', 'yuv420p', '-g', '60', '-threads', '2', '-c:a', 'aac', '-b:a', '160k',
                '-t', global_english, '-movflags', '+faststart', work / 'tour.mp4'])
            (work / 'tour.mp4').replace(TV / 'tour.mp4')
            (TV / 'README.txt').write_text('English tour: one continuous H.264 Main 3.1 / AAC stream, 480x1040, 30 fps.\n'
                'Includes English narration for all nine chapters, with chapter-local English subtitles.\n'
                'The v118 Korean video and all original Korean media are unchanged.\n'
                'Rebuild: python3 scripts/build-english-narration.py\n'
                'Source voice credits: ../audio/en-v119/script.json\nMusic: ../audio/BGM_CREDITS.txt\n')


if __name__ == '__main__':
    main()
