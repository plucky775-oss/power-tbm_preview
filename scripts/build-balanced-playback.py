"""Balance both languages, edit Jisoo's weather voice and restore the TV launch.

Uses only checked-in recordings. Requires numpy, ffmpeg and ffprobe.
Original recordings/video files are retained. TV chapter clocks stay local;
the 3.5-second button clip is prepended without a second playback decoder.
"""
import concurrent.futures
import copy
import json
from pathlib import Path
import subprocess
import tempfile
import numpy as np

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'assets/audio/balanced-v128'
RATE, PRELUDE, TARGET = 48000, 3.5, -16
SOURCES = json.loads((OUT / 'sources.json').read_text())


def run(*args):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-filter_complex_threads', '1',
                    *map(str, args)], check=True)


def read(path):
    return np.frombuffer(subprocess.check_output(['ffmpeg', '-v', 'error', '-i', str(path),
        '-ar', str(RATE), '-ac', '2', '-f', 'f32le', '-']), dtype='<f4').copy().reshape(-1, 2)


def wav(path, data):
    subprocess.run(['ffmpeg', '-v', 'error', '-y', '-f', 'f32le', '-ar', str(RATE),
        '-ac', '2', '-i', '-', '-c:a', 'pcm_f32le', str(path)],
        input=data.astype('<f4').tobytes(), check=True)


def fit(data, duration):
    count = round(duration * RATE)
    return np.pad(data[:count], ((0, max(0, count - len(data))), (0, 0)))


def measure(path):
    result = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', str(path),
        '-af', f'loudnorm=I={TARGET}:TP=-2:LRA=11:print_format=json', '-f', 'null', '-'],
        capture_output=True, text=True, check=True)
    return json.loads(result.stderr[result.stderr.rfind('{'):])


def balance(source, output):
    values = measure(source)
    options = (f'loudnorm=I={TARGET}:TP=-2:LRA=11:measured_I={values["input_i"]}'
        f':measured_TP={values["input_tp"]}:measured_LRA={values["input_lra"]}'
        f':measured_thresh={values["input_thresh"]}:offset={values["target_offset"]}:linear=true')
    run('-i', source, '-af', options, '-ar', RATE, '-ac', '2', '-c:a', 'pcm_f32le', output)
    return values


