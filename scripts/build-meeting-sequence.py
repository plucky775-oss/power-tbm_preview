"""Reorder the intact meeting passages and add the recorded swipe/start bridge.

Rebuilds both languages and their continuous TV streams from preserved sources.
Requires numpy, ffmpeg and ffprobe. No speech is accelerated.
"""
import argparse
import copy
import importlib.util
import json
import math
from pathlib import Path
import re
import tempfile

import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio/meeting-v126'
KEY = '02-tbm-basic'
spec = importlib.util.spec_from_file_location('english', ROOT / 'scripts/build-english-narration.py')
media = importlib.util.module_from_spec(spec)
spec.loader.exec_module(media)
RATE = media.RATE


def js_data(name):
    return json.loads((ROOT / name).read_text().split(' = ', 1)[1].strip().rstrip(';'))


def write_js(name, variable, value, compact=False):
    (ROOT / name).write_text('// Meeting sequence updated by scripts/build-meeting-sequence.py.\n'
        + variable + ' = ' + json.dumps(value, ensure_ascii=False,
            indent=None if compact else 2, separators=(',', ':') if compact else None) + ';\n')


def moved(cue, shift):
    cue = copy.deepcopy(cue)
    for item in [cue, *cue['words']]:
        for key in ['start', 'end']:
            item[key] = round(item[key] + shift, 6)
    return cue


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--audio-only', action='store_true')
    args = parser.parse_args()
    source = json.loads((OUT / 'source.json').read_text())
    english = js_data('english-narration.js')
    records = {}
    music = media.read_audio(ROOT / 'assets/audio/bgm-starcourt-mall-cc0.mp3')
    with tempfile.TemporaryDirectory(prefix='tbm-meeting-') as folder:
        work = Path(folder)
        for lang in ['ko', 'en']:
            original = source[lang]
            inverse = [[b, a] for a, b in original.get('clock', [])]
            old_time = lambda t: media.interpolate(inverse, t) if lang == 'en' else t
            a, b, c = [old_time(t) for t in [13.08, 18.4, 23.3]]
            audio = media.read_audio(ROOT / original['src'])
            end = round(original['duration'] * RATE)
            audio = audio[:end]
            a, b, c = [round(t * RATE) / RATE for t in [a, b, c]]
            clip = lambda x, y: audio[round(x * RATE):round(y * RATE)]
            voice = media.trim_voice(media.read_audio(OUT / f'bridge-{lang}.mp3'))
            bridge = np.concatenate([np.zeros((round(.15 * RATE), 2)), voice,
                                     np.zeros((round(.20 * RATE), 2))])
            trade_at, bridge_at = a, a + c - b
            workers_at = bridge_at + len(bridge) / RATE
            tail_at = workers_at + b - a
            result = np.concatenate([clip(0, a), clip(b, c), bridge, clip(a, b), clip(c, len(audio) / RATE)])
            duration = len(result) / RATE
            name = f'assets/audio/meeting-v126/{KEY}-{lang}.m4a'
            media.wav(work / 'speech.wav', result)
            media.run(['-i', work / 'speech.wav', '-c:a', 'aac', '-b:a', '160k',
                       '-movflags', '+faststart', ROOT / name])
            captions = [moved(x, 0) for x in original['subtitles'][:4]]
            captions.append(moved(original['subtitles'][6], trade_at - b))
            phrases = (['공종 선택을 마친 뒤 화면을 위로 올려', '회의진행 시작을 누르면,', '작업자 명단 화면으로 이동합니다.']
                       if lang == 'ko' else ['After selecting the work types, swipe up',
                           'and tap Start Briefing', 'to open the worker list.'])
            # Word fill is a weighted reading guide within the complete passage.
            words = [word for phrase in phrases for word in phrase.split()]
            unit = (len(voice) / RATE) / sum(media.weight(word) for word in words)
            cursor = bridge_at + .15
            bridge_ends = []
            for phrase in phrases:
                timed = []
                for word in phrase.split():
                    finish = cursor + media.weight(word) * unit
                    timed.append({'text': word, 'start': round(cursor, 6), 'end': round(finish, 6)})
                    cursor = finish
                captions.append({'start': timed[0]['start'], 'end': timed[-1]['end'], 'words': timed})
                bridge_ends.append(cursor)
            captions += [moved(x, workers_at - a) for x in original['subtitles'][4:6]]
            captions += [moved(x, tail_at - c) for x in original['subtitles'][7:]]
            # Preserve early form timing, then map the new passage boundaries to
            # the common 96-second visual clock. Later meeting scenes stay intact.
            visual = [[t, v] for t, v in original['cues'] if t < a and v <= 20160]
            visual += [[a, 20496], [bridge_at, 25440], [bridge_ends[0], 28800],
                       [bridge_ends[1], 30336], [workers_at, 31104],
                       [tail_at, 37056], [tail_at + old_time(28.98) - c, 46176], [duration, 55296]]
            track = {'src': name, 'duration': duration,
                     'cues': [[round(t, 6), round(v, 6)] for t, v in visual]}
            records[lang] = {'track': track, 'boundaries': [0, a, bridge_at, workers_at, tail_at, duration],
                'sourceSpans': [[0, a], [b, c], None, [a, b], [c, len(audio) / RATE]],
                'bridgeSpeechDuration': len(voice) / RATE}
            subtitle_name = 'subtitle-data.js' if lang == 'ko' else 'subtitle-data.en.js'
            subtitles = js_data(subtitle_name)
            subtitles[KEY] = captions
            write_js(subtitle_name, 'window.PowerTBMSubtitleData' + ('En' if lang == 'en' else ''), subtitles, True)
            timeline = copy.deepcopy(original['tv'])
            timeline['src'] = f'assets/tv-{"en-" if lang == "en" else ""}v126/tour.mp4'
            tv_duration = math.ceil(duration * 30) / 30
            old_segment = next(x for x in original['tv']['segments'] if x['id'] == KEY)
            delta = tv_duration - old_segment['duration']
            for segment in timeline['segments']:
                if segment['id'] == KEY:
                    segment['duration'] = tv_duration
                    segment['end'] = segment['start'] + tv_duration
                elif segment['start'] >= old_segment['end'] - .000001:
                    segment['start'] += delta
                    segment['end'] += delta
            timeline['duration'] += delta
            if lang == 'ko':
                app = (ROOT / 'app.js').read_text()
                replacement = "id: '02-tbm-basic',\n        src: '" + name + "',\n        duration: " + str(duration) + ",\n        cues: " + json.dumps(track['cues'])
                app, count = re.subn(r"id: '02-tbm-basic',\s*src: '[^']+',\s*duration: [\d.]+,\s*cues: \[.*?\]\]", replacement, app, count=1)
                assert count == 1
                (ROOT / 'app.js').write_text(app)
                write_js('tv-media-timeline.js', 'window.PowerTBMTVTimeline', timeline)
            else:
                track['clockReference'] = 'meeting-ko-v126'
                track['clock'] = [[round(en, 6), round(ko, 6)] for en, ko in zip(records['en']['boundaries'], records['ko']['boundaries'])]
                english['tracks'][KEY] = track
                english['tv'] = timeline
                write_js('english-narration.js', 'window.PowerTBMEnglishNarration', english)
            print(f'{lang}: {original["duration"]:.3f}s -> {duration:.3f}s; bridge {len(voice)/RATE:.3f}s', flush=True)
            if args.audio_only:
                continue
            tv_audio = media.read_audio(ROOT / original['tv']['src'])
            before = tv_audio[:round(old_segment['start'] * RATE)]
            after = tv_audio[round(old_segment['end'] * RATE):round(original['tv']['duration'] * RATE)]
            mix = np.zeros((round(tv_duration * RATE), 2), dtype=np.float32)
            mix[:len(result)] += result
            mix += music[(np.arange(len(mix)) + len(before)) % len(music)] * .065
            # Tiny boundary fades avoid clicks where the old music bed rejoins.
            fade = round(.012 * RATE)
            before[-fade:] *= np.linspace(1, 0, fade)[:, None]
            mix[:fade] *= np.linspace(0, 1, fade)[:, None]
            mix[-fade:] *= np.linspace(1, 0, fade)[:, None]
            after[:fade] *= np.linspace(0, 1, fade)[:, None]
            media.wav(work / 'tour.wav', np.concatenate([before, mix, after]))
            destination = ROOT / timeline['src']
            destination.parent.mkdir(exist_ok=True)
            # Meeting frames are a black DOM-animation underlay. Extend that
            # underlay; preserve every later frame and encode one continuous stream.
            expression = f"setpts='PTS+if(gte(T,{old_segment['end'] - .001}),{delta}/TB,0)',fps=30,tpad=stop_mode=clone:stop_duration=1,trim=duration={timeline['duration']}"
            media.run(['-i', ROOT / original['tv']['src'], '-i', work / 'tour.wav', '-vf', expression,
                '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'fast', '-crf', '23',
                '-maxrate', '900k', '-bufsize', '900k', '-profile:v', 'main', '-level:v', '3.1',
                '-pix_fmt', 'yuv420p', '-g', '60', '-threads', '2', '-c:a', 'aac', '-b:a', '160k',
                '-t', timeline['duration'], '-movflags', '+faststart', destination])
            print(f'{lang}: continuous TV stream built', flush=True)
    (OUT / 'timing.json').write_text(json.dumps(records, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
