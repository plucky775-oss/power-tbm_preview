"""Append the approved narration demo using existing voices and one TV stream.
No network synthesis, speech speed changes, or extra playback decoders.
"""
import copy, json, math, re, subprocess, tempfile
from pathlib import Path
import numpy as np
ROOT=Path(__file__).resolve().parents[1]
OUT=ROOT/'assets/audio/narration-demo-v141'
RATE=48000

def run(args): subprocess.run(['ffmpeg','-hide_banner','-loglevel','error','-y','-filter_complex_threads','1',*map(str,args)],check=True)
def read(p): return np.frombuffer(subprocess.check_output(['ffmpeg','-v','error','-i',str(p),'-ar',str(RATE),'-ac','2','-f','f32le','-']),dtype='<f4').copy().reshape(-1,2)
def wav(p,a):
 subprocess.run(['ffmpeg','-v','error','-y','-f','f32le','-ar',str(RATE),'-ac','2','-i','-','-c:a','pcm_f32le',str(p)],input=a.astype('<f4').tobytes(),check=True)
def silence(t):return np.zeros((round(t*RATE),2),dtype=np.float32)
def js(n):return json.loads((ROOT/n).read_text().split(' = ',1)[1].rstrip(';\n'))
def write(n,var,d): (ROOT/n).write_text('// v141 voice guidance demo.\n'+var+' = '+json.dumps(d,ensure_ascii=False,indent=2)+';\n')
def caption(text,start,end):
 words=text.split();weights=[max(1,len(x)) for x in words];pos=start; out=[]
 for word,weight in zip(words,weights):
  stop=pos+(end-start)*weight/sum(weights);out.append({'text':word,'start':round(pos,6),'end':round(stop,6)});pos=stop
 return {'start':round(start,6),'end':round(end,6),'words':out}
def normalize(src,dst):
 # Same integrated target as v128; no temporal processing or trimming.
 run(['-i',src,'-af','loudnorm=I=-16:TP=-2:LRA=11','-ar',RATE,'-ac','2','-c:a','pcm_f32le',dst])