def optimize_delivery(path, work, crf, tv=False):
    """Reduce video transfer size while copying the balanced AAC unchanged."""
    original = work / 'delivery-original.mp4'
    path.replace(original)
    options = ['-profile:v', 'main', '-level:v', '3.1', '-g', '60'] if tv else []
    run('-i', original, '-map', '0:v:0', '-map', '0:a:0', '-c:v', 'libx264',
        '-preset', 'veryslow', '-crf', crf, *options, '-pix_fmt', 'yuv420p',
        '-threads', '2', '-c:a', 'copy', '-movflags', '+faststart', path)
    # Leave 16 KiB for JSON around the base64 payload in a 16 MiB request.
    assert 4 * ((path.stat().st_size + 2) // 3) + 16_384 < 16 * 1024 * 1024, (path, 'delivery file too large')


def weather():
    # Reuse the same Jisoo voice: 일 from 일본, 별 예보 from 시간대별 예보.
    # Preserve 별 예보 as one continuous recording to retain both consonants.
    # The final
    # sentence combines 한 곳에서 and 확인할 수 있습니다 from the same take.
    original = read(ROOT / 'assets/audio/01-weather-jisoo.mp3')
    voice = read(ROOT / SOURCES['ko']['01-weather']['src'])
    def cut(start, end):
        result = original[round(start * RATE):round(end * RATE)].copy()
        fade = round(.003 * RATE)
        result[:fade] *= np.linspace(0, 1, fade)[:, None]
        result[-fade:] *= np.linspace(1, 0, fade)[:, None]
        return result
    daily = np.concatenate([cut(20.27, 20.491), cut(8.76, 9.36), cut(14.46, 16.22)])
    voice[round(13.78 * RATE):round(16.62 * RATE)] = 0
    first = round(13.86 * RATE)
    voice[first:first + len(daily)] = daily
    sentence = np.concatenate([cut(24.66, 25.48), cut(15.22, 16.22)])
    voice[round(25.18 * RATE):round(27.08 * RATE)] = 0
    first = round(25.20 * RATE)
    voice[first:first + len(sentence)] = sentence
    return voice


def main():
    report, outputs = [], {'ko': {}, 'en': {}}
    with tempfile.TemporaryDirectory(prefix='tbm-balanced-') as folder:
        work = Path(folder)
        edited = weather()
        wav(work / 'weather.wav', edited)
        jobs = [(lang, key, track) for lang in ['ko', 'en'] for key, track in SOURCES[lang].items()]

        def desktop(job):
            lang, key, track = job
            name = f'{lang}-{key}'
            source = work / 'weather.wav' if (lang, key) == ('ko', '01-weather') else ROOT / track['src']
            pcm = work / f'{name}.wav'
            before = balance(source, pcm)
            is_video = key == '08-safety4cut-example'
            output = OUT / (name + ('.mp4' if is_video else '.m4a'))
            args = ['-i', ROOT / track['src'], '-i', pcm, '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy'] if is_video else ['-i', pcm]
            run(*args, '-c:a', 'aac', '-b:a', '192k', '-ar', RATE, '-t', track['duration'],
                '-movflags', '+faststart', output)
            after = measure(output)
            print(f'{lang} {key}: {before["input_i"]} -> {after["input_i"]} LUFS', flush=True)
            return lang, key, output.relative_to(ROOT).as_posix(), {
                'kind': 'desktop', 'language': lang, 'chapter': key,
                'beforeLUFS': float(before['input_i']), 'afterLUFS': float(after['input_i']),
                'truePeakDBTP': float(after['input_tp'])}

        with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
            for lang, key, path, record in executor.map(desktop, jobs):
                outputs[lang][key] = path
                report.append(record)

        optimize_delivery(OUT / 'ko-08-safety4cut-example.mp4', work, 18)

        click_source = ROOT / 'assets/video/power-tbm-button-click-soft-v90.mp4'
        click_audio = fit(read(click_source), PRELUDE)
        music = read(ROOT / 'assets/audio/bgm-starcourt-mall-cc0.mp3')
        timelines = {}
        for lang in ['ko', 'en']:
            timeline = copy.deepcopy(SOURCES[lang + 'TV'])
            source = ROOT / timeline['src']
            original = fit(read(source), timeline['duration'])
            parts = [click_audio]
            for chapter in timeline['segments']:
                key = chapter['id']
                clip = original[round(chapter['start'] * RATE):round(chapter['end'] * RATE)].copy()
                if (lang, key) == ('ko', '01-weather'):
                    clip = fit(edited, chapter['duration'])
                    offset = round(8.150204 * RATE)
                    clip += music[(np.arange(len(clip)) + offset) % len(music)] * .065
                raw, normalized = work / 'chapter.wav', work / 'chapter-balanced.wav'
                wav(raw, clip)
                before = balance(raw, normalized)
                after = measure(normalized)
                report.append({'kind': 'tv', 'language': lang, 'chapter': key,
                    'beforeLUFS': float(before['input_i']), 'afterLUFS': float(after['input_i']),
                    'truePeakDBTP': float(after['input_tp'])})
                parts.append(fit(read(normalized), chapter['duration']))
            wav(work / 'tour.wav', np.concatenate(parts))
            timeline['preludeDuration'] = PRELUDE
            timeline['duration'] += PRELUDE
            for entry in timeline['segments']:
                entry['start'] += PRELUDE
                entry['end'] += PRELUDE
            destination = ROOT / f'assets/tv-{lang}-v128/tour.mp4'
            destination.parent.mkdir(exist_ok=True)
            # Prefix encoded to the same dimensions/profile; original tour
            # packets are copied intact. AAC is encoded once across the tour.
            prefix = work / 'prelude.mp4'
            if not prefix.exists():
                run('-i', click_source, '-an', '-vf',
                    'fps=30,scale=480:480,pad=480:1040:0:280:color=0x02060e,setsar=1',
                    '-t', PRELUDE, '-c:v', 'libx264', '-preset', 'fast', '-crf', '21',
                    '-maxrate', '900k', '-bufsize', '900k', '-profile:v', 'main', '-level:v', '3.1',
                    '-pix_fmt', 'yuv420p', '-g', '60', '-threads', '2', '-video_track_timescale', '15360', prefix)
            concat = work / 'concat.txt'
            concat.write_text(f"file '{prefix}'\nduration {PRELUDE}\nfile '{source}'\n")
            run('-f', 'concat', '-safe', '0', '-i', concat, '-i', work / 'tour.wav',
                '-map', '0:v:0', '-map', '1:a:0', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k',
                '-ar', RATE, '-t', timeline['duration'], '-movflags', '+faststart', destination)
            if lang == 'en':
                optimize_delivery(destination, work, 23, tv=True)
            timeline['src'] = destination.relative_to(ROOT).as_posix()
            timelines[lang] = timeline
            print(f'{lang}: continuous stream {timeline["duration"]:.3f}s', flush=True)
        (OUT / 'playback.json').write_text(json.dumps({'targetLUFS': TARGET, 'peakLimitDBTP': -2,
            'tracks': outputs, 'timelines': timelines, 'measurements': report}, ensure_ascii=False, indent=2) + '\n')


if __name__ == '__main__':
    main()