def main():
 base=json.loads((OUT/'baseline.json').read_text());en=js('english-narration.js');report={}
 music=read(ROOT/'assets/audio/bgm-starcourt-mall-cc0.mp3')
 with tempfile.TemporaryDirectory(prefix='tbm-v141-') as tmp:
  temp=Path(tmp)
  for key in ['sample-hazard','sample-measure','intro-ko','intro-en']:normalize(OUT/(key+'.mp3'),temp/(key+'.wav'))
  hazard=read(temp/'sample-hazard.wav');measure=read(temp/'sample-measure.wav')
  for lang in ['ko','en']:
   original=base[lang];speech=read(ROOT/original['src'])[:round(original['duration']*RATE)];intro=read(temp/f'intro-{lang}.wav')
   start=len(speech)/RATE+.25; sample=start+len(intro)/RATE+.6; female=sample+len(hazard)/RATE+.4
   result=np.concatenate([speech,silence(.25),intro,silence(.6),hazard,silence(.4),measure,silence(.8)])
   duration=len(result)/RATE; config={'start':start,'sampleStart':sample,'measureStart':female,'sampleEnd':female+len(measure)/RATE,'confirmPress':female+len(measure)/RATE+.3,'sceneStart':original['cues'][-2][0],'end':duration}
   out=f'assets/audio/narration-demo-v141/02-tbm-basic-{lang}.m4a'
   wav(temp/f'{lang}.wav',result);run(['-i',temp/f'{lang}.wav','-c:a','aac','-b:a','160k','-movflags','+faststart',ROOT/out])
   cues=copy.deepcopy(original['cues']);cues[-1]=[original['duration'],51000];cues.append([duration,51000])
   track={'src':out,'duration':duration,'cues':cues,'voiceDemo':config}
   text=('선택한 위험요인과 안전대책은 남녀 목소리로 번갈아 안내하여, 작업자들이 함께 듣고 확인할 수 있습니다. 실제 안내 음성을 잠시 들어보겠습니다.' if lang=='ko' else "Selected hazards and safety measures are read aloud by alternating male and female voices, so workers can listen and check them together. Let's listen to a short example.")
   # Complete paragraph timing is a reading guide, not forced alignment.
   sentences=(['선택한 위험요인과 안전대책은', '남녀 목소리로 번갈아 안내하여,', '작업자들이 함께 듣고 확인할 수 있습니다.', '실제 안내 음성을 잠시 들어보겠습니다.'] if lang=='ko' else ['Selected hazards and safety measures are read aloud', 'by alternating male and female voices,', 'so workers can listen and check them together.', "Let's listen to a short example."]);caps=copy.deepcopy(original['subtitles']);at=start
   total=sum(len(x) for x in sentences)
   for phrase in sentences:
    end=at+len(intro)/RATE*len(phrase)/total;caps.append(caption(phrase,at,end));at=end
   labels=['감전 아크, 충전부 인접 및 결선.','결선 전환 작업은 도면과 상표시를 기준으로 2인 이상 교차 확인해 주세요.'] if lang=='ko' else ['Electrical shock and arc: nearby live parts and wiring.','For wiring and switching, at least two people cross-check the drawings and phase markings.']
   caps += [caption(labels[0],sample,sample+len(hazard)/RATE),caption(labels[1],female,female+len(measure)/RATE)]
   sn='subtitle-data.js' if lang=='ko' else 'subtitle-data.en.js';subs=js(sn);subs['02-tbm-basic']=caps;write(sn,'window.PowerTBMSubtitleData'+('En' if lang=='en' else ''),subs)
   timeline=copy.deepcopy(original['tv']);old=next(x for x in timeline['segments'] if x['id']=='02-tbm-basic'); oldstart,oldend=old['start'],old['end'];tv_duration=math.ceil(duration*30)/30;delta=tv_duration-old['duration']
   for seg in timeline['segments']:
    if seg['id']=='02-tbm-basic':seg['duration']=tv_duration;seg['end']=seg['start']+tv_duration
    elif seg['start']>=oldend-.00001:seg['start']+=delta;seg['end']+=delta
   timeline['duration']+=delta;timeline['src']=f'assets/tv-{lang}-v141/tour.mp4'
   if lang=='ko':
    app=(ROOT/'app.js').read_text();replacement="id: '02-tbm-basic',\n        src: '"+out+"',\n        duration: "+str(duration)+",\n        cues: "+json.dumps(cues)+",\n        voiceDemo: "+json.dumps(config)
    app,count=re.subn(r"id: '02-tbm-basic',\s*src: '[^']+',\s*duration: [\d.]+,\s*cues: \[.*?\]\](?:,\s*voiceDemo: \{[^}]+\})?",lambda m:replacement,app,count=1);assert count==1;(ROOT/'app.js').write_text(app);write('tv-media-timeline.js','window.PowerTBMTVTimeline',timeline)
   else:
    track['clockReference']='meeting-ko-v141'; track['clock']=copy.deepcopy(original['clock'])+[[duration,report['ko']['duration']]]
    en['tracks']['02-tbm-basic']=track;en['tv']=timeline;write('english-narration.js','window.PowerTBMEnglishNarration',en)
   tour=read(ROOT/original['tv']['src']);before=tour[:round(oldstart*RATE)];after=tour[round(oldend*RATE):round(original['tv']['duration']*RATE)]
   mix=np.zeros((round(tv_duration*RATE),2),dtype=np.float32);mix[:len(result)]=result;mix+=music[(np.arange(len(mix))+len(before))%len(music)]*.065
   # Brief music-only fades at chapter edges; never overlap spoken passages.
   fade=round(.012*RATE);before[-fade:]*=np.linspace(1,0,fade)[:,None];mix[:fade]*=np.linspace(0,1,fade)[:,None];mix[-fade:]*=np.linspace(1,0,fade)[:,None];after[:fade]*=np.linspace(0,1,fade)[:,None]
   wav(temp/'tour.wav',np.concatenate([before,mix,after]));dest=ROOT/timeline['src'];dest.parent.mkdir(exist_ok=True)
   expression=f"setpts='PTS+if(gte(T,{oldend-.001}),{delta}/TB,0)',fps=30,tpad=stop_mode=clone:stop_duration=1,trim=duration={timeline['duration']}"
   run(['-i',ROOT/original['tv']['src'],'-i',temp/'tour.wav','-vf',expression,'-map','0:v','-map','1:a','-c:v','libx264','-preset','fast','-crf','23','-maxrate','900k','-bufsize','900k','-profile:v','main','-level:v','3.1','-pix_fmt','yuv420p','-g','60','-threads','2','-c:a','aac','-b:a','160k','-ar',RATE,'-t',timeline['duration'],'-movflags','+faststart',dest])
   report[lang]={'duration':duration,'voiceDemo':config,'sampleDuration':female+len(measure)/RATE-sample,'addedDuration':duration-original['duration'],'tv':timeline}
   print(lang,json.dumps({k:v for k,v in report[lang].items() if k!='tv'}),flush=True)
 (OUT/'timing.json').write_text(json.dumps(report,ensure_ascii=False,indent=2))
if __name__=='__main__':main()
